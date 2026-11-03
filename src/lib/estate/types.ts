/**
 * Wire types for the GitHub + Cloudflare estate. Client-safe: these shapes are
 * what the authenticated server functions return. They never contain tokens,
 * raw provider payloads or provider error bodies.
 */

export const ESTATE_GITHUB_ACCOUNTS = [
  "douphealth",
  "Papalexios",
  "papalexios01",
  "papalexios001-wq",
] as const;
export type EstateGitHubAccount = (typeof ESTATE_GITHUB_ACCOUNTS)[number];

export type EstateTruth = "live" | "partial" | "error" | "not_connected";
export type EstateGate = "ok" | "access_not_configured" | "login_required" | "unavailable";

export type CiState = "SUCCESS" | "FAILURE" | "ERROR" | "PENDING" | "EXPECTED" | null;
export type ActivityBand = "hot" | "active" | "quiet" | "stale" | "dormant";
export type PagesHealth = "healthy" | "failing" | "building" | "unknown";

export interface RepoCommit {
  sha: string;
  message: string;
  author: string | null;
  date: string;
  url: string | null;
}

export interface RepoRelease {
  tag: string;
  name: string | null;
  publishedAt: string | null;
  url: string;
}

/** GitHub-observed fields for one repository. */
export interface EstateRepo {
  fullName: string;
  owner: string;
  name: string;
  /** Managed account whose token indexed the repo. */
  account: EstateGitHubAccount;
  description: string | null;
  url: string;
  homepage: string | null;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  primaryLanguage: string | null;
  languageColor: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  openPrs: number;
  diskKb: number;
  defaultBranch: string | null;
  commitCount: number;
  lastCommit: RepoCommit | null;
  ciState: CiState;
  latestRelease: RepoRelease | null;
  license: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

export interface GitHubAccountStatus {
  account: EstateGitHubAccount;
  state: "live" | "error" | "not_connected";
  repoCount: number;
  /** Safe, generic message. Never a provider body. */
  error: string | null;
  fetchedAt: string | null;
}

export interface CfDeployment {
  id: string;
  shortId: string;
  url: string | null;
  environment: string;
  branch: string | null;
  commitHash: string | null;
  commitMessage: string | null;
  status: string;
  stage: string;
  createdOn: string;
  aliases: string[];
  isCurrentProduction: boolean;
}

export interface CfPagesProject {
  key: string;
  accountId: string;
  accountLabel: string;
  name: string;
  subdomain: string | null;
  url: string | null;
  domains: string[];
  productionBranch: string | null;
  createdOn: string | null;
  source: {
    type: "github" | "gitlab" | "direct_upload" | string;
    owner: string | null;
    repo: string | null;
    productionDeploymentsEnabled: boolean;
    previewDeploymentsEnabled: boolean;
  };
  buildCommand: string | null;
  outputDir: string | null;
  latestDeployment: CfDeployment | null;
  productionDeployment: CfDeployment | null;
  health: PagesHealth;
  dashboardUrl: string;
}

export interface CfWorker {
  key: string;
  accountId: string;
  accountLabel: string;
  name: string;
  handlers: string[];
  routes: string[];
  customDomains: string[];
  compatibilityDate: string | null;
  usageModel: string | null;
  createdOn: string | null;
  modifiedOn: string | null;
  dashboardUrl: string;
}

export interface CfZone {
  id: string;
  accountId: string;
  accountLabel: string;
  name: string;
  status: string;
  paused: boolean;
  plan: string;
  nameServers: string[];
  modifiedOn: string | null;
  dashboardUrl: string;
}

export interface CfAccountStatus {
  accountId: string;
  label: string;
  state: "live" | "partial" | "error" | "not_connected";
  pagesCount: number;
  workersCount: number;
  zonesCount: number;
  errors: string[];
  dashboardUrl: string;
}

/** Raw collected estate before links / scores are derived on the client. */
export interface EstateSnapshot {
  version: 1;
  fetchedAt: string;
  github: {
    truthState: EstateTruth;
    accounts: GitHubAccountStatus[];
    repos: EstateRepo[];
  };
  cloudflare: {
    truthState: EstateTruth;
    accounts: CfAccountStatus[];
    pages: CfPagesProject[];
    workers: CfWorker[];
    zones: CfZone[];
  };
}

export interface EstateResponse {
  gate: EstateGate;
  message: string | null;
  /** Null unless the viewer passed the Access check. */
  snapshot: EstateSnapshot | null;
  /** True when the server answered from its warm cache. */
  cached: boolean;
}

/* ---------------- On-demand detail ---------------- */

export interface LivePullRequest {
  number: number;
  title: string;
  author: string | null;
  createdAt: string;
  url: string;
  draft: boolean;
}
export interface LiveIssue {
  number: number;
  title: string;
  author: string | null;
  createdAt: string;
  url: string;
  labels: string[];
}
export interface LiveWorkflowRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  branch: string | null;
  event: string | null;
  createdAt: string;
  url: string;
}
export interface RepoLive {
  commits: RepoCommit[];
  pullRequests: LivePullRequest[];
  issues: LiveIssue[];
  workflowRuns: LiveWorkflowRun[];
  releases: RepoRelease[];
  branches: { name: string; protected: boolean }[];
  fetchedAt: string;
  /** Sections that could not be loaded (permissions / disabled features). */
  unavailable: string[];
}

export interface DeploymentLogLine {
  ts: string | null;
  line: string;
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

export type DetailResult<T> =
  | { ok: true; data: T }
  | { ok: false; gate: EstateGate | "error"; message: string };
