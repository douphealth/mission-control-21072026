// ─── Universal Quick Capture ─────────────────────────────────────────────────
// One input, one router. Any thought goes in; the router decides what it is,
// where it lands, and what its urgency is. Prefixes override; heuristics
// default; nothing is lost (unknown → task, never dropped).

import { todayISO, addDaysLocal, fmtLocal } from "@/lib/overdue";

export type CaptureTarget = "tasks" | "notes" | "ideas" | "links" | "reminders";

export interface ParsedCapture {
  target: CaptureTarget;
  title: string;
  priority?: "critical" | "high" | "medium" | "low";
  /** YYYY-MM-DD planning date. For tasks this never becomes a hard deadline. */
  due?: string;
  /** HH:MM if a time was recognized. */
  time?: string;
  url?: string;
  tags?: string[];
}

const PREFIX: Record<string, CaptureTarget> = {
  ">": "tasks",
  "#": "notes",
  "!": "ideas",
  "@": "reminders",
};

const URL_RE = /https?:\/\/\S+/i;
const PRIORITY_WORDS: Array<[RegExp, ParsedCapture["priority"]]> = [
  [/\b(urgent|asap|critical|now!!?)\b/i, "critical"],
  [/\b(important|high|priority)\b/i, "high"],
  [/\b(someday|maybe|eventually|low)\b/i, "low"],
];

const DAY_WORDS: Array<[RegExp, number]> = [
  [/\btoday\b/i, 0],
  [/\btonight\b/i, 0],
  [/\btomorrow\b/i, 1],
  [/\bday after tomorrow\b/i, 2],
  [/\bnext week\b/i, 7],
  [/\bnext month\b/i, 30],
];

const TIME_RE = /\b(?:at\s+)?(\d{1,2}):(\d{2})\b/;
const WEEKDAY_RE = /\b(?:on\s+)?(mon|tues?|wed|thur?s?|fri|sat|sun)(?:day)?\b/i;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function nextWeekday(word: string, today: string): string | undefined {
  const idx = WEEKDAYS.indexOf(word.slice(0, 3).toLowerCase());
  if (idx < 0) return undefined;
  const d = new Date(`${today}T00:00:00`);
  let delta = (idx - d.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  return addDaysLocal(today, delta);
}

/** The one router. Pure — no I/O, no React, fully unit-testable. */
export function parseCapture(raw: string, today = todayISO()): ParsedCapture {
  let text = raw.trim();

  let target: CaptureTarget | undefined;
  const first = text[0];
  if (first && PREFIX[first]) {
    target = PREFIX[first];
    text = text.slice(1).trim();
  }

  const urlMatch = text.match(URL_RE);

  let priority: ParsedCapture["priority"];
  for (const [re, p] of PRIORITY_WORDS) {
    if (re.test(text)) {
      priority = p;
      break;
    }
  }

  let due: string | undefined;
  for (const [re, delta] of DAY_WORDS) {
    if (re.test(text)) {
      due = addDaysLocal(today, delta);
      break;
    }
  }
  if (!due) {
    const inDays = text.match(/\bin\s+(\d{1,3})\s+days?\b/i);
    if (inDays) due = addDaysLocal(today, Math.min(365, parseInt(inDays[1], 10)));
  }
  if (!due) {
    const wd = text.match(WEEKDAY_RE);
    if (wd) due = nextWeekday(wd[1], today);
  }

  let time: string | undefined;
  const tm = text.match(TIME_RE);
  if (tm) {
    const h = parseInt(tm[1], 10);
    const m = parseInt(tm[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  const tags: string[] = [];
  text = text
    .replace(/(?:^|\s)#([\p{L}\p{N}_-]{2,})/gu, (_m, t: string) => {
      tags.push(t.toLowerCase());
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  const title =
    text
      .replace(/\b(today|tonight|tomorrow|day after tomorrow|next week|next month)\b/gi, " ")
      .replace(/\bin\s+\d{1,3}\s+days?\b/gi, " ")
      .replace(WEEKDAY_RE, " ")
      .replace(TIME_RE, " ")
      .replace(/\b(urgent|asap|critical|important|priority|someday|maybe|eventually)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim() || (urlMatch ? urlMatch[0] : raw.trim());

  if (!target) {
    if (urlMatch && text.replace(URL_RE, "").trim().length === 0) target = "links";
    else if (/\?$/.test(raw.trim())) target = "ideas";
    else target = "tasks";
  }

  const out: ParsedCapture = { target, title };
  if (priority) out.priority = priority;
  if (due) out.due = due;
  if (time) out.time = time;
  if (urlMatch) out.url = urlMatch[0];
  if (tags.length) out.tags = tags;
  if (target === "reminders" && !time) out.time = "09:00";
  return out;
}

/** Field payload for the data store, ready to insert. */
export function toRecord(p: ParsedCapture, today = todayISO()): Record<string, unknown> {
  const nowIso = new Date().toISOString();
  switch (p.target) {
    case "tasks":
      return {
        title: p.title,
        priority: p.priority ?? "medium",
        status: "todo",
        // Natural-language dates are planning intent, not fabricated deadlines.
        // A real dueDate is set explicitly in the task editor.
        dueDate: "",
        scheduledAt: p.due,
        notBefore: p.due && p.due > today ? p.due : undefined,
        reviewAt: p.due,
        startTime: p.time,
        category: "",
        description: p.tags?.join(", ") ?? "",
        linkedProject: "",
        subtasks: [],
        createdAt: nowIso,
        touchedAt: today,
        tags: p.tags,
      };
    case "reminders":
      return {
        title: p.title,
        notes: "",
        remindAt: `${p.due ?? today}T${p.time ?? "09:00"}:00`,
        status: "pending",
        createdAt: nowIso,
      };
    case "notes":
      return {
        title: p.title,
        content: p.tags?.join("\n") ?? "",
        color: "",
        pinned: false,
        tags: p.tags ?? [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    case "ideas":
      return {
        title: p.title,
        description: "",
        status: "exploring",
        tags: p.tags ?? [],
        createdAt: nowIso,
      };
    case "links":
      return {
        title: p.title,
        url: p.url ?? p.title,
        category: p.tags?.[0] ?? "",
        status: "active",
        description: "",
        dateAdded: fmtLocal(new Date()),
        pinned: false,
        tags: p.tags,
      };
  }
}
