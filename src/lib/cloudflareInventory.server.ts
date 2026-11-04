/**
 * Cloudflare inventory data collector. No token, API response or private
 * resource names are included in browser bundles or public snapshots.
 * Deployments are API-observed states, NOT independent uptime checks.
 */
import { accountTruth, overallTruth } from "@/lib/cloudflareInventoryMerge";
import { workersDevEndpoint, workerRouteEntry, workerBuildSource } from "@/lib/workerProvenance";
export type InfraKind = "pages" | "worker";
export type InfraTruth = "live" | "partial" | "error" | "not_connected";
/** Where a token comes from in configuration — a label only, never the secret. */
export type TokenSource = "workers" | "pages" | "default" | "account" | "global" | "none";
/** One inventory call can collect Pages only, the rest of the platform, or both. */
export type InventorySection = "pages" | "platform";
/**
 * Normalized operational state derived only from Cloudflare deployment metadata.
 * "failing" means the newest PRODUCTION deployment failed while an older one may
 * still serve traffic. None of these values is an uptime check.
 */
export type DeployHealth = "live" | "failing" | "building" | "none" | "unknown";
export interface LatestProductionAttempt {
  id: string | null;
  status: string;
  createdAt: string | null;
  branch: string | null;
  commit: string | null;
}
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
  /** Verified git connection from Pages or Cloudflare Workers Builds; null when unknown. */
  sourceType?: "github" | "gitlab" | "direct_upload" | null;
  /** Canonical *.pages.dev hostname URL, independent of custom domains. */
  pagesDevUrl?: string | null;
  /** API-confirmed, enabled workers.dev endpoint (if present). */
  workersDevUrl?: string | null;
  /** How the repository link was established; never a name-only guess. */
  repoEvidence?: "pages-source" | "worker-build" | null;
  createdAt?: string | null;
  health?: DeployHealth;
  /** Newest production attempt when it differs from the serving deployment. */
  latestProduction?: LatestProductionAttempt | null;
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
  /** Sections this summary covers; absent on legacy full snapshots. */
  sections?: InventorySection[];
  /** Number of Pages list requests used to prove completeness. */
  pagesApiRequests?: number;
  /** Cloudflare's result_info.total_count; may be capped/under-reported. */
  pagesReportedTotal?: number | null;
  /** True only when a dedicated per-account deploy token is configured. */
  deployEnabled?: boolean;
  /** Which configuration entry supplies this account's Workers token (never the value). */
  workersTokenSource?: TokenSource;
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
const FAILED_STAGE = /^(failure|failed)$/i;
const BUILDING_STAGE = /^(active|idle|queued|running|in_progress)$/i;
function sourceTypeOf(source: Record<string, any>): CloudflareDeploymentRow["sourceType"] {
  const type = asString(source.type);
  if (type === "github" || type === "gitlab") return type;
  return Object.keys(source).length ? null : "direct_upload";
}
export function normalizePagesProject(accountId: string, raw: unknown): CloudflareDeploymentRow | null {
  const project = asObject(raw);
  const name = asString(project.name);
  if (!name || !SCRIPT_NAME.test(name)) return null;
  // The serving deployment comes from canonical/production only; latest_deployment
  // can be a preview branch and is used ONLY when explicitly marked production.
  const deployment = asObject(project.canonical_deployment || project.production_deployment);
  const latest = asObject(project.latest_deployment);
  const source = asObject(project.source);
  // Cloudflare lists the project's own *.pages.dev hostname inside `domains`;
  // only other hostnames are custom domains.
  const customDomains = Array.isArray(project.domains)
    ? project.domains.map(asString)
      .filter((x): x is string => Boolean(x) && !/(^|\.)pages\.dev$/i.test(x as string)) : [];
  const subdomain = asString(project.subdomain);
  const canonical = subdomain && /^[a-z0-9.-]+\.pages\.dev$/i.test(subdomain)
    ? validHttps(subdomain) : null;
  const hasDeployment = Object.keys(deployment).length > 0;
  const servingStatus = hasDeployment ? deploymentStatus(deployment) : "unknown";
  const latestId = asString(latest.id);
  const latestIsNewerProduction = asString(latest.environment) === "production" &&
    Boolean(latestId) && latestId !== asString(deployment.id);
  const latestMeta = asObject(asObject(latest.deployment_trigger).metadata);
  const latestProduction: LatestProductionAttempt | null = latestIsNewerProduction ? {
    id: latestId,
    status: deploymentStatus(latest),
    createdAt: asString(latest.created_on),
    branch: asString(latestMeta.branch),
    commit: asString(latestMeta.commit_hash),
  } : null;
  const health: DeployHealth = latestProduction && FAILED_STAGE.test(latestProduction.status) ? "failing"
    : latestProduction && BUILDING_STAGE.test(latestProduction.status) ? "building"
      : hasDeployment ? FAILED_STAGE.test(servingStatus) ? "failing"
        : BUILDING_STAGE.test(servingStatus) ? "building"
          : /^success$/i.test(servingStatus) ? "live" : "unknown"
        : "none";
  return {
    key: "pages:" + accountId + ":" + name,
    kind: "pages", accountId, name,
    projectUrl: "https://dash.cloudflare.com/" + accountId + "/pages/view/" + encodeURIComponent(name),
    publicUrl: customDomains.length ? validHttps(customDomains[0]) : canonical,
    domains: customDomains, routes: [],
    repoUrl: githubSource(source),
    repoEvidence: githubSource(source) ? "pages-source" : null,
    branch: asString(asObject(source.config).production_branch) ||
      asString(asObject(asObject(deployment.deployment_trigger).metadata).branch) ||
      asString(deployment.production_branch) || asString(project.production_branch),
    commit: asString(asObject(asObject(deployment.deployment_trigger).metadata).commit_hash),
    deploymentId: asString(deployment.id),
    deployedAt: asString(deployment.created_on),
    status: servingStatus,
    statusSource: hasDeployment ? "cloudflare-deployment" : "unavailable",
    sourceType: sourceTypeOf(source),
    pagesDevUrl: canonical,
    createdAt: asString(project.created_on),
    health,
    latestProduction,
  };
}
export function normalizeWorkerScript(
  accountId: string, raw: unknown, domains: unknown[], activeDeployment?: unknown,
  accountSubdomain?: string | null, buildSource?: unknown,
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
  const deployed = Object.keys(deployment).length > 0 || Boolean(asString(script.deployed_on));
  const workerDev = workersDevEndpoint(name, script.subdomain, accountSubdomain);
  const source = workerBuildSource(buildSource);
  const routeUrl = routes.map(workerRouteEntry).find(Boolean) || null;
  return {
    key: "worker:" + accountId + ":" + name,
    kind: "worker", accountId, name,
    // Cloudflare's Worker service view (production environment).
    projectUrl: "https://dash.cloudflare.com/" + accountId + "/workers/services/view/" +
      encodeURIComponent(name) + "/production",
    publicUrl: (customDomains.length ? validHttps(customDomains[0]) : null) || workerDev || routeUrl,
    domains: customDomains, routes, repoUrl: source.repoUrl, branch: null,
    repoEvidence: source.repoUrl ? "worker-build" : null,
    workersDevUrl: workerDev,
    commit: null,
    deploymentId: asString(deployment.id) || asString(version.version_id),
    deployedAt: asString(deployment.created_on) || asString(script.deployed_on) || asString(script.modified_on),
    status: Object.keys(deployment).length ? "serving (API deployment)" :
      asString(script.deployed_on) ? "deployed (API metadata)" : "unknown",
    statusSource: deployed ? "cloudflare-deployment" : "unavailable",
    sourceType: source.sourceType, pagesDevUrl: null,
    createdAt: asString(script.created_on),
    health: deployed ? "live" : "unknown",
    latestProduction: null,
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
/** Optional per-account Workers read token. Pages-only tokens may list Pages successfully
 * while Workers APIs return 403. Do not reuse tokens from another Cloudflare account. */
export function workersTokenFor(accountId: string, env: Record<string, string | undefined> = process.env): string | null {
  const configured = accountTokenConfig(accountId, env);
  return asString(asObject(configured).workers) || apiTokenFor(accountId, env);
}
/** Mirrors the token resolution order of pagesTokenFor / workersTokenFor. */
export function tokenSourceFor(
  accountId: string, kind: "workers" | "pages", env: Record<string, string | undefined> = process.env,
): TokenSource {
  const configured = accountTokenConfig(accountId, env);
  if (asString(asObject(configured)[kind])) return kind;
  if (asString(configured)) return "account";
  if (asString(asObject(configured).default)) return "default";
  return asString(env["CLOUDFLARE_API_TOKEN"]) ? "global" : "none";
}
/**
 * Write-capable Pages token (Account > Cloudflare Pages > Edit). Deliberately
 * NEVER falls back to read tokens: deploy/retry/rollback stay disabled until the
 * owner opts in with a dedicated `deploy` key for that exact account.
 */
export function deployTokenFor(accountId: string, env: Record<string, string | undefined> = process.env): string | null {
  return asString(asObject(accountTokenConfig(accountId, env)).deploy);
}
export async function cloudflareGet<T>(path: string, token: string): Promise<T> {
  return cloudflareRequest<T>("GET", path, token);
}
export async function cloudflareRequest<T>(method: "GET" | "POST", path: string, token: string): Promise<T> {
  const response = await fetch(API + path, {
    method,
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    signal: AbortSignal.timeout(method === "GET" ? 12000 : 20000),
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

/** Cloudflare's supported Pages list page size (the same value wrangler uses). */
export const PAGES_PAGE_SIZE = 10;
/** 400 list requests ⇒ up to 4,000 Pages projects per account before failing closed. */
const PAGES_MAX_API_PAGES = 400;
const PAGES_PARALLEL = 4;
const PAGES_PROBE_BATCH = 3;
export interface PagesProjectListing {
  projects: unknown[];
  /** List requests performed (diagnostic, proves exhaustive pagination). */
  requests: number;
  /** result_info.total_count from page 1 — informational only, never a stop signal. */
  reportedTotal: number | null;
  mode: "per_page" | "default";
}
const isHttp400 = (error: unknown) =>
  error instanceof Error && error.message.startsWith("Cloudflare HTTP 400");

/**
 * Lists EVERY Pages project of an account.
 *
 * Cloudflare's Pages `result_info` (total_pages / total_count) is treated as a
 * hint only; completeness is proven by reaching a short or empty page.
 * Like wrangler, this keeps requesting pages until Cloudflare returns a short
 * or empty page. Metadata is only used as a prefetch hint and as a lower-bound
 * completeness check. A page that returns only already-seen projects means the
 * API ignored `page`, which fails closed instead of reporting a partial total.
 */
export async function listAllPagesProjects(accountId: string, token: string): Promise<PagesProjectListing> {
  const base = "/accounts/" + accountId + "/pages/projects";
  let mode: PagesProjectListing["mode"] = "per_page";
  const pathFor = (page: number) => mode === "per_page"
    ? base + "?page=" + page + "&per_page=" + PAGES_PAGE_SIZE
    : page === 1 ? base : base + "?page=" + page;
  let first: Envelope;
  let requests = 1;
  try {
    first = await cloudflareGet<Envelope>(pathFor(1), token);
  } catch (error) {
    // A backend that rejects per_page still paginates with its default size.
    if (!isHttp400(error)) throw error;
    mode = "default";
    requests++;
    first = await cloudflareGet<Envelope>(pathFor(1), token);
  }
  if (!Array.isArray(first.result)) throw new Error("Invalid Pages API payload");
  const byName = new Map<string, unknown>();
  let unnamed = 0;
  const absorb = (rows: unknown[]): number => {
    let added = 0;
    for (const raw of rows) {
      const name = asString(asObject(raw).name);
      const key = name ? name.toLowerCase() : "\u0000unnamed:" + unnamed++;
      if (!byName.has(key)) { byName.set(key, raw); added++; }
    }
    return added;
  };
  absorb(first.result);
  const reportedTotal = typeof first.result_info?.total_count === "number"
    ? first.result_info.total_count : null;
  const hintedPages = typeof first.result_info?.total_pages === "number" &&
    Number.isInteger(first.result_info.total_pages)
    ? Math.min(first.result_info.total_pages, PAGES_MAX_API_PAGES) : 1;
  // In default mode the first page defines the server's page size.
  const pageSize = mode === "per_page" ? PAGES_PAGE_SIZE : Math.max(1, first.result.length);
  // Default mode always probes page 2: a capped total_count must not end listing.
  let ended = first.result.length === 0 || first.result.length < pageSize;
  let page = 2;
  while (!ended) {
    if (page > PAGES_MAX_API_PAGES) {
      throw new Error("Cloudflare Pages inventory exceeds the configured page limit");
    }
    const last = page <= hintedPages
      ? Math.min(hintedPages, page + PAGES_PARALLEL - 1)
      : Math.min(PAGES_MAX_API_PAGES, page + PAGES_PROBE_BATCH - 1);
    const batch = Array.from({ length: last - page + 1 }, (_, i) => page + i);
    requests += batch.length;
    const settled = await Promise.allSettled(batch.map(p => cloudflareGet<Envelope>(pathFor(p), token)));
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      // Results after the detected end are ignored, including errors.
      if (result.status === "rejected") throw result.reason;
      const rows = result.value.result;
      if (!Array.isArray(rows)) throw new Error("Invalid Pages API payload");
      const added = absorb(rows);
      if (rows.length === 0 || rows.length < pageSize) { ended = true; break; }
      if (added === 0) {
        // A default-size backend that ignores ?page is complete only if the
        // first page already holds the full reported total.
        if (mode === "default" && batch[i] === 2 && reportedTotal !== null &&
            byName.size >= reportedTotal) { ended = true; break; }
        throw new Error("Cloudflare Pages pagination repeated a page; inventory completeness unknown");
      }
    }
    page = last + 1;
  }
  if (reportedTotal !== null && byName.size < reportedTotal) {
    throw new Error("Cloudflare Pages pagination incomplete: fewer projects than the API-reported total");
  }
  return { projects: [...byName.values()], requests, reportedTotal, mode };
}

export async function allPages(path: string, token: string, perPage = 100): Promise<unknown[]> {
  const entries: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const glue = path.includes("?") ? "&" : "?";
    const envelope = await cloudflareGet<Envelope>(
      path + glue + "page=" + page + "&per_page=" + perPage, token);
    const rows = envelope.result;
    if (!Array.isArray(rows)) throw new Error("Invalid Cloudflare pagination payload");
    entries.push(...rows);
    if (typeof envelope.result_info?.total_count === "number" &&
        entries.length > envelope.result_info.total_count) {
      throw new Error("Cloudflare inventory exceeds API-reported total");
    }
    if (envelope.result_info?.total_pages && envelope.result_info.total_pages > MAX_PAGES) {
      throw new Error("Cloudflare inventory exceeds the configured page limit");
    }
    if (envelope.result_info?.total_pages
      ? page >= envelope.result_info.total_pages : rows.length < perPage) {
      const expected = envelope.result_info?.total_count;
      if (typeof expected === "number" && entries.length !== expected) {
        throw new Error("Cloudflare pagination incomplete: reported total differs from fetched records");
      }
      return entries;
    }
  }
  throw new Error("Cloudflare inventory page limit reached");
}
/** Cloudflare's current Workers API lists Workers by `name`; the older
 * scripts endpoint does not necessarily enumerate the complete estate.
 * A fallback is explicitly marked partial instead of silently counted as full. */
function safeApiReason(error: unknown): string {
  if (!(error instanceof Error)) return "request failed";
  const match = /^Cloudflare HTTP (\d{3})(?: \(CF code (\d+)\))?$/.exec(error.message);
  return match ? "HTTP " + match[1] + (match[2] ? " / code " + match[2] : "") :
    error.message.includes("pagination") || error.message.includes("incomplete")
      ? "incomplete pagination" : "request failed";
}
async function listAccountWorkers(accountId: string, token: string): Promise<{
  scripts: unknown[]; usedLegacy: boolean; modernError: string | null;
}> {
  try {
    const modern = await allPages("/accounts/" + accountId + "/workers/workers", token, 50);
    return { scripts: modern.map(raw => {
      const worker = asObject(raw);
      return { ...worker, id: asString(worker.name) || asString(worker.id) };
    }), usedLegacy: false, modernError: null };
  } catch (error) {
    const reason = safeApiReason(error);
    try {
      const legacy = await cloudflareGet<Envelope>("/accounts/" + accountId + "/workers/scripts", token);
      if (!Array.isArray(legacy.result)) throw new Error("Invalid legacy Workers API payload");
      return { scripts: legacy.result, usedLegacy: true, modernError: reason };
    } catch (legacyError) {
      throw new Error("Modern Workers " + reason + "; legacy Scripts " + safeApiReason(legacyError));
    }
  }
}
/** Worker Domains listing does not support the Pages-style page/per_page query.
 * Reject an incomplete first page rather than silently undercount resources. */
async function listWorkerDomains(accountId: string, token: string): Promise<unknown[]> {
  const response = await cloudflareGet<Envelope>("/accounts/" + accountId + "/workers/domains", token);
  if (!Array.isArray(response.result)) throw new Error("Invalid Worker Domains API payload");
  if (typeof response.result_info?.total_count === "number" &&
      response.result_info.total_count > response.result.length) {
    throw new Error("Worker Domains API returned an incomplete inventory");
  }
  return response.result;
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
interface AccountInventoryResult {
  rows: CloudflareDeploymentRow[];
  zones: CloudflareZone[];
  errors: string[];
  pagesApiRequests?: number;
  pagesReportedTotal?: number | null;
}
async function accountInventory(
  accountId: string, token: string, pagesToken: string, workersToken: string,
  sections: ReadonlySet<InventorySection> = new Set(["pages", "platform"]),
): Promise<AccountInventoryResult> {
  const rows: CloudflareDeploymentRow[] = [];
  const zoneRows: CloudflareZone[] = [];
  const errors: string[] = [];
  const result: AccountInventoryResult = { rows, zones: zoneRows, errors };
  const wantPages = sections.has("pages");
  const wantPlatform = sections.has("platform");
  const [pages, scripts, domains, zones, subdomain] = await Promise.allSettled([
    wantPages ? listAllPagesProjects(accountId, pagesToken) : Promise.resolve(null),
    wantPlatform ? listAccountWorkers(accountId, workersToken) : Promise.resolve(null),
    wantPlatform ? listWorkerDomains(accountId, workersToken) : Promise.resolve(null),
    // Cloudflare Zone list caps per_page at 50 (unlike Pages).
    wantPlatform ? allPages("/zones?account.id=" + encodeURIComponent(accountId), token, 50)
      : Promise.resolve(null),
    wantPlatform ? cloudflareGet<Envelope>("/accounts/" + accountId + "/workers/subdomain", workersToken)
      : Promise.resolve(null),
  ]);
  if (wantPages) {
    if (pages.status === "fulfilled" && pages.value) {
      for (const raw of pages.value.projects) {
        const row = normalizePagesProject(accountId, raw);
        if (row) rows.push(row);
      }
      result.pagesApiRequests = pages.value.requests;
      result.pagesReportedTotal = pages.value.reportedTotal;
    } else {
      const reason = pages.status === "rejected" && pages.reason instanceof Error ? pages.reason.message : "";
      const match = /^Cloudflare HTTP (400|401|403|429)(?: \(CF code \d+\))?$/.exec(reason);
      errors.push("Pages inventory unavailable for account " + accountId.slice(-6) +
        (match ? " (" + match[0] + ")" : /pagination|limit/i.test(reason) ? " (" + reason + ")" : ""));
    }
  }
  if (!wantPlatform) return result;
  const workerDomains = domains.status === "fulfilled" && domains.value ? domains.value : [];
  const accountSubdomain = subdomain.status === "fulfilled" && subdomain.value
    ? asString(asObject(subdomain.value.result).subdomain) : null;
  if (subdomain.status === "rejected") errors.push("Worker account subdomain unavailable for account " +
    accountId.slice(-6) + " (" + safeApiReason(subdomain.reason) + "); workers.dev URLs may be missing");
  if (domains.status === "rejected") errors.push("Worker domains unavailable for account " + accountId.slice(-6) +
    " (" + safeApiReason(domains.reason) + "); verify Workers read permission for this account");

  // Worker routes are zone-scoped, not fields on a script. Discover all zones
  // of this account and map real route patterns back to Worker script names.
  const routesByScript = new Map<string, string[]>();
  if (zones.status === "rejected" || !zones.value) {
    errors.push("Zone inventory unavailable for account " + accountId.slice(-6));
  } else {
    for (const raw of zones.value) {
      const zone = normalizeZone(accountId, raw);
      if (zone) zoneRows.push(zone);
    }
    // Route association is only useful for Workers actually listed by the API.
    // Avoid making many unnecessary zone-scoped calls for accounts with no Workers.
    const ids = scripts.status === "fulfilled" && scripts.value && scripts.value.scripts.length > 0
      ? zones.value.map(asObject).map(z => asString(z.id))
        .filter((id): id is string => typeof id === "string" && ACCOUNT_ID.test(id)) : [];
    const routeResults = await parallelMap(ids, id =>
      cloudflareGet<Envelope>("/zones/" + id + "/workers/routes", workersToken));
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
      " zone(s) for account " + accountId.slice(-6) +
      "; verify Zone > Workers Routes > Read permissions for these zones");
  }
  if (scripts.status === "fulfilled" && scripts.value) {
    if (scripts.value.usedLegacy) {
      errors.push("New Workers API unavailable for account " + accountId.slice(-6) +
        " (" + scripts.value.modernError + "); legacy Scripts fallback used — Worker count is unverified. " +
        "Create an account-scoped Workers Read token or configure the per-account workers token.");
    }
    const normalizedScripts = scripts.value.scripts.filter((s: any) =>
      SCRIPT_NAME.test(asString(s?.id) || ""));
      // Worker deployments are loaded only when History is opened. Fetching
      // each script's deployment during the inventory listing is an N+1
      // request pattern and does not scale to large Cloudflare accounts.
    normalizedScripts.forEach((script: any) => {
      const row = normalizeWorkerScript(
        accountId,
        { ...script, routes: (routesByScript.get(String(script.id)) || [])
            .map(pattern => ({ pattern, script: script.id })) },
        workerDomains, undefined, accountSubdomain,
      );
      if (row) rows.push(row);
    });
  } else errors.push("Worker inventory unavailable for account " + accountId.slice(-6) +
    " (" + (scripts.status === "rejected" && scripts.reason instanceof Error ? scripts.reason.message : "request failed") +
    "); verify account-scoped Workers Read permissions");
  return result;
}
export interface InventoryScope {
  /** Restrict collection to one configured account. */
  accountId?: string;
  /** Restrict collection to Pages or to Workers/DNS ("platform"). */
  section?: InventorySection;
}
/** Caller must pass Cloudflare Access authorization before invoking. */
export async function collectCloudflareInventory(
  environment: Record<string, string | undefined> = process.env,
  scope: InventoryScope = {},
): Promise<CloudflareInventory> {
  const fetchedAt = new Date().toISOString();
  const configured = configuredAccounts(environment);
  if (scope.accountId && !configured.includes(scope.accountId)) {
    throw new Error("Unknown Cloudflare account");
  }
  const accounts = scope.accountId ? [scope.accountId] : configured;
  const sections: ReadonlySet<InventorySection> = new Set(
    scope.section ? [scope.section] : ["pages", "platform"]);
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
    return token ? await accountInventory(id, token, pagesTokenFor(id, environment) || token,
      workersTokenFor(id, environment) || token, sections) : null;
  }, 2);
  results.forEach((entry, index) => {
    const id = accounts[index];
    const configuredToken = Boolean(apiTokenFor(id, environment));
    const label = labels[id] || "Account …" + id.slice(-6);
    const base = { accountId: id, label, sections: [...sections],
      deployEnabled: Boolean(deployTokenFor(id, environment)),
      workersTokenSource: tokenSourceFor(id, "workers", environment) };
    if (!configuredToken) {
      const reason = "API token is not configured for " + label;
      errors.push(reason);
      accountDetails.push({ ...base, truthState: "not_connected",
        configuredToken: false, pagesCount: 0, workersCount: 0, zonesCount: 0,
        errors: [reason] });
      return;
    }
    if (entry.status === "rejected" || !entry.value) {
      const reason = "Cloudflare account " + label + " could not be queried";
      errors.push(reason);
      accountDetails.push({ ...base, truthState: "error",
        configuredToken: true, pagesCount: 0, workersCount: 0, zonesCount: 0,
        errors: [reason] });
      return;
    }
    const result = entry.value;
    rows.push(...result.rows);
    zones.push(...result.zones);
    errors.push(...result.errors);
    const summary: CloudflareAccountSummary = {
      ...base, configuredToken: true,
      pagesCount: result.rows.filter(row => row.kind === "pages").length,
      workersCount: result.rows.filter(row => row.kind === "worker").length,
      zonesCount: result.zones.length,
      truthState: "live",
      errors: result.errors,
    };
    if (sections.has("pages")) {
      summary.pagesApiRequests = result.pagesApiRequests;
      summary.pagesReportedTotal = result.pagesReportedTotal ?? null;
    }
    summary.truthState = accountTruth(summary);
    accountDetails.push(summary);
  });
  const unique = new Map(rows.map(row => [row.key, row]));
  const uniqueZones = new Map(zones.map(zone => [zone.accountId + ":" + zone.id, zone]));
  return {
    truthState: overallTruth(accountDetails, errors), source: "Cloudflare API",
    fetchedAt, accounts, accountDetails, errors,
    rows: [...unique.values()].sort((a, b) => a.name.localeCompare(b.name)),
    zones: [...uniqueZones.values()].sort((a, b) => a.name.localeCompare(b.name)),
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
