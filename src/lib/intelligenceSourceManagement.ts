import type { Table } from "dexie";
import { db, genId, type FeedSource, type WatchTerm, type UserSettings } from "./db";
import { markCloudRecordDirty, queueCloudPush } from "./cloudSync";
import { canonicalWebUrl } from "./intelligenceQuality";
import { watchSubjectKey } from "./watchTerms";
import {
  seedPreferenceId,
  seedPreferenceRecord,
  type SeedCollection,
} from "./bootstrapPreferences";

type RemovedSources<T> = {
  records: T[];
  preferences: Array<{ id: string; previous?: UserSettings; revision: string }>;
};

async function removeSources<T extends { id: string }>(
  collection: SeedCollection,
  table: Table<T>,
  ids: string[],
  subjectOf: (record: T) => string,
): Promise<RemovedSources<T>> {
  const uniqueIds = [...new Set(ids)];
  const before = (await table.bulkGet(uniqueIds)).filter((row): row is T => row !== undefined);
  const subjects = [...new Set(before.map(subjectOf))];
  // SHA-256 runs before opening the IndexedDB transaction.
  const preferenceIds = new Map(
    await Promise.all(
      subjects.map(
        async (subject) => [subject, await seedPreferenceId(collection, subject)] as const,
      ),
    ),
  );
  const revision = genId();
  const removed = await db.transaction("rw", table, db.settings, async () => {
    const records = (await table.bulkGet(uniqueIds)).filter((row): row is T => row !== undefined);
    const currentSubjects = [...new Set(records.map(subjectOf))];
    const preferences: RemovedSources<T>["preferences"] = [];
    for (const subject of currentSubjects) {
      const id = preferenceIds.get(subject);
      if (!id) throw new Error("This source changed while it was being removed. Please try again.");
      const previous = await db.settings.get(id);
      await db.settings.put(
        seedPreferenceRecord(id, {
          collection,
          subject,
          dismissed: true,
          revision,
          changedAt: new Date().toISOString(),
        }),
      );
      preferences.push({ id, previous, revision });
    }
    await table.bulkDelete(records.map((row) => row.id));
    return { records, preferences };
  });
  removed.records.forEach((row) => markCloudRecordDirty(collection, row.id, "delete"));
  removed.preferences.forEach((row) => markCloudRecordDirty("settings", row.id));
  if (removed.records.length) queueCloudPush();
  return removed;
}

async function restoreSources<T extends { id: string }>(
  collection: SeedCollection,
  table: Table<T>,
  removed: RemovedSources<T>,
): Promise<void> {
  const revision = genId();
  const restored = await db.transaction("rw", table, db.settings, async () => {
    const preferences: UserSettings[] = [];
    for (const entry of removed.preferences) {
      const current = await db.settings.get(entry.id);
      if (current?.bootstrapSeedPreference?.revision !== entry.revision)
        throw new Error(
          "A later change replaced this removal. Refresh the source list before restoring.",
        );
      const prior = entry.previous?.bootstrapSeedPreference;
      preferences.push(
        seedPreferenceRecord(entry.id, {
          ...current.bootstrapSeedPreference,
          dismissed: prior?.dismissed ?? false,
          changedAt: new Date().toISOString(),
          revision,
        }),
      );
    }
    const restoredIds: string[] = [];
    for (const record of removed.records) {
      // Re-adding a source after removal is a newer user edit; Undo must not replace it.
      if (await table.get(record.id)) continue;
      await table.add(record);
      restoredIds.push(record.id);
    }
    for (const preference of preferences) await db.settings.put(preference);
    return restoredIds;
  });
  restored.forEach((id) => markCloudRecordDirty(collection, id));
  removed.preferences.forEach((row) => markCloudRecordDirty("settings", row.id));
  if (restored.length || removed.preferences.length) queueCloudPush();
}

export const removeFeedSources = (ids: string[]) =>
  removeSources("feedSources", db.feedSources, ids, (source: FeedSource) =>
    canonicalWebUrl(source.url),
  );
export const restoreFeedSources = (removed: RemovedSources<FeedSource>) =>
  restoreSources("feedSources", db.feedSources, removed);
export const removeWatchTerms = (ids: string[]) =>
  removeSources("watchTerms", db.watchTerms, ids, (watch: WatchTerm) => watchSubjectKey(watch));
export const restoreWatchTerms = (removed: RemovedSources<WatchTerm>) =>
  restoreSources("watchTerms", db.watchTerms, removed);
