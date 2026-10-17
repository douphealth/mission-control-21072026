import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { validateSchedule, type ScheduleRule } from "@/lib/familySchedule";
export type SavedSchedule = { id: string; rule: ScheduleRule; archived: boolean };
export function useFamilySchedule(): { rows: SavedSchedule[]; unreadable: number; loading: boolean } {
  const result = useLiveQuery(async () => { const notes = await db.notes.filter(row => row.kind === "family-schedule").toArray(); const rows: SavedSchedule[] = []; let unreadable = 0;
    for (const row of notes) { try { rows.push({ id: row.id, rule: validateSchedule(JSON.parse(row.content)), archived: row.status === "archived" }); } catch { unreadable++; } }
    return { rows, unreadable };
  }, []);
  return result ? { ...result, loading: false } : { rows: [], unreadable: 0, loading: true };
}
