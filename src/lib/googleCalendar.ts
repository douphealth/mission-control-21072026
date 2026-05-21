/**
 * Google Calendar Integration — browser-side using Google Identity Services (GIS)
 * 
 * Uses OAuth 2.0 implicit flow (no backend needed).
 * The user provides their Google Cloud Client ID in Settings,
 * then can connect with one click. Events are fetched read/write via REST API.
 */

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
  calendarId?: string;  // which calendar it came from
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
  clientId: string;
  accessToken: string | null;
  tokenExpiry: number | null;
  connectedEmail: string | null;
  enabledCalendarIds: string[];  // which calendars to show
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSync: string | null;
  redirectUri?: string; // optional override for published domain
}

// Color mapping for Google Calendar color IDs
const GCAL_COLORS: Record<string, string> = {
  '1': '#7986CB', // Lavender
  '2': '#33B679', // Sage
  '3': '#8E24AA', // Grape
  '4': '#E67C73', // Flamingo
  '5': '#F6BF26', // Banana
  '6': '#F4511E', // Tangerine
  '7': '#039BE5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3F51B5', // Blueberry
  '10': '#0B8043', // Basil
  '11': '#D50000', // Tomato
};

export function getGCalColor(colorId?: string): string {
  return colorId && GCAL_COLORS[colorId] ? GCAL_COLORS[colorId] : '#039BE5';
}

// ─── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mc_gcal_config';

const DEFAULT_CLIENT_ID = '541642493011-k41ng5vo7ihfn7su05g85u47ef727a9l.apps.googleusercontent.com';
const OAUTH_CALLBACK_PATH = '/oauth-callback.html';
const LEGACY_REDIRECT_ORIGINS = new Set([
  'https://mission-control-center-2d32d572.pages.dev',
  'https://my-new-mission-control-center.pages.dev',
]);

const DEFAULT_CONFIG: GCalConfig = {
  clientId: DEFAULT_CLIENT_ID,
  accessToken: null,
  tokenExpiry: null,
  connectedEmail: null,
  enabledCalendarIds: [],
  autoSync: true,
  syncIntervalMinutes: 5,
  lastSync: null,
};

function getRuntimeOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
}

export function getDefaultGCalRedirectUri(preferredOrigin?: string): string {
  return new URL(OAUTH_CALLBACK_PATH, preferredOrigin || getRuntimeOrigin() || 'http://localhost').toString();
}

export function normalizeGCalRedirectUri(input?: string | null, preferredOrigin?: string): string | undefined {
  const value = input?.trim();
  if (!value) return undefined;

  try {
    const parsed = new URL(value);
    const normalizedOrigin = LEGACY_REDIRECT_ORIGINS.has(parsed.origin)
      ? (preferredOrigin || getRuntimeOrigin())
      : parsed.origin;
    if (!normalizedOrigin) return undefined;
    return new URL(OAUTH_CALLBACK_PATH, normalizedOrigin).toString();
  } catch {
    return undefined;
  }
}

export function getGCalConfig(): GCalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    // Always fall back to default client ID if empty so the app is preconnected
    if (!parsed.clientId) parsed.clientId = DEFAULT_CLIENT_ID;
    parsed.redirectUri = normalizeGCalRedirectUri(parsed.redirectUri);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setGCalConfig(partial: Partial<GCalConfig>): GCalConfig {
  const current = getGCalConfig();
  const nextPartial = { ...partial };
  if ('redirectUri' in nextPartial) {
    nextPartial.redirectUri = normalizeGCalRedirectUri(nextPartial.redirectUri);
  }
  const updated = { ...current, ...nextPartial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearGCalConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isGCalConnected(): boolean {
  const cfg = getGCalConfig();
  return !!(cfg.accessToken && cfg.tokenExpiry && cfg.tokenExpiry > Date.now());
}

export function getGCalClientId(): string {
  return getGCalConfig().clientId;
}

// ─── GIS Script loading ────────────────────────────────────────────────────────

let gisLoaded = false;
let gisLoadPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    // Check if already in DOM
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      gisLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { gisLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

function getGoogleAuthErrorMessage(error?: string): string {
  switch (error) {
    case 'popup_failed_to_open':
      return 'Popup blocked — please allow popups for this site and try again.';
    case 'popup_closed':
    case 'access_denied':
      return 'Sign-in cancelled';
    case 'immediate_failed':
      return 'Google session check failed — please try again.';
    default:
      return error ? `Google sign-in failed: ${error}` : 'Google sign-in failed';
  }
}

// ─── OAuth Token ────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

/**
 * Initiates Google OAuth using GIS's popup token flow.
 * This avoids custom redirect URIs and the redirect_uri_mismatch failure.
 */
export async function signInWithGoogle(clientId: string): Promise<{
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  email?: string;
  error?: string;
}> {
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';
  try {
    await loadGisScript();
    if (!window.google?.accounts?.oauth2) {
      return { success: false, error: 'Google sign-in failed to initialize' };
    }

    return new Promise((resolve) => {
      let resolved = false;
      const finalize = (result: {
        success: boolean;
        accessToken?: string;
        expiresIn?: number;
        email?: string;
        error?: string;
      }) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        prompt: 'consent',
        callback: async (response: any) => {
          if (response.error || !response.access_token) {
            finalize({ success: false, error: getGoogleAuthErrorMessage(response.error) });
            return;
          }

          let email = '';
          try {
            const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            });
            const data = await userInfo.json();
            email = data.email || '';
          } catch {
            // ignore email lookup failures — token itself is the important part
          }

          finalize({
            success: true,
            accessToken: response.access_token,
            expiresIn: Number(response.expires_in) || 3600,
            email,
          });
        },
        error_callback: (error: any) => {
          finalize({ success: false, error: getGoogleAuthErrorMessage(error?.type || error?.message) });
        },
      });

      try {
        tokenClient.requestAccessToken();
      } catch (error: any) {
        finalize({ success: false, error: error?.message || 'Failed to open Google sign-in' });
      }
    });
  } catch (error: any) {
    return { success: false, error: error?.message || 'Google sign-in failed to initialize' };
  }
}

/**
 * Silently refresh the token (no popup unless needed)
 */
export async function refreshToken(): Promise<boolean> {
  const cfg = getGCalConfig();
  if (!cfg.clientId) return false;

  try {
    await loadGisScript();
    if (!window.google?.accounts?.oauth2) return false;

    return new Promise((resolve) => {
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: cfg.clientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
        callback: (response: any) => {
          if (response.error) {
            resolve(false);
            return;
          }
          setGCalConfig({
            accessToken: response.access_token,
            tokenExpiry: Date.now() + Number(response.expires_in) * 1000,
          });
          resolve(true);
        },
        error_callback: () => resolve(false),
      });

      tokenClient.requestAccessToken({ prompt: '' });
    });
  } catch {
    return false;
  }
}

/**
 * Sign out / disconnect
 */
export function signOutGoogle(): void {
  const cfg = getGCalConfig();
  if (cfg.accessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(cfg.accessToken);
    } catch { /* ignore */ }
  }
  setGCalConfig({
    accessToken: null,
    tokenExpiry: null,
    connectedEmail: null,
    enabledCalendarIds: [],
    lastSync: null,
  });
}

// ─── API Calls ──────────────────────────────────────────────────────────────────

async function gcalFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let cfg = getGCalConfig();
  
  // Auto-refresh if expired
  if (!cfg.accessToken || !cfg.tokenExpiry || cfg.tokenExpiry < Date.now()) {
    const refreshed = await refreshToken();
    if (!refreshed) throw new Error('Token expired — please reconnect Google Calendar');
    cfg = getGCalConfig();
  }

  const resp = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (resp.status === 401) {
    // Try refresh once
    const refreshed = await refreshToken();
    if (refreshed) {
      const newCfg = getGCalConfig();
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newCfg.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    }
    throw new Error('Authentication failed — please reconnect');
  }

  return resp;
}

/**
 * List all calendars the user has access to
 */
export async function listCalendars(): Promise<GoogleCalendarList[]> {
  const resp = await gcalFetch('https://www.googleapis.com/calendar/v3/users/me/calendarList');
  if (!resp.ok) throw new Error(`Failed to list calendars: ${resp.statusText}`);
  const data = await resp.json();
  return (data.items || []).map((cal: any) => ({
    id: cal.id,
    summary: cal.summary || cal.id,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor,
    primary: cal.primary || false,
    selected: cal.selected !== false,
  }));
}

/**
 * Fetch events from a specific calendar within a date range
 */
export async function fetchCalendarEvents(
  calendarId: string,
  timeMin: string, // ISO string
  timeMax: string, // ISO string
  maxResults: number = 250,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const resp = await gcalFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  );
  if (!resp.ok) throw new Error(`Failed to fetch events: ${resp.statusText}`);
  const data = await resp.json();
  return (data.items || []).map((ev: any) => ({ ...ev, calendarId }));
}

/**
 * Fetch events from ALL enabled calendars
 */
export async function fetchAllEvents(
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const cfg = getGCalConfig();
  const calendarIds = cfg.enabledCalendarIds.length > 0
    ? cfg.enabledCalendarIds
    : ['primary'];

  const results = await Promise.allSettled(
    calendarIds.map(id => fetchCalendarEvents(id, timeMin, timeMax))
  );

  const events: GoogleCalendarEvent[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') events.push(...r.value);
  }

  // Update last sync
  setGCalConfig({ lastSync: new Date().toISOString() });

  return events;
}

/**
 * Convert a task ID (UUID or any string) to a valid Google Calendar event ID.
 * GCal IDs must be 5-1024 chars, lowercase [a-v0-9].
 * We convert each hex char to its base-32 equivalent (0-9a-f → 0-9a-f, which are all valid).
 */
export function taskIdToGCalId(taskId: string): string {
  // Strip non-hex chars, lowercase, prefix with 'mc' to namespace
  const hex = taskId.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  return `mc${hex}`.slice(0, 1024);
}

/**
 * Create a new event in Google Calendar.
 * If `deterministicId` is provided, it's set as the event ID to prevent duplicates.
 * On 409 Conflict (already exists), returns the existing event instead of failing.
 */
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
  if (deterministicId) {
    body.id = deterministicId;
  }

  const resp = await gcalFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  // 409 = event with this ID already exists — update it instead (e.g. to add recurrence)
  if (resp.status === 409 && deterministicId) {
    try {
      const updateResp = await gcalFetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${deterministicId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ ...event }),
        }
      );
      if (updateResp.ok) return updateResp.json();
    } catch { /* fall through */ }
    return { id: deterministicId, summary: event.summary, start: event.start, end: event.end } as GoogleCalendarEvent;
  }

  if (!resp.ok) throw new Error(`Failed to create event: ${resp.statusText}`);
  return resp.json();
}

export async function deleteGCalEvent(eventId: string, calendarId = 'primary'): Promise<boolean> {
  if (!isGCalConnected() || !eventId) return false;

  const resp = await gcalFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
    }
  );

  return resp.ok || resp.status === 404;
}

/**
 * Push a local task as an event to Google Calendar
 */
export async function pushTaskToGCal(task: {
  title: string;
  description?: string;
  dueDate: string;
}): Promise<GoogleCalendarEvent | null> {
  if (!isGCalConnected()) return null;

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

/**
 * Push multiple local tasks to Google Calendar.
 * Returns a map of localTaskId → gcalEventId for tasks that were created.
 */
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
  if (!isGCalConnected()) return new Map();

  // Lazy import to avoid circular deps
  const { toRRule } = await import('@/lib/recurrence');

  const results = new Map<string, string>();

  for (const task of tasks) {
    // Skip tasks with non-deterministic GCal IDs (already confirmed in GCal)
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

      // Add recurrence rule if task is recurring
      if (task.recurring && task.recurringInterval) {
        const rrule = toRRule(task as any);
        if (rrule) {
          eventBody.recurrence = [rrule];
        }
      }

      // Use deterministic ID derived from task ID — prevents duplicates on re-push
      const deterministicId = taskIdToGCalId(task.id);
      const created = await createGCalEvent('primary', eventBody, deterministicId);
      if (created?.id) {
        results.set(task.id, created.id);
      }
    } catch (e) {
      console.error(`Failed to push task "${task.title}" to GCal:`, e);
    }
  }

  return results;
}

// ─── Cached events store (in-memory) ────────────────────────────────────────────

let cachedEvents: GoogleCalendarEvent[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export function getCachedGCalEvents(): GoogleCalendarEvent[] {
  return cachedEvents;
}

export async function syncGCalEvents(
  timeMin: string,
  timeMax: string,
  forceRefresh = false,
): Promise<GoogleCalendarEvent[]> {
  if (!isGCalConnected()) return [];

  // Use cache if fresh
  if (!forceRefresh && cachedEvents.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedEvents;
  }

  try {
    cachedEvents = await fetchAllEvents(timeMin, timeMax);
    cacheTimestamp = Date.now();
    return cachedEvents;
  } catch (e) {
    console.error('Google Calendar sync error:', e);
    return cachedEvents; // return stale cache
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert a Google Calendar event to a format compatible with CalendarPage CalEvent
 */
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
    // Google all-day end dates are exclusive, so subtract 1 day
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
