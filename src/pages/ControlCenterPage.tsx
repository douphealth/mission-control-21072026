import CollectorStatusPanel from "@/components/controlcenter/CollectorStatusPanel";
import { isTrustedAudienceReading, isRecentIso } from "@/lib/intelligenceQuality";
import { useMemo, useState } from "react";
import { RefreshCw, Newspaper, AtSign, Users, Bell, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  useAudienceAccounts,
  useAudienceReadings,
  useFeedSources,
  useReminders,
  useStreamItems,
  useWatchTerms,
  useTasks,
} from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { lastCollectorRun, runAllCollectors } from "@/lib/controlCenter";
import {
  CCHeader,
  EmptyState,
  Panel,
  StatTile,
  StreamRow,
  relTime,
} from "@/components/controlcenter/ui";

const nf = new Intl.NumberFormat("en-US");

export default function ControlCenterPage() {
  const items = useStreamItems();
  const sources = useFeedSources();
  const terms = useWatchTerms();
  const accounts = useAudienceAccounts();
  const readings = useAudienceReadings();
  const reminders = useReminders();
  const tasks = useTasks();
  const captures = tasks.filter(t => t.inbox && !t.archived && !t.deletedAt && t.status !== "done");
  const { setActiveSection } = useNavigationStore();
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(() => lastCollectorRun());

  const active = useMemo(() => items.filter((i) => i.status === "active" && i.dateBasis === "published" && isRecentIso(i.publishedAt, 30)), [items]);
  const topStories = useMemo(
    () =>
      active
        .filter((i) => i.kind === "industry")
        .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 6),
    [active],
  );
  const topMentions = useMemo(
    () =>
      active
        .filter((i) => i.kind === "mention")
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 5),
    [active],
  );
  const dueReminders = useMemo(
    () =>
      reminders
        .filter(
          (r) =>
            r.status !== "done" && new Date(r.remindAt).getTime() <= Date.now() + 24 * 3_600_000,
        )
        .sort((a, b) => a.remindAt.localeCompare(b.remindAt)),
    [reminders],
  );
  const audienceTotals = useMemo(() => {
    let followers = 0;
    let observedAccounts = 0;
    accounts.forEach((a) => {
      const latest = readings
        .filter((r) => r.accountId === a.id && isTrustedAudienceReading(r) && isRecentIso(r.capturedAt, 1))
        .sort((x, y) => y.capturedAt.localeCompare(x.capturedAt))[0];
      if (latest && latest.followers !== null) {
        followers += latest.followers;
        observedAccounts += 1;
      }
    });
    return { followers, observedAccounts };
  }, [accounts, readings]);

  const refreshAll = async () => {
    setBusy(true);
    try {
      const res = await runAllCollectors();
      setLastRun(res.attemptedAt);
      const description = `${res.industry.added} stories; ${res.mentions.added} mentions; ${res.audience.succeeded} verified audience updates. ${res.errors.slice(0, 2).join("; ")}`;
      if (res.outcome === "complete") toast.success("Refresh complete", { description });
      else if (res.outcome === "not-configured") toast.info("Add enabled sources or profiles before refreshing");
      else toast.warning(res.outcome === "partial" ? "Refresh partially completed" : "Refresh unavailable", { description });
    } catch (e: any) {
      toast.error("Refresh failed", { description: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  };

  const nothingConfigured = !sources.some(s => s.enabled) && !terms.some(t => t.enabled) && !accounts.length;

  return (
    <div className="space-y-6">
      <CCHeader
        title="Control Center"
        subtitle={
          lastRun
            ? `Last refresh attempt ${relTime(lastRun)} - source status below`
            : "Industry news, brand mentions, audience and reminders in one place."
        }
        actions={
          <button
            onClick={refreshAll}
            disabled={busy || nothingConfigured}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh everything
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Stories (30 days)"
          value={active.filter((i) => i.kind === "industry").length}
          hint={`${sources.filter(s => s.enabled).length} enabled sources`}
        />
        <StatTile
          label="Mentions (30 days)"
          value={active.filter((i) => i.kind === "mention").length}
          hint={`${terms.filter(t => t.enabled).length} enabled terms`}
        />
        <StatTile
          label="Followers (fresh <24h)"
          value={audienceTotals.observedAccounts ? nf.format(audienceTotals.followers) : "—"}
          hint={`${audienceTotals.observedAccounts}/${accounts.length} profiles observed`}
        />
        <StatTile label="Reminders due" value={dueReminders.length} hint="next 24 hours" />
      </div>

      <CollectorStatusPanel kind="all" />
      <Panel><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Captured tasks awaiting a decision <span className="text-primary">{captures.length}</span></h2><button className="min-h-11 rounded-xl border border-border px-3 text-sm" onClick={() => setActiveSection("tasks")}>Open Tasks</button></div>{captures.length ? <div className="mt-3 space-y-2">{captures.slice(0, 5).map(t => <div key={t.id} className="rounded-xl bg-secondary/50 px-3 py-2 text-sm">{t.title}</div>)}</div> : <p className="mt-2 text-sm text-muted-foreground">No saved tasks are waiting in the capture inbox.</p>}</Panel>
      {nothingConfigured ? (
        <EmptyState
          title="Set up your Control Center"
          hint="Add news sources in Industry, watch terms in Mentions, and profiles in Audience. Public feeds need no key; restricted audience networks require official API access."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Newspaper size={15} className="text-primary" /> Top industry stories
              </h3>
              <button
                onClick={() => setActiveSection("industry")}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Open <ArrowRight size={11} />
              </button>
            </div>
            <div className="space-y-2.5">
              {topStories.length ? (
                topStories.map((s) => <StreamRow key={s.id} item={s} />)
              ) : (
                <p className="text-xs text-muted-foreground">
                  No stories yet — refresh to pull your feeds.
                </p>
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
                  onClick={() => setActiveSection("mentions")}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Open <ArrowRight size={11} />
                </button>
              </div>
              <div className="space-y-2.5">
                {topMentions.length ? (
                  topMentions.map((m) => <StreamRow key={m.id} item={m} />)
                ) : (
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
                  onClick={() => setActiveSection("reminders")}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Open <ArrowRight size={11} />
                </button>
              </div>
              {dueReminders.length ? (
                <div className="space-y-2">
                  {dueReminders.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-foreground">{r.title}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {relTime(r.remindAt)}
                      </span>
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
                  onClick={() => setActiveSection("audience")}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Open <ArrowRight size={11} />
                </button>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
                {audienceTotals.observedAccounts ? nf.format(audienceTotals.followers) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                fresh verified follower observations across {audienceTotals.observedAccounts}/{accounts.length} tracked profiles
              </p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
