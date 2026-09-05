// Client-side voice transcript classifier.
// This app runs as a Vite SPA, so voice capture classifies the browser transcript
// locally instead of relying on an external Edge Function hop.

import { compressRepeatedPhrases } from "@/lib/speechTranscript";

export interface VoiceCaptureResult {
  transcript: string;
  type: "tasks" | "notes" | "ideas" | "links";
  title: string;
  priority?: "critical" | "high" | "medium" | "low";
  dueDate?: string;
  url?: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/i;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function nextWeekday(base: Date, targetDay: number, forceNextWeek: boolean): Date {
  const next = new Date(base);
  next.setHours(0, 0, 0, 0);
  let delta = (targetDay - next.getDay() + 7) % 7;
  if (delta === 0 || forceNextWeek) delta += 7;
  next.setDate(next.getDate() + delta);
  return next;
}

function extractUrl(transcript: string): string | undefined {
  const match = transcript.match(URL_RE);
  if (!match) return undefined;
  let url = match[1].replace(/[),.;!?]+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function inferType(transcript: string): VoiceCaptureResult["type"] {
  const text = transcript.toLowerCase();
  if (
    extractUrl(transcript) ||
    /\b(link|url|website|web site|webpage|bookmark|article|page|domain)\b/.test(text)
  ) {
    return "links";
  }

  if (
    /^(idea|brainstorm|what if|maybe we should|we could|it would be cool|concept)\b/.test(text) ||
    /\bfeature idea\b/.test(text)
  ) {
    return "ideas";
  }

  if (/^(note|remember|note to self|journal|log)\b/.test(text) || /\bmeeting notes?\b/.test(text)) {
    return "notes";
  }

  if (
    /^(task|todo|to do|remind me to|i need to|need to|don't let me forget to|follow up on|call |email |send |finish |schedule |book |buy |pay )/.test(
      text,
    ) ||
    /\b(today|tomorrow|tonight|next week|by monday|by tuesday|asap|urgent)\b/.test(text)
  ) {
    return "tasks";
  }

  return "notes";
}

function inferPriority(transcript: string): NonNullable<VoiceCaptureResult["priority"]> {
  const text = transcript.toLowerCase();
  if (/\b(critical|emergency|immediately|right away|urgent|asap)\b/.test(text)) return "critical";
  if (/\b(high priority|important|today|tonight|soon|this afternoon|this evening)\b/.test(text))
    return "high";
  if (/\b(low priority|later|someday|whenever|eventually|no rush)\b/.test(text)) return "low";
  return "medium";
}

function inferDueDate(transcript: string): string | undefined {
  const text = transcript.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/\b(today|tonight|this morning|this afternoon|this evening)\b/.test(text)) {
    return formatDate(today);
  }
  if (/\b(tomorrow)\b/.test(text)) {
    return formatDate(addDays(today, 1));
  }
  if (/\b(day after tomorrow)\b/.test(text)) {
    return formatDate(addDays(today, 2));
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
  }

  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const yearRaw = slashMatch[3];
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : today.getFullYear();
    const parsed = new Date(year, Number(slashMatch[1]) - 1, Number(slashMatch[2]));
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
  }

  const monthMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/,
  );
  if (monthMatch) {
    const year = monthMatch[3] ? Number(monthMatch[3]) : today.getFullYear();
    const parsed = new Date(year, MONTH_INDEX[monthMatch[1]], Number(monthMatch[2]));
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
  }

  const weekdayMatch = text.match(
    /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekdayMatch) {
    return formatDate(nextWeekday(today, WEEKDAY_INDEX[weekdayMatch[2]], Boolean(weekdayMatch[1])));
  }

  return undefined;
}

function stripLeadingLabel(transcript: string, type: VoiceCaptureResult["type"]): string {
  const text = normalizeWhitespace(transcript);
  const labelPatterns: Record<VoiceCaptureResult["type"], RegExp> = {
    tasks: /^(task|todo|to do|remind me to|i need to|need to)\s*[:-]?\s*/i,
    notes: /^(note|note to self|remember|journal|log)\s*[:-]?\s*/i,
    ideas: /^(idea|brainstorm|concept|what if)\s*[:-]?\s*/i,
    links: /^(link|url|website|bookmark)\s*[:-]?\s*/i,
  };
  return normalizeWhitespace(text.replace(labelPatterns[type], ""));
}

function buildTitle(transcript: string, type: VoiceCaptureResult["type"]): string {
  const cleaned = stripLeadingLabel(transcript, type) || transcript;
  const firstChunk = cleaned.split(/[.!?\n]/)[0]?.trim() || cleaned;
  const title = firstChunk.length > 80 ? `${firstChunk.slice(0, 77).trimEnd()}…` : firstChunk;
  return title || "Voice capture";
}

export function classifyTranscript(transcript: string): VoiceCaptureResult {
  const cleanedTranscript = compressRepeatedPhrases(normalizeWhitespace(transcript));
  if (!cleanedTranscript) {
    throw new Error("I did not catch any speech to classify.");
  }

  const type = inferType(cleanedTranscript);
  const result: VoiceCaptureResult = {
    transcript: cleanedTranscript,
    type,
    title: buildTitle(cleanedTranscript, type),
  };

  if (type === "tasks") {
    result.priority = inferPriority(cleanedTranscript);
    result.dueDate = inferDueDate(cleanedTranscript) || formatDate(new Date());
  }

  if (type === "links") {
    result.url = extractUrl(cleanedTranscript);
  }

  return result;
}

export async function transcribeAndClassify(args: {
  data: { transcript: string };
}): Promise<VoiceCaptureResult> {
  return classifyTranscript(args.data.transcript);
}
