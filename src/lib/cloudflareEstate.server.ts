/**
 * Additional Cloudflare estate discovery. Server-only and read-only.
 * Every result is sourced from an authorized API response, never guessed.
 * API tokens and raw Worker settings are never returned to the browser.
 */
import {
  apiTokenFor, configuredAccountLabels, configuredAccounts,
} from "@/lib/cloudflareInventory.server";

export type CloudflareAssetKind = "d1" | "kv" | "r2" | "queues";
export type CloudflareCheckState = "live" | "error" | "not_connected";
export type CloudflareAsset = {
  key: string;
  accountId: string;
  kind: CloudflareAssetKind;
  name: string;
  id: string;
  createdAt: string | null;
  jurisdiction: string | null;
  details: string[];
  linkedWorkers: string[];
  dashboardUrl: string;
};
export type CloudflareServiceCheck = {
  key: string;
  accountId: string;
  accountLabel: string;
  service: CloudflareAssetKind;
  scope: string;
  state: CloudflareCheckState;
  count: number | null; // null means NOT measured, never zero
  error: string | null;
};
export type CloudflareEstate = {
  fetchedAt: string;
  truthState: "live" | "partial" | "error" | "not_connected";
  assets: CloudflareAsset[];
  checks: CloudflareServiceCheck[];
  accounts: string[];
};
export type CloudflareWorkerBinding = {
  name: string;
  type: string;
  target: string | null;
};
export type CloudflareWorkerDetails = {
  accountId: string;
  name: string;
  fetchedAt: string;
  bindings: CloudflareWorkerBinding[];
  crons: string[];
  workersDevUrl: string | null;
  observability: boolean | null;
  logs: boolean | null;
  checks: { section: string; state: "live" | "error"; error: string | null }[];
};

const API = "https://api.cloudflare.com/client/v4";
const MAX_PAGES = 100;
const RESOURCE_NAME = /^[a-zA-Z0-9_.-]{1,160}$/;
const R2_JURISDICTIONS = ["default", "eu", "us", "fedramp", "fedramp-high"] as const;
type Envelope = {
  success?: boolean;
  result?: unknown;
  result_info?: {
    total_pages?: number;
    total_count?: number;
    per_page?: number;
    cursor?: string | null;
  };
};

const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const str = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;
const items = (v: unknown): unknown[] => Array.isArray(v) ? v : [];

function scopedToken(accountId: string, kind: CloudflareAssetKind,
  env: Record<string, string | undefined>): string | null {
  // Optional least-privilege tokens for storage products; fallback to the
  // account default (never a credential belonging to another account).
  try {
    const configured = object(JSON.parse(env["CLOUDFLARE_ACCOUNT_TOKENS_JSON"] || "{}"));
    const account = object(configured[accountId]);
    if (str(account[kind])) return str(account[kind]);
  } catch { /* malformed config falls back to the normal account token */ }
  return apiTokenFor(accountId, env);
}
async function request(path: string, token: string, jurisdiction?: string): Promise<Envelope> {
  const response = await fetch(API + path, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      ...(jurisdiction && jurisdiction !== "default" ? { "cf-r2-jurisdiction": jurisdiction } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  // Never forward provider error messages: some contain identifying paths or data.
  if (!response.ok) throw new Error("Cloudflare HTTP " + response.status);
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object" || (raw as Envelope).success !== true) {
    throw new Error("Cloudflare API rejected the request");
  }
  return raw as Envelope;
}

async function paged(path: string, token: string): Promise<unknown[]> {
  const all: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const envelope = await request(path + (path.includes("?") ? "&" : "?") +
      "page=" + page + "&per_page=100", token);
    if (!Array.isArray(envelope.result)) throw new Error("Unexpected API list shape");
    const info = envelope.result_info;
    const total = info?.total_count;
    const maxPage = info?.total_pages;
    if (typeof total !== "number" && typeof maxPage !== "number") {
      throw new Error("Pagination metadata missing; completeness unverified");
    }
    if (typeof total === "number" && (!Number.isInteger(total) || total < 0)) {
      throw new Error("Invalid list total");
    }
    if (typeof maxPage === "number" && (!Number.isInteger(maxPage) || maxPage < 0 || maxPage > MAX_PAGES)) {
      throw new Error("Inventory pagination exceeds limit");
    }
    all.push(...envelope.result);
    if (typeof total === "number" && all.length > total) throw new Error("List exceeded API total");
    const end = typeof maxPage === "number" ? page >= Math.max(1, maxPage) :
      typeof total === "number" && all.length >= total;
    if (end) {
      if (typeof total === "number" && all.length !== total) throw new Error("Incomplete API inventory");
      return all;
    }
    if (envelope.result.length === 0) throw new Error("Unexpected empty pagination page");
  }
  throw new Error("Inventory pagination limit reached");
}

async function r2Buckets(accountId: string, token: string, jurisdiction: string) {
  const output: unknown[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const suffix = cursor ? "?per_page=100&cursor=" + encodeURIComponent(cursor) : "?per_page=100";
    const response = await request("/accounts/" + accountId + "/r2/buckets" + suffix, token, jurisdiction);
    const result = object(response.result);
    if (!Array.isArray(result.buckets)) throw new Error("Unexpected R2 response");
    output.push(...result.buckets);
    const next = str(response.result_info?.cursor);
    if (!next) {
      if (typeof response.result_info?.total_count === "number" &&
          output.length !== response.result_info.total_count) {
        throw new Error("R2 inventory incomplete");
      }
      return output;
    }
    if (seen.has(next)) throw new Error("Repeated R2 pagination cursor");
    seen.add(next);
    cursor = next;
  }
  throw new Error("R2 pagination limit reached");
}

function asAsset(accountId: string, kind: CloudflareAssetKind,
  raw: unknown, jurisdiction: string | null = null): CloudflareAsset | null {
  const row = object(raw);
  const id = str(kind === "d1" ? row.uuid :
    kind === "kv" ? row.id : kind === "queues" ? row.queue_id : row.name);
  const name = str(kind === "kv" ? row.title :
    kind === "queues" ? row.queue_name : row.name);
  if (!id || !name || name.length > 512 || id.length > 160) return null;
  const extra = kind === "queues" ? object(row.settings) : {};
  const linkedWorkers = kind === "queues"
    ? [...new Set([
        ...items(row.consumers).map(x => str(object(x).script_name)),
        ...items(row.producers).map(x => str(object(x).script)),
      ].filter((v): v is string => !!v))]
    : [];
  const details = kind === "d1" ? [str(row.version) && "Version: " + str(row.version)] :
    kind === "kv" ? [str(row.mode) && "Mode: " + str(row.mode)] :
    kind === "r2" ? [str(row.location) && "Location: " + str(row.location),
      str(row.storage_class) && "Storage class: " + str(row.storage_class)] :
      [typeof extra.delivery_paused === "boolean"
        ? "Delivery: " + (extra.delivery_paused ? "paused" : "enabled") : null,
      typeof row.consumers_total_count === "number" ? "Consumers: " + row.consumers_total_count : null];
  return {
    key: accountId + ":" + kind + ":" + (jurisdiction || "") + ":" + id,
    accountId, kind, name, id,
    createdAt: str(row.created_at) || str(row.creation_date) || str(row.created_on),
    jurisdiction: str(row.jurisdiction) || jurisdiction,
    details: details.filter((v): v is string => typeof v === "string"),
    linkedWorkers,
    // Stable account-scoped overview, rather than invented resource routes.
    dashboardUrl: "https://dash.cloudflare.com/" + accountId + "/workers-and-pages",
  };
}

export async function collectCloudflareEstate(
  env: Record<string, string | undefined> = process.env,
): Promise<CloudflareEstate> {
  const fetchedAt = new Date().toISOString();
  const accounts = configuredAccounts(env);
  if (!accounts.length) return { fetchedAt, truthState: "not_connected", accounts, assets: [], checks: [] };
  const labels = configuredAccountLabels(env);
  const checks: CloudflareServiceCheck[] = [];
  const assets: CloudflareAsset[] = [];
  // The five R2 jurisdictions are explicitly checked; failure of one is not
  // misreported as a complete empty bucket inventory.
  const tasks = accounts.flatMap(accountId =>
    (["d1", "kv", "r2", "queues"] as const).flatMap(kind =>
      (kind === "r2" ? [...R2_JURISDICTIONS] : [""]).map(scope => ({ accountId, kind, scope }))));
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, tasks.length) }, async () => {
    while (next < tasks.length) {
      const { accountId, kind, scope } = tasks[next++];
      const token = scopedToken(accountId, kind, env);
      const check: CloudflareServiceCheck = {
        key: accountId + ":" + kind + ":" + scope,
        accountId, accountLabel: labels[accountId] || "Account …" + accountId.slice(-6),
        service: kind, scope: scope || "account",
        state: "not_connected", count: null, error: null,
      };
      if (!token) {
        check.error = "Server-side " + kind.toUpperCase() + " read token missing";
      } else {
        try {
          const path = "/accounts/" + accountId;
          const records = kind === "r2"
            ? await r2Buckets(accountId, token, scope)
            : await paged(path + (kind === "d1" ? "/d1/database" :
                kind === "kv" ? "/storage/kv/namespaces" : "/queues"), token);
          const normalized = records.map(raw => asAsset(accountId, kind, raw, scope || null));
          if (normalized.some(x => !x)) throw new Error("Invalid API resource identifier");
          assets.push(...normalized.filter((a): a is CloudflareAsset => !!a));
          check.count = records.length;
          check.state = "live";
        } catch (error) {
          check.state = "error";
          check.error = error instanceof Error && /^Cloudflare HTTP [0-9]{3}$/.test(error.message)
            ? error.message : "Cloudflare API response or pagination incomplete";
        }
      }
      checks.push(check);
    }
  }));
  const live = checks.filter(c => c.state === "live").length;
  const truthState = live === checks.length ? "live" :
    live ? "partial" : checks.every(c => c.state === "not_connected") ? "not_connected" : "error";
  return { fetchedAt, accounts, truthState,
    assets: assets.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
    checks: checks.sort((a, b) => a.accountLabel.localeCompare(b.accountLabel) ||
      a.service.localeCompare(b.service) || a.scope.localeCompare(b.scope)),
  };
}

function bindingMetadata(raw: unknown): CloudflareWorkerBinding | null {
  const binding = object(raw);
  const name = str(binding.name);
  const type = str(binding.type);
  if (!name || !type || name.length > 120 || type.length > 90) return null;
  const fields: Record<string, string> = {
    kv_namespace: "namespace_id", d1: "id", d1_database: "id",
    r2_bucket: "bucket_name", queue: "queue_name", service: "service",
    durable_object_namespace: "class_name",
  };
  // Only resource references are returned. NEVER text/plaintext/secret values,
  // key material, API response objects or arbitrary binding configuration.
  const target = fields[type] ? str(binding[fields[type]]) : null;
  return { name, type, target };
}
export async function inspectCloudflareWorker(
  input: { accountId: string; name: string },
  env: Record<string, string | undefined> = process.env,
): Promise<CloudflareWorkerDetails> {
  if (!configuredAccounts(env).includes(input.accountId) || !RESOURCE_NAME.test(input.name)) {
    throw new Error("Unknown Cloudflare Worker");
  }
  const token = apiTokenFor(input.accountId, env);
  if (!token) throw new Error("Cloudflare Worker metadata token is not configured");
  const prefix = "/accounts/" + input.accountId + "/workers";
  const script = prefix + "/scripts/" + encodeURIComponent(input.name);
  const endpoints = [
    { section: "Bindings", path: script + "/settings" },
    { section: "Cron triggers", path: script + "/schedules" },
    { section: "Observability", path: script + "/script-settings" },
    { section: "workers.dev routing", path: script + "/subdomain" },
    { section: "Account subdomain", path: prefix + "/subdomain" },
  ];
  const results = await Promise.allSettled(endpoints.map(x => request(x.path, token)));
  const checks = results.map((r, i) => ({
    section: endpoints[i].section,
    state: (r.status === "fulfilled" ? "live" : "error") as "live" | "error",
    error: r.status === "rejected" ? "Unavailable or insufficient Worker Read permissions" : null,
  }));
  const get = (i: number) => results[i].status === "fulfilled"
    ? object((results[i] as PromiseFulfilledResult<Envelope>).value.result) : {};
  const setting = get(0), cron = get(1), observability = get(2), subdomain = get(3), accountSubdomain = get(4);
  const bindings = items(setting.bindings).map(bindingMetadata)
    .filter((v): v is CloudflareWorkerBinding => !!v);
  const crons = items(cron.schedules).map(x => str(object(x).cron)).filter((v): v is string => !!v);
  const accountName = str(accountSubdomain.subdomain);
  const workersDevUrl = subdomain.enabled === true && accountName && /^[a-z0-9-]{1,63}$/.test(accountName)
    ? "https://" + input.name + "." + accountName + ".workers.dev/" : null;
  const obs = object(observability.observability);
  const logs = object(obs.logs);
  return {
    accountId: input.accountId, name: input.name, fetchedAt: new Date().toISOString(),
    bindings, crons, workersDevUrl,
    observability: typeof obs.enabled === "boolean" ? obs.enabled : null,
    logs: typeof logs.enabled === "boolean" ? logs.enabled : null,
    checks,
  };
}
