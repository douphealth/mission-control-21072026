import { revisionOf, type RemoteRecords } from "@/lib/cloudSyncProtocol";

/**
 * Google Drive may acknowledge a multipart upload before a subsequent media
 * GET returns the new revision. Confirm the exact written file before clearing
 * the local dirty journal; never treat the upload HTTP status alone as a sync.
 */
export function mismatchedReadbackKeys(
  expected: RemoteRecords,
  observed: RemoteRecords,
  keys: readonly string[],
): number {
  let mismatched = 0;
  for (const key of keys) {
    const target = expected[key];
    const actual = observed[key];
    if (!target || !actual ||
        revisionOf(target) !== revisionOf(actual) ||
        actual.deleted !== target.deleted ||
        JSON.stringify(actual.data) !== JSON.stringify(target.data)) mismatched++;
  }
  return mismatched;
}

type ReadbackOptions = {
  /** Allows fast deterministic tests without real timers. */
  sleep?: (milliseconds: number) => Promise<void>;
  delaysMs?: readonly number[];
};

const pause = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(resolve, milliseconds));

function isNonRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /(?:Google session expired|Google session changed|Account changed|Google Drive sync failed \((?:400|401|403)\))/.test(error.message);
}

/**
 * Poll only the newly written file ID: a listing-based read can pick an older
 * writer snapshot. Keep the queue intact if every attempt fails verification.
 */
export async function confirmCloudReadback(
  expected: RemoteRecords,
  keys: readonly string[],
  read: () => Promise<RemoteRecords>,
  options: ReadbackOptions = {},
): Promise<void> {
  if (keys.length === 0) return;
  const delays = options.delaysMs ?? [0, 300, 800, 1600, 3000];
  const sleep = options.sleep ?? pause;
  let remaining = keys.length;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (attempt > 0) await sleep(delays[attempt]);
    try {
      const seen = await read();
      remaining = mismatchedReadbackKeys(expected, seen, keys);
      if (remaining === 0) return;
    } catch (error) {
      if (isNonRetryable(error)) throw error;
    }
  }
  throw new Error(
    "Google Drive accepted the upload, but read-back did not confirm " +
    remaining + " record revision(s) after " + delays.length +
    " checks. Changes remain queued locally; no records were discarded.",
  );
}
