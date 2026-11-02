/**
 * Pure estate model: links repositories to Cloudflare deployments, scores
 * health, derives activity bands and evaluates filters. No I/O, so every rule
 * here is unit tested and identical on server and client.
 */
import type {
  ActivityBand,
  CfPagesProject,
  CfWorker,
  EstateRepo,
  EstateSnapshot,
  GitHubAccountStatus,
  PagesHealth,
} from "@/lib/estate/types";

const DAY = 86_400_000;

export type RepoPriority = "critical" | "high" | "medium" | "low";
export type RepoPlanStatus = "active" | "stable" | "paused" | "archived";

/** Mission Control planning data layered on a repository (stored in Dexie + cloud sync). */
export interface RepoAnnotation {
  recordId: string | null;
  priority: RepoPriority | null;
  status: RepoPlanStatus | null;
  pinned: boolean;
  tags: string[];
  notes: string;
  nextAction: string;
  category: string | null;
  importance: number | null;
}

export const EMPTY_ANNOTATION: RepoAnnotation = {
  recordId: null,
  priority: null,
  status: null,
  pinned: false,
  tags: [],
  notes: "",
  nextAction: "",
  category: null,
  importance: null,
};

export interface CfLink {
  kind: "pages" | "worker";
  accountId: string;
  accountLabel: string;
  name: string;
  key: string;
  url: string | null;
  health: PagesHealth | null;
  match: "source" | "name";
}

export interface RepoHealth {
  score: number;
  flags: string[];
}

export interface RepoRow extends EstateRepo {
  key: string;
  activity: ActivityBand;
  health: RepoHealth;
  links: CfLink[];
  deployState: "failing" | "building" | "healthy" | "none";
  annotation: RepoAnnotation;
}

export interface LinkedEstate {
  repos: RepoRow[];
  pages: (CfPagesProject & { linkedRepo: string | null; linkMatch: "source" | "name" | null })[];
  workers: (CfWorker & { linkedRepo: string | null })[];
}

export const repoKey = (fullName: string) => fullName.toLowerCase();
export const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function activityOf(pushedAt: string | null, now = Date.now()): ActivityBand {
  if (!pushedAt) return "dormant";
  const t = new Date(pushedAt).getTime();
  if (!Number.isFinite(t)) return "dormant";
  const days = (now - t) / DAY;
  if (days < 3) return "hot";
  if (days < 30) return "active";
  if (days < 90) return "quiet";
  if (days < 365) return "stale";
  return "dormant";
}

export const ciFailing = (s: string | null) => s === "FAILURE" || s === "ERROR";

export function healthOf(r: EstateRepo, links: CfLink[], now = Date.now()): RepoHealth {
  let score = 100;
  const flags: string[] = [];
  if (r.isArchived) flags.push("Archived");
  if (ciFailing(r.ciState)) {
    score -= 30;
    flags.push("CI failing on the default branch");
  }
  const failing = links.filter((l) => l.kind === "pages" && l.health === "failing");
  if (failing.length) {
    score -= 25;
    flags.push("Production deploy failing: " + failing.map((f) => f.name).join(", "));
  }
  const act = activityOf(r.pushedAt, now);
  if (!r.isArchived && act === "stale") {
    score -= 10;
    flags.push("No push in 3+ months");
  }
  if (!r.isArchived && act === "dormant") {
    score -= 20;
    flags.push("No push in a year or more");
  }
  if (r.openPrs > 3) {
    score -= 10;
    flags.push(r.openPrs + " open pull requests");
  }
  if (r.openIssues > 10) {
    score -= 10;
    flags.push(r.openIssues + " open issues");
  }
  if (!r.description) {
    score -= 5;
    flags.push("No description");
  }
  if (!r.isPrivate && !r.license) {
    score -= 5;
    flags.push("Public without a license");
  }
  if (r.ciState === null && !r.isArchived) flags.push("No CI checks");
  return { score: Math.max(0, Math.min(100, score)), flags };
}

/**
 * Pick one repository for a bare name when several accounts share it:
 * prefer non-forks, then non-archived, then the most recent push.
 */
function bestByName(repos: EstateRepo[]): Map<string, EstateRepo> {
  const out = new Map<string, EstateRepo>();
  const rank = (r: EstateRepo) => [
    r.isFork ? 1 : 0,
    r.isArchived ? 1 : 0,
    -(Date.parse(r.pushedAt ?? "") || 0),
  ];
  for (const r of repos) {
    const k = normName(r.name);
    const prev = out.get(k);
    if (!prev) {
      out.set(k, r);
      continue;
    }
    const a = rank(r);
    const b = rank(prev);
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        if (a[i] < b[i]) out.set(k, r);
        break;
      }
    }
  }
  return out;
}

/** Link Pages projects (by source owner/repo, then by name) and Workers (by name) to repos. */
export function linkEstate(
  snapshot: EstateSnapshot,
  annotations: Map<string, RepoAnnotation> = new Map(),
  now = Date.now(),
): LinkedEstate {
  const repos = snapshot.github.repos;
  const byFull = new Map(repos.map((r) => [repoKey(r.fullName), r]));
  const byName = bestByName(repos);
  const links = new Map<string, CfLink[]>();
  const add = (full: string, link: CfLink) => {
    const k = repoKey(full);
    const list = links.get(k) ?? [];
    if (!list.some((l) => l.key === link.key)) list.push(link);
    links.set(k, list);
  };

  const pages = snapshot.cloudflare.pages.map((p) => {
    let linkedRepo: string | null = null;
    let linkMatch: "source" | "name" | null = null;
    if (p.source.owner && p.source.repo) {
      const hit = byFull.get(repoKey(p.source.owner + "/" + p.source.repo));
      if (hit) {
        linkedRepo = hit.fullName;
        linkMatch = "source";
      }
    }
    if (!linkedRepo) {
      // Direct uploads, or a source repo on an account that is not indexed.
      const hit = byName.get(normName(p.name));
      if (hit) {
        linkedRepo = hit.fullName;
        linkMatch = "name";
      }
    }
    if (linkedRepo && linkMatch) {
      add(linkedRepo, {
        kind: "pages",
        accountId: p.accountId,
        accountLabel: p.accountLabel,
        name: p.name,
        key: p.key,
        url: p.url,
        health: p.health,
        match: linkMatch,
      });
    }
    return { ...p, linkedRepo, linkMatch };
  });

  const workers = snapshot.cloudflare.workers.map((w) => {
    const hit = byName.get(normName(w.name));
    const linkedRepo = hit?.fullName ?? null;
    if (linkedRepo) {
      add(linkedRepo, {
        kind: "worker",
        accountId: w.accountId,
        accountLabel: w.accountLabel,
        name: w.name,
        key: w.key,
        url: w.customDomains[0] ? "https://" + w.customDomains[0] : null,
        health: null,
        match: "name",
      });
    }
    return { ...w, linkedRepo };
  });

  const rows: RepoRow[] = repos.map((r) => {
    const key = repoKey(r.fullName);
    const l = links.get(key) ?? [];
    const pagesLinks = l.filter((x) => x.kind === "pages");
    const deployState: RepoRow["deployState"] = !l.length
      ? "none"
      : pagesLinks.some((x) => x.health === "failing")
        ? "failing"
        : pagesLinks.some((x) => x.health === "building")
          ? "building"
          : "healthy";
    return {
      ...r,
      key,
      activity: activityOf(r.pushedAt, now),
      health: healthOf(r, l, now),
      links: l,
      deployState,
      annotation: annotations.get(key) ?? EMPTY_ANNOTATION,
    };
  });
  return { repos: rows, pages, workers };
}

/**
 * Why a git-connected Pages project has no linked repo. "missing" is only
 * claimed when the owning account was indexed successfully and the repo is
 * not in it; otherwise we say we could not look.
 */
export type SourceRepoState = "linked" | "direct" | "missing" | "not_indexed" | "external";

export function sourceRepoState(
  p: { linkedRepo: string | null; source: { owner: string | null; repo: string | null } },
  accounts: GitHubAccountStatus[],
): SourceRepoState {
  if (p.linkedRepo) return "linked";
  if (!p.source.owner || !p.source.repo) return "direct";
  const owner = p.source.owner.toLowerCase();
  const account = accounts.find((a) => a.account.toLowerCase() === owner);
  if (!account) return "external";
  return account.state === "live" ? "missing" : "not_indexed";
}

/* ---------------- Filters, sorting and saved views ---------------- */

export type Tri = "hide" | "include" | "only";

export interface RepoFilters {
  q: string;
  accounts: string[];
  languages: string[];
  visibility: "" | "public" | "private";
  activity: ActivityBand[];
  ci: "" | "passing" | "failing" | "pending" | "none";
  categories: string[];
  priorities: (RepoPriority | "unset")[];
  statuses: (RepoPlanStatus | "unset")[];
  deploy: "" | "linked" | "failing" | "none";
  pinned: boolean;
  archived: Tri;
  forks: Tri;
}

export type RepoSortKey = "pushed" | "name" | "health" | "stars" | "issues" | "prs" | "priority";
export interface RepoSort {
  key: RepoSortKey;
  dir: "asc" | "desc";
}

export const DEFAULT_FILTERS: RepoFilters = {
  q: "",
  accounts: [],
  languages: [],
  visibility: "",
  activity: [],
  ci: "",
  categories: [],
  priorities: [],
  statuses: [],
  deploy: "",
  pinned: false,
  archived: "hide",
  forks: "include",
};

export const DEFAULT_SORT: RepoSort = { key: "pushed", dir: "desc" };

export function repoHaystack(r: RepoRow): string {
  return [
    r.fullName,
    r.description,
    r.primaryLanguage,
    r.homepage,
    r.account,
    ...r.topics,
    ...r.links.flatMap((l) => [l.name, l.url]),
    r.annotation.category,
    r.annotation.notes,
    r.annotation.nextAction,
    ...r.annotation.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tri(mode: Tri, value: boolean): boolean {
  return mode === "include" || (mode === "only" ? value : !value);
}

export function matchesFilters(r: RepoRow, f: RepoFilters): boolean {
  if (f.accounts.length && !f.accounts.includes(r.account)) return false;
  if (f.languages.length && !f.languages.includes(r.primaryLanguage ?? "Unknown")) return false;
  if (f.visibility === "public" && r.isPrivate) return false;
  if (f.visibility === "private" && !r.isPrivate) return false;
  if (f.activity.length && !f.activity.includes(r.activity)) return false;
  if (f.ci === "passing" && r.ciState !== "SUCCESS") return false;
  if (f.ci === "failing" && !ciFailing(r.ciState)) return false;
  if (f.ci === "pending" && r.ciState !== "PENDING" && r.ciState !== "EXPECTED") return false;
  if (f.ci === "none" && r.ciState !== null) return false;
  if (f.categories.length && !f.categories.includes(r.annotation.category ?? "Uncategorised"))
    return false;
  if (f.priorities.length && !f.priorities.includes(r.annotation.priority ?? "unset")) return false;
  if (f.statuses.length && !f.statuses.includes(r.annotation.status ?? "unset")) return false;
  if (f.deploy === "linked" && !r.links.length) return false;
  if (f.deploy === "failing" && r.deployState !== "failing") return false;
  if (f.deploy === "none" && r.links.length) return false;
  if (f.pinned && !r.annotation.pinned) return false;
  if (!tri(f.archived, r.isArchived)) return false;
  if (!tri(f.forks, r.isFork)) return false;
  if (f.q.trim()) {
    const hay = repoHaystack(r);
    if (
      !f.q
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((t) => hay.includes(t))
    )
      return false;
  }
  return true;
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, unset: 4 };

export function sortRepos(rows: RepoRow[], sort: RepoSort): RepoRow[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  const val = (r: RepoRow): number | string => {
    switch (sort.key) {
      case "name":
        return r.fullName.toLowerCase();
      case "health":
        return r.health.score;
      case "stars":
        return r.stars;
      case "issues":
        return r.openIssues;
      case "prs":
        return r.openPrs;
      case "priority":
        return -PRIORITY_RANK[r.annotation.priority ?? "unset"];
      default:
        return Date.parse(r.pushedAt ?? "") || 0;
    }
  };
  // Pinned repos always lead; the chosen sort orders within each group.
  return [...rows].sort((a, b) => {
    if (a.annotation.pinned !== b.annotation.pinned) return a.annotation.pinned ? -1 : 1;
    const x = val(a);
    const y = val(b);
    if (x < y) return -1 * dir;
    if (x > y) return 1 * dir;
    return a.fullName.localeCompare(b.fullName);
  });
}

export interface SavedView {
  id: string;
  name: string;
  filters: RepoFilters;
  sort: RepoSort;
  builtIn?: boolean;
}

export const BUILT_IN_VIEWS: SavedView[] = [
  { id: "all", name: "All active", builtIn: true, filters: DEFAULT_FILTERS, sort: DEFAULT_SORT },
  {
    id: "ci-failing",
    name: "CI failing",
    builtIn: true,
    filters: { ...DEFAULT_FILTERS, ci: "failing" },
    sort: { key: "health", dir: "asc" },
  },
  {
    id: "deploy-failing",
    name: "Deploy failing",
    builtIn: true,
    filters: { ...DEFAULT_FILTERS, deploy: "failing" },
    sort: DEFAULT_SORT,
  },
  {
    id: "deployed",
    name: "Deployed",
    builtIn: true,
    filters: { ...DEFAULT_FILTERS, deploy: "linked" },
    sort: DEFAULT_SORT,
  },
  {
    id: "pinned",
    name: "Pinned",
    builtIn: true,
    filters: { ...DEFAULT_FILTERS, pinned: true },
    sort: DEFAULT_SORT,
  },
  {
    id: "critical",
    name: "Critical & high",
    builtIn: true,
    filters: { ...DEFAULT_FILTERS, priorities: ["critical", "high"] },
    sort: { key: "priority", dir: "desc" },
  },
  {
    id: "stale",
    name: "Gone quiet",
    builtIn: true,
    filters: { ...DEFAULT_FILTERS, activity: ["stale", "dormant"] },
    sort: { key: "pushed", dir: "asc" },
  },
];

/** Count rows per value for a facet (used by filter menus). */
export function facet<T extends string>(
  rows: RepoRow[],
  pick: (r: RepoRow) => T,
): { value: T; count: number }[] {
  const m = new Map<T, number>();
  for (const r of rows) m.set(pick(r), (m.get(pick(r)) ?? 0) + 1);
  return [...m.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/* ---------------- Overview ---------------- */

export interface AttentionItem {
  id: string;
  severity: "critical" | "warning" | "info";
  kind: "deploy_failed" | "ci_failing" | "account" | "stale_priority" | "open_prs";
  title: string;
  detail: string;
  target: { type: "repo" | "pages" | "account"; key: string };
  at: string | null;
}

export interface EstateSummary {
  repos: number;
  privateRepos: number;
  ciFailing: number;
  ciPassing: number;
  openPrs: number;
  openIssues: number;
  pushed7d: number;
  stale: number;
  pinned: number;
  pages: number;
  workers: number;
  zones: number;
  failingDeploys: number;
  building: number;
  linkedRepos: number;
  unlinkedPages: number;
}

export function summarize(e: LinkedEstate, zones: number, now = Date.now()): EstateSummary {
  const within = (iso: string | null | undefined, days: number) =>
    !!iso && now - Date.parse(iso) < days * DAY;
  const active = e.repos.filter((r) => !r.isArchived);
  return {
    repos: e.repos.length,
    privateRepos: e.repos.filter((r) => r.isPrivate).length,
    ciFailing: active.filter((r) => ciFailing(r.ciState)).length,
    ciPassing: active.filter((r) => r.ciState === "SUCCESS").length,
    openPrs: active.reduce((s, r) => s + r.openPrs, 0),
    openIssues: active.reduce((s, r) => s + r.openIssues, 0),
    pushed7d: e.repos.filter((r) => within(r.pushedAt, 7)).length,
    stale: active.filter((r) => !within(r.pushedAt, 180)).length,
    pinned: e.repos.filter((r) => r.annotation.pinned).length,
    pages: e.pages.length,
    workers: e.workers.length,
    zones,
    failingDeploys: e.pages.filter((p) => p.health === "failing").length,
    building: e.pages.filter((p) => p.health === "building").length,
    linkedRepos: e.repos.filter((r) => r.links.length).length,
    unlinkedPages: e.pages.filter((p) => !p.linkedRepo).length,
  };
}

const SEV = { critical: 0, warning: 1, info: 2 } as const;

export function attentionItems(e: LinkedEstate, snapshot: EstateSnapshot): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const a of snapshot.cloudflare.accounts) {
    if (a.state === "error" || a.state === "partial") {
      items.push({
        id: "cf-account:" + a.accountId,
        severity: a.state === "error" ? "critical" : "warning",
        kind: "account",
        title: a.label + ": Cloudflare access problem",
        detail: a.errors[0] ?? "Some resources could not be read with this token",
        target: { type: "account", key: a.accountId },
        at: null,
      });
    }
  }
  for (const a of snapshot.github.accounts) {
    if (a.state === "error") {
      items.push({
        id: "gh-account:" + a.account,
        severity: "warning",
        kind: "account",
        title: a.account + ": GitHub inventory failed",
        detail: a.error ?? "The account could not be indexed",
        target: { type: "account", key: a.account },
        at: a.fetchedAt,
      });
    }
  }
  for (const p of e.pages) {
    if (p.health === "failing") {
      items.push({
        id: "deploy:" + p.key,
        severity: "critical",
        kind: "deploy_failed",
        title: p.name + " production deploy failed",
        detail: [p.accountLabel, p.latestDeployment?.branch, p.latestDeployment?.commitMessage]
          .filter(Boolean)
          .join(" · "),
        target: { type: "pages", key: p.key },
        at: p.latestDeployment?.createdOn ?? null,
      });
    }
  }
  for (const r of e.repos) {
    if (r.isArchived) continue;
    if (ciFailing(r.ciState)) {
      items.push({
        id: "ci:" + r.key,
        severity: "critical",
        kind: "ci_failing",
        title: r.name + ": CI failing on " + (r.defaultBranch ?? "default branch"),
        detail: r.lastCommit?.message ?? r.fullName,
        target: { type: "repo", key: r.key },
        at: r.lastCommit?.date ?? r.pushedAt,
      });
    }
    const important =
      r.annotation.pinned ||
      r.annotation.priority === "critical" ||
      r.annotation.priority === "high";
    if (important && (r.activity === "stale" || r.activity === "dormant")) {
      items.push({
        id: "stale:" + r.key,
        severity: "warning",
        kind: "stale_priority",
        title: r.name + " has gone quiet",
        detail:
          (r.annotation.priority ?? "pinned") +
          " · last push " +
          (r.pushedAt ? r.pushedAt.slice(0, 10) : "never"),
        target: { type: "repo", key: r.key },
        at: r.pushedAt,
      });
    }
    if (important && r.openPrs > 0) {
      items.push({
        id: "prs:" + r.key,
        severity: "info",
        kind: "open_prs",
        title: r.name + ": " + r.openPrs + " open pull request" + (r.openPrs > 1 ? "s" : ""),
        detail: "Review or close to keep " + (r.defaultBranch ?? "main") + " clean",
        target: { type: "repo", key: r.key },
        at: r.pushedAt,
      });
    }
  }
  return items.sort(
    (a, b) => SEV[a.severity] - SEV[b.severity] || (b.at ?? "").localeCompare(a.at ?? ""),
  );
}

/** CSV export of the current repo view. Values are quoted; formulas are neutralised. */
export function reposToCsv(rows: RepoRow[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const head = [
    "repo",
    "account",
    "visibility",
    "language",
    "activity",
    "ci",
    "health",
    "open_prs",
    "open_issues",
    "pushed_at",
    "priority",
    "status",
    "pinned",
    "deployments",
    "url",
  ];
  const lines = rows.map((r) =>
    [
      r.fullName,
      r.account,
      r.isPrivate ? "private" : "public",
      r.primaryLanguage,
      r.activity,
      r.ciState ?? "none",
      r.health.score,
      r.openPrs,
      r.openIssues,
      r.pushedAt,
      r.annotation.priority,
      r.annotation.status,
      r.annotation.pinned ? "yes" : "",
      r.links.map((l) => l.name).join(" "),
      r.url,
    ]
      .map(cell)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}
