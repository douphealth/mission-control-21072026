// ─── Audit history ───────────────────────────────────────────────────────────
// Every create / update / delete / decision / sync event is recorded locally so
// the user can always answer "what changed, when, and can I get it back?".

import { db, genId, type AuditEntry } from '@/lib/db';
import { redactSecrets, isSecretKey, REDACTED } from '@/lib/secrets';

const MAX_ENTRIES = 2000;

function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'server';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

export async function logAudit(entry: {
  action: AuditEntry['action'];
  collection: string;
  recordId: string;
  label: string;
  detail?: string;
  before?: any;
}): Promise<void> {
  try {
    // A snapshot must never carry live secret material into the history log.
    const { before, ...rest } = entry;
    await db.auditLog.put({
      id: genId(),
      at: new Date().toISOString(),
      device: deviceLabel(),
      ...rest,
      before: before === undefined ? undefined : redactSecrets(before),
    });
    const count = await db.auditLog.count();
    if (count > MAX_ENTRIES) {
      const stale = await db.auditLog.orderBy('at').limit(count - MAX_ENTRIES).toArray();
      await db.auditLog.bulkDelete(stale.map((e) => e.id));
    }
  } catch {
    /* audit must never break a write */
  }
}

/**
 * An audit snapshot is stored redacted, so it must never write `[redacted]`
 * over a live credential. Secret-bearing fields are dropped from the restore
 * payload and the current record's values are kept for them.
 */
export function stripRedactedFields<T>(snapshot: T, current?: any, depth = 0): T {
  if (depth > 8 || snapshot == null || typeof snapshot !== 'object') return snapshot;
  if (Array.isArray(snapshot)) return snapshot as T;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(snapshot as Record<string, unknown>)) {
    if (isSecretKey(key) || value === REDACTED) {
      if (current && current[key] !== undefined) out[key] = current[key];
      continue;
    }
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? stripRedactedFields(value, current?.[key], depth + 1)
        : value;
  }
  return out as T;
}

/** Restore a deleted / modified record from its audit snapshot. */
export async function restoreFromAudit(entry: AuditEntry): Promise<boolean> {
  if (!entry.before) return false;
  const table = (db as any)[entry.collection];
  if (!table?.put) return false;
  const current = await table.get(entry.recordId).catch(() => undefined);
  await table.put(stripRedactedFields(entry.before, current));
  await logAudit({
    action: 'update',
    collection: entry.collection,
    recordId: entry.recordId,
    label: `Restored: ${entry.label}`,
  });
  return true;
}

export function describeAudit(entry: AuditEntry): string {
  const verb: Record<AuditEntry['action'], string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    decision: 'Decision',
    sync: 'Sync',
    import: 'Imported',
  };
  return `${verb[entry.action] ?? entry.action} · ${entry.label}`;
}
