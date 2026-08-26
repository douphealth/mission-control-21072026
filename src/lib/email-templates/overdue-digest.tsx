import * as React from 'react'

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
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

export interface DigestIssue {
  label: string
  detail?: string
  severity?: 'high' | 'medium' | 'low'
}

interface OverdueDigestProps {
  date?: string
  overdue?: DigestTask[]
  dueToday?: DigestTask[]
  dueTomorrow?: DigestTask[]
  upcoming?: DigestTask[]
  backlog?: DigestTask[]
  completed?: DigestTask[]
  completedToday?: number
  completedWeek?: number
  totalOpen?: number
  inProgress?: number
  issues?: DigestIssue[]
}

const APP_URL = 'https://mission-control-001.lovable.app'

const PRIORITY: Record<string, { bg: string; fg: string; bar: string }> = {
  critical: { bg: '#fee2e2', fg: '#b91c1c', bar: '#dc2626' },
  high: { bg: '#ffedd5', fg: '#c2410c', bar: '#ea580c' },
  medium: { bg: '#e0f2fe', fg: '#0369a1', bar: '#0284c7' },
  low: { bg: '#ecfdf5', fg: '#047857', bar: '#10b981' },
}

const tone = (p?: string) => PRIORITY[(p || 'low').toLowerCase()] || PRIORITY['low']!

const weekday = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

const Stat = ({
  value,
  label,
  color,
}: {
  value: number | string
  label: string
  color: string
}) => (
  <Column style={statCell}>
    <Text style={{ ...statValue, color }}>{value}</Text>
    <Text style={statLabel}>{label}</Text>
  </Column>
)

const TaskCard = ({ task, index }: { task: DigestTask; index: number }) => {
  const t = tone(task.priority)
  return (
    <Section style={{ ...card, borderLeft: `4px solid ${t.bar}` }}>
      <Row>
        <Column style={numCell}>
          <Text style={num}>{index}</Text>
        </Column>
        <Column>
          <Text style={taskTitle}>{task.title}</Text>
          <Text style={metaLine}>
            <span style={{ ...pill, backgroundColor: t.bg, color: t.fg }}>
              {(task.priority || 'low').toUpperCase()}
            </span>
            <span style={metaText}>
              {task.dueDate ? weekday(task.dueDate) : 'No due date'}
              {task.startTime ? ` · ${task.startTime}` : ''}
            </span>
            {task.daysOverdue ? (
              <span style={overduePill}>
                {task.daysOverdue}d late
              </span>
            ) : null}
          </Text>
        </Column>
      </Row>
    </Section>
  )
}

const Group = ({
  title,
  hint,
  tasks,
  accent,
}: {
  title: string
  hint: string
  tasks: DigestTask[]
  accent: string
}) =>
  tasks.length ? (
    <Section style={group}>
      <Text style={{ ...groupTitle, color: accent }}>
        {title}
        <span style={groupCount}>{tasks.length}</span>
      </Text>
      <Text style={groupHint}>{hint}</Text>
      {tasks.map((t, i) => (
        <TaskCard key={`${t.title}-${i}`} task={t} index={i + 1} />
      ))}
    </Section>
  ) : null

const SEVERITY: Record<string, { bg: string; border: string; fg: string; tag: string }> = {
  high: { bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', tag: '#dc2626' },
  medium: { bg: '#fffbeb', border: '#fde68a', fg: '#92400e', tag: '#d97706' },
  low: { bg: '#f0fdf4', border: '#bbf7d0', fg: '#166534', tag: '#16a34a' },
}

const IssueRow = ({ issue }: { issue: DigestIssue }) => {
  const s = SEVERITY[issue.severity || 'low'] || SEVERITY['low']!
  return (
    <Section
      style={{
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: '12px',
        padding: '12px 14px',
        margin: '0 0 10px',
      }}
    >
      <Text style={{ ...issueLabel, color: s.fg }}>
        <span style={{ ...dot, backgroundColor: s.tag }} />
        {issue.label}
      </Text>
      {issue.detail ? <Text style={{ ...issueDetail, color: s.fg }}>{issue.detail}</Text> : null}
    </Section>
  )
}

const DoneList = ({ tasks }: { tasks: DigestTask[] }) =>
  tasks.length ? (
    <Section style={group}>
      <Text style={{ ...groupTitle, color: '#047857' }}>
        Completed today
        <span style={groupCount}>{tasks.length}</span>
      </Text>
      <Text style={groupHint}>Wins from the last 24 hours — momentum you already earned.</Text>
      <Section style={doneBox}>
        {tasks.map((t, i) => (
          <Text key={`${t.title}-${i}`} style={doneItem}>
            <span style={check}>✓</span>
            <span style={doneText}>{t.title}</span>
          </Text>
        ))}
      </Section>
    </Section>
  ) : null

export const OverdueDigestEmail = ({
  date = '',
  overdue = [],
  dueToday = [],
  dueTomorrow = [],
  upcoming = [],
  backlog = [],
  completed = [],
  completedToday = 0,
  completedWeek = 0,
  totalOpen = 0,
  inProgress = 0,
  issues = [],
}: OverdueDigestProps) => {
  const clear = overdue.length === 0 && dueToday.length === 0
  const focus = [...overdue, ...dueToday][0]
  const headline = clear
    ? 'You are all clear today'
    : overdue.length
      ? `${overdue.length} task${overdue.length === 1 ? '' : 's'} slipped past due`
      : `${dueToday.length} task${dueToday.length === 1 ? '' : 's'} on deck today`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {clear
          ? `All clear — ${dueTomorrow.length} lined up for tomorrow`
          : `${overdue.length} overdue · ${dueToday.length} due today${focus ? ` · start with: ${focus.title}` : ''}`}
      </Preview>
      <Body style={main}>
        <Container style={shell}>
          {/* Header */}
          <Section style={header}>
            <Text style={kicker}>MISSION CONTROL</Text>
            <Heading style={h1}>{headline}</Heading>
            <Text style={dateLine}>{weekday(date) || date}</Text>
          </Section>

          {/* Stats */}
          <Section style={statsBox}>
            <Row>
              <Stat value={overdue.length} label="Overdue" color="#dc2626" />
              <Stat value={dueToday.length} label="Today" color="#0f172a" />
              <Stat value={completedToday} label="Done today" color="#059669" />
              <Stat value={totalOpen} label="Open" color="#475569" />
            </Row>
            <Hr style={statsDivider} />
            <Row>
              <Stat value={inProgress} label="In progress" color="#0284c7" />
              <Stat value={dueTomorrow.length} label="Tomorrow" color="#475569" />
              <Stat value={upcoming.length} label="Next 7 days" color="#475569" />
              <Stat value={completedWeek} label="Done / week" color="#059669" />
            </Row>
          </Section>

          {/* Focus */}
          {focus ? (
            <Section style={focusBox}>
              <Text style={focusLabel}>START HERE</Text>
              <Text style={focusTitle}>{focus.title}</Text>
              <Text style={focusMeta}>
                {(focus.priority || 'low').toUpperCase()} priority
                {focus.dueDate ? ` · ${weekday(focus.dueDate)}` : ''}
                {focus.daysOverdue ? ` · ${focus.daysOverdue} days late` : ''}
              </Text>
              <Button href={`${APP_URL}/?section=focus`} style={cta}>
                Start a focus session
              </Button>
            </Section>
          ) : (
            <Section style={clearBox}>
              <Text style={clearTitle}>Nothing overdue. Nothing due today.</Text>
              <Text style={clearText}>
                Perfect moment to plan ahead or take the win and rest.
              </Text>
              <Button href={APP_URL} style={cta}>
                Open Mission Control
              </Button>
            </Section>
          )}

          {issues.length ? (
            <Section style={group}>
              <Text style={{ ...groupTitle, color: '#0f172a' }}>
                Major points &amp; issues
                <span style={groupCount}>{issues.length}</span>
              </Text>
              <Text style={groupHint}>What actually needs a decision from you today.</Text>
              {issues.map((issue, i) => (
                <IssueRow key={`${issue.label}-${i}`} issue={issue} />
              ))}
            </Section>
          ) : null}

          <Group
            title="Overdue"
            hint="Oldest and highest priority first — clear or reschedule these."
            tasks={overdue}
            accent="#b91c1c"
          />
          <Group
            title="Due today"
            hint="Your realistic scope for the day."
            tasks={dueToday}
            accent="#0f172a"
          />
          <Group
            title="Coming tomorrow"
            hint="Preview only — nothing to do yet."
            tasks={dueTomorrow}
            accent="#475569"
          />
          <Group
            title="Rest of the week"
            hint="Scheduled within the next 7 days."
            tasks={upcoming}
            accent="#475569"
          />
          <DoneList tasks={completed} />
          <Group
            title="Unscheduled backlog"
            hint="Open work with no date — give the important ones a due date."
            tasks={backlog}
            accent="#7c3aed"
          />

          <Section style={{ textAlign: 'center' as const, margin: '4px 0 8px' }}>
            <Button href={`${APP_URL}/?section=tasks`} style={ctaGhost}>
              Open all tasks
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Daily digest from{' '}
            <Link href={APP_URL} style={footerLink}>
              Mission Control
            </Link>
            {' · '}sent every morning at 07:00
          </Text>
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
    const done = (data['completedToday'] as number | undefined) ?? 0
    const first =
      ((data['overdue'] as DigestTask[] | undefined)?.[0] ??
        (data['dueToday'] as DigestTask[] | undefined)?.[0])?.title ?? ''
    const head = overdue
      ? `${overdue} overdue · ${today} due today`
      : today
        ? `${today} due today`
        : 'All clear today'
    return `Daily briefing — ${head}${done ? ` · ${done} done` : ''}${first ? ` — start with “${first}”` : ''}`
  },
  displayName: 'Daily briefing',
  // Fixed recipient — this digest only ever goes to the account owner.
  to: 'papalexios@gmail.com',
  previewData: {
    date: '2026-08-20',
    completedToday: 3,
    completedWeek: 11,
    totalOpen: 14,
    inProgress: 2,
    issues: [
      { label: '1 critical task overdue', detail: 'Renew SSL certificate', severity: 'high' },
      { label: '2 bills due this week', detail: 'Electricity €84.20 · Κοινόχρηστα €45.00', severity: 'medium' },
    ],
    completed: [{ title: 'Ship dashboard redesign' }, { title: 'Reply to hosting support' }],
    upcoming: [{ title: 'Client call prep', priority: 'high', dueDate: '2026-08-24' }],
    backlog: [{ title: 'Refactor import engine', priority: 'medium' }],
    overdue: [
      { title: 'Renew SSL certificate', priority: 'critical', dueDate: '2026-08-11', daysOverdue: 9 },
      { title: 'Send invoice to client', priority: 'high', dueDate: '2026-08-18', daysOverdue: 2 },
    ],
    dueToday: [{ title: 'Publish blog post', priority: 'medium', dueDate: '2026-08-20', startTime: '15:00' }],
    dueTomorrow: [{ title: 'Weekly review', priority: 'low', dueDate: '2026-08-21' }],
  },
} satisfies TemplateEntry

// ─── styles ──────────────────────────────────────────────────────────────────
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '0',
}
const shell = { maxWidth: '600px', padding: '28px 22px 32px', margin: '0 auto' }

const header = { padding: '0 0 18px' }
const kicker = {
  fontSize: '11px',
  letterSpacing: '2.5px',
  color: '#059669',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
}
const h1 = {
  fontSize: '26px',
  lineHeight: '32px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 6px',
}
const dateLine = { fontSize: '13px', color: '#64748b', margin: '0' }

const statsBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '16px 8px',
  margin: '0 0 18px',
}
const statCell = { textAlign: 'center' as const, width: '25%' }
const statValue = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0 0 2px' }
const statLabel = {
  fontSize: '10px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: '#94a3b8',
  margin: '0',
  fontWeight: 'bold' as const,
}

const focusBox = {
  backgroundColor: '#0f172a',
  borderRadius: '16px',
  padding: '20px 22px',
  margin: '0 0 26px',
}
const focusLabel = {
  fontSize: '10px',
  letterSpacing: '2px',
  color: '#34d399',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
}
const focusTitle = {
  fontSize: '19px',
  lineHeight: '26px',
  color: '#ffffff',
  fontWeight: 'bold' as const,
  margin: '0 0 6px',
}
const focusMeta = { fontSize: '12px', color: '#94a3b8', margin: '0 0 16px' }

const clearBox = {
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  borderRadius: '16px',
  padding: '22px',
  margin: '0 0 26px',
  textAlign: 'center' as const,
}
const clearTitle = { fontSize: '17px', color: '#065f46', fontWeight: 'bold' as const, margin: '0 0 6px' }
const clearText = { fontSize: '13px', color: '#047857', margin: '0 0 16px' }

const cta = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const ctaGhost = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#0f172a',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '11px 20px',
  textDecoration: 'none',
  display: 'inline-block',
}

const group = { margin: '0 0 26px' }
const groupTitle = {
  fontSize: '13px',
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const,
  fontWeight: 'bold' as const,
  margin: '0 0 2px',
}
const groupCount = {
  display: 'inline-block',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  borderRadius: '999px',
  fontSize: '11px',
  padding: '1px 8px',
  marginLeft: '8px',
}
const groupHint = { fontSize: '12px', color: '#94a3b8', margin: '0 0 12px' }

const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '12px 14px',
  margin: '0 0 10px',
}
const numCell = { width: '30px', verticalAlign: 'top' as const }
const num = { fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold' as const, margin: '0' }
const taskTitle = {
  fontSize: '15px',
  lineHeight: '21px',
  color: '#0f172a',
  fontWeight: 'bold' as const,
  margin: '0 0 6px',
}
const metaLine = { fontSize: '11px', margin: '0' }
const metaText = { color: '#64748b', marginRight: '8px' }
const pill = {
  display: 'inline-block',
  fontSize: '9px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.6px',
  borderRadius: '999px',
  padding: '3px 8px',
  marginRight: '8px',
}
const overduePill = {
  display: 'inline-block',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  fontSize: '9px',
  fontWeight: 'bold' as const,
  borderRadius: '999px',
  padding: '3px 8px',
}

const statsDivider = { borderColor: '#e2e8f0', margin: '14px 8px' }
const issueLabel = { fontSize: '14px', fontWeight: 'bold' as const, margin: '0 0 4px' }
const issueDetail = { fontSize: '12px', margin: '0', opacity: 0.85 }
const dot = {
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '999px',
  marginRight: '8px',
}
const doneBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '12px',
  padding: '12px 14px',
}
const doneItem = { fontSize: '14px', margin: '0 0 6px', color: '#065f46' }
const check = { color: '#16a34a', fontWeight: 'bold' as const, marginRight: '8px' }
const doneText = { textDecoration: 'line-through', opacity: 0.8 }

const hr = { borderColor: '#e2e8f0', margin: '22px 0 12px' }
const footer = { fontSize: '11px', color: '#94a3b8', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#059669', textDecoration: 'none' }
