/**
 * Google Calendar — per-user access through Lovable Cloud managed Google OAuth.
 * This avoids the old hardcoded Google OAuth client that caused origin_mismatch.
 */

import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const OAUTH_SCOPES = `openid email profile ${CALENDAR_SCOPE}`;
const TOKEN_STORAGE_KEY = 'mc_gcal_token_v1';
const CONFIG_STORAGE_KEY = 'mc_gcal_config';

type StoredToken = { access_token: string; expires_at: number };

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw) as StoredToken;
    if (token.expires_at - 30_000 < Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

function saveToken(access_token: string, expiresAt?: number) {
  const token: StoredToken = {
    access_token,
    expires_at: expiresAt || Date.now() + 60 * 60 * 1000,
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
}

async function persistProviderTokenFromSession(fallbackToken?: string): Promise<StoredToken | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const providerToken = fallbackToken || session?.provider_token;
  if (!providerToken) return readToken();
  const expiresAt = session?.expires_at ? session.expires_at * 1000 : Date.now() + 60 * 60 * 1000;
  saveToken(providerToken, expiresAt);
  return readToken();
}

async function gcalApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken() || await persistProviderTokenFromSession();
  if (!token) throw new Error('Not signed in to Google Calendar');

  const response = await fetch(`https://www.googleapis.com/calendar/v3/${path.replace(/^\/+/, '')}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    throw new Error('Google Calendar session expired — please sign in again');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar ${response.status}: ${text.slice(0, 300)}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function ensureCalendarToken(): Promise<void> {
  if (readToken() || await persistProviderTokenFromSession()) return;
  await connectGCal();
}

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
  return readToken() !== null;
}

export async function connectGCal(): Promise<{ email?: string }> {
  if (typeof window === 'undefined') throw new Error('Google Calendar sign-in is only available in the browser');

  const result = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
    extraParams: {
      prompt: 'select_account consent',
      access_type: 'online',
      include_granted_scopes: 'true',
      scope: OAUTH_SCOPES,
    },
  });

  if ((result as any).error) {
    const raw = (result as any).error?.message || String((result as any).error);
    if (/origin_mismatch|origin mismatch/i.test(raw)) {
      throw new Error('Google rejected the old custom OAuth client. Refresh the app and try again — Google Calendar now uses Lovable Cloud managed Google OAuth.');
    }
    throw new Error(raw || 'Google Calendar sign-in failed');
  }

  if (!(result as any).redirected) {
    const fallbackToken = (result as any).tokens?.provider_token || (result as any).provider_token;
    const token = await persistProviderTokenFromSession(fallbackToken);
    if (!token) {
      throw new Error('Google Calendar sign-in finished, but Calendar access was not granted. Please approve Calendar access and try again.');
    }
  } else {
    return {};
  }

  const calendars = await listCalendars();
  const primary = calendars.find((cal) => cal.primary && /@/.test(cal.id));
  if (primary) setGCalConfig({ connectedEmail: primary.id });
  return { email: primary?.id };
}

export function disconnectGCal(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  void supabase.auth.signOut();
  clearGCalConfig();
}

export async function listCalendars(): Promise<GoogleCalendarList[]> {
  await ensureCalendarToken();

  const calendars: GoogleCalendarList[] = [];
  let pageToken: string | undefined;

  do {
    const qs = new URLSearchParams({ maxResults: '250', showHidden: 'true' });
    if (pageToken) qs.set('pageToken', pageToken);
    const data = await gcalApi<{ items?: any[]; nextPageToken?: string }>(`users/me/calendarList?${qs.toString()}`);

    calendars.push(...(data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary || cal.id,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      primary: cal.primary || false,
      selected: cal.selected !== false,
    })));

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
  await ensureCalendarToken();

  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const qs = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults: String(maxResults),
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    if (pageToken) qs.set('pageToken', pageToken);

    const data = await gcalApi<{ items?: any[]; nextPageToken?: string }>(
      `calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
    );

    events.push(...(data.items || []).map((ev) => ({ ...ev, calendarId })));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
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
  for (const result of results) {
    if (result.status === 'fulfilled') events.push(...result.value);
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
  await ensureCalendarToken();
  const body: any = { ...event };
  if (deterministicId) body.id = deterministicId;

  try {
    return await gcalApi<GoogleCalendarEvent>(
      `calendars/${encodeURIComponent(calendarId)}/events`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  } catch (e: any) {
    if (deterministicId && /\b409\b/.test(e?.message || '')) {
      try {
        return await gcalApi<GoogleCalendarEvent>(
          `calendars/${encodeURIComponent(calendarId)}/events/${deterministicId}`,
          { method: 'PUT', body: JSON.stringify({ ...event }) },
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
    await ensureCalendarToken();
    await gcalApi(
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

function localTodayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
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

  try {
    cachedEvents = await fetchAllEvents(timeMin, timeMax);
    cacheTimestamp = Date.now();
    return cachedEvents;
  } catch (e) {
    console.error('Google Calendar sync error:', e);
    return cachedEvents;
  }
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