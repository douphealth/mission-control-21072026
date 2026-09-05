// ─── Task quick editor ───────────────────────────────────────────────────────
// A single, reusable editing surface for a task. Every change is written to
// Dexie immediately, so every live-query view (Tasks, Review, Calendar, Focus,
// Dashboard) updates at once. No "Save" round-trip, no stale copies.

import { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  Trash2,
  Archive,
  CalendarClock,
  Undo2,
  Plus,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/db";
import { useUpdateItem, useDeleteItem, genId } from "@/hooks/useTableData";
import { todayISO } from "@/lib/overdue";
import { addDaysISO } from "@/lib/triage";
import { Button } from "@/components/ui/button";

const PRIORITIES: Task["priority"][] = ["critical", "high", "medium", "low"];
const STATUSES: Task["status"][] = ["todo", "in-progress", "blocked", "done"];

const PRI_TONE: Record<Task["priority"], string> = {
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
  high: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  medium: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

export default function TaskQuickEditor({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const today = todayISO();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [newSubtask, setNewSubtask] = useState("");

  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
  }, [task?.id, task?.title, task?.description]);

  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  if (!task) return null;

  const patch = async (changes: Partial<Task>) => {
    await updateItem<Task>("tasks", task.id, { ...changes, touchedAt: today } as Partial<Task>);
  };

  const archived = (task as any).archived === true;

  const addSubtask = async () => {
    const nextTitle = newSubtask.trim();
    if (!nextTitle) return;
    await patch({
      subtasks: [...(task.subtasks ?? []), { id: genId(), title: nextTitle, done: false }],
    });
    setNewSubtask("");
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[94vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-border/50 bg-card p-4 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Edit task
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Changes save instantly everywhere.
            </p>
          </div>
          <Button
            aria-label="Close task editor"
            title="Close"
            variant="secondary"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl text-muted-foreground"
          >
            <X size={15} />
          </Button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== task.title) void patch({ title: title.trim() });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-full rounded-2xl border border-border/50 bg-secondary/40 px-3 py-3 text-base font-semibold text-foreground outline-none focus:border-primary/60"
          placeholder="Task title"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== (task.description ?? "")) void patch({ description });
          }}
          rows={3}
          className="mt-2 w-full resize-y rounded-2xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"
          placeholder="Notes, context, next physical action…"
        />

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Category
            <input
              defaultValue={task.category ?? ""}
              onBlur={(e) => {
                if (e.target.value !== task.category) void patch({ category: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary/60"
              placeholder="Work, personal, admin…"
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            Project
            <input
              defaultValue={task.linkedProject ?? ""}
              onBlur={(e) => {
                if (e.target.value !== task.linkedProject)
                  void patch({ linkedProject: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary/60"
              placeholder="Linked project"
            />
          </label>
        </div>

        {/* Priority */}
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Priority</div>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => void patch({ priority: p })}
                className={`rounded-xl border px-3 py-2 text-[12px] font-semibold capitalize transition ${
                  task.priority === p
                    ? PRI_TONE[p]
                    : "border-border/40 bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() =>
                  void patch({
                    status: s,
                    completedAt: s === "done" ? new Date().toISOString() : undefined,
                  })
                }
                className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${
                  task.status === s
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/40 bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Schedule</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-[10px] text-muted-foreground">
              Start
              <input
                type="date"
                value={task.startDate || ""}
                onChange={(e) => void patch({ startDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60"
              />
            </label>
            <label className="text-[10px] text-muted-foreground">
              Due
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) => void patch({ dueDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60"
              />
            </label>
            <label className="text-[10px] text-muted-foreground">
              Start time
              <input
                type="time"
                value={task.startTime || ""}
                onChange={(e) => void patch({ startTime: e.target.value, allDay: false })}
                className="mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60"
              />
            </label>
            <label className="text-[10px] text-muted-foreground">
              End time
              <input
                type="time"
                value={task.endTime || ""}
                onChange={(e) => void patch({ endTime: e.target.value, allDay: false })}
                className="mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60"
              />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ["Today", 0],
              ["Tomorrow", 1],
              ["+3d", 3],
              ["+1w", 7],
              ["+1m", 30],
            ].map(([lbl, d]) => (
              <button
                key={lbl as string}
                onClick={() => void patch({ dueDate: addDaysISO(d as number, today) })}
                className="rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <CalendarClock size={11} className="mr-1 inline" />
                {lbl as string}
              </button>
            ))}
          </div>
        </div>

        {/* Subtasks */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Subtasks</span>
            <span>
              {task.subtasks?.filter((st) => st.done).length ?? 0}/{task.subtasks?.length ?? 0}
            </span>
          </div>
          <div className="space-y-1">
            {(task.subtasks ?? []).map((st) => (
              <div
                key={st.id}
                className="flex w-full items-center gap-2 rounded-xl bg-secondary/40 px-2.5 py-2 text-[12px]"
              >
                <GripVertical size={12} className="shrink-0 text-muted-foreground/50" />
                <button
                  aria-label={st.done ? "Reopen subtask" : "Complete subtask"}
                  onClick={() =>
                    void patch({
                      subtasks: task.subtasks.map((x) =>
                        x.id === st.id ? { ...x, done: !x.done } : x,
                      ),
                    })
                  }
                >
                  <CheckCircle2
                    size={14}
                    className={st.done ? "text-emerald-500" : "text-muted-foreground"}
                  />
                </button>
                <input
                  defaultValue={st.title}
                  onBlur={(e) =>
                    void patch({
                      subtasks: task.subtasks.map((x) =>
                        x.id === st.id ? { ...x, title: e.target.value.trim() || x.title } : x,
                      ),
                    })
                  }
                  className={`min-w-0 flex-1 bg-transparent outline-none ${st.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                />
                <button
                  aria-label="Delete subtask"
                  onClick={() =>
                    void patch({ subtasks: task.subtasks.filter((x) => x.id !== st.id) })
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addSubtask();
              }}
              className="min-w-0 flex-1 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60"
              placeholder="Add a next step…"
            />
            <Button
              aria-label="Add subtask"
              title="Add subtask"
              variant="secondary"
              size="icon"
              onClick={() => void addSubtask()}
              className="h-9 w-9 rounded-xl"
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
          <button
            onClick={async () => {
              await patch({ status: "done", completedAt: new Date().toISOString() });
              toast.success("Closed ✓");
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-500 transition hover:bg-emerald-500/20"
          >
            <CheckCircle2 size={13} /> Done
          </button>
          {archived ? (
            <button
              onClick={async () => {
                await patch({ archived: false, dueDate: today } as Partial<Task>);
                toast.success("Restored");
              }}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-[12px] font-semibold text-foreground"
            >
              <Undo2 size={13} /> Restore
            </button>
          ) : (
            <button
              onClick={async () => {
                await patch({ archived: true, archivedAt: today } as Partial<Task>);
                toast.success("Archived");
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-[12px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Archive size={13} /> Archive
            </button>
          )}
          <button
            onClick={async () => {
              await deleteItem("tasks", task.id);
              toast.success("Deleted");
              onClose();
            }}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive transition hover:bg-destructive/20"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
