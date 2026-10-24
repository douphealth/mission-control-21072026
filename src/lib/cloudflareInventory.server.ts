/**
 * Cloudflare inventory data collector. No token, API response or private
 * resource names are included in browser bundles or public snapshots.
 * Deployments are API-observed states, NOT independent uptime checks.
 */
export type InfraKind = "pages" | "worker";
export type InfraTruth = "live" | "partial" | "error" | "not_connected";
export interface CloudflareDeploymentRow {
  key: string;
  kind: InfraKind;
  accountId: string;
  name: string;
  projectUrl: string;
  publicUrl: string | null;
  domains: string[];
  routes: string[];
  repoUrl: string | null;
  branch: string | null;
  commit: string | null;
  deploymentId: string | null;
  deployedAt: string | null;
  status: string;
  statusSource: "cloudflare-deployment" | "unavailable";
}
export interface DeploymentHistoryItem {
  id: string;
  createdAt: string | null;
  status: string;
  branch: string | null;
  commit: string | null;
  url: string | null;
}
export interface CloudflareInventory {
  truthState: InfraTruth;
  source: "Cloudflare API";
  fetchedAt: string;
  rows: CloudflareDeploymentRow[];
  accounts: string[];
  errors: string[];
}
const API = "https://api.cloudflare.com/client/v4";
const MAX_PAGES = 100;
const ACCOUNT_ID = /^[a-f0-9]{32}$/i;
const SCRIPT_NAME = /^[a-zA-Z0-9_.-]{1,160}$/;

function asString(x: unknown): string | null {
  return typeof x === "string" && x.trim() ? x.trim() : null;
}
function validHttps(value: unknown): string | null {
  const str = asString(value);
  if (!str) return null;
  try {
    const u = new URL(str.startsWith("https://") ? str : "https://" + str);
    return u.protocol === "https:" && u.hostname && !u.username && !u.password
      ? u.toString() : null;
  } catch { return null; }
}
function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any> : {};
}
function githubSource(source: Record<string, any>): string | null {
  if (source.type !== "github") return null;
  const config = asObject(source.config);
  const owner = asString(config.owner);
  const name = asString(config.repo_name);
  if (!owner || !name || !/^[A-Za-z0-9_.-]+$/.test(owner) ||
      !/^[A-Za-z0-9_.-]+$/.test(name)) return null;
  return "https://github.com/" + owner + "/" + name;
}
function deploymentStatus(deployment: Record<string, any>): string {
  const stage = asObject(deployment.latest_stage);
  return asString(stage.status) || asString(deployment.status) || "unknown";
}
export function normalizePagesProject(accountId: string, raw: unknown): CloudflareDeploymentRow | null {
  const project = asObject(raw);
  const name = asString(project.name);
  if (!name || !SCRIPT_NAME.test(name)) return null;
  // Never select latest_deployment: that can refer to a preview branch.
  const deployment = asObject(project.canonical_deployment || project.production_deployment);
  const source = asObject(project.source);
  const customDomains = Array.isArray(project.domains)
    ? project.domains.map(asString).filter((x): x is string => Boolean(x)) : [];
  const subdomain = asString(project.subdomain);
  const canonical = subdomain && /^[a-z0-9.-]+\.pages\.dev$/i.test(subdomain)
    ? validHttps(subdomain) : null;
  return {
    key: "pages:" + accountId + ":" + name,
    kind: "pages", accountId, name,
    projectUrl: "https://dash.cloudflare.com/" + accountId + "/pages/view/" + encodeURIComponent(name),
    publicUrl: customDomains.length ? validHttps(customDomains[0]) : canonical,
    domains: customDomains, routes: [],
    repoUrl: githubSource(source),
    branch: asString(asObject(source.config).production_branch) ||
      asString(asObject(asObject(deployment.deployment_trigger).metadata).branch) || asString(deployment.production_branch),
    commit: asString(asObject(asObject(deployment.deployment_trigger).metadata).commit_hash),
    deploymentId: asString(deployment.id),
    deployedAt: asString(deployment.created_on),
    status: Object.keys(deployment).length ? deploymentStatus(deployment) : "unknown",
    statusSource: Object.keys(deployment).length ? "cloudflare-deployment" : "unavailable",
  };
}
export function normalizeWorkerScript(
  accountId: string, raw: unknown, domains: unknown[], activeDeployment?: unknown,
): CloudflareDeploymentRow | null {
  const script = asObject(raw);
  const name = asString(script.id);
  if (!name || !SCRIPT_NAME.test(name)) return null;
  const customDomains = domains.map(asObject).filter(d => d.service === name && d.enabled === true)
    .map(d => asString(d.hostname)).filter((x): x is string => Boolean(x));
  const routes = Array.isArray(script.routes)
    ? script.routes.map(asObject).filter(r => r.script === name || !r.script)
      .map(r => asString(r.pattern)).filter((x): x is string => Boolean(x)) : [];
  const deployment = asObject(activeDeployment);
  const version = Array.isArray(deployment.versions) && deployment.versions.length
    ? asObject(deployment.versions[0]) : {};
  return {
    key: "worker:" + accountId + ":" + name,
    kind: "worker", accountId, name,
    // The account overview is a supported Cloudflare URL; unknown script deep
    // links should not be invented.
    projectUrl: "https://dash.cloudflare.com/" + accountId + "/workers-and-pages",
    publicUrl: customDomains.length ? validHttps(customDomains[0]) : null,
    domains: customDomains, routes, repoUrl: null, branch: null,
    commit: null,
    deploymentId: asString(deployment.id) || asString(version.version_id),
    deployedAt: asString(deployment.created_on) || asString(script.modified_on),
    status: Object.keys(deployment).length ? "serving (API deployment)" : "unknown",
    statusSource: Object.keys(deployment).length ? "cloudflare-deployment" : "unavailable",
  };
}
export function configuredAccounts(env: Record<string, string | undefined> = process.env): string[] {
  return [...new Set((env["CLOUDFLARE_ACCOUNT_IDS"] || "").split(",").map(s => s.trim()).filter(Boolean))]
    .filter(id => ACCOUNT_ID.test(id));
}
function apiTokenFor(accountId: string, env: Record<string, string | undefined> = process.env): string | null {
  // Optional per-account tokens are server-side secrets only; never echo them.
  try {
    const map: unknown = JSON.parse(env["CLOUDFLARE_ACCOUNT_TOKENS_JSON"] || "{}");
    const perAccount = asString(asObject(map)[accountId]);
    if (perAccount) return perAccount;
  } catch { /* invalid configuration falls back to a shared token */ }
  return asString(env["CLOUDFLARE_API_TOKEN"]);
}
async function cloudflareGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(API + path, {
    method: "GET",
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Cloudflare HTTP " + response.status);
  const data = await response.json();
  if (!data || data.success !== true) throw new Error("Cloudflare API returned an error");
  return data as T;
}
type Envelope = { result: any; result_info?: { total_pages?: number } };
async function allPages(path: string, token: string, perPage = 100): Promise<unknown[]> {
  const entries: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const glue = path.includes("?") ? "&" : "?";
    const envelope = await cloudflareGet<Envelope>(
      path + glue + "page=" + page + "&per_page=" + perPage, token);
    const rows = envelope.result;
    if (!Array.isArray(rows)) throw new Error("Invalid Cloudflare pagination payload");
    entries.push(...rows);
    if (envelope.result_info?.total_pages && envelope.result_info.total_pages > MAX_PAGES) {
      throw new Error("Cloudflare inventory exceeds the configured page limit");
    }
    if (envelope.result_info?.total_pages
      ? page >= envelope.result_info.total_pages : rows.length < perPage) return entries;
  }
  throw new Error("Cloudflare inventory page limit reached");
}
async function parallelMap<T, U>(
  data: T[], task: (item: T) => Promise<U>, concurrency = 6,
): Promise<PromiseSettledResult<U>[]> {
  const result: PromiseSettledResult<U>[] = Array(data.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, data.length) }, async () => {
    while (next < data.length) {
      const i = next++;
      try { result[i] = { status: "fulfilled", value: await task(data[i]) }; }
      catch (reason) { result[i] = { status: "rejected", reason }; }
    }
  }));
  return result;
}
async function accountInventory(accountId: string, token: string) {
  const rows: CloudflareDeploymentRow[] = [];
  const errors: string[] = [];
  const [pages, scripts, domains, zones] = await Promise.allSettled([
    allPages("/accounts/" + accountId + "/pages/projects", token),
    cloudflareGet<Envelope>("/accounts/" + accountId + "/workers/scripts", token),
    allPages("/accounts/" + accountId + "/workers/domains", token),
    // Cloudflare Zone list caps per_page at 50 (unlike Pages).
    allPages("/zones?account.id=" + encodeURIComponent(accountId), token, 50),
  ]);
  if (pages.status === "fulfilled") {
    for (const raw of pages.value) {
      const row = normalizePagesProject(accountId, raw);
      if (row) rows.push(row);
    }
  } else errors.push("Pages inventory unavailable for account " + accountId.slice(-6));
  const workerDomains = domains.status === "fulfilled" ? domains.value : [];
  if (domains.status === "rejected") errors.push("Worker domains unavailable for account " + accountId.slice(-6));

  // Worker routes are zone-scoped, not fields on a script. Discover all zones
  // of this account and map real route patterns back to Worker script names.
  const routesByScript = new Map<string, string[]>();
  if (zones.status === "rejected") {
    errors.push("Zone inventory unavailable for account " + accountId.slice(-6));
  } else {
    const ids = zones.value.map(asObject).map(z => asString(z.id))
      .filter((id): id is string => typeof id === "string" && ACCOUNT_ID.test(id));
    const routeResults = await parallelMap(ids, id =>
      cloudflareGet<Envelope>("/zones/" + id + "/workers/routes", token));
    routeResults.forEach(result => {
      if (result.status !== "fulfilled" || !Array.isArray(result.value.result)) return;
      for (const raw of result.value.result) {
        const route = asObject(raw);
        const name = asString(route.script);
        const pattern = asString(route.pattern);
        if (name && pattern) {
          routesByScript.set(name, [...(routesByScript.get(name) || []), pattern]);
        }
      }
    });
    const failures = routeResults.filter(r => r.status === "rejected" ||
      r.status === "fulfilled" && !Array.isArray(r.value.result)).length;
    if (failures) errors.push("Worker route inventory unavailable in " + failures +
      " zone(s) for account " + accountId.slice(-6));
  }
  if (scripts.status === "fulfilled") {
    if (!Array.isArray(scripts.value.result)) {
      errors.push("Unexpected Workers API response for account " + accountId.slice(-6));
    } else {
      const normalizedScripts = scripts.value.result.filter((s: any) =>
        SCRIPT_NAME.test(asString(s?.id) || ""));
      const active = await parallelMap(normalizedScripts, async (raw: any) => {
        const name = String(raw.id);
        const data = await cloudflareGet<Envelope>(
          "/accounts/" + accountId + "/workers/scripts/" + encodeURIComponent(name) +
          "/deployments?page=1&per_page=1", token);
        return Array.isArray(data.result?.deployments)
          ? data.result.deployments[0] : null;
      });
      active.forEach((state, i) => {
        const row = normalizeWorkerScript(
          accountId,
          { ...normalizedScripts[i], routes: (routesByScript.get(String(normalizedScripts[i].id)) || [])
              .map(pattern => ({ pattern, script: normalizedScripts[i].id })) },
          workerDomains,
          state.status === "fulfilled" ? state.value : undefined);
        if (row) rows.push(row);
      });
      const failures = active.filter(r => r.status === "rejected").length;
      if (failures) errors.push("Worker deployment details unavailable for " + failures +
        " script(s) in account " + accountId.slice(-6));
    }
  } else errors.push("Worker scripts unavailable for account " + accountId.slice(-6));
  return { rows, errors };
}
/** Caller must pass Cloudflare Access authorization before invoking. */
export async function collectCloudflareInventory(): Promise<CloudflareInventory> {
  const fetchedAt = new Date().toISOString();
  const accounts = configuredAccounts();
  if (!accounts.length || !accounts.every(id => Boolean(apiTokenFor(id)))) {
    return { truthState: "not_connected", source: "Cloudflare API", fetchedAt,
      rows: [], accounts, errors: [] };
  }
  const results = await Promise.allSettled(accounts.map(id => accountInventory(id, apiTokenFor(id)!)));
  const rows: CloudflareDeploymentRow[] = [];
  const errors: string[] = [];
  results.forEach((entry, i) => {
    if (entry.status === "fulfilled") {
      rows.push(...entry.value.rows); errors.push(...entry.value.errors);
    } else errors.push("Cloudflare account " + accounts[i].slice(-6) + " unavailable");
  });
  const unique = new Map(rows.map(row => [row.key, row]));
  const truthState = errors.length
    ? unique.size ? "partial" : "error" : "live";
  return { truthState, source: "Cloudflare API", fetchedAt,
    rows: [...unique.values()].sort((a, b) => a.name.localeCompare(b.name)), accounts, errors };
}
export async function loadDeploymentHistory(input: {
  accountId: string;
  kind: InfraKind;
  name: string;
  page: number;
}): Promise<{ rows: DeploymentHistoryItem[]; page: number }> {
  if (!configuredAccounts().includes(input.accountId) ||
      !SCRIPT_NAME.test(input.name) || !Number.isInteger(input.page) ||
      input.page < 1 || input.page > MAX_PAGES) {
    throw new Error("Unknown Cloudflare deployment resource");
  }
  const token = apiTokenFor(input.accountId);
  if (!token) throw new Error("Cloudflare API token is not configured");
  const url = input.kind === "pages"
    ? "/accounts/" + input.accountId + "/pages/projects/" + encodeURIComponent(input.name) +
      "/deployments?env=production&page=" + input.page + "&per_page=25"
    : "/accounts/" + input.accountId + "/workers/scripts/" + encodeURIComponent(input.name) +
      "/deployments?page=" + input.page + "&per_page=25";
  const res = await cloudflareGet<Envelope>(url, token);
  const entries = input.kind === "pages" ? res.result : res.result?.deployments;
  if (!Array.isArray(entries)) throw new Error("Cloudflare returned invalid deployment history");
  return {
    rows: entries.map(d => {
      const deployment = asObject(d);
      const metadata = asObject(asObject(deployment.deployment_trigger).metadata);
      return {
        id: asString(deployment.id) || "unknown",
        createdAt: asString(deployment.created_on),
        status: input.kind === "worker" ? "served/deployed" : deploymentStatus(deployment),
        branch: input.kind === "pages" ? asString(metadata.branch) : null,
        commit: input.kind === "pages" ? asString(metadata.commit_hash) : null,
        url: input.kind === "pages" ? validHttps(deployment.url) : null,
      };
    }),
    page: input.page,
  };
}
