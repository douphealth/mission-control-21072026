import { useMemo, useState, useCallback, useRef } from "react";
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
import { useTasks, useTrashedTasks, useUpdateItem } from "@/hooks/useTableData";
import { softDeleteTasks, purgeTasks, restoreTasks, TRASH_RETENTION_DAYS } from "@/lib/taskActions";
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
  quadrantPlan,
  quadrantOf,
} from "@/lib/triage";
import type { Quadrant } from "@/lib/triage";
import { useReviewStore } from "@/stores/reviewStore";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import TaskQuickEditor from "@/components/TaskQuickEditor";
import DayClose from "@/components/DayClose";
import PageHeader from "@/components/PageHeader";

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
          title="Plan a week from now without changing the real deadline"
          className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <CalendarClock size={12} /> Plan +7d
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
  const cd = useConfirmDialog();
  const today = todayISO();
  const { lastWeeklyReview, markWeeklyReview } = useReviewStore();
  const [showArchive, setShowArchive] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const trashed = useTrashedTasks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [matrixSearch, setMatrixSearch] = useState("");

  const q = useMemo(() => buildReviewQueues(tasks, today), [tasks, today]);
  const archived = useMemo(() => sortByPriority(tasks.filter(isArchived)), [tasks]);
  const editing = useMemo(() => tasks.find((t) => t.id === editingId) ?? null, [tasks, editingId]);

  const onOpen = useCallback((t: Task) => setEditingId(t.id), []);

  const actionLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const perform = useCallback(async (action: () => Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError("");
    try {
      await action();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The update could not be saved. Please try again.";
      setActionError(message);
      toast.error("Not saved", { description: message });
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }, []);
  const moveToQuadrant = useCallback(
    (taskId: string, quad: Quadrant) =>
      perform(async () => {
        const task = tasks.find((item) => item.id === taskId);
        if (!task) throw new Error("This task no longer exists. Refresh Review.");
        const changes = quadrantPlan(task, quad, today);
        await updateItem<Task>("tasks", taskId, changes);
        if (quadrantOf({ ...task, ...changes }, today) !== quad)
          toast.info("Plan saved; the deadline still needs attention", {
            description:
              "The real deadline was preserved, so this task remains in an urgent quadrant.",
          });
        else
          toast.success(`Moved to ${QUADRANTS.find((item) => item.id === quad)?.label}`, {
            description: "Work plan updated; the deadline is unchanged.",
          });
      }),
    [tasks, today, updateItem, perform],
  );
  const onDone = useCallback(
    (task: Task) =>
      perform(async () => {
        await updateItem<Task>("tasks", task.id, {
          status: "done",
          completedAt: new Date().toISOString(),
        });
        toast.success("Task completed");
      }),
    [updateItem, perform],
  );
  const onToday = useCallback(
    (task: Task) =>
      perform(async () => {
        await updateItem<Task>("tasks", task.id, {
          status: "in-progress",
          committedOn: today,
          scheduledAt: today,
          notBefore: undefined,
          touchedAt: today,
        });
        toast.success("Planned for today — deadline unchanged");
      }),
    [updateItem, today, perform],
  );
  const onPush = useCallback(
    (task: Task, days: number) =>
      perform(async () => {
        const planned = addDaysISO(days, today);
        await updateItem<Task>("tasks", task.id, {
          notBefore: planned,
          scheduledAt: planned,
          reviewAt: planned,
          committedOn: undefined,
          touchedAt: today,
        });
        toast.success(`Planned for ${planned} — deadline unchanged`);
      }),
    [updateItem, today, perform],
  );
  const onArchive = useCallback(
    (task: Task) =>
      perform(async () => {
        await updateItem<Task>("tasks", task.id, { archived: true, archivedAt: today });
        toast.success("Archived — restore it from the archive below");
      }),
    [updateItem, today, perform],
  );
  const onRestore = useCallback(
    (task: Task) =>
      perform(async () => {
        await updateItem<Task>("tasks", task.id, {
          archived: false,
          archivedAt: undefined,
          scheduledAt: today,
          reviewAt: today,
          touchedAt: today,
        });
        toast.success("Restored — deadline unchanged");
      }),
    [updateItem, today, perform],
  );
  const onDelete = useCallback(
    (task: Task) =>
      perform(async () => {
        await softDeleteTasks([task.id]);
      }),
    [perform],
  );
  const onPurge = useCallback(
    (task: Task) =>
      cd.confirm({
        title: "Delete forever",
        description: `“${task.title}” will be permanently removed.`,
        onConfirm: () =>
          void perform(async () => {
            await purgeTasks([task.id]);
            toast.success("Permanently deleted");
          }),
      }),
    [cd, perform],
  );
  const purgeAllRotten = useCallback(() => {
    if (!q.rotten.length) return;
    cd.confirm({
      title: `Archive ${q.rotten.length} long-overdue tasks?`,
      description: `Tasks overdue by ${ROT_DAYS}+ days will leave the active list. They remain available in the archive.`,
      confirmLabel: "Archive tasks",
      onConfirm: () =>
        void perform(async () => {
          for (const task of q.rotten)
            await updateItem<Task>("tasks", task.id, { archived: true, archivedAt: today });
          toast.success(`${q.rotten.length} tasks archived`);
        }),
    });
  }, [q.rotten, cd, updateItem, today, perform]);

  const finishWeekly = useCallback(() => {
    markWeeklyReview(today);
    toast.success("Weekly review logged.");
  }, [markWeeklyReview, today]);

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
      <PageHeader
        icon={RefreshCcw}
        eyebrow="Operate / Weekly decisions"
        title="Review"
        subtitle={`Decide what matters, protect real deadlines, and make room for the work ahead. Last review on this device: ${daysAgoLabel(lastWeeklyReview)}.`}
        stats={[
          { label: "Open tasks", value: q.openCount },
          { label: "Overdue", value: q.overdue.length, tone: "amber" },
          { label: "Need review", value: q.stale.length + q.rotten.length },
        ]}
        actions={
          <button disabled={busy} onClick={finishWeekly} className="btn-primary min-h-11 text-sm">
            <CheckCircle2 size={16} />
            Mark review done
          </button>
        }
      />
      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}

      {reviewDue && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Weekly review is due
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Start with overdue commitments, decide which untouched tasks still matter, then choose
              the next work to schedule.
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Graveyard ── */}
      <section className="card-elevated space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Trash2 size={15} className="text-red-500" /> Long-overdue commitments · {ROT_DAYS}d+
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {q.rotten.length} task(s) with a real deadline that needs a fresh decision.
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
            <p className="py-4 text-center text-xs text-muted-foreground">
              No tasks are more than 30 days overdue.
            </p>
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
            {q.stale.length} task(s) have not been updated recently. Check whether the next action
            is still useful.
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
              Move tasks to change importance and planned work. Real deadlines stay unchanged; an
              approaching or missed deadline remains urgent.
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
              aria-label="Search review tasks"
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
                      aria-label={`Move ${t.title}`}
                      disabled={busy}
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
                  <p className="py-4 text-center text-[11px] opacity-60">
                    No tasks in this quadrant
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Close the day — every unfinished item gets a deliberate choice ── */}
      <DayClose tasks={tasks} />

      {/* ── 4b. Tomorrow's top three (preview only) ── */}
      {tomorrowPlan.length > 0 && (
        <section className="card-elevated space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Moon size={15} className="text-indigo-400" /> Likely top three tomorrow
          </h2>
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
              </div>
            ))}
          </div>
        </section>
      )}

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
                  title="Move to Trash"
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

      {/* ── 6. Trash — recoverable deletes ── */}
      <section className="card-elevated space-y-3 p-4">
        <button
          onClick={() => setShowTrash((s) => !s)}
          className="flex w-full items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Trash2 size={15} className="text-muted-foreground" /> Trash ({trashed.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            {showTrash ? "Hide" : `Show · kept ${TRASH_RETENTION_DAYS} days`}
          </span>
        </button>
        {showTrash && (
          <div className="space-y-2">
            {trashed.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border/20 bg-secondary/20 p-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {t.title}
                  <span className="ml-2 text-[10px]">
                    deleted {daysAgoLabel(t.deletedAt!.slice(0, 10))}
                  </span>
                </span>
                <button
                  onClick={() =>
                    void perform(async () => {
                      await restoreTasks([t.id]);
                      toast.success("Task restored");
                    })
                  }
                  className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-secondary/70"
                >
                  <Undo2 size={12} /> Restore
                </button>
                <button
                  onClick={() => onPurge(t)}
                  title="Delete forever"
                  className="rounded-xl bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive"
                >
                  Forever
                </button>
              </div>
            ))}
            {!trashed.length && (
              <p className="py-4 text-center text-xs text-muted-foreground">Trash is empty.</p>
            )}
          </div>
        )}
      </section>

      <TaskQuickEditor task={editing} onClose={() => setEditingId(null)} />
      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
