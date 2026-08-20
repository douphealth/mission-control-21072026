// ─── Task quick editor ───────────────────────────────────────────────────────
// A single, reusable editing surface for a task. Every change is written to
// Dexie immediately, so every live-query view (Tasks, Review, Calendar, Focus,
// Dashboard) updates at once. No "Save" round-trip, no stale copies.

import { useEffect, useState } from 'react';
import { X, CheckCircle2, Trash2, Archive, CalendarClock, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/lib/db';
import { useUpdateItem, useDeleteItem } from '@/hooks/useTableData';
import { todayISO } from '@/lib/overdue';
import { addDaysISO } from '@/lib/triage';

const PRIORITIES: Task['priority'][] = ['critical', 'high', 'medium', 'low'];
const STATUSES: Task['status'][] = ['todo', 'in-progress', 'blocked', 'done'];

const PRI_TONE: Record<Task['priority'], string> = {
  critical: 'bg-red-500/15 text-red-500 border-red-500/30',
  high: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  medium: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  low: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
};

export default function TaskQuickEditor({
  task, onClose,
}: { task: Task | null; onClose: () => void }) {
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const today = todayISO();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');

  useEffect(() => {
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
  }, [task?.id, task?.title, task?.description]);

  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, onClose]);

  if (!task) return null;

  const patch = async (changes: Partial<Task>) => {
    await updateItem<Task>('tasks', task.id, { ...changes, touchedAt: today } as Partial<Task>);
  };

  const archived = (task as any).archived === true;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="Close editor" onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl border border-border/50 bg-card p-4 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Edit task</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Changes save instantly everywhere.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-secondary p-2 text-muted-foreground transition hover:text-foreground">
            <X size={15} />
          </button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title !== task.title) void patch({ title: title.trim() }); }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="w-full rounded-2xl border border-border/50 bg-secondary/40 px-3 py-3 text-base font-semibold text-foreground outline-none focus:border-primary/60"
          placeholder="Task title"
        />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => { if (description !== (task.description ?? '')) void patch({ description }); }}
          rows={3}
          className="mt-2 w-full resize-y rounded-2xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"
          placeholder="Notes, context, next physical action…"
        />

        {/* Priority */}
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Priority</div>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => void patch({ priority: p })}
                className={`rounded-xl border px-3 py-2 text-[12px] font-semibold capitalize transition ${
                  task.priority === p ? PRI_TONE[p] : 'border-border/40 bg-secondary/50 text-muted-foreground hover:text-foreground'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(s => (
              <button key={s} onClick={() => void patch({
                status: s,
                completedAt: s === 'done' ? new Date().toISOString() : undefined,
              })}
                className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${
                  task.status === s ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/40 bg-secondary/50 text-muted-foreground hover:text-foreground'}`}>
                {s.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Due date</div>
          <input type="date" value={task.dueDate || ''} onChange={e => void patch({ dueDate: e.target.value })}
            className="w-full rounded-2xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[['Today', 0], ['Tomorrow', 1], ['+3d', 3], ['+1w', 7], ['+1m', 30]].map(([lbl, d]) => (
              <button key={lbl as string} onClick={() => void patch({ dueDate: addDaysISO(d as number, today) })}
                className="rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground">
                <CalendarClock size={11} className="mr-1 inline" />{lbl as string}
              </button>
            ))}
          </div>
        </div>

        {/* Subtasks */}
        {task.subtasks?.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Subtasks</div>
            <div className="space-y-1">
              {task.subtasks.map(st => (
                <button key={st.id} onClick={() => void patch({
                  subtasks: task.subtasks.map(x => x.id === st.id ? { ...x, completed: !x.completed } : x),
                })}
                  className="flex w-full items-center gap-2 rounded-xl bg-secondary/40 px-2.5 py-2 text-left text-[12px]">
                  <CheckCircle2 size={13} className={st.completed ? 'text-emerald-500' : 'text-muted-foreground'} />
                  <span className={st.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>{st.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
          <button onClick={async () => { await patch({ status: 'done', completedAt: new Date().toISOString() }); toast.success('Closed ✓'); onClose(); }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-500 transition hover:bg-emerald-500/20">
            <CheckCircle2 size={13} /> Done
          </button>
          {archived ? (
            <button onClick={async () => { await patch({ archived: false, dueDate: today } as Partial<Task>); toast.success('Restored'); }}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-[12px] font-semibold text-foreground">
              <Undo2 size={13} /> Restore
            </button>
          ) : (
            <button onClick={async () => { await patch({ archived: true, archivedAt: today } as Partial<Task>); toast.success('Archived'); onClose(); }}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-[12px] font-semibold text-muted-foreground transition hover:text-foreground">
              <Archive size={13} /> Archive
            </button>
          )}
          <button onClick={async () => { await deleteItem('tasks', task.id); toast.success('Deleted'); onClose(); }}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive transition hover:bg-destructive/20">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
