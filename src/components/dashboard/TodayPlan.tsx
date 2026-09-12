// ─── Today: outcomes, next action, capacity ───────────────────────────────────
// Answers, in order: What matters today? What should I do next? Is it realistic?
// Calm hierarchy: titles dominate, metadata is secondary, one primary action.

import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Pin,
  PinOff,
  Sparkles,
  Timer,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import type { WorkItem } from "@/lib/workQueue";
import type { Task } from "@/lib/db";
import type { Capacity, FixedEvent } from "@/lib/planning";
import { estimateOf, fmtMinutes } from "@/lib/planning";
import { useUpdateItem } from "@/hooks/useTableData";
import { usePlanStore } from "@/stores/planStore";
import { rescheduleToTomorrow } from "@/lib/taskActions";
import { useRecordSync } from "@/hooks/useRecordSync";
import { retryCloudPush } from "@/lib/cloudSync";
import { useNavigationStore } from "@/stores/navigationStore";

export function SyncDot({ id }: { id: string }) {
  const state = useRecordSync("tasks", id);
  if (state === "saved" || state === "local-only") return null;
  return (
    <button
      type="button"
      onClick={state === "failed" ? () => void retryCloudPush() : undefined}
      title={
        state === "failed" ? "Cloud save failed — click to retry" : "Saved here · syncing to cloud"
      }
      aria-label={state === "failed" ? "Sync failed, retry" : "Pending sync"}
      className={`inline-flex h-4 shrink-0 items-center gap-1 rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wide ${
        state === "failed"
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      {state === "failed" ? "retry" : "pending"}
    </button>
  );
}

function DueBadge({ due, today }: { due?: string; today: string }) {
  if (!due) return null;
  const overdue = due < today;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${
        overdue
          ? "text-destructive"
          : due === today
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground"
      }`}
    >
      {overdue && <AlertTriangle size={10} aria-hidden />}
      {overdue
        ? `overdue · was due ${due.slice(5)}`
        : due === today
          ? "due today"
          : `due ${due.slice(5)}`}
    </span>
  );
}

export default function TodayPlan({
  today,
  nextAction,
  commitments,
  outcomesAreChosen,
  suggestedPlan,
  capacity,
  fixed,
  onComplete,
  onCommit,
  onFocus,
}: {
  today: string;
  nextAction: WorkItem | null;
  commitments: WorkItem[];
  outcomesAreChosen: boolean;
  suggestedPlan: { task: Task; minutes: number; reason: string }[];
  capacity: Capacity;
  fixed: FixedEvent[];
  onComplete: (item: WorkItem) => void;
  onCommit: (item: WorkItem) => void;
  onFocus: (item: WorkItem) => void;
}) {
  const updateItem = useUpdateItem();
  const { markMorningPlan, lastMorningPlan } = usePlanStore();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const [planStart] = useState(() => Date.now());

  const over = capacity.overMin > 0;
  const next = nextAction;

  const applySuggestion = async () => {
    for (const s of suggestedPlan) {
      await updateItem<Task>("tasks", s.task.id, {
        committedOn: today,
        inbox: false,
        estimateMin: s.task.estimateMin ?? s.minutes,
      } as Partial<Task>);
    }
    markMorningPlan(today, Date.now() - planStart);
    toast.success(`Planned ${suggestedPlan.length} outcome${suggestedPlan.length > 1 ? "s" : ""}`, {
      description: "Deadlines untouched. Unpin any of them to change your mind.",
    });
  };

  const unpin = async (item: WorkItem) => {
    await updateItem<Task>("tasks", item.refId, { committedOn: undefined } as Partial<Task>);
  };

  const moveOne = async (item: WorkItem) => {
    await rescheduleToTomorrow(item.raw as Task, today);
    toast.success("Moved to tomorrow — deadline unchanged");
  };

  return (
    <section
      className="zen-card v10-card enterprise-card rounded-[24px] p-4 sm:p-5"
      aria-labelledby="today-heading"
    >
      {/* ── Next action ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="zen-label text-[10.5px] font-bold uppercase tracking-[0.14em]">Do next</p>
          {next ? (
            <>
              <h1
                id="today-heading"
                className="title-grad mt-1 font-display text-[22px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[26px]"
              >
                {next.title}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                {next.kind === "task" && (
                  <span className="inline-flex items-center gap-1">
                    <Timer size={11} aria-hidden /> {fmtMinutes(estimateOf(next.raw as Task))}
                  </span>
                )}
                <DueBadge due={next.due} today={today} />
                {next.context && <span className="truncate">{next.context}</span>}
                {next.kind === "task" && <SyncDot id={next.refId} />}
              </div>
            </>
          ) : (
            <h1
              id="today-heading"
              className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-foreground"
            >
              Nothing chosen yet
            </h1>
          )}
        </div>
        {next && (
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <button
              onClick={() => onFocus(next)}
              className="flex h-10 items-center gap-1.5 rounded-2xl bg-primary px-4 text-[12.5px] font-bold text-primary-foreground shadow-[var(--shadow-primary)] transition hover:opacity-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Start <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onComplete(next)}
              aria-label="Mark done"
              className="flex h-10 items-center gap-1.5 rounded-2xl border border-border/60 bg-background/60 px-3 text-[12.5px] font-semibold text-foreground transition hover:border-emerald-500/40 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <CheckCircle2 size={14} /> Done
            </button>
          </div>
        )}
      </div>

      {/* ── Capacity ── */}
      <div className="mt-4 rounded-2xl border border-border/50 bg-background/50 p-3" role="status">
        <div className="flex items-center justify-between gap-3 text-[11.5px]">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <Clock size={12} aria-hidden />
            {fmtMinutes(capacity.plannedMin)} selected · {fmtMinutes(capacity.availableMin)} free
            {capacity.fixedMin > 0 && (
              <span className="font-normal text-muted-foreground">
                ({fmtMinutes(capacity.fixedMin)} in meetings)
              </span>
            )}
          </span>
          {over ? (
            <span className="font-bold text-destructive">
              over by {fmtMinutes(capacity.overMin)}
            </span>
          ) : (
            <span className="text-muted-foreground">realistic</span>
          )}
        </div>
        <div className="mt-2 zen-cap-bar" aria-hidden>
          <div
            className={`zen-cap-fill ${over ? "over" : ""}`}
            style={{ width: `${Math.min(100, capacity.ratio * 100)}%` }}
          />
        </div>
        {over && (
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-foreground/85">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
            Your selected work exceeds today's available time. Choose what to move — deadlines stay
            where they are.
          </p>
        )}
      </div>

      {/* ── Outcomes ── */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="zen-label text-[10.5px] font-bold uppercase tracking-[0.14em]">
            {outcomesAreChosen ? "Today's outcomes" : "Suggested for today"}
          </h2>
          {!outcomesAreChosen && suggestedPlan.length > 0 && (
            <button
              onClick={applySuggestion}
              className="flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Sparkles size={11} /> Commit to these {suggestedPlan.length}
            </button>
          )}
        </div>

        <ul className="mt-2 space-y-1.5">
          {(outcomesAreChosen ? commitments : []).map((item) => (
            <li key={item.id} className="zen-pill group">
              <button
                onClick={() => onComplete(item)}
                aria-label={`Mark “${item.title}” done`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border/70 text-transparent transition hover:border-emerald-500 hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <CheckCircle2 size={12} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-foreground">
                  {item.title}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-muted-foreground">
                  {item.kind === "task" && <span>{fmtMinutes(estimateOf(item.raw as Task))}</span>}
                  <DueBadge due={item.due} today={today} />
                  {item.kind === "task" && <SyncDot id={item.refId} />}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {over && item.kind === "task" && (
                  <button
                    onClick={() => moveOne(item)}
                    title="Move to tomorrow (deadline unchanged)"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <CalendarClock size={13} />
                  </button>
                )}
                {item.kind === "task" && (item.raw as Task).committedOn === today && (
                  <button
                    onClick={() => unpin(item)}
                    title="Unpin from today"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <PinOff size={13} />
                  </button>
                )}
              </div>
            </li>
          ))}

          {!outcomesAreChosen &&
            suggestedPlan.map((s) => (
              <li
                key={s.task.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-foreground">
                    {s.task.title}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                    {fmtMinutes(s.minutes)} · because {s.reason}
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateItem<Task>("tasks", s.task.id, {
                      committedOn: today,
                      inbox: false,
                    } as Partial<Task>)
                  }
                  title="Pin just this one"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Pin size={13} />
                </button>
              </li>
            ))}

          {!outcomesAreChosen && suggestedPlan.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border/60 px-3 py-4 text-center text-[12px] text-muted-foreground">
              Nothing queued for today. Capture something with{" "}
              <kbd className="rounded border border-border/60 px-1 text-[10px]">N</kbd> or{" "}
              <button
                onClick={() => setActiveSection("tasks")}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                pick from Tasks
              </button>
              .
            </li>
          )}
        </ul>
        {outcomesAreChosen && lastMorningPlan !== today && (
          <button
            onClick={() => markMorningPlan(today, Date.now() - planStart)}
            className="mt-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            This is my plan for today ✓
          </button>
        )}
      </div>

      {/* ── Fixed commitments ── */}
      {fixed.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Fixed today
          </h2>
          <ul className="mt-2 divide-y divide-border/40 rounded-2xl border border-border/40 bg-background/40">
            {fixed.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-[12.5px]">
                <span className="w-[92px] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {f.allDay ? "all day" : `${f.start}–${f.end}`}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {f.title}
                </span>
                {f.htmlLink && (
                  <a
                    href={f.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    open
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
