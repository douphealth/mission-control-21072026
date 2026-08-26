/** Google Calendar — server-side connector gateway integration. */

import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import {
  createOrUpdateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
  listGoogleCalendars,
} from '@/lib/googleCalendar.functions';

const CONFIG_STORAGE_KEY = 'mc_gcal_config';

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

export function isGCalConnected(): boolean {
  const config = getGCalConfig();
  return Boolean(config.connectedEmail || config.lastSync);
}

async function ensureAppSession(): Promise<boolean> {
  if (typeof window === 'undefined') throw new Error('Google Calendar sign-in is only available in the browser');

  const current = await supabase.auth.getSession();
  if (current.data.session) return true;

  const result = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
    extraParams: {
      prompt: 'select_account',
    },
  });

  if ((result as any).error) {
    const raw = (result as any).error?.message || String((result as any).error);
    throw new Error(raw || 'Google sign-in failed');
  }

  if ((result as any).redirected) return false;

  const after = await supabase.auth.getSession();
  return Boolean(after.data.session);
}

export async function connectGCal(): Promise<{ email?: string; redirected?: boolean }> {
  const hasSession = await ensureAppSession();
  if (!hasSession) return { redirected: true };

  const calendars = await listCalendars();
  const primary = calendars.find((cal) => cal.primary && /@/.test(cal.id));
  const writable = calendars.find((cal) => cal.id === 'primary' || /@/.test(cal.id));
  const email = primary?.id || writable?.id;
  if (email) setGCalConfig({ connectedEmail: email });
  return { email };
}

export function disconnectGCal(): void {
  clearGCalConfig();
}

export class GCalAuthError extends Error {
  constructor() {
    super('Google Calendar is not connected. Open Settings → Google Calendar and connect your account.');
    this.name = 'GCalAuthError';
  }
}

/** Server functions require a Supabase bearer token; bail out cleanly when signed out. */
async function requireAppSession(): Promise<void> {
  if (typeof window === 'undefined') throw new GCalAuthError();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new GCalAuthError();
}

export async function listCalendars(): Promise<GoogleCalendarList[]> {
  await requireAppSession();
  return listGoogleCalendars() as Promise<GoogleCalendarList[]>;
}

export async function fetchCalendarEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string,
  maxResults = 250,
): Promise<GoogleCalendarEvent[]> {
  await requireAppSession();
  return fetchGoogleCalendarEvents({ data: { calendarId, timeMin, timeMax, maxResults } }) as Promise<GoogleCalendarEvent[]>;
}


export async function fetchAllEvents(timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> {
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
    if (result.status === 'fulfilled') events.push(...result.value);
    else failures.push(result.reason?.message || 'Calendar read failed');
  }

  if (events.length === 0 && failures.length > 0) {
    throw new Error(failures[0]);
  }

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
    colorId?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    recurrence?: string[];

  },
  deterministicId?: string,
): Promise<GoogleCalendarEvent> {
  return createOrUpdateGoogleCalendarEvent({ data: { calendarId, event, deterministicId } }) as Promise<GoogleCalendarEvent>;
}

export async function deleteGCalEvent(eventId: string, calendarId = 'primary'): Promise<boolean> {
  if (!eventId) return false;
  try {
    await deleteGoogleCalendarEvent({ data: { calendarId, eventId } });
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
      end: { date: nextDateISO(task.dueDate) },
    });
  } catch (e) {
    console.error('Failed to push task to Google Calendar:', e);
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
  if (task.status === 'done') return `✅ ${task.title}`;
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

export async function pushTasksToGCal(tasks: {
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
}[]): Promise<Map<string, string>> {
  const { toRRule } = await import('@/lib/recurrence');
  const results = new Map<string, string>();
  const today = localTodayISO();

  for (const task of tasks) {
    if (task.gcalEventId && !task.gcalEventId.startsWith('mc')) continue;

    try {
      // Every task lands on the calendar — undated ones are placed on today.
      const eventDate = task.startDate || task.dueDate || today;
      const isAllDay = task.allDay !== false && !task.startTime;
      const isOverdue = task.status !== 'done' && !!task.dueDate && task.dueDate < today;
      const eventBody: any = {
        summary: gcalTaskSummary(task),
        description: task.description || '',
        // 11 = tomato (overdue), 10 = basil (done), 9 = blueberry (normal)
        colorId: isOverdue ? '11' : task.status === 'done' ? '10' : '9',
      };
      if (isAllDay) {
        eventBody.start = { date: eventDate };
        eventBody.end = { date: nextDateISO(eventDate) };
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
    const startDate = gev.start.date;
    if (!startDate) throw new Error('Google Calendar event is missing a start date');
    date = startDate;
    if (gev.end.date && gev.end.date !== gev.start.date) {
      const endD = new Date(gev.end.date);
      endD.setDate(endD.getDate() - 1);
      const ed = endD.toISOString().split('T')[0];
      endDate = ed !== date ? ed : undefined;
    }
  } else {
    const startDateTime = gev.start.dateTime;
    const endDateTime = gev.end.dateTime;
    if (!startDateTime || !endDateTime) throw new Error('Google Calendar event is missing start or end time');
    const startDt = new Date(startDateTime);
    const endDt = new Date(endDateTime);
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