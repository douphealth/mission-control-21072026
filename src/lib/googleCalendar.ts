/** Google Calendar — direct browser → Google API via Google Identity Services.
 * Works on ANY deployment (pages.dev, custom domains, localhost). The user's
 * own OAuth Client ID is configured once (Settings → Google Connection, or
 * VITE_GOOGLE_CLIENT_ID at build time); tokens are issued in-browser. */

import {
  GCAL_SCOPE,
  ensureGoogleToken,
  fetchGoogleEmail,
  getGoogleClientId,
  validGoogleToken,
  type StoredGoogleToken,
} from "@/lib/googleDirectAuth";

const CONFIG_STORAGE_KEY = "mc_gcal_config";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  htmlLink?: string;
  colorId?: string;
  creator?: { email?: string };
  organizer?: { email?: string; displayName?: string };
  attendees?: { email: string; responseStatus?: string }[];
  reminders?: { useDefault: boolean };
  calendarId?: string;
}

export interface GoogleCalendarList {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
}

export interface GCalConfig {
  enabledCalendarIds: string[];
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSync: string | null;
  connectedEmail: string | null;
}

const GCAL_COLORS: Record<string, string> = {
  "1": "#7986CB",
  "2": "#33B679",
  "3": "#8E24AA",
  "4": "#E67C73",
  "5": "#F6BF26",
  "6": "#F4511E",
  "7": "#039BE5",
  "8": "#616161",
  "9": "#3F51B5",
  "10": "#0B8043",
  "11": "#D50000",
};

export function getGCalColor(colorId?: string): string {
  return colorId && GCAL_COLORS[colorId] ? GCAL_COLORS[colorId] : "#039BE5";
}

const DEFAULT_CONFIG: GCalConfig = {
  enabledCalendarIds: [],
  autoSync: true,
  syncIntervalMinutes: 5,
  lastSync: null,
  connectedEmail: null,
};

export function getGCalConfig(): GCalConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setGCalConfig(partial: Partial<GCalConfig>): GCalConfig {
  const updated = { ...getGCalConfig(), ...partial };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearGCalConfig(): void {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

// The app ships with a Google Calendar account already authorized on the
// server. When that is available every calendar read and write goes through
// it, and the user never signs in or pastes anything.
let appAccountReady: boolean | null = null;

export async function refreshAppCalendarAccount(): Promise<boolean> {
  if (appAccountReady !== null) return appAccountReady;
  try {
    const { gcalGatewayStatus } = await import("@/lib/googleCalendarGateway.functions");
    const { available } = await gcalGatewayStatus();
    appAccountReady = available;
  } catch {
    appAccountReady = false;
  }
  return appAccountReady;
}

export function hasAppCalendarAccount(): boolean {
  return appAccountReady === true;
}

export function isGCalConnected(): boolean {
  return appAccountReady === true || validGoogleToken() !== null;
}

export class GCalAuthError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "Google Calendar is not connected. Open Settings → Google Connection and connect your account.",
    );
    this.name = "GCalAuthError";
  }
}

async function ensureToken(interactive = false): Promise<StoredGoogleToken> {
  try {
    return await ensureGoogleToken({ scope: GCAL_SCOPE, interactive });
  } catch (e: any) {
    if (e?.message?.includes("popup")) throw new GCalAuthError(e.message);
    throw new GCalAuthError(e?.message || "Google sign-in failed");
  }
}

async function gcalApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (await refreshAppCalendarAccount()) {
    const { gcalGatewayRequest } = await import("@/lib/googleCalendarGateway.functions");
    const { status, body } = await gcalGatewayRequest({
      data: {
        path,
        method: (init.method as any) || "GET",
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      },
    });
    if (status === 204 || !body) return undefined as T;
    if (status < 200 || status >= 300) {
      throw new Error(`Google Calendar ${status}: ${body.slice(0, 600)}`);
    }
    return JSON.parse(body) as T;
  }
  const token = await ensureToken();
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("mc_google_access_token_v1");
    throw new GCalAuthError("Google Calendar session expired — please reconnect.");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google Calendar ${res.status}: ${text.slice(0, 600)}`);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function listCalendars(): Promise<GoogleCalendarList[]> {
  const calendars: GoogleCalendarList[] = [];
  let pageToken: string | undefined;
  do {
    const qs = new URLSearchParams({ maxResults: "250", showHidden: "true" });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await gcalApi<{ items?: any[]; nextPageToken?: string }>(
      `/users/me/calendarList?${qs.toString()}`,
    );
    calendars.push(
      ...(data.items || []).map((cal: any) => ({
        id: cal.id,
        summary: cal.summary || cal.id,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        primary: cal.primary || false,
        selected: cal.selected !== false,
      })),
    );
    pageToken = data.nextPageToken;
  } while (pageToken);
  return calendars;
}

export async function fetchCalendarEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string,
  maxResults = 250,
): Promise<GoogleCalendarEvent[]> {
  const events: any[] = [];
  let pageToken: string | undefined;
  do {
    const qs = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults: String(maxResults),
      singleEvents: "true",
      orderBy: "startTime",
    });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await gcalApi<{ items?: any[]; nextPageToken?: string }>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
    );
    events.push(...(data.items || []).map((event) => ({ ...event, calendarId })));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return events;
}

export async function fetchAllEvents(
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const cfg = getGCalConfig();
  let calendarIds = cfg.enabledCalendarIds;

  if (!calendarIds || calendarIds.length === 0) {
    const all = await listCalendars();
    calendarIds = all.map((c) => c.id);
  }

  const results = await Promise.allSettled(
    calendarIds.map((id) => fetchCalendarEvents(id, timeMin, timeMax)),
  );

  const events: GoogleCalendarEvent[] = [];
  const failures: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") events.push(...result.value);
    else failures.push(result.reason?.message || "Calendar read failed");
  }

  if (events.length === 0 && failures.length > 0) {
    throw new Error(failures[0]);
  }

  setGCalConfig({ lastSync: new Date().toISOString() });
  return events;
}

export function taskIdToGCalId(taskId: string): string {
  const hex = taskId.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  return `mc${hex}`.slice(0, 1024);
}

export async function createGCalEvent(
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    colorId?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    recurrence?: string[];
  },
  deterministicId?: string,
): Promise<GoogleCalendarEvent> {
  const cal = encodeURIComponent(calendarId);
  if (deterministicId) {
    // Upsert semantics, same as the old server gateway: try POST-with-id
    // (201), fall back to PUT (409 when the event already exists).
    try {
      return await gcalApi<GoogleCalendarEvent>(`/calendars/${cal}/events`, {
        method: "POST",
        body: JSON.stringify({ ...event, id: deterministicId }),
      });
    } catch (e: any) {
      if (!/\(409\)/.test(e?.message || "")) throw e;
      return gcalApi<GoogleCalendarEvent>(
        `/calendars/${cal}/events/${encodeURIComponent(deterministicId)}`,
        { method: "PUT", body: JSON.stringify(event) },
      );
    }
  }
  return gcalApi<GoogleCalendarEvent>(`/calendars/${cal}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function deleteGCalEvent(eventId: string, calendarId = "primary"): Promise<boolean> {
  if (!eventId) return false;
  try {
    await gcalApi<void>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" },
    );
    return true;
  } catch (e: any) {
    if (/\b(?:404|410)\b/.test(e?.message || "")) return true;
    return false;
  }
}

export async function connectGCal(): Promise<{ email?: string; redirected?: boolean }> {
  const { ensureGoogleClientId } = await import("@/lib/googleDirectAuth");
  if (!(await ensureGoogleClientId())) {
    throw new GCalAuthError(
      "Google setup is required once. Press Connect Google and follow the three steps.",
    );
  }
  const token = await ensureToken(true);
  const calendars = await listCalendars();
  const primary = calendars.find((cal) => cal.primary && /@/.test(cal.id));
  const writable = calendars.find((cal) => cal.id === "primary" || /@/.test(cal.id));
  const email = primary?.id || writable?.id;
  const profileEmail = await fetchGoogleEmail(token.access_token);
  if (profileEmail || email) {
    setGCalConfig({ connectedEmail: profileEmail || email || null });
  }
  const { startCloudSync } = await import("@/lib/cloudSync");
  await startCloudSync(true);
  try {
    const { syncGoogleTasks } = await import("@/lib/googleTasksSync");
    await syncGoogleTasks();
  } catch {
    /* non-fatal — retried on the next sync pass */
  }
  return { email: profileEmail || email, redirected: false };
}

export function disconnectGCal(): void {
  clearGCalConfig();
}

export async function pushTaskToGCal(task: {
  title: string;
  description?: string;
  dueDate: string;
}): Promise<GoogleCalendarEvent | null> {
  try {
    return await createGCalEvent("primary", {
      summary: `📋 ${task.title}`,
      description: task.description || "",
      start: { date: task.dueDate },
      end: { date: nextDateISO(task.dueDate) },
    });
  } catch (e) {
    console.error("Failed to push task to Google Calendar:", e);
    return null;
  }
}

function localTodayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function nextDateISO(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Builds the calendar title for a task, flagging overdue / completed state. */
export function gcalTaskSummary(task: {
  title: string;
  dueDate?: string;
  status?: string;
}): string {
  const today = localTodayISO();
  if (task.status === "done") return `✅ ${task.title}`;
  if (task.dueDate && task.dueDate < today) {
    const days = Math.max(
      1,
      Math.round(
        (new Date(`${today}T00:00:00`).getTime() - new Date(`${task.dueDate}T00:00:00`).getTime()) /
          86_400_000,
      ),
    );
    return `⚠️ OVERDUE ${days}d · ${task.title}`;
  }
  return `📋 ${task.title}`;
}
/** Personal items can be mirrored as an opaque "Busy" slot: availability
 *  without exposing the title or notes. Off = mirrored like any other task. */
export function shouldProjectAsBusy(task: { area?: string }): boolean {
  if ((task.area ?? "work") !== "personal") return false;
  try {
    const raw = localStorage.getItem("mc-plan-v1");
    return raw ? JSON.parse(raw)?.state?.personalAsBusy !== false : true;
  } catch {
    return true;
  }
}

export async function pushTasksToGCal(
  tasks: {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    status?: string;
    startDate?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    gcalEventId?: string;
    recurring?: boolean;
    recurringInterval?: string;
    recurringEndType?: string;
    recurringEndDate?: string;
    recurringEndCount?: number;
    recurringCustomDays?: number;
    area?: string;
    blocks?: { date: string; start: string; end: string; done?: boolean }[];
    deletedAt?: string;
  }[],
): Promise<Map<string, string>> {
  const { toRRule } = await import("@/lib/recurrence");
  const results = new Map<string, string>();
  const today = localTodayISO();

  for (const task of tasks) {
    if (task.gcalEventId && !task.gcalEventId.startsWith("mc")) continue;
    if (task.deletedAt) continue;

    try {
      // Time allocation comes from the next open work block when one exists;
      // the deadline is shown in the title, never used to place a block.
      const nextBlock = [...(task.blocks ?? [])]
        .filter((b) => !b.done)
        .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
      const eventDate = nextBlock?.date || task.startDate || task.dueDate || today;
      const startTime = nextBlock?.start ?? task.startTime;
      const endTime = nextBlock?.end ?? task.endTime;
      const isAllDay = !nextBlock && task.allDay !== false && !task.startTime;
      const isOverdue = task.status !== "done" && !!task.dueDate && task.dueDate < today;
      const busy = shouldProjectAsBusy(task);
      const eventBody: any = busy
        ? {
            summary: "Busy",
            description: "",
            transparency: "opaque",
            visibility: "private",
            colorId: "8",
          }
        : {
            summary: gcalTaskSummary(task),
            description: task.description || "",
            // 11 = tomato (overdue), 10 = basil (done), 9 = blueberry (normal)
            colorId: isOverdue ? "11" : task.status === "done" ? "10" : "9",
          };
      if (isAllDay) {
        eventBody.start = { date: eventDate };
        eventBody.end = { date: nextDateISO(eventDate) };
      } else {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        eventBody.start = {
          dateTime: `${eventDate}T${startTime || "09:00"}:00`,
          timeZone: tz,
        };
        eventBody.end = { dateTime: `${eventDate}T${endTime || "10:00"}:00`, timeZone: tz };
      }
      if (task.recurring && task.recurringInterval) {
        const rrule = toRRule(task as any);
        if (rrule) eventBody.recurrence = [rrule];
      }
      const deterministicId = taskIdToGCalId(task.id);
      const created = await createGCalEvent("primary", eventBody, deterministicId);
      if (created?.id) results.set(task.id, created.id);
    } catch (e) {
      console.error(`Failed to push task "${task.title}" to Google Calendar:`, e);
    }
  }

  return results;
}

let cachedEvents: GoogleCalendarEvent[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000;

export function getCachedGCalEvents(): GoogleCalendarEvent[] {
  return cachedEvents;
}

export async function syncGCalEvents(
  timeMin: string,
  timeMax: string,
  forceRefresh = false,
): Promise<GoogleCalendarEvent[]> {
  if (!forceRefresh && cachedEvents.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedEvents;
  }

  cachedEvents = await fetchAllEvents(timeMin, timeMax);
  cacheTimestamp = Date.now();
  return cachedEvents;
}

export function gCalEventToCalEvent(
  gev: GoogleCalendarEvent,
  calColor?: string,
): {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  color: string;
  category: string;
  description?: string;
  isTask: false;
  isGoogleEvent: true;
  allDay: boolean;
  htmlLink?: string;
  googleEventId: string;
} {
  const isAllDay = !!gev.start.date;
  let date: string;
  let endDate: string | undefined;
  let startTime: string | undefined;
  let endTime: string | undefined;

  if (isAllDay) {
    const startDate = gev.start.date;
    if (!startDate) throw new Error("Google Calendar event is missing a start date");
    date = startDate;
    if (gev.end.date && gev.end.date !== gev.start.date) {
      const endD = new Date(gev.end.date);
      endD.setDate(endD.getDate() - 1);
      const ed = endD.toISOString().split("T")[0];
      endDate = ed !== date ? ed : undefined;
    }
  } else {
    const startDateTime = gev.start.dateTime;
    const endDateTime = gev.end.dateTime;
    if (!startDateTime || !endDateTime)
      throw new Error("Google Calendar event is missing start or end time");
    const startDt = new Date(startDateTime);
    const endDt = new Date(endDateTime);
    date = startDt.toISOString().split("T")[0];
    startTime = startDt.toTimeString().slice(0, 5);
    endTime = endDt.toTimeString().slice(0, 5);
    const endDateStr = endDt.toISOString().split("T")[0];
    endDate = endDateStr !== date ? endDateStr : undefined;
  }

  return {
    id: `gcal-${gev.id}`,
    title: gev.summary || "(No title)",
    date,
    endDate,
    startTime,
    endTime,
    color: calColor || getGCalColor(gev.colorId),
    category: "Google Calendar",
    description: gev.description,
    isTask: false,
    isGoogleEvent: true,
    allDay: isAllDay,
    htmlLink: gev.htmlLink,
    googleEventId: gev.id,
  };
}
