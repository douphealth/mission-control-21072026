import Papa from "papaparse";
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const SCHEDULE_COLORS = ["mint", "violet", "sky", "amber", "rose"] as const;
export type ScheduleRule = { title: string; member: string; weekdays: number[]; startTime: string; endTime: string; fromDate: string; untilDate: string; timezone: string; location: string; notes: string; exceptions: string[]; color: typeof SCHEDULE_COLORS[number]; conditional: boolean };
export function dateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (name: string) => parts.find(part => part.type === name)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value; }
export function addScheduleDays(value: string, days: number): string { if (!validDate(value)) throw new Error("Choose a valid date."); const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
export function scheduleWeek(value: string): string[] { const day = new Date(`${value}T12:00:00Z`).getUTCDay() || 7; return WEEKDAYS.map((_, i) => addScheduleDays(value, i + 1 - day)); }
export function timeMinutes(value: string): number { if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN; const [h, m] = value.split(":").map(Number); return h * 60 + m; }
export function validateSchedule(value: Partial<ScheduleRule>): ScheduleRule {
  const title = String(value.title || "").trim(), member = String(value.member || "").trim();
  if (!title || title.length > 160 || !member || member.length > 80) throw new Error("Enter an activity and family member (up to 160 and 80 characters).");
  const weekdays = [...new Set(Array.isArray(value.weekdays) ? value.weekdays : [])].sort((a, b) => a - b);
  if (!weekdays.length || weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7)) throw new Error("Choose at least one weekday.");
  const startTime = String(value.startTime || ""), endTime = String(value.endTime || "");
  if (!Number.isFinite(timeMinutes(startTime)) || !Number.isFinite(timeMinutes(endTime)) || timeMinutes(endTime) <= timeMinutes(startTime)) throw new Error("Use HH:MM times and an end after the start. Split overnight activities across two days.");
  const fromDate = String(value.fromDate || ""), untilDate = String(value.untilDate || "");
  if (!validDate(fromDate) || !validDate(untilDate) || untilDate < fromDate) throw new Error("Choose a valid first and last date.");
  const timezone = String(value.timezone || "Europe/Athens"); try { dateKey(new Date(), timezone); } catch { throw new Error("Use a valid time zone, such as Europe/Athens."); }
  const exceptions = [...new Set(Array.isArray(value.exceptions) ? value.exceptions : [])].sort();
  if (exceptions.length > 366 || exceptions.some(date => !validDate(date))) throw new Error("Excluded dates must use YYYY-MM-DD (up to 366 dates).");
  return { title, member, weekdays, startTime, endTime, fromDate, untilDate, timezone, location: String(value.location || "").trim().slice(0, 240), notes: String(value.notes || "").slice(0, 5000), exceptions, color: SCHEDULE_COLORS.includes(value.color!) ? value.color! : "mint", conditional: value.conditional === true };
}
export function scheduleOccurs(rule: ScheduleRule, date: string): boolean { return validDate(date) && date >= rule.fromDate && date <= rule.untilDate && !rule.exceptions.includes(date) && rule.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay() || 7); }
export function scheduleOverlaps(a: ScheduleRule, b: ScheduleRule): boolean { return a.member.toLocaleLowerCase() === b.member.toLocaleLowerCase() && a.timezone === b.timezone && timeMinutes(a.startTime) < timeMinutes(b.endTime) && timeMinutes(b.startTime) < timeMinutes(a.endTime); }
export function emptySchedule(today: string, timezone = "Europe/Athens"): ScheduleRule { const year = Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 9 ? 1 : 0); return { title: "", member: "", weekdays: [new Date(`${today}T12:00:00Z`).getUTCDay() || 7], startTime: "17:00", endTime: "18:00", fromDate: `${year}-09-01`, untilDate: `${year + 1}-08-31`, timezone, location: "", notes: "", exceptions: [], color: "mint", conditional: false }; }
const key = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function parseDays(input: string): number[] {
  const greek = ["\u03b4\u03b5\u03c5\u03c4\u03b5\u03c1\u03b1", "\u03c4\u03c1\u03b9\u03c4\u03b7", "\u03c4\u03b5\u03c4\u03b1\u03c1\u03c4\u03b7", "\u03c0\u03b5\u03bc\u03c0\u03c4\u03b7", "\u03c0\u03b1\u03c1\u03b1\u03c3\u03ba\u03b5\u03c5\u03b7", "\u03c3\u03b1\u03b2\u03b2\u03b1\u03c4\u03bf", "\u03ba\u03c5\u03c1\u03b9\u03b1\u03ba\u03b7"];
  return input.split(/[,;|\s]+/).filter(Boolean).map(value => { const token = key(value), index = WEEKDAYS.findIndex((day, i) => [day.toLowerCase(), day.slice(0, 3).toLowerCase(), greek[i]].includes(token)); return index < 0 ? Number(token) : index + 1; });
}
export function parseScheduleImport(input: string, defaults: ScheduleRule) {
  const rows: ScheduleRule[] = [], errors: string[] = [];
  if (!input.trim()) return { rows, errors };
  if (new TextEncoder().encode(input).length > 1_000_000) return { rows, errors: ["Import at most 1 MB."] };
  try {
    let records: Record<string, unknown>[];
    if (/^\s*[\[{]/.test(input)) { const json = JSON.parse(input); records = Array.isArray(json) ? json : json.activities; }
    else {
      const aliases: Record<string, string> = { member: "member", person: "member", name: "member", activity: "title", title: "title", day: "weekdays", days: "weekdays", weekday: "weekdays", weekdays: "weekdays", start: "startTime", starttime: "startTime", end: "endTime", endtime: "endTime", from: "fromDate", fromdate: "fromDate", until: "untilDate", untildate: "untilDate", location: "location", notes: "notes", timezone: "timezone", color: "color", exceptions: "exceptions", conditional: "conditional" };
      const result = Papa.parse<Record<string, string>>(input, { header: true, delimiter: input.split(/\r?\n/)[0].includes("\t") ? "\t" : "", skipEmptyLines: "greedy", transformHeader: name => aliases[key(name)] || name });
      if (result.errors.length) throw new Error("Malformed table. Use the template headings and quote cells containing commas or newlines."); records = result.data;
    }
    if (!Array.isArray(records) || records.length > 300) throw new Error("Import at most 300 activities.");
    records.forEach((record, index) => { try { if (!record || typeof record !== "object") throw new Error("Expected an activity record."); rows.push(validateSchedule({ ...defaults, ...record, weekdays: Array.isArray(record.weekdays) ? record.weekdays.map(Number) : parseDays(String(record.weekdays || "")), exceptions: Array.isArray(record.exceptions) ? record.exceptions.map(String) : String(record.exceptions || "").split(/[,;\s]+/).filter(Boolean), conditional: record.conditional === true || record.conditional === "true" || record.conditional === "yes" })); } catch (e) { errors.push(`Row ${index + 1}: ${e instanceof Error ? e.message : "Invalid activity"}`); } });
  } catch (e) { errors.push(e instanceof Error ? e.message : "Could not read this import."); }
  return { rows, errors };
}
export function scheduleLanes(rows: Array<{ id: string; rule: ScheduleRule }>): Map<string, { lane: number; total: number }> {
  const lanes: Array<{ member: string; end: number }> = [], assigned = new Map<string, { lane: number; total: number }>();
  for (const row of [...rows].sort((a, b) => a.rule.startTime.localeCompare(b.rule.startTime))) { const start = timeMinutes(row.rule.startTime), end = timeMinutes(row.rule.endTime); let lane = lanes.findIndex(slot => slot.member === row.rule.member && slot.end <= start); if (lane < 0) { lane = lanes.length; lanes.push({ member: row.rule.member, end }); } else lanes[lane].end = end; assigned.set(row.id, { lane, total: 0 }); }
  for (const value of assigned.values()) value.total = lanes.length; return assigned;
}
