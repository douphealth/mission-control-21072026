import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

export interface DigestTask {
  title: string
  priority?: string
  dueDate?: string
  startTime?: string
  daysOverdue?: number
}

interface OverdueDigestProps {
  date?: string
  overdue?: DigestTask[]
  dueToday?: DigestTask[]
  dueTomorrow?: DigestTask[]
  completedToday?: number
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#0f766e',
  low: '#64748b',
}

const TaskRow = ({ task }: { task: DigestTask }) => (
  <Section style={row}>
    <Text style={taskTitle}>
      <span
        style={{
          ...badge,
          backgroundColor: PRIORITY_COLOR[task.priority || 'low'] || '#64748b',
        }}
      >
        {(task.priority || 'low').toUpperCase()}
      </span>
      {task.title}
    </Text>
    <Text style={taskMeta}>
      {task.dueDate ? `Due ${task.dueDate}` : 'No due date'}
      {task.startTime ? ` at ${task.startTime}` : ''}
      {task.daysOverdue
        ? ` · ${task.daysOverdue} day${task.daysOverdue === 1 ? '' : 's'} overdue`
        : ''}
    </Text>
  </Section>
)

const Group = ({ title, tasks }: { title: string; tasks: DigestTask[] }) =>
  tasks.length ? (
    <Section style={group}>
      <Text style={groupTitle}>
        {title} ({tasks.length})
      </Text>
      {tasks.map((t, i) => (
        <TaskRow key={`${t.title}-${i}`} task={t} />
      ))}
    </Section>
  ) : null

export const OverdueDigestEmail = ({
  date = '',
  overdue = [],
  dueToday = [],
  dueTomorrow = [],
  completedToday = 0,
}: OverdueDigestProps) => {
  const clear = overdue.length === 0 && dueToday.length === 0
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {overdue.length
          ? `${overdue.length} overdue · ${dueToday.length} due today`
          : `${dueToday.length} due today`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>MISSION CONTROL</Text>
          <Heading style={h1}>Daily task digest</Heading>
          <Text style={dateLine}>{date}</Text>

          <Section style={statsBox}>
            <Text style={statLine}>
              <strong style={{ color: '#dc2626' }}>{overdue.length}</strong> overdue
              {'   ·   '}
              <strong>{dueToday.length}</strong> due today
              {'   ·   '}
              <strong>{dueTomorrow.length}</strong> due tomorrow
              {'   ·   '}
              <strong style={{ color: '#059669' }}>{completedToday}</strong> completed today
            </Text>
          </Section>

          {clear ? (
            <Text style={text}>
              Nothing overdue and nothing due today. You are clear. ✅
            </Text>
          ) : null}

          <Group title="Overdue" tasks={overdue} />
          <Group title="Due today" tasks={dueToday} />
          <Group title="Due tomorrow" tasks={dueTomorrow} />

          <Hr style={hr} />
          <Text style={footer}>Sent from Mission Control</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default OverdueDigestEmail

export const template = {
  component: OverdueDigestEmail,
  subject: (data: Record<string, any>) => {
    const overdue = (data['overdue'] as unknown[] | undefined)?.length ?? 0
    const today = (data['dueToday'] as unknown[] | undefined)?.length ?? 0
    const date = (data['date'] as string) || ''
    if (overdue) return `⚠️ ${overdue} overdue task${overdue === 1 ? '' : 's'} — Mission Control ${date}`
    if (today) return `${today} task${today === 1 ? '' : 's'} due today — Mission Control ${date}`
    return `All clear — Mission Control ${date}`
  },
  displayName: 'Overdue task digest',
  // Fixed recipient — this digest only ever goes to the account owner.
  to: 'papalexios@gmail.com',
  previewData: {
    date: '2026-08-20',
    completedToday: 3,
    overdue: [
      { title: 'Renew SSL certificate', priority: 'critical', dueDate: '2026-08-11', daysOverdue: 9 },
      { title: 'Send invoice to client', priority: 'high', dueDate: '2026-08-18', daysOverdue: 2 },
    ],
    dueToday: [{ title: 'Publish blog post', priority: 'medium', dueDate: '2026-08-20', startTime: '15:00' }],
    dueTomorrow: [{ title: 'Weekly review', priority: 'low', dueDate: '2026-08-21' }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const kicker = {
  fontSize: '11px',
  letterSpacing: '2px',
  color: '#059669',
  fontWeight: 'bold' as const,
  margin: '0 0 6px',
}
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 4px' }
const dateLine = { fontSize: '13px', color: '#64748b', margin: '0 0 18px' }
const statsBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '10px',
  padding: '14px 16px',
  margin: '0 0 20px',
}
const statLine = { fontSize: '13px', color: '#334155', margin: '0' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '24px' }
const group = { margin: '0 0 22px' }
const groupTitle = {
  fontSize: '12px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: '#0f172a',
  fontWeight: 'bold' as const,
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: '6px',
  margin: '0 0 10px',
}
const row = {
  borderLeft: '3px solid #e2e8f0',
  paddingLeft: '12px',
  margin: '0 0 12px',
}
const taskTitle = { fontSize: '15px', color: '#0f172a', margin: '0 0 2px', fontWeight: 'bold' as const }
const taskMeta = { fontSize: '12px', color: '#64748b', margin: '0' }
const badge = {
  display: 'inline-block',
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: 'bold' as const,
  borderRadius: '4px',
  padding: '2px 6px',
  marginRight: '8px',
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }
