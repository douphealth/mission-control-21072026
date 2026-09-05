import { describe, expect, it } from "vitest";
import { buildWorkQueue, splitQueue } from "@/lib/workQueue";
import { whyNow } from "@/lib/whyNow";
import type { Task } from "@/lib/db";

const today = "2026-08-31";

function task(over: Partial<Task>): Task {
  return {
    id: over.id ?? "t1",
    title: over.title ?? "Task",
    priority: over.priority ?? "high",
    status: over.status ?? "todo",
    dueDate: over.dueDate ?? today,
    category: "",
    description: "",
    linkedProject: "",
    subtasks: [],
    createdAt: `${today}T08:00:00.000Z`,
    ...over,
  } as Task;
}

describe("planning semantics", () => {
  it("notBefore defers an item without touching its deadline", () => {
    const t = task({ dueDate: today, notBefore: "2026-09-05", scheduledAt: "2026-09-05" });
    const [item] = buildWorkQueue({ tasks: [t], today });
    expect(item.due).toBe(today);
    expect(item.bucket).toBe("later");
    expect(item.scheduled).toBe("2026-09-05");
  });

  it("surfaces an undated task when its planned day arrives", () => {
    const t = task({ id: "planned-today", dueDate: "", scheduledAt: today, notBefore: today });
    const [item] = buildWorkQueue({ tasks: [t], today });
    expect(item.due).toBeUndefined();
    expect(item.bucket).toBe("today");
    expect(whyNow(item, today)).toContain("planned for today");
  });

  it("resurfaces a missed planned task instead of silently hiding it", () => {
    const t = task({ id: "missed-plan", dueDate: "", scheduledAt: "2026-08-29" });
    const [item] = buildWorkQueue({ tasks: [t], today });
    expect(item.bucket).toBe("today");
    expect(whyNow(item, today).join(" ")).toContain("planned 2 days ago");
    expect(item.overdueDays).toBe(0); // missed plan is not a missed deadline
  });

  it("keeps future planned work out of Today", () => {
    const t = task({
      id: "future-plan",
      dueDate: "",
      scheduledAt: "2026-09-05",
      notBefore: "2026-09-05",
    });
    const [item] = buildWorkQueue({ tasks: [t], today });
    expect(item.bucket).toBe("later");
  });

  it("a future notBefore gate wins over an old planned date unless explicitly committed", () => {
    const deferred = task({
      id: "deferred",
      dueDate: "",
      scheduledAt: "2026-08-29",
      notBefore: "2026-09-05",
    });
    const committed = task({ ...deferred, id: "committed", committedOn: today });
    const items = buildWorkQueue({ tasks: [deferred, committed], today });
    expect(items.find((i) => i.refId === "deferred")?.bucket).toBe("later");
    expect(items.find((i) => i.refId === "committed")?.bucket).toBe("today");
  });

  it("committedOn pins a task into today", () => {
    const t = task({ id: "t2", dueDate: "2026-12-01", committedOn: today });
    const [item] = buildWorkQueue({ tasks: [t], today });
    expect(item.bucket).toBe("today");
  });

  it("today keeps at most three commitments plus one Now", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task({ id: `t${i}`, dueDate: today }));
    const q = splitQueue(buildWorkQueue({ tasks, today }));
    expect(q.now).toBeDefined();
    expect(q.today.slice(0, 3).length).toBe(3);
  });

  it("explains why now in human words, never a raw score", () => {
    const t = task({ dueDate: "2026-08-28", priority: "critical" });
    const [item] = buildWorkQueue({ tasks: [t], today });
    const reasons = whyNow(item, today).join(" ");
    expect(reasons).toContain("overdue");
    expect(reasons).not.toMatch(/score/i);
  });
});
