// Pure portfolio logic for My Websites and WordPress management.
// Everything here is derived from records the user actually has. Nothing is
// inferred or invented: a missing metric is reported as missing, never as zero.

import type { SEODataSource, SEOSnapshot, Task, Website } from "@/lib/db";

export type SiteKind = "wordpress" | "property";

export const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .toLowerCase();
  }
}

export function ensureUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** A site is WordPress when it has a WP admin URL or is tagged `wordpress`. */
export function siteKind(site: Pick<Website, "wpAdminUrl" | "tags">): SiteKind {
  if (site.wpAdminUrl) return "wordpress";
  if (site.tags?.some((tag) => tag.toLowerCase() === "wordpress")) return "wordpress";
  return "property";
}

/**
 * Tasks that belong to a website. A task belongs to a site when its linked
 * project names the site's domain, or when one of its tags is the site's label
 * (for example `gearuptofit`).
 */
export function tasksForSite(site: Pick<Website, "url">, tasks: Task[]): Task[] {
  const domain = domainOf(site.url);
  const label = domain.split(".")[0];
  return tasks.filter((task) => {
    if (task.deletedAt || task.archived) return false;
    const project = (task.linkedProject || "").toLowerCase();
    const tags = (task.tags || []).join(" ").toLowerCase();
    return project.includes(domain) || (label.length > 2 && tags.includes(label));
  });
}

/** Ordering for "what do I do next": unblocked first, then priority, then work already started. */
export function byNextAction(a: Task, b: Task): number {
  const blocked = (task: Task) => (task.status === "blocked" ? 1 : 0);
  const started = (task: Task) => (task.status === "in-progress" ? 0 : 1);
  return (
    blocked(a) - blocked(b) ||
    (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
    started(a) - started(b) ||
    a.title.localeCompare(b.title)
  );
}

export interface TaskSummary {
  open: number;
  inProgress: number;
  blocked: number;
  next: Task | null;
}

export function summarizeTasks(tasks: Task[]): TaskSummary {
  const open = tasks.filter((task) => task.status !== "done");
  return {
    open: open.length,
    inProgress: open.filter((task) => task.status === "in-progress").length,
    blocked: open.filter((task) => task.status === "blocked").length,
    next: [...open].sort(byNextAction)[0] ?? null,
  };
}

export interface SourceEvidence {
  source: SEODataSource;
  clicks?: number;
  impressions?: number;
  date: string;
  periodDays?: number;
}

/** Latest snapshot per data source for one website. Empty array means nothing is connected. */
export function latestEvidenceBySource(
  websiteId: string,
  snapshots: SEOSnapshot[],
): SourceEvidence[] {
  const latest = new Map<SEODataSource, SEOSnapshot>();
  for (const snapshot of snapshots) {
    if (snapshot.websiteId !== websiteId) continue;
    const current = latest.get(snapshot.source);
    if (!current || snapshot.date > current.date) latest.set(snapshot.source, snapshot);
  }
  return [...latest.values()]
    .map((s) => ({
      source: s.source,
      clicks: s.clicks,
      impressions: s.impressions,
      date: s.date,
      periodDays: s.periodDays,
    }))
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0));
}

export interface ProfileCheck {
  key: string;
  label: string;
  done: boolean;
}

/** The facts a complete portfolio record should carry. Used to show what is still missing. */
export function profileChecks(site: Website): ProfileCheck[] {
  const checks: ProfileCheck[] = [
    { key: "niche", label: "Niche", done: !!site.niche?.trim() },
    { key: "goal", label: "Main goal", done: !!site.primaryGoal?.trim() },
    { key: "revenue", label: "Revenue model", done: !!site.revenueModel?.trim() },
    { key: "hosting", label: "Hosting provider", done: !!site.hostingProvider?.trim() },
    { key: "apps", label: "Connected apps", done: (site.appUrls?.length ?? 0) > 0 },
    { key: "repos", label: "Code repos", done: (site.githubRepos?.length ?? 0) > 0 },
    {
      key: "access",
      label: "Saved access",
      done: !!(site.wpUsername || site.wpPassword || site.hostingUsername || site.hostingPassword),
    },
  ];
  if (siteKind(site) === "wordpress") {
    checks.push({ key: "wp", label: "WP admin link", done: !!site.wpAdminUrl });
  }
  return checks;
}

export interface Completeness {
  done: number;
  total: number;
  percent: number;
  missing: string[];
}

export function completeness(site: Website): Completeness {
  const checks = profileChecks(site);
  const done = checks.filter((check) => check.done).length;
  return {
    done,
    total: checks.length,
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter((check) => !check.done).map((check) => check.label),
  };
}

export interface QueueEntry {
  task: Task;
  siteName: string | null;
}

/** Open work ordered for action: unblocked first, then priority, then work already started. */
export function sortPortfolioQueue<T extends QueueEntry>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (a.task.status === "blocked" ? 1 : 0) - (b.task.status === "blocked" ? 1 : 0) ||
      (PRIORITY_RANK[a.task.priority] ?? 9) - (PRIORITY_RANK[b.task.priority] ?? 9) ||
      (a.task.status === "in-progress" ? 0 : 1) - (b.task.status === "in-progress" ? 0 : 1) ||
      a.task.title.localeCompare(b.task.title),
  );
}

export interface FleetSummary {
  total: number;
  wordpress: number;
  properties: number;
  critical: number;
  apps: number;
  repos: number;
  openTasks: number;
  blockedTasks: number;
  withEvidence: number;
  avgCompleteness: number;
  needsAttention: number;
}

/** Portfolio totals. Archived sites are excluded from every count. */
export function fleetSummary(
  sites: Website[],
  tasks: Task[],
  snapshots: SEOSnapshot[],
): FleetSummary {
  const active = sites.filter((site) => site.status !== "archived");
  const matchedTaskIds = new Set<string>();
  let blockedTasks = 0;
  let needsAttention = 0;

  for (const site of active) {
    const matched = tasksForSite(site, tasks).filter((task) => task.status !== "done");
    const summary = summarizeTasks(matched);
    for (const task of matched) matchedTaskIds.add(task.id);
    if (summary.blocked > 0 || site.status === "down" || site.status === "maintenance")
      needsAttention += 1;
    blockedTasks += summary.blocked;
  }

  const percents = active.map((site) => completeness(site).percent);
  const avgCompleteness = percents.length
    ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length)
    : 0;

  return {
    total: active.length,
    wordpress: active.filter((site) => siteKind(site) === "wordpress").length,
    properties: active.filter((site) => siteKind(site) === "property").length,
    critical: active.filter((site) => site.priority === "critical").length,
    apps: new Set(active.flatMap((site) => site.appUrls ?? [])).size,
    repos: new Set(active.flatMap((site) => site.githubRepos ?? [])).size,
    openTasks: matchedTaskIds.size,
    blockedTasks,
    withEvidence: active.filter((site) => latestEvidenceBySource(site.id, snapshots).length > 0)
      .length,
    avgCompleteness,
    needsAttention,
  };
}
