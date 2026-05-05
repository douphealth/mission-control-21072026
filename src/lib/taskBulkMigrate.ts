// One-shot migration: normalize Phase/URGENT tasks to Business + correct priority.
import { db, type Task } from "./db";
import { toast } from "sonner";

const FLAG_KEY = "mc-phase-priority-migration-v1";

export async function runPhasePriorityMigration() {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(FLAG_KEY)) return;

    try {
        const all = await db.tasks.toArray();
        const updates: Task[] = [];

        for (const t of all) {
            const title = (t.title || "").trim();
            let priority: Task["priority"] | null = null;

            if (/^\[URGENT/i.test(title) || /^\[Phase\s*1\]/i.test(title)) priority = "critical";
            else if (/^\[Phase\s*2\]/i.test(title)) priority = "high";
            else if (/^\[Phase\s*3\]/i.test(title)) priority = "medium";

            if (!priority) continue;

            if (t.category !== "Business" || t.priority !== priority) {
                updates.push({ ...t, category: "Business", priority });
            }
        }

        if (updates.length) {
            await db.tasks.bulkPut(updates);
            toast.success(`Updated ${updates.length} Phase/Urgent tasks → Business`);
        }

        localStorage.setItem(FLAG_KEY, new Date().toISOString());
    } catch (e) {
        console.error("Phase priority migration failed:", e);
    }
}
