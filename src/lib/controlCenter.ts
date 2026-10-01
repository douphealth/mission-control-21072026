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

async function writeCollectorHealth(
  id: string,
  label: string,
  status: "ok" | "stale" | "error" | "not-configured" | "syncing",
  detail: string,
  error?: string,
) {
  const now = new Date().toISOString();
  await db.syncHealth.put({
    id,
    label,
    status,
    lastAttemptAt: now,
    lastSuccessAt: status === "ok" ? now : undefined,
    detail,
    error,
  });
  markCloudRecordDirty("syncHealth", id);
}

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
function verifyMentionAgainstText(
  term: { term: string; type: string; anchors?: string[]; negatives?: string[] },
  text: string,
  sourceUrl?: string,
) {
  const hay = text.toLowerCase();
  const clean = term.term.replace(/^@/, "").trim().toLowerCase();
  const anchors = (term.anchors ?? []).map((value) => value.toLowerCase()).filter(Boolean);
  const negatives = (term.negatives ?? []).map((value) => value.toLowerCase()).filter(Boolean);
  if (!clean || negatives.some((negative) => hay.includes(negative))) return null;

  const matchedAnchors = anchors.filter((anchor) => hay.includes(anchor));
  const sourceHost = (() => {
    try {
      return sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase() : "";
    } catch {
      return "";
    }
  })();

  if (term.type === "domain") {
    const exact =
      sourceHost === clean ||
      sourceHost.endsWith("." + clean) ||
      hay.includes(clean);
    return exact
      ? { verification: "exact-domain" as const, confidence: "high" as const, matchedAnchors }
      : null;
  }

  if (term.type === "handle") {
    const exact =
      hay.includes("@" + clean) ||
      hay.split(/[^a-z0-9_]+/).includes(clean);
    return exact
      ? { verification: "exact-handle" as const, confidence: "high" as const, matchedAnchors }
      : null;
  }

  const exactPhrase = hay.includes(clean);
  if (!exactPhrase) return null;

  if (term.type === "name") {
    if (!matchedAnchors.length) return null;
    return {
      verification: "anchored-name" as const,
      confidence: "high" as const,
      matchedAnchors,
    };
  }

  return {
    verification: "exact-brand" as const,
    confidence: matchedAnchors.length ? ("high" as const) : ("medium" as const),
    matchedAnchors,
  };
}

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
  const existing = (await db.streamItems.toArray()).filter((item) => item.kind === kind);
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
  if (!sources.length) {
    await writeCollectorHealth("feeds", "Trends", "not-configured", "No enabled trend sources.");
    queueCloudPush();
    return { added: 0, errors: [] as string[] };
  }
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
        sourceUrl: item.sourceUrl,
        sourceId: src?.id,
        summary: item.summary,
        publishedAt,
        score: localScore({ ...item, publishedAt }, allTopics),
        verification: src ? "feed" : "topic-search",
        confidence: src ? "high" : "medium",
        evidenceType: src ? "direct-feed" : "google-news",
      });
    }
  }

  const added = await persistItems("industry", payload);
  if (useAi && added) await aiRerank("industry");
  await writeCollectorHealth(
    "feeds",
    "Trends",
    errors.length === sources.length ? "error" : errors.length ? "stale" : "ok",
    `${sources.length} enabled source${sources.length === 1 ? "" : "s"} checked.`,
    errors.length ? errors.slice(0, 3).join(" · ") : undefined,
  );
  queueCloudPush();
  return { added, errors };
}

export async function runMentionCollector(useAi = true) {
  const terms = (await db.watchTerms.toArray()).filter((t) => t.enabled);
  if (!terms.length) {
    await writeCollectorHealth("mentions", "Mentions", "not-configured", "No enabled mention watch terms.");
    queueCloudPush();
    return { added: 0, errors: [] as string[] };
  }
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
        sourceUrl: item.sourceUrl,
        sourceId: r.termId,
        summary: item.summary,
        publishedAt,
        score: Math.min(100, localScore({ ...item, publishedAt }) + (item.confidence === "high" ? 15 : 5)),
        matchedTerm: r.term,
        matchedAnchors: item.matchedAnchors,
        verification: item.verification,
        confidence: item.confidence,
        evidenceType: "google-news",
      });
    }
  }

  // Reuse already-collected tracked-feed stories as a second, user-curated evidence source.
  // This broadens coverage without introducing unverified web scraping.
  const trackedStories = (await db.streamItems.where("kind").equals("industry").toArray()).filter(
    (item) => item.status === "active",
  );
  for (const term of terms) {
    for (const story of trackedStories) {
      const verified = verifyMentionAgainstText(
        term,
        `${story.title} ${story.summary ?? ""}`,
        story.sourceUrl,
      );
      if (!verified) continue;
      payload.push({
        title: story.title,
        url: story.url,
        source: story.source,
        sourceUrl: story.sourceUrl,
        sourceId: term.id,
        summary: story.summary,
        publishedAt: story.publishedAt,
        score: Math.min(
          100,
          localScore(
            {
              title: story.title,
              summary: story.summary,
              publishedAt: story.publishedAt,
            },
            term.anchors ?? [],
          ) + (verified.confidence === "high" ? 15 : 5),
        ),
        matchedTerm: term.term,
        matchedAnchors: verified.matchedAnchors,
        verification: verified.verification,
        confidence: verified.confidence,
        evidenceType: "tracked-feed",
      });
    }
  }

  const added = await persistItems("mention", payload);
  if (useAi && added)
    await aiRerank("mention", "These are identity-filtered mentions of the operator’s own name, brand, handle, or domain.");
  await writeCollectorHealth(
    "mentions",
    "Mentions",
    errors.length === terms.length ? "error" : errors.length ? "stale" : "ok",
    `${terms.length} enabled watch term${terms.length === 1 ? "" : "s"} scanned with identity filters.`,
    errors.length ? errors.slice(0, 3).join(" · ") : undefined,
  );
  queueCloudPush();
  return { added, errors };
}

export async function runAudienceCollector() {
  const accounts = await db.audienceAccounts.toArray();
  if (!accounts.length) {
    await writeCollectorHealth("audience", "Audience", "not-configured", "No audience profiles configured.");
    queueCloudPush();
    return { updated: 0 };
  }
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

    if (r.status === "ok" && r.followers !== null) {
      if (recent) {
        await db.audienceReadings.update(recent.id, {
          followers: r.followers,
          posts: r.posts,
          capturedAt: now,
          status: r.status,
          method: r.method,
          provider: r.provider,
          confidence: r.confidence,
          evidence: r.evidence,
          approximate: r.approximate,
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
          method: r.method,
          provider: r.provider,
          confidence: r.confidence,
          evidence: r.evidence,
          approximate: r.approximate,
        };
        await db.audienceReadings.put(rec);
        markCloudRecordDirty("audienceReadings", rec.id);
      }
    }
    // Failed/limited checks update account health but never overwrite the last valid metric.
    await db.audienceAccounts.update(r.accountId, { lastCheckedAt: now, lastStatus: r.status });
    markCloudRecordDirty("audienceAccounts", r.accountId);
    updated++;
  }
  const latestStatuses = readings.map((reading) => reading.status);
  const okCount = latestStatuses.filter((status) => status === "ok").length;
  await writeCollectorHealth(
    "audience",
    "Audience",
    okCount === readings.length ? "ok" : okCount > 0 ? "stale" : "error",
    `${okCount}/${readings.length} profile${readings.length === 1 ? "" : "s"} returned a usable metric.`,
    okCount === readings.length ? undefined : "Some platforms did not expose a reliable current count.",
  );
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
