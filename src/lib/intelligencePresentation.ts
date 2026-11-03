import type { FeedSource, StreamItem } from "./db";
import { attributedArticle, canonicalWebUrl, normalizeIntelText } from "./intelligenceQuality";

export type FeedSourceGroup = FeedSource & { memberIds: string[]; duplicateCount: number };
export type StreamItemGroup = StreamItem & { memberIds: string[]; duplicateCount: number };

/** View-only grouping keeps legacy/cloud records intact and preserves pause choices. */
export function groupFeedSources(records: FeedSource[]): FeedSourceGroup[] {
  const groups = new Map<string, FeedSource[]>();
  for (const record of records) {
    const topicIdentity = [...new Set((record.topics || []).map(normalizeIntelText).filter(Boolean))].sort();
    const key = JSON.stringify([canonicalWebUrl(record.url), topicIdentity, record.enabled]);
    const members = groups.get(key) || [];
    members.push(record); groups.set(key, members);
  }
  return [...groups.values()].map(members => {
    const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
    const latest = [...ordered].sort((a, b) => (b.lastCheckedAt || "").localeCompare(a.lastCheckedAt || ""))[0];
    const topics = new Map<string, string>();
    for (const row of ordered) for (const value of row.topics || []) {
      const key = normalizeIntelText(value);
      if (key && !topics.has(key)) topics.set(key, value.trim());
    }
    return {
      ...ordered[0],
      topics: [...topics.values()],
      feedUrl: latest.feedUrl || ordered.find(row => row.feedUrl)?.feedUrl,
      lastCheckedAt: latest.lastCheckedAt,
      lastError: latest.lastError,
      memberIds: ordered.map(row => row.id),
      duplicateCount: ordered.length - 1,
    };
  });
}

/** Collapse exact article identities only, retaining distinct statuses and watch rules. */
export function deduplicateStreamItems(
  records: StreamItem[],
  watchIdentities?: ReadonlyMap<string, string>,
): StreamItemGroup[] {
  const groups = new Map<string, StreamItem[]>();
  for (const record of records) {
    const identity = record.kind === "mention"
      ? watchIdentities?.get(record.sourceId || "") || record.sourceId || normalizeIntelText(record.matchedTerm || "")
      : "";
    const key = JSON.stringify([record.kind, canonicalWebUrl(record.url), identity, record.status]);
    const members = groups.get(key) || [];
    members.push(record); groups.set(key, members);
  }
  return [...groups.values()].map(members => {
    const evidence = (item: StreamItem) =>
      (item.evidenceType === "direct-feed" || item.evidenceType === "tracked-feed" ? 4 : 0) +
      (item.dateBasis === "published" ? 2 : 0) + (item.summary ? 1 : 0);
    const ordered = [...members].sort((a, b) => evidence(b) - evidence(a) || a.id.localeCompare(b.id));
    return {
      ...attributedArticle(ordered[0]),
      discoveredAt: ordered.map(row => row.discoveredAt).filter(Boolean).sort()[0] || ordered[0].discoveredAt,
      memberIds: ordered.map(row => row.id).sort(),
      duplicateCount: ordered.length - 1,
    };
  });
}
