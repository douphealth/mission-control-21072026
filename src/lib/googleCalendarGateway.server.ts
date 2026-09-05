const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";

type CalendarEventBody = {
  summary: string;
  description?: string;
  colorId?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  recurrence?: string[];
};

function credentials() {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const calendarApiKey = process.env.GOOGLE_CALENDAR_API_KEY;

  if (!lovableApiKey || !calendarApiKey) {
    throw new Error("Google Calendar connector is not linked to this project.");
  }

  return { lovableApiKey, calendarApiKey };
}

function calendarPath(path: string): string {
  const clean = path.replace(/^\/+/, "");
  if (!clean.startsWith("calendar/v3/")) {
    throw new Error("Unsupported Google Calendar endpoint.");
  }
  return `/${clean}`;
}

async function gatewayJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { lovableApiKey, calendarApiKey } = credentials();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${lovableApiKey}`);
  headers.set("X-Connection-Api-Key", calendarApiKey);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${GATEWAY_BASE_URL}/${CONNECTOR_ID}${calendarPath(path)}`, {
    ...init,
    headers,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Google Calendar connector request failed (${response.status}): ${text.slice(0, 600)}`,
    );
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function listGoogleCalendarsServer() {
  const calendars: Array<{
    id: string;
    summary: string;
    backgroundColor?: string;
    foregroundColor?: string;
    primary?: boolean;
    selected?: boolean;
  }> = [];
  let pageToken: string | undefined;

  do {
    const qs = new URLSearchParams({ maxResults: "250", showHidden: "true" });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await gatewayJson<{ items?: any[]; nextPageToken?: string }>(
      `calendar/v3/users/me/calendarList?${qs.toString()}`,
    );

    calendars.push(
      ...(data.items || []).map((cal) => ({
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

export async function fetchGoogleCalendarEventsServer(input: {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  maxResults: number;
}) {
  const events: any[] = [];
  let pageToken: string | undefined;

  do {
    const qs = new URLSearchParams({
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      maxResults: String(input.maxResults),
      singleEvents: "true",
      orderBy: "startTime",
    });
    if (pageToken) qs.set("pageToken", pageToken);

    const data = await gatewayJson<{ items?: any[]; nextPageToken?: string }>(
      `calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events?${qs.toString()}`,
    );

    events.push(...(data.items || []).map((event) => ({ ...event, calendarId: input.calendarId })));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
}

export async function createOrUpdateGoogleCalendarEventServer(input: {
  calendarId: string;
  event: CalendarEventBody;
  deterministicId?: string;
}) {
  const calendarId = encodeURIComponent(input.calendarId);
  const deterministicId = input.deterministicId;
  const createBody = deterministicId ? { ...input.event, id: deterministicId } : input.event;

  try {
    return await gatewayJson<any>(`calendar/v3/calendars/${calendarId}/events`, {
      method: "POST",
      body: JSON.stringify(createBody),
    });
  } catch (error: any) {
    if (!deterministicId || !/\(409\)/.test(error?.message || "")) throw error;
    return gatewayJson<any>(
      `calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(deterministicId)}`,
      {
        method: "PUT",
        body: JSON.stringify(input.event),
      },
    );
  }
}

export async function deleteGoogleCalendarEventServer(input: {
  calendarId: string;
  eventId: string;
}) {
  try {
    await gatewayJson<void>(
      `calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  } catch (error: any) {
    // Google returns 404 when the event is absent and 410 when it exists only
    // as a deleted tombstone. Both mean the requested end state is satisfied.
    if (/\((?:404|410)\)/.test(error?.message || "")) return { deleted: true };
    throw error;
  }
}
