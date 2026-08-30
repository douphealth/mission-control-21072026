import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  ListChecks,
  PauseCircle,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  osDb,
  priorityScore,
  transitionWorkItem,
  type OSWorkItem,
} from '@/lib/osCore';
import { useNavigationStore } from '@/stores/navigationStore';

const EMPTY: readonly any[] = Object.freeze([]);

function isDueToday(item: OSWorkItem, today: string) {
  if (!item.dueAt) return false;
  return item.dueAt.slice(0, 10) === today;
}

function isAvailable(item: OSWorkItem) {
  const now = Date.now();
  if (item.notBefore && new Date(item.notBefore).getTime() > now) return false;
  if (item.cooldownUntil && new Date(item.cooldownUntil).getTime() > now) return false;
  return true;
}

function sortActionable(items: OSWorkItem[]) {
  return [...items].sort((a, b) => {
    if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
    if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
    const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (dueA !== dueB) return dueA - dueB;
    return priorityScore(b) - priorityScore(a);
  });
}

function Priority({ value }: { value: OSWorkItem['priority'] }) {
  const cls =
    value === 'critical' ? 'text-red-500 bg-red-500/10' :
    value === 'high' ? 'text-amber-500 bg-amber-500/10' :
    value === 'medium' ? 'text-blue-500 bg-blue-500/10' :
    'text-emerald-500 bg-emerald-500/10';
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${cls}`}>{value}</span>;
}

function WorkRow({ item, compact = false }: { item: OSWorkItem; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const project = useLiveQuery(() => item.projectId ? osDb.projects.get(item.projectId) : undefined, [item.projectId]);

  const change = async (status: OSWorkItem['status']) => {
    setBusy(true);
    try {
      await transitionWorkItem(item.id, status, { reason: `${item.title} -> ${status}` });
      toast.success(status === 'done' ? 'Completed' : `Moved to ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update item');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm transition hover:border-border/70">
      <div className="flex items-start gap-3">
        <button
          onClick={() => change('done')}
          disabled={busy}
          className="mt-0.5 shrink-0 rounded-full text-muted-foreground transition hover:text-emerald-500 disabled:opacity-40"
          title="Mark done"
        >
          <CheckCircle2 size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.title}</div>
            <Priority value={item.priority} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {project?.name && <span>{project.name}</span>}
            {item.dueAt && <span>Due {new Date(item.dueAt).toLocaleDateString()}</span>}
            {item.waitingFor && <span>Waiting for {item.waitingFor}</span>}
            <span>Score {priorityScore(item)}</span>
          </div>
          {!compact && item.nextAction && (
            <div className="mt-2 rounded-xl bg-secondary/45 px-3 py-2 text-xs text-foreground/80">
              Next: {item.nextAction}
            </div>
          )}
        </div>
        {!compact && item.status !== 'in-progress' && item.status !== 'waiting' && item.status !== 'blocked' && (
          <button
            onClick={() => change('in-progress')}
            disabled={busy}
            className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary transition hover:bg-primary/15 disabled:opacity-40"
            title="Start"
          >
            <Play size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children, count }: {
  title: string;
  subtitle: string;
  icon: typeof Target;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section className="rounded-[24px] border border-border/50 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2.5 text-primary"><Icon size={16} /></div>
          <div>
            <h2 className="text-sm font-bold text-foreground">{title}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {typeof count === 'number' && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DecisionCenterPage() {
  const workItems = useLiveQuery(() => osDb.workItems.toArray(), []) ?? (EMPTY as OSWorkItem[]);
  const findings = useLiveQuery(() => osDb.findings.toArray(), []) ?? EMPTY;
  const validations = useLiveQuery(() => osDb.validations.toArray(), []) ?? EMPTY;
  const projects = useLiveQuery(() => osDb.projects.toArray(), []) ?? EMPTY;
  const events = useLiveQuery(() => osDb.events.orderBy('occurredAt').reverse().limit(8).toArray(), []) ?? EMPTY;
  const { setActiveSection } = useNavigationStore();
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const open = useMemo(
    () => workItems.filter((w) => !['done', 'cancelled'].includes(w.status)),
    [workItems],
  );

  const now = useMemo(
    () => sortActionable(open.filter((w) => ['ready', 'scheduled', 'in-progress'].includes(w.status) && isAvailable(w))).slice(0, 3),
    [open],
  );

  const todayItems = useMemo(
    () => sortActionable(open.filter((w) => isDueToday(w, today) || (w.scheduledAt && w.scheduledAt.slice(0, 10) === today))).slice(0, 8),
    [open, today],
  );

  const waiting = useMemo(
    () => open.filter((w) => w.status === 'waiting' || w.status === 'blocked').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [open],
  );

  const validating = useMemo(
    () => open.filter((w) => w.status === 'validating' || w.status === 'monitoring').sort((a, b) => (a.reviewAt || '').localeCompare(b.reviewAt || '')),
    [open],
  );

  const inbox = useMemo(
    () => open.filter((w) => w.status === 'inbox').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [open],
  );

  const unresolvedFindings = findings.filter((f: any) => ['open', 'accepted', 'regression'].includes(f.status)).length;
  const pendingValidations = validations.filter((v: any) => v.status === 'pending' || v.status === 'inconclusive').length;
  const activeProjects = projects.filter((p: any) => p.status === 'active').length;

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return sortActionable(open.filter((w) => `${w.title} ${w.description ?? ''} ${w.nextAction ?? ''}`.toLowerCase().includes(q))).slice(0, 20);
  }, [search, open]);

  return (
    <div className="space-y-5 pb-8">
      <div className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Mission Control OS</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Decision Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              One source of truth. Work what matters, preserve context, validate changes, and do not reopen closed work without new evidence.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Open work', open.length],
              ['Active projects', activeProjects],
              ['Findings', unresolvedFindings],
              ['Validation due', pendingValidations],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-secondary/50 px-3 py-2.5 text-center">
                <div className="text-lg font-extrabold tabular-nums text-foreground">{value}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <label className="relative mt-5 block max-w-xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all active work..."
            className="w-full rounded-2xl border border-border/40 bg-secondary/40 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/40"
          />
        </label>
      </div>

      {search.trim() ? (
        <Panel title="Search results" subtitle="Active OS work matching your query" icon={Search} count={searched.length}>
          <div className="space-y-2">
            {searched.map((item) => <WorkRow key={item.id} item={item} />)}
            {!searched.length && <p className="py-5 text-center text-xs text-muted-foreground">No active work matches this search.</p>}
          </div>
        </Panel>
      ) : (
        <>
          <Panel title="NOW" subtitle="WIP limit: three. Finish or deliberately move one before pulling more work." icon={Target} count={now.length}>
            <div className="space-y-2">
              {now.map((item) => <WorkRow key={item.id} item={item} />)}
              {!now.length && (
                <div className="rounded-2xl border border-dashed border-border/60 py-6 text-center">
                  <ShieldCheck size={22} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground">No actionable work is being forced on you.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Triage Inbox or use the existing Tasks module to capture the next commitment.</p>
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="TODAY" subtitle="Scheduled work and genuine deadlines for today" icon={Clock3} count={todayItems.length}>
              <div className="space-y-2">
                {todayItems.map((item) => <WorkRow key={item.id} item={item} compact />)}
                {!todayItems.length && <p className="py-4 text-center text-xs text-muted-foreground">Nothing is genuinely due or scheduled today.</p>}
              </div>
            </Panel>

            <Panel title="WAITING / BLOCKED" subtitle="Keep these visible without letting them consume today's attention" icon={PauseCircle} count={waiting.length}>
              <div className="space-y-2">
                {waiting.slice(0, 8).map((item) => <WorkRow key={item.id} item={item} compact />)}
                {!waiting.length && <p className="py-4 text-center text-xs text-muted-foreground">Nothing is blocked.</p>}
              </div>
            </Panel>

            <Panel title="VALIDATING / MONITORING" subtitle="Changes already made. Do not redo them until evidence says otherwise." icon={RefreshCcw} count={validating.length}>
              <div className="space-y-2">
                {validating.slice(0, 8).map((item) => <WorkRow key={item.id} item={item} compact />)}
                {!validating.length && <p className="py-4 text-center text-xs text-muted-foreground">No changes are waiting for validation.</p>}
              </div>
            </Panel>

            <Panel title="INBOX" subtitle="Untriaged work. Decide; do not automatically execute." icon={Inbox} count={inbox.length}>
              <div className="space-y-2">
                {inbox.slice(0, 8).map((item) => <WorkRow key={item.id} item={item} compact />)}
                {!inbox.length && <p className="py-4 text-center text-xs text-muted-foreground">Inbox is clear.</p>}
              </div>
            </Panel>
          </div>
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <Panel title="RECENT ACTIVITY" subtitle="Immutable OS event trail" icon={ListChecks} count={events.length}>
          <div className="space-y-2">
            {events.map((event: any) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl bg-secondary/35 px-3 py-2.5">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">{event.summary}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{new Date(event.occurredAt).toLocaleString()} · {event.actorType}</div>
                </div>
              </div>
            ))}
            {!events.length && <p className="py-4 text-center text-xs text-muted-foreground">Activity will appear as OS work is changed.</p>}
          </div>
        </Panel>

        <section className="rounded-[24px] border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <AlertTriangle size={16} className="text-amber-500" /> Operating rule
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A completed change does not return to active work because a scanner repeats the same observation. It reopens only as an explicit regression after cooldown or when new validation evidence fails.
          </p>
          <button
            onClick={() => setActiveSection('tasks')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            Open legacy Tasks during migration <ArrowRight size={13} />
          </button>
        </section>
      </div>
    </div>
  );
}
