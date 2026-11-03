/**
 * Request-time Cloudflare collector for the estate view: Pages (with latest
 * and production deployments), Workers (with routes and custom domains) and
 * zones, for every account in CLOUDFLARE_ACCOUNT_IDS. Reuses the inventory
 * module's token resolution and pagination guards. Server-only.
 */
import {
  allPages,
  apiTokenFor,
  cloudflareGet,
  configuredAccountLabels,
  configuredAccounts,
  pagesTokenFor,
} from "@/lib/cloudflareInventory.server";
import type {
  CfAccountStatus,
  CfDeployment,
  CfPagesProject,
  CfWorker,
  CfZone,
  DeploymentLogLine,
  DnsRecord,
  EstateTruth,
  PagesHealth,
} from "@/lib/estate/types";

type Env = Record<string, string | undefined>;
type Obj = Record<string, unknown>;
const API = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = /^[a-f0-9]{32}$/i;
const RESOURCE = /^[a-zA-Z0-9_.-]{1,160}$/;
const DEPLOYMENT_ID = /^[a-zA-Z0-9-]{6,64}$/;

const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] =>
  arr(v)
    .map(str)
    .filter((x): x is string => Boolean(x));

export class CloudflareActionError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CloudflareActionError";
  }
}

/* ---------------- Mapping ---------------- */

export function mapDeployment(raw: unknown, productionId: string | null): CfDeployment | null {
  const d = obj(raw);
  const id = str(d.id);
  if (!id) return null;
  const meta = obj(obj(d.deployment_trigger).metadata);
  const stage = obj(d.latest_stage);
  const message = str(meta.commit_message);
  return {
    id,
    shortId: str(d.short_id) ?? id.slice(0, 8),
    url: str(d.url),
    environment: str(d.environment) ?? "unknown",
    branch: str(meta.branch),
    commitHash: str(meta.commit_hash),
    commitMessage: message ? message.split("\n")[0]!.slice(0, 200) : null,
    status: str(stage.status) ?? "unknown",
    stage: str(stage.name) ?? "unknown",
    createdOn: str(d.created_on) ?? new Date(0).toISOString(),
    aliases: strs(d.aliases),
    isCurrentProduction: productionId !== null && id === productionId,
  };
}

/** A failed preview build does not make the site unhealthy; a failed production build does. */
export function pagesHealth(
  latest: CfDeployment | null,
  production: CfDeployment | null,
): PagesHealth {
  if (!latest) return production ? "healthy" : "unknown";
  if (latest.status === "failure")
    return latest.environment === "production" ? "failing" : production ? "healthy" : "unknown";
  if (
    latest.status === "active" ||
    latest.status === "idle" ||
    (latest.stage !== "deploy" && !["success", "canceled", "skipped"].includes(latest.status))
  ) {
    return "building";
  }
  return "healthy";
}

export function mapPagesProject(
  accountId: string,
  accountLabel: string,
  raw: unknown,
): CfPagesProject | null {
  const p = obj(raw);
  const name = str(p.name);
  if (!name || !RESOURCE.test(name)) return null;
  const canonical = obj(p.canonical_deployment);
  const productionId = str(canonical.id);
  const latest = mapDeployment(p.latest_deployment, productionId);
  const production = mapDeployment(p.canonical_deployment, productionId);
  const domains = strs(p.domains);
  const subdomain = str(p.subdomain);
  const custom = domains.find((d) => !d.endsWith(".pages.dev"));
  const host = custom ?? subdomain;
  const source = obj(p.source);
  const cfg = obj(source.config);
  const build = obj(p.build_config);
  const sourceType = str(source.type);
  return {
    key: accountId + "/" + name,
    accountId,
    accountLabel,
    name,
    subdomain,
    url: host && /^[a-z0-9.-]+$/i.test(host) ? "https://" + host : null,
    domains,
    productionBranch: str(p.production_branch) ?? str(cfg.production_branch),
    createdOn: str(p.created_on),
    source: sourceType
      ? {
          type: sourceType,
          owner: str(cfg.owner),
          repo: str(cfg.repo_name),
          productionDeploymentsEnabled: cfg.production_deployments_enabled !== false,
          previewDeploymentsEnabled: (str(cfg.preview_deployment_setting) ?? "all") !== "none",
        }
      : {
          type: "direct_upload",
          owner: null,
          repo: null,
          productionDeploymentsEnabled: true,
          previewDeploymentsEnabled: false,
        },
    buildCommand: str(build.build_command),
    outputDir: str(build.destination_dir),
    latestDeployment: latest,
    productionDeployment: production,
    health: pagesHealth(latest, production),
    dashboardUrl:
      "https://dash.cloudflare.com/" + accountId + "/pages/view/" + encodeURIComponent(name),
  };
}

export function mapWorker(
  accountId: string,
  accountLabel: string,
  raw: unknown,
  routes: string[],
  customDomains: string[],
): CfWorker | null {
  const w = obj(raw);
  const name = str(w.id);
  if (!name || !RESOURCE.test(name)) return null;
  return {
    key: accountId + "/" + name,
    accountId,
    accountLabel,
    name,
    handlers: strs(w.handlers),
    routes,
    customDomains,
    compatibilityDate: str(w.compatibility_date),
    usageModel: str(w.usage_model),
    createdOn: str(w.created_on),
    modifiedOn: str(w.modified_on),
    dashboardUrl:
      "https://dash.cloudflare.com/" +
      accountId +
      "/workers/services/view/" +
      encodeURIComponent(name) +
      "/production",
  };
}

export function mapZone(accountId: string, accountLabel: string, raw: unknown): CfZone | null {
  const z = obj(raw);
  const id = str(z.id);
  const name = str(z.name);
  if (!id || !ACCOUNT_ID.test(id) || !name || !/^[a-z0-9.-]+$/i.test(name)) return null;
  return {
    id,
    accountId,
    accountLabel,
    name,
    status: str(z.status) ?? "unknown",
    paused: z.paused === true,
    plan: str(obj(z.plan).name) ?? "Unknown",
    nameServers: strs(z.name_servers),
    modifiedOn: str(z.modified_on),
    dashboardUrl: "https://dash.cloudflare.com/" + accountId + "/" + encodeURIComponent(name),
  };
}

/* ---------------- Collection ---------------- */

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          out[i] = { status: "fulfilled", value: await fn(items[i]!) };
        } catch (reason) {
          out[i] = { status: "rejected", reason };
        }
      }
    }),
  );
  return out;
}

const safeReason = (err: unknown) => {
  const m = err instanceof Error ? err.message : "";
  return /^Cloudflare HTTP \d{3}( \(CF code \d+\))?$/.test(m) ? m : "request failed";
};

async function collectAccount(accountId: string, label: string, token: string, pagesToken: string) {
  const errors: string[] = [];
  const [pagesRes, scriptsRes, domainsRes, zonesRes] = await Promise.allSettled([
    allPages("/accounts/" + accountId + "/pages/projects", pagesToken, 20),
    cloudflareGet<{ result: unknown }>("/accounts/" + accountId + "/workers/scripts", token),
    allPages("/accounts/" + accountId + "/workers/domains", token),
    allPages("/zones?account.id=" + encodeURIComponent(accountId), token, 50),
  ]);

  const pages: CfPagesProject[] = [];
  if (pagesRes.status === "fulfilled") {
    for (const raw of pagesRes.value) {
      const p = mapPagesProject(accountId, label, raw);
      if (p) pages.push(p);
    }
  } else errors.push("Pages: " + safeReason(pagesRes.reason));

  const zones: CfZone[] = [];
  const routesByScript = new Map<string, string[]>();
  if (zonesRes.status === "fulfilled") {
    for (const raw of zonesRes.value) {
      const z = mapZone(accountId, label, raw);
      if (z) zones.push(z);
    }
    // Worker routes are zone-scoped; bounded concurrency keeps request bursts small.
    const routeResults = await mapLimit(zones, 6, (z) =>
      cloudflareGet<{ result: unknown }>("/zones/" + z.id + "/workers/routes", token),
    );
    let failed = 0;
    routeResults.forEach((r) => {
      if (r.status !== "fulfilled") {
        failed++;
        return;
      }
      for (const raw of arr(r.value.result)) {
        const route = obj(raw);
        const script = str(route.script);
        const pattern = str(route.pattern);
        if (script && pattern)
          routesByScript.set(script, [...(routesByScript.get(script) ?? []), pattern]);
      }
    });
    if (failed) errors.push("Worker routes unavailable in " + failed + " zone(s)");
  } else errors.push("Zones: " + safeReason(zonesRes.reason));

  const domainsByScript = new Map<string, string[]>();
  if (domainsRes.status === "fulfilled") {
    for (const raw of domainsRes.value) {
      const d = obj(raw);
      const service = str(d.service);
      const host = str(d.hostname);
      if (service && host && d.enabled !== false)
        domainsByScript.set(service, [...(domainsByScript.get(service) ?? []), host]);
    }
  } else errors.push("Worker domains: " + safeReason(domainsRes.reason));

  const workers: CfWorker[] = [];
  if (scriptsRes.status === "fulfilled") {
    for (const raw of arr(scriptsRes.value.result)) {
      const name = str(obj(raw).id) ?? "";
      const w = mapWorker(
        accountId,
        label,
        raw,
        routesByScript.get(name) ?? [],
        domainsByScript.get(name) ?? [],
      );
      if (w) workers.push(w);
    }
  } else errors.push("Workers: " + safeReason(scriptsRes.reason));

  return { pages, workers, zones, errors };
}

export async function collectCloudflareEstate(env: Env): Promise<{
  truthState: EstateTruth;
  accounts: CfAccountStatus[];
  pages: CfPagesProject[];
  workers: CfWorker[];
  zones: CfZone[];
}> {
  const ids = configuredAccounts(env);
  const labels = configuredAccountLabels(env);
  if (!ids.length)
    return { truthState: "not_connected", accounts: [], pages: [], workers: [], zones: [] };
  const results = await mapLimit(ids, 2, async (id) => {
    const token = apiTokenFor(id, env);
    if (!token) return null;
    return collectAccount(
      id,
      labels[id] || "Account …" + id.slice(-6),
      token,
      pagesTokenFor(id, env) || token,
    );
  });
  const accounts: CfAccountStatus[] = [];
  const pages: CfPagesProject[] = [];
  const workers: CfWorker[] = [];
  const zones: CfZone[] = [];
  results.forEach((r, i) => {
    const accountId = ids[i]!;
    const label = labels[accountId] || "Account …" + accountId.slice(-6);
    const base = { accountId, label, dashboardUrl: "https://dash.cloudflare.com/" + accountId };
    if (r.status === "fulfilled" && r.value === null) {
      accounts.push({
        ...base,
        state: "not_connected",
        pagesCount: 0,
        workersCount: 0,
        zonesCount: 0,
        errors: ["No API token configured"],
      });
      return;
    }
    if (r.status === "rejected" || !r.value) {
      accounts.push({
        ...base,
        state: "error",
        pagesCount: 0,
        workersCount: 0,
        zonesCount: 0,
        errors: ["Account could not be queried"],
      });
      return;
    }
    const v = r.value;
    pages.push(...v.pages);
    workers.push(...v.workers);
    zones.push(...v.zones);
    const any = v.pages.length + v.workers.length + v.zones.length > 0;
    accounts.push({
      ...base,
      state: v.errors.length ? (any ? "partial" : "error") : "live",
      pagesCount: v.pages.length,
      workersCount: v.workers.length,
      zonesCount: v.zones.length,
      errors: v.errors,
    });
  });
  const live = accounts.filter((a) => a.state === "live").length;
  const usable = accounts.filter((a) => a.state === "live" || a.state === "partial").length;
  const truthState: EstateTruth =
    live === accounts.length
      ? "live"
      : usable
        ? "partial"
        : accounts.every((a) => a.state === "not_connected")
          ? "not_connected"
          : "error";
  pages.sort((a, b) =>
    (b.latestDeployment?.createdOn ?? "").localeCompare(a.latestDeployment?.createdOn ?? ""),
  );
  workers.sort((a, b) => (b.modifiedOn ?? "").localeCompare(a.modifiedOn ?? ""));
  zones.sort((a, b) => a.name.localeCompare(b.name));
  return { truthState, accounts, pages, workers, zones };
}

/* ---------------- On-demand detail and actions ---------------- */

function requireAccount(env: Env, accountId: string): void {
  if (!ACCOUNT_ID.test(accountId) || !configuredAccounts(env).includes(accountId)) {
    throw new CloudflareActionError("Unknown Cloudflare account", 404);
  }
}

function requireResource(name: string): void {
  if (!RESOURCE.test(name)) throw new CloudflareActionError("Invalid resource name", 400);
}

export async function listPagesDeployments(
  env: Env,
  accountId: string,
  project: string,
): Promise<CfDeployment[]> {
  requireAccount(env, accountId);
  requireResource(project);
  const token = pagesTokenFor(accountId, env);
  if (!token) throw new CloudflareActionError("No Cloudflare token for this account", 404);
  const base = "/accounts/" + accountId + "/pages/projects/" + encodeURIComponent(project);
  const [projectRes, deployments] = await Promise.all([
    cloudflareGet<{ result: unknown }>(base, token),
    cloudflareGet<{ result: unknown }>(base + "/deployments?per_page=25", token),
  ]);
  const productionId = str(obj(obj(projectRes.result).canonical_deployment).id);
  return arr(deployments.result)
    .map((d) => mapDeployment(d, productionId))
    .filter((d): d is CfDeployment => Boolean(d));
}

export async function getDeploymentLogs(
  env: Env,
  accountId: string,
  project: string,
  deploymentId: string,
): Promise<{ lines: DeploymentLogLine[]; total: number }> {
  requireAccount(env, accountId);
  requireResource(project);
  if (!DEPLOYMENT_ID.test(deploymentId)) throw new CloudflareActionError("Invalid deployment", 400);
  const token = pagesTokenFor(accountId, env);
  if (!token) throw new CloudflareActionError("No Cloudflare token for this account", 404);
  const res = await cloudflareGet<{ result: unknown }>(
    "/accounts/" +
      accountId +
      "/pages/projects/" +
      encodeURIComponent(project) +
      "/deployments/" +
      encodeURIComponent(deploymentId) +
      "/history/logs",
    token,
  );
  const r = obj(res.result);
  const lines = arr(r.data)
    .map((l) => ({
      ts: str(obj(l).ts),
      line: typeof obj(l).line === "string" ? (obj(l).line as string).slice(0, 2000) : "",
    }))
    .slice(-2000);
  return { lines, total: typeof r.total === "number" ? r.total : lines.length };
}

async function zoneInAccount(
  env: Env,
  accountId: string,
  zoneId: string,
): Promise<{ token: string; name: string }> {
  requireAccount(env, accountId);
  if (!ACCOUNT_ID.test(zoneId)) throw new CloudflareActionError("Invalid zone", 400);
  const token = apiTokenFor(accountId, env);
  if (!token) throw new CloudflareActionError("No Cloudflare token for this account", 404);
  const zone = obj((await cloudflareGet<{ result: unknown }>("/zones/" + zoneId, token)).result);
  if (str(obj(zone.account).id) !== accountId)
    throw new CloudflareActionError("Zone does not belong to this account", 404);
  return { token, name: str(zone.name) ?? "" };
}

export async function listDns(env: Env, accountId: string, zoneId: string): Promise<DnsRecord[]> {
  const { token } = await zoneInAccount(env, accountId, zoneId);
  const rows = await allPages("/zones/" + zoneId + "/dns_records", token, 100);
  return rows
    .map((raw) => {
      const r = obj(raw);
      const id = str(r.id);
      if (!id) return null;
      return {
        id,
        type: str(r.type) ?? "?",
        name: str(r.name) ?? "",
        content: (str(r.content) ?? "").slice(0, 500),
        proxied: r.proxied === true,
        ttl: typeof r.ttl === "number" ? r.ttl : 1,
      };
    })
    .filter((r): r is DnsRecord => Boolean(r))
    .sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type));
}

async function cloudflarePost(path: string, token: string, body?: unknown): Promise<Obj> {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  let payload: Obj = {};
  try {
    payload = obj(await res.json());
  } catch {
    /* status is reported below */
  }
  if (!res.ok || payload.success !== true) {
    const code = arr(payload.errors)
      .map((e) => obj(e).code)
      .find((c) => typeof c === "number");
    const hint =
      res.status === 403 ? " — the account token is read-only or lacks Edit permission" : "";
    throw new CloudflareActionError(
      "Cloudflare HTTP " + res.status + (code ? " (CF code " + code + ")" : "") + hint,
      res.status || 502,
    );
  }
  return payload;
}

export async function pagesDeploymentAction(
  env: Env,
  input: {
    accountId: string;
    project: string;
    deploymentId: string;
    action: "retry" | "rollback";
    confirmName: string;
  },
): Promise<CfDeployment | null> {
  requireAccount(env, input.accountId);
  requireResource(input.project);
  if (!DEPLOYMENT_ID.test(input.deploymentId))
    throw new CloudflareActionError("Invalid deployment", 400);
  // Defence in depth: the browser confirmation must name the exact project.
  if (input.confirmName !== input.project)
    throw new CloudflareActionError("Confirmation does not match the project name", 400);
  const token = apiTokenFor(input.accountId, env);
  if (!token) throw new CloudflareActionError("No Cloudflare token for this account", 404);
  const res = await cloudflarePost(
    "/accounts/" +
      input.accountId +
      "/pages/projects/" +
      encodeURIComponent(input.project) +
      "/deployments/" +
      encodeURIComponent(input.deploymentId) +
      "/" +
      input.action,
    token,
  );
  return mapDeployment(res.result, null);
}

export async function purgeZone(
  env: Env,
  input: { accountId: string; zoneId: string; confirmName: string },
): Promise<{ zone: string }> {
  const { token, name } = await zoneInAccount(env, input.accountId, input.zoneId);
  if (!name || input.confirmName !== name)
    throw new CloudflareActionError("Confirmation does not match the zone name", 400);
  await cloudflarePost("/zones/" + input.zoneId + "/purge_cache", token, {
    purge_everything: true,
  });
  return { zone: name };
}
