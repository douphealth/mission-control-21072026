import { createFileRoute } from '@tanstack/react-router';

const GATEWAY_BASE = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3';

async function handle(request: Request) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!LOVABLE_API_KEY) {
    return Response.json({ error: 'LOVABLE_API_KEY is not configured' }, { status: 500 });
  }
  if (!GOOGLE_CALENDAR_API_KEY) {
    return Response.json({ error: 'GOOGLE_CALENDAR_API_KEY is not configured' }, { status: 500 });
  }

  let payload: { path?: string; method?: string; query?: Record<string, string>; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const path = (payload.path || '').replace(/^\/+/, '');
  if (!path) return Response.json({ error: 'Missing path' }, { status: 400 });

  const url = new URL(`${GATEWAY_BASE}/${path}`);
  if (payload.query) {
    for (const [k, v] of Object.entries(payload.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const method = (payload.method || 'GET').toUpperCase();
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_CALENDAR_API_KEY,
      'Content-Type': 'application/json',
    },
  };
  if (payload.body !== undefined && method !== 'GET' && method !== 'DELETE') {
    init.body = JSON.stringify(payload.body);
  }

  const resp = await fetch(url.toString(), init);
  const text = await resp.text();
  return new Response(text || '{}', {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json' },
  });
}

export const Route = createFileRoute('/api/google-calendar')({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
