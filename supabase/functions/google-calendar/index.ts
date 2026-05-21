// Google Calendar proxy via Lovable Connector Gateway.
// Browser calls this function; this function forwards to the gateway using
// the project's LOVABLE_API_KEY + GOOGLE_CALENDAR_API_KEY (server-side only).
//
// Request body shape:
//   { path: string, method?: string, query?: Record<string,string>, body?: any }
// Where `path` is the Calendar API path *after* /calendar/v3, e.g.
//   "users/me/calendarList"
//   "calendars/primary/events"
//   "calendars/primary/events/<eventId>"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY_BASE = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3';
const FUNCTION_VERSION = '2026-05-21-2';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-GCal-Proxy-Version': FUNCTION_VERSION },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const connectorKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
  if (!lovableKey || !connectorKey) {
    return json(500, {
      error: 'Google Calendar connector not configured on the server',
      detail: { hasLovableKey: !!lovableKey, hasConnectorKey: !!connectorKey },
    });
  }

  let payload: { path?: string; method?: string; query?: Record<string, string>; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const rawPath = (payload.path || '').replace(/^\/+/, '');
  if (!rawPath) return json(400, { error: 'Missing path' });
  // Hard guard against path traversal / absolute URL injection.
  if (rawPath.includes('://') || rawPath.startsWith('//')) {
    return json(400, { error: 'Invalid path' });
  }

  const method = (payload.method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return json(400, { error: `Unsupported method: ${method}` });
  }

  const qs = payload.query ? new URLSearchParams(payload.query).toString() : '';
  const url = `${GATEWAY_BASE}/${rawPath}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${lovableKey}`,
    'X-Connection-Api-Key': connectorKey,
  };
  let bodyInit: BodyInit | undefined;
  if (payload.body !== undefined && method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(payload.body);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { method, headers, body: bodyInit });
  } catch (err) {
    return json(502, { error: 'Upstream fetch failed', detail: (err as Error).message });
  }

  const text = await upstream.text();
  // Pass through status + JSON body when possible.
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

  if (!upstream.ok) {
    return json(upstream.status, {
      error: `Google Calendar API ${upstream.status}`,
      detail: parsed,
    });
  }

  return json(200, parsed);
});
