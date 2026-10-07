// Pure planning functions. Moving work must never rewrite its deadline.
import type { Task, WorkBlock } from "@/lib/db";
import type { GoogleCalendarEvent } from "@/lib/googleCalendar";

export const DEFAULT_ESTIMATE_MIN = 30;
export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function minToHHMM(min: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function fmtMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
/** Explicit blocks, or a legacy block derived without writing to the task. */
export function blocksOf(t: Task): WorkBlock[] {
  if (t.blocks && t.blocks.length) return t.blocks;
  const day = t.scheduledAt || (t.startTime ? t.dueDate : undefined);
  if (!day || !t.startTime) return [];
  const start = t.startTime;
  const end = t.endTime || minToHHMM(hhmmToMin(start) + (t.estimateMin ?? DEFAULT_ESTIMATE_MIN));
  return [{ id: `legacy:${t.id}`, date: day, start, end }];
}
export function blockMinutes(b: WorkBlock): number {
  return Math.max(0, hhmmToMin(b.end) - hhmmToMin(b.start));
}
export function estimateOf(t: Task): number {
  if (t.estimateMin && Number.isFinite(t.estimateMin) && t.estimateMin > 0) return t.estimateMin;
  const blocks = blocksOf(t);
  if (blocks.length) return blocks.reduce((s, b) => s + blockMinutes(b), 0);
  return DEFAULT_ESTIMATE_MIN;
}
export function remainingMinutes(t: Task, today: string): number {
  const todays = blocksOf(t).filter(b => b.date === today && !b.done);
  if (todays.length) return todays.reduce((s, b) => s + blockMinutes(b), 0);
  return estimateOf(t);
}
export function isPlannedToday(t: Task, today: string): boolean {
  return t.committedOn === today || t.scheduledAt === today || blocksOf(t).some(b => b.date === today && !b.done);
}
export interface FixedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
}
/** Google Calendar events intersecting the local day; all-day notes stay separate. */
export function fixedEventsFor(events: GoogleCalendarEvent[], today: string): FixedEvent[] {
  const out: FixedEvent[] = [];
  const dayStart = new Date(`${today}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  for (const ev of events) {
    if (ev.status === "cancelled") continue;
    if (ev.start.date) {
      if (ev.start.date <= today && (ev.end.date ?? ev.start.date) > today) {
        out.push({ id: ev.id, title: ev.summary || "(busy)", start: "00:00", end: "23:59", allDay: true, htmlLink: ev.htmlLink });
      }
      continue;
    }
    if (!ev.start.dateTime) continue;
    const s = new Date(ev.start.dateTime);
    const e = new Date(ev.end.dateTime ?? ev.start.dateTime);
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()) || e <= dayStart || s >= dayEnd || e <= s) continue;
    out.push({
      id: ev.id, title: ev.summary || "(busy)",
      start: s < dayStart ? "00:00" : minToHHMM(s.getHours() * 60 + s.getMinutes()),
      end: e >= dayEnd ? "24:00" : minToHHMM(e.getHours() * 60 + e.getMinutes()),
      allDay: false, htmlLink: ev.htmlLink,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
export interface Capacity {
  availableMin: number;
  plannedMin: number;
  overMin: number;
  fixedMin: number;
  ratio: number;
  items: { task: Task; minutes: number; hasEstimate: boolean }[];
}
export function computeCapacity(input: {
  tasks: Task[]; fixed: FixedEvent[]; today: string; nowHHMM: string; workdayStart: string; workdayEnd: string;
}): Capacity {
  const start = Math.max(hhmmToMin(input.workdayStart), hhmmToMin(input.nowHHMM));
  const end = hhmmToMin(input.workdayEnd);
  const window = Math.max(0, end - start);
  const busy: [number, number][] = [];
  for (const f of input.fixed) {
    if (f.allDay) continue;
    const s = Math.max(start, hhmmToMin(f.start));
    const e = Math.min(end, hhmmToMin(f.end));
    if (e > s) busy.push([s, e]);
  }
  busy.sort((a, b) => a[0] - b[0]);
  let fixedMin = 0, busyEnd = start;
  for (const [s, e] of busy) {
    fixedMin += Math.max(0, e - Math.max(s, busyEnd));
    busyEnd = Math.max(busyEnd, e);
  }
  const items = input.tasks
    .filter(t => t.status !== "done" && !t.archived && !t.deletedAt && isPlannedToday(t, input.today))
    .map(t => ({ task: t, minutes: remainingMinutes(t, input.today), hasEstimate: !!t.estimateMin || blocksOf(t).length > 0 }));
  const plannedMin = items.reduce((s, i) => s + i.minutes, 0);
  const availableMin = Math.max(0, window - fixedMin);
  return { availableMin, plannedMin, overMin: Math.max(0, plannedMin - availableMin), fixedMin,
    ratio: availableMin > 0 ? Math.min(3, plannedMin / availableMin) : plannedMin > 0 ? 3 : 0, items };
}
/** Every suggested task, including the first, must fit the remaining capacity. */
export function suggestOutcomes(
  candidates: { task: Task; score: number; reasons: string[] }[], availableMin: number, max = 3,
): { task: Task; minutes: number; reason: string }[] {
  const out: { task: Task; minutes: number; reason: string }[] = [];
  if (!Number.isFinite(availableMin) || availableMin <= 0 || max <= 0) return out;
  let used = 0;
  for (const c of [...candidates].sort((a, b) => b.score - a.score)) {
    if (out.length >= max) break;
    if (c.task.status === "blocked" || c.task.status === "done" || c.task.archived || c.task.deletedAt) continue;
    const m = estimateOf(c.task);
    if (!Number.isFinite(m) || m <= 0 || used + m > availableMin) continue;
    used += m;
    out.push({ task: c.task, minutes: m, reason: c.reasons[0] ?? "highest in your queue" });
  }
  return out;
}
export function parseDuration(text: string): { minutes: number; match: string } | null {
  const re = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h)(?:\s*(\d{1,2})\s*(?:min(?:ute)?s?|m))?(?=\s|$|,)|(?:^|\s)(\d{1,3})\s*(min(?:ute)?s?|m)(?=\s|$|,)/i;
  const m = text.match(re);
  if (!m) return null;
  if (m[1]) {
    const h = parseFloat(m[1].replace(",", "."));
    const extra = m[3] ? parseInt(m[3], 10) : 0;
    return { minutes: Math.round(h * 60 + extra), match: m[0].trim() };
  }
  return { minutes: parseInt(m[4], 10), match: m[0].trim() };
}
export const DAY_CLOSE_CHOICES = [
  { id: "reschedule", label: "Reschedule", hint: "Plan it for tomorrow — deadline unchanged" },
  { id: "reduce", label: "Reduce scope", hint: "Shrink the estimate or split it" },
  { id: "inbox", label: "Back to Inbox", hint: "Undecided — no date, no guilt" },
  { id: "delete", label: "Delete", hint: "Recoverable from Trash for 30 days" },
] as const;
export type DayCloseChoice = (typeof DAY_CLOSE_CHOICES)[number]["id"];
