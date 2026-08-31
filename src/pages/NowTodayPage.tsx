import { useMemo, useState } from 'react';
import {
  Check, Clock, ArrowRight, ChevronDown, ChevronUp, Plus,
  CalendarClock, Scale, Play, Inbox, Hourglass, Search,
  ShieldCheck, Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useTasks, useReminders, usePayments, useDecisions, useUpdateItem,
  useSyncHealth, useAuditLog,
} from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { buildWorkQueue, splitQueue, type WorkItem } from '@/lib/workQueue';
import { todayISO, addDaysLocal, buildBriefing } from '@/lib/overdue';
import { actOnDecision, deferDecision } from '@/lib/decisions';
import { whyNow, buildAttention, type AttentionSeverity } from '@/lib/whyNow';
import ReliabilityPanel from '@/components/ReliabilityPanel';
import type { Task } from '@/lib/db';

const SEV_DOT: Record<AttentionSeverity, string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function longDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function NowTodayPage() {
  const tasks = useTasks();
  const reminders = useReminders();
  const payments = usePayments();
  const decisions = useDecisions();
  const health = useSyncHealth();
  const audit = useAuditLog(6);
  const updateItem = useUpdateItem();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setImportModalOpen = useNavigationStore((s) => s.setImportModalOpen);
  const setCommandPaletteOpen = useNavigationStore((s) => s.setCommandPaletteOpen);
  const userName = useSettingsStore((s) => s.userName);
  const [showUpNext, setShowUpNext] = useState(false);

  const today = todayISO();
  const queues = useMemo(
    () => splitQueue(buildWorkQueue({ tasks, reminders, payments, decisions, today })),
    [tasks, reminders, payments, decisions, today],
  );

  const attention = useMemo(
    () => buildAttention({ work: queues.all, decisions, payments, health, today }),
    [queues.all, decisions, payments, health, today],
  );

  const briefing = useMemo(() => buildBriefing(tasks as Task[], today), [tasks, today]);

  const nowItem = queues.now;
  const commitments = queues.today.slice(0, 3);
  const upNext = queues.today.slice(3);
  const waiting = tasks.filter((t) => t.status === 'blocked').length;
  const inbox = tasks.filter((t) => t.status === 'todo' && !t.dueDate).length;

  const isQuiet = !nowItem && attention.length === 0 && commitments.length === 0;

  async function complete(item: WorkItem) {
    if (item.kind === 'task') {
      await updateItem('tasks', item.refId, {
        status: 'done', completedAt: new Date().toISOString(), touchedAt: today,
      } as any);
    } else if (item.kind === 'reminder') {
      await updateItem('reminders', item.refId, { status: 'done' } as any);
    } else if (item.kind === 'payment') {
      await updateItem('payments', item.refId, { status: 'paid', paidDate: today } as any);
    } else {
      await actOnDecision(item.raw);
      toast.success('Decision turned into a task');
      return;
    }
    toast.success('Done — next one is up');
  }

  /** Planning, not deadline mutation: the real dueDate is never touched. */
  async function schedule(item: WorkItem, days: number) {
    const next = addDaysLocal(today, days);
    if (item.kind === 'task') {
      await updateItem('tasks', item.refId, {
        notBefore: next, scheduledAt: next, touchedAt: today, committedOn: undefined,
      } as any);
      toast.success(`Scheduled for ${next} — deadline unchanged`);
      return;
    }
    if (item.kind === 'reminder') {
      await updateItem('reminders', item.refId, { remindAt: `${next}T09:00:00` } as any);
    } else if (item.kind === 'decision') {
      await deferDecision(item.raw, days);
    } else {
      toast.warning('Payment deadlines cannot be moved — pay or renegotiate.');
      return;
    }
    toast.success(`Scheduled for ${next}`);
  }

  async function commit(item: WorkItem) {
    if (item.kind !== 'task') return;
    await updateItem('tasks', item.refId, { committedOn: today, notBefore: undefined } as any);
    toast.success('Pinned to today');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-foreground leading-tight">
            {greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {longDate()} · {nowItem ? 'one thing at a time' : 'nothing is demanding you'}
            {briefing.completedToday > 0 ? ` · ${briefing.completedToday} done today` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 px-3 text-sm text-muted-foreground transition hover:text-foreground hover:border-border"
          >
            <Search size={15} /> Search
            <kbd className="ml-1 rounded border border-border/70 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus size={16} /> Capture
          </button>
        </div>
      </header>

      {/* ── NOW ────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Now</SectionLabel>
        {!nowItem ? (
          <div className="rounded-xl border border-border/60 px-6 py-10 text-center">
            <p className="text-lg font-medium text-foreground">Nothing needs you right now.</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Capture a thought, or take the win and close the laptop.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card/40 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{nowItem.source}</span>
              {nowItem.context && (
                <>
                  <span className="opacity-40">/</span>
                  <button
                    onClick={() => setActiveSection(nowItem.kind === 'payment' ? 'payments' : 'tasks')}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {nowItem.context}
                  </button>
                </>
              )}
            </div>

            <h2 className="mt-3 text-2xl sm:text-[30px] font-semibold leading-snug tracking-tight text-foreground">
              {nowItem.title}
            </h2>
            {nowItem.subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-2">
                {nowItem.subtitle}
              </p>
            )}

            <p className="mt-4 text-sm text-foreground/80">
              <span className="font-medium text-foreground">Why now: </span>
              {whyNow(nowItem, today).join(' · ')}.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
              {nowItem.due && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={13} /> Deadline {nowItem.due}{nowItem.time ? ` · ${nowItem.time}` : ''}
                </span>
              )}
              {nowItem.scheduled && <span>Scheduled {nowItem.scheduled}</span>}
              {nowItem.overdueDays > 0 && (
                <span className="font-medium text-rose-500">{nowItem.overdueDays}d past deadline</span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveSection('focus')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Play size={15} /> Start
              </button>
              <button
                onClick={() => complete(nowItem)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 px-4 text-sm font-medium transition hover:bg-secondary/60"
              >
                <Check size={15} /> {nowItem.kind === 'decision' ? 'Act on it' : 'Done'}
              </button>
              <button
                onClick={() => schedule(nowItem, 1)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 px-4 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <Clock size={15} /> Schedule tomorrow
              </button>
              <button
                onClick={() => schedule(nowItem, 7)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 px-4 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <ArrowRight size={15} /> Next week
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── TODAY (max 3 commitments) ──────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between">
          <SectionLabel>Today</SectionLabel>
          <span className="text-[11px] text-muted-foreground">
            {commitments.length}/3 commitments
          </span>
        </div>
        {commitments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {nowItem ? 'Nothing else committed. Finish Now and stop.' : 'Your day is clear.'}
          </p>
        ) : (
          <ol className="divide-y divide-border/50 rounded-xl border border-border/60">
            {commitments.map((i, idx) => (
              <li key={i.id} className="group flex items-center gap-4 px-4 py-3.5">
                <span className="w-4 shrink-0 text-sm tabular-nums text-muted-foreground/60">{idx + 1}</span>
                <button
                  onClick={() => complete(i)}
                  title="Complete"
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border border-border/70 text-transparent transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Check size={13} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-foreground">{i.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {whyNow(i, today).slice(0, 2).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => schedule(i, 1)}
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-secondary/70"
                >
                  Tomorrow
                </button>
              </li>
            ))}
          </ol>
        )}

        {upNext.length > 0 && (
          <>
            <button
              onClick={() => setShowUpNext((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              {showUpNext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Up next ({upNext.length}) — not committed today
            </button>
            {showUpNext && (
              <ul className="mt-2 divide-y divide-border/40 rounded-xl border border-border/40">
                {upNext.slice(0, 20).map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] text-foreground">{i.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {i.source}{i.due ? ` · deadline ${i.due}` : ''}
                      </p>
                    </div>
                    {i.kind === 'task' && (
                      <button
                        onClick={() => commit(i)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        <Pin size={11} /> Commit
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* ── NEEDS ATTENTION ────────────────────────────────── */}
      <section>
        <SectionLabel>Needs attention</SectionLabel>
        {attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is broken. Everything else is under control.</p>
        ) : (
          <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
            {attention.map((a) => (
              <li key={a.id} className="flex items-center gap-3.5 px-4 py-3.5">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${SEV_DOT[a.severity]}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-foreground">{a.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {a.detail}
                    {a.provenance ? ` · ${a.provenance}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection(a.section)}
                  className="shrink-0 rounded-md border border-border/60 px-2.5 py-1 text-[11px] font-medium transition hover:bg-secondary/70"
                >
                  {a.actionLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Queues ─────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: 'Waiting', value: waiting, icon: Hourglass, section: 'tasks' },
          { label: 'Decisions', value: decisions.filter((d) => d.status === 'open').length, icon: Scale, section: 'decisions' },
          { label: 'Inbox', value: inbox, icon: Inbox, section: 'tasks' },
        ].map((q) => (
          <button
            key={q.label}
            onClick={() => setActiveSection(q.section)}
            className="rounded-xl border border-border/50 px-4 py-3.5 text-left transition hover:border-border"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <q.icon size={12} /> {q.label}
            </span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">{q.value}</span>
          </button>
        ))}
      </section>

      {isQuiet && (
        <p className="rounded-xl border border-dashed border-border/60 px-5 py-6 text-center text-sm text-muted-foreground">
          Everything else is under control.
        </p>
      )}

      {/* ── Quiet footer: changes + health ─────────────────── */}
      <section className="grid grid-cols-1 gap-4 border-t border-border/40 pt-6 lg:grid-cols-2">
        <div>
          <SectionLabel muted>Recent changes</SectionLabel>
          {audit.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No changes recorded yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {audit.map((a) => (
                <li key={a.id} className="truncate text-[12px] text-muted-foreground">
                  <span className="text-foreground/80">{a.label || a.action}</span> · {a.collection} · {new Date(a.at).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SectionLabel muted>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} /> System health</span>
          </SectionLabel>
          <ReliabilityPanel compact />
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <h2 className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${muted ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
      {children}
    </h2>
  );
}
