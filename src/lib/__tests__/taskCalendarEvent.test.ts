import { afterEach, describe, expect, it } from "vitest";
import { buildTaskEventBody, nextDateISO, type PushableTask } from "@/lib/googleCalendar";

const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const ZONES = [
  "UTC",
  "Europe/Athens",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "Pacific/Auckland",
  "Pacific/Kiritimati",
];

/** The previous implementation, kept here to show exactly what it got wrong. */
function previousNextDateISO(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe("nextDateISO", () => {
  it.each(ZONES)("returns the following calendar day in %s", (zone) => {
    process.env.TZ = zone;
    expect(nextDateISO("2026-10-09")).toBe("2026-10-10");
    expect(nextDateISO("2026-10-31")).toBe("2026-11-01");
    expect(nextDateISO("2026-12-31")).toBe("2027-01-01");
    expect(nextDateISO("2028-02-28")).toBe("2028-02-29"); // leap year
    expect(nextDateISO("2026-03-28")).toBe("2026-03-29"); // around a DST change in Europe
    expect(nextDateISO("2026-03-08")).toBe("2026-03-09"); // around a DST change in the US
  });

  it("the previous version returned the SAME day east of UTC, giving all-day events an empty range", () => {
    process.env.TZ = "Asia/Tokyo";
    expect(previousNextDateISO("2026-10-09")).toBe("2026-10-09");
    expect(nextDateISO("2026-10-09")).toBe("2026-10-10");
  });
});

const task = (over: Partial<PushableTask> = {}): PushableTask => ({
  id: "abc123",
  title: "Ship the report",
  dueDate: "2026-10-12",
  status: "todo",
  ...over,
});
const TODAY = "2026-10-09";

describe("buildTaskEventBody", () => {
  it.each(ZONES)("a one-day task ends the next day in %s, never the same day", (zone) => {
    process.env.TZ = zone;
    const body = buildTaskEventBody(task(), TODAY, null, zone);
    expect(body.start).toEqual({ date: "2026-10-12" });
    expect(body.end).toEqual({ date: "2026-10-13" });
  });

  it("a task with a start and an end date spans the whole range, including the end date", () => {
    const body = buildTaskEventBody(
      task({ startDate: "2026-10-10", dueDate: "2026-10-14" }),
      TODAY,
      null,
      "UTC",
    );
    expect(body.start).toEqual({ date: "2026-10-10" });
    expect(body.end).toEqual({ date: "2026-10-15" }); // all-day end is exclusive
  });

  it("ignores an end date that is before the start", () => {
    const body = buildTaskEventBody(
      task({ startDate: "2026-10-14", dueDate: "2026-10-10" }),
      TODAY,
      null,
      "UTC",
    );
    expect(body.start).toEqual({ date: "2026-10-14" });
    expect(body.end).toEqual({ date: "2026-10-15" });
  });

  it("an undated task lands on today", () => {
    const body = buildTaskEventBody(task({ dueDate: undefined }), TODAY, null, "UTC");
    expect(body.start).toEqual({ date: TODAY });
  });

  it("a task with a start time becomes a timed event on its date", () => {
    const body = buildTaskEventBody(
      task({ startTime: "14:00", endTime: "15:30" }),
      TODAY,
      null,
      "Europe/Athens",
    );
    expect(body.start).toEqual({ dateTime: "2026-10-12T14:00:00", timeZone: "Europe/Athens" });
    expect(body.end).toEqual({ dateTime: "2026-10-12T15:30:00", timeZone: "Europe/Athens" });
  });

  it("a planned work block sets the time, and the deadline never moves it", () => {
    const body = buildTaskEventBody(
      task({ blocks: [{ date: "2026-10-10", start: "09:00", end: "10:00" }] }),
      TODAY,
      null,
      "UTC",
    );
    expect(body.start).toEqual({ dateTime: "2026-10-10T09:00:00", timeZone: "UTC" });
  });

  it("marks overdue and finished tasks in the title and colour", () => {
    const overdue = buildTaskEventBody(task({ dueDate: "2026-10-05" }), TODAY, null, "UTC");
    expect(overdue.summary).toContain("OVERDUE 4d");
    expect(overdue.colorId).toBe("11");
    const done = buildTaskEventBody(task({ status: "done" }), TODAY, null, "UTC");
    expect(done.summary.startsWith("✅")).toBe(true);
    expect(done.colorId).toBe("10");
  });

  it("is stable: the same task gives the same body, so unchanged events are never rewritten", () => {
    const a = JSON.stringify(buildTaskEventBody(task(), TODAY, null, "UTC"));
    const b = JSON.stringify(buildTaskEventBody(task(), TODAY, null, "UTC"));
    expect(a).toBe(b);
  });

  it("changes when the task changes, so edits are rewritten", () => {
    const a = JSON.stringify(buildTaskEventBody(task(), TODAY, null, "UTC"));
    expect(
      JSON.stringify(buildTaskEventBody(task({ title: "Different" }), TODAY, null, "UTC")),
    ).not.toBe(a);
    expect(
      JSON.stringify(buildTaskEventBody(task({ dueDate: "2026-10-13" }), TODAY, null, "UTC")),
    ).not.toBe(a);
    expect(
      JSON.stringify(buildTaskEventBody(task({ description: "note" }), TODAY, null, "UTC")),
    ).not.toBe(a);
  });
});
