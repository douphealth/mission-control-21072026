import { useMemo, useState } from 'react';
import { RefreshCw, Newspaper, AtSign, Users, Bell, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAudienceAccounts, useAudienceReadings, useFeedSources, useReminders, useStreamItems, useWatchTerms } from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { lastCollectorRun, runAllCollectors } from '@/lib/controlCenter';
import { CCHeader, EmptyState, Panel, StatTile, StreamRow, relTime } from '@/components/controlcenter/ui';

const nf = new Intl.NumberFormat('en-US');

export default function ControlCenterPage() {
  const items = useStreamItems();
  const sources = useFeedSources();
  const terms = useWatchTerms();
  const accounts = useAudienceAccounts();
  const readings = useAudienceReadings();
  const reminders = useReminders();
  const { setActiveSection } = useNavigationStore();
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(() => lastCollectorRun());

  const active = useMemo(() => items.filter((i) => i.status === 'active'), [items]);
  const topStories = useMemo(
    () =>
      active
        .filter((i) => i.kind === 'industry')
        .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 6),
    [active],
  );
  const topMentions = useMemo(
    () => active.filter((i) => i.kind === 'mention').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5),
    [active],
  );
  const dueReminders = useMemo(
    () =>
      reminders
        .filter((r) => r.status !== 'done' && new Date(r.remindAt).getTime() <= Date.now() + 24 * 3_600_000)
        .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
        .slice(0, 5),
    [reminders],
  );
  const totalFollowers = useMemo(() => {
    let sum = 0;
    accounts.forEach((a) => {
      const latest = readings
        .filter((r) => r.accountId === a.id && r.followers !== null)
        .sort((x, y) => y.capturedAt.localeCompare(x.capturedAt))[0];
      if (latest?.followers) sum += latest.followers;
    });
    return sum;
  }, [accounts, readings]);

  const refreshAll = async () => {
    setBusy(true);
    try {
      const res = await runAllCollectors();
      setLastRun(new Date().toISOString());
      toast.success('Control Center refreshed', {
        description: `${res.industry.added} stories · ${res.mentions.added} mentions · ${res.audience.updated} profiles`,
      });
    } catch (e: any) {
      toast.error('Refresh failed', { description: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  };

  const nothingConfigured = !sources.length && !terms.length && !accounts.length;

  return (
    <div className="space-y-6">
      <CCHeader
        title="Control Center"
        subtitle={lastRun ? `Last refreshed ${relTime(lastRun)}` : 'Industry news, brand mentions, audience and reminders in one place.'}
        actions={
          <button
            onClick={refreshAll}
            disabled={busy || nothingConfigured}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Refresh everything
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Stories" value={active.filter((i) => i.kind === 'industry').length} hint={`${sources.length} sources`} />
        <StatTile label="Mentions" value={active.filter((i) => i.kind === 'mention').length} hint={`${terms.length} watched terms`} />
        <StatTile label="Followers" value={totalFollowers ? nf.format(totalFollowers) : '—'} hint={`${accounts.length} profiles`} />
        <StatTile label="Reminders due" value={dueReminders.length} hint="next 24 hours" />
      </div>

      {nothingConfigured ? (
        <EmptyState
          title="Set up your Control Center"
          hint="Add news sources in Industry, watch terms in Mentions, and profiles in Audience. Everything runs on free public feeds — no API key needed."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Newspaper size={15} className="text-primary" /> Top industry stories
              </h3>
              <button
                onClick={() => setActiveSection('industry')}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Open <ArrowRight size={11} />
              </button>
            </div>
            <div className="space-y-2.5">
              {topStories.length ? topStories.map((s) => <StreamRow key={s.id} item={s} />) : (
                <p className="text-xs text-muted-foreground">No stories yet — refresh to pull your feeds.</p>
              )}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AtSign size={15} className="text-primary" /> Recent mentions
                </h3>
                <button
                  onClick={() => setActiveSection('mentions')}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Open <ArrowRight size={11} />
                </button>
              </div>
              <div className="space-y-2.5">
                {topMentions.length ? topMentions.map((m) => <StreamRow key={m.id} item={m} />) : (
                  <p className="text-xs text-muted-foreground">No verified mentions yet.</p>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Bell size={15} className="text-primary" /> Reminders
                </h3>
                <button
                  onClick={() => setActiveSection('reminders')}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Open <ArrowRight size={11} />
                </button>
              </div>
              {dueReminders.length ? (
                <div className="space-y-2">
                  {dueReminders.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-foreground">{r.title}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{relTime(r.remindAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nothing due in the next 24 hours.</p>
              )}
            </Panel>

            <Panel>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users size={15} className="text-primary" /> Audience
                </h3>
                <button
                  onClick={() => setActiveSection('audience')}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Open <ArrowRight size={11} />
                </button>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
                {totalFollowers ? nf.format(totalFollowers) : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">total followers across {accounts.length} tracked profiles</p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
