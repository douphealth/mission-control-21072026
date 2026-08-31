// ─── Reliability indicators ──────────────────────────────────────────────────
// One truth table for "what is synced and what is not". Every integration
// reports here, and the UI never shows a number without its age.

import { db, type SyncHealth, type SyncSourceId } from '@/lib/db';

export const SYNC_SOURCES: { id: SyncSourceId; label: string; hint: string }[] = [
  { id: 'cloud', label: 'Cloud backup', hint: 'Cross-device sync of every record' },
  { id: 'google-calendar', label: 'Google Calendar', hint: 'Tasks pushed as calendar events' },
  { id: 'wordpress', label: 'WordPress sites', hint: 'Core, plugin and update status' },
  { id: 'gsc', label: 'Search Console', hint: 'Clicks, impressions, indexing' },
  { id: 'ga4', label: 'Analytics (GA4)', hint: 'Sessions and conversions' },
  { id: 'bing', label: 'Bing / Microsoft', hint: 'Bing Webmaster data' },
  { id: 'feeds', label: 'Industry feeds', hint: 'News and mention collection' },
  { id: 'audience', label: 'Audience metrics', hint: 'Public follower readings' },
];

const STALE_HOURS = 26;

export async function reportSync(
  id: SyncSourceId | string,
  patch: Partial<Omit<SyncHealth, 'id' | 'label'>> & { label?: string },
): Promise<void> {
  try {
    const existing = await db.syncHealth.get(id);
    const label = patch.label ?? existing?.label ?? SYNC_SOURCES.find((s) => s.id === id)?.label ?? id;
    await db.syncHealth.put({
      id,
      label,
      status: patch.status ?? existing?.status ?? 'not-configured',
      lastSuccessAt: patch.status === 'ok' ? new Date().toISOString() : patch.lastSuccessAt ?? existing?.lastSuccessAt,
      lastAttemptAt: new Date().toISOString(),
      pending: patch.pending ?? existing?.pending,
      error: patch.status === 'ok' ? undefined : patch.error ?? existing?.error,
      detail: patch.detail ?? existing?.detail,
    });
  } catch {
    /* health reporting must never break the caller */
  }
}

export function ageLabel(iso?: string): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return 'unknown';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function effectiveStatus(row?: SyncHealth): SyncHealth['status'] {
  if (!row) return 'not-configured';
  if (row.status === 'ok' && row.lastSuccessAt) {
    const hrs = (Date.now() - new Date(row.lastSuccessAt).getTime()) / 3_600_000;
    if (hrs > STALE_HOURS) return 'stale';
  }
  return row.status;
}

export const STATUS_STYLE: Record<SyncHealth['status'], { label: string; cls: string; dot: string }> = {
  ok: { label: 'Synced', cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  syncing: { label: 'Syncing', cls: 'text-sky-600 bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-500 animate-pulse' },
  stale: { label: 'Stale', cls: 'text-amber-600 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' },
  error: { label: 'Failing', cls: 'text-red-600 bg-red-500/10 border-red-500/20', dot: 'bg-red-500' },
  'not-configured': { label: 'Not connected', cls: 'text-muted-foreground bg-secondary/60 border-border/40', dot: 'bg-muted-foreground/50' },
};
