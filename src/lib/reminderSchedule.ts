import type { Reminder } from "@/lib/db";

export type ScheduledReminder = Reminder & { recurrenceAnchorAt?: string };

export function localReminderInput(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A local date/time must survive round-trip validation (including DST gaps). */
export function parseReminderInput(value: string): string {
  const parsed = new Date(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    localReminderInput(parsed.toISOString()) !== value
  ) {
    throw new Error("Choose a valid local date and time.");
  }
  return parsed.toISOString();
}

/** Preserve local wall-clock time and the original monthly day after short months. */
export function nextReminderOccurrence(reminder: ScheduledReminder, now = new Date()): string {
  const current = new Date(reminder.remindAt);
  const anchor = new Date(reminder.recurrenceAnchorAt || reminder.remindAt);
  if (
    !Number.isFinite(current.getTime()) ||
    !Number.isFinite(anchor.getTime()) ||
    !Number.isFinite(now.getTime())
  ) {
    throw new Error("This reminder has an invalid date. Edit it before completing it.");
  }
  const threshold = Math.max(current.getTime(), now.getTime());
  const next = new Date(anchor);
  if (reminder.recurrence === "monthly") {
    const after = new Date(threshold);
    let offset = Math.max(
      0,
      (after.getFullYear() - anchor.getFullYear()) * 12 + after.getMonth() - anchor.getMonth(),
    );
    do {
      next.setDate(1);
      next.setFullYear(anchor.getFullYear(), anchor.getMonth() + offset, 1);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(anchor.getDate(), lastDay));
      next.setHours(
        anchor.getHours(),
        anchor.getMinutes(),
        anchor.getSeconds(),
        anchor.getMilliseconds(),
      );
      offset += 1;
    } while (next.getTime() <= threshold);
  } else if (reminder.recurrence === "daily" || reminder.recurrence === "weekly") {
    const interval = reminder.recurrence === "weekly" ? 7 : 1;
    // Start close to the answer, then correct for daylight-saving transitions.
    let steps = Math.max(1, Math.floor((threshold - anchor.getTime()) / (interval * 86_400_000)));
    do {
      next.setTime(anchor.getTime());
      next.setDate(anchor.getDate() + steps * interval);
      steps += 1;
    } while (next.getTime() <= threshold);
  } else {
    throw new Error("Choose a recurrence before rescheduling this reminder.");
  }
  return next.toISOString();
}

export function reminderGroups(rows: readonly Reminder[], now: number) {
  const pending = rows.filter((row) => row.status !== "done");
  const valid = pending
    .filter((row) => Number.isFinite(Date.parse(row.remindAt)))
    .sort((a, b) => Date.parse(a.remindAt) - Date.parse(b.remindAt));
  return {
    due: valid.filter((row) => Date.parse(row.remindAt) <= now),
    upcoming: valid.filter((row) => Date.parse(row.remindAt) > now),
    invalid: pending.filter((row) => !Number.isFinite(Date.parse(row.remindAt))),
    done: rows
      .filter((row) => row.status === "done")
      .sort((a, b) => b.remindAt.localeCompare(a.remindAt)),
  };
}
