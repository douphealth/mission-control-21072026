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

const INK = '#0b1220'
const MUTED = '#6b7c93'
const LINE = '#e6ebf2'
const EMERALD = '#0f9d76'

const PRIORITY: Record<string, { bg: string; fg: string; bar: string }> = {
  critical: { bg: '#fee2e2', fg: '#b42318', bar: '#e0342a' },
  high: { bg: '#ffedd5', fg: '#b54708', bar: '#f07c1a' },
  medium: { bg: '#e0f2fe', fg: '#026aa2', bar: '#2e90fa' },
  low: { bg: '#ecfdf5', fg: '#067a5c', bar: '#12b886' },
}
const tone = (p?: string) => PRIORITY[(p || 'low').toLowerCase()] || PRIORITY['low']!

const weekday = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
const shortDate = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
const greeting = () => 'Good morning'

/** Simple table-based progress bar — renders everywhere, no CSS tricks. */
const Meter = ({ pct, color }: { pct: number; color: string }) => {
  const p = Math.max(2, Math.min(100, Math.round(pct)))
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={meterOuter}>
      <tbody>
        <tr>
          <td
            style={{
              width: `${p}%`,
              backgroundColor: color,
              height: '8px',
              borderRadius: '999px',
              fontSize: '1px',
              lineHeight: '8px',
            }}
          >
            &nbsp;
          </td>
          <td style={{ height: '8px', fontSize: '1px', lineHeight: '8px' }}>&nbsp;</td>
        </tr>
      </tbody>
    </table>
  )
}

const StatTile = ({
  value,
  label,
  color,
  bg,
}: {
  value: number | string
  label: string
  color: string
  bg: string
}) => (
  <Column style={tileWrap}>
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td style={{ ...tile, backgroundColor: bg }}>
            <Text style={{ ...tileValue, color }}>{value}</Text>
            <Text style={tileLabel}>{label}</Text>
          </td>
        </tr>
      </tbody>
    </table>
  </Column>
)

const TaskCard = ({ task, index }: { task: DigestTask; index: number }) => {
  const t = tone(task.priority)
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={cardTable}>
      <tbody>
        <tr>
          <td style={{ ...accentCol, backgroundColor: t.bar }}>&nbsp;</td>
          <td style={cardBody}>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={numCell}>
                    <span style={{ ...numBadge, backgroundColor: t.bg, color: t.fg }}>{index}</span>
                  </td>
                  <td>
                    <Text style={taskTitle}>{task.title}</Text>
                    <Text style={metaLine}>
                      <span style={{ ...pill, backgroundColor: t.bg, color: t.fg }}>
                        {(task.priority || 'low').toUpperCase()}
                      </span>
                      <span style={metaText}>
                        {task.dueDate ? shortDate(task.dueDate) : 'No due date'}
                        {task.startTime ? ` · ${task.startTime}` : ''}
                      </span>
                      {task.daysOverdue ? (
                        <span style={overduePill}>{task.daysOverdue}d late</span>
                      ) : null}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const Group = ({
  title,
  hint,
  tasks,
  accent,
  emoji,
}: {
  title: string
  hint: string
  tasks: DigestTask[]
  accent: string
  emoji: string
}) =>
  tasks.length ? (
    <Section style={group}>
      <Text style={{ ...groupTitle, color: accent }}>
        <span style={groupEmoji}>{emoji}</span>
        {title}
        <span style={groupCount}>{tasks.length}</span>
      </Text>
      <Text style={groupHint}>{hint}</Text>
      {tasks.map((t, i) => (
        <TaskCard key={`${t.title}-${i}`} task={t} index={i + 1} />
      ))}
    </Section>
  ) : null

const SEVERITY: Record<string, { bg: string; border: string; fg: string; tag: string; icon: string }> = {
  high: { bg: '#fff5f4', border: '#fecdca', fg: '#912018', tag: '#e0342a', icon: '▲' },
  medium: { bg: '#fffaeb', border: '#fedf89', fg: '#93370d', tag: '#dc6803', icon: '●' },
  low: { bg: '#f2fdf8', border: '#a6f4d0', fg: '#05603a', tag: '#12b886', icon: '✓' },
}

const IssueRow = ({ issue }: { issue: DigestIssue }) => {
  const s = SEVERITY[issue.severity || 'low'] || SEVERITY['low']!
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: '0 0 10px' }}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: '14px',
              padding: '13px 16px',
            }}
          >
            <Text style={{ ...issueLabel, color: s.fg }}>
              <span style={{ color: s.tag, marginRight: '8px' }}>{s.icon}</span>
              {issue.label}
            </Text>
            {issue.detail ? (
              <Text style={{ ...issueDetail, color: s.fg }}>{issue.detail}</Text>
            ) : null}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const DoneList = ({ tasks }: { tasks: DigestTask[] }) =>
  tasks.length ? (
    <Section style={group}>
      <Text style={{ ...groupTitle, color: '#05603a' }}>
        <span style={groupEmoji}>🏆</span>
        Completed
        <span style={groupCount}>{tasks.length}</span>
      </Text>
      <Text style={groupHint}>Wins from the last 24 hours — momentum you already earned.</Text>
      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={doneBox}>
        <tbody>
          {tasks.map((t, i) => (
            <tr key={`${t.title}-${i}`}>
              <td style={doneCheckCell}>✓</td>
              <td style={doneTextCell}>{t.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const load = overdue.length + dueToday.length
  const settled = completedToday + load
  const clearedPct = settled ? (completedToday / settled) * 100 : 100
  const healthColor = overdue.length >= 5 ? '#e0342a' : overdue.length ? '#f07c1a' : EMERALD

  const headline = clear
    ? 'You are all clear today'
    : overdue.length
      ? `${overdue.length} task${overdue.length === 1 ? '' : 's'} slipped past due`
      : `${dueToday.length} task${dueToday.length === 1 ? '' : 's'} on deck today`

  const subline = clear
    ? `Nothing overdue, nothing due. ${dueTomorrow.length} lined up for tomorrow.`
    : `Clear ${load} item${load === 1 ? '' : 's'} today and you end the day at zero.`

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
          {/* ── Hero ─────────────────────────────────────────────── */}
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={heroTable}>
            <tbody>
              <tr>
                <td style={hero}>
                  <Text style={kicker}>◆ MISSION CONTROL · DAILY BRIEFING</Text>
                  <Heading style={h1}>
                    {greeting()}. {headline}.
                  </Heading>
                  <Text style={dateLine}>{weekday(date) || date}</Text>
                  <Text style={subLine}>{subline}</Text>

                  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginTop: '18px' }}>
                    <tbody>
                      <tr>
                        <td>
                          <Text style={meterLabel}>
                            DAY CLEARED · {Math.round(clearedPct)}%
                          </Text>
                          <Meter pct={clearedPct} color={healthColor} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Scoreboard ───────────────────────────────────────── */}
          <Section style={statsWrap}>
            <Row>
              <StatTile value={overdue.length} label="Overdue" color="#b42318" bg="#fff5f4" />
              <StatTile value={dueToday.length} label="Today" color={INK} bg="#f4f7fb" />
              <StatTile value={completedToday} label="Done today" color="#05603a" bg="#f2fdf8" />
              <StatTile value={totalOpen} label="Open" color="#344054" bg="#f4f7fb" />
            </Row>
            <Row>
              <StatTile value={inProgress} label="In progress" color="#026aa2" bg="#f0f9ff" />
              <StatTile value={dueTomorrow.length} label="Tomorrow" color="#344054" bg="#f4f7fb" />
              <StatTile value={upcoming.length} label="Next 7 days" color="#344054" bg="#f4f7fb" />
              <StatTile value={completedWeek} label="Done / week" color="#05603a" bg="#f2fdf8" />
            </Row>
          </Section>

          {/* ── Focus ────────────────────────────────────────────── */}
          {focus ? (
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: '0 0 28px' }}>
              <tbody>
                <tr>
                  <td style={focusBox}>
                    <Text style={focusLabel}>⚡ START HERE — THE ONE THAT MATTERS MOST</Text>
                    <Text style={focusTitle}>{focus.title}</Text>
                    <Text style={focusMeta}>
                      {(focus.priority || 'low').toUpperCase()} priority
                      {focus.dueDate ? ` · ${weekday(focus.dueDate)}` : ''}
                      {focus.daysOverdue ? ` · ${focus.daysOverdue} days late` : ''}
                    </Text>
                    <Button href={`${APP_URL}/?section=focus`} style={cta}>
                      Start a 25-minute focus session →
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: '0 0 28px' }}>
              <tbody>
                <tr>
                  <td style={clearBox}>
                    <Text style={clearEmoji}>🌤️</Text>
                    <Text style={clearTitle}>Inbox zero for your day.</Text>
                    <Text style={clearText}>
                      Nothing overdue, nothing due today. Perfect moment to plan ahead — or take the
                      win and rest.
                    </Text>
                    <Button href={APP_URL} style={cta}>
                      Open Mission Control →
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ── Issues ───────────────────────────────────────────── */}
          {issues.length ? (
            <Section style={group}>
              <Text style={{ ...groupTitle, color: INK }}>
                <span style={groupEmoji}>🚨</span>
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
            accent="#b42318"
            emoji="🔥"
          />
          <Group
            title="Due today"
            hint="Your realistic scope for the day."
            tasks={dueToday}
            accent={INK}
            emoji="🎯"
          />
          <Group
            title="Coming tomorrow"
            hint="Preview only — nothing to do yet."
            tasks={dueTomorrow}
            accent="#344054"
            emoji="🌅"
          />
          <Group
            title="Rest of the week"
            hint="Scheduled within the next 7 days."
            tasks={upcoming}
            accent="#344054"
            emoji="🗓️"
          />
          <DoneList tasks={completed} />
          <Group
            title="Unscheduled backlog"
            hint="Open work with no date — give the important ones a due date."
            tasks={backlog}
            accent="#6941c6"
            emoji="📥"
          />

          {/* ── Quick actions ────────────────────────────────────── */}
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={actionsBox}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center' as const, padding: '18px 16px' }}>
                  <Text style={actionsTitle}>Jump straight in</Text>
                  <Button href={`${APP_URL}/?section=tasks`} style={ctaGhost}>
                    All tasks
                  </Button>
                  <Button href={`${APP_URL}/?section=review`} style={ctaGhost}>
                    Review
                  </Button>
                  <Button href={`${APP_URL}/?section=calendar`} style={ctaGhost}>
                    Calendar
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>

          <Hr style={hr} />
          <Text style={footer}>
            Daily briefing from{' '}
            <Link href={APP_URL} style={footerLink}>
              Mission Control
            </Link>
            {' · '}delivered every morning at 07:00
          </Text>
          <Text style={footerFine}>You receive this because you own this workspace.</Text>
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
    date: '2026-08-26',
    completedToday: 3,
    completedWeek: 11,
    totalOpen: 14,
    inProgress: 2,
    issues: [
      { label: '1 critical task overdue', detail: 'Renew SSL certificate', severity: 'high' },
      {
        label: '2 bills due this week',
        detail: 'Electricity €84.20 · Κοινόχρηστα €45.00',
        severity: 'medium',
      },
    ],
    completed: [{ title: 'Ship dashboard redesign' }, { title: 'Reply to hosting support' }],
    upcoming: [{ title: 'Client call prep', priority: 'high', dueDate: '2026-08-29' }],
    backlog: [{ title: 'Refactor import engine', priority: 'medium' }],
    overdue: [
      { title: 'Renew SSL certificate', priority: 'critical', dueDate: '2026-08-17', daysOverdue: 9 },
      { title: 'Send invoice to client', priority: 'high', dueDate: '2026-08-24', daysOverdue: 2 },
    ],
    dueToday: [
      { title: 'Publish blog post', priority: 'medium', dueDate: '2026-08-26', startTime: '15:00' },
    ],
    dueTomorrow: [{ title: 'Weekly review', priority: 'low', dueDate: '2026-08-27' }],
  },
} satisfies TemplateEntry

// ─── styles ──────────────────────────────────────────────────────────────────
const main = {
  backgroundColor: '#eef2f7',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '24px 0 32px',
}
const shell = {
  maxWidth: '620px',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '22px',
  padding: '10px 22px 26px',
  margin: '0 auto',
}

const heroTable = { margin: '0 0 20px' }
const hero = {
  backgroundColor: '#0b1220',
  backgroundImage: 'linear-gradient(135deg, #0b1220 0%, #10312b 100%)',
  borderRadius: '20px',
  padding: '26px 24px 24px',
}
const kicker = {
  fontSize: '10px',
  letterSpacing: '2.6px',
  color: '#5eead4',
  fontWeight: 'bold' as const,
  margin: '0 0 12px',
}
const h1 = {
  fontSize: '27px',
  lineHeight: '34px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0 0 8px',
  letterSpacing: '-0.5px',
}
const dateLine = { fontSize: '12px', color: '#8ba3b8', margin: '0 0 10px' }
const subLine = { fontSize: '14px', lineHeight: '21px', color: '#cbd8e4', margin: '0' }
const meterLabel = {
  fontSize: '10px',
  letterSpacing: '1.8px',
  fontWeight: 'bold' as const,
  color: '#8ba3b8',
  margin: '0 0 7px',
}
const meterOuter = {
  backgroundColor: 'rgba(255,255,255,0.14)',
  borderRadius: '999px',
  height: '8px',
}

const statsWrap = { margin: '0 0 22px' }
const tileWrap = { width: '25%', padding: '0 4px 8px' }
const tile = {
  borderRadius: '14px',
  border: `1px solid ${LINE}`,
  padding: '13px 6px',
  textAlign: 'center' as const,
}
const tileValue = { fontSize: '25px', fontWeight: 'bold' as const, margin: '0 0 3px', lineHeight: '28px' }
const tileLabel = {
  fontSize: '9px',
  letterSpacing: '1.1px',
  textTransform: 'uppercase' as const,
  color: MUTED,
  margin: '0',
  fontWeight: 'bold' as const,
}

const focusBox = {
  backgroundColor: '#0b1220',
  backgroundImage: 'linear-gradient(135deg, #101a2c 0%, #0b1220 100%)',
  borderRadius: '18px',
  padding: '22px 24px',
}
const focusLabel = {
  fontSize: '10px',
  letterSpacing: '1.8px',
  color: '#5eead4',
  fontWeight: 'bold' as const,
  margin: '0 0 10px',
}
const focusTitle = {
  fontSize: '20px',
  lineHeight: '27px',
  color: '#ffffff',
  fontWeight: 'bold' as const,
  margin: '0 0 7px',
}
const focusMeta = { fontSize: '12px', color: '#8ba3b8', margin: '0 0 18px' }

const clearBox = {
  backgroundColor: '#f2fdf8',
  border: '1px solid #a6f4d0',
  borderRadius: '18px',
  padding: '26px 22px',
  textAlign: 'center' as const,
}
const clearEmoji = { fontSize: '30px', margin: '0 0 6px' }
const clearTitle = { fontSize: '18px', color: '#05603a', fontWeight: 'bold' as const, margin: '0 0 6px' }
const clearText = { fontSize: '13px', lineHeight: '20px', color: '#067a5c', margin: '0 0 18px' }

const cta = {
  backgroundColor: EMERALD,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const ctaGhost = {
  backgroundColor: '#ffffff',
  border: `1px solid ${LINE}`,
  color: INK,
  fontSize: '12px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '10px 16px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 4px',
}

const group = { margin: '0 0 28px' }
const groupTitle = {
  fontSize: '13px',
  letterSpacing: '1.3px',
  textTransform: 'uppercase' as const,
  fontWeight: 'bold' as const,
  margin: '0 0 3px',
}
const groupEmoji = { marginRight: '8px' }
const groupCount = {
  display: 'inline-block',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  borderRadius: '999px',
  fontSize: '11px',
  padding: '1px 9px',
  marginLeft: '8px',
}
const groupHint = { fontSize: '12px', color: MUTED, margin: '0 0 13px' }

const cardTable = {
  margin: '0 0 10px',
  borderRadius: '14px',
  border: `1px solid ${LINE}`,
  overflow: 'hidden' as const,
  backgroundColor: '#ffffff',
}
const accentCol = { width: '5px', fontSize: '1px', lineHeight: '1px' }
const cardBody = { padding: '13px 16px' }
const numCell = { width: '34px', verticalAlign: 'top' as const, paddingTop: '2px' }
const numBadge = {
  display: 'inline-block',
  minWidth: '20px',
  textAlign: 'center' as const,
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 'bold' as const,
  padding: '3px 6px',
}
const taskTitle = {
  fontSize: '15px',
  lineHeight: '21px',
  color: INK,
  fontWeight: 'bold' as const,
  margin: '0 0 7px',
}
const metaLine = { fontSize: '11px', margin: '0' }
const metaText = { color: MUTED, marginRight: '8px' }
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
  backgroundColor: '#e0342a',
  color: '#ffffff',
  fontSize: '9px',
  fontWeight: 'bold' as const,
  borderRadius: '999px',
  padding: '3px 8px',
}

const issueLabel = { fontSize: '14px', fontWeight: 'bold' as const, margin: '0 0 4px' }
const issueDetail = { fontSize: '12px', lineHeight: '18px', margin: '0', opacity: 0.85 }

const doneBox = {
  backgroundColor: '#f2fdf8',
  border: '1px solid #a6f4d0',
  borderRadius: '14px',
  padding: '6px 14px',
}
const doneCheckCell = {
  width: '20px',
  color: '#12b886',
  fontWeight: 'bold' as const,
  fontSize: '13px',
  padding: '6px 0',
  verticalAlign: 'top' as const,
}
const doneTextCell = {
  fontSize: '14px',
  color: '#05603a',
  padding: '6px 0',
  textDecoration: 'line-through',
}

const actionsBox = {
  backgroundColor: '#f7f9fc',
  border: `1px solid ${LINE}`,
  borderRadius: '16px',
  margin: '0 0 6px',
}
const actionsTitle = {
  fontSize: '10px',
  letterSpacing: '1.8px',
  textTransform: 'uppercase' as const,
  color: MUTED,
  fontWeight: 'bold' as const,
  margin: '0 0 12px',
}

const hr = { borderColor: LINE, margin: '22px 0 12px' }
const footer = { fontSize: '11px', color: MUTED, margin: '0 0 4px', textAlign: 'center' as const }
const footerFine = { fontSize: '10px', color: '#9aa8b8', margin: '0', textAlign: 'center' as const }
const footerLink = { color: EMERALD, textDecoration: 'none' }
