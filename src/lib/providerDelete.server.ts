/**
 * Permanent deletes for Cloudflare Pages projects, Workers and GitHub
 * repositories.
 *
 * Rules (each has a regression test):
 * - Only dedicated write credentials are used, never the read/inventory keys.
 * - Before deleting, the key is checked against the provider: it must be live,
 *   belong to the right account and be able to see the exact resource. Where
 *   the provider exposes granted permissions they are checked too.
 * - Success is reported ONLY when the provider accepted the delete AND a fresh
 *   read afterwards no longer finds the resource. Every ambiguous answer
 *   (404 on delete, lost connection, still listed) is "unverified".
 * - Old Pages deployments are never removed as a side effect; that is a
 *   separate, explicitly confirmed cleanup step.
 * - Provider error text never reaches the browser, only safe codes and our
 *   own explanations.
 */
import { configuredAccounts, deployTokenFor } from "@/lib/cloudflareInventory.server";
import {
  MANAGED_GITHUB_ACCOUNTS,
  type ManagedGitHubAccount,
} from "@/lib/githubPrivateInventory.server";
import { CF_NAME, GH_NAME } from "@/lib/providerDeleteNames";

export { CF_NAME, GH_NAME };

export type DeleteFailureCode =
  | "invalid"
  | "not_configured"
  | "unauthorized"
  | "forbidden"
  | "admin_required"
  | "not_found"
  | "blocked"
  | "needs_cleanup"
  | "rate_limited"
  | "network"
  | "unverified"
  | "rejected";

export type DeleteOutcome =
  | { ok: true; code: "deleted"; message: string; verifiedAt: string }
  | { ok: false; code: DeleteFailureCode; message: string; retryAfterSeconds?: number };

export type CleanupOutcome =
  | { ok: true; removed: number; failed: number; kept: number; more: boolean; message: string }
  | { ok: false; code: DeleteFailureCode; message: string; retryAfterSeconds?: number };

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type Env = Record<string, string | undefined>;
type Failure = Extract<DeleteOutcome, { ok: false }>;

const CF_API = "https://api.cloudflare.com/client/v4";
const GH_API = "https://api.github.com";
/** Cloudflare refuses to delete Pages projects with too many deployments. */
const TOO_MANY_DEPLOYMENTS = 8000076;
/** Old deployments removed per cleanup press; keeps one request inside Worker subrequest limits. */
export const CLEANUP_BATCH = 25;
const DEPLOYMENT_ID = /^[a-f0-9][a-f0-9-]{7,63}$/i;

const fail = (code: DeleteFailureCode, message: string, retryAfterSeconds?: number): Failure =>
  retryAfterSeconds
    ? { ok: false, code, message, retryAfterSeconds }
    : { ok: false, code, message };

// ---------------------------------------------------------------- credentials
function parseObject(raw: string | undefined): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw || "{}");
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
const secret = (value: unknown) =>
  typeof value === "string" && value.trim().length > 15 ? value.trim() : null;

/**
 * Write key for deleting in one Cloudflare account. `CLOUDFLARE_DELETE_TOKENS_JSON`
 * maps account id -> key, or -> { pages, workers }. Pages may fall back to the
 * account's dedicated `deploy` key (Pages Edit). Read keys are never used.
 */
export function cloudflareDeleteTokenFor(
  accountId: string,
  kind: "pages" | "worker",
  env: Env,
): string | null {
  const entry = parseObject(env["CLOUDFLARE_DELETE_TOKENS_JSON"])[accountId];
  const direct = secret(entry);
  if (direct) return direct;
  if (entry && typeof entry === "object") {
    const scoped = secret(
      (entry as Record<string, unknown>)[kind === "pages" ? "pages" : "workers"],
    );
    if (scoped) return scoped;
  }
  return kind === "pages" ? deployTokenFor(accountId, env) : null;
}

/** Write key for deleting repositories of one connected owner (`GITHUB_DELETE_TOKENS_JSON`). */
export function githubDeleteTokenFor(
  owner: string,
  env: Env,
): { owner: ManagedGitHubAccount; token: string } | null {
  const match = MANAGED_GITHUB_ACCOUNTS.find((o) => o.toLowerCase() === owner.toLowerCase());
  if (!match) return null;
  const record = parseObject(env["GITHUB_DELETE_TOKENS_JSON"]);
  const key = Object.keys(record).find((k) => k.toLowerCase() === match.toLowerCase());
  const token = key ? secret(record[key]) : null;
  return token ? { owner: match, token } : null;
}

// ---------------------------------------------------------------- transport
type Reply = {
  status: number; // 0 = no answer (network / timeout)
  body: Record<string, unknown> | null;
  headers: Headers;
};

async function send(
  f: FetchLike,
  method: "GET" | "DELETE",
  url: string,
  headers: Record<string, string>,
  timeout = 15_000,
): Promise<Reply> {
  try {
    const res = await f(url, {
      method,
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeout),
    });
    let body: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = await res.json();
      body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      /* empty or non-JSON body */
    }
    return { status: res.status, body, headers: res.headers };
  } catch {
    return { status: 0, body: null, headers: new Headers() };
  }
}

function retryAfter(reply: Reply): number | undefined {
  const after = Number(reply.headers.get("retry-after"));
  if (Number.isFinite(after) && after > 0) return Math.min(Math.ceil(after), 3600);
  const reset = Number(reply.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) {
    const wait = Math.ceil(reset - Date.now() / 1000);
    if (wait > 0) return Math.min(wait, 3600);
  }
  return undefined;
}

// ---------------------------------------------------------------- Cloudflare
const cfHeaders = (token: string) => ({
  Authorization: "Bearer " + token,
  Accept: "application/json",
});
const cfErrors = (reply: Reply) =>
  Array.isArray(reply.body?.errors) ? (reply.body!.errors as Array<Record<string, unknown>>) : [];
const cfOk = (reply: Reply) =>
  reply.status >= 200 && reply.status < 300 && reply.body?.success !== false;
const cfTooMany = (reply: Reply) =>
  cfErrors(reply).some(
    (e) =>
      Number(e.code) === TOO_MANY_DEPLOYMENTS ||
      /too many deployments/i.test(String(e.message || "")),
  );
const cfDependency = (reply: Reply) =>
  reply.status === 409 ||
  cfErrors(reply).some((e) =>
    /in use|still used|referenc|binding|depend|durable object|dispatch namespace|service/i.test(
      String(e.message || ""),
    ),
  );
const cfFirstCode = (reply: Reply) => {
  const code = Number(cfErrors(reply)[0]?.code);
  return Number.isFinite(code) && code > 0 ? code : null;
};

const PERMISSION = { pages: "Cloudflare Pages: Edit", worker: "Workers Scripts: Edit" } as const;
const PERMISSION_GROUP = {
  pages: /^(cloudflare )?pages (write|edit)$/i,
  worker: /^workers scripts (write|edit)$/i,
} as const;

/** Does this token policy cover `accountId`? Handles account and user token resource shapes. */
function coversAccount(resources: unknown, accountId: string): boolean {
  const text = JSON.stringify(resources ?? {});
  return (
    text.includes('"com.cloudflare.api.account.' + accountId + '"') ||
    text.includes('"com.cloudflare.api.account.*"')
  );
}

type Permission = "confirmed" | "unconfirmed";

/**
 * The key must be active. When Cloudflare lets the key read its own policies
 * we also require the exact Edit permission on this account; otherwise the
 * permission is confirmed by the delete call itself (403 is reported as-is).
 */
async function verifyCloudflareKey(
  f: FetchLike,
  accountId: string,
  kind: "pages" | "worker",
  token: string,
): Promise<Permission | Failure> {
  const headers = cfHeaders(token);
  let scope: "account" | "user" = "account";
  let reply = await send(f, "GET", CF_API + "/accounts/" + accountId + "/tokens/verify", headers);
  const active = (r: Reply) =>
    cfOk(r) && (r.body?.result as Record<string, unknown> | undefined)?.status === "active";
  if (!active(reply)) {
    const user = await send(f, "GET", CF_API + "/user/tokens/verify", headers);
    if (active(user)) {
      scope = "user";
      reply = user;
    } else {
      if (reply.status === 0 && user.status === 0)
        return fail("network", "Could not reach Cloudflare. Nothing was deleted.");
      if (reply.status === 429 || user.status === 429)
        return fail(
          "rate_limited",
          "Cloudflare is rate limiting this key. Nothing was deleted — wait a minute and try again.",
          retryAfter(user.status === 429 ? user : reply),
        );
      return fail(
        "unauthorized",
        "The Cloudflare delete key for this account is invalid, expired or disabled. Nothing was deleted.",
      );
    }
  }
  const tokenId = String((reply.body?.result as Record<string, unknown>)?.id || "");
  if (!/^[a-f0-9]{16,64}$/i.test(tokenId)) return "unconfirmed";
  const details = await send(
    f,
    "GET",
    CF_API +
      (scope === "account"
        ? "/accounts/" + accountId + "/tokens/" + tokenId
        : "/user/tokens/" + tokenId),
    headers,
  );
  const policies = (details.body?.result as Record<string, unknown> | undefined)?.policies;
  if (!cfOk(details) || !Array.isArray(policies)) return "unconfirmed";
  const need = PERMISSION_GROUP[kind];
  const relevant = (policies as Array<Record<string, unknown>>).filter(
    (p) =>
      coversAccount(p.resources, accountId) &&
      Array.isArray(p.permission_groups) &&
      (p.permission_groups as Array<Record<string, unknown>>).some((g) =>
        need.test(String(g.name || "")),
      ),
  );
  if (relevant.some((p) => p.effect === "deny") || !relevant.some((p) => p.effect === "allow"))
    return fail(
      "forbidden",
      "The Cloudflare delete key does not have “" +
        PERMISSION[kind] +
        "” for this account. Add it in Cloudflare (API Tokens), then try again. Nothing was deleted.",
    );
  return "confirmed";
}

function cfReadFailure(reply: Reply, kind: "pages" | "worker", what: string): Failure {
  if (reply.status === 0)
    return fail("network", "Could not reach Cloudflare. Nothing was deleted.");
  if (reply.status === 429)
    return fail(
      "rate_limited",
      "Cloudflare is rate limiting this key. Nothing was deleted — wait a minute and try again.",
      retryAfter(reply),
    );
  if (reply.status === 404)
    return fail(
      "not_found",
      "Cloudflare has no " +
        what +
        " with this exact name in this account. Nothing was deleted. The list will refresh to show Cloudflare's current state.",
    );
  if (reply.status === 401 || reply.status === 403)
    return fail(
      "forbidden",
      "The Cloudflare delete key cannot open this " +
        what +
        ". It needs “" +
        PERMISSION[kind] +
        "” on this exact account. Nothing was deleted.",
    );
  return fail(
    "rejected",
    "Cloudflare did not answer clearly (HTTP " + reply.status + "). Nothing was deleted.",
  );
}

type CfTarget = { accountId: string; kind: "pages" | "worker"; name: string };
function cfPaths(input: CfTarget) {
  const base =
    "/accounts/" +
    input.accountId +
    (input.kind === "pages" ? "/pages/projects/" : "/workers/scripts/") +
    encodeURIComponent(input.name);
  // Worker settings are small JSON; the script itself would download all of its code.
  return { base, read: input.kind === "pages" ? base : base + "/settings" };
}

async function cfPrepare(
  input: CfTarget,
  env: Env,
  f: FetchLike,
): Promise<{ token: string; project: Record<string, unknown> | null } | Failure> {
  if (!configuredAccounts(env).includes(input.accountId) || !CF_NAME.test(input.name))
    return fail(
      "invalid",
      "This Cloudflare project is not in one of the accounts connected to this app.",
    );
  const token = cloudflareDeleteTokenFor(input.accountId, input.kind, env);
  if (!token)
    return fail(
      "not_configured",
      "No Cloudflare delete key is set up for this account. Add a key with “" +
        PERMISSION[input.kind] +
        "” to the server settings first.",
    );
  const permission = await verifyCloudflareKey(f, input.accountId, input.kind, token);
  if (typeof permission !== "string") return permission;
  const what = input.kind === "pages" ? "Pages project" : "Worker";
  const read = await send(f, "GET", CF_API + cfPaths(input).read, cfHeaders(token));
  if (!cfOk(read)) return cfReadFailure(read, input.kind, what);
  const result = read.body?.result;
  return {
    token,
    project: result && typeof result === "object" ? (result as Record<string, unknown>) : null,
  };
}

/** After an accepted delete: success only if a fresh read no longer finds it. */
async function cfConfirmGone(
  f: FetchLike,
  input: CfTarget,
  token: string,
  accepted: boolean,
): Promise<DeleteOutcome> {
  const what = input.kind === "pages" ? "Pages project" : "Worker";
  const check = await send(f, "GET", CF_API + cfPaths(input).read, cfHeaders(token));
  if (accepted && check.status === 404)
    return {
      ok: true,
      code: "deleted",
      message: "Deleted from Cloudflare and confirmed gone.",
      verifiedAt: new Date().toISOString(),
    };
  if (check.status === 404)
    return fail(
      "unverified",
      "Cloudflare no longer shows this " +
        what +
        ", but it did not confirm that this delete removed it. It stays in your list until a refresh shows Cloudflare's state.",
    );
  return fail(
    "unverified",
    accepted
      ? "Cloudflare accepted the delete but still shows this " +
          what +
          ". It may take a minute — refresh before trying again."
      : "Cloudflare's answer was unclear, so this " +
          what +
          " may or may not be deleted. Refresh before trying again.",
  );
}

export async function deleteCloudflareResource(
  input: CfTarget,
  env: Env = process.env,
  f: FetchLike = fetch,
): Promise<DeleteOutcome> {
  const ready = await cfPrepare(input, env, f);
  if ("ok" in ready) return ready;
  const what = input.kind === "pages" ? "Pages project" : "Worker";
  // Never ?force=true: Cloudflare must refuse when other Workers depend on this one.
  const reply = await send(
    f,
    "DELETE",
    CF_API + cfPaths(input).base,
    cfHeaders(ready.token),
    25_000,
  );
  if (reply.status === 0) return cfConfirmGone(f, input, ready.token, false);
  if (cfOk(reply)) return cfConfirmGone(f, input, ready.token, true);
  if (input.kind === "pages" && cfTooMany(reply))
    return fail(
      "needs_cleanup",
      "Cloudflare refuses to delete Pages projects that still have many old deployments. Nothing was deleted. You can remove old deployments first (the live one is kept) — that is a separate step you confirm on its own.",
    );
  if (reply.status === 401)
    return fail(
      "unauthorized",
      "Cloudflare no longer accepts the delete key. Nothing was deleted.",
    );
  if (reply.status === 403)
    return fail(
      "forbidden",
      "Cloudflare refused: the delete key lacks “" +
        PERMISSION[input.kind] +
        "” for this account. Nothing was deleted.",
    );
  if (reply.status === 404) return cfConfirmGone(f, input, ready.token, false);
  if (reply.status === 429)
    return fail(
      "rate_limited",
      "Cloudflare is rate limiting this key. Nothing was deleted — wait a minute and try again.",
      retryAfter(reply),
    );
  if (input.kind === "worker" && cfDependency(reply))
    return fail(
      "blocked",
      "Cloudflare refused because other Workers still depend on this one (Durable Objects, service bindings or dispatch namespaces). Remove those links first. Nothing was deleted.",
    );
  const code = cfFirstCode(reply);
  return fail(
    "rejected",
    "Cloudflare did not delete this " +
      what +
      " (HTTP " +
      reply.status +
      (code ? " / code " + code : "") +
      "). Nothing was deleted.",
  );
}

/**
 * Separate, explicitly confirmed step: removes up to CLEANUP_BATCH of the
 * oldest Pages deployments so Cloudflare will allow deleting the project.
 * The live (canonical/latest) deployment and any aliased deployment are kept.
 * Never deletes the project itself.
 */
export async function cleanupPagesDeployments(
  input: { accountId: string; name: string },
  env: Env = process.env,
  f: FetchLike = fetch,
): Promise<CleanupOutcome> {
  const target: CfTarget = { ...input, kind: "pages" };
  const ready = await cfPrepare(target, env, f);
  if ("ok" in ready) return ready;
  const keep = new Set(
    [ready.project?.canonical_deployment, ready.project?.latest_deployment]
      .map((d) =>
        d && typeof d === "object" ? String((d as Record<string, unknown>).id || "") : "",
      )
      .filter(Boolean),
  );
  const list = await send(
    f,
    "GET",
    CF_API +
      cfPaths(target).base +
      "/deployments?per_page=" +
      (CLEANUP_BATCH + keep.size + 5) +
      "&sort_by=created_on&sort_order=asc",
    cfHeaders(ready.token),
  );
  if (!cfOk(list)) return cfReadFailure(list, "pages", "Pages project");
  const rows = Array.isArray(list.body?.result)
    ? (list.body!.result as Array<Record<string, unknown>>)
    : [];
  const candidates = rows.filter((d) => {
    const id = String(d.id || "");
    const aliased = Array.isArray(d.aliases) && d.aliases.length > 0;
    return DEPLOYMENT_ID.test(id) && !keep.has(id) && !aliased;
  });
  const ids = candidates.slice(0, CLEANUP_BATCH).map((d) => String(d.id));
  let removed = 0;
  let failed = 0;
  for (let i = 0; i < ids.length; i += 5) {
    const batch = await Promise.all(
      ids
        .slice(i, i + 5)
        .map((id) =>
          send(
            f,
            "DELETE",
            CF_API + cfPaths(target).base + "/deployments/" + id + "?force=true",
            cfHeaders(ready.token),
          ),
        ),
    );
    for (const r of batch) {
      if (cfOk(r)) removed++;
      else failed++;
    }
    if (batch.some((r) => r.status === 429)) {
      failed += Math.max(0, ids.length - (i + 5));
      break;
    }
  }
  const total = Number(
    (list.body?.result_info as Record<string, unknown> | undefined)?.total_count,
  );
  const more =
    candidates.length > ids.length ||
    (Number.isFinite(total) && total - removed - keep.size > 0 && removed === CLEANUP_BATCH);
  return {
    ok: true,
    removed,
    failed,
    kept: rows.length - candidates.length,
    more,
    message:
      "Removed " +
      removed +
      " old deployment" +
      (removed === 1 ? "" : "s") +
      (failed ? " (" + failed + " could not be removed)" : "") +
      ". The live deployment was kept. The project itself was not deleted." +
      (more ? " More old deployments remain." : ""),
  };
}

// ---------------------------------------------------------------- GitHub
const ghHeaders = (token: string) => ({
  Authorization: "Bearer " + token,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "mission-control",
});
const ghRateLimited = (reply: Reply) =>
  reply.status === 429 ||
  (reply.status === 403 &&
    (reply.headers.get("x-ratelimit-remaining") === "0" || reply.headers.has("retry-after")));
const MOVED = new Set([301, 302, 307, 308]);

export async function deleteGitHubRepository(
  input: { owner: string; repo: string },
  env: Env = process.env,
  f: FetchLike = fetch,
): Promise<DeleteOutcome> {
  if (
    !GH_NAME.test(input.repo) ||
    !MANAGED_GITHUB_ACCOUNTS.some((o) => o.toLowerCase() === input.owner.toLowerCase())
  )
    return fail("invalid", "This repository is not in one of your connected GitHub accounts.");
  const account = githubDeleteTokenFor(input.owner, env);
  if (!account)
    return fail(
      "not_configured",
      "No GitHub delete key is set up for " +
        input.owner +
        ". Add one with permission to delete repositories to the server settings first.",
    );
  const full = account.owner + "/" + input.repo;
  const url = GH_API + "/repos/" + account.owner + "/" + encodeURIComponent(input.repo);
  const headers = ghHeaders(account.token);
  const limited = (r: Reply) =>
    fail(
      "rate_limited",
      "GitHub is rate limiting this key. Nothing was deleted — wait and try again.",
      retryAfter(r),
    );

  // 1. Preflight: the key must see this exact repository and be its admin.
  const pre = await send(f, "GET", url, headers);
  if (pre.status === 0) return fail("network", "Could not reach GitHub. Nothing was deleted.");
  if (ghRateLimited(pre)) return limited(pre);
  if (MOVED.has(pre.status))
    return fail(
      "invalid",
      "GitHub says " +
        full +
        " was renamed or moved. Nothing was deleted — refresh the list and confirm the new name.",
    );
  if (pre.status === 401)
    return fail(
      "unauthorized",
      "GitHub no longer accepts the delete key for " + account.owner + ". Nothing was deleted.",
    );
  if (pre.status === 404)
    return fail(
      "not_found",
      "GitHub does not show " +
        full +
        " to the delete key. It may already be gone, or the key cannot see it. Nothing was deleted, and it stays in your list until a refresh confirms GitHub's state.",
    );
  if (pre.status === 403)
    return fail(
      "forbidden",
      "GitHub refused to show " + full + " to the delete key. Nothing was deleted.",
    );
  if (pre.status !== 200)
    return fail(
      "rejected",
      "GitHub did not answer clearly (HTTP " + pre.status + "). Nothing was deleted.",
    );
  if (String(pre.body?.full_name || "").toLowerCase() !== full.toLowerCase())
    return fail(
      "invalid",
      "GitHub returned a different repository than " +
        full +
        ". Nothing was deleted — refresh the list.",
    );
  const permissions = pre.body?.permissions as Record<string, unknown> | undefined;
  if (permissions?.admin !== true)
    return fail(
      "forbidden",
      "The GitHub delete key is not an admin of " +
        full +
        ", so GitHub will not let it delete. Nothing was deleted.",
    );
  const scopes = pre.headers.get("x-oauth-scopes");
  if (
    scopes !== null &&
    !scopes
      .split(",")
      .map((s) => s.trim())
      .includes("delete_repo")
  )
    return fail(
      "forbidden",
      "The GitHub delete key for " +
        account.owner +
        " is missing the “delete_repo” permission. Add it on GitHub, then try again. Nothing was deleted.",
    );

  // 2. Delete.
  const del = await send(f, "DELETE", url, headers, 25_000);
  const accepted = del.status === 204;
  if (!accepted && del.status !== 0 && del.status !== 404) {
    if (ghRateLimited(del)) return limited(del);
    if (MOVED.has(del.status))
      return fail("invalid", "GitHub says " + full + " was renamed or moved. Nothing was deleted.");
    if (del.status === 401)
      return fail(
        "unauthorized",
        "GitHub no longer accepts the delete key for " + account.owner + ". Nothing was deleted.",
      );
    if (del.status === 403)
      return fail(
        "forbidden",
        "GitHub refused: the delete key may lack “delete_repo” (classic) or “Administration: write” (fine-grained), or the organization only lets owners delete repositories. Nothing was deleted.",
      );
    return fail(
      "rejected",
      "GitHub did not delete " + full + " (HTTP " + del.status + "). Nothing was deleted.",
    );
  }

  // 3. Confirm: success only when GitHub accepted it AND a fresh read no longer finds it.
  //    A 404 alone is not proof — GitHub also answers 404 when a key lost access.
  const after = await send(f, "GET", url, headers);
  if (accepted && after.status === 404)
    return {
      ok: true,
      code: "deleted",
      message: "Deleted from GitHub and confirmed gone.",
      verifiedAt: new Date().toISOString(),
    };
  return fail(
    "unverified",
    accepted
      ? "GitHub accepted the delete but still shows " +
          full +
          ". Refresh in a minute before trying again."
      : "GitHub's answer was unclear, so " +
          full +
          " may or may not be deleted. It stays in your list until a refresh shows GitHub's state.",
  );
}
