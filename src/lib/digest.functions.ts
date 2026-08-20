import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const taskSchema = z.object({
  title: z.string().max(300),
  priority: z.string().max(30).optional(),
  dueDate: z.string().max(20).optional(),
  startTime: z.string().max(10).optional(),
  daysOverdue: z.number().optional(),
})

const digestSchema = z.object({
  date: z.string().max(20),
  overdue: z.array(taskSchema).max(200),
  dueToday: z.array(taskSchema).max(200),
  dueTomorrow: z.array(taskSchema).max(200),
  completedToday: z.number(),
})

/**
 * Sends the daily overdue digest. The recipient is fixed by the template
 * (account owner) — the browser can never choose a recipient or template.
 */
export const sendOverdueDigest = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => digestSchema.parse(data))
  .handler(async ({ data }) => {
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
    const result = await sendTemplateEmail('overdue-digest', '', {
      templateData: data,
      idempotencyKey: `overdue-digest-${data.date}-${data.overdue.length}-${data.dueToday.length}`,
    })
    return result
  })
