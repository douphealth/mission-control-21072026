// Evening review: every unfinished item planned for today gets a deliberate
// decision. Nothing rolls forward silently.
import { useMemo, useState } from "react";
import { Moon, ArrowRight, CheckCircle2, Inbox, CalendarClock, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/db";
import { todayISO } from "@/lib/overdue";
import { isPlannedToday, estimateOf, fmtMinutes } from "@/lib/planning";
import { isOpen } from "@/lib/triage";
import {
  rescheduleToTomorrow,
  reduceScope,
  sendToInbox,
  softDeleteTasks,
} from "@/lib/taskActions";
import { useUpdateItem } from "@/hooks/useTableData";
import { usePlanStore } from "@/stores/planStore";

export default function DayClose({ tasks, compact = false }: { tasks: Task[]; compact?: boolean }) {
  const today = todayISO();
  const updateItem = useUpdateItem();
  const { lastDayClose, markDayClose } = usePlanStore();
  const [decided, setDecided] = useState<Record<string, string>>({});

  const unfinished = useMemo(
    () => tasks.filter((t) => isOpen(t) && !t.deletedAt && isPlannedToday(t, today)),
    [tasks, today],
  );
  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === "done" && (t.completedAt ?? "").slice(0, 10) === today),
    [tasks, today],
  );
  const essentialDone = doneToday.filter((t) => t.important || t.priority === "critical").length;
  const remaining = unfinished.filter((t) => !decided[t.id]);
  const closedToday = lastDayClose === today;

  const act = async (t: Task, choice: string) => {
    if (choice === "done") {
      await updateItem<Task>("tasks", t.id, { status: "done", completedAt: new Date().toISOString() });
    } else if (choice === "reschedule") await rescheduleToTomorrow(t, today);
    else if (choice === "reduce") await reduceScope(t, Math.max(15, Math.round(estimateOf(t) / 2 / 5) * 5));
    else if (choice === "inbox") await sendToInbox(t);
    else if (choice === "delete") await softDeleteTasks([t.id]);
    setDecided((d) => ({ ...d, [t.id]: choice }));
  };

  const finish = () => {
    markDayClose(today);
    toast.success(
      essentialDone > 0 ? "Your essential commitments are complete." : "Day closed. Tomorrow has a plan.",
    );
  };

  return (
    <section className={`card-elevated space-y-3 ${compact ? "p-3.5" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Moon size={15} className="text-indigo-400" /> Close the day
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {doneToday.length} finished today · {remaining.length} still need a decision
          </p>
        </div>
        <button
          onClick={finish}
          disabled={remaining.length > 0 && !closedToday}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          title={remaining.length ? "Decide on every open item first" : "Finish the day"}
        >
          {closedToday ? "Closed" : "Finish"} <ArrowRight size={13} />
        </button>
      </div>

      {remaining.length === 0 ? (
        <p className="rounded-2xl bg-emerald-500/8 px-3 py-3 text-xs text-emerald-600 dark:text-emerald-400">
          {essentialDone > 0
            ? "Your essential commitments are complete. Nothing is rolling forward without your say."
            : "Everything planned for today has a decision. Rest."}
        </p>
      ) : (
        <ul className="space-y-2">
          {remaining.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-border/30 bg-secondary/30 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {t.title}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{fmtMinutes(estimateOf(t))}</span>
                {t.dueDate && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">due {t.dueDate}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Choice icon={<CheckCircle2 size={12} />} label="Done" tone="ok" onClick={() => act(t, "done")} />
                <Choice icon={<CalendarClock size={12} />} label="Tomorrow" hint="deadline unchanged" onClick={() => act(t, "reschedule")} />
                <Choice icon={<Scissors size={12} />} label="Reduce" hint="halve the estimate" onClick={() => act(t, "reduce")} />
                <Choice icon={<Inbox size={12} />} label="Inbox" hint="undecided, no date" onClick={() => act(t, "inbox")} />
                <Choice icon={<Trash2 size={12} />} label="Delete" tone="danger" hint="Trash, 30 days" onClick={() => act(t, "delete")} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Choice({
  icon,
  label,
  hint,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  tone?: "ok" | "danger";
  onClick: () => void;
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
        : "bg-secondary text-muted-foreground hover:text-foreground";
  return (
    <button
      onClick={onClick}
      title={hint}
      className={`flex min-h-9 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${cls}`}
    >
      {icon} {label}
    </button>
  );
}
