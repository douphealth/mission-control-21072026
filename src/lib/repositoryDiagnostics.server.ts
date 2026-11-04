/**
 * On-demand GitHub operational diagnostics.
 * Never sweep 270 repositories or assert uptime from workflow metadata.
 * Cloudflare Access is enforced by the server function before this collector runs.
 */
import { MANAGED_GITHUB_ACCOUNTS } from "@/lib/githubPrivateInventory.server";

export type RepositoryDiagnostics = {
  repository: string;
  fetchedAt: string;
  source: "GitHub REST API";
  state: "live" | "partial" | "unavailable";
  errors: string[];
  defaultBranch: string | null;
  latestCI: {
    conclusion: string | null;
    status: string;
    name: string;
    sha: string | null;
    event: string | null;
    url: string;
    createdAt: string | null;
  } | null;
  recentOpenPRs: { number: number; title: string; url: string; updatedAt: string | null }[];
  /** Up to three newest PRs, NOT an exact open PR count. */
  openPRsTruncated: boolean;
  deployments: { environment: string; ref: string | null; createdAt: string | null; url: string }[];
};
const REPO = /^[a-zA-Z0-9_.-]{1,100}$/;
const text = (x: unknown) => typeof x === "string" && x.trim() ? x.trim() : null;
const obj = (x: unknown): Record<string, any> =>
  x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, any> : {};
function accountToken(owner: string, env: Record<string, string | undefined>): string | null {
  try {
    const record = obj(JSON.parse(env.GITHUB_PORTFOLIO_TOKENS_JSON || "{}"));
    const exact = MANAGED_GITHUB_ACCOUNTS.find(x => x.toLowerCase() === owner.toLowerCase());
    return exact && typeof record[exact] === "string" && record[exact].length > 15 ? record[exact] : null;
  } catch { return null; }
}
export async function collectRepositoryDiagnostics(
  owner: string, repo: string, environment: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<RepositoryDiagnostics> {
  const account = MANAGED_GITHUB_ACCOUNTS.find(x => x.toLowerCase() === owner.toLowerCase());
  if (!account || !REPO.test(repo)) throw new Error("Unknown repository identifier");
  const result: RepositoryDiagnostics = {
    repository: account + "/" + repo, fetchedAt: new Date().toISOString(),
    source: "GitHub REST API", state: "unavailable", errors: [],
    defaultBranch: null, latestCI: null, recentOpenPRs: [],
    openPRsTruncated: false, deployments: [],
  };
  const token = accountToken(account, environment);
  // Private repository details are never searched with unauthenticated fallback.
  if (!token) {
    result.errors.push("Account GitHub API token not configured. Repository diagnostics require server-side read access.");
    return result;
  }
  const base = "https://api.github.com/repos/" + encodeURIComponent(account) + "/" + encodeURIComponent(repo);
  const get = async (path: string) => {
    const response = await fetcher(base + path, {
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("GitHub HTTP " + response.status);
    return response.json() as Promise<unknown>;
  };
  let metadata: Record<string, any>;
  try {
    metadata = obj(await get(""));
    if (!metadata.full_name || metadata.full_name.toLowerCase() !==
      (account + "/" + repo).toLowerCase()) throw new Error("Repository identity mismatch");
    result.defaultBranch = text(metadata.default_branch);
  } catch (error) {
    result.errors.push("Repository metadata unavailable: " +
      (error instanceof Error ? error.message : "unknown error"));
    return result;
  }
  const branch = result.defaultBranch ? "&branch=" + encodeURIComponent(result.defaultBranch) : "";
  const requests = await Promise.allSettled([
    get("/actions/runs?per_page=1" + branch),
    get("/pulls?state=open&sort=updated&direction=desc&per_page=4"),
    get("/deployments?per_page=5"),
  ]);
  const [ci, pulls, deployments] = requests;
  if (ci.status === "fulfilled") {
    const run = obj(obj(ci.value).workflow_runs?.[0]);
    const url = text(run.html_url);
    if (url && url.startsWith("https://github.com/")) result.latestCI = {
      conclusion: text(run.conclusion), status: text(run.status) || "unknown",
      name: text(run.name) || "Workflow", sha: text(run.head_sha),
      event: text(run.event), url, createdAt: text(run.created_at),
    };
  } else result.errors.push("Actions read unavailable: " + String(ci.reason).slice(0,100));
  if (pulls.status === "fulfilled" && Array.isArray(pulls.value)) {
    result.openPRsTruncated = pulls.value.length > 3;
    result.recentOpenPRs = pulls.value.slice(0,3).flatMap(raw => {
      const p = obj(raw), url = text(p.html_url);
      return Number.isInteger(p.number) && url?.startsWith("https://github.com/")
        ? [{number:p.number,title:text(p.title) || "Pull request",url,updatedAt:text(p.updated_at)}] : [];
    });
  } else result.errors.push("PR read unavailable: " + (pulls.status === "rejected" ? String(pulls.reason).slice(0,100) : "invalid response"));
  if (deployments.status === "fulfilled" && Array.isArray(deployments.value)) {
    result.deployments = deployments.value.slice(0,5).flatMap(raw => {
      const d = obj(raw), url = text(d.html_url);
      return url?.startsWith("https://github.com/")
        ? [{environment:text(d.environment) || "unspecified",ref:text(d.ref),
          createdAt:text(d.created_at),url}] : [];
    });
  } else result.errors.push("Deployments read unavailable: " +
    (deployments.status === "rejected" ? String(deployments.reason).slice(0,100) : "invalid response"));
  result.state = result.errors.length ? "partial" : "live";
  return result;
}
