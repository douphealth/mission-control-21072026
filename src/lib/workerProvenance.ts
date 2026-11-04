/**
 * Cloudflare Worker endpoint and Git provenance parsing.
 * Only Cloudflare-reported, enabled routes and explicit build source records
 * become links. The latest build is NOT assumed to be the serving deployment.
 */
export type WorkerBuildSource = {
  sourceType: "github" | "gitlab" | null;
  repoUrl: string | null;
  branch: string | null;
  commit: string | null;
  evidence: "cloudflare-build" | null;
};

const obj = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {};
const str = (x: unknown): string | null =>
  typeof x === "string" && x.trim() ? x.trim() : null;
const repoPart = /^[A-Za-z0-9_.-]+$/;
const workerPart = /^[a-zA-Z0-9_.-]{1,160}$/;

export function workerBuildSource(raw: unknown): WorkerBuildSource {
  const build = obj(raw);
  const metadata = obj(build.build_trigger_metadata);
  const trigger = obj(build.trigger);
  const connection = obj(build.repo_connection || metadata.repo_connection || trigger.repo_connection);
  const provider = str(connection.provider_type) || str(metadata.provider_type);
  const sourceType = provider === "github" || provider === "gitlab" ? provider : null;
  const name = str(connection.repo_name) || str(metadata.repo_name);
  const account = str(connection.provider_account_name) || str(metadata.provider_account_name);
  let repoUrl: string | null = null;
  if (sourceType && name) {
    const parts = name.replace(/\.git$/i, "").split("/");
    if (parts.length === 2 && parts.every(p => repoPart.test(p))) {
      repoUrl = "https://" + (sourceType === "github" ? "github.com/" : "gitlab.com/") + parts.join("/");
    } else if (account && repoPart.test(account) && repoPart.test(name)) {
      repoUrl = "https://" + (sourceType === "github" ? "github.com/" : "gitlab.com/") + account + "/" + name;
    }
  }
  return {
    sourceType,
    repoUrl,
    branch: str(metadata.branch),
    commit: /^[a-f0-9]{7,40}$/i.test(str(metadata.commit_hash) || "") ? str(metadata.commit_hash) : null,
    evidence: Object.keys(build).length ? "cloudflare-build" : null,
  };
}

/**
 * A modern Workers API entry provides subdomain.enabled. Account subdomain
 * is read from Cloudflare; never infer it from an account email or ID.
 * Cloudflare can return a potential URL even with enabled=false: never link it.
 */
export function workersDevEndpoint(name: string, subdomainRaw: unknown, accountSubdomain: unknown): string | null {
  const sub = obj(subdomainRaw);
  if (sub.enabled !== true || !workerPart.test(name)) return null;
  const explicit = str(sub.url);
  if (explicit) {
    try {
      const url = new URL(explicit.startsWith("https://") ? explicit : "https://" + explicit);
      if (url.protocol === "https:" && !url.username && !url.password &&
          url.hostname.endsWith(".workers.dev") && url.hostname.startsWith(name.toLowerCase() + ".") &&
          (url.pathname === "/" || url.pathname === "") && !url.search && !url.hash) return url.origin + "/";
    } catch { /* Use the account's verified subdomain if available. */ }
  }
  const raw = str(accountSubdomain);
  if (!raw) return null;
  const suffix = raw.replace(/\.workers\.dev$/i, "");
  if (!/^[a-z0-9-]{1,63}$/i.test(suffix)) return null;
  return "https://" + name + "." + suffix + ".workers.dev/";
}

/**
 * Turns a Cloudflare zone route pattern into a navigable entry point only if
 * its host is concrete. Wildcard hosts do not identify a single live URL.
 * A route still isn't an independent uptime probe.
 */
export function workerRouteEntry(pattern: string): string | null {
  if (!pattern || /[?#]/.test(pattern)) return null;
  const withoutScheme = pattern.replace(/^https?:\/\//i, "");
  const slash = withoutScheme.indexOf("/");
  const host = slash < 0 ? withoutScheme : withoutScheme.slice(0, slash);
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(host) || host.includes("*") || host.includes("..")) return null;
  const path = slash < 0 ? "/" : withoutScheme.slice(slash);
  if (path.includes("*") && !path.endsWith("*")) return null;
  const pathPrefix = path.endsWith("*") ? path.slice(0, -1) : path;
  try {
    const url = new URL("https://" + host + pathPrefix);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}
