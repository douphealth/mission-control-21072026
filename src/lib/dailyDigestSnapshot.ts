import { db, type Task } from "@/lib/db";
import { addDaysLocal, daysOverdue, PRIORITY_RANK, todayISO } from "@/lib/overdue";

export type DigestSeverity = "high" | "medium" | "low";

export interface ExecutiveDigestTask {
  title: string;
  priority?: string;
  dueDate?: string;
  startTime?: string;
  daysOverdue?: number;
  estimateMin?: number;
}

export interface ExecutiveDigestIssue {
  label: string;
  detail?: string;
  severity?: DigestSeverity;
  source?: string;
}

export interface ExecutiveDigestSnapshot {
  generatedAt: string;
  date: string;
  timezone: string;
  enabled: boolean;
  sendHour: number;
  counts: {
    totalOpen: number;
    inProgress: number;
    completedToday: number;
    completedWeek: number;
    overdue: number;
    dueToday: number;
    plannedToday: number;
    dueTomorrow: number;
    upcoming: number;
    backlog: number;
    issues: number;
    highRiskIssues: number;
    criticalOpen: number;
    highOpen: number;
    overdueMinutes: number;
    dueTodayMinutes: number;
    plannedTodayMinutes: number;
    focusMinutes: number;
  };
  overdue: ExecutiveDigestTask[];
  dueToday: ExecutiveDigestTask[];
  plannedToday: ExecutiveDigestTask[];
  dueTomorrow: ExecutiveDigestTask[];
  upcoming: ExecutiveDigestTask[];
  backlog: ExecutiveDigestTask[];
  completed: ExecutiveDigestTask[];
  issues: ExecutiveDigestIssue[];
}

const DEFAULT_DIGEST_HOUR = 9;
const DIGEST_SCHEDULE_VERSION = 2;
const severityRank = { high: 0, medium: 1, low: 2 } as const;

const taskSort = (a: Task, b: Task) =>
  (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
  (a.dueDate || "9999").localeCompare(b.dueDate || "9999");

const taskView = (task: Task, today: string): ExecutiveDigestTask => ({
  title: task.title,
  priority: task.priority,
  dueDate: task.dueDate || undefined,
  startTime: task.startTime,
  daysOverdue: daysOverdue(task, today),
  estimateMin: task.estimateMin,
});

const normalizeHour = (value: unknown) =>
  Math.max(
    0,
    Math.min(
      23,
      Number.isFinite(Number(value)) ? Math.round(Number(value)) : DEFAULT_DIGEST_HOUR,
    ),
  );

const isPlannedForToday = (task: Task, today: string) =>
  task.committedOn === today ||
  task.scheduledAt === today ||
  task.blocks?.some((block) => block.date === today && !block.done) === true;

export async function buildExecutiveDigestSnapshot(): Promise<ExecutiveDigestSnapshot> {
  const [
    tasks,
    payments,
    reminders,
    seoIssues,
    seoActions,
    decisions,
    syncHealth,
    validations,
    websites,
    repos,
    buildProjects,
    settings,
  ] = await Promise.all([
    db.tasks.filter((task) => !task.deletedAt).toArray(),
    db.payments.toArray(),
    db.reminders.toArray(),
    db.seoIssues.toArray(),
    db.seoActions.toArray(),
    db.decisions.toArray(),
    db.syncHealth.toArray(),
    db.validations.toArray(),
    db.websites.toArray(),
    db.repos.toArray(),
    db.buildProjects.toArray(),
    db.settings.get("default"),
  ]);

  const now = new Date();
  const today = todayISO();
  const tomorrow = addDaysLocal(today, 1);
  const weekEnd = addDaysLocal(today, 7);
  const weekAgo = addDaysLocal(today, -6);

  const timezone =
    settings?.digestEmailTimezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  const sendHour =
    settings?.digestEmailScheduleVersion === DIGEST_SCHEDULE_VERSION
      ? normalizeHour(settings?.digestEmailHour)
      : DEFAULT_DIGEST_HOUR;

  if (settings && settings.digestEmailScheduleVersion !== DIGEST_SCHEDULE_VERSION) {
    await db.settings.update("default", {
      digestEmailEnabled: true,
      digestEmailHour: DEFAULT_DIGEST_HOUR,
      digestEmailTimezone: timezone,
      digestEmailScheduleVersion: DIGEST_SCHEDULE_VERSION,
    });
  }

  const openTasks = tasks.filter((task) => task.status !== "done" && !task.archived);

  const overdueRaw = openTasks
    .filter((task) => !!task.dueDate && task.dueDate < today)
    .sort(taskSort);

  const dueTodayRaw = openTasks
    .filter((task) => task.dueDate === today)
    .sort(taskSort);

  // Planned work is intentionally separate from a hard deadline. Exclude work
  // that is already represented in overdue/due-today sections to avoid noise.
  const plannedTodayRaw = openTasks
    .filter(
      (task) =>
        isPlannedForToday(task, today) &&
        !(task.dueDate && task.dueDate <= today),
    )
    .sort(taskSort);

  const dueTomorrowRaw = openTasks
    .filter((task) => task.dueDate === tomorrow)
    .sort(taskSort);

  const upcomingRaw = openTasks
    .filter(
      (task) =>
        !!task.dueDate &&
        task.dueDate > tomorrow &&
        task.dueDate <= weekEnd,
    )
    .sort(taskSort);

  const backlogRaw = openTasks
    .filter((task) => !task.dueDate && !isPlannedForToday(task, today))
    .sort(taskSort);

  const completedRaw = tasks
    .filter(
      (task) =>
        task.status === "done" &&
        !!task.completedAt &&
        task.completedAt.slice(0, 10) >= weekAgo,
    )
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

  const issues: ExecutiveDigestIssue[] = [];
  const addIssue = (issue: ExecutiveDigestIssue) => issues.push(issue);

  payments.forEach((payment) => {
    if (payment.status === "overdue") {
      addIssue({
        label: `Payment overdue · ${payment.title}`,
        detail: `${payment.amount} ${payment.currency}${
          payment.dueDate ? ` · due ${payment.dueDate}` : ""
        }`,
        severity: "high",
        source: "finance",
      });
    } else if (
      payment.status === "pending" &&
      payment.dueDate &&
      payment.dueDate <= tomorrow
    ) {
      addIssue({
        label: `Payment pending · ${payment.title}`,
        detail: `${payment.amount} ${payment.currency} · due ${payment.dueDate}`,
        severity: "medium",
        source: "finance",
      });
    }
  });

  reminders
    .filter((reminder) => reminder.status === "pending")
    .forEach((reminder) => {
      const remindAt = new Date(reminder.remindAt);
      if (Number.isNaN(remindAt.getTime())) return;

      if (remindAt <= now) {
        addIssue({
          label: `Reminder due · ${reminder.title}`,
          detail: reminder.notes || remindAt.toLocaleString(),
          severity: "high",
          source: "reminders",
        });
      } else if (remindAt.getTime() <= now.getTime() + 86_400_000) {
        addIssue({
          label: `Reminder next 24h · ${reminder.title}`,
          detail: remindAt.toLocaleString(),
          severity: "medium",
          source: "reminders",
        });
      }
    });

  seoIssues
    .filter((issue) => issue.status === "open" || issue.status === "in-progress")
    .forEach((issue) =>
      addIssue({
        label: `SEO · ${issue.title}`,
        detail: [issue.category, issue.url, issue.evidence]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 360),
        severity:
          issue.severity === "critical" || issue.severity === "high"
            ? "high"
            : issue.severity === "medium"
              ? "medium"
              : "low",
        source: "seo",
      }),
    );

  seoActions
    .filter(
      (action) =>
        !["done", "cancelled"].includes(action.status) &&
        (action.priority === "critical" ||
          action.priority === "high" ||
          (!!action.dueDate && action.dueDate <= weekEnd)),
    )
    .forEach((action) =>
      addIssue({
        label: `SEO action · ${action.title}`,
        detail: [
          action.status,
          action.dueDate ? `due ${action.dueDate}` : "",
          action.rationale,
        ]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 360),
        severity:
          action.priority === "critical" || action.priority === "high"
            ? "high"
            : "medium",
        source: "seo",
      }),
    );

  decisions
    .filter(
      (decision) =>
        decision.status === "open" ||
        (decision.status === "later" &&
          !!decision.deferUntil &&
          decision.deferUntil <= today),
    )
    .forEach((decision) =>
      addIssue({
        label: `Decision · ${decision.title}`,
        detail: (decision.recommendation || decision.context || "").slice(0, 360),
        severity:
          decision.severity === "critical" || decision.severity === "high"
            ? "high"
            : decision.severity === "medium"
              ? "medium"
              : "low",
        source: "decisions",
      }),
    );

  syncHealth
    .filter((health) => health.status === "error" || health.status === "stale")
    .forEach((health) =>
      addIssue({
        label: `${health.status === "error" ? "Sync failure" : "Stale data"} · ${health.label}`,
        detail:
          health.error ||
          health.detail ||
          (health.lastSuccessAt ? `Last success ${health.lastSuccessAt}` : ""),
        severity: health.status === "error" ? "high" : "medium",
        source: "sync",
      }),
    );

  validations
    .filter(
      (validation) =>
        validation.status === "failed" ||
        (!!validation.reviewAt &&
          validation.reviewAt <= today &&
          !["passed", "failed"].includes(validation.status)),
    )
    .forEach((validation) =>
      addIssue({
        label: `Validation · ${validation.title}`,
        detail:
          validation.result ||
          validation.successCriteria ||
          validation.entityLabel ||
          "",
        severity: validation.status === "failed" ? "high" : "medium",
        source: "validation",
      }),
    );

  websites
    .filter((website) => website.status === "down" || website.status === "maintenance")
    .forEach((website) =>
      addIssue({
        label: `Website ${website.status} · ${website.name}`,
        detail: website.url,
        severity: website.status === "down" ? "high" : "medium",
        source: "websites",
      }),
    );

  repos
    .filter((repo) => !!repo.pendingSummary && repo.status !== "archived")
    .forEach((repo) =>
      addIssue({
        label: `Repo · ${repo.name}`,
        detail: repo.pendingSummary!.slice(0, 360),
        severity:
          repo.priority === "critical" || repo.priority === "high" ? "medium" : "low",
        source: "github",
      }),
    );

  buildProjects
    .filter((project) => project.status !== "deployed" && !!project.nextSteps?.trim())
    .forEach((project) =>
      addIssue({
        label: `Build · ${project.productName || project.name}`,
        detail: project.nextSteps.slice(0, 360),
        severity:
          project.priority === "critical" || project.priority === "high"
            ? "medium"
            : "low",
        source: "projects",
      }),
    );

  issues.sort(
    (a, b) =>
      (severityRank[a.severity || "low"] ?? 9) -
      (severityRank[b.severity || "low"] ?? 9),
  );

  const completedToday = tasks.filter(
    (task) =>
      task.status === "done" &&
      (task.completedAt || "").slice(0, 10) === today,
  ).length;

  const sumMinutes = (items: Task[]) =>
    items.reduce((total, task) => total + Math.max(0, task.estimateMin || 0), 0);

  const overdueMinutes = sumMinutes(overdueRaw);
  const dueTodayMinutes = sumMinutes(dueTodayRaw);
  const plannedTodayMinutes = sumMinutes(plannedTodayRaw);
  const focusMinutes = overdueMinutes + dueTodayMinutes + plannedTodayMinutes;
  const criticalOpen = openTasks.filter((task) => task.priority === "critical").length;
  const highOpen = openTasks.filter((task) => task.priority === "high").length;
  const highRiskIssues = issues.filter((issue) => issue.severity === "high").length;

  return {
    generatedAt: now.toISOString(),
    date: today,
    timezone,
    enabled: settings?.digestEmailEnabled !== false,
    sendHour,
    counts: {
      totalOpen: openTasks.length,
      inProgress: openTasks.filter((task) => task.status === "in-progress").length,
      completedToday,
      completedWeek: completedRaw.length,
      overdue: overdueRaw.length,
      dueToday: dueTodayRaw.length,
      plannedToday: plannedTodayRaw.length,
      dueTomorrow: dueTomorrowRaw.length,
      upcoming: upcomingRaw.length,
      backlog: backlogRaw.length,
      issues: issues.length,
      highRiskIssues,
      criticalOpen,
      highOpen,
      overdueMinutes,
      dueTodayMinutes,
      plannedTodayMinutes,
      focusMinutes,
    },
    overdue: overdueRaw.map((task) => taskView(task, today)),
    dueToday: dueTodayRaw.map((task) => taskView(task, today)),
    plannedToday: plannedTodayRaw.map((task) => taskView(task, today)),
    dueTomorrow: dueTomorrowRaw.map((task) => taskView(task, today)),
    upcoming: upcomingRaw.map((task) => taskView(task, today)),
    backlog: backlogRaw.map((task) => taskView(task, today)),
    completed: completedRaw.slice(0, 8).map((task) => taskView(task, today)),
    issues,
  };
}
