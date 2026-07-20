import { useMemo } from 'react';
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, Circle, Clock3, Play, Target } from 'lucide-react';
import { useTasks, useUpdateItem } from '@/hooks/useTableData';
import { rankTasks } from '@/lib/taskPriority';
import type { Task } from '@/lib/db';
import { useNavigationStore } from '@/stores/navigationStore';

function dateLabel(value: string) {
  if (!value) return 'No due date';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TodayPage() {
  const tasks = useTasks();
  const updateItem = useUpdateItem();
  const setActiveSection = useNavigationStore(state => state.setActiveSection);
  const ranked = useMemo(() => rankTasks(tasks), [tasks]);
  const today = new Date().toISOString().slice(0, 10);
  const top = ranked.slice(0, 7);
  const overdue = ranked.filter(task => task.dueDate && task.dueDate < today).length;
  const dueToday = ranked.filter(task => task.dueDate === today).length;
  const blocked = ranked.filter(task => task.status === 'blocked').length;

  const patchTask = (task: Task, changes: Partial<Task>) => updateItem<Task>('tasks', task.id, {
    ...changes,
    ...(changes.status === 'done' ? { completedAt: today } : {}),
  });

  return (
    <div className="space-y-5">
      <section className="enterprise-panel rounded-3xl p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Today command center</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">One queue. The right work first.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Mission Control ranks unfinished work by urgency, priority, progress, and blockage. This is the canonical execution queue.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveSection('automations')} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm font-semibold hover:bg-secondary">
              <Activity size={16} className="text-primary" /> Automation Center
            </button>
            <div className="rounded-2xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{ranked.length}</span> open tasks
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Due today', value: dueToday, icon: CalendarDays },
          { label: 'Overdue', value: overdue, icon: AlertTriangle },
          { label: 'Blocked', value: blocked, icon: Clock3 },
          { label: 'Completed', value: tasks.filter(task => task.status === 'done').length, icon: CheckCircle2 },
        ].map(item => (
          <div key={item.label} className="enterprise-card rounded-2xl p-4">
            <item.icon size={17} className="text-primary" />
            <div className="mt-4 text-3xl font-extrabold tabular-nums text-foreground">{item.value}</div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="enterprise-card rounded-3xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Target size={18} className="text-primary" /> Next best actions</h2>
            <p className="mt-1 text-xs text-muted-foreground">Deterministic ranking; no fake AI scores or random ordering.</p>
          </div>
        </div>

        {top.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <CheckCircle2 className="mx-auto text-success" size={32} />
            <div className="mt-3 font-semibold text-foreground">Execution queue is clear</div>
            <div className="mt-1 text-sm text-muted-foreground">Add or import real tasks to start planning.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {top.map((task, index) => (
              <article key={task.id} className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{task.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {task.reasons.slice(0, 3).map(reason => <span key={reason} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{reason}</span>)}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">Due {dateLabel(task.dueDate)} · score {task.score}</div>
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-none">
                  {task.status !== 'in-progress' && <button onClick={() => patchTask(task, { status: 'in-progress' })} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"><Play size={13} /> Start</button>}
                  <button onClick={() => patchTask(task, { status: 'done' })} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"><Circle size={13} /> Done</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
