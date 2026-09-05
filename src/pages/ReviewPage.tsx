import { useMemo, useState, useCallback } from "react";
import {
  RefreshCcw,
  Archive,
  CalendarClock,
  CheckCircle2,
  Trash2,
  Moon,
  AlertTriangle,
  Target,
  Sparkles,
  ArrowRight,
  Undo2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/db";
import { useTasks, useUpdateItem, useDeleteItem } from "@/hooks/useTableData";
import { todayISO, daysOverdue } from "@/lib/overdue";
import {
  buildReviewQueues,
  daysSinceTouch,
  QUADRANTS,
  addDaysISO,
  isArchived,
  sortByPriority,
  STALE_DAYS,
  ROT_DAYS,
} from "@/lib/triage";
import type { Quadrant } from "@/lib/triage";
import { useReviewStore } from "@/stores/reviewStore";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import TaskQuickEditor from "@/components/TaskQuickEditor";

function daysAgoLabel(iso: string | null) {
  if (!iso) return "never";
  const d = Math.round((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

function TaskRow({
  task,
  today,
  onDone,
  onPush,
  onArchive,
  onDelete,
  onToday,
  onOpen,
}: {
  task: Task;
  today: string;
  onDone: (t: Task) => void;
  onPush: (t: Task, d: number) => void;
  onArchive: (t: Task) => void;
  onDelete: (t: Task) => void;
  onToday: (t: Task) => void;
  onOpen: (t: Task) => void;
}) {
  const od = daysOverdue(task, today);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/mc-task", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex cursor-grab flex-col gap-2 rounded-2xl border border-border/30 bg-secondary/30 p-3 active:cursor-grabbing sm:flex-row sm:items-center sm:gap-3"
    >
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-semibold text-foreground hover:text-primary">
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wide">{task.priority}</span>
          {task.dueDate && <span>due {task.dueDate}</span>}
          {od > 0 && <span className="font-semibold text-red-500">{od}d overdue</span>}
          <span>untouched {daysSinceTouch(task, today)}d</span>
        </div>
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onDone(task)}
          title="Mark done"
          className="flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-500 transition hover:bg-emerald-500/20"
        >
          <CheckCircle2 size={12} /> Done
        </button>
        <button
          onClick={() => onToday(task)}
          title="Do today"
          className="flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
        >
          <Target size={12} /> Today
        </button>
        <button
          onClick={() => onPush(task, 7)}
          title="Push a week"
          className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <CalendarClock size={12} /> +7d
        </button>
        <button
          onClick={() => onArchive(task)}
          title="Archive"
          className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <Archive size={12} /> Archive
        </button>
        <button
          onClick={() => onDelete(task)}
          title="Delete"
          className="rounded-xl bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive transition hover:bg-destructive/20"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const tasks = useTasks();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const cd = useConfirmDialog();
  const today = todayISO();
  const { lastWeeklyReview, lastShutdown, markWeeklyReview, markShutdown } = useReviewStore();
  const [showArchive, setShowArchive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [matrixSearch, setMatrixSearch] = useState("");

  const q = useMemo(() => buildReviewQueues(tasks, today), [tasks, today]);
  const archived = useMemo(() => sortByPriority(tasks.filter(isArchived)), [tasks]);
  const editing = useMemo(() => tasks.find((t) => t.id === editingId) ?? null, [tasks, editingId]);

  const onOpen = useCallback((t: Task) => setEditingId(t.id), []);

  // Drag & drop / tap-to-move between Eisenhower quadrants.
  // Dropping rewrites urgency (due date) + importance so the task really moves,
  // and every other view updates instantly through the live query.
  const moveToQuadrant = useCallback(
    async (taskId: string, quad: Quadrant) => {
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return;
      const plan: Record<Quadrant, Partial<Task>> = {
        do: {
          important: true,
          dueDate: today,
          priority: t.priority === "low" ? "high" : t.priority,
        },
        schedule: { important: true, dueDate: addDaysISO(7, today) },
        delegate: { important: false, dueDate: today },
        later: { important: false, dueDate: addDaysISO(21, today) },
      } as any;
      await updateItem<Task>("tasks", taskId, { ...plan[quad], touchedAt: today } as Partial<Task>);
      toast.success(`Moved to “${QUADRANTS.find((qd) => qd.id === quad)?.label}”`);
    },
    [tasks, updateItem, today],
  );

  const onDone = useCallback(
    async (t: Task) => {
      await updateItem<Task>("tasks", t.id, {
        status: "done",
        completedAt: new Date().toISOString(),
      });
      toast.success("Closed ✓");
    },
    [updateItem],
  );

  const onToday = useCallback(
    async (t: Task) => {
      await updateItem<Task>("tasks", t.id, { dueDate: today, status: "in-progress" });
      toast.success("Moved to today");
    },
    [updateItem, today],
  );

  const onPush = useCallback(
    async (t: Task, d: number) => {
      await updateItem<Task>("tasks", t.id, { dueDate: addDaysISO(d, today) });
      toast.success(`Rescheduled +${d}d`);
    },
    [updateItem, today],
  );

  const onArchive = useCallback(
    async (t: Task) => {
      await updateItem<Task>("tasks", t.id, { archived: true, archivedAt: today });
      toast.success("Archived — out of the active list");
    },
    [updateItem, today],
  );

  const onRestore = useCallback(
    async (t: Task) => {
      await updateItem<Task>("tasks", t.id, { archived: false, dueDate: today });
      toast.success("Restored to today");
    },
    [updateItem, today],
  );

  const onDelete = useCallback(
    (t: Task) => {
      cd.confirm({
        title: "Delete task",
        description: `"${t.title}" will be permanently removed.`,
        onConfirm: async () => {
          await deleteItem("tasks", t.id);
          toast.success("Deleted");
        },
      });
    },
    [cd, deleteItem],
  );

  const purgeAllRotten = useCallback(() => {
    if (!q.rotten.length) return;
    cd.confirm({
      title: `Archive ${q.rotten.length} rotting task(s)`,
      description: `Everything overdue by ${ROT_DAYS}+ days gets archived. Nothing is deleted — you can restore any of it below.`,
      onConfirm: async () => {
        for (const t of q.rotten) {
          await updateItem<Task>("tasks", t.id, { archived: true, archivedAt: today });
        }
        toast.success(`Archived ${q.rotten.length} — graveyard cleared`);
      },
    });
  }, [q.rotten, cd, updateItem, today]);

  const finishWeekly = useCallback(() => {
    markWeeklyReview(today);
    toast.success("Weekly review logged. Inbox is clear.");
  }, [markWeeklyReview, today]);

  const finishShutdown = useCallback(async () => {
    markShutdown(today);
    toast.success("Day closed. Tomorrow is planned.");
  }, [markShutdown, today]);

  const tomorrowPlan = useMemo(
    () => sortByPriority(q.matrix.do.concat(q.matrix.schedule)).slice(0, 3),
    [q.matrix],
  );

  const reviewDue =
    !lastWeeklyReview ||
    (Date.now() - new Date(`${lastWeeklyReview}T00:00:00`).getTime()) / 86_400_000 >= 7;
  const visibleMatrix = useMemo(() => {
    const needle = matrixSearch.trim().toLowerCase();
    return Object.fromEntries(
      QUADRANTS.map((quad) => [
        quad.id,
        q.matrix[quad.id].filter(
          (t) =>
            !needle ||
            `${t.title} ${t.description ?? ""} ${t.category ?? ""}`.toLowerCase().includes(needle),
        ),
      ]),
    ) as Record<Quadrant, Task[]>;
  }, [q.matrix, matrixSearch]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <RefreshCcw size={20} className="text-primary" /> Review
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {q.openCount} open · {q.overdue.length} overdue · {q.stale.length} stale · last review{" "}
            {daysAgoLabel(lastWeeklyReview)}
          </p>
        </div>
        <button
          onClick={finishWeekly}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
        >
          <CheckCircle2 size={15} /> Mark review done
        </button>
      </div>

      {reviewDue && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Weekly review is due
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Work top to bottom: clear the graveyard, decide on stale items, then plan tomorrow. It
              takes 10 minutes and it is the only thing that stops the backlog rotting.
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Graveyard ── */}
      <section className="card-elevated space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Trash2 size={15} className="text-red-500" /> Graveyard · {ROT_DAYS}d+ overdue
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {q.rotten.length} task(s) that are not happening as written.
            </p>
          </div>
          {q.rotten.length > 0 && (
            <button
              onClick={purgeAllRotten}
              className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
            >
              <Archive size={13} /> Archive all {q.rotten.length}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {q.rotten.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              today={today}
              onDone={onDone}
              onPush={onPush}
              onArchive={onArchive}
              onDelete={onDelete}
              onToday={onToday}
              onOpen={onOpen}
            />
          ))}
          {!q.rotten.length && (
            <p className="py-4 text-center text-xs text-muted-foreground">Nothing rotting. ✅</p>
          )}
        </div>
      </section>

      {/* ── 2. Stale ── */}
      <section className="card-elevated space-y-3 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles size={15} className="text-amber-500" /> Decide · untouched {STALE_DAYS}d+
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {q.stale.length} task(s) waiting on a decision, not on time.
          </p>
        </div>
        <div className="space-y-2">
          {q.stale.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              today={today}
              onDone={onDone}
              onPush={onPush}
              onArchive={onArchive}
              onDelete={onDelete}
              onToday={onToday}
              onOpen={onOpen}
            />
          ))}
          {!q.stale.length && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Everything active has been touched recently.
            </p>
          )}
        </div>
      </section>

      {/* ── 3. Eisenhower matrix — drag & drop ── */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Target size={15} className="text-primary" /> Priority matrix
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Drag on desktop, use Move on touch devices, or tap any task to fully edit it. Every
              change is live everywhere.
            </p>
          </div>
          <label className="relative block sm:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={matrixSearch}
              onChange={(e) => setMatrixSearch(e.target.value)}
              placeholder="Find a task in Review…"
              className="w-full rounded-xl border border-border/40 bg-secondary/40 py-2 pl-8 pr-3 text-xs text-foreground outline-none focus:border-primary/50"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {QUADRANTS.map((quad) => (
            <div
              key={quad.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOver(quad.id);
              }}
              onDragLeave={() => setDragOver((d) => (d === quad.id ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/mc-task");
                if (id) void moveToQuadrant(id, quad.id);
              }}
              className={`rounded-2xl border p-3 transition ${quad.accent} ${
                dragOver === quad.id ? "ring-2 ring-primary/60 scale-[1.01]" : ""
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wide">{quad.label}</span>
                <span className="text-[10px] opacity-70">{quad.hint}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {visibleMatrix[quad.id].map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/mc-task", t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex min-h-11 cursor-grab items-center gap-2 rounded-xl border border-transparent bg-background/60 px-2.5 py-2 transition hover:border-primary/20 hover:shadow-sm active:cursor-grabbing"
                  >
                    <button
                      onClick={() => onOpen(t)}
                      className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-foreground hover:text-primary"
                    >
                      {t.title}
                    </button>
                    {/* Mobile-friendly move menu (no drag needed) */}
                    <select
                      aria-label="Move task"
                      value={quad.id}
                      onChange={(e) => void moveToQuadrant(t.id, e.target.value as Quadrant)}
                      className="max-w-[104px] rounded-lg bg-secondary/70 px-1 py-1 text-[10px] font-semibold text-muted-foreground outline-none"
                    >
                      {QUADRANTS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => onDone(t)}
                      className="text-emerald-500 transition hover:scale-110"
                      title="Done"
                    >
                      <CheckCircle2 size={13} />
                    </button>
                  </div>
                ))}
                {!visibleMatrix[quad.id].length && (
                  <p className="py-4 text-center text-[11px] opacity-60">Drop a task here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Shutdown ── */}
      <section className="card-elevated space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Moon size={15} className="text-indigo-400" /> Daily shutdown
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Last closed {daysAgoLabel(lastShutdown)}. Pick the three that matter tomorrow.
            </p>
          </div>
          <button
            onClick={finishShutdown}
            className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary/70"
          >
            Close the day <ArrowRight size={13} />
          </button>
        </div>
        <div className="space-y-2">
          {tomorrowPlan.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-border/30 bg-secondary/30 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {t.title}
              </span>
              <button
                onClick={() => onPush(t, 1)}
                className="rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Tomorrow
              </button>
            </div>
          ))}
          {!tomorrowPlan.length && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nothing important pending. Enjoy the evening.
            </p>
          )}
        </div>
      </section>

      {/* ── 5. Archive ── */}
      <section className="card-elevated space-y-3 p-4">
        <button
          onClick={() => setShowArchive((s) => !s)}
          className="flex w-full items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Archive size={15} className="text-muted-foreground" /> Archive ({q.archivedCount})
          </span>
          <span className="text-[11px] text-muted-foreground">{showArchive ? "Hide" : "Show"}</span>
        </button>
        {showArchive && (
          <div className="space-y-2">
            {archived.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border/20 bg-secondary/20 p-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {t.title}
                </span>
                <button
                  onClick={() => onRestore(t)}
                  className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-secondary/70"
                >
                  <Undo2 size={12} /> Restore
                </button>
                <button
                  onClick={() => onDelete(t)}
                  className="rounded-xl bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {!archived.length && (
              <p className="py-4 text-center text-xs text-muted-foreground">Archive is empty.</p>
            )}
          </div>
        )}
      </section>

      <TaskQuickEditor task={editing} onClose={() => setEditingId(null)} />
      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
