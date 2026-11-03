import { useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  Check,
  CheckSquare,
  Inbox,
  Search,
  Target,
  Undo2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import type { Task } from "@/lib/db";
import { todayISO } from "@/lib/overdue";
import PageHeader from "@/components/PageHeader";
import TaskQuickEditor from "@/components/TaskQuickEditor";
import QuickCaptureBar from "@/components/dashboard/QuickCaptureBar";
import { processCaptures, undoCaptures, type CaptureUndo } from "@/lib/captureTriage";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-50";
const PAGE_SIZE = 30;

/** Captures owns inbox triage; news and measurements live in their dedicated sections. */
export default function ControlCenterPage() {
  const tasks = useTasks();
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<CaptureUndo[] | null>(null);
  const lock = useRef(false);
  const today = todayISO();
  const captures = useMemo(
    () =>
      tasks
        .filter((task) => task.inbox && !task.archived && !task.deletedAt && task.status !== "done")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [tasks],
  );
  const filtered = useMemo(
    () =>
      captures.filter(
        (task) =>
          (area === "all" || (task.area || "work") === area) &&
          `${task.title} ${task.description} ${task.category} ${task.linkedProject}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [captures, area, query],
  );
  const visible = filtered.slice(0, limit);
  const selectedRows = captures.filter((task) => selected.has(task.id));
  const editing = tasks.find((task) => task.id === editingId) || null;

  async function operation(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : "The change was not saved. Please try again.";
      setError(message);
      toast.error("Not saved", { description: message });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function process(rows: Task[], mode: "accept" | "today" | "archive") {
    if (!rows.length) return;
    void operation(async () => {
      const result = await processCaptures(
        rows.map((task) => task.id),
        mode,
        today,
      );
      if (result.undo.length) setUndo(result.undo);
      setSelected(new Set());
      if (result.undo.length)
        toast.success(
          `${result.undo.length} ${result.undo.length === 1 ? "capture" : "captures"} ${mode === "archive" ? "archived" : mode === "today" ? "planned for today" : "moved to Tasks"}`,
          {
            description:
              "Original deadlines and descriptions were preserved. Undo is available below.",
          },
        );
      if (result.conflicts.length)
        toast.warning(`${result.conflicts.length} changed capture(s) were left untouched`, {
          description: "Their current state no longer matches this inbox selection.",
        });
      if (result.syncError)
        toast.warning("Saved on this device; sync needs attention", {
          description: result.syncError,
        });
    });
  }

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Inbox}
        eyebrow="Operate / Capture and clarify"
        title="Captures"
        subtitle="A clear inbox for unfinished thoughts. Capture quickly, then decide what to do, when to do it, or what to archive."
        stats={[
          { label: "Awaiting a decision", value: captures.length },
          {
            label: "With a deadline",
            value: captures.filter((task) => !!task.dueDate).length,
            tone: "amber",
          },
          { label: "Selected", value: selectedRows.length },
        ]}
        actions={
          <button className={button} onClick={() => setActiveSection("tasks")}>
            <CheckSquare size={16} />
            Open Tasks
            <ArrowRight size={14} />
          </button>
        }
      />
      <QuickCaptureBar />
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
        <span>Undated tasks land in this inbox.</span>
        {[
          { id: "notes", label: "Notes" },
          { id: "ideas", label: "Ideas" },
          { id: "links", label: "Links" },
          { id: "reminders", label: "Reminders" },
        ].map((link) => (
          <button
            key={link.id}
            onClick={() => setActiveSection(link.id)}
            className="min-h-8 text-primary hover:underline"
          >
            {link.label} <span aria-hidden>↗</span>
          </button>
        ))}
      </div>
      <section
        className="space-y-3 rounded-2xl border border-border bg-card p-4"
        aria-label="Capture inbox filters"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border px-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              aria-label="Search captures"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="Search captured tasks and context"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select
            aria-label="Capture area"
            value={area}
            onChange={(event) => {
              setArea(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            className={`${button} bg-background`}
          >
            <option value="all">Work and personal</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={filtered.length > 0 && filtered.every((task) => selected.has(task.id))}
              disabled={!filtered.length || busy}
              onChange={(event) =>
                setSelected(
                  event.target.checked ? new Set(filtered.map((task) => task.id)) : new Set(),
                )
              }
            />
            Select filtered captures ({filtered.length})
          </label>
          <span className="text-xs text-muted-foreground">
            Oldest first · every count comes from saved tasks
          </span>
        </div>
        {selectedRows.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <button
              disabled={busy}
              className={`${button} text-primary`}
              onClick={() => process(selectedRows, "accept")}
            >
              <Check size={15} />
              Accept {selectedRows.length}
            </button>
            <button
              disabled={busy}
              className={button}
              onClick={() => process(selectedRows, "today")}
            >
              <Target size={15} />
              Plan today
            </button>
            <button
              disabled={busy}
              className={button}
              onClick={() => process(selectedRows, "archive")}
            >
              <Archive size={15} />
              Archive selected
            </button>
            <button disabled={busy} className={button} onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </div>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {undo && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
        >
          <span>{undo.length} capture(s) processed. You can undo the last change.</span>
          <button
            disabled={busy}
            className={button}
            onClick={() =>
              void operation(async () => {
                const result = await undoCaptures(undo);
                setUndo(null);
                if (result.restored) toast.success(`${result.restored} capture change(s) undone`);
                if (result.conflicts.length) {
                  const message = `${result.conflicts.length} record(s) changed after processing and were not overwritten. Their newer edits have been kept.`;
                  setError(message);
                  toast.warning("Some records could not be undone", { description: message });
                }
                if (result.syncError)
                  toast.warning("Undo saved on this device; sync needs attention", {
                    description: result.syncError,
                  });
              })
            }
          >
            <Undo2 size={15} />
            Undo
          </button>
        </div>
      )}
      <section className="space-y-3" aria-label="Captured tasks">
        {visible.map((task) => (
          <article
            key={task.id}
            className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-start ${selected.has(task.id) ? "border-primary/40 ring-1 ring-primary/10" : "border-border"}`}
          >
            <input
              type="checkbox"
              checked={selected.has(task.id)}
              onChange={() => toggle(task.id)}
              disabled={busy}
              aria-label={`Select ${task.title}`}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <div className="min-w-0 flex-1">
              <button
                className="break-words text-left font-semibold hover:text-primary"
                onClick={() => setEditingId(task.id)}
              >
                {task.title}
              </button>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{task.area === "personal" ? "Personal" : "Work"}</span>
                <span>Captured {task.createdAt.slice(0, 10)}</span>
                {task.dueDate && <span className="text-amber-600">Deadline {task.dueDate}</span>}
                {task.linkedProject && <span>{task.linkedProject}</span>}
              </p>
              {task.description && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy}
                className={`${button} text-primary`}
                onClick={() => process([task], "accept")}
              >
                <Check size={15} />
                Accept
              </button>
              <button disabled={busy} className={button} onClick={() => process([task], "today")}>
                <Target size={15} />
                Today
              </button>
              <button disabled={busy} className={button} onClick={() => setEditingId(task.id)}>
                <SlidersHorizontal size={15} />
                Edit
              </button>
              <button
                disabled={busy}
                className={button}
                aria-label={`Archive ${task.title}`}
                onClick={() => process([task], "archive")}
              >
                <Archive size={15} />
              </button>
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <Inbox size={30} className="mx-auto text-primary" />
            <h2 className="mt-3 text-lg font-semibold">
              {captures.length ? "No matching captures" : "Your capture inbox is clear"}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {captures.length
                ? "Adjust the search or area filter to see other captured tasks."
                : "Use the capture bar above to save a thought. Accepting a task moves it into your task list without inventing a deadline."}
            </p>
          </div>
        )}
        {filtered.length > limit && (
          <button
            className={`${button} w-full`}
            onClick={() => setLimit((value) => value + PAGE_SIZE)}
          >
            Show more · {filtered.length - limit} remaining
          </button>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Looking for intelligence?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the dedicated workspaces for publisher coverage, identity-matched mentions and
          measured audience data.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { id: "industry", label: "Trends" },
            { id: "mentions", label: "Mentions" },
            { id: "audience", label: "Audience" },
            { id: "decisions", label: "Findings" },
          ].map((link) => (
            <button key={link.id} className={button} onClick={() => setActiveSection(link.id)}>
              {link.label}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </section>
      <TaskQuickEditor task={editing} onClose={() => setEditingId(null)} />
    </div>
  );
}
