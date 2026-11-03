import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, Trash2, Clock, Bell, Edit2, RotateCcw, Search, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { useReminders, useAddItem, useUpdateItem, useDeleteItem } from "@/hooks/useTableData";
import type { Reminder } from "@/lib/db";
import {
  localReminderInput,
  nextReminderOccurrence,
  parseReminderInput,
  reminderGroups,
  type ScheduledReminder,
} from "@/lib/reminderSchedule";
import PageHeader from "@/components/PageHeader";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-50";
const input = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";
const emptyDraft = () => ({
  title: "",
  notes: "",
  when: localReminderInput(new Date(Date.now() + 3_600_000).toISOString()),
  recurrence: "none" as NonNullable<Reminder["recurrence"]>,
});

export default function RemindersPage() {
  const reminders = useReminders();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const cd = useConfirmDialog();
  const [draft, setDraft] = useState(emptyDraft);
  const [editor, setEditor] = useState<"new" | Reminder | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"active" | "done" | "all">("active");
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const all = useMemo(() => reminderGroups(reminders, now), [reminders, now]);
  const matching = useMemo(
    () =>
      reminders.filter((row) =>
        `${row.title} ${row.notes || ""}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      ),
    [reminders, query],
  );
  const groups = useMemo(() => reminderGroups(matching, now), [matching, now]);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : "The reminder could not be saved. Try again.";
      setError(message);
      toast.error("Not saved", { description: message });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function edit(row?: Reminder) {
    setError("");
    setDraft(
      row
        ? {
            title: row.title,
            notes: row.notes || "",
            when: localReminderInput(row.remindAt),
            recurrence: row.recurrence || "none",
          }
        : emptyDraft(),
    );
    setEditor(row || "new");
  }

  function save() {
    void run(async () => {
      if (!draft.title.trim()) throw new Error("Enter what you want to be reminded about.");
      const remindAt = parseReminderInput(draft.when);
      const values = {
        title: draft.title.trim(),
        notes: draft.notes.trim(),
        remindAt,
        recurrence: draft.recurrence,
        recurrenceAnchorAt: remindAt,
      };
      if (editor && editor !== "new") {
        const unchangedSchedule =
          editor.remindAt === remindAt && editor.recurrence === draft.recurrence;
        await updateItem<ScheduledReminder>("reminders", editor.id, {
          ...values,
          recurrenceAnchorAt: unchangedSchedule
            ? (editor as ScheduledReminder).recurrenceAnchorAt || remindAt
            : remindAt,
        });
      } else {
        await addItem<ScheduledReminder>("reminders", {
          ...values,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
      setEditor(null);
      toast.success("Reminder saved");
    });
  }

  function complete(row: Reminder) {
    void run(async () => {
      if (row.status === "done") {
        await updateItem<Reminder>("reminders", row.id, { status: "pending" });
        toast.success("Reminder reopened");
      } else if (row.recurrence && row.recurrence !== "none") {
        const remindAt = nextReminderOccurrence(row, new Date());
        await updateItem<ScheduledReminder>("reminders", row.id, {
          remindAt,
          recurrenceAnchorAt: (row as ScheduledReminder).recurrenceAnchorAt || row.remindAt,
          status: "pending",
        });
        toast.success("Occurrence completed", {
          description: `Next reminder: ${new Date(remindAt).toLocaleString()}`,
        });
      } else {
        await updateItem<Reminder>("reminders", row.id, { status: "done" });
        toast.success("Reminder completed");
      }
    });
  }

  function snooze(row: Reminder) {
    void run(async () => {
      await updateItem<ScheduledReminder>("reminders", row.id, {
        remindAt: new Date(Date.now() + 3_600_000).toISOString(),
        recurrenceAnchorAt: (row as ScheduledReminder).recurrenceAnchorAt || row.remindAt,
        status: "pending",
      });
      toast.success("Reminder moved one hour from now");
    });
  }

  function remove(row: Reminder) {
    cd.confirm({
      title: "Delete reminder?",
      description: `Remove “${row.title}” from your reminders.`,
      onConfirm: () =>
        void run(async () => {
          await deleteItem("reminders", row.id);
          toast.success("Reminder deleted");
        }),
    });
  }

  function row(reminder: Reminder, due = false) {
    const valid = Number.isFinite(Date.parse(reminder.remindAt));
    return (
      <article
        key={reminder.id}
        className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-start ${due ? "border-amber-500/40" : "border-border"}`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${due ? "bg-amber-500/10 text-amber-600" : "bg-secondary text-muted-foreground"}`}
        >
          <Bell size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`break-words font-semibold ${reminder.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
          >
            {reminder.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            {valid ? new Date(reminder.remindAt).toLocaleString() : "Invalid date — edit to repair"}
            {reminder.recurrence && reminder.recurrence !== "none" && (
              <span className="inline-flex items-center gap-1 capitalize">
                <Repeat2 size={12} />
                {reminder.recurrence}
              </span>
            )}
          </p>
          {reminder.notes && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {reminder.notes}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            disabled={busy || (!valid && reminder.status !== "done")}
            onClick={() => complete(reminder)}
            className={`${button} text-primary`}
          >
            {reminder.status === "done" ? <RotateCcw size={15} /> : <Check size={15} />}
            {reminder.status === "done" ? "Reopen" : "Complete"}
          </button>
          {reminder.status !== "done" && (
            <button disabled={busy} className={button} onClick={() => snooze(reminder)}>
              <Clock size={15} />
              +1 hour
            </button>
          )}
          <button
            disabled={busy}
            className={button}
            aria-label={`Edit ${reminder.title}`}
            onClick={() => edit(reminder)}
          >
            <Edit2 size={15} />
          </button>
          <button
            disabled={busy}
            className={`${button} text-muted-foreground hover:text-destructive`}
            aria-label={`Delete ${reminder.title}`}
            onClick={() => remove(reminder)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </article>
    );
  }

  const sections = [
    ...(view !== "done"
      ? [
          { title: "Needs a valid date", items: groups.invalid, due: true },
          { title: "Due now", items: groups.due, due: true },
          { title: "Upcoming", items: groups.upcoming, due: false },
        ]
      : []),
    ...(view !== "active" ? [{ title: "Completed", items: groups.done, due: false }] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Bell}
        eyebrow="Operate / Time commitments"
        title="Reminders"
        subtitle="Keep time-sensitive follow-ups in view. Complete, snooze or reschedule without losing the context."
        stats={[
          { label: "Due now", value: all.due.length, tone: "amber" },
          { label: "Upcoming", value: all.upcoming.length },
          { label: "Completed", value: all.done.length },
        ]}
        actions={
          <button className={`${button} bg-primary text-primary-foreground`} onClick={() => edit()}>
            <Plus size={16} />
            New reminder
          </button>
        }
      />
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border px-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            aria-label="Search reminders"
            placeholder="Search reminders and notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {(["active", "done", "all"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`${button} ${view === value ? "bg-primary/10 text-primary border-primary/30" : ""}`}
            >
              {value === "active" ? "Active" : value === "done" ? "Completed" : "All"}
            </button>
          ))}
        </div>
      </section>
      {error && !editor && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {sections.map(
        (section) =>
          section.items.length > 0 && (
            <section key={section.title} className="space-y-3">
              <h2 className="text-sm font-semibold">
                {section.title}
                <span className="ml-2 text-muted-foreground">{section.items.length}</span>
              </h2>
              {section.items.map((item) => row(item, section.due))}
            </section>
          ),
      )}
      {sections.every((section) => !section.items.length) && (
        <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Bell size={28} className="mx-auto text-primary" />
          <h2 className="mt-3 text-lg font-semibold">
            {query
              ? "No matching reminders"
              : view === "done"
                ? "No completed reminders"
                : "Your time commitments, together"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {query
              ? "Try another search or show all reminders."
              : "Add a follow-up, renewal or recurring check. Each item keeps its original note and next due time."}
          </p>
          {!query && view !== "done" && (
            <button className={`${button} mt-4`} onClick={() => edit()}>
              <Plus size={15} />
              Add a reminder
            </button>
          )}
        </section>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Times use this device’s local timezone. This list updates while Mission Control is open; it
        does not guarantee an email or a push notification when the app is closed.
      </p>
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !lock.current) setEditor(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
          <DialogTitle>{editor === "new" ? "New reminder" : "Edit reminder"}</DialogTitle>
          <DialogDescription>
            Set the time in your local timezone. Recurring items advance to their next future
            occurrence when completed.
          </DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <label className="block space-y-1.5 text-sm font-medium">
              Reminder
              <input
                autoFocus
                required
                disabled={busy}
                className={input}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="What needs your attention?"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium">
                Date and time
                <input
                  type="datetime-local"
                  required
                  disabled={busy}
                  className={input}
                  value={draft.when}
                  onChange={(event) => setDraft({ ...draft, when: event.target.value })}
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Repeat
                <select
                  disabled={busy}
                  className={input}
                  value={draft.recurrence}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      recurrence: event.target.value as typeof draft.recurrence,
                    })
                  }
                >
                  {["none", "daily", "weekly", "monthly"].map((value) => (
                    <option key={value} value={value}>
                      {value === "none"
                        ? "Does not repeat"
                        : value[0].toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium">
              Notes
              <textarea
                disabled={busy}
                className={`${input} min-h-24`}
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Add the details you will need later"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => setEditor(null)}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                type="submit"
                className={`${button} bg-primary text-primary-foreground`}
              >
                {busy ? "Saving…" : "Save reminder"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
