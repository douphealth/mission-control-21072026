import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, Mail, Copy, Check } from 'lucide-react';
import { useTasks, useUpdateItem } from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  buildBriefing,
  buildDigestText,
  daysOverdue,
  mailDigest,
  todayISO,
} from '@/lib/overdue';
import type { Task } from '@/lib/db';
import { toast } from 'sonner';

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-rose-500/15 text-rose-500 ring-rose-500/25',
  high: 'bg-amber-500/15 text-amber-600 ring-amber-500/25',
  medium: 'bg-sky-500/15 text-sky-600 ring-sky-500/25',
  low: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/25',
};

function TaskRow({ task, overdue }: { task: Task; overdue: boolean }) {
  const updateItem = useUpdateItem();
  const days = daysOverdue(task);

  const complete = async () => {
    await updateItem('tasks', task.id, {
      status: 'done',
      completedAt: new Date().toISOString(),
    } as Partial<Task>);
    toast.success('Task completed');
  };

  const snooze = async () => {
    const next = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await updateItem('tasks', task.id, { dueDate: next, remindersFired: [] } as Partial<Task>);
    toast.success('Moved to tomorrow');
  };

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-background/60 px-3 py-2.5">
      <button
        onClick={complete}
        aria-label="Complete task"
        className="shrink-0 rounded-full p-1 text-muted-foreground transition hover:text-emerald-500 active:scale-90"
      >
        <CheckCircle2 size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-foreground">{task.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={`rounded-full px-1.5 py-0.5 font-bold uppercase ring-1 ${PRIORITY_STYLE[task.priority] ?? ''}`}>
            {task.priority}
          </span>
          <span>{task.dueDate}{task.startTime ? ` · ${task.startTime}` : ''}</span>
          {overdue && days > 0 && (
            <span className="font-semibold text-rose-500">{days}d overdue</span>
          )}
        </div>
      </div>
      <button
        onClick={snooze}
        className="shrink-0 rounded-full border border-border/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition active:scale-95"
      >
        Tomorrow
      </button>
    </div>
  );
}

export default function DailyBriefingBanner() {
  const tasks = useTasks();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const settings = useSettingsStore() as unknown as Record<string, unknown>;
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const briefing = useMemo(() => buildBriefing(tasks as Task[]), [tasks]);
  const today = todayISO();

  if (briefing.overdue.length === 0 && briefing.dueToday.length === 0) return null;

  const digestEmail =
    (typeof settings.digestEmail === 'string' && settings.digestEmail) ||
    (typeof settings.email === 'string' && settings.email) ||
    'papalexios@gmail.com';

  const copyDigest = async () => {
    await navigator.clipboard.writeText(buildDigestText(briefing, today));
    setCopied(true);
    toast.success('Digest copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const emailDigest = () => {
    const to = digestEmail || window.prompt('Send the digest to which email address?') || '';
    if (!to) return;
    mailDigest(briefing, to, today);
  };

  const shown = expanded
    ? [...briefing.overdue, ...briefing.dueToday]
    : [...briefing.overdue, ...briefing.dueToday].slice(0, 3);

  return (
    <section className="mb-4 overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-[0_18px_45px_-38px_hsl(var(--foreground)/0.6)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 px-4 py-3 sm:px-5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
            briefing.overdue.length ? 'bg-rose-500/15 text-rose-500' : 'bg-sky-500/15 text-sky-500'
          }`}
        >
          {briefing.overdue.length ? <AlertTriangle size={18} /> : <CalendarClock size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-extrabold tracking-tight text-foreground">
            {briefing.overdue.length
              ? `${briefing.overdue.length} overdue · ${briefing.dueToday.length} due today`
              : `${briefing.dueToday.length} task${briefing.dueToday.length === 1 ? '' : 's'} due today`}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Daily briefing · {today} · {briefing.completedToday} completed today
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyDigest}
            title="Copy digest"
            className="rounded-full border border-border/50 p-2 text-muted-foreground transition active:scale-90"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button
            onClick={emailDigest}
            title="Email digest"
            className="rounded-full border border-border/50 p-2 text-muted-foreground transition active:scale-90"
          >
            <Mail size={15} />
          </button>
          <button
            onClick={() => setActiveSection('tasks')}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition active:scale-95"
          >
            Open tasks
          </button>
        </div>
      </div>

      <div className="space-y-2 px-3 py-3 sm:px-4">
        {shown.map((t) => (
          <TaskRow key={t.id} task={t} overdue={t.dueDate < today} />
        ))}
        {briefing.total > 3 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
          >
            {expanded ? 'Show less' : `Show all ${briefing.total}`}
            <ChevronDown size={13} className={expanded ? 'rotate-180 transition' : 'transition'} />
          </button>
        )}
      </div>
    </section>
  );
}
