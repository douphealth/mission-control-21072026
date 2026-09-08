import { describe, it, expect } from "vitest";
import { computeCapacity, parseDuration, fixedEventsFor, blocksOf } from "@/lib/planning";
import { parseCapture, toRecord } from "@/lib/quickCapture";
import type { Task } from "@/lib/db";

const T = "2026-09-08";
const base = (o: Partial<Task>): Task =>
  ({ id: "t", title: "x", priority: "medium", status: "todo", createdAt: T, ...o }) as Task;

describe("deadline vs. time allocation", () => {
  it("a work block never rewrites the deadline", () => {
    const t = base({ dueDate: "2026-09-12", blocks: [{ id: "b", date: T, start: "09:00", end: "10:00" }] });
    expect(blocksOf(t)[0].date).toBe(T);
    expect(t.dueDate).toBe("2026-09-12");
  });

  it("capacity warns when planned work exceeds the remaining window", () => {
    const cap = computeCapacity({
      tasks: [
        base({ id: "a", estimateMin: 120, blocks: [{ id: "b1", date: T, start: "09:00", end: "11:00" }] }),
        base({ id: "b", estimateMin: 180, scheduledAt: T }),
      ],
      fixed: [{ id: "m", title: "Standup", start: "10:00", end: "11:00", allDay: false }],
      today: T,
      nowHHMM: "09:00",
      workdayStart: "09:00",
      workdayEnd: "13:00",
    });
    expect(cap.availableMin).toBe(180); // 4h window − 1h meeting
    expect(cap.plannedMin).toBe(300);
    expect(cap.overMin).toBe(120);
  });

  it("all-day calendar events do not eat capacity; timed ones do", () => {
    const fixed = fixedEventsFor(
      [
        { id: "1", summary: "Holiday", start: { date: T }, end: { date: "2026-09-09" } },
        {
          id: "2",
          summary: "Call",
          start: { dateTime: `${T}T14:00:00` },
          end: { dateTime: `${T}T15:00:00` },
        },
      ] as never,
      T,
    );
    expect(fixed).toHaveLength(2);
    expect(fixed.find((f) => f.id === "1")?.allDay).toBe(true);
    expect(fixed.find((f) => f.id === "2")).toMatchObject({ start: "14:00", end: "15:00" });
  });
});

describe("capture semantics", () => {
  it("parses durations", () => {
    expect(parseDuration("write brief 45 min")?.minutes).toBe(45);
    expect(parseDuration("deep work 1.5h")?.minutes).toBe(90);
    expect(parseDuration("no time here")).toBeNull();
  });

  it("'by Friday' is a deadline, bare 'Friday' is a scheduled day", () => {
    const dl = parseCapture("Send proposal by Friday 45 min Work", T);
    expect(dl.dateRole).toBe("deadline");
    expect(dl.durationMin).toBe(45);
    expect(dl.area).toBe("work");
    const rec = toRecord(dl, T);
    expect(rec.dueDate).toBeTruthy();
    expect(rec.estimateMin).toBe(45);

    const sch = parseCapture("Send proposal Friday", T);
    expect(sch.dateRole).toBe("scheduled");
    const rec2 = toRecord(sch, T);
    expect(rec2.dueDate).toBeUndefined();
    expect(rec2.scheduledAt).toBeTruthy();
  });

  it("title-only capture lands in the Inbox", () => {
    const rec = toRecord(parseCapture("Think about pricing", T), T);
    expect(rec.inbox).toBe(true);
    expect(rec.dueDate).toBeUndefined();
  });
});
