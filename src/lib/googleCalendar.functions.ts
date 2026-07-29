import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import {
  createOrUpdateGoogleCalendarEventServer,
  deleteGoogleCalendarEventServer,
  fetchGoogleCalendarEventsServer,
  listGoogleCalendarsServer,
} from '@/lib/googleCalendarGateway.server';

export const listGoogleCalendars = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => listGoogleCalendarsServer());

export const fetchGoogleCalendarEvents = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    calendarId: z.string().min(1).max(512),
    timeMin: z.string().min(10).max(80),
    timeMax: z.string().min(10).max(80),
    maxResults: z.number().int().min(1).max(250).default(250),
  }).parse(input))
  .handler(async ({ data }) => fetchGoogleCalendarEventsServer(data));

export const createOrUpdateGoogleCalendarEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    calendarId: z.string().min(1).max(512).default('primary'),
    deterministicId: z.string().min(1).max(1024).optional(),
    event: z.object({
      summary: z.string().min(1).max(1024),
      description: z.string().max(8192).optional(),
      colorId: z.string().max(8).optional(),
      start: z.object({
        date: z.string().min(10).max(10).optional(),
        dateTime: z.string().min(10).max(80).optional(),
        timeZone: z.string().max(100).optional(),
      }),
      end: z.object({
        date: z.string().min(10).max(10).optional(),
        dateTime: z.string().min(10).max(80).optional(),
        timeZone: z.string().max(100).optional(),
      }),
      recurrence: z.array(z.string().min(1).max(1024)).max(25).optional(),
    }),
  }).parse(input))
  .handler(async ({ data }) => createOrUpdateGoogleCalendarEventServer(data));

export const deleteGoogleCalendarEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    calendarId: z.string().min(1).max(512).default('primary'),
    eventId: z.string().min(1).max(1024),
  }).parse(input))
  .handler(async ({ data }) => deleteGoogleCalendarEventServer(data));