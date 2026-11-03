import { describe, expect, it } from "vitest";
import {
  localReminderInput,
  nextReminderOccurrence,
  parseReminderInput,
  reminderGroups,
  type ScheduledReminder,
} from "../reminderSchedule";

const reminder = (patch: Partial<ScheduledReminder> = {}): ScheduledReminder => ({
  id: "r",
  title: "Renewal",
  remindAt: new Date(2026, 0, 31, 10, 30).toISOString(),
  recurrence: "monthly",
  status: "pending",
  createdAt: "2026-01-01T10:00:00Z",
  ...patch,
});

describe("Reminder dates and recurrence", () => {
  it("clamps month-end reminders and returns to the original day in March", () => {
    const first = reminder();
    const february = nextReminderOccurrence(first, new Date(2026, 0, 31, 11));
    expect(localReminderInput(february)).toBe("2026-02-28T10:30");
    expect(
      localReminderInput(
        nextReminderOccurrence(
          { ...first, remindAt: february, recurrenceAnchorAt: first.remindAt },
          new Date(2026, 1, 28, 12),
        ),
      ),
    ).toBe("2026-03-31T10:30");
  });
  it("advances missed recurring reminders directly to a future slot", () => {
    const r = reminder({
      recurrence: "daily",
      remindAt: new Date(2026, 0, 1, 8, 15).toISOString(),
    });
    expect(localReminderInput(nextReminderOccurrence(r, new Date(2026, 10, 3, 16)))).toBe(
      "2026-11-04T08:15",
    );
  });
  it("preserves weekly cadence when a reminder was snoozed", () => {
    const r = reminder({
      recurrence: "weekly",
      recurrenceAnchorAt: new Date(2026, 9, 26, 9).toISOString(),
      remindAt: new Date(2026, 10, 3, 16).toISOString(),
    });
    expect(localReminderInput(nextReminderOccurrence(r, new Date(2026, 10, 3, 17)))).toBe(
      "2026-11-09T09:00",
    );
  });
  it("rejects invalid input instead of silently moving impossible dates", () => {
    expect(() => parseReminderInput("2026-02-31T10:30")).toThrow();
    expect(() => parseReminderInput("")).toThrow();
    expect(localReminderInput(parseReminderInput("2026-11-03T16:45"))).toBe("2026-11-03T16:45");
    expect(() => nextReminderOccurrence(reminder({ remindAt: "invalid" }))).toThrow(/invalid date/);
  });
  it("moves items into due at the current time and keeps invalid records recoverable", () => {
    const timestamp = Date.parse("2026-11-03T14:00:00Z");
    const rows = [
      reminder({ remindAt: new Date(timestamp).toISOString() }),
      reminder({ id: "bad", remindAt: "bad" }),
      reminder({ id: "done", status: "done" }),
    ];
    expect(reminderGroups(rows, timestamp - 1).upcoming).toHaveLength(1);
    const grouped = reminderGroups(rows, timestamp);
    expect(grouped.due).toHaveLength(1);
    expect(grouped.invalid.map((row) => row.id)).toEqual(["bad"]);
    expect(grouped.done).toHaveLength(1);
  });
});
