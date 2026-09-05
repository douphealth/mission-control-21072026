// Client-side orchestration for the Control Center collectors.
// Deterministic ranking always works; AI reranking is a bonus layer.

import { db, genId, type StreamItem, type StreamKind } from "@/lib/db";
import {
  collectAudience,
  collectIndustry,
  collectMentions,
  rankStories,
} from "@/lib/controlCenter.functions";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";

const LAST_RUN_KEY = "mc-cc-last-run";

export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    [...u.searchParams.keys()].forEach((k) => {
      if (/^(utm_|fbclid|gclid|ref|source)/i.test(k)) u.searchParams.delete(k);
    });
    return `${u.origin}${u.pathname.replace(/\/$/, "")}${u.search}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Local importance model: recency + source weight + topic hits. */
export function localScore(
  item: { title: string; summary?: string; publishedAt: string },
  topics: string[] = [],
): number {
  const ageHours = Math.max(0, (Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000);
  const recency = Math.max(0, 45 - ageHours * 0.8);
  const hay = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  const topicHits = topics.filter((t) => t && hay.includes(t.toLowerCase())).length;
  const signal =
    /launch|acquisi|funding|outage|breach|update|release|ban|lawsuit|price|record/i.test(hay)
      ? 12
      : 0;
  const depth = Math.min(15, (item.summary?.length ?? 0) / 30);
  return Math.round(Math.min(100, 25 + recency + topicHits * 8 + signal + depth));
}

async function persistItems(
  kind: StreamKind,
  incoming: Omit<StreamItem, "id" | "kind" | "status" | "discoveredAt">[],
) {
  if (!incoming.length) return 0;
  const existing = await db.streamItems.toArray();
  const seen = new Set(existing.map((i) => canonicalUrl(i.url)));
  const fresh: StreamItem[] = [];
  for (const item of incoming) {
    const key = canonicalUrl(item.url);
    if (!item.title || !item.url || seen.has(key)) continue;
    seen.add(key);
    fresh.push({
      ...item,
      id: genId(),
      kind,
      status: "active",
      discoveredAt: new Date().toISOString(),
    });
  }
  if (!fresh.length) return 0;
  await db.streamItems.bulkPut(fresh);
  fresh.forEach((f) => markCloudRecordDirty("streamItems", f.id));
  queueCloudPush();
  return fresh.length;
}

async function aiRerank(kind: StreamKind, context?: string) {
  const items = (await db.streamItems.where("kind").equals(kind).toArray())
    .filter((i) => i.status === "active" && !i.aiSummary)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
  if (!items.length) return;
  try {
    const { ranked } = await rankStories({
      data: {
        context,
        stories: items.map((i) => ({
          id: i.id,
          title: i.title,
          source: i.source,
          summary: i.summary,
        })),
      },
    });
    for (const r of ranked) {
      const target = items.find((i) => i.id === r.id);
      if (!target) continue;
      await db.streamItems.update(r.id, {
        score: r.score || target.score,
        aiSummary: r.summary || undefined,
      });
      markCloudRecordDirty("streamItems", r.id);
    }
    if (ranked.length) queueCloudPush();
  } catch {
    /* deterministic scores stay in place */
  }
}

export async function runIndustryCollector(useAi = true) {
  const sources = (await db.feedSources.toArray()).filter((s) => s.enabled);
  if (!sources.length) return { added: 0, errors: [] as string[] };
  const { results } = await collectIndustry({
    data: {
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        feedUrl: s.feedUrl,
        topics: s.topics,
      })),
    },
  });

  const allTopics = sources.flatMap((s) => s.topics ?? []);
  const errors: string[] = [];
  const payload: any[] = [];
  const now = new Date().toISOString();

  for (const r of results) {
    const src = sources.find((s) => s.id === r.sourceId);
    if (src) {
      await db.feedSources.update(src.id, {
        lastCheckedAt: now,
        feedUrl: r.feedUrl ?? src.feedUrl,
        lastError: r.error ?? undefined,
      });
      markCloudRecordDirty("feedSources", src.id);
      if (r.error) errors.push(`${src.name}: ${r.error}`);
    }
    for (const item of r.items) {
      const publishedAt = item.publishedAt ?? now;
      payload.push({
        title: item.title,
        url: item.url,
        source: item.source ?? src?.name ?? "",
        sourceId: src?.id,
        summary: item.summary,
        publishedAt,
        score: localScore({ ...item, publishedAt }, allTopics),
      });
    }
  }

  const added = await persistItems("industry", payload);
  if (useAi && added) await aiRerank("industry");
  return { added, errors };
}

export async function runMentionCollector(useAi = true) {
  const terms = (await db.watchTerms.toArray()).filter((t) => t.enabled);
  if (!terms.length) return { added: 0, errors: [] as string[] };
  const { results } = await collectMentions({
    data: {
      terms: terms.slice(0, 12).map((t) => ({
        id: t.id,
        term: t.term,
        type: t.type,
        anchors: t.anchors,
        negatives: t.negatives,
      })),
    },
  });

  const now = new Date().toISOString();
  const errors: string[] = [];
  const payload: any[] = [];

  for (const r of results) {
    await db.watchTerms.update(r.termId, { lastCheckedAt: now });
    markCloudRecordDirty("watchTerms", r.termId);
    if (r.error) errors.push(`${r.term}: ${r.error}`);
    for (const item of r.items) {
      const publishedAt = item.publishedAt ?? now;
      payload.push({
        title: item.title,
        url: item.url,
        source: item.source ?? "",
        sourceId: r.termId,
        summary: item.summary,
        publishedAt,
        score: localScore({ ...item, publishedAt }) + 5,
        matchedTerm: r.term,
      });
    }
  }

  const added = await persistItems("mention", payload);
  if (useAi && added)
    await aiRerank("mention", "These are mentions of the operator’s own name or brand.");
  return { added, errors };
}

export async function runAudienceCollector() {
  const accounts = await db.audienceAccounts.toArray();
  if (!accounts.length) return { updated: 0 };
  const { readings } = await collectAudience({
    data: accounts.map
      ? { accounts: accounts.map((a) => ({ id: a.id, platform: a.platform, url: a.url })) }
      : ({} as any),
  });

  const now = new Date().toISOString();
  let updated = 0;
  for (const r of readings) {
    // Keep one anchor per 12h bucket so manual refreshes don't skew growth.
    const prior = await db.audienceReadings.where("accountId").equals(r.accountId).toArray();
    const recent = prior
      .filter((p) => Date.now() - new Date(p.capturedAt).getTime() < 12 * 3_600_000)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];

    if (recent) {
      await db.audienceReadings.update(recent.id, {
        followers: r.followers,
        posts: r.posts,
        capturedAt: now,
        status: r.status,
      });
      markCloudRecordDirty("audienceReadings", recent.id);
    } else {
      const rec = {
        id: genId(),
        accountId: r.accountId,
        capturedAt: now,
        followers: r.followers,
        posts: r.posts,
        status: r.status,
      };
      await db.audienceReadings.put(rec);
      markCloudRecordDirty("audienceReadings", rec.id);
    }
    await db.audienceAccounts.update(r.accountId, { lastCheckedAt: now, lastStatus: r.status });
    markCloudRecordDirty("audienceAccounts", r.accountId);
    updated++;
  }
  queueCloudPush();
  return { updated };
}

export async function runAllCollectors(useAi = true) {
  const [industry, mentions, audience] = await Promise.all([
    runIndustryCollector(useAi).catch(() => ({ added: 0, errors: ["Industry collector failed"] })),
    runMentionCollector(useAi).catch(() => ({ added: 0, errors: ["Mention collector failed"] })),
    runAudienceCollector().catch(() => ({ updated: 0 })),
  ]);
  try {
    localStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
  return { industry, mentions, audience };
}

export function lastCollectorRun(): string | null {
  try {
    return localStorage.getItem(LAST_RUN_KEY);
  } catch {
    return null;
  }
}

export async function archiveStreamItem(id: string) {
  await db.streamItems.update(id, { status: "archived" });
  markCloudRecordDirty("streamItems", id);
  queueCloudPush();
}

export async function restoreStreamItem(id: string) {
  await db.streamItems.update(id, { status: "active" });
  markCloudRecordDirty("streamItems", id);
  queueCloudPush();
}
