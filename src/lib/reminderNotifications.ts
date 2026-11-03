import { db, type Reminder } from "@/lib/db";

/** Normalize the moment so equivalent timestamp spellings represent one occurrence. */
export function reminderNotificationOccurrence(reminder: Reminder): string | null {
  const time = Date.parse(reminder.remindAt);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function shouldNotifyReminder(reminder: Reminder, now: number): boolean {
  if (reminder.status === "done" || !Number.isFinite(now)) return false;
  const occurrence = reminderNotificationOccurrence(reminder);
  return (
    occurrence !== null && Date.parse(occurrence) <= now && reminder.notifiedFor !== occurrence
  );
}

/**
 * IndexedDB read/write transactions serialize across tabs. Claim the saved occurrence
 * before displaying it, without completing the reminder or advancing its recurrence.
 */
export async function claimDueReminder(id: string, now: number): Promise<Reminder | null> {
  return db.transaction("rw", db.reminders, async () => {
    const current = await db.reminders.get(id);
    if (!current || !shouldNotifyReminder(current, now)) return null;
    // A queued transaction may start after the page has moved into the background.
    if (typeof document !== "undefined" && document.hidden) return null;
    const notifiedFor = reminderNotificationOccurrence(current)!;
    const updated = await db.reminders.update(id, { notifiedFor });
    return updated ? { ...current, notifiedFor } : null;
  });
}
