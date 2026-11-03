import { db, type FeedSource } from "./db";
import { stableBootstrapId } from "./bootstrapIdentity";
import { canonicalWebUrl } from "./intelligenceQuality";
import { markCloudRecordDirty } from "./cloudSync";

/** Idempotent across tabs/devices; a duplicate add never resumes a paused source. */
export async function ensureFeedSource(input: Omit<FeedSource, "id">) {
  const identity = canonicalWebUrl(input.url);
  const id = await stableBootstrapId("feed-v2", identity);
  const result = await db.transaction("rw", db.feedSources, async () => {
    const existing = (await db.feedSources.toArray()).find(row =>
      canonicalWebUrl(row.url) === identity || Boolean(row.feedUrl && canonicalWebUrl(row.feedUrl) === identity));
    if (existing) return { record: existing, created: false };
    const record: FeedSource = { ...input, url: identity, id };
    await db.feedSources.add(record);
    return { record, created: true };
  });
  if (result.created) markCloudRecordDirty("feedSources", result.record.id);
  return result;
}
