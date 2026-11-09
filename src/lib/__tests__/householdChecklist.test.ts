import { describe, it, expect } from "vitest";
import { HouseholdInput, HouseholdPlan, householdTask } from "../householdChecklist";
describe("household checklist", () => {
  const plan = { title: "Prepare guest room", caution: "", steps: [{ title: "Clear floor", detail: "Remove trip hazards", priority: "high" as const }, { title: "Change sheets", detail: "Use clean linen", priority: "medium" as const }] };
  it("saves prioritized suggestions as a personal checklist without invented deadlines", () => {
    const task = householdTask(plan, "Alexandra");
    expect(task.area).toBe("personal"); expect(task.priority).toBe("high"); expect(task.owner).toBe("Alexandra"); expect(task.dueDate).toBe(""); expect(task.subtasks.map(s => s.title)).toEqual(["Clear floor", "Change sheets"]); expect(task.subtasks.every(s => !s.done)).toBe(true);
  });
  it("rejects empty checklist rather than saving an incomplete task", () => { expect(HouseholdPlan.safeParse({ ...plan, steps: [] }).success).toBe(false); });
  it("requires a household description", () => { expect(HouseholdInput.safeParse({ description: " " }).success).toBe(false); });
});