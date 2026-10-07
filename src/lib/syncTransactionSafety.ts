export type JournalOperation = 'put' | 'delete';
export interface CompletableTransaction {
  on: (event: 'complete', callback: () => void) => unknown;
}

/** Coalesce row operations until the whole native transaction commits. */
export function createCommittedMutationBuffer(
  publish: (changes: ReadonlyMap<string, JournalOperation>) => void,
) {
  const pending = new WeakMap<object, Map<string, JournalOperation>>();
  const ignored = new WeakSet<object>();
  return {
    ignore(transaction: object) { ignored.add(transaction); },
    stage(transaction: CompletableTransaction, recordKey: string, operation: JournalOperation) {
      if (ignored.has(transaction)) return;
      let batch = pending.get(transaction);
      if (!batch) {
        batch = new Map();
        pending.set(transaction, batch);
        const committed = batch;
        transaction.on('complete', () => {
          pending.delete(transaction);
          publish(committed);
        });
      }
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
