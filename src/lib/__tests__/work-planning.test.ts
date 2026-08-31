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
    expect(item.due).toBe(today); // real deadline unchanged
    expect(item.bucket).toBe("later"); // planned out of today
    expect(item.scheduled).toBe("2026-09-05");
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
