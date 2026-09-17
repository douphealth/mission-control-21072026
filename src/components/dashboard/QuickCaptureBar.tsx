// ─── QuickCaptureBar — the universal front door ───────────────────────────────
// One input with live-parsed chips. Editorial surface with focus glow.
// Press N anywhere to focus it.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  CircleCheck as CheckCircle2,
  Clock,
  CornerDownLeft,
  Flag,
  Inbox,
  Lightbulb,
  Link2,
  ListChecks,
  StickyNote,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseCapture,
  toRecord,
  type CaptureTarget,
  type DateRole,
  type ParsedCapture,
} from "@/lib/quickCapture";
import { useAddItem } from "@/hooks/useTableData";
import { usePlanStore } from "@/stores/planStore";
import { fmtMinutes } from "@/lib/planning";
import type { TaskArea } from "@/lib/db";

export const CAPTURE_FOCUS_EVENT = "mc:capture-focus";

const TARGET_META: Record<CaptureTarget, { icon: typeof ListChecks; label: string; tone: string }> =
  {
    tasks: { icon: ListChecks, label: "Task", tone: "text-primary" },
    reminders: { icon: Bell, label: "Reminder", tone: "text-info" },
    notes: { icon: StickyNote, label: "Note", tone: "text-amber-500" },
    ideas: { icon: Lightbulb, label: "Idea", tone: "text-violet-500" },
    links: { icon: Link2, label: "Link", tone: "text-emerald-500" },
  };

type Overrides = Partial<
  Pick<ParsedCapture, "due" | "dateRole" | "durationMin" | "area" | "priority" | "target">
>;

export default function QuickCaptureBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [ov, setOv] = useState<Overrides>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number | null>(null);
  const addItem = useAddItem();
  const { area: areaFilter, bump } = usePlanStore();

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    window.addEventListener(CAPTURE_FOCUS_EVENT, focus);
    return () => window.removeEventListener(CAPTURE_FOCUS_EVENT, focus);
  }, []);

  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);
  const preview = useMemo<ParsedCapture | null>(() => {
    if (!parsed) return null;
    const merged: ParsedCapture = { ...parsed, ...ov };
    if (!merged.area && areaFilter !== "all") merged.area = areaFilter;
    if (merged.due && !merged.dateRole) merged.dateRole = "scheduled";
    if (ov.due === ("" as never)) {
      delete merged.due;
      delete merged.dateRole;
      delete merged.dateText;
    }
    return merged;
  }, [parsed, ov, areaFilter]);
  const meta = preview ? TARGET_META[preview.target] : null;

  const reset = () => {
    setText("");
    setOv({});
    startedAt.current = null;
  };

  const save = async () => {
    if (!preview || saving) return;
    setSaving(true);
    try {
      await addItem(preview.target, toRecord(preview) as never);
      const isInbox = preview.target === "tasks" && !preview.due;
      toast.success(
        isInbox ? "Captured to Inbox" : `${TARGET_META[preview.target].label} captured`,
        {
          description: preview.title.slice(0, 60),
        },
      );
      if (startedAt.current) bump("captureMsTotal", Date.now() - startedAt.current);
      bump("captures");
      reset();
    } catch (e) {
      toast.error("Capture failed", { description: String((e as Error).message ?? e) });
    } finally {
      setSaving(false);
    }
  };

  const isTask = preview?.target === "tasks";

  return (
    <section className="se-capture p-3 sm:p-4" aria-label="Quick capture">
      <div className="flex items-center gap-3">
        <span className="ultra-capture-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300">
          <CornerDownLeft size={16} />
        </span>
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => {
            if (!startedAt.current) startedAt.current = Date.now();
            setText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") reset();
          }}
          aria-label="Capture a task, note, idea, link or reminder"
          placeholder='What needs doing? e.g. "Send proposal by Friday, 45 min, Work"'
          className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/55"
        />
        <kbd className="hidden rounded-md border border-border/50 bg-secondary/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">
          N
        </kbd>
        <button
          onClick={save}
          disabled={!preview || saving}
          className="se-btn se-btn-primary h-10 px-4 text-[12px] disabled:opacity-40"
        >
          {saving ? (
            "..."
          ) : (
            <>
              <CheckCircle2 size={14} /> Save
            </>
          )}
        </button>
      </div>

      {preview && meta && (
        <div
          className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-0 sm:pl-[52px]"
          role="group"
          aria-label="Interpreted details — click a chip to change it"
        >
          <Chip
            tone={meta.tone}
            icon={<meta.icon size={11} />}
            label={meta.label}
            onClick={() => {
              const order: CaptureTarget[] = ["tasks", "notes", "ideas", "reminders", "links"];
              setOv((o) => ({
                ...o,
                target: order[(order.indexOf(preview.target) + 1) % order.length],
              }));
            }}
            hint="Click to change where this lands"
          />

          {preview.due ? (
            <Chip
              icon={<CalendarDays size={11} />}
              label={`${preview.dateRole === "deadline" ? "Due" : "Plan for"} ${preview.due.slice(5)}`}
              strong={preview.dateRole === "deadline"}
              hint={
                preview.dateRole === "deadline"
                  ? `"${preview.dateText ?? preview.due}" read as a deadline. Click to make it a plan instead.`
                  : `"${preview.dateText ?? preview.due}" read as when you'll work on it — not a deadline. Click to make it the deadline.`
              }
              onClick={() =>
                setOv((o) => ({
                  ...o,
                  dateRole: (preview.dateRole === "deadline"
                    ? "scheduled"
                    : "deadline") as DateRole,
                }))
              }
              onClear={() => setOv((o) => ({ ...o, due: "" as never }))}
            />
          ) : (
            isTask && (
              <Chip
                icon={<Inbox size={11} />}
                label="Inbox · no date"
                hint="Title only. Decide the date later."
              />
            )
          )}

          {preview.time && <Chip icon={<Clock size={11} />} label={preview.time} />}

          {isTask && (
            <Chip
              icon={<Timer size={11} />}
              label={preview.durationMin ? fmtMinutes(preview.durationMin) : "est. 30 min"}
              hint="Click to cycle the estimate"
              onClick={() => {
                const steps = [15, 30, 45, 60, 90, 120];
                const cur = preview.durationMin ?? 30;
                const next = steps[(steps.indexOf(cur) + 1) % steps.length] ?? 30;
                setOv((o) => ({ ...o, durationMin: next }));
              }}
            />
          )}

          {isTask && (
            <Chip
              label={preview.area === "personal" ? "Personal" : "Work"}
              hint="Visibility only — click to switch"
              onClick={() =>
                setOv((o) => ({
                  ...o,
                  area: ((preview.area ?? "work") === "work" ? "personal" : "work") as TaskArea,
                }))
              }
            />
          )}

          {preview.priority && (
            <Chip
              icon={<Flag size={11} />}
              label={preview.priority}
              onClear={() => setOv((o) => ({ ...o, priority: undefined }))}
            />
          )}
        </div>
      )}
    </section>
  );
}

function Chip({
  icon,
  label,
  hint,
  tone,
  strong,
  onClick,
  onClear,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  tone?: string;
  strong?: boolean;
  onClick?: () => void;
  onClear?: () => void;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full border border-border/50 bg-secondary/50 text-[10.5px] font-semibold">
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        title={hint}
        className={`inline-flex items-center gap-1 px-2.5 py-1 ${tone ?? "text-foreground/80"} ${
          strong ? "bg-primary/10 text-primary" : ""
        } ${onClick ? "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" : ""}`}
      >
        {icon} {label}
      </Tag>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${label}`}
          className="px-1.5 py-1 text-muted-foreground hover:text-destructive"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
