import { db, type WatchTerm } from "./db";
import { markCloudRecordDirty } from "./cloudSync";
import { normalizeIntelText } from "./intelligenceQuality";
import { stableBootstrapId } from "./bootstrapIdentity";

type WatchConfiguration = Pick<WatchTerm, "term" | "type" | "anchors" | "negatives">;

/** Compare only equivalent identity rules. Different anchors/exclusions stay separate. */
export function watchIdentityKey(watch: WatchConfiguration): string {
  let term = normalizeIntelText(watch.term);
  if (watch.type === "domain") term = term.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].replace(/\.$/, "");
  if (watch.type === "handle") term = term.replace(/^@/, "");
  const phrases = (values: string[] = []) => [...new Set(values.map(normalizeIntelText).filter(Boolean))].sort();
  return JSON.stringify([watch.type, term, phrases(watch.anchors), phrases(watch.negatives)]);
}

export type WatchTermGroup = WatchTerm & { records: WatchTerm[]; memberIds: string[] };

/** Non-destructive view: retain every saved row and every source ID. */
export function groupWatchTerms(records: WatchTerm[]): WatchTermGroup[] {
  const groups = new Map<string, WatchTerm[]>();
  for (const record of records) {
    // A paused rule is a different user preference; never silently re-enable it.
    const key = `${watchIdentityKey(record)}:${record.enabled ? "enabled" : "paused"}`;
    const members = groups.get(key) || [];
    members.push(record); groups.set(key, members);
  }
  return [...groups.values()].map(members => {
    const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
    const latest = [...ordered].sort((a, b) => (b.lastCheckedAt || "").localeCompare(a.lastCheckedAt || ""))[0];
    return {
      ...ordered[0],
      lastCheckedAt: latest.lastCheckedAt,
      lastError: latest.lastError,
      lastSuccessAt: ordered.map(row => row.lastSuccessAt).filter((value): value is string => Boolean(value)).sort().at(-1),
      records: ordered,
      memberIds: ordered.map(row => row.id),
    };
  }).sort((a, b) => a.term.localeCompare(b.term) || a.id.localeCompare(b.id));
}

export async function deterministicWatchId(watch: WatchConfiguration): Promise<string> {
  return stableBootstrapId("watch-v1", watchIdentityKey(watch));
}

/** Serializes same-device tabs; stable IDs also converge independently seeded devices. */
export async function ensureWatchTerm(input: Omit<WatchTerm, "id">) {
  const identity = watchIdentityKey(input);
  // Complete crypto work before entering the IndexedDB transaction.
  const id = await deterministicWatchId(input);
  const result = await db.transaction("rw", db.watchTerms, async () => {
    const existing = (await db.watchTerms.toArray())
      .filter(row => watchIdentityKey(row) === identity)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (existing) return { record: existing, created: false };
    const record: WatchTerm = { ...input, id };
    await db.watchTerms.add(record);
    return { record, created: true };
  });
  if (result.created) markCloudRecordDirty("watchTerms", result.record.id);
  return result;
}
