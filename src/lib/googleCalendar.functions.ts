import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const GATEWAY_BASE = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3';

const InputSchema = z.object({
  path: z.string().min(1).max(500),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  query: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

export const callGoogleCalendar = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const connectorKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!lovableKey || !connectorKey) {
      return {
        ok: false as const,
        status: 500,
        error: 'Google Calendar connector not configured on the server',
      };
    }

    const rawPath = data.path.replace(/^\/+/, '');
    if (rawPath.includes('://') || rawPath.startsWith('//')) {
      return { ok: false as const, status: 400, error: 'Invalid path' };
    }

    const method = data.method || 'GET';
    const qs = data.query ? new URLSearchParams(data.query).toString() : '';
    const url = `${GATEWAY_BASE}/${rawPath}${qs ? `?${qs}` : ''}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': connectorKey,
    };

    let bodyInit: string | undefined;
    if (data.body !== undefined && method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
      bodyInit = JSON.stringify(data.body);
    }

    let upstream: Response;
    try {
      upstream = await fetch(url, { method, headers, body: bodyInit });
    } catch (err) {
      return {
        ok: false as const,
        status: 502,
        error: `Upstream fetch failed: ${(err as Error).message}`,
      };
    }

    const text = await upstream.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw */
    }

    if (!upstream.ok) {
      const errMsg =
        (parsed && typeof parsed === 'object' && 'error' in parsed
          ? (parsed as { error?: { message?: string } }).error?.message
          : null) || `Google Calendar API ${upstream.status}`;
      return { ok: false as const, status: upstream.status, error: errMsg };
    }

    return { ok: true as const, status: 200, data: (parsed ?? null) as any };
  });
