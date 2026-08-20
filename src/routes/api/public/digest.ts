// Public cron endpoint: builds the daily task digest from the user's cloud
// records and emails it. Called by a scheduled job (pg_cron) once a day.
// Security: requires the shared DIGEST_CRON_SECRET.
import { createFileRoute } from '@tanstack/react-router'

interface TaskLike {
  title?: string
  priority?: string
  status?: string
  dueDate?: string
  startTime?: string
  completedAt?: string
}

const RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function isoDay(offsetDays = 0, tz = 'Europe/Bucharest'): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
}

function sortTasks(list: TaskLike[]) {
  return [...list].sort((a, b) => {
    const p = (RANK[a.priority ?? ''] ?? 9) - (RANK[b.priority ?? ''] ?? 9)
    if (p !== 0) return p
    return (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
  })
}

function shape(t: TaskLike, today: string) {
  const due = t.dueDate ? new Date(`${t.dueDate}T00:00:00`).getTime() : 0
  const now = new Date(`${today}T00:00:00`).getTime()
  return {
    title: String(t.title ?? '').slice(0, 300),
    priority: t.priority ?? 'medium',
    dueDate: t.dueDate ?? '',
    startTime: t.startTime ?? '',
    daysOverdue: due ? Math.max(0, Math.round((now - due) / 86_400_000)) : 0,
  }
}

async function run(request: Request) {
  const secret = process.env['DIGEST_CRON_SECRET']
  const provided =
    request.headers.get('x-digest-secret') ??
    new URL(request.url).searchParams.get('secret')
  if (!secret || provided !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await supabaseAdmin
    .from('mc_records')
    .select('data')
    .eq('collection', 'tasks')
    .eq('deleted', false)
    .limit(5000)

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  const tasks: TaskLike[] = (data ?? []).map((r: { data: unknown }) => r.data as TaskLike)
  const today = isoDay(0)
  const tomorrow = isoDay(1)
  const open = tasks.filter((t) => t && t.status !== 'done')

  const overdue = sortTasks(open.filter((t) => t.dueDate && t.dueDate < today))
  const dueToday = sortTasks(open.filter((t) => t.dueDate === today))
  const dueTomorrow = sortTasks(open.filter((t) => t.dueDate === tomorrow))
  const completedToday = tasks.filter(
    (t) => t?.status === 'done' && (t.completedAt || '').slice(0, 10) === today,
  ).length

  if (!overdue.length && !dueToday.length && !dueTomorrow.length) {
    return Response.json({ ok: true, skipped: 'nothing due' })
  }

  const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
  const result = await sendTemplateEmail('overdue-digest', '', {
    templateData: {
      date: today,
      overdue: overdue.slice(0, 200).map((t) => shape(t, today)),
      dueToday: dueToday.slice(0, 200).map((t) => shape(t, today)),
      dueTomorrow: dueTomorrow.slice(0, 200).map((t) => shape(t, today)),
      completedToday,
    },
    idempotencyKey: `overdue-digest-cron-${today}`,
  })

  return Response.json({
    ok: true,
    ...result,
    counts: {
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueTomorrow: dueTomorrow.length,
      completedToday,
    },
  })
}

export const Route = createFileRoute('/api/public/digest')({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
})
