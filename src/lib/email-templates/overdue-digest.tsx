import * as React from "react";

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
} from "@react-email/components";

import type { TemplateEntry } from "./registry";

export interface DigestTask {
  title: string;
  priority?: string;
  dueDate?: string;
  startTime?: string;
  daysOverdue?: number;
  estimateMin?: number;
}

export interface DigestIssue {
  label: string;
  detail?: string;
  severity?: "high" | "medium" | "low";
  source?: string;
}

interface OverdueDigestProps {
  date?: string;
  overdue?: DigestTask[];
  dueToday?: DigestTask[];
  plannedToday?: DigestTask[];
  dueTomorrow?: DigestTask[];
  upcoming?: DigestTask[];
  backlog?: DigestTask[];
  completed?: DigestTask[];
  completedToday?: number;
  completedWeek?: number;
  totalOpen?: number;
  inProgress?: number;
  highRiskIssues?: number;
  criticalOpen?: number;
  highOpen?: number;
  overdueMinutes?: number;
  dueTodayMinutes?: number;
  plannedTodayMinutes?: number;
  focusMinutes?: number;
  issues?: DigestIssue[];
}

const APP_URL = "https://mission-control-21072026.pages.dev";

const INK = "#0b1220";
const MUTED = "#6b7c93";
const LINE = "#e6ebf2";
const EMERALD = "#0f9d76";

const PRIORITY: Record<string, { bg: string; fg: string; bar: string; rank: number }> = {
  critical: { bg: "#fee2e2", fg: "#b42318", bar: "#e0342a", rank: 0 },
  high: { bg: "#ffedd5", fg: "#b54708", bar: "#f07c1a", rank: 1 },
  medium: { bg: "#e0f2fe", fg: "#026aa2", bar: "#2e90fa", rank: 2 },
  low: { bg: "#ecfdf5", fg: "#067a5c", bar: "#12b886", rank: 3 },
};
const tone = (p?: string) => PRIORITY[(p || "low").toLowerCase()] || PRIORITY["low"]!;

const weekday = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
};
const shortDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

const formatMinutes = (minutes?: number) => {
  const value = Math.max(0, Math.round(minutes || 0));
  if (!value) return "—";
  if (value < 60) return `${value}m`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const issueDestination = (source?: string) => {
  switch (source) {
    case "seo":
      return "seo";
    case "finance":
      return "finance";
    case "reminders":
      return "reminders";
    case "websites":
      return "websites";
    case "github":
      return "github";
    case "projects":
      return "projects";
    case "sync":
    case "validation":
      return "review";
    default:
      return "review";
  }
};

/** Table-based bar — renders in every client, no CSS tricks. */
const Meter = ({ pct, color, track }: { pct: number; color: string; track?: string }) => {
  const p = Math.max(2, Math.min(100, Math.round(pct)));
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ ...meterOuter, backgroundColor: track ?? meterOuter.backgroundColor }}
    >
      <tbody>
        <tr>
          <td
            style={{
              width: `${p}%`,
              backgroundColor: color,
              height: "8px",
              borderRadius: "999px",
              fontSize: "1px",
              lineHeight: "8px",
            }}
          >
            &nbsp;
          </td>
          <td style={{ height: "8px", fontSize: "1px", lineHeight: "8px" }}>&nbsp;</td>
        </tr>
      </tbody>
    </table>
  );
};

const StatTile = ({
  value,
  label,
  color,
  bg,
}: {
  value: number | string;
  label: string;
  color: string;
  bg: string;
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
);

/** One task card: colour-coded spine, rank badge, title, plain-language meta. */
const TaskCard = ({
  task,
  index,
  showOverdue,
}: {
  task: DigestTask;
  index: number;
  showOverdue?: boolean;
}) => {
  const t = tone(task.priority);
  const days = task.daysOverdue ?? 0;
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
                        {(task.priority || "low").toUpperCase()}
                      </span>
                      {task.dueDate && (
                        <span style={metaText}>
                          {showOverdue && days > 0 ? "was due " : "due "}
                          {shortDate(task.dueDate)}
                          {task.startTime ? ` · ${task.startTime}` : ""}
                        </span>
                      )}
                      {task.estimateMin && task.estimateMin > 0 && (
                        <span style={estimatePill}>{formatMinutes(task.estimateMin)}</span>
                      )}
                      {showOverdue && days > 0 && (
                        <span style={overduePill}>
                          {days} day{days === 1 ? "" : "s"} late
                        </span>
                      )}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

const Group = ({
  emoji,
  title,
  hint,
  color,
  tasks,
  showOverdue,
  limit = 8,
}: {
  emoji: string;
  title: string;
  hint: string;
  color: string;
  tasks: DigestTask[];
  showOverdue?: boolean;
  limit?: number;
}) => {
  if (!tasks.length) return null;
  const shown = tasks.slice(0, limit);
  const rest = tasks.length - shown.length;
  return (
    <Section style={group}>
      <Text style={{ ...groupTitle, color }}>
        <span style={groupEmoji}>{emoji}</span>
        {title}
        <span style={groupCount}>{tasks.length}</span>
      </Text>
      <Text style={groupHint}>{hint}</Text>
      {shown.map((t, i) => (
        <TaskCard key={`${title}-${i}`} task={t} index={i + 1} showOverdue={showOverdue} />
      ))}
      {rest > 0 && (
        <Text style={groupHint}>
          + {rest} more in{" "}
          <Link href={`${APP_URL}/?section=tasks`} style={footerLink}>
            Mission Control
          </Link>
        </Text>
      )}
    </Section>
  );
};

export const OverdueDigestEmail = ({
  date,
  overdue = [],
  dueToday = [],
  plannedToday = [],
  dueTomorrow = [],
  upcoming = [],
  backlog = [],
  completed = [],
  completedToday = 0,
  completedWeek = 0,
  totalOpen = 0,
  inProgress = 0,
  highRiskIssues = 0,
  criticalOpen = 0,
  highOpen = 0,
  overdueMinutes = 0,
  dueTodayMinutes = 0,
  plannedTodayMinutes = 0,
  focusMinutes = 0,
  issues = [],
}: OverdueDigestProps) => {
  const allClear = overdue.length === 0 && dueToday.length === 0 && plannedToday.length === 0;

  // Today's real workload, ranked: oldest overdue and highest priority first.
  const plan = [...overdue, ...dueToday, ...plannedToday]
    .sort((a, b) => {
      const p = tone(a.priority).rank - tone(b.priority).rank;
      if (p !== 0) return p;
      return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
    })
    .slice(0, 3);

  const escalations = issues.filter((issue) => issue.severity === "high").slice(0, 3);
  const visibleIssues = issues.slice(0, 8);
  const topOutcome = plan[0];
  const timedCount = [...overdue, ...dueToday, ...plannedToday].filter((task) => task.startTime).length;
  const priorityRisk = criticalOpen + highOpen;
  const focusLabel =
    focusMinutes > 0
      ? formatMinutes(focusMinutes)
      : [overdue, dueToday, plannedToday].flat().some((task) => task.estimateMin)
        ? "0m"
        : "Unestimated";

  const scheduled = [...overdue, ...dueToday, ...plannedToday]
    .filter((t) => !!t.startTime)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
    .slice(0, 6);

  const openLoad =
    totalOpen ||
    overdue.length + dueToday.length + plannedToday.length + dueTomorrow.length + upcoming.length;
  const closedRatio =
    completedWeek + openLoad > 0 ? (completedWeek / (completedWeek + openLoad)) * 100 : 0;

  const mix = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
  [...overdue, ...dueToday, ...plannedToday, ...dueTomorrow, ...upcoming, ...backlog].forEach((t) => {
    const key = (t.priority || "low").toLowerCase();
    if (key in mix) mix[key] = (mix[key] ?? 0) + 1;
  });
  const mixTotal = Object.values(mix).reduce((a, b) => a + b, 0) || 1;

  const verdict = overdue.length
    ? `${overdue.length} task${overdue.length === 1 ? "" : "s"} slipped past their date. Clear the top one first — the rest of the day gets easier.`
    : dueToday.length
      ? `Nothing is late. ${dueToday.length} task${dueToday.length === 1 ? "" : "s"} have a hard deadline today.`
      : plannedToday.length
        ? `No deadlines are burning. ${plannedToday.length} planned task${plannedToday.length === 1 ? "" : "s"} are already on today's execution list.`
        : "Nothing overdue, due, or planned today. Use the free space for the work that actually moves things forward.";

  const previewText = overdue.length
    ? `${overdue.length} overdue · ${dueToday.length} due today · start with “${plan[0]?.title ?? ""}”`
    : dueToday.length
      ? `${dueToday.length} due today · start with “${plan[0]?.title ?? ""}”`
      : plannedToday.length
        ? `${plannedToday.length} planned today · start with “${plan[0]?.title ?? ""}”`
        : `All clear · ${completedWeek} finished this week`;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={shell}>
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={heroTable}>
            <tbody>
              <tr>
                <td style={hero}>
                  <Text style={kicker}>MISSION CONTROL · DAILY BRIEFING</Text>
                  <Heading style={h1}>
                    {allClear
                      ? "You are clear today"
                      : overdue.length
                        ? `${overdue.length} overdue · ${dueToday.length} due today`
                        : dueToday.length
                          ? `${dueToday.length} task${dueToday.length === 1 ? "" : "s"} due today`
                          : `${plannedToday.length} planned for today`}
                  </Heading>
                  <Text style={dateLine}>{weekday(date)}</Text>
                  <Text style={subLine}>{verdict}</Text>

                  <table
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    role="presentation"
                    style={{ marginTop: "18px" }}
                  >
                    <tbody>
                      <tr>
                        <td>
                          <Text style={meterLabel}>
                            MOMENTUM · {completedWeek} CLOSED IN 7 DAYS · {openLoad} STILL OPEN
                          </Text>
                          <Meter pct={closedRatio} color="#5eead4" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Executive pulse ─────────────────────────────────────────── */}
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 20px" }}>
            <tbody>
              <tr>
                <td style={directiveBox}>
                  <Text style={directiveKicker}>YOUR 10-SECOND OPERATING BRIEF</Text>
                  <Text style={directiveTitle}>
                    {topOutcome ? topOutcome.title : "Protect the clear space for high-value work"}
                  </Text>
                  <Text style={directiveText}>
                    {topOutcome
                      ? `Start here. Then clear the next two items before opening lower-priority work.`
                      : "No urgent task is competing for attention. Choose one meaningful outcome and protect a focused block for it."}
                  </Text>
                  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginTop: "16px" }}>
                    <tbody>
                      <tr>
                        <td style={pulseCell}>
                          <Text style={pulseValue}>{focusLabel}</Text>
                          <Text style={pulseLabel}>Estimated focus load</Text>
                        </td>
                        <td style={pulseCell}>
                          <Text style={{ ...pulseValue, color: highRiskIssues ? "#b42318" : "#067a5c" }}>
                            {highRiskIssues}
                          </Text>
                          <Text style={pulseLabel}>High-risk blockers</Text>
                        </td>
                        <td style={pulseCell}>
                          <Text style={{ ...pulseValue, color: priorityRisk ? "#b54708" : INK }}>
                            {priorityRisk}
                          </Text>
                          <Text style={pulseLabel}>Critical / high open</Text>
                        </td>
                        <td style={pulseCell}>
                          <Text style={pulseValue}>{timedCount}</Text>
                          <Text style={pulseLabel}>Timed commitments</Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Scoreboard ───────────────────────────────────────────────── */}
          <Section style={statsWrap}>
            <Row>
              <StatTile value={overdue.length} label="Overdue" color="#b42318" bg="#fff5f5" />
              <StatTile value={dueToday.length} label="Due today" color="#026aa2" bg="#f0f9ff" />
              <StatTile value={dueTomorrow.length} label="Tomorrow" color="#b54708" bg="#fffaf0" />
              <StatTile value={focusLabel} label="Focus load" color="#5925dc" bg="#f6f4ff" />
            </Row>
            <Row>
              <StatTile value={completedToday} label="Done today" color="#067a5c" bg="#f2fdf8" />
              <StatTile value={completedWeek} label="Done / 7d" color="#067a5c" bg="#f2fdf8" />
              <StatTile value={highRiskIssues} label="Blockers" color="#b42318" bg="#fff5f5" />
              <StatTile value={openLoad} label="Open total" color="#334155" bg="#f7f9fc" />
            </Row>
          </Section>

          {/* ── Escalations ──────────────────────────────────────────────── */}
          {escalations.length > 0 && (
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 20px" }}>
              <tbody>
                <tr>
                  <td style={escalationBox}>
                    <Text style={escalationLabel}>HANDLE BEFORE ROUTINE WORK</Text>
                    {escalations.map((issue, index) => (
                      <table key={`escalation-${index}`} width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginBottom: "10px" }}>
                        <tbody>
                          <tr>
                            <td style={planNumCell}>
                              <span style={{ ...planNum, backgroundColor: "#e0342a" }}>{index + 1}</span>
                            </td>
                            <td>
                              <Text style={index === 0 ? focusTitle : planTitle}>{issue.label}</Text>
                              {issue.detail && <Text style={focusMeta}>{issue.detail}</Text>}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ))}
                    <Button href={`${APP_URL}/?section=review`} style={cta}>Resolve the blockers →</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ── The plan ─────────────────────────────────────────────────── */}
          {plan.length > 0 ? (
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={{ margin: "0 0 24px" }}
            >
              <tbody>
                <tr>
                  <td style={focusBox}>
                    <Text style={focusLabel}>DO THESE, IN THIS ORDER</Text>
                    {plan.map((t, i) => (
                      <table
                        key={`plan-${i}`}
                        width="100%"
                        cellPadding={0}
                        cellSpacing={0}
                        role="presentation"
                        style={{ marginBottom: i === plan.length - 1 ? "16px" : "12px" }}
                      >
                        <tbody>
                          <tr>
                            <td style={planNumCell}>
                              <span style={{ ...planNum, backgroundColor: tone(t.priority).bar }}>
                                {i + 1}
                              </span>
                            </td>
                            <td>
                              <Text style={i === 0 ? focusTitle : planTitle}>{t.title}</Text>
                              <Text style={focusMeta}>
                                {(t.priority || "low").toUpperCase()}
                                {t.dueDate ? ` · due ${shortDate(t.dueDate)}` : ""}
                                {t.startTime ? ` · ${t.startTime}` : ""}
                                {(t.daysOverdue ?? 0) > 0 ? ` · ${t.daysOverdue} days late` : ""}
                                {t.estimateMin ? ` · ${formatMinutes(t.estimateMin)}` : ""}
                              </Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ))}
                    <Button href={`${APP_URL}/?section=focus`} style={cta}>
                      Start a focus session →
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={{ margin: "0 0 24px" }}
            >
              <tbody>
                <tr>
                  <td style={clearBox}>
                    <Text style={clearEmoji}>✅</Text>
                    <Text style={clearTitle}>Clean board</Text>
                    <Text style={clearText}>
                      Nothing overdue and nothing due today. {completedWeek} task
                      {completedWeek === 1 ? "" : "s"} closed in the last seven days.
                    </Text>
                    <Button href={`${APP_URL}/?section=review`} style={cta}>
                      Plan the week →
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {(overdueMinutes > 0 || dueTodayMinutes > 0 || plannedTodayMinutes > 0) && (
            <Section style={group}>
              <Text style={{ ...groupTitle, color: INK }}>
                <span style={groupEmoji}>🎯</span>FOCUS LOAD
              </Text>
              <Text style={groupHint}>Estimated work competing for your focused attention today.</Text>
              <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={loadBox}>
                <tbody>
                  <tr>
                    <td style={loadCell}>
                      <Text style={loadValue}>{formatMinutes(overdueMinutes)}</Text>
                      <Text style={loadLabel}>Overdue</Text>
                    </td>
                    <td style={loadCell}>
                      <Text style={loadValue}>{formatMinutes(dueTodayMinutes)}</Text>
                      <Text style={loadLabel}>Due today</Text>
                    </td>
                    <td style={loadCell}>
                      <Text style={loadValue}>{formatMinutes(plannedTodayMinutes)}</Text>
                      <Text style={loadLabel}>Planned today</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Today's timeline ─────────────────────────────────────────── */}
          {scheduled.length > 0 && (
            <Section style={group}>
              <Text style={{ ...groupTitle, color: INK }}>
                <span style={groupEmoji}>🕒</span>TODAY&rsquo;S TIMELINE
              </Text>
              <Text style={groupHint}>Everything with a time on it, in order.</Text>
              <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                style={timelineBox}
              >
                <tbody>
                  {scheduled.map((t, i) => (
                    <tr key={`sched-${i}`}>
                      <td style={timeCell}>{t.startTime}</td>
                      <td style={timeTitleCell}>
                        <span style={{ ...dot, backgroundColor: tone(t.priority).bar }}>
                          &nbsp;
                        </span>
                        {t.title}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Attention required ───────────────────────────────────────── */}
          {issues.length > 0 && (
            <Section style={group}>
              <Text style={{ ...groupTitle, color: INK }}>
                <span style={groupEmoji}>🚩</span>NEEDS A DECISION
              </Text>
              <Text style={groupHint}>Only the signals that can change today’s plan, revenue, or system reliability.</Text>
              {visibleIssues.map((it, i) => {
                const sev =
                  it.severity === "high"
                    ? { bg: "#fff5f5", bd: "#fecdca", fg: "#b42318" }
                    : it.severity === "medium"
                      ? { bg: "#fffaf0", bd: "#fedf89", fg: "#b54708" }
                      : { bg: "#f7f9fc", bd: LINE, fg: "#334155" };
                return (
                  <table
                    key={`issue-${i}`}
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    role="presentation"
                    style={{ ...cardTable, borderColor: sev.bd, backgroundColor: sev.bg }}
                  >
                    <tbody>
                      <tr>
                        <td style={{ ...cardBody, color: sev.fg }}>
                          <Text style={{ ...issueLabel, color: sev.fg }}>{it.label}</Text>
                          <Text style={issueMeta}>
                            {(it.source || "review").toUpperCase()} ·{" "}
                            <Link href={`${APP_URL}/?section=${issueDestination(it.source)}`} style={{ ...footerLink, color: sev.fg }}>
                              open workspace →
                            </Link>
                          </Text>
                          {it.detail && (
                            <Text style={{ ...issueDetail, color: sev.fg }}>{it.detail}</Text>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })}
              {issues.length > visibleIssues.length && (
                <Text style={groupHint}>
                  + {issues.length - visibleIssues.length} more signals in{" "}
                  <Link href={`${APP_URL}/?section=review`} style={footerLink}>
                    Mission Control
                  </Link>
                </Text>
              )}
            </Section>
          )}

          <Group
            emoji="🔥"
            title="OVERDUE"
            hint="Past their date. Finish, reschedule, or drop each one."
            color="#b42318"
            tasks={overdue}
            showOverdue
            limit={10}
          />
          <Group
            emoji="📌"
            title="DUE TODAY"
            hint="Land these and today counts as a win."
            color="#026aa2"
            tasks={dueToday}
          />
          <Group
            emoji="⚡"
            title="PLANNED TODAY"
            hint="Time you intentionally reserved for work — separate from hard deadlines."
            color="#5925dc"
            tasks={plannedToday}
            limit={6}
          />
          <Group
            emoji="🌅"
            title="DUE TOMORROW"
            hint="Prep anything here that needs someone else."
            color="#b54708"
            tasks={dueTomorrow}
            limit={6}
          />
          <Group
            emoji="🗓️"
            title="REST OF THE WEEK"
            hint="On the horizon — no action needed yet."
            color="#334155"
            tasks={upcoming}
            limit={6}
          />
          <Group
            emoji="🗃️"
            title="NO DATE YET"
            hint="Do not let this become hidden inventory. Schedule, delegate, or delete the top item."
            color="#334155"
            tasks={backlog}
            limit={5}
          />

          {/* ── Priority mix ─────────────────────────────────────────────── */}
          {mixTotal > 1 && (
            <Section style={group}>
              <Text style={{ ...groupTitle, color: INK }}>
                <span style={groupEmoji}>⚖️</span>WHERE THE LOAD SITS
              </Text>
              <Text style={groupHint}>Open work by priority.</Text>
              {(["critical", "high", "medium", "low"] as const).map((k) =>
                (mix[k] ?? 0) > 0 ? (
                  <table
                    key={k}
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    role="presentation"
                    style={{ marginBottom: "9px" }}
                  >
                    <tbody>
                      <tr>
                        <td style={mixLabelCell}>
                          {k.toUpperCase()} · {mix[k]}
                        </td>
                        <td>
                          <Meter
                            pct={((mix[k] ?? 0) / mixTotal) * 100}
                            color={PRIORITY[k]!.bar}
                            track="#eef2f7"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : null,
              )}
            </Section>
          )}

          {/* ── Wins ─────────────────────────────────────────────────────── */}
          {completed.length > 0 && (
            <Section style={group}>
              <Text style={{ ...groupTitle, color: "#067a5c" }}>
                <span style={groupEmoji}>🏆</span>CLOSED TODAY
                <span style={groupCount}>{completed.length}</span>
              </Text>
              <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                style={doneBox}
              >
                <tbody>
                  {completed.slice(0, 8).map((t, i) => (
                    <tr key={`done-${i}`}>
                      <td style={doneCheckCell}>✓</td>
                      <td style={doneTextCell}>{t.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Jump links ───────────────────────────────────────────────── */}
          <table
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={actionsBox}
          >
            <tbody>
              <tr>
                <td style={{ textAlign: "center" as const, padding: "18px 16px" }}>
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
            Daily briefing from{" "}
            <Link href={APP_URL} style={footerLink}>
              Mission Control
            </Link>
            {" · "}delivered on your configured daily schedule
          </Text>
          <Text style={footerFine}>You receive this because you own this workspace.</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OverdueDigestEmail;

export const template = {
  component: OverdueDigestEmail,
  subject: (data: Record<string, any>) => {
    const overdue = (data["overdue"] as unknown[] | undefined)?.length ?? 0;
    const today = (data["dueToday"] as unknown[] | undefined)?.length ?? 0;
    const done = (data["completedToday"] as number | undefined) ?? 0;
    const first =
      (
        (data["overdue"] as DigestTask[] | undefined)?.[0] ??
        (data["dueToday"] as DigestTask[] | undefined)?.[0]
      )?.title ?? "";
    const head = overdue
      ? `${overdue} overdue · ${today} due today`
      : today
        ? `${today} due today`
        : "All clear today";
    return `Daily briefing — ${head}${done ? ` · ${done} done` : ""}${first ? ` — start with “${first}”` : ""}`;
  },
  displayName: "Daily briefing",
  previewData: {
    date: "2026-08-30",
    completedToday: 3,
    completedWeek: 11,
    totalOpen: 14,
    inProgress: 2,
    highRiskIssues: 1,
    criticalOpen: 1,
    highOpen: 4,
    overdueMinutes: 75,
    dueTodayMinutes: 90,
    plannedTodayMinutes: 120,
    focusMinutes: 285,
    issues: [
      { label: "1 critical task overdue", detail: "Renew SSL certificate", severity: "high", source: "websites" },
      {
        label: "2 bills due this week",
        detail: "Electricity €84.20 · Κοινόχρηστα €45.00",
        severity: "medium",
        source: "finance",
      },
    ],
    completed: [{ title: "Ship dashboard redesign" }, { title: "Reply to hosting support" }],
    upcoming: [{ title: "Client call prep", priority: "high", dueDate: "2026-09-02" }],
    backlog: [{ title: "Refactor import engine", priority: "medium" }],
    overdue: [
      {
        title: "Renew SSL certificate",
        priority: "critical",
        dueDate: "2026-08-17",
        daysOverdue: 13,
        estimateMin: 30,
      },
      { title: "Send invoice to client", priority: "high", dueDate: "2026-08-28", daysOverdue: 2, estimateMin: 15 },
    ],
    dueToday: [
      { title: "Publish blog post", priority: "medium", dueDate: "2026-08-30", startTime: "15:00", estimateMin: 60 },
      { title: "Team stand-up", priority: "low", dueDate: "2026-08-30", startTime: "09:30" },
    ],
    plannedToday: [{ title: "Improve Mission Control email flow", priority: "high", dueDate: "2026-09-03", startTime: "11:00", estimateMin: 120 }],
    dueTomorrow: [{ title: "Weekly review", priority: "low", dueDate: "2026-08-31" }],
  },
} satisfies TemplateEntry;

// ─── styles ──────────────────────────────────────────────────────────────────
const main = {
  backgroundColor: "#eef2f7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "24px 0 32px",
};
const shell = {
  maxWidth: "620px",
  width: "100%",
  backgroundColor: "#ffffff",
  borderRadius: "22px",
  padding: "10px 22px 26px",
  margin: "0 auto",
};

const heroTable = { margin: "0 0 20px" };
const hero = {
  backgroundColor: "#0b1220",
  backgroundImage: "linear-gradient(135deg, #0b1220 0%, #10312b 100%)",
  borderRadius: "20px",
  padding: "26px 24px 24px",
};
const kicker = {
  fontSize: "10px",
  letterSpacing: "2.6px",
  color: "#5eead4",
  fontWeight: "bold" as const,
  margin: "0 0 12px",
};
const h1 = {
  fontSize: "27px",
  lineHeight: "34px",
  fontWeight: "bold" as const,
  color: "#ffffff",
  margin: "0 0 8px",
  letterSpacing: "-0.5px",
};
const dateLine = { fontSize: "12px", color: "#8ba3b8", margin: "0 0 10px" };
const subLine = { fontSize: "14px", lineHeight: "21px", color: "#cbd8e4", margin: "0" };
const meterLabel = {
  fontSize: "10px",
  letterSpacing: "1.8px",
  fontWeight: "bold" as const,
  color: "#8ba3b8",
  margin: "0 0 7px",
};
const meterOuter = {
  backgroundColor: "rgba(255,255,255,0.14)",
  borderRadius: "999px",
  height: "8px",
};

const directiveBox = {
  backgroundColor: "#f8fbff",
  backgroundImage: "linear-gradient(135deg, #f8fbff 0%, #f2fbf7 100%)",
  border: "1px solid #dce8e4",
  borderRadius: "18px",
  padding: "20px 20px 18px",
};
const directiveKicker = {
  fontSize: "9px",
  letterSpacing: "1.8px",
  fontWeight: "bold" as const,
  color: EMERALD,
  margin: "0 0 7px",
};
const directiveTitle = {
  fontSize: "20px",
  lineHeight: "27px",
  color: INK,
  fontWeight: "bold" as const,
  letterSpacing: "-0.25px",
  margin: "0 0 6px",
};
const directiveText = {
  fontSize: "12px",
  lineHeight: "19px",
  color: MUTED,
  margin: "0",
};
const pulseCell = {
  width: "25%",
  borderTop: `1px solid ${LINE}`,
  padding: "13px 8px 0 0",
  verticalAlign: "top" as const,
};
const pulseValue = {
  fontSize: "18px",
  lineHeight: "22px",
  color: INK,
  fontWeight: "bold" as const,
  margin: "0 0 2px",
};
const pulseLabel = {
  fontSize: "9px",
  lineHeight: "13px",
  color: MUTED,
  textTransform: "uppercase" as const,
  letterSpacing: "0.55px",
  margin: "0",
};

const statsWrap = { margin: "0 0 22px" };
const tileWrap = { width: "25%", padding: "0 4px 8px" };
const tile = {
  borderRadius: "14px",
  border: `1px solid ${LINE}`,
  padding: "13px 6px",
  textAlign: "center" as const,
};
const tileValue = {
  fontSize: "25px",
  fontWeight: "bold" as const,
  margin: "0 0 3px",
  lineHeight: "28px",
};
const tileLabel = {
  fontSize: "9px",
  letterSpacing: "1.1px",
  textTransform: "uppercase" as const,
  color: MUTED,
  margin: "0",
  fontWeight: "bold" as const,
};

const escalationBox = {
  backgroundColor: "#fff5f5",
  border: "1px solid #fecdca",
  borderRadius: "18px",
  padding: "20px 20px 18px",
};
const escalationLabel = {
  fontSize: "10px",
  letterSpacing: "1.7px",
  color: "#b42318",
  fontWeight: "bold" as const,
  margin: "0 0 14px",
};

const focusBox = {
  backgroundColor: "#0b1220",
  backgroundImage: "linear-gradient(135deg, #101a2c 0%, #0b1220 100%)",
  borderRadius: "18px",
  padding: "22px 24px",
};
const focusLabel = {
  fontSize: "10px",
  letterSpacing: "1.8px",
  color: "#5eead4",
  fontWeight: "bold" as const,
  margin: "0 0 14px",
};
const focusTitle = {
  fontSize: "20px",
  lineHeight: "27px",
  color: "#ffffff",
  fontWeight: "bold" as const,
  margin: "0 0 5px",
};
const planTitle = {
  fontSize: "15px",
  lineHeight: "21px",
  color: "#e2e8f0",
  fontWeight: "bold" as const,
  margin: "0 0 4px",
};
const planNumCell = { width: "34px", verticalAlign: "top" as const, paddingTop: "3px" };
const planNum = {
  display: "inline-block",
  minWidth: "22px",
  textAlign: "center" as const,
  borderRadius: "999px",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "bold" as const,
  padding: "3px 6px",
};
const focusMeta = { fontSize: "11px", color: "#8ba3b8", margin: "0" };

const clearBox = {
  backgroundColor: "#f2fdf8",
  border: "1px solid #a6f4d0",
  borderRadius: "18px",
  padding: "26px 22px",
  textAlign: "center" as const,
};
const clearEmoji = { fontSize: "30px", margin: "0 0 6px" };
const clearTitle = {
  fontSize: "18px",
  color: "#05603a",
  fontWeight: "bold" as const,
  margin: "0 0 6px",
};
const clearText = { fontSize: "13px", lineHeight: "20px", color: "#067a5c", margin: "0 0 18px" };

const cta = {
  backgroundColor: EMERALD,
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold" as const,
  borderRadius: "12px",
  padding: "13px 24px",
  textDecoration: "none",
  display: "inline-block",
};
const ctaGhost = {
  backgroundColor: "#ffffff",
  border: `1px solid ${LINE}`,
  color: INK,
  fontSize: "12px",
  fontWeight: "bold" as const,
  borderRadius: "10px",
  padding: "10px 16px",
  textDecoration: "none",
  display: "inline-block",
  margin: "0 4px",
};

const group = { margin: "0 0 28px" };
const groupTitle = {
  fontSize: "13px",
  letterSpacing: "1.3px",
  textTransform: "uppercase" as const,
  fontWeight: "bold" as const,
  margin: "0 0 3px",
};
const groupEmoji = { marginRight: "8px" };
const groupCount = {
  display: "inline-block",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  borderRadius: "999px",
  fontSize: "11px",
  padding: "1px 9px",
  marginLeft: "8px",
};
const groupHint = { fontSize: "12px", color: MUTED, margin: "0 0 13px" };

const cardTable = {
  margin: "0 0 10px",
  borderRadius: "14px",
  border: `1px solid ${LINE}`,
  overflow: "hidden" as const,
  backgroundColor: "#ffffff",
};
const accentCol = { width: "5px", fontSize: "1px", lineHeight: "1px" };
const cardBody = { padding: "13px 16px" };
const numCell = { width: "34px", verticalAlign: "top" as const, paddingTop: "2px" };
const numBadge = {
  display: "inline-block",
  minWidth: "20px",
  textAlign: "center" as const,
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "bold" as const,
  padding: "3px 6px",
};
const taskTitle = {
  fontSize: "15px",
  lineHeight: "21px",
  color: INK,
  fontWeight: "bold" as const,
  margin: "0 0 7px",
};
const metaLine = { fontSize: "11px", margin: "0" };
const metaText = { color: MUTED, marginRight: "8px" };
const pill = {
  display: "inline-block",
  fontSize: "9px",
  fontWeight: "bold" as const,
  letterSpacing: "0.6px",
  borderRadius: "999px",
  padding: "3px 8px",
  marginRight: "8px",
};
const estimatePill = {
  display: "inline-block",
  backgroundColor: "#eef2ff",
  color: "#4338ca",
  fontSize: "9px",
  fontWeight: "bold" as const,
  borderRadius: "999px",
  padding: "3px 8px",
  marginRight: "8px",
};
const overduePill = {
  display: "inline-block",
  backgroundColor: "#e0342a",
  color: "#ffffff",
  fontSize: "9px",
  fontWeight: "bold" as const,
  borderRadius: "999px",
  padding: "3px 8px",
};

const timelineBox = {
  border: `1px solid ${LINE}`,
  borderRadius: "14px",
  backgroundColor: "#f7f9fc",
  padding: "6px 14px",
};
const timeCell = {
  width: "58px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  color: MUTED,
  padding: "9px 0",
  verticalAlign: "top" as const,
};
const timeTitleCell = {
  fontSize: "14px",
  color: INK,
  padding: "9px 0",
  verticalAlign: "top" as const,
};
const dot = {
  display: "inline-block",
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  marginRight: "9px",
  fontSize: "1px",
  lineHeight: "8px",
};

const mixLabelCell = {
  width: "110px",
  fontSize: "10px",
  fontWeight: "bold" as const,
  letterSpacing: "0.8px",
  color: MUTED,
  paddingRight: "10px",
};

const issueLabel = { fontSize: "14px", fontWeight: "bold" as const, margin: "0 0 4px" };
const issueMeta = {
  fontSize: "9px",
  lineHeight: "14px",
  letterSpacing: "0.55px",
  fontWeight: "bold" as const,
  margin: "0 0 5px",
  opacity: 0.8,
};
const issueDetail = { fontSize: "12px", lineHeight: "18px", margin: "0", opacity: 0.85 };

const loadBox = {
  backgroundColor: "#f7f9fc",
  border: `1px solid ${LINE}`,
  borderRadius: "14px",
};
const loadCell = {
  width: "33.33%",
  padding: "14px 12px",
  textAlign: "center" as const,
  verticalAlign: "top" as const,
};
const loadValue = {
  fontSize: "20px",
  lineHeight: "24px",
  fontWeight: "bold" as const,
  color: INK,
  margin: "0 0 2px",
};
const loadLabel = {
  fontSize: "9px",
  lineHeight: "13px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.7px",
  color: MUTED,
  margin: "0",
};

const doneBox = {
  backgroundColor: "#f2fdf8",
  border: "1px solid #a6f4d0",
  borderRadius: "14px",
  padding: "6px 14px",
};
const doneCheckCell = {
  width: "20px",
  color: "#12b886",
  fontWeight: "bold" as const,
  fontSize: "13px",
  padding: "6px 0",
  verticalAlign: "top" as const,
};
const doneTextCell = {
  fontSize: "14px",
  color: "#05603a",
  padding: "6px 0",
  textDecoration: "line-through",
};

const actionsBox = {
  backgroundColor: "#f7f9fc",
  border: `1px solid ${LINE}`,
  borderRadius: "16px",
  margin: "0 0 6px",
};
const actionsTitle = {
  fontSize: "10px",
  letterSpacing: "1.8px",
  textTransform: "uppercase" as const,
  color: MUTED,
  fontWeight: "bold" as const,
  margin: "0 0 12px",
};

const hr = { borderColor: LINE, margin: "22px 0 12px" };
const footer = { fontSize: "11px", color: MUTED, margin: "0 0 4px", textAlign: "center" as const };
const footerFine = {
  fontSize: "10px",
  color: "#9aa8b8",
  margin: "0",
  textAlign: "center" as const,
};
const footerLink = { color: EMERALD, textDecoration: "none" };
