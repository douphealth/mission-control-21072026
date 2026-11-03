import { describe, expect, it } from "vitest";
import type { Task } from "../db";
import { isImportant, quadrantOf, quadrantPlan } from "../triage";
const task = (patch: Partial<Task> = {}): Task => ({
  id: "t",
  title: "Renew service",
  priority: "high",
  status: "todo",
  dueDate: "2026-11-03",
  category: "work",
  description: "",
  linkedProject: "",
  subtasks: [],
  createdAt: "2026-11-01",
  ...patch,
});
describe("Review protects deadlines", () => {
  it("never rewrites a deadline when changing a work plan", () => {
    for (const quadrant of ["do", "schedule", "delegate", "later"] as const) {
      const original = task();
      const patch = quadrantPlan(original, quadrant, "2026-11-03");
      expect(patch).not.toHaveProperty("dueDate");
      expect({ ...original, ...patch }.dueDate).toBe("2026-11-03");
    }
  });
  it("honors an explicit importance decision on a high-priority task", () => {
    expect(isImportant(task({ important: false }))).toBe(false);
    expect(quadrantOf(task({ important: false }), "2026-11-03")).toBe("delegate");
  });
  it("keeps a missed deadline urgent even after work is deferred", () => {
    const original = task();
    expect(
      quadrantOf(
        { ...original, ...quadrantPlan(original, "schedule", "2026-11-03") },
        "2026-11-03",
      ),
    ).toBe("do");
  });
  it("lets undated tasks move between planned quadrants without inventing deadlines", () => {
    const original = task({ dueDate: "" });
    for (const quadrant of ["do", "schedule", "delegate", "later"] as const) {
      expect(
        quadrantOf(
          { ...original, ...quadrantPlan(original, quadrant, "2026-11-03") },
          "2026-11-03",
        ),
      ).toBe(quadrant);
    }
  });
});
