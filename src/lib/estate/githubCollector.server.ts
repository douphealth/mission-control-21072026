/**
 * Request-time GitHub collector for the four managed accounts.
 * Tokens come only from GITHUB_PORTFOLIO_TOKENS_JSON (owner → token) and are
 * never returned, logged or cached in a response. Provider error bodies are
 * replaced by generic, safe messages.
 */
import { githubPortfolioTokens } from "@/lib/githubPrivateInventory.server";
import {
  ESTATE_GITHUB_ACCOUNTS,
  type CiState,
  type EstateGitHubAccount,
  type EstateRepo,
  type EstateTruth,
  type GitHubAccountStatus,
  type RepoLive,
} from "@/lib/estate/types";

const API = "https://api.github.com";
const PAGE_SIZE = 20;
const RETRY_PAGE_SIZE = 8;
const MAX_PAGES = 40; // 800 repos per account; beyond that fail closed, never truncate silently
const TIMEOUT_MS = 20_000;
const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

export class GitHubCollectorError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubCollectorError";
  }
}

type Env = Record<string, string | undefined>;
export type GitHubFetch = typeof fetch;

function headers(token: string, accept = "application/vnd.github+json"): Record<string, string> {
  return {
    Authorization: "Bearer " + token,
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mission-control",
  };
}

async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  f: GitHubFetch,
): Promise<T> {
  const res = await f(API + "/graphql", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  let body: { data?: T; errors?: unknown[] } | null = null;
  try {
    body = (await res.json()) as { data?: T; errors?: unknown[] };
  } catch {
    throw new GitHubCollectorError(
      "GitHub GraphQL returned a non-JSON response (HTTP " + res.status + ")",
      res.status || 502,
    );
  }
  if (!res.ok) throw new GitHubCollectorError("GitHub GraphQL HTTP " + res.status, res.status);
  if (!body?.data) throw new GitHubCollectorError("GitHub GraphQL returned no data", 502);
  return body.data;
}

async function rest<T>(token: string, path: string, f: GitHubFetch): Promise<T> {
  const res = await f(API + path, {
    headers: headers(token),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new GitHubCollectorError("GitHub HTTP " + res.status, res.status);
  return (await res.json()) as T;
}

const REPO_FIELDS = `
fragment RepoFields on Repository {
  nameWithOwner name owner { login } description url homepageUrl
  isPrivate isFork isArchived isTemplate
  primaryLanguage { name color }
  repositoryTopics(first: 12) { nodes { topic { name } } }
  stargazerCount forkCount
  issues(states: OPEN) { totalCount }
  pullRequests(states: OPEN) { totalCount }
  diskUsage
  defaultBranchRef { name target { ... on Commit {
    oid messageHeadline committedDate url
    author { name user { login } }
    history { totalCount }
    statusCheckRollup { state }
  } } }
  latestRelease { tagName name publishedAt url }
  licenseInfo { spdxId name }
  createdAt updatedAt pushedAt
}`;

export interface GqlRepo {
  nameWithOwner: string;
  name: string;
  owner: { login: string };
  description: string | null;
  url: string;
  homepageUrl: string | null;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  primaryLanguage: { name: string; color: string | null } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  stargazerCount: number;
  forkCount: number;
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
  diskUsage: number | null;
  defaultBranchRef: {
    name: string;
    target: {
      oid?: string;
      messageHeadline?: string;
      committedDate?: string;
      url?: string;
      author?: { name: string | null; user: { login: string } | null } | null;
      history?: { totalCount: number };
      statusCheckRollup?: { state: string } | null;
    } | null;
  } | null;
  latestRelease: {
    tagName: string;
    name: string | null;
    publishedAt: string | null;
    url: string;
  } | null;
  licenseInfo: { spdxId: string | null; name: string } | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

const CI_STATES = new Set(["SUCCESS", "FAILURE", "ERROR", "PENDING", "EXPECTED"]);
const safeUrl = (u: string | null | undefined) => (u && /^https:\/\/[^\s]+$/i.test(u) ? u : null);

export function mapRepo(r: GqlRepo, account: EstateGitHubAccount): EstateRepo {
  const t = r.defaultBranchRef?.target ?? null;
  const ci = t?.statusCheckRollup?.state ?? null;
  return {
    fullName: r.nameWithOwner,
    owner: r.owner.login,
    name: r.name,
    account,
    description: r.description ? r.description.slice(0, 400) : null,
    url: r.url,
    homepage: safeUrl(r.homepageUrl),
    isPrivate: r.isPrivate,
    isFork: r.isFork,
    isArchived: r.isArchived,
    isTemplate: r.isTemplate,
    primaryLanguage: r.primaryLanguage?.name ?? null,
    languageColor: r.primaryLanguage?.color ?? null,
    topics: (r.repositoryTopics?.nodes ?? []).map((n) => n.topic.name),
    stars: r.stargazerCount,
    forks: r.forkCount,
    openIssues: r.issues.totalCount,
    openPrs: r.pullRequests.totalCount,
    diskKb: r.diskUsage ?? 0,
    defaultBranch: r.defaultBranchRef?.name ?? null,
    commitCount: t?.history?.totalCount ?? 0,
    lastCommit:
      t?.oid && t.committedDate
        ? {
            sha: t.oid,
            message: (t.messageHeadline ?? "").slice(0, 200),
            author: t.author?.user?.login ?? t.author?.name ?? null,
            date: t.committedDate,
            url: t.url ?? null,
          }
        : null,
    ciState: (ci && CI_STATES.has(ci) ? ci : null) as CiState,
    latestRelease: r.latestRelease
      ? {
          tag: r.latestRelease.tagName,
          name: r.latestRelease.name,
          publishedAt: r.latestRelease.publishedAt,
          url: r.latestRelease.url,
        }
      : null,
    license:
      r.licenseInfo?.spdxId && r.licenseInfo.spdxId !== "NOASSERTION"
        ? r.licenseInfo.spdxId
        : (r.licenseInfo?.name ?? null),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    pushedAt: r.pushedAt,
  };
}

type Page = {
  viewer: {
    login: string;
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: (GqlRepo | null)[];
    };
  };
};

const REPOS_QUERY = `${REPO_FIELDS}
query($cursor: String, $size: Int!) {
  viewer {
    login
    repositories(first: $size, after: $cursor,
      ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER],
      orderBy: { field: PUSHED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes { ...RepoFields }
    }
  }
}`;

/** Every repo one account can see. Verifies the token belongs to `account`. */
export async function collectAccountRepos(
  account: EstateGitHubAccount,
  token: string,
  f: GitHubFetch = fetch,
): Promise<EstateRepo[]> {
  const out: EstateRepo[] = [];
  let cursor: string | null = null;
  let size = PAGE_SIZE;
  for (let page = 0; page < MAX_PAGES; page++) {
    let data: Page;
    try {
      data = await graphql<Page>(token, REPOS_QUERY, { cursor, size }, f);
    } catch (err) {
      // Large pages can exceed GitHub's per-query time budget: shrink once at this cursor.
      if (
        size === RETRY_PAGE_SIZE ||
        (err instanceof GitHubCollectorError && (err.status === 401 || err.status === 403))
      )
        throw err;
      size = RETRY_PAGE_SIZE;
      data = await graphql<Page>(token, REPOS_QUERY, { cursor, size }, f);
    }
    if (page === 0 && data.viewer.login.toLowerCase() !== account.toLowerCase()) {
      throw new GitHubCollectorError("Token identity does not match the configured account", 403);
    }
    const conn = data.viewer.repositories;
    for (const node of conn.nodes) if (node) out.push(mapRepo(node, account));
    if (!conn.pageInfo.hasNextPage) return out;
    cursor = conn.pageInfo.endCursor;
  }
  throw new GitHubCollectorError(
    "Repository pagination limit reached; incomplete inventory rejected",
    507,
  );
}

/**
 * First-source-wins dedupe, except that the account that OWNS a repo always
 * wins over an account that only collaborates on it.
 */
export function mergeRepos(lists: EstateRepo[][]): EstateRepo[] {
  const byKey = new Map<string, EstateRepo>();
  for (const list of lists) {
    for (const r of list) {
      const k = r.fullName.toLowerCase();
      const prev = byKey.get(k);
      if (!prev) byKey.set(k, r);
      else if (
        prev.account.toLowerCase() !== prev.owner.toLowerCase() &&
        r.account.toLowerCase() === r.owner.toLowerCase()
      ) {
        byKey.set(k, r);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
}

function safeError(err: unknown): string {
  if (err instanceof GitHubCollectorError) {
    if (err.status === 401)
      return "Token rejected (HTTP 401): rotate it in GITHUB_PORTFOLIO_TOKENS_JSON";
    if (err.status === 403 && /identity/.test(err.message)) return err.message;
    if (err.status === 403 || err.status === 429)
      return "GitHub rate limit or missing token scope (HTTP " + err.status + ")";
    return err.message;
  }
  if (err instanceof Error && err.name === "TimeoutError") return "GitHub did not answer in time";
  return "GitHub inventory failed";
}

export async function collectGitHubEstate(
  env: Env,
  f: GitHubFetch = fetch,
): Promise<{ truthState: EstateTruth; accounts: GitHubAccountStatus[]; repos: EstateRepo[] }> {
  const tokens = githubPortfolioTokens(env) as Partial<Record<EstateGitHubAccount, string>>;
  const configured = ESTATE_GITHUB_ACCOUNTS.filter((a) => tokens[a]);
  // Accounts are few: run them all at once; each paginates sequentially.
  const results = await Promise.allSettled(
    configured.map((a) => collectAccountRepos(a, tokens[a]!, f)),
  );
  const fetchedAt = new Date().toISOString();
  const lists: EstateRepo[][] = [];
  const accounts: GitHubAccountStatus[] = ESTATE_GITHUB_ACCOUNTS.map((account) => {
    const i = configured.indexOf(account);
    if (i < 0)
      return { account, state: "not_connected", repoCount: 0, error: null, fetchedAt: null };
    const r = results[i]!;
    if (r.status === "fulfilled") {
      lists.push(r.value);
      return { account, state: "live", repoCount: r.value.length, error: null, fetchedAt };
    }
    return { account, state: "error", repoCount: 0, error: safeError(r.reason), fetchedAt };
  });
  const repos = mergeRepos(lists);
  const live = accounts.filter((a) => a.state === "live").length;
  const truthState: EstateTruth = !configured.length
    ? "not_connected"
    : live === ESTATE_GITHUB_ACCOUNTS.length
      ? "live"
      : live > 0
        ? "partial"
        : "error";
  return { truthState, accounts, repos };
}

/* ---------------- Live repository detail ---------------- */

interface RestCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } | null };
  author: { login: string } | null;
}
interface RestPull {
  number: number;
  title: string;
  user: { login: string } | null;
  created_at: string;
  html_url: string;
  draft?: boolean;
}
interface RestIssue extends RestPull {
  labels: ({ name: string } | string)[];
  pull_request?: unknown;
}
interface RestRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  event: string | null;
  created_at: string;
  html_url: string;
}
interface RestRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  html_url: string;
}

/** Pick the token for a repo: the indexing account first, then the owner's own token. */
export function tokenForRepo(env: Env, owner: string, account: string | null): string | null {
  const tokens = githubPortfolioTokens(env) as Partial<Record<string, string>>;
  const find = (login: string | null) =>
    login ? ESTATE_GITHUB_ACCOUNTS.find((a) => a.toLowerCase() === login.toLowerCase()) : undefined;
  const a = find(account);
  const o = find(owner);
  return (a && tokens[a]) || (o && tokens[o]) || null;
}

export async function fetchRepoLive(
  env: Env,
  input: { owner: string; name: string; account: string | null },
  f: GitHubFetch = fetch,
): Promise<RepoLive> {
  if (!NAME.test(input.owner) || !NAME.test(input.name))
    throw new GitHubCollectorError("Invalid repository", 400);
  const token = tokenForRepo(env, input.owner, input.account);
  if (!token)
    throw new GitHubCollectorError(
      "No GitHub token is configured for this repository's account",
      404,
    );
  const base = "/repos/" + encodeURIComponent(input.owner) + "/" + encodeURIComponent(input.name);
  const unavailable: string[] = [];
  const settle = async <T>(label: string, p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      if (err instanceof GitHubCollectorError && err.status === 401) throw err;
      unavailable.push(label);
      return fallback;
    }
  };
  const [commits, pulls, issues, runs, branches, releases] = await Promise.all([
    settle("commits", rest<RestCommit[]>(token, base + "/commits?per_page=20", f), []),
    settle("pull requests", rest<RestPull[]>(token, base + "/pulls?state=open&per_page=30", f), []),
    settle("issues", rest<RestIssue[]>(token, base + "/issues?state=open&per_page=40", f), []),
    settle(
      "workflow runs",
      rest<{ workflow_runs: RestRun[] }>(token, base + "/actions/runs?per_page=15", f),
      { workflow_runs: [] },
    ),
    settle(
      "branches",
      rest<{ name: string; protected: boolean }[]>(token, base + "/branches?per_page=100", f),
      [],
    ),
    settle("releases", rest<RestRelease[]>(token, base + "/releases?per_page=10", f), []),
  ]);
  return {
    commits: commits.map((c) => ({
      sha: c.sha,
      message: (c.commit.message.split("\n")[0] ?? "").slice(0, 200),
      author: c.author?.login ?? c.commit.author?.name ?? null,
      date: c.commit.author?.date ?? new Date(0).toISOString(),
      url: c.html_url,
    })),
    pullRequests: pulls.map((p) => ({
      number: p.number,
      title: p.title,
      author: p.user?.login ?? null,
      createdAt: p.created_at,
      url: p.html_url,
      draft: Boolean(p.draft),
    })),
    issues: issues
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        author: i.user?.login ?? null,
        createdAt: i.created_at,
        url: i.html_url,
        labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)),
      })),
    workflowRuns: (runs.workflow_runs ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      branch: r.head_branch,
      event: r.event,
      createdAt: r.created_at,
      url: r.html_url,
    })),
    branches: branches.map((b) => ({ name: b.name, protected: b.protected })),
    releases: releases.map((r) => ({
      tag: r.tag_name,
      name: r.name,
      publishedAt: r.published_at,
      url: r.html_url,
    })),
    fetchedAt: new Date().toISOString(),
    unavailable,
  };
}
