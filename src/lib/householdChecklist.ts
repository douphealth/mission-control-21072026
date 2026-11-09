import { z } from "zod";
import type { Task } from "@/lib/db";

export const HouseholdInput = z.object({ description: z.string().trim().min(5).max(2000) });
export const HouseholdPlan = z.object({
  title: z.string().trim().min(1).max(160),
  caution: z.string().max(500),
  steps: z.array(z.object({ title: z.string().trim().min(1).max(200), detail: z.string().max(600), priority: z.enum(["high", "medium", "low"]) })).min(1).max(12),
});
export type HouseholdPlanData = z.infer<typeof HouseholdPlan>;
export function householdTask(plan: HouseholdPlanData, owner: string): Task {
  const valid = HouseholdPlan.parse(plan);
  return { id: crypto.randomUUID(), title: valid.title, priority: valid.steps.some(s => s.priority === "high") ? "high" : "medium", status: "todo", dueDate: "", category: "Home", area: "personal", inbox: true, owner: owner.trim(), linkedProject: "", createdAt: new Date().toISOString(), tags: ["household"], description: [valid.caution, ...valid.steps.map((s, i) => `${i + 1}. [${s.priority}] ${s.title}\n${s.detail}`)].filter(Boolean).join("\n\n"), subtasks: valid.steps.map(s => ({ id: crypto.randomUUID(), title: s.title, done: false })) };
}