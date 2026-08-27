import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useAudienceAccounts, useAudienceReadings, genId } from '@/hooks/useTableData';
import { db, type AudiencePlatform } from '@/lib/db';
import { markCloudRecordDirty, queueCloudPush } from '@/lib/cloudSync';
import { runAudienceCollector } from '@/lib/controlCenter';
import { CCHeader, EmptyState, Panel, relTime } from '@/components/controlcenter/ui';

const PLATFORMS: { id: AudiencePlatform; label: string; hint: string }[] = [
  { id: 'youtube', label: 'YouTube', hint: 'https://youtube.com/@handle' },
  { id: 'x', label: 'X', hint: 'https://x.com/handle' },
  { id: 'instagram', label: 'Instagram', hint: 'https://instagram.com/handle' },
  { id: 'facebook', label: 'Facebook', hint: 'https://facebook.com/page' },
  { id: 'linkedin', label: 'LinkedIn', hint: 'https://linkedin.com/company/x' },
  { id: 'threads', label: 'Threads', hint: 'https://threads.net/@handle' },
  { id: 'tiktok', label: 'TikTok', hint: 'https://tiktok.com/@handle' },
];

const nf = new Intl.NumberFormat('en-US');

export default function AudiencePage() {
  const accounts = useAudienceAccounts();
  const readings = useAudienceReadings();
  const [platform, setPlatform] = useState<AudiencePlatform>('youtube');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const byAccount = useMemo(() => {
    const map = new Map<string, typeof readings>();
    readings.forEach((r) => {
      const list = map.get(r.accountId) ?? [];
      list.push(r);
      map.set(r.accountId, list);
    });
    map.forEach((list) => list.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)));
    return map;
  }, [readings]);

  const addAccount = async () => {
    const clean = url.trim();
    if (!clean) return;
    const normalised = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    let handle = '';
    try {
      handle = new URL(normalised).pathname.replace(/^\/+|\/+$/g, '') || new URL(normalised).hostname;
    } catch {
      toast.error('That does not look like a valid profile URL');
      return;
    }
    const record = {
      id: genId(),
      platform,
      handle,
      url: normalised,
      createdAt: new Date().toISOString(),
    };
    await db.audienceAccounts.put(record);
    markCloudRecordDirty('audienceAccounts', record.id);
    queueCloudPush();
    setUrl('');
    toast.success(`Tracking ${handle}`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const { updated } = await runAudienceCollector();
      toast.success(updated ? `Updated ${updated} ${updated === 1 ? 'account' : 'accounts'}` : 'Nothing to update');
    } catch (e: any) {
      toast.error('Audience refresh failed', { description: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <CCHeader
        title="Audience"
        subtitle="Follower growth across your public profiles. Unavailable readings stay blank — never a false zero."
        actions={
          <button
            onClick={refresh}
            disabled={busy || !accounts.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Refresh metrics
          </button>
        }
      />

      <Panel>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-3">Track a profile</p>
        <div className="grid gap-2 sm:grid-cols-[auto_1.6fr_auto]">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as AudiencePlatform)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAccount()}
            placeholder={PLATFORMS.find((p) => p.id === platform)?.hint}
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <button
            onClick={addAccount}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
          >
            <Plus size={14} /> Track
          </button>
        </div>
      </Panel>

      {accounts.length === 0 ? (
        <EmptyState title="No profiles tracked yet" hint="Add a public profile URL to start charting follower growth." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const list = byAccount.get(a.id) ?? [];
            const latest = [...list].reverse().find((r) => r.followers !== null);
            const previous = [...list].reverse().filter((r) => r.followers !== null)[1];
            const delta = latest && previous ? (latest.followers ?? 0) - (previous.followers ?? 0) : 0;
            const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
            return (
              <Panel key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                      {PLATFORMS.find((p) => p.id === a.platform)?.label ?? a.platform}
                    </p>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-foreground hover:text-primary truncate block"
                    >
                      {a.handle}
                    </a>
                  </div>
                  <button
                    onClick={async () => {
                      await db.audienceAccounts.delete(a.id);
                      markCloudRecordDirty('audienceAccounts', a.id, 'delete');
                      queueCloudPush();
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove profile"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-3xl font-bold text-foreground mt-3 tabular-nums">
                  {latest?.followers !== undefined && latest?.followers !== null ? nf.format(latest.followers) : '—'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Icon size={12} className={delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : ''} />
                  {delta !== 0 ? `${delta > 0 ? '+' : ''}${nf.format(delta)} since last reading` : 'No change recorded'}
                  {a.lastCheckedAt && <span>· {relTime(a.lastCheckedAt)}</span>}
                </p>
                {a.lastStatus && a.lastStatus !== 'ok' && (
                  <p className="text-[11px] text-amber-500 mt-2">
                    {a.lastStatus === 'unavailable'
                      ? 'Profile unreachable from the server.'
                      : 'This platform hides counts from public pages.'}
                  </p>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
