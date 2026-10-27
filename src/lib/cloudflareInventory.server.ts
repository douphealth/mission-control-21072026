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
export interface CloudflareZone {
  id: string;
  accountId: string;
  name: string;
  status: string;
  plan: string;
  nameservers: string[];
  modifiedAt: string | null;
  dashboardUrl: string;
  dnsUrl: string;
}
export interface CloudflareAccountSummary {
  accountId: string;
  label: string;
  truthState: InfraTruth;
  configuredToken: boolean;
  pagesCount: number;
  workersCount: number;
  zonesCount: number;
  errors: string[];
}
export interface CloudflareInventory {
  zones: CloudflareZone[];
  accountDetails: CloudflareAccountSummary[];
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
  // Only explicitly enabled Worker domains may be displayed as active URLs.
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
/**
 * Account tokens may be a legacy string or an object with separate
 * `default` and `pages` credentials. Different Cloudflare tokens may have
 * different read scopes. Never fall back to another ACCOUNT's token.
 */
function accountTokenConfig(accountId: string, env: Record<string, string | undefined>): unknown {
  try {
    return asObject(JSON.parse(env["CLOUDFLARE_ACCOUNT_TOKENS_JSON"] || "{}"))[accountId];
  } catch { return undefined; }
}
export function apiTokenFor(accountId: string, env: Record<string, string | undefined> = process.env): string | null {
  const configured = accountTokenConfig(accountId, env);
  const token = asString(configured) ||
    asString(asObject(configured).default);
  return token || asString(env["CLOUDFLARE_API_TOKEN"]);
}
export function pagesTokenFor(accountId: string, env: Record<string, string | undefined> = process.env): string | null {
  const configured = accountTokenConfig(accountId, env);
  return asString(asObject(configured).pages) || apiTokenFor(accountId, env);
}
export async function cloudflareGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(API + path, {
    method: "GET",
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) {
    // Cloudflare's numeric error code is useful for distinguishing invalid
    // pagination from missing API scope, but provider messages can echo
    // request details and must never be sent to the browser.
    let cfCode = "";
    try {
      const payload: unknown = await response.json();
      if (payload && typeof payload === "object" && "errors" in payload) {
        const errors = (payload as { errors?: unknown }).errors;
        if (Array.isArray(errors)) {
          const first = errors.find(x => x && typeof x === "object" &&
            "code" in x && typeof x.code === "number");
          if (first && typeof first.code === "number") cfCode = " (CF code " + first.code + ")";
        }
      }
    } catch { /* only safe numeric codes are reported */ }
    throw new Error("Cloudflare HTTP " + response.status + cfCode);
  }
  const data = await response.json();
  if (!data || data.success !== true) throw new Error("Cloudflare API returned an error");
  return data as T;
}
type Envelope = { result: any; result_info?: { total_pages?: number; total_count?: number; per_page?: number } };
export async function allPages(path: string, token: string, perPage = 100): Promise<unknown[]> {
  const entries: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const glue = path.includes("?") ? "&" : "?";
    let envelope: Envelope;
    try {
      envelope = await cloudflareGet<Envelope>(
        path + glue + "page=" + page + "&per_page=" + perPage, token);
    } catch (error) {
      // Cloudflare's documented Pages list example uses 20 per page. Some
      // accounts reject the page query entirely (HTTP 400). Probe bare GET
      // only on the first page, and accept it ONLY if completeness is proven.
      if (page !== 1 || !path.endsWith("/pages/projects") ||
          !(error instanceof Error) || !error.message.startsWith("Cloudflare HTTP 400")) {
        throw error;
      }
      const bare = await cloudflareGet<Envelope>(path, token);
      if (!Array.isArray(bare.result)) throw new Error("Invalid Pages API payload");
      const total = bare.result_info?.total_count;
      const totalPages = bare.result_info?.total_pages;
      // A one-page bare response is sufficient only when metadata proves it.
      if (typeof total === "number" && total === bare.result.length ||
          typeof totalPages === "number" && totalPages === 1) return bare.result;
      if (typeof totalPages !== "number" || !Number.isInteger(totalPages) ||
          totalPages < 2 || totalPages > MAX_PAGES) {
        throw new Error("Cloudflare Pages pagination unavailable; inventory completeness unknown");
      }
      // Some Pages backends reject per_page even at 20. Keep the server-side
      // inventory complete by using the API's own default page size instead.
      const results: unknown[] = [...bare.result];
      for (let nextPage = 2; nextPage <= totalPages; nextPage++) {
        const next = await cloudflareGet<Envelope>(path + "?page=" + nextPage, token);
        if (!Array.isArray(next.result) ||
            next.result_info?.total_pages !== undefined &&
              next.result_info.total_pages !== totalPages) {
          throw new Error("Cloudflare Pages pagination changed during inventory");
        }
        results.push(...next.result);
      }
      if (typeof total === "number" && results.length !== total) {
        throw new Error("Cloudflare Pages pagination returned incomplete results");
      }
      return results;
    }
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
export function configuredAccountLabels(
  env: Record<string, string | undefined> = process.env,
): Record<string, string> {
  try {
    const input: unknown = JSON.parse(env["CLOUDFLARE_ACCOUNT_LABELS_JSON"] || "{}");
    const raw = asObject(input);
    const labels: Record<string, string> = {};
    for (const [id, label] of Object.entries(raw)) {
      if (ACCOUNT_ID.test(id) && typeof label === "string" && label.trim().length <= 120) {
        labels[id] = label.trim();
      }
    }
    return labels;
  } catch { return {}; }
}
function normalizeZone(accountId: string, raw: unknown): CloudflareZone | null {
  const zone = asObject(raw);
  const id = asString(zone.id);
  const name = asString(zone.name);
  if (!id || !ACCOUNT_ID.test(id) || !name || !/^[a-z0-9.-]+$/i.test(name)) return null;
  const prefix = "https://dash.cloudflare.com/" + accountId + "/" + encodeURIComponent(name);
  return {
    id, accountId, name,
    status: asString(zone.status) || "unknown",
    plan: asString(asObject(zone.plan).name) || "Unknown",
    nameservers: Array.isArray(zone.name_servers)
      ? zone.name_servers.map(asString).filter((v): v is string => Boolean(v)) : [],
    modifiedAt: asString(zone.modified_on),
    dashboardUrl: prefix,
    dnsUrl: prefix + "/dns/records",
  };
}
async function accountInventory(accountId: string, token: string, pagesToken: string) {
  const rows: CloudflareDeploymentRow[] = [];
  const zoneRows: CloudflareZone[] = [];
  const errors: string[] = [];
  const [pages, scripts, domains, zones] = await Promise.allSettled([
    allPages("/accounts/" + accountId + "/pages/projects", pagesToken, 20),
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
  } else {
    const reason = pages.reason instanceof Error ? pages.reason.message : "";
    const match = /^Cloudflare HTTP (400|401|403)(?: \(CF code \d+\))?$/.exec(reason);
    errors.push("Pages inventory unavailable for account " + accountId.slice(-6) +
      (match ? " (" + match[0] + ")" : ""));
  }
  const workerDomains = domains.status === "fulfilled" ? domains.value : [];
  if (domains.status === "rejected") errors.push("Worker domains unavailable for account " + accountId.slice(-6));

  // Worker routes are zone-scoped, not fields on a script. Discover all zones
  // of this account and map real route patterns back to Worker script names.
  const routesByScript = new Map<string, string[]>();
  if (zones.status === "rejected") {
    errors.push("Zone inventory unavailable for account " + accountId.slice(-6));
  } else {
    for (const raw of zones.value) {
      const zone = normalizeZone(accountId, raw);
      if (zone) zoneRows.push(zone);
    }
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
      // Worker deployments are loaded only when History is opened. Fetching
      // each script's deployment during the inventory listing is an N+1
      // request pattern and does not scale to large Cloudflare accounts.
      normalizedScripts.forEach((script: any) => {
        const row = normalizeWorkerScript(
          accountId,
          { ...script, routes: (routesByScript.get(String(script.id)) || [])
              .map(pattern => ({ pattern, script: script.id })) },
          workerDomains,
        );
        if (row) rows.push(row);
      });
    }
  } else errors.push("Worker scripts unavailable for account " + accountId.slice(-6));
  return { rows, zones: zoneRows, errors };
}
/** Caller must pass Cloudflare Access authorization before invoking. */
export async function collectCloudflareInventory(
  environment: Record<string, string | undefined> = process.env,
): Promise<CloudflareInventory> {
  const fetchedAt = new Date().toISOString();
  const accounts = configuredAccounts(environment);
  const labels = configuredAccountLabels(environment);
  const rows: CloudflareDeploymentRow[] = [];
  const zones: CloudflareZone[] = [];
  const errors: string[] = [];
  const accountDetails: CloudflareAccountSummary[] = [];
  // Never claim a partially configured portfolio is fully disconnected.
  if (!accounts.length) {
    return { truthState: "not_connected", source: "Cloudflare API", fetchedAt,
      rows, zones, accounts, accountDetails, errors };
  }
  // Cap simultaneous account inventories to prevent API request bursts.
  const results = await parallelMap(accounts, async id => {
    const token = apiTokenFor(id, environment);
    return token ? await accountInventory(id, token, pagesTokenFor(id, environment) || token) : null;
  }, 2);
  results.forEach((entry, index) => {
    const id = accounts[index];
    const configuredToken = Boolean(apiTokenFor(id, environment));
    const label = labels[id] || "Account …" + id.slice(-6);
    if (!configuredToken) {
      const reason = "API token is not configured for " + label;
      errors.push(reason);
      accountDetails.push({accountId:id,label,truthState:"not_connected",
        configuredToken:false,pagesCount:0,workersCount:0,zonesCount:0,
        errors:[reason]});
      return;
    }
    if (entry.status === "rejected" || !entry.value) {
      const reason = "Cloudflare account " + label + " could not be queried";
      errors.push(reason);
      accountDetails.push({accountId:id,label,truthState:"error",
        configuredToken:true,pagesCount:0,workersCount:0,zonesCount:0,
        errors:[reason]});
      return;
    }
    const result = entry.value;
    rows.push(...result.rows);
    zones.push(...result.zones);
    errors.push(...result.errors);
    accountDetails.push({
      accountId:id,label,configuredToken:true,
      pagesCount:result.rows.filter(row=>row.kind==="pages").length,
      workersCount:result.rows.filter(row=>row.kind==="worker").length,
      zonesCount:result.zones.length,
      truthState: result.errors.length
        ? result.rows.length || result.zones.length ? "partial" : "error"
        : "live",
      errors: result.errors,
    });
  });
  const unique = new Map(rows.map(row => [row.key, row]));
  const uniqueZones = new Map(zones.map(zone => [zone.accountId+":"+zone.id, zone]));
  const connected = accountDetails.some(a=>a.truthState==="live" || a.truthState==="partial");
  const truthState: InfraTruth = errors.length
    ? connected ? "partial" : accountDetails.every(a=>a.truthState==="not_connected")
      ? "not_connected" : "error"
    : "live";
  return {
    truthState, source:"Cloudflare API", fetchedAt, accounts, accountDetails, errors,
    rows:[...unique.values()].sort((a,b)=>a.name.localeCompare(b.name)),
    zones:[...uniqueZones.values()].sort((a,b)=>a.name.localeCompare(b.name)),
  };
}
export async function loadDeploymentHistory(input: {
  accountId: string;
  kind: InfraKind;
  name: string;
  page: number;
}, environment: Record<string, string | undefined> = process.env): Promise<{ rows: DeploymentHistoryItem[]; page: number }> {
  if (!configuredAccounts(environment).includes(input.accountId) ||
      !SCRIPT_NAME.test(input.name) || !Number.isInteger(input.page) ||
      input.page < 1 || input.page > MAX_PAGES) {
    throw new Error("Unknown Cloudflare deployment resource");
  }
  const token = input.kind === "pages"
    ? pagesTokenFor(input.accountId, environment)
    : apiTokenFor(input.accountId, environment);
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
