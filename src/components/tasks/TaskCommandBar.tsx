import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CornerDownLeft,
  Flag,
  Inbox,
  Sparkles,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { useAddItem } from "@/hooks/useTableData";
import { parseCapture, toRecord } from "@/lib/quickCapture";
import { fmtMinutes } from "@/lib/planning";
import { todayISO } from "@/lib/overdue";
import { usePlanStore } from "@/stores/planStore";
import type { Task } from "@/lib/db";

export default function TaskCommandBar() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const startedAt = useRef<number | null>(null);
  const addItem = useAddItem();
  const { area, bump } = usePlanStore();
  const today = todayISO();

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    const next = { ...parseCapture(text, today), target: "tasks" as const };
    if (!next.area && area !== "all") next.area = area;
    return next;
  }, [text, today, area]);

  const destination = useMemo(() => {
    if (!parsed?.due) return { label: "Inbox", tone: "inbox" };
    if (parsed.dateRole === "deadline") {
      return { label: `Deadline ${parsed.due.slice(5)}`, tone: "deadline" };
    }
    return {
      label: parsed.due === today ? "Plan today" : `Plan ${parsed.due.slice(5)}`,
      tone: "planned",
    };
  }, [parsed, today]);

  const save = async (mode: "auto" | "today") => {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      let record = toRecord(parsed, today) as Omit<Task, "id">;
      if (mode === "today") {
        record = {
          ...record,
          scheduledAt: today,
          committedOn: today,
          notBefore: undefined,
          reviewAt: record.dueDate || today,
          inbox: false,
          estimateMin: record.estimateMin ?? 30,
          touchedAt: today,
        };
      }
      const id = await addItem<Task>("tasks", record);
      if (!id) {
        toast.error("Duplicate task — already exists");
        return;
      }

      const label =
        mode === "today"
          ? "Planned for today"
          : record.inbox
            ? "Captured to Inbox"
            : record.scheduledAt === today
              ? "Added to Today"
              : record.dueDate
                ? "Task with deadline added"
                : "Task added";

      toast.success(label, { description: record.title.slice(0, 70) });
      if (startedAt.current) bump("captureMsTotal", Date.now() - startedAt.current);
      bump("captures");
      setText("");
      startedAt.current = null;
    } catch (error) {
      toast.error("Task was not added", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mc21-task-capture" aria-label="Fast task capture">
      <div className="mc21-task-capture-main">
        <span className="mc21-task-capture-icon" aria-hidden>
          <CornerDownLeft size={17} />
        </span>
        <input
          value={text}
          onChange={(event) => {
            if (!startedAt.current) startedAt.current = Date.now();
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void save(event.metaKey || event.ctrlKey ? "today" : "auto");
          }}
          placeholder='Capture fast: "Publish SEO audit tomorrow 45m #work important"'
          aria-label="Add a task using natural language"
        />
        <span className="mc21-task-capture-key hidden lg:inline-flex">Enter</span>
        <button
          type="button"
          onClick={() => void save("auto")}
          disabled={!parsed || saving}
          className="mc21-task-capture-add"
        >
          {saving ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => void save("today")}
          disabled={!parsed || saving}
          className="mc21-task-capture-today"
          title="Plan this task for today without changing its deadline"
        >
          <Sparkles size={13} />
          Today
        </button>
      </div>

      <div className="mc21-task-capture-meta">
        {parsed ? (
          <>
            <span className="mc21-task-chip" data-tone={destination.tone}>
              {destination.tone === "inbox" ? (
                <Inbox size={11} />
              ) : (
                <CalendarDays size={11} />
              )}
              {destination.label}
            </span>
            <span className="mc21-task-chip">
              <Timer size={11} />
              {fmtMinutes(parsed.durationMin ?? 30)}
            </span>
            {parsed.priority && (
              <span className="mc21-task-chip" data-tone="priority">
                <Flag size={11} />
                {parsed.priority}
              </span>
            )}
            <span className="mc21-task-chip">
              {parsed.area === "personal" ? "Personal" : "Work"}
            </span>
            {parsed.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="mc21-task-chip">
                #{tag}
              </span>
            ))}
          </>
        ) : (
          <>
            <span>Enter = capture</span>
            <span>Ctrl/⌘ + Enter = plan today</span>
            <span>"by Friday" = deadline</span>
            <span>"Friday" = planned day</span>
            <span>"45m" = estimate</span>
          </>
        )}
      </div>
    </section>
  );
}
