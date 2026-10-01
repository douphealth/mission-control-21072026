import { coverageOutcome, isOwnedDomainCoverage } from "./intelligenceRunQuality";
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
import {
  canonicalWebUrl,
  isTrustedAudienceReading,
  matchIdentity,
} from "@/lib/intelligenceQuality";

const LAST_RUN_KEY = "mc-cc-last-run";

function chunksOf<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function writeCollectorHealth(
  id: string,
  label: string,
  status: "ok" | "stale" | "error" | "not-configured" | "syncing",
  detail: string,
  error?: string,
) {
  const now = new Date().toISOString();
  const previous = await db.syncHealth.get(id);
  await db.syncHealth.put({
    id,
    label,
    status,
    lastAttemptAt: now,
    lastSuccessAt: status === "ok" ? now : previous?.lastSuccessAt,
    detail,
    error,
  });
  markCloudRecordDirty("syncHealth", id);
}

export function canonicalUrl(raw: string): string {
  return canonicalWebUrl(raw);
}

/** Local importance model: recency + source weight + topic hits. */
function verifyMentionAgainstText(
  term: { term: string; type: string; anchors?: string[]; negatives?: string[] },
  text: string,
  sourceUrl?: string,
) {
  return matchIdentity({ ...term, text, sourceUrl });
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
  const seen = new Set(existing.map((i) => `${canonicalUrl(i.url)}${kind === "mention" ? `::${i.sourceId || i.matchedTerm || ""}` : ""}`));
  const fresh: StreamItem[] = [];
  for (const item of incoming) {
    const key = `${canonicalUrl(item.url)}${kind === "mention" ? `::${item.sourceId || item.matchedTerm || ""}` : ""}`;
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
  const results: Awaited<ReturnType<typeof collectIndustry>>["results"] = [];
  for (const batch of chunksOf(sources, 30)) {
    const response = await collectIndustry({
      data: {
        sources: batch.map((source) => ({
          id: source.id,
          name: source.name,
          url: source.url,
          feedUrl: source.feedUrl,
          topics: source.topics,
        })),
      },
    });
    results.push(...response.results);
  }

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
      const sourcePublishedAt = item.publishedAt;
      const publishedAt = sourcePublishedAt ?? now;
      payload.push({
        title: item.title,
        url: item.url,
        source: item.source ?? src?.name ?? "",
        sourceUrl: item.sourceUrl,
        sourceId: src?.id,
        summary: item.summary,
        publishedAt,
        dateBasis: sourcePublishedAt ? "published" : "discovered",
        score: localScore({ ...item, publishedAt }, allTopics),
        verification: src ? "feed" : "topic-search",
        confidence: src ? "high" : "medium",
        evidenceType: src
          ? "direct-feed"
          : Array.isArray((item as any).retrievalProviders) && (item as any).retrievalProviders.length > 1
            ? "multi-news"
            : (item as any).retrievalProvider === "bing-news"
              ? "bing-news"
              : (item as any).retrievalProvider === "dataforseo"
                ? "dataforseo"
                : "google-news",
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

let mentionFlight: Promise<Awaited<ReturnType<typeof collectMentionsOnce>>> | null = null;
export function runMentionCollector(useAi = true) {
  if (!mentionFlight) mentionFlight = collectMentionsOnce(useAi).finally(() => { mentionFlight = null; });
  return mentionFlight;
}
async function collectMentionsOnce(_useAi: boolean) {
  const terms = (await db.watchTerms.toArray()).filter(t => t.enabled);
  const errors: string[] = [];
  const results: Awaited<ReturnType<typeof collectMentions>>["results"] = [];
  for (const batch of chunksOf(terms, 3)) {
    try {
      const response = await collectMentions({ data: { terms: batch.map(t => ({ id: t.id, term: t.term, type: t.type, anchors: t.anchors, negatives: t.negatives })) } });
      results.push(...response.results);
    } catch (error) {
      for (const t of batch) results.push({ termId: t.id, term: t.term, items: [], checked: false,
        candidates: 0, excludedOwned: 0, rejected: 0, partial: true, providers: [], fetchedAt: new Date().toISOString(), cached: false,
        error: error instanceof Error ? error.message : "Coverage service unavailable" });
    }
  }
  const now = new Date().toISOString();
  const payload: Omit<StreamItem, "id" | "kind" | "status" | "discoveredAt">[] = [];
  for (const result of results) {
    const watch = terms.find(t => t.id === result.termId);
    await db.watchTerms.update(result.termId, { lastCheckedAt: now,
      lastSuccessAt: result.checked ? result.fetchedAt : watch?.lastSuccessAt, lastError: result.error || undefined });
    markCloudRecordDirty("watchTerms", result.termId);
    if (result.error) errors.push(`${result.term}: ${result.error}`);
    for (const item of result.items) payload.push({ ...item, source: item.source || "Publisher unavailable",
      sourceId: result.termId, matchedTerm: result.term, publishedAt: item.publishedAt || result.fetchedAt,
      dateBasis: item.publishedAt ? "published" : "discovered", score: localScore({ ...item, publishedAt: item.publishedAt || result.fetchedAt }),
      evidenceType: "multi-news" });
  }
  const cutoff = Date.now() - 30 * 86_400_000;
  const stories = (await db.streamItems.where("kind").equals("industry").toArray()).filter(i => i.status === "active" && i.evidenceType === "direct-feed" && i.dateBasis === "published" && Date.parse(i.publishedAt) >= cutoff);
  for (const term of terms) for (const story of stories) {
    if (isOwnedDomainCoverage(term, story)) continue;
    const identity = verifyMentionAgainstText(term, `${story.title} ${story.summary || ""}`, story.sourceUrl);
    if (!identity) continue;
    payload.push({ title: story.title, url: story.url, source: story.source, sourceUrl: story.sourceUrl,
      sourceId: term.id, matchedTerm: term.term, summary: story.summary, publishedAt: story.publishedAt,
      dateBasis: "published", score: localScore(story), verification: identity.verification,
      verificationReason: identity.reason, confidence: identity.confidence, matchedAnchors: identity.matchedAnchors, evidenceType: "tracked-feed" });
  }
  const added = await persistItems("mention", payload);
  const checked = results.filter(r => r.checked).length;
  const matched = new Set(payload.map(i => `${i.sourceId}:${canonicalUrl(i.url)}`)).size;
  const failed = terms.length - checked;
  const outcome = coverageOutcome(terms.length, failed, matched);
  const partial = errors.length > 0 && checked > 0;
  await writeCollectorHealth("mentions", "Mentions", outcome === "not-configured" ? "not-configured" : outcome === "unavailable" ? "error" : partial || outcome === "partial" ? "stale" : "ok",
    `${checked}/${terms.length} watch terms checked; ${matched} matching results; ${added} newly stored. Identity matching is not fact-checking.`, errors.join(" · ") || undefined);
  queueCloudPush();
  return { added, errors, checked, failed, matched, total: terms.length, partial, outcome, details: results.map(r => ({ term: r.term, checked: r.checked, matches: r.items.length, candidates: r.candidates, excludedOwned: r.excludedOwned, error: r.error, cached: r.cached, providers: r.providers })) };
}

let audienceFlight: Promise<Awaited<ReturnType<typeof collectAudienceOnce>>> | null = null;
export function runAudienceCollector() {
  if (!audienceFlight) audienceFlight = collectAudienceOnce().finally(() => { audienceFlight = null; });
  return audienceFlight;
}
async function collectAudienceOnce() {
  const accounts = await db.audienceAccounts.toArray();
  const readings: Awaited<ReturnType<typeof collectAudience>>["readings"] = [];
  let capabilities: Awaited<ReturnType<typeof collectAudience>>["capabilities"] | null = null;
  for (const batch of chunksOf(accounts, 6)) {
    const response = await collectAudience({ data: { accounts: batch.map(a => ({ id: a.id, platform: a.platform, url: a.url })) } });
    readings.push(...response.readings);
    capabilities = response.capabilities;
  }
  let succeeded = 0;
  for (const reading of readings) {
    const trusted = isTrustedAudienceReading(reading);
    const account = accounts.find(a => a.id === reading.accountId);
    if (trusted) {
      succeeded++;
      const prior = await db.audienceReadings.where("accountId").equals(reading.accountId).toArray();
      const recent = prior.filter(p => isTrustedAudienceReading(p) && Date.parse(reading.capturedAt) - Date.parse(p.capturedAt) < 12 * 3_600_000).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
      const record = { ...reading, id: recent?.id || genId() };
      await db.audienceReadings.put(record);
      markCloudRecordDirty("audienceReadings", record.id);
    }
    await db.audienceAccounts.update(reading.accountId, { lastCheckedAt: reading.capturedAt,
      lastStatus: trusted ? "ok" : reading.status === "ok" ? "unavailable" : reading.status,
      lastEvidence: reading.evidence, lastAction: reading.action, lastError: trusted ? undefined : reading.errorCode || "metric-unavailable",
      lastSuccessAt: trusted ? reading.capturedAt : account?.lastSuccessAt });
    markCloudRecordDirty("audienceAccounts", reading.accountId);
  }
  const unavailable = readings.length - succeeded;
  const details = readings.map(r => ({ ...r, label: accounts.find(a => a.id === r.accountId)?.handle || r.accountId }));
  await writeCollectorHealth("audience", "Audience", !accounts.length ? "not-configured" : !succeeded ? "error" : unavailable ? "stale" : "ok",
    `${succeeded}/${readings.length} profiles returned a current verified metric.`, unavailable ? details.filter(r => !isTrustedAudienceReading(r)).map(r => `${r.label}: ${r.evidence}`).join(" · ") : undefined);
  queueCloudPush();
  return { updated: readings.length, succeeded, unavailable, details, capabilities };
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
