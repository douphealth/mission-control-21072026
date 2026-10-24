/**
 * Authenticated GitHub inventory. Private names and links never enter the
 * frontend build, only the verified server-function response.
 *
 * Tokens MUST be installed in server secrets. ChatGPT-connected GitHub tokens
 * do not automatically authorize deployed Mission Control.
 */
export const MANAGED_GITHUB_ACCOUNTS = ["douphealth", "Papalexios", "papalexios001-wq"] as const;
export type ManagedGitHubAccount = typeof MANAGED_GITHUB_ACCOUNTS[number];
export type GitHubInventoryState = "live" | "partial" | "error" | "not_connected";
export type PrivateRepoSnapshot = {
  owner: ManagedGitHubAccount;
  name: string;
  url: string;
  defaultBranch: string | null;
  pushedAt: string | null;
  archived: boolean;
  description: string | null;
};
export type GitHubPrivateInventory = {
  truthState: GitHubInventoryState;
  fetchedAt: string;
  repositories: PrivateRepoSnapshot[];
  connectedAccounts: ManagedGitHubAccount[];
  errors: string[];
};
const BASE = "https://api.github.com";
const USER_REPO = /^[A-Za-z0-9_.-]+$/;
const MAX_PAGES = 25; // fails closed instead of returning a truncated "complete" result

function secrets(env: Record<string, string | undefined> = process.env):
    Partial<Record<ManagedGitHubAccount, string>> {
  let raw: unknown;
  try { raw = JSON.parse(env["GITHUB_PORTFOLIO_TOKENS_JSON"] || "{}"); }
  catch { return {}; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const entries = MANAGED_GITHUB_ACCOUNTS.flatMap(owner => {
    const secret = record[owner];
    return typeof secret === "string" && secret.length > 15
      ? [[owner, secret.trim()] as const] : [];
  });
  return Object.fromEntries(entries);
}
async function api(path: string, token: string): Promise<unknown> {
  const res = await fetch(BASE + path, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error("GitHub HTTP " + res.status);
  return await res.json();
}
async function collectOne(owner: ManagedGitHubAccount, token: string): Promise<PrivateRepoSnapshot[]> {
  const profile = await api("/user", token) as Record<string, unknown>;
  if (String(profile?.login || "").toLowerCase() !== owner.toLowerCase()) {
    throw new Error("GitHub token identity does not match the configured account");
  }
  const output: PrivateRepoSnapshot[] = [];
  let finished = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const payload = await api("/user/repos?affiliation=owner&per_page=100&page=" + page +
      "&sort=full_name&direction=asc", token);
    if (!Array.isArray(payload)) throw new Error("Invalid GitHub repository response");
    for (const row of payload) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, any>;
      const name = item.name;
      if (!USER_REPO.test(String(name)) || item.owner?.login?.toLowerCase() !== owner.toLowerCase()) continue;
      if (item.private !== true && item.visibility !== "private") continue;
      output.push({
        owner, name,
        url: "https://github.com/" + owner + "/" + encodeURIComponent(name),
        defaultBranch: typeof item.default_branch === "string" ? item.default_branch : null,
        pushedAt: typeof item.pushed_at === "string" ? item.pushed_at : null,
        archived: item.archived === true,
        description: typeof item.description === "string" ? item.description.slice(0, 400) : null,
      });
    }
    if (payload.length < 100) { finished = true; break; }
  }
  if (!finished) throw new Error("GitHub inventory pagination limit reached");
  return output;
}
export async function collectPrivateGithubInventory(
  environment: Record<string, string | undefined> = process.env,
): Promise<GitHubPrivateInventory> {
  const fetchedAt = new Date().toISOString();
  const accounts = secrets(environment);
  const owners = MANAGED_GITHUB_ACCOUNTS.filter(owner => Boolean(accounts[owner]));
  if (!owners.length) return {
    truthState: "not_connected", fetchedAt, repositories: [], connectedAccounts: [], errors: [],
  };
  const results = await Promise.allSettled(owners.map(owner => collectOne(owner, accounts[owner]!)));
  const repositories: PrivateRepoSnapshot[] = [];
  const errors: string[] = [];
  for (let i = 0; i < owners.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") repositories.push(...result.value);
    else errors.push("GitHub private inventory unavailable for " + owners[i]);
  }
  for (const owner of MANAGED_GITHUB_ACCOUNTS) {
    if (!accounts[owner]) errors.push("GitHub account not connected: " + owner);
  }
  const unique = new Map(repositories.map(repo => [repo.url.toLowerCase(), repo]));
  return {
    truthState: errors.length ? unique.size ? "partial" : "error" : "live",
    fetchedAt,
    repositories: [...unique.values()].sort((a,b) => a.url.localeCompare(b.url)),
    connectedAccounts: owners,
    errors,
  };
}
