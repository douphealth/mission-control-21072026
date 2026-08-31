import { useMemo, useState } from 'react';
import {
  Check, Clock, ArrowRight, Zap, Target, ChevronDown, ChevronUp,
  Sparkles, CalendarClock, AlertTriangle, Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useTasks, useReminders, usePayments, useDecisions, useUpdateItem,
} from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { buildWorkQueue, splitQueue, type WorkItem } from '@/lib/workQueue';
import { todayISO, addDaysLocal } from '@/lib/overdue';
import { actOnDecision, deferDecision } from '@/lib/decisions';
import ReliabilityPanel from '@/components/ReliabilityPanel';

const KIND_STYLE: Record<WorkItem['kind'], string> = {
  task: 'bg-primary/10 text-primary border-primary/20',
  reminder: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  payment: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  decision: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function NowTodayPage() {
  const tasks = useTasks();
  const reminders = useReminders();
  const payments = usePayments();
  const decisions = useDecisions();
  const updateItem = useUpdateItem();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setImportModalOpen = useNavigationStore((s) => s.setImportModalOpen);
  const [showLater, setShowLater] = useState(false);

  const today = todayISO();
  const queues = useMemo(
    () => splitQueue(buildWorkQueue({ tasks, reminders, payments, decisions, today })),
    [tasks, reminders, payments, decisions, today],
  );

  const completedToday = tasks.filter(
    (t) => t.status === 'done' && (t.completedAt || '').slice(0, 10) === today,
  ).length;
  const overdueCount = queues.all.filter((i) => i.overdueDays > 0).length;
  const openDecisions = decisions.filter((d) => d.status === 'open').length;

  async function complete(item: WorkItem) {
    if (item.kind === 'task') {
      await updateItem('tasks', item.refId, {
        status: 'done', completedAt: new Date().toISOString(), touchedAt: today,
      } as any);
    } else if (item.kind === 'reminder') {
      await updateItem('reminders', item.refId, { status: 'done' } as any);
    } else if (item.kind === 'payment') {
      await updateItem('payments', item.refId, { status: 'paid', paidDate: today } as any);
    } else if (item.kind === 'decision') {
      await actOnDecision(item.raw);
      toast.success('Decision turned into a task');
      return;
    }
    toast.success('Done — cleared from the queue');
  }

  async function snooze(item: WorkItem, days: number) {
    const next = addDaysLocal(today, days);
    if (item.kind === 'task') {
      await updateItem('tasks', item.refId, { dueDate: next, touchedAt: today } as any);
    } else if (item.kind === 'reminder') {
      await updateItem('reminders', item.refId, { remindAt: `${next}T09:00:00` } as any);
    } else if (item.kind === 'payment') {
      await updateItem('payments', item.refId, { dueDate: next } as any);
    } else {
      await deferDecision(item.raw, days);
    }
    toast.success(`Moved to ${next}`);
  }

  const nowItem = queues.now;

  return (
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Mission Control</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Now / Today</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One queue for work, money, reminders and decisions — personal and business.
          </p>
        </div>
        <button
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground shadow-[var(--shadow-primary)]"
        >
          <Sparkles size={16} /> Universal Capture
        </button>
      </div>

      {/* ─── Scoreboard ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Needs action today', value: (queues.now ? 1 : 0) + queues.today.length, icon: Target },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle },
          { label: 'Open decisions', value: openDecisions, icon: Scale },
          { label: 'Completed today', value: completedToday, icon: Check },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon size={14} />
              <p className="text-[11px] uppercase tracking-wide font-semibold truncate">{s.label}</p>
            </div>
            <p className="text-3xl font-bold tabular-nums mt-1.5 text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ─── NOW ────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/70 to-card/60 backdrop-blur-xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
            <Zap size={12} /> Now
          </span>
          {nowItem && (
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${KIND_STYLE[nowItem.kind]}`}>
              {nowItem.source}
            </span>
          )}
        </div>

        {!nowItem ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-foreground">Nothing is demanding you right now.</p>
            <p className="text-sm text-muted-foreground mt-1">Queue is clear. Capture something new or take the win.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">{nowItem.title}</h2>
            {nowItem.subtitle && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{nowItem.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-muted-foreground">
              {nowItem.due && <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> {nowItem.due}{nowItem.time ? ` · ${nowItem.time}` : ''}</span>}
              {nowItem.overdueDays > 0 && <span className="text-red-500 font-semibold">{nowItem.overdueDays}d overdue</span>}
              {nowItem.context && <span className="px-2 py-0.5 rounded-full bg-secondary/70">{nowItem.context}</span>}
              <span className="px-2 py-0.5 rounded-full bg-secondary/70">score {nowItem.score}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => complete(nowItem)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground">
                <Check size={15} /> {nowItem.kind === 'decision' ? 'Act on it' : 'Done'}
              </button>
              <button onClick={() => snooze(nowItem, 1)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-border/60 hover:bg-secondary/60">
                <Clock size={15} /> Tomorrow
              </button>
              <button onClick={() => snooze(nowItem, 7)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-border/60 hover:bg-secondary/60">
                <ArrowRight size={15} /> Next week
              </button>
              <button onClick={() => setActiveSection('focus')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-border/60 hover:bg-secondary/60">
                <Target size={15} /> Focus
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ─── TODAY ────────────────────────────────────────────── */}
        <div className="xl:col-span-2 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Today</h3>
            <span className="text-[11px] text-muted-foreground">{queues.today.length} item(s)</span>
          </div>

          {queues.today.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nothing else scheduled for today.</p>
          ) : (
            <div className="space-y-1.5">
              {queues.today.slice(0, 25).map((i) => (
                <div key={i.id} className="group flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 hover:border-primary/30 transition">
                  <button
                    onClick={() => complete(i)}
                    title="Complete"
                    className="shrink-0 w-6 h-6 rounded-lg border border-border/70 grid place-items-center hover:bg-primary hover:text-primary-foreground transition"
                  >
                    <Check size={13} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{i.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {i.source}{i.due ? ` · ${i.due}` : ''}{i.overdueDays > 0 ? ` · ${i.overdueDays}d overdue` : ''}
                    </p>
                  </div>
                  <span className={`hidden sm:inline shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${KIND_STYLE[i.kind]}`}>
                    {i.kind}
                  </span>
                  <button
                    onClick={() => snooze(i, 1)}
                    className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg border border-border/60 opacity-0 group-hover:opacity-100 transition"
                  >
                    +1d
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowLater((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {showLater ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Later ({queues.later.length})
          </button>

          {showLater && (
            <div className="mt-2 space-y-1.5">
              {queues.later.slice(0, 30).map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border/40 px-3 py-2 opacity-80">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{i.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{i.source}{i.due ? ` · ${i.due}` : ''}</p>
                  </div>
                  <button onClick={() => snooze(i, 0)} className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg border border-border/60">
                    Today
                  </button>
                </div>
              ))}
              {queues.later.length === 0 && <p className="text-xs text-muted-foreground">Nothing queued for later.</p>}
            </div>
          )}
        </div>

        {/* ─── Side rail ────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Scale size={16} className="text-primary" /> Decisions waiting</h3>
              <button onClick={() => setActiveSection('decisions')} className="text-[11px] font-semibold text-primary">Open</button>
            </div>
            {openDecisions === 0 ? (
              <p className="text-xs text-muted-foreground">Every finding has been decided. Clean slate.</p>
            ) : (
              <div className="space-y-1.5">
                {decisions.filter((d) => d.status === 'open').slice(0, 4).map((d) => (
                  <div key={d.id} className="rounded-xl border border-border/50 px-3 py-2">
                    <p className="text-sm font-semibold truncate text-foreground">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{d.recommendation ?? d.context}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ReliabilityPanel compact />
        </div>
      </div>
    </div>
  );
}
