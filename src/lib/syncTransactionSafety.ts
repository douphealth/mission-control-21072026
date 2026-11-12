export type JournalOperation = 'put' | 'delete';
export interface CompletableTransaction {
  on: (event: 'complete', callback: () => void) => unknown;
}

/** Coalesce row operations until the whole native transaction commits. */
export function createCommittedMutationBuffer(
  publish: (changes: ReadonlyMap<string, JournalOperation>, fields: ReadonlyMap<string, string[] | undefined>) => void,
) {
  const pending = new WeakMap<object, Map<string, JournalOperation>>();
  // Changed field names per record; undefined means the whole record (create, delete or unknown).
  const changedFields = new WeakMap<object, Map<string, Set<string> | null>>();
  const ignored = new WeakSet<object>();
  return {
    ignore(transaction: object) { ignored.add(transaction); },
    stage(transaction: CompletableTransaction, recordKey: string, operation: JournalOperation, fields?: readonly string[]) {
      if (ignored.has(transaction)) return;
      let batch = pending.get(transaction);
      let batchFields = changedFields.get(transaction);
      if (!batch || !batchFields) {
        batch = new Map();
        batchFields = new Map();
        pending.set(transaction, batch);
        changedFields.set(transaction, batchFields);
        const committed = batch, committedFields = batchFields;
        transaction.on('complete', () => {
          pending.delete(transaction);
          changedFields.delete(transaction);
          publish(committed, new Map([...committedFields].map(([k, v]) => [k, v ? [...v] : undefined])));
        });
      }
      const seen = batchFields.has(recordKey);
      const previous = batchFields.get(recordKey);
      if (operation === 'delete' || !fields || (seen && previous === null)) batchFields.set(recordKey, null);
      else batchFields.set(recordKey, new Set([...(previous || []), ...fields]));
      batch.set(recordKey, operation);
    },
  };
}

/** No cache mutation before the database's transaction promise resolves. */
export async function applyAndConfirm(
  receipts: Map<string, string>,
  apply: (staged: Map<string, string>) => Promise<unknown>,
  isCurrent: () => boolean,
  limit = 20_000,
): Promise<void> {
  const staged = new Map<string, string>();
  await apply(staged);
  if (!isCurrent()) throw new Error('Account changed before confirming local synchronization.');
  for (const [key, revision] of staged) {
    receipts.delete(key);
    receipts.set(key, revision);
  }
  while (receipts.size > Math.max(1, limit)) {
    const oldest = receipts.keys().next().value;
    if (oldest === undefined) break;
    receipts.delete(oldest);
  }
}
