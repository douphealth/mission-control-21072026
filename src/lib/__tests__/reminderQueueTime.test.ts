import { afterEach, describe, expect, it, vi } from "vitest";
import { buildWorkQueue } from "../workQueue";
import type { Reminder } from "../db";
afterEach(() => vi.unstubAllEnvs());

describe("Reminder times in the daily work queue", () => {
  it("uses the local calendar day and wall-clock time instead of the UTC string date", () => {
    vi.stubEnv("TZ", "Europe/Athens");
    const row: Reminder = {
      id: "r",
      title: "Late follow-up",
      remindAt: "2026-11-03T22:30:00Z",
      status: "pending",
      createdAt: "2026-11-01",
    };
    const [item] = buildWorkQueue({ tasks: [], reminders: [row], today: "2026-11-04" });
    expect(item.due).toBe("2026-11-04");
    expect(item.time).toBe("00:30");
    expect(item.overdueDays).toBe(0);
    expect(item.bucket).toBe("today");
  });
  it("keeps snoozed reminders discoverable and invalid dates out of the timeline", () => {
    const valid: Reminder = {
      id: "r",
      title: "Snoozed",
      remindAt: new Date(2026, 10, 4, 9).toISOString(),
      status: "snoozed",
      createdAt: "2026-11-01",
    };
    const rows = buildWorkQueue({
      tasks: [],
      reminders: [
        valid,
        { ...valid, id: "invalid", remindAt: "bad" },
        { ...valid, id: "done", status: "done" },
      ],
      today: "2026-11-04",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].refId).toBe("r");
  });
});
