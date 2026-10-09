import TaskDialogFrame from "@/components/TaskDialogFrame";
import TaskCommandBar from "@/components/tasks/TaskCommandBar";
import { useTasks, useAddItem, useUpdateItem, useDuplicateItem } from "@/hooks/useTableData";
import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Edit2,
  Trash2,
  GripVertical,
  ChevronDown,
  LayoutGrid,
  List,
  Flag,
  Tag,
  Calendar,
  X,
  Clock,
  ArrowRight,
  Zap,
  Target,
  Flame,
  Filter,
  MoreHorizontal,
  CheckSquare,
  Layers,
  TrendingUp,
  BarChart3,
  Copy,
  Bell,
  Repeat,
  CalendarRange,
  Inbox,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { celebrate, completionMessage } from "@/lib/celebrate";
import { toast } from "sonner";
import type { Task, Subtask } from "@/lib/db";
import { todayISO } from "@/lib/overdue";
import {
  REMINDER_LABELS,
  getReminderLabel,
  requestNotificationPermission,
} from "@/lib/notifications";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { softDeleteTasks } from "@/lib/taskActions";
import { estimateOf, fmtMinutes, isPlannedToday } from "@/lib/planning";
import { useNavigationStore } from "@/stores/navigationStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  {
    id: "todo",
    label: "To Do",
    color: "#6366f1",
    bg: "from-indigo-500/20 to-indigo-600/5",
    icon: Circle,
  },
  {
    id: "in-progress",
    label: "In Progress",
    color: "#f59e0b",
    bg: "from-amber-500/20 to-amber-600/5",
    icon: Zap,
  },
  {
    id: "blocked",
    label: "Blocked",
    color: "#ef4444",
    bg: "from-red-500/20 to-red-600/5",
    icon: AlertTriangle,
  },
  {
    id: "done",
    label: "Done",
    color: "#10b981",
    bg: "from-emerald-500/20 to-emerald-600/5",
    icon: CheckCircle2,
  },
] as const;

type StatusId = (typeof STATUSES)[number]["id"];

const PRIORITIES = [
  {
    id: "critical",
    label: "Critical",
    color: "#ef4444",
    bg: "bg-red-500/15 text-red-400",
    dot: "bg-red-500",
  },
  {
    id: "high",
    label: "High",
    color: "#f97316",
    bg: "bg-orange-500/15 text-orange-400",
    dot: "bg-orange-500",
  },
  {
    id: "medium",
    label: "Medium",
    color: "#3b82f6",
    bg: "bg-blue-500/15 text-blue-400",
    dot: "bg-blue-500",
  },
  {
    id: "low",
    label: "Low",
    color: "#10b981",
    bg: "bg-emerald-500/15 text-emerald-400",
    dot: "bg-emerald-500",
  },
] as const;

const CATEGORIES = ["Private", "Business"];
const today = todayISO();

function getPriority(id: string) {
  return PRIORITIES.find((p) => p.id === id) || PRIORITIES[2];
}
function getStatus(id: string) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0];
}

function isOverdue(t: Task) {
  return t.status !== "done" && !!t.dueDate && t.dueDate < today;
}
function isToday(t: Task) {
  return t.dueDate === today && t.status !== "done";
}

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - new Date(today).getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${diff}d left`;
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

const EMPTY: Omit<Task, "id"> = {
  title: "",
  priority: "medium",
  status: "todo",
  startDate: today,
  dueDate: today,
  category: "Private",
  description: "",
  linkedProject: "",
  subtasks: [],
  createdAt: today,
  reminder: "none",
  reminderFired: false,
  reminders: [],
  remindersFired: [],
};

interface TaskModalProps {
  open: boolean;
  task?: Task | null;
  defaultStatus?: StatusId;
  onClose: () => void;
  onSave: (t: Omit<Task, "id"> & { id?: string }) => Promise<void>;
  onDelete?: (id: string) => void;
}

export function TaskModal({ open, task, defaultStatus, onClose, onSave, onDelete }: TaskModalProps) {
  const [form, setForm] = useState<Omit<Task, "id">>(() =>
    task ? { ...task } : { ...EMPTY, status: defaultStatus || "todo" },
  );
  const [newSub, setNewSub] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const uf = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Reset modal state when the selected task changes.
  useEffect(() => {
    setForm(task ? { ...task } : { ...EMPTY, status: defaultStatus || "todo" });
  }, [task?.id, open, defaultStatus]);

  const addSub = () => {
    if (!newSub.trim()) return;
    uf("subtasks", [
      ...form.subtasks,
      { id: `s-${Date.now()}`, title: newSub.trim(), done: false } as Subtask,
    ]);
    setNewSub("");
  };
  const removeSub = (id: string) =>
    uf(
      "subtasks",
      form.subtasks.filter((s: Subtask) => s.id !== id),
    );
  const toggleSub = (id: string) =>
    uf(
      "subtasks",
      form.subtasks.map((s: Subtask) => (s.id === id ? { ...s, done: !s.done } : s)),
    );
  const updateSub = (id: string, changes: Partial<Subtask>) =>
    uf(
      "subtasks",
      form.subtasks.map((s: Subtask) => (s.id === id ? { ...s, ...changes } : s)),
    );

  const save = async () => {
    if (saveLock.current) return;
    if (!form.title.trim()) { toast.error("Title required"); return; }
    saveLock.current = true;
    setSaving(true);
    try {
      const subtasks = newSub.trim() ? [...form.subtasks, { id: crypto.randomUUID(), title: newSub.trim(), done: false }] : form.subtasks;
      await onSave({ ...form, title: form.title.trim(), subtasks, ...(task?.id ? { id: task.id } : {}) });
      onClose();
    } catch (error) {
      toast.error("Task was not saved", { description: error instanceof Error ? error.message : "The editor has retained your draft." });
    } finally { saveLock.current = false; setSaving(false); }
  };

  const pr = getPriority(form.priority);
  const st = getStatus(form.status);

  return (
    <TaskDialogFrame open={open} title={task ? "Edit task" : "New task"}
      onClose={() => { if (!saveLock.current) onClose(); }} action={
      <button type="button" onClick={() => void save()} disabled={saving || !form.title.trim()}
        className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving..." : task ? "Save changes" : "Create task"}
      </button>
    }>
            {/* Body */}
            <div className="space-y-5 pb-4">
              {/* Title */}
              <textarea
                autoFocus
                rows={2}
                value={form.title}
                onChange={(e) => uf("title", e.target.value)}
                placeholder="Task title..."
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                style={{ overflow: "hidden" }}
                className="w-full text-lg font-semibold bg-transparent text-card-foreground outline-none placeholder:text-muted-foreground/40 resize-none border-b border-border/40 pb-2"
              />

              {/* Description */}
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => uf("description", e.target.value)}
                placeholder="Description (optional)..."
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                style={{ overflow: "hidden" }}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50"
              />

              {/* Status + Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => uf("status", s.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${form.status === s.id ? "ring-2 ring-offset-1 ring-offset-card" : "bg-secondary opacity-60 hover:opacity-100"}`}
                        style={
                          form.status === s.id ? { background: s.color + "22", color: s.color } : {}
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                    Priority
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => uf("priority", p.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${p.bg} ${form.priority === p.id ? "ring-2 ring-offset-1 ring-offset-card" : "opacity-50 hover:opacity-100"}`}
                        style={form.priority === p.id ? {} : {}}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date range + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate || form.dueDate}
                    onChange={(e) => {
                      uf("startDate", e.target.value);
                      // If start > end, push end forward
                      if (e.target.value > form.dueDate) uf("dueDate", e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => {
                      uf("dueDate", e.target.value);
                      // If end < start, pull start back
                      if (form.startDate && e.target.value < form.startDate)
                        uf("startDate", e.target.value);
                    }}
                    min={form.startDate || undefined}
                    className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => uf("category", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none appearance-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Duration indicator */}
              {form.startDate && form.startDate !== form.dueDate && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-xs text-primary">
                  <ArrowRight size={12} />
                  <span className="font-medium">
                    {Math.ceil(
                      (new Date(form.dueDate).getTime() - new Date(form.startDate).getTime()) /
                        86400000,
                    ) + 1}{" "}
                    days
                  </span>
                  <span className="text-primary/60">
                    ({form.startDate} → {form.dueDate})
                  </span>
                </div>
              )}

              {/* Time — syncs to calendar */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => uf("allDay", !(form.allDay !== false))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.allDay !== false ? "bg-primary" : "bg-secondary"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.allDay !== false ? "translate-x-5" : ""}`}
                    />
                  </button>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    All day
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Syncs to Calendar
                  </span>
                </div>
                {form.allDay === false && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={form.startTime || "09:00"}
                        onChange={(e) => uf("startTime", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={form.endTime || "10:00"}
                        onChange={(e) => uf("endTime", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recurrence — Google Calendar style */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                  <Repeat size={12} className="text-primary" /> Repeat
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { key: undefined, label: "None" },
                    { key: "daily", label: "Daily" },
                    { key: "weekdays", label: "Weekdays" },
                    { key: "weekly", label: "Weekly" },
                    { key: "biweekly", label: "Bi-weekly" },
                    { key: "monthly", label: "Monthly" },
                    { key: "yearly", label: "Yearly" },
                    { key: "custom", label: "Custom" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        if (opt.key) {
                          uf("recurring", true);
                          uf("recurringInterval", opt.key);
                        } else {
                          uf("recurring", false);
                          uf("recurringInterval", undefined);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation ${
                        (opt.key === undefined && !form.recurring) ||
                        (form.recurring && form.recurringInterval === opt.key)
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Custom interval */}
                {form.recurring && form.recurringInterval === "custom" && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">Every</span>
                    <input
                      type="number"
                      min="1"
                      value={form.recurringCustomDays || 1}
                      onChange={(e) =>
                        uf("recurringCustomDays", Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-16 px-2 py-1.5 rounded-xl bg-secondary text-foreground text-sm outline-none text-center"
                    />
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                )}
                {/* End condition */}
                {form.recurring && (
                  <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/20">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Ends
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          key: "never",
                          label: "♾️ Never",
                          desc: "Repeats forever (birthdays, etc.)",
                        },
                        { key: "date", label: "📅 On date", desc: "Stops on a specific date" },
                        {
                          key: "count",
                          label: "🔢 After N times",
                          desc: "Stops after N completions",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => uf("recurringEndType", opt.key)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation ${
                            (form.recurringEndType || "never") === opt.key
                              ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                          title={opt.desc}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {(form.recurringEndType || "never") === "date" && (
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarRange size={12} className="text-muted-foreground" />
                        <input
                          type="date"
                          value={form.recurringEndDate || ""}
                          onChange={(e) => uf("recurringEndDate", e.target.value)}
                          min={form.dueDate}
                          className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    )}
                    {form.recurringEndType === "count" && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">After</span>
                        <input
                          type="number"
                          min="1"
                          value={form.recurringEndCount || 10}
                          onChange={(e) =>
                            uf("recurringEndCount", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-16 px-2 py-1.5 rounded-xl bg-secondary text-foreground text-sm outline-none text-center"
                        />
                        <span className="text-xs text-muted-foreground">times</span>
                        {(form.recurringCompletedCount || 0) > 0 && (
                          <span className="text-[10px] text-primary ml-auto">
                            ({form.recurringCompletedCount} done)
                          </span>
                        )}
                      </div>
                    )}
                    {(form.recurringEndType || "never") === "never" && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Perfect for birthdays, anniversaries, recurring meetings
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                  <Bell size={12} className="text-primary" /> Reminders
                </label>
                {/* Existing reminders */}
                <div className="space-y-1.5 mb-2">
                  {(form.reminders || []).map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary text-sm text-foreground"
                    >
                      <Bell size={11} className="text-primary/70 shrink-0" />
                      <span className="flex-1">{getReminderLabel(r)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(form.reminders || [])];
                          next.splice(i, 1);
                          uf("reminders", next);
                          uf(
                            "remindersFired",
                            (form.remindersFired || []).filter((f) => f !== r),
                          );
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Quick-add preset chips — like Google Calendar */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { key: "at-time", label: "At time" },
                    { key: "5min", label: "5 min" },
                    { key: "15min", label: "15 min" },
                    { key: "30min", label: "30 min" },
                    { key: "1hr", label: "1 hour" },
                    { key: "2hr", label: "2 hours" },
                    { key: "1day", label: "1 day" },
                    { key: "custom:2880", label: "2 days" },
                    { key: "custom:4320", label: "3 days" },
                    { key: "custom:10080", label: "1 week" },
                  ]
                    .filter((p) => !(form.reminders || []).includes(p.key))
                    .map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={async () => {
                          uf("reminders", [...(form.reminders || []), preset.key]);
                          uf("remindersFired", []);
                          const granted = await requestNotificationPermission();
                          if (!granted) toast.info("Enable browser notifications for push alerts");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-secondary text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:text-primary transition-colors touch-manipulation"
                      >
                        + {preset.label}
                      </button>
                    ))}
                </div>
                {/* Custom minutes input */}
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    placeholder="Custom minutes..."
                    className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter") return;
                      const mins = parseInt(e.currentTarget.value, 10);
                      if (isNaN(mins) || mins < 1) {
                        toast.error("Enter a valid number");
                        return;
                      }
                      const key = `custom:${mins}`;
                      if ((form.reminders || []).includes(key)) {
                        toast.info("Already added");
                        return;
                      }
                      uf("reminders", [...(form.reminders || []), key]);
                      uf("remindersFired", []);
                      e.currentTarget.value = "";
                      const granted = await requestNotificationPermission();
                      if (!granted) toast.info("Enable browser notifications for push alerts");
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    min before
                  </span>
                </div>
              </div>

              {/* Linked project */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Linked Project
                </label>
                <input
                  value={form.linkedProject}
                  onChange={(e) => uf("linkedProject", e.target.value)}
                  placeholder="Project name..."
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Subtasks */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  Subtasks{" "}
                  {form.subtasks.length > 0 && (
                    <span className="text-primary">
                      ({form.subtasks.filter((s: Subtask) => s.done).length}/{form.subtasks.length})
                    </span>
                  )}
                </label>
                <div className="space-y-1.5 mb-2">
                  {form.subtasks.map((sub: Subtask) => (
                    <div
                      key={sub.id}
                      className="flex items-start gap-2 px-3 py-2 rounded-xl bg-secondary/50 group"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSub(sub.id)}
                        className={`shrink-0 mt-0.5 transition-colors ${sub.done ? "text-emerald-500" : "text-muted-foreground hover:text-primary"}`}
                      >
                        {sub.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm block ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {sub.title}
                        </span>
                        {/* Subtask date/time — inline, minimal */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <input
                            type="date"
                            value={sub.dueDate || ""}
                            onChange={(e) => updateSub(sub.id, { dueDate: e.target.value })}
                            className="px-2 py-0.5 rounded-lg bg-card text-[10px] text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 w-[120px]"
                            title="Subtask date"
                          />
                          <input
                            type="time"
                            value={sub.dueTime || ""}
                            onChange={(e) => updateSub(sub.id, { dueTime: e.target.value })}
                            className="px-2 py-0.5 rounded-lg bg-card text-[10px] text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 w-[85px]"
                            title="Subtask time"
                          />
                          {(sub.dueDate || sub.dueTime) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSub(sub.id, { dueDate: undefined, dueTime: undefined })
                              }
                              className="text-muted-foreground/50 hover:text-destructive text-[9px]"
                            >
                              clear
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSub(sub.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 mt-0.5"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSub();
                      }
                    }}
                    placeholder="Add subtask... (Enter to add)"
                    className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={addSub}
                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

      {task && onDelete && <button type="button" disabled={saving} onClick={async () => {
        try { await onDelete(task.id); onClose(); }
        catch { toast.error("Task could not be moved to Trash"); }
      }} className="mb-4 min-h-11 rounded-xl bg-destructive/10 px-4 text-sm text-destructive">Move to Trash</button>}
    </TaskDialogFrame>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

const KanbanCard = memo(function KanbanCard({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  onToggleSub,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onToggleSub: (subId: string) => void;
  isDragging: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const pr = getPriority(task.priority);
  const overdue = isOverdue(task);
  const todayTask = isToday(task);
  const doneSubs = task.subtasks.filter((s) => s.done).length;
  const subPct = task.subtasks.length ? (doneSubs / task.subtasks.length) * 100 : 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`
        kanban-card group cursor-grab active:cursor-grabbing select-none
        ${overdue ? "!border-red-500/40" : ""}
        ${todayTask ? "!border-amber-500/50" : ""}
        ${task.status === "done" ? "opacity-60" : ""}
        ${isDragging ? "dragging" : ""}
      `}
      style={{
        borderLeft: `3px solid ${pr.color}`,
        boxShadow: overdue
          ? "0 4px 18px -8px hsl(0 74% 55% / 0.4)"
          : todayTask
            ? "0 4px 18px -8px hsl(36 94% 58% / 0.4)"
            : undefined,
      }}
    >
      {/* Card header */}
      <div className="p-3.5 pb-2">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="mt-0.5 shrink-0 transition-colors hover:scale-110"
            style={{ color: task.status === "done" ? "#10b981" : "#6b7280" }}
          >
            {task.status === "done" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </button>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-card-foreground"}`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors touch-manipulation"
              title="Duplicate"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${pr.bg}`}>
            {pr.label}
          </span>
          {task.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">
              {task.category}
            </span>
          )}
          {task.linkedProject && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-medium truncate max-w-[90px]">
              {task.linkedProject}
            </span>
          )}
        </div>

        {/* Subtask progress */}
        {task.subtasks.length > 0 && (
          <div className="mt-2.5">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Layers size={10} />
              <span>
                {doneSubs}/{task.subtasks.length} subtasks
              </span>
              <div className="flex-1 bg-secondary rounded-full h-1 overflow-hidden ml-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${subPct}%`, background: pr.color }}
                />
              </div>
              <ChevronDown
                size={10}
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
            <>
              {expanded && (
                <div className="overflow-hidden mt-1.5 space-y-1">
                  {task.subtasks.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onToggleSub(sub.id)}
                      className="flex items-center gap-1.5 text-[11px] w-full text-left hover:text-foreground transition-colors"
                      style={{ color: sub.done ? "#10b981" : "#9ca3af" }}
                    >
                      {sub.done ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                      <span className={sub.done ? "line-through" : ""}>{sub.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 pb-3 pt-1 border-t border-border/20">
        <div
          className={`flex items-center gap-1 text-[10px] font-semibold ${overdue ? "text-red-400" : todayTask ? "text-amber-400" : "text-muted-foreground"}`}
        >
          <Calendar size={9} />
          {task.dueDate ? `Deadline · ${daysUntil(task.dueDate)}` : "No deadline"}
          {task.allDay === false && task.startTime && (
            <span className="ml-1 text-primary/70 font-medium">
              <Clock size={8} className="inline -mt-0.5 mr-0.5" />
              {task.startTime}
              {task.endTime ? `–${task.endTime}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {((task.reminders && task.reminders.length > 0) ||
            (task.reminder && task.reminder !== "none")) && (
            <span
              title={
                (task.reminders || []).map(getReminderLabel).join(", ") ||
                REMINDER_LABELS[task.reminder || "none"]
              }
            >
              <Bell size={10} className="text-primary/60" />
              {(task.reminders?.length || 0) > 1 && (
                <span className="text-[8px] text-primary/60 ml-0.5">{task.reminders!.length}</span>
              )}
            </span>
          )}
          <GripVertical
            size={12}
            className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors"
          />
        </div>
      </div>
    </div>
  );
});

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  onToggleSub,
  onAddNew,
  onDrop,
  draggingId,
  onCardDragStart,
  onCardDragEnd,
}: {
  status: (typeof STATUSES)[number];
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleSub: (taskId: string, subId: string) => void;
  onAddNew: () => void;
  onDrop: (taskId: string, newStatus: StatusId) => void;
  draggingId: string | null;
  onCardDragStart: (taskId: string) => void;
  onCardDragEnd: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId =
      e.dataTransfer.getData("taskId") || e.dataTransfer.getData("text/plain") || draggingId;
    if (taskId) onDrop(taskId, status.id);
  };

  const Icon = status.icon;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`kanban-col flex-1 min-w-[240px] sm:min-w-[260px] max-w-[320px] flex flex-col snap-start ${dragOver ? "drag-over" : ""}`}
      style={{ ["--col-accent" as string]: status.color }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 rounded-t-[21px]"
        style={{
          background: `linear-gradient(90deg, ${status.color}1f, transparent 70%)`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: status.color,
              boxShadow: `0 0 10px ${status.color}99`,
            }}
          />
          <span className="text-sm font-bold text-foreground font-display tracking-tight">
            {status.label}
          </span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
            style={{ background: `${status.color}1a`, color: status.color }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddNew}
          className="p-1 rounded-lg hover:bg-card/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[120px] rounded-b-[21px] transition-colors ${dragOver ? "bg-primary/3" : "bg-transparent"}`}
      >
        <>
          {tasks.map((t) => (
            <KanbanCard
              key={t.id}
              task={t}
              isDragging={draggingId === t.id}
              onEdit={() => onEdit(t)}
              onDelete={() => onDelete(t.id)}
              onDuplicate={() => onDuplicate(t.id)}
              onToggle={() => onToggle(t.id)}
              onToggleSub={(subId) => onToggleSub(t.id, subId)}
              onDragStart={(e) => {
                onCardDragStart(t.id);
                e.dataTransfer.setData("text/plain", t.id);
                e.dataTransfer.setData("taskId", t.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={onCardDragEnd}
            />
          ))}
        </>
        {tasks.length === 0 && (
          <div
            className={`relative flex flex-col items-center justify-center gap-1 h-24 rounded-xl border-2 border-dashed transition-all duration-200 ${dragOver ? "border-primary/50 text-primary bg-primary/5" : "border-border/30 text-muted-foreground/60"}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: dragOver ? status.color : "currentColor",
                opacity: dragOver ? 1 : 0.35,
                boxShadow: dragOver ? `0 0 10px ${status.color}` : undefined,
              }}
            />
            <p className="text-xs font-semibold">
              {dragOver
                ? "Drop here"
                : tasks.length === 0 && status.id === "done"
                  ? "Nothing done yet"
                  : "Nothing here"}
            </p>
            {!dragOver && <p className="text-[10px] opacity-60">Drag cards or + to add</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

export interface RowActions {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onToggleSub: (sub: string) => void;
  onRename: (title: string) => void;
  onSetDue: (date: string) => void;
  onSetPriority: (p: Task["priority"]) => void;
  onSetStatus: (s: StatusId) => void;
  onPlanToday: () => void;
  onSchedule: (days: number) => void;
  onFocus: () => void;
}

function shiftISO(base: string, days: number) {
  const d = new Date(`${base || today}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const ListRow = memo(function ListRow({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  onToggleSub,
  onRename,
  onSetDue,
  onSetPriority,
  onSetStatus,
  onPlanToday,
  onSchedule,
  onFocus,
  index,
  bulkMode,
  selected,
  onToggleSelect,
}: RowActions & {
  task: Task;
  index: number;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const pr = getPriority(task.priority);
  const st = getStatus(task.status);
  const overdue = isOverdue(task);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [menu, setMenu] = useState<null | "priority" | "status" | "due">(null);
  const doneSubs = task.subtasks.filter((s) => s.done).length;
  const plannedToday = isPlannedToday(task, today);
  const estimate = estimateOf(task);

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== task.title) onRename(v);
    else setDraft(task.title);
  };

  const quickDates: { label: string; date: string }[] = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: shiftISO(today, 1) },
    { label: "+3 days", date: shiftISO(today, 3) },
    { label: "Next week", date: shiftISO(today, 7) },
  ];

  return (
    <div>
      <div
        className={`
        mc21-task-row rounded-2xl border group transition-all
        hover:border-primary/20 hover:bg-secondary/20 hover:shadow-md
        ${task.status === "done" ? "opacity-55" : ""}
        ${overdue ? "border-destructive/30 bg-destructive/5" : "border-border/30 bg-card/60"}
      `}
        style={{ borderLeft: `3px solid ${pr.color}` }}
      >
        {/* Main row */}
        <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5">
          {/* Bulk select checkbox */}
          {bulkMode && (
            <button
              onClick={onToggleSelect}
              className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all touch-manipulation ${selected ? "bg-primary border-primary" : "border-border hover:border-primary/50"}`}
            >
              {selected && <CheckCircle2 size={12} className="text-primary-foreground" />}
            </button>
          )}
          {/* Toggle */}
          <button
            onClick={onToggle}
            title={task.status === "done" ? "Reopen" : "Mark done"}
            className="shrink-0 transition-all hover:scale-110 touch-manipulation p-1"
            style={{
              color:
                task.status === "done" ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
            }}
          >
            {task.status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setDraft(task.title);
                    setEditing(false);
                  }
                }}
                className="w-full text-sm font-semibold bg-secondary/70 rounded-lg px-2 py-1 text-foreground outline-none ring-1 ring-primary/40"
              />
            ) : (
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  onClick={() => {
                    setDraft(task.title);
                    setEditing(true);
                  }}
                  title="Click to rename · double-click for full editor"
                  onDoubleClick={onEdit}
                  role="button"
                  tabIndex={0}
                  className={`text-sm font-semibold truncate cursor-text ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {task.title}
                </span>
              </div>
            )}
            {/* Inline meta / quick controls */}
            <div className="flex items-center gap-1.5 flex-wrap relative">
              {/* Priority quick menu */}
              <button
                onClick={() => setMenu((m) => (m === "priority" ? null : "priority"))}
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${pr.bg} hover:ring-1 hover:ring-primary/30 touch-manipulation`}
              >
                {pr.label}
              </button>
              {/* Status quick menu */}
              <button
                onClick={() => setMenu((m) => (m === "status" ? null : "status"))}
                className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold hover:ring-1 hover:ring-primary/30 touch-manipulation"
                style={{ background: st.color + "22", color: st.color }}
              >
                {st.label}
              </button>
              {/* Due quick menu */}
              <button
                onClick={() => setMenu((m) => (m === "due" ? null : "due"))}
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-1 bg-secondary/70 hover:ring-1 hover:ring-primary/30 touch-manipulation ${overdue ? "text-destructive" : isToday(task) ? "text-warning" : "text-muted-foreground"}`}
              >
                <Calendar size={9} />
                {task.dueDate ? daysUntil(task.dueDate) : "No date"}
              </button>
              {plannedToday ? (
                <span className="mc21-row-plan-chip" data-tone="today">
                  <Calendar size={9} /> Planned today
                </span>
              ) : task.scheduledAt ? (
                <span className="mc21-row-plan-chip">
                  <Calendar size={9} /> Plan {task.scheduledAt.slice(5)}
                </span>
              ) : task.inbox || (!task.dueDate && !task.scheduledAt) ? (
                <span className="mc21-row-plan-chip" data-tone="inbox">
                  <Inbox size={9} /> Inbox
                </span>
              ) : null}
              <span className="mc21-row-estimate">
                <Clock size={9} /> {fmtMinutes(estimate)}
              </span>
              {task.category && (
                <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                  · {task.category}
                </span>
              )}
              {task.linkedProject && (
                <span className="text-[10px] text-primary/60 font-medium truncate max-w-[80px] hidden sm:inline">
                  ↳ {task.linkedProject}
                </span>
              )}

              {menu && (
                <div className="absolute z-30 top-full left-0 mt-1 p-1 rounded-xl bg-card border border-border/60 shadow-xl flex flex-wrap gap-1 max-w-[280px]">
                  {menu === "priority" &&
                    PRIORITIES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSetPriority(p.id as Task["priority"]);
                          setMenu(null);
                        }}
                        className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${p.bg} ${task.priority === p.id ? "ring-1 ring-primary/50" : ""}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  {menu === "status" &&
                    STATUSES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSetStatus(s.id as StatusId);
                          setMenu(null);
                        }}
                        className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${task.status === s.id ? "ring-1 ring-primary/50" : ""}`}
                        style={{ background: s.color + "22", color: s.color }}
                      >
                        {s.label}
                      </button>
                    ))}
                  {menu === "due" && (
                    <>
                      {quickDates.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => {
                            onSetDue(q.date);
                            setMenu(null);
                          }}
                          className="text-[11px] px-2 py-1 rounded-lg font-semibold bg-secondary text-foreground hover:bg-primary/15 hover:text-primary"
                        >
                          {q.label}
                        </button>
                      ))}
                      <input
                        type="date"
                        value={task.dueDate || ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            onSetDue(e.target.value);
                            setMenu(null);
                          }
                        }}
                        className="text-[11px] px-2 py-1 rounded-lg bg-secondary text-foreground outline-none"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subtasks mini */}
          {task.subtasks.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0 bg-secondary px-2 py-1 rounded-lg touch-manipulation"
            >
              <CheckSquare size={10} />
              {doneSubs}/{task.subtasks.length}
              <ChevronDown
                size={9}
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          )}

          {/* Planning shortcuts — moving a plan never rewrites the deadline */}
          {task.status !== "done" && (
            <div className="hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {!plannedToday && (
                <button
                  type="button"
                  onClick={onPlanToday}
                  className="mc21-row-action"
                  title="Plan for today"
                >
                  Today
                </button>
              )}
              <button
                type="button"
                onClick={() => onSchedule(1)}
                className="mc21-row-action"
                title="Plan for tomorrow — deadline unchanged"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => onSchedule(7)}
                className="mc21-row-action"
                title="Plan for next week — deadline unchanged"
              >
                +1w
              </button>
            </div>
          )}

          {/* Actions — always visible on mobile */}
          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            {task.status !== "done" && !plannedToday && (
              <button
                type="button"
                onClick={onPlanToday}
                className="mc21-row-icon-action"
                title="Plan today"
              >
                <Calendar size={13} />
              </button>
            )}
            {task.status !== "done" && task.status !== "blocked" && (
              <button
                type="button"
                onClick={onFocus}
                className="mc21-row-icon-action"
                title="Start focus"
              >
                <Play size={13} />
              </button>
            )}
            <button
              onClick={onDuplicate}
              className="p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation"
              title="Duplicate"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={onEdit}
              className="p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation"
              title="Open editor"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Subtasks expanded */}
        <>
          {expanded && task.subtasks.length > 0 && (
            <div className="overflow-hidden border-t border-border/20 mx-3 sm:mx-4">
              <div className="py-2 space-y-1">
                {task.subtasks.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onToggleSub(sub.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/40 w-full text-left group/sub hover:bg-secondary/70 transition-colors touch-manipulation"
                  >
                    <span
                      style={{
                        color: sub.done ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {sub.done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                    </span>
                    <span
                      className={`text-xs transition-colors ${sub.done ? "line-through text-muted-foreground" : "text-foreground group-hover/sub:text-foreground"}`}
                    >
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      </div>
    </div>
  );
});

// ─── Virtualized List (windowed, only renders visible rows) ──────────────────

export interface TaskListHandlers {
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleSub: (taskId: string, subId: string) => void;
  onToggleSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onSetDue: (id: string, date: string) => void;
  onSetPriority: (id: string, p: Task["priority"]) => void;
  onSetStatus: (id: string, s: StatusId) => void;
  onPlanToday: (id: string) => void;
  onSchedule: (id: string, days: number) => void;
  onFocus: (id: string) => void;
}

function VirtualizedList({
  tasks,
  bulkMode,
  selectedIds,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  onToggleSub,
  onToggleSelect,
  onRename,
  onSetDue,
  onSetPriority,
  onSetStatus,
  onPlanToday,
  onSchedule,
  onFocus,
}: TaskListHandlers & {
  tasks: Task[];
  bulkMode: boolean;
  selectedIds: Set<string>;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 8,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 76,
  });

  const rowProps = (task: Task, i: number) => ({
    task,
    index: i,
    onEdit: () => onEdit(task),
    onDelete: () => onDelete(task.id),
    onDuplicate: () => onDuplicate(task.id),
    onToggle: () => onToggle(task.id),
    onToggleSub: (subId: string) => onToggleSub(task.id, subId),
    onRename: (title: string) => onRename(task.id, title),
    onSetDue: (date: string) => onSetDue(task.id, date),
    onSetPriority: (p: Task["priority"]) => onSetPriority(task.id, p),
    onSetStatus: (s: StatusId) => onSetStatus(task.id, s),
    onPlanToday: () => onPlanToday(task.id),
    onSchedule: (days: number) => onSchedule(task.id, days),
    onFocus: () => onFocus(task.id),
    bulkMode,
    selected: selectedIds.has(task.id),
    onToggleSelect: () => onToggleSelect(task.id),
  });

  // For small lists, skip virtualization overhead
  if (tasks.length <= 30) {
    return (
      <>
        {tasks.map((task, i) => (
          <ListRow key={task.id} {...rowProps(task, i)} />
        ))}
      </>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ maxHeight: "calc(100vh - 280px)", contain: "strict" }}
    >
      <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
        {items.map((v) => {
          const task = tasks[v.index];
          return (
            <div
              key={task.id}
              data-index={v.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${v.start}px)`,
                paddingBottom: 6,
              }}
            >
              <ListRow {...rowProps(task, v.index)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const tasks = useTasks();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const duplicateItem = useDuplicateItem();
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const setFocusTaskId = useNavigationStore((state) => state.setFocusTaskId);

  const [view, setView] = useState<"kanban" | "list">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [modal, setModal] = useState<{
    open: boolean;
    task?: Task | null;
    defaultStatus?: StatusId;
  }>({ open: false });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"smart" | "priority" | "dueDate" | "created">("smart");
  const [grouped, setGrouped] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(["done"]));
  const [preset, setPreset] = useState<
    "inbox" | "today" | "upcoming" | "important" | "all" | "done"
  >("today");
  const [showFilters, setShowFilters] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);
  const exitBulk = useCallback(() => {
    setBulkMode(false);
    setSelectedIds(new Set());
  }, []);

  // Task metadata is never rewritten implicitly on page load.
  // Priority/category changes must be explicit user actions.

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = tasks.filter((task) => task.status !== "done" && !task.archived);
    const inbox = active.filter(
      (task) =>
        task.inbox ||
        (!task.dueDate &&
          !task.scheduledAt &&
          !task.committedOn &&
          !(task.blocks && task.blocks.some((block) => !block.done))),
    ).length;
    const todayTask = active.filter(
      (task) => isOverdue(task) || task.dueDate === today || isPlannedToday(task, today),
    ).length;
    const upcoming = active.filter((task) => {
      const next = task.scheduledAt || task.dueDate;
      return !!next && next > today;
    }).length;
    const important = active.filter(
      (task) => task.priority === "critical" || task.priority === "high",
    ).length;
    const doneToday = tasks.filter(
      (task) => task.status === "done" && (task.completedAt || "").slice(0, 10) === today,
    ).length;

    return {
      total: tasks.length,
      open: active.length,
      done: tasks.filter((task) => task.status === "done").length,
      overdue: active.filter(isOverdue).length,
      todayTask,
      inbox,
      upcoming,
      important,
      doneToday,
      critical: active.filter((task) => task.priority === "critical").length,
      blocked: active.filter((task) => task.status === "blocked").length,
    };
  }, [tasks]);

  // ── Filtered + sorted ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const PORD: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const smartRank = (task: Task) => {
      if (task.status === "done") return 100;
      if (isOverdue(task)) return 0;
      if (isPlannedToday(task, today)) return 1;
      if (task.dueDate === today) return 2;
      if (task.priority === "critical") return 3;
      if (task.priority === "high") return 4;
      if (task.status === "blocked") return 7;
      return 5;
    };

    return tasks
      .filter((task) => task.archived !== true)
      .filter((task) => filterStatus === "all" || task.status === filterStatus)
      .filter((task) => filterPriority === "all" || task.priority === filterPriority)
      .filter((task) => filterCategory === "all" || task.category === filterCategory)
      .filter(
        (task) =>
          !search ||
          task.title.toLowerCase().includes(search.toLowerCase()) ||
          task.description?.toLowerCase().includes(search.toLowerCase()) ||
          task.linkedProject?.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        if (sortBy === "smart") {
          const rank = smartRank(a) - smartRank(b);
          if (rank) return rank;
          const priority = (PORD[a.priority] ?? 3) - (PORD[b.priority] ?? 3);
          if (priority) return priority;
          return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
        }
        if (sortBy === "priority") {
          if (a.status === "done" && b.status !== "done") return 1;
          if (a.status !== "done" && b.status === "done") return -1;
          return (PORD[a.priority] ?? 3) - (PORD[b.priority] ?? 3);
        }
        if (sortBy === "dueDate") {
          return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [tasks, filterStatus, filterPriority, filterCategory, search, sortBy]);

  // Smart views shape the list without changing task data.
  const listTasks = useMemo(() => {
    return filtered.filter((task) => {
      const open = task.status !== "done";
      const inbox =
        task.inbox ||
        (!task.dueDate &&
          !task.scheduledAt &&
          !task.committedOn &&
          !(task.blocks && task.blocks.some((block) => !block.done)));
      const plannedToday = isPlannedToday(task, today);
      const overdue = isOverdue(task);
      const next = task.scheduledAt || task.dueDate;

      switch (preset) {
        case "inbox":
          return open && inbox;
        case "today":
          return open && (overdue || task.dueDate === today || plannedToday);
        case "upcoming":
          return open && !!next && next > today;
        case "important":
          return open && (task.priority === "critical" || task.priority === "high");
        case "all":
          return open;
        case "done":
          return task.status === "done";
        default:
          return open;
      }
    });
  }, [filtered, preset]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], "in-progress": [], blocked: [], done: [] };
    filtered.forEach((t) => {
      (map[t.status] = map[t.status] || []).push(t);
    });
    return map;
  }, [filtered]);

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (t: Omit<Task, "id"> & { id?: string }) => {
      if (t.id) {
        const { id, ...rest } = t;
        await updateItem<Task>("tasks", id, rest);
        toast.success("Task updated ✓");
      } else {
        const newId = await addItem<Task>("tasks", { ...t, createdAt: today } as Omit<Task, "id">);
        if (newId) toast.success("Task created ✓");
        else toast.error("Duplicate task — already exists");
      }
    },
    [addItem, updateItem],
  );

  const cd = useConfirmDialog();
  // Deletes are recoverable (Trash, 30 days) — no confirmation needed, Undo is in the toast.
  const handleDelete = useCallback(async (id: string) => {
    await softDeleteTasks([id]);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await softDeleteTasks(ids);
    exitBulk();
  }, [selectedIds, exitBulk]);

  const handleDuplicate = useCallback(
    async (id: string) => {
      const newId = await duplicateItem("tasks", id, { status: "todo", completedAt: undefined });
      if (newId) toast.success("Task duplicated ✓");
    },
    [duplicateItem],
  );

  const handleToggle = useCallback(
    async (id: string) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const next = t.status === "done" ? "todo" : "done";
      await updateItem<Task>("tasks", id, {
        status: next,
        completedAt: next === "done" ? today : undefined,
      });
      if (next === "done") {
        const isPlanned = (x: Task) =>
          x.scheduledAt === today || x.dueDate === today || x.committedOn === today;
        const plannedLeft = isPlanned(t)
          ? tasks.filter((x) => x.id !== id && x.status !== "done" && !x.archived && isPlanned(x))
              .length
          : null;
        const message = completionMessage(plannedLeft);
        celebrate({ count: message.big ? 30 : 14 });
        toast.success(
          message.title,
          message.description ? { description: message.description } : undefined,
        );
      } else {
        toast.success("Reopened");
      }
    },
    [tasks, updateItem],
  );

  const handleToggleSub = useCallback(
    async (taskId: string, subId: string) => {
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return;
      const subtasks = t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
      await updateItem<Task>("tasks", taskId, { subtasks });
    },
    [tasks, updateItem],
  );

  const handleDrop = useCallback(
    async (taskId: string, newStatus: StatusId) => {
      const t = tasks.find((x) => x.id === taskId);
      if (!t || t.status === newStatus) return;
      await updateItem<Task>("tasks", taskId, {
        status: newStatus,
        completedAt: newStatus === "done" ? today : undefined,
      });
      setDraggingId(null);
      const st = getStatus(newStatus);
      toast.success(`Moved to ${st.label}`, { icon: "↪" });
    },
    [tasks, updateItem],
  );

  // ── Inline single-task edits (no modal needed) ────────────────────────────
  const handleRename = useCallback(
    async (id: string, title: string) => {
      await updateItem<Task>("tasks", id, { title });
    },
    [updateItem],
  );

  const handleSetDue = useCallback(
    async (id: string, date: string) => {
      await updateItem<Task>("tasks", id, { dueDate: date });
      toast.success(`Due ${date === today ? "today" : date}`);
    },
    [updateItem],
  );

  const handleSetPriority = useCallback(
    async (id: string, priority: Task["priority"]) => {
      await updateItem<Task>("tasks", id, { priority });
    },
    [updateItem],
  );

  const handleSetStatus = useCallback(
    async (id: string, status: StatusId) => {
      await updateItem<Task>("tasks", id, {
        status,
        completedAt: status === "done" ? today : undefined,
      });
    },
    [updateItem],
  );

  const handlePlanToday = useCallback(
    async (id: string) => {
      await updateItem<Task>("tasks", id, {
        scheduledAt: today,
        committedOn: today,
        notBefore: undefined,
        reviewAt: today,
        inbox: false,
        touchedAt: today,
      });
      toast.success("Planned for today — deadline unchanged");
    },
    [updateItem],
  );

  const handleSchedule = useCallback(
    async (id: string, days: number) => {
      const date = shiftISO(today, days);
      await updateItem<Task>("tasks", id, {
        scheduledAt: date,
        notBefore: date,
        reviewAt: date,
        committedOn: undefined,
        inbox: false,
        touchedAt: today,
      });
      toast.success(`Planned for ${date} — deadline unchanged`);
    },
    [updateItem],
  );

  const handleFocus = useCallback(
    async (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      if (task.status === "blocked") {
        toast.warning("Resolve the blocker before starting focus");
        return;
      }
      await updateItem<Task>("tasks", id, {
        status: "in-progress",
        scheduledAt: today,
        committedOn: today,
        notBefore: undefined,
        inbox: false,
        touchedAt: today,
      });
      setFocusTaskId(id);
      setActiveSection("focus");
    },
    [tasks, updateItem, setFocusTaskId, setActiveSection],
  );

  // ── Bulk quick edits ───────────────────────────────────────────────────────
  const bulkApply = useCallback(
    async (changes: Partial<Task>, label: string) => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      for (const id of ids) await updateItem<Task>("tasks", id, changes);
      toast.success(`${label} · ${ids.length} task${ids.length > 1 ? "s" : ""}`);
      exitBulk();
    },
    [selectedIds, updateItem, exitBulk],
  );

  const selectGroup = useCallback((groupTasks: Task[]) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      groupTasks.forEach((t) => n.add(t.id));
      return n;
    });
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // ── Decision buckets — every task appears in exactly one group ──────────────
  const groups = useMemo(() => {
    const weekEnd = shiftISO(today, 7);
    const bucket = (task: Task) => {
      if (task.status === "done") return "done";
      if (isOverdue(task)) return "overdue";
      if (isPlannedToday(task, today)) return "planned";
      if (task.dueDate === today) return "due";
      const next = task.scheduledAt || task.dueDate;
      if (next && next > today && next <= weekEnd) return "week";
      const inbox =
        task.inbox ||
        (!task.dueDate &&
          !task.scheduledAt &&
          !task.committedOn &&
          !(task.blocks && task.blocks.some((block) => !block.done)));
      if (inbox) return "inbox";
      return "later";
    };

    const defs: Array<{ id: string; label: string; tone: string }> = [
      { id: "overdue", label: "Overdue · decide now", tone: "text-destructive" },
      { id: "planned", label: "Planned today", tone: "text-primary" },
      { id: "due", label: "Deadline today", tone: "text-amber-500" },
      { id: "inbox", label: "Inbox · needs a decision", tone: "text-violet-500" },
      { id: "week", label: "Next 7 days", tone: "text-info" },
      { id: "later", label: "Later", tone: "text-muted-foreground" },
      { id: "done", label: "Completed", tone: "text-emerald-500" },
    ];

    return defs
      .map((definition) => {
        const matching = listTasks.filter((task) => bucket(task) === definition.id);
        return {
          ...definition,
          tasks: collapsedGroups.has(definition.id) ? [] : matching,
          count: matching.length,
        };
      })
      .filter((group) => group.count > 0);
  }, [listTasks, collapsedGroups]);

  const allCategories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tasks]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="mc21-tasks-page space-y-4">
      {/* ── Focused task command center ── */}
      <header className="mc21-tasks-head">
        <div className="min-w-0">
          <div className="mc21-tasks-eyebrow">
            <Target size={13} />
            Execution system
          </div>
          <h1>Tasks</h1>
          <p>Capture once. Decide deliberately. Plan realistically. Execute without hunting.</p>
        </div>
        <button
          onClick={() => setModal({ open: true, task: null })}
          className="mc21-new-task"
        >
          <Plus size={15} />
          New task
        </button>
      </header>

      <TaskCommandBar />

      <nav className="mc21-task-smartviews" aria-label="Task views">
        {(
          [
            { id: "inbox", label: "Inbox", count: stats.inbox, icon: Inbox, tone: "violet" },
            { id: "today", label: "Today", count: stats.todayTask, icon: Calendar, tone: "mint" },
            {
              id: "upcoming",
              label: "Upcoming",
              count: stats.upcoming,
              icon: CalendarRange,
              tone: "sky",
            },
            {
              id: "important",
              label: "Important",
              count: stats.important,
              icon: Flag,
              tone: "amber",
            },
            { id: "all", label: "All open", count: stats.open, icon: Layers, tone: "neutral" },
            {
              id: "done",
              label: "Done today",
              count: stats.doneToday,
              icon: CheckCircle2,
              tone: "success",
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreset(item.id)}
            className="mc21-smartview"
            data-active={preset === item.id ? "true" : "false"}
            data-tone={item.tone}
          >
            <span className="mc21-smartview-icon">
              <item.icon size={15} />
            </span>
            <span className="mc21-smartview-copy">
              <strong>{item.label}</strong>
              <small>
                {item.id === "done"
                  ? `${item.count} completed`
                  : `${item.count} ${item.count === 1 ? "task" : "tasks"}`}
              </small>
            </span>
            {item.id === "today" && stats.overdue > 0 && (
              <span className="mc21-smartview-alert">{stats.overdue} overdue</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Search + progressive filters ── */}
      <section className="mc21-task-toolbar">
        <label className="mc21-task-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, notes, project…"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </label>

        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          className="mc21-toolbar-button"
          data-active={showFilters ? "true" : "false"}
        >
          <SlidersHorizontal size={13} />
          Filters
        </button>

        <div className="mc21-view-toggle" aria-label="Task layout">
          <button
            type="button"
            onClick={() => setView("list")}
            data-active={view === "list" ? "true" : "false"}
            title="List"
          >
            <List size={14} />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setView("kanban")}
            data-active={view === "kanban" ? "true" : "false"}
            title="Board"
          >
            <LayoutGrid size={14} />
            <span>Board</span>
          </button>
        </div>
      </section>

      {showFilters && (
        <section className="mc21-task-filters" aria-label="Advanced task filters">
          <div className="mc21-filter-status">
            {["all", ...STATUSES.map((status) => status.id)].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                data-active={filterStatus === status ? "true" : "false"}
              >
                {status === "all" ? "Any status" : getStatus(status).label}
              </button>
            ))}
          </div>

          <select
            value={filterPriority}
            onChange={(event) => setFilterPriority(event.target.value)}
            aria-label="Priority"
          >
            <option value="all">Any priority</option>
            {PRIORITIES.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.label}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            aria-label="Category"
          >
            <option value="all">Any category</option>
            {allCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            aria-label="Sort tasks"
          >
            <option value="smart">Smart order</option>
            <option value="priority">Priority</option>
            <option value="dueDate">Deadline</option>
            <option value="created">Newest</option>
          </select>
        </section>
      )}

      {/* ── Kanban Board ── */}
      {view === "kanban" && (
        <div
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{ minHeight: 400 }}
        >
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus[status.id] || []}
              onEdit={(t) => setModal({ open: true, task: t })}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggle={handleToggle}
              onToggleSub={handleToggleSub}
              onAddNew={() => setModal({ open: true, task: null, defaultStatus: status.id })}
              onDrop={handleDrop}
              draggingId={draggingId}
              onCardDragStart={setDraggingId}
              onCardDragEnd={() => setDraggingId(null)}
            />
          ))}
        </div>
      )}

      {/* ── List View ── */}
      {view === "list" && (
        <div className="space-y-1.5">
          {/* List controls */}
          <div className="mc21-list-head">
            <div className="mc21-list-summary">
              <strong>{listTasks.length}</strong>
              <span>
                {
                  (
                    {
                      inbox: "Inbox",
                      today: "Today",
                      upcoming: "Upcoming",
                      important: "Important",
                      all: "All open",
                      done: "Completed",
                    } as const
                  )[preset]
                }
              </span>
            </div>
            <div className="mc21-list-actions">
              <button
                type="button"
                onClick={() => setGrouped((value) => !value)}
                data-active={grouped ? "true" : "false"}
              >
                <Layers size={12} />
                Group
              </button>
              <button
                type="button"
                onClick={() => (bulkMode ? exitBulk() : setBulkMode(true))}
                data-active={bulkMode ? "true" : "false"}
              >
                <CheckSquare size={12} />
                {bulkMode ? "Cancel select" : "Select"}
              </button>
            </div>
          </div>

          {/* Bulk action toolbar */}
          {bulkMode && (
            <div className="mc21-bulkbar">
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size === listTasks.length) setSelectedIds(new Set());
                  else setSelectedIds(new Set(listTasks.map((task) => task.id)));
                }}
              >
                {selectedIds.size === listTasks.length && listTasks.length > 0
                  ? "Deselect all"
                  : "Select all"}
              </button>
              <span>{selectedIds.size} selected</span>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() =>
                  bulkApply(
                    {
                      scheduledAt: today,
                      committedOn: today,
                      notBefore: undefined,
                      reviewAt: today,
                      inbox: false,
                      touchedAt: today,
                    },
                    "Planned today",
                  )
                }
              >
                <Calendar size={12} />
                Plan today
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  const nextWeek = shiftISO(today, 7);
                  void bulkApply(
                    {
                      scheduledAt: nextWeek,
                      notBefore: nextWeek,
                      reviewAt: nextWeek,
                      committedOn: undefined,
                      inbox: false,
                      touchedAt: today,
                    },
                    "Planned next week",
                  );
                }}
              >
                +1 week
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => bulkApply({ status: "done", completedAt: today }, "Completed")}
              >
                <CheckCircle2 size={12} />
                Done
              </button>
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value) {
                    void bulkApply(
                      { priority: event.target.value as Task["priority"] },
                      "Priority updated",
                    );
                  }
                }}
                disabled={selectedIds.size === 0}
              >
                <option value="">Priority…</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="mc21-bulk-delete"
              >
                <Trash2 size={12} />
                Trash
              </button>
            </div>
          )}

          {(() => {
            const listHandlers = {
              bulkMode,
              selectedIds,
              onEdit: (t: Task) => setModal({ open: true, task: t }),
              onDelete: handleDelete,
              onDuplicate: handleDuplicate,
              onToggle: handleToggle,
              onToggleSub: handleToggleSub,
              onToggleSelect: toggleSelect,
              onRename: handleRename,
              onSetDue: handleSetDue,
              onSetPriority: handleSetPriority,
              onSetStatus: handleSetStatus,
              onPlanToday: handlePlanToday,
              onSchedule: handleSchedule,
              onFocus: handleFocus,
            };
            if (!grouped) return <VirtualizedList tasks={listTasks} {...listHandlers} />;
            return (
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g.id} className="space-y-1.5">
                    <button
                      onClick={() => toggleGroup(g.id)}
                      className="w-full flex items-center gap-2 px-1 py-1 text-left touch-manipulation"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-muted-foreground transition-transform ${collapsedGroups.has(g.id) ? "-rotate-90" : ""}`}
                      />
                      <span className={`text-xs font-bold uppercase tracking-wide ${g.tone}`}>
                        {g.label}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                        {g.count}
                      </span>
                      {bulkMode && g.tasks.length > 0 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            selectGroup(g.tasks);
                          }}
                          className="ml-auto text-[10px] font-semibold text-primary hover:underline"
                        >
                          Select group
                        </span>
                      )}
                    </button>
                    <VirtualizedList tasks={g.tasks} {...listHandlers} />
                  </div>
                ))}
              </div>
            );
          })()}

          {listTasks.length === 0 && (
            <EmptyState
              icon={preset === "today" && stats.inbox > 0 ? Inbox : CheckSquare}
              tone={preset === "today" && stats.inbox > 0 ? "violet" : "accent"}
              title={
                preset === "today" && stats.inbox > 0
                  ? "Today is open. Pick what matters."
                  : "Nothing here. You're clear."
              }
              description={
                preset === "today" && stats.inbox > 0
                  ? `${stats.inbox} task${stats.inbox === 1 ? " is" : "s are"} waiting in your Inbox for a decision. Choose the few that belong in today.`
                  : "Clear the filters, or capture something new to work on."
              }
              action={
                <>
                  {preset === "today" && stats.inbox > 0 && (
                    <button onClick={() => setPreset("inbox")} className="btn-primary text-sm">
                      <Inbox size={13} /> Review Inbox ({stats.inbox})
                    </button>
                  )}
                  <button
                    onClick={() => setModal({ open: true, task: null })}
                    className={
                      preset === "today" && stats.inbox > 0
                        ? "rounded-xl border border-border/60 bg-secondary/50 px-4 py-2 text-sm font-semibold text-foreground"
                        : "btn-primary text-sm"
                    }
                  >
                    <Plus size={13} /> New Task
                  </button>
                </>
              }
            />
          )}
        </div>
      )}

      {/* ── Task Modal ── */}
      <TaskModal
        open={modal.open}
        task={modal.task}
        defaultStatus={modal.defaultStatus}
        onClose={() => setModal({ open: false })}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
