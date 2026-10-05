// ─── Today: outcomes, next action, capacity ───────────────────────────────────
// Editorial card with clean hierarchy: next action, capacity bar, outcomes list.

import { useState } from "react";
import {
  CircleCheck as CheckCircle2,
  ChevronRight,
  Clock,
  Pin,
  PinOff,
  Sparkles,
  Timer,
  TriangleAlert as AlertTriangle,
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
import { useNavigationStore } from "@/stores/navigationStore";

export function SyncDot({ id }: { id: string }) {
  const state = useRecordSync("tasks", id);
  void state;
  return null;
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
    <section className="mc21-plan-card mc38-plan-card se-card ultra-rise-3 p-4 sm:p-5" aria-labelledby="today-heading">
      {/* ── Guided plan header ── */}
      <div className="mc21-plan-head">
        <div className="min-w-0">
          <p className="se-label">{outcomesAreChosen ? "Daily plan" : "Guided planning"}</p>
          <h2 id="today-heading">
            {outcomesAreChosen ? "Three outcomes. One clear day." : "Build a realistic day."}
          </h2>
          <p>
            {outcomesAreChosen
              ? next
                ? `Next: ${next.title}`
                : "Your priorities are chosen. Work the plan, then close the day."
              : "Choose only what fits. Deadlines stay separate from when you plan to work."}
          </p>
        </div>

        {!outcomesAreChosen && suggestedPlan.length > 0 ? (
          <button onClick={applySuggestion} className="mc21-plan-primary">
            <Sparkles size={13} />
            Plan top {suggestedPlan.length}
          </button>
        ) : next ? (
          <button onClick={() => onFocus(next)} className="mc21-plan-primary">
            Start next <ChevronRight size={13} />
          </button>
        ) : null}
      </div>

      {/* ── Capacity ── */}
      <div
        className="mc21-capacity mt-4 rounded-2xl border border-border/40 bg-background/40 p-3.5"
        role="status"
      >
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
        <div className="mt-2.5 zen-cap-bar" aria-hidden>
          <div
            className={`zen-cap-fill ${over ? "over" : ""}`}
            style={{ width: `${Math.min(100, capacity.ratio * 100)}%` }}
          />
        </div>
        {over && (
          <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] text-foreground/85">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
            Your selected work exceeds today's available time. Choose what to move — deadlines stay
            where they are.
          </p>
        )}
      </div>

      {/* ── Outcomes ── */}
      <div className="mt-5">
        <div className="mc21-outcomes-head">
          <h3 className="se-label">
            {outcomesAreChosen ? "Today's focused outcomes" : "Recommended next"}
          </h3>
          <span>
            {outcomesAreChosen
              ? `${commitments.length}/3 selected`
              : `${suggestedPlan.length} fit your remaining capacity`}
          </span>
        </div>

        <ul className="mt-3 space-y-2">
          {(outcomesAreChosen ? commitments : []).map((item) => {
            const isDone = item.raw && (item.raw as { status?: string }).status === "done";
            return (
              <li key={item.id} className={`se-outcome group ${isDone ? "se-outcome-done" : ""}`}>
                <button
                  onClick={() => onComplete(item)}
                  aria-label={`Mark "${item.title}" done`}
                  className="se-check"
                >
                  <CheckCircle2 size={13} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="se-outcome-title truncate text-[13.5px] font-semibold text-foreground">
                    {item.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-muted-foreground">
                    {item.kind === "task" && (
                      <span>{fmtMinutes(estimateOf(item.raw as Task))}</span>
                    )}
                    <DueBadge due={item.due} today={today} />
                    {item.kind === "task" && <SyncDot id={item.refId} />}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {over && item.kind === "task" && (
                    <button
                      onClick={() => moveOne(item)}
                      title="Move to tomorrow (deadline unchanged)"
                      className="se-icon-btn"
                    >
                      <CalendarClock size={13} />
                    </button>
                  )}
                  {item.kind === "task" && (item.raw as Task).committedOn === today && (
                    <button
                      onClick={() => unpin(item)}
                      title="Unpin from today"
                      className="se-icon-btn"
                    >
                      <PinOff size={13} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}

          {!outcomesAreChosen &&
            suggestedPlan.map((s) => (
              <li
                key={s.task.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-border/50 px-3.5 py-3"
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
                  className="se-icon-btn"
                >
                  <Pin size={13} />
                </button>
              </li>
            ))}

          {!outcomesAreChosen && suggestedPlan.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border/50 px-3.5 py-5 text-center text-[12px] text-muted-foreground">
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
            className="mt-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            This is my plan for today ✓
          </button>
        )}
      </div>

      {/* ── Fixed commitments ── */}
      {fixed.length > 0 && (
        <div className="mt-5">
          <h2 className="se-label">Fixed today</h2>
          <ul className="mt-2.5 divide-y divide-border/30 rounded-2xl border border-border/30 bg-background/30">
            {fixed.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]">
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
