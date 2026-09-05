import { useMemo, useState } from "react";
import { Plus, Check, Trash2, Clock, Bell } from "lucide-react";
import { toast } from "sonner";
import { useReminders, genId } from "@/hooks/useTableData";
import { db, type Reminder } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { CCHeader, EmptyState, Panel, relTime } from "@/components/controlcenter/ui";

const RECURRENCES: NonNullable<Reminder["recurrence"]>[] = ["none", "daily", "weekly", "monthly"];

function nextOccurrence(iso: string, recurrence: Reminder["recurrence"]): string {
  const d = new Date(iso);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RemindersPage() {
  const reminders = useReminders();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(() =>
    toLocalInput(new Date(Date.now() + 3_600_000).toISOString()),
  );
  const [recurrence, setRecurrence] = useState<NonNullable<Reminder["recurrence"]>>("none");

  const { due, upcoming, done } = useMemo(() => {
    const now = Date.now();
    const pending = reminders
      .filter((r) => r.status !== "done")
      .sort((a, b) => a.remindAt.localeCompare(b.remindAt));
    return {
      due: pending.filter((r) => new Date(r.remindAt).getTime() <= now),
      upcoming: pending.filter((r) => new Date(r.remindAt).getTime() > now),
      done: reminders
        .filter((r) => r.status === "done")
        .sort((a, b) => b.remindAt.localeCompare(a.remindAt))
        .slice(0, 20),
    };
  }, [reminders]);

  const add = async () => {
    const clean = title.trim();
    if (!clean || !when) return;
    const record: Reminder = {
      id: genId(),
      title: clean,
      remindAt: new Date(when).toISOString(),
      recurrence,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await db.reminders.put(record);
    markCloudRecordDirty("reminders", record.id);
    queueCloudPush();
    setTitle("");
    toast.success("Reminder set");
  };

  const complete = async (r: Reminder) => {
    if (r.recurrence && r.recurrence !== "none") {
      await db.reminders.update(r.id, {
        remindAt: nextOccurrence(r.remindAt, r.recurrence),
        status: "pending",
      });
      toast.success("Rescheduled", { description: "Recurring reminder moved to its next slot." });
    } else {
      await db.reminders.update(r.id, { status: "done" });
    }
    markCloudRecordDirty("reminders", r.id);
    queueCloudPush();
  };

  const remove = async (id: string) => {
    await db.reminders.delete(id);
    markCloudRecordDirty("reminders", id, "delete");
    queueCloudPush();
  };

  const Row = ({ r, overdue }: { r: Reminder; overdue?: boolean }) => (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        overdue ? "border-rose-500/40 bg-rose-500/5" : "border-border/50 bg-background/40"
      }`}
    >
      <button
        onClick={() => complete(r)}
        className="shrink-0 w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-emerald-500/15 hover:border-emerald-500/40 text-muted-foreground hover:text-emerald-500"
        aria-label="Complete reminder"
      >
        <Check size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${r.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}
        >
          {r.title}
        </p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
          <Clock size={11} /> {new Date(r.remindAt).toLocaleString()} · {relTime(r.remindAt)}
          {r.recurrence && r.recurrence !== "none" && (
            <span className="text-primary">· {r.recurrence}</span>
          )}
        </p>
      </div>
      <button
        onClick={() => remove(r.id)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        aria-label="Delete reminder"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <CCHeader
        title="Reminders"
        subtitle="Time-based nudges that live alongside your tasks — one-off or recurring."
      />

      <Panel>
        <div className="grid gap-2 sm:grid-cols-[1.6fr_auto_auto_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Remind me to…"
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm capitalize"
          >
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </Panel>

      {due.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-rose-500 flex items-center gap-1.5">
            <Bell size={12} /> Due now ({due.length})
          </p>
          {due.map((r) => (
            <Row key={r.id} r={r} overdue />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
            Upcoming ({upcoming.length})
          </p>
          {upcoming.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      )}

      {due.length === 0 && upcoming.length === 0 && (
        <EmptyState
          title="Nothing scheduled"
          hint="Add a reminder above — it syncs to the cloud with the rest of your data."
        />
      )}

      {done.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
            Completed
          </p>
          {done.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
