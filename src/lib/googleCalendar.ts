/**
 * Google Calendar Integration — proxied through the existing `google-calendar`
 * Supabase Edge Function for this project.
 */

import { getSupabase } from '@/lib/supabase';



// ─── Types ──────────────────────────────────────────────────────────────────────

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
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
  '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
  '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
};

export function getGCalColor(colorId?: string): string {
  return colorId && GCAL_COLORS[colorId] ? GCAL_COLORS[colorId] : '#039BE5';
}

// ─── Storage (local settings only — no tokens) ─────────────────────────────────

const STORAGE_KEY = 'mc_gcal_config';

const DEFAULT_CONFIG: GCalConfig = {
  enabledCalendarIds: [],
  autoSync: true,
  syncIntervalMinutes: 5,
  lastSync: null,
  connectedEmail: null,
};

export function getGCalConfig(): GCalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setGCalConfig(partial: Partial<GCalConfig>): GCalConfig {
  const updated = { ...getGCalConfig(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearGCalConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Always connected — auth is server-side via the Lovable connector. */
export function isGCalConnected(): boolean {
  const cfg = getGCalConfig();
  return Boolean(cfg.connectedEmail || cfg.lastSync || cfg.enabledCalendarIds.length);
}

// ─── Supabase Edge Function proxy ──────────────────────────────────────────────

async function gcalCall<T = any>(
  path: string,
  init: { method?: string; query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Google Calendar backend is unavailable because cloud sync is disconnected.');
  }

  let data: any;
  let error: any;
  try {
    const response = await supabase.functions.invoke('google-calendar', {
      body: {
        path,
        method: init.method || 'GET',
        query: init.query,
        body: init.body,
      },
    });
    data = response.data;
    error = response.error;
  } catch {
    throw new Error('Google Calendar backend is unreachable from this app right now.');
  }

  if (error) {
    const message = error?.message || error?.context?.message || 'Google Calendar request failed';
    throw new Error(message);
  }

  return data as T;
}




// ─── API surface (preserved signatures so existing callers keep working) ───────

export async function listCalendars(): Promise<GoogleCalendarList[]> {
  const data = await gcalCall<{ items?: any[] }>('users/me/calendarList');
  return (data.items || []).map((cal) => ({
    id: cal.id,
    summary: cal.summary || cal.id,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor,
    primary: cal.primary || false,
    selected: cal.selected !== false,
  }));
}

export async function fetchCalendarEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string,
  maxResults = 250,
): Promise<GoogleCalendarEvent[]> {
  const data = await gcalCall<{ items?: any[] }>(
    `calendars/${encodeURIComponent(calendarId)}/events`,
    {
      query: {
        timeMin,
        timeMax,
        maxResults: String(maxResults),
        singleEvents: 'true',
        orderBy: 'startTime',
      },
    },
  );
  return (data.items || []).map((ev) => ({ ...ev, calendarId }));
}

export async function fetchAllEvents(timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> {
  const cfg = getGCalConfig();
  let calendarIds = cfg.enabledCalendarIds;

  // If the user hasn't picked specific calendars, pull from EVERY calendar
  // they have access to (primary, birthdays, holidays, subscribed, etc.).
  if (!calendarIds || calendarIds.length === 0) {
    try {
      const all = await listCalendars();
      calendarIds = all.map((c) => c.id);
    } catch {
      calendarIds = ['primary'];
    }
  }

  const results = await Promise.allSettled(
    calendarIds.map((id) => fetchCalendarEvents(id, timeMin, timeMax)),
  );
  const events: GoogleCalendarEvent[] = [];
  for (const r of results) if (r.status === 'fulfilled') events.push(...r.value);
  setGCalConfig({ lastSync: new Date().toISOString() });
  return events;
}

export function taskIdToGCalId(taskId: string): string {
  const hex = taskId.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  return `mc${hex}`.slice(0, 1024);
}

export async function createGCalEvent(
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    recurrence?: string[];
  },
  deterministicId?: string,
): Promise<GoogleCalendarEvent> {
  const body: any = { ...event };
  if (deterministicId) body.id = deterministicId;

  try {
    return await gcalCall<GoogleCalendarEvent>(
      `calendars/${encodeURIComponent(calendarId)}/events`,
      { method: 'POST', body },
    );
  } catch (e: any) {
    // 409 conflict → update existing
    if (deterministicId && /\b409\b/.test(e?.message || '')) {
      try {
        return await gcalCall<GoogleCalendarEvent>(
          `calendars/${encodeURIComponent(calendarId)}/events/${deterministicId}`,
          { method: 'PUT', body: { ...event } },
        );
      } catch {
        return { id: deterministicId, summary: event.summary, start: event.start, end: event.end } as GoogleCalendarEvent;
      }
    }
    throw e;
  }
}

export async function deleteGCalEvent(eventId: string, calendarId = 'primary'): Promise<boolean> {
  if (!eventId) return false;
  try {
    await gcalCall(
      `calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    );
    return true;
  } catch (e: any) {
    if (/\b404\b/.test(e?.message || '')) return true;
    return false;
  }
}

export async function pushTaskToGCal(task: {
  title: string;
  description?: string;
  dueDate: string;
}): Promise<GoogleCalendarEvent | null> {
  try {
    return await createGCalEvent('primary', {
      summary: `📋 ${task.title}`,
      description: task.description || '',
      start: { date: task.dueDate },
      end: { date: task.dueDate },
    });
  } catch (e) {
    console.error('Failed to push task to Google Calendar:', e);
    return null;
  }
}

export async function pushTasksToGCal(tasks: {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
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
}[]): Promise<Map<string, string>> {
  const { toRRule } = await import('@/lib/recurrence');
  const results = new Map<string, string>();

  const isFatalBackendError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || '');
    return /backend is not deployed|backend is unreachable/i.test(message);
  };

  for (const task of tasks) {
    if (task.gcalEventId && !task.gcalEventId.startsWith('mc')) continue;
    if (!task.dueDate) continue;
    try {
      const isAllDay = task.allDay !== false && !task.startTime;
      const eventBody: any = {
        summary: `📋 ${task.title}`,
        description: task.description || '',
      };
      const eventDate = task.startDate || task.dueDate;
      if (isAllDay) {
        eventBody.start = { date: eventDate };
        eventBody.end = { date: eventDate };
      } else {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        eventBody.start = { dateTime: `${eventDate}T${task.startTime || '09:00'}:00`, timeZone: tz };
        eventBody.end = { dateTime: `${eventDate}T${task.endTime || '10:00'}:00`, timeZone: tz };
      }
      if (task.recurring && task.recurringInterval) {
        const rrule = toRRule(task as any);
        if (rrule) eventBody.recurrence = [rrule];
      }
      const deterministicId = taskIdToGCalId(task.id);
      const created = await createGCalEvent('primary', eventBody, deterministicId);
      if (created?.id) results.set(task.id, created.id);
    } catch (e) {
      console.error(`Failed to push task "${task.title}" to GCal:`, e);
      if (isFatalBackendError(e)) throw e;
    }
  }
  return results;
}

// ─── Cached events ─────────────────────────────────────────────────────────────

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
  try {
    cachedEvents = await fetchAllEvents(timeMin, timeMax);
    cacheTimestamp = Date.now();
    return cachedEvents;
  } catch (e) {
    console.error('Google Calendar sync error:', e);
    return cachedEvents;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function gCalEventToCalEvent(gev: GoogleCalendarEvent, calColor?: string): {
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
    date = gev.start.date!;
    if (gev.end.date && gev.end.date !== gev.start.date) {
      const endD = new Date(gev.end.date);
      endD.setDate(endD.getDate() - 1);
      const ed = endD.toISOString().split('T')[0];
      endDate = ed !== date ? ed : undefined;
    }
  } else {
    const startDt = new Date(gev.start.dateTime!);
    const endDt = new Date(gev.end.dateTime!);
    date = startDt.toISOString().split('T')[0];
    startTime = startDt.toTimeString().slice(0, 5);
    endTime = endDt.toTimeString().slice(0, 5);
    const endDateStr = endDt.toISOString().split('T')[0];
    endDate = endDateStr !== date ? endDateStr : undefined;
  }

  return {
    id: `gcal-${gev.id}`,
    title: gev.summary || '(No title)',
    date,
    endDate,
    startTime,
    endTime,
    color: calColor || getGCalColor(gev.colorId),
    category: 'Google Calendar',
    description: gev.description,
    isTask: false,
    isGoogleEvent: true,
    allDay: isAllDay,
    htmlLink: gev.htmlLink,
    googleEventId: gev.id,
  };
}
