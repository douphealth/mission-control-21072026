/**
 * Permanent deletes for Cloudflare Pages projects, Workers and GitHub
 * repositories. Callers must verify the owner AND same-origin first.
 * Provider error text never reaches the browser; only safe codes and our own
 * explanations do.
 */
import {
  configuredAccounts,
  deployTokenFor,
  pagesTokenFor,
  workersTokenFor,
} from "@/lib/cloudflareInventory.server";
import { githubTokenFor } from "@/lib/githubPrivateInventory.server";

export type DeleteOutcome =
  | { ok: true; alreadyGone: boolean; message: string }
  | { ok: false; code: "invalid" | "forbidden" | "blocked" | "rejected"; message: string };

export const CF_NAME = /^[a-zA-Z0-9_.-]{1,160}$/;
export const GH_NAME = /^[A-Za-z0-9_.-]{1,100}$/;
const CF_API = "https://api.cloudflare.com/client/v4";
/** Cloudflare refuses to delete Pages projects with too many deployments. */
const TOO_MANY_DEPLOYMENTS = 8000076;
/** Old deployments removed per request; keeps one call well inside subrequest limits. */
const DEPLOYMENT_SWEEP = 40;

type CfReply = { status: number; codes: number[]; tooMany: boolean; body: Record<string, unknown> | null };

async function cf(method: "GET" | "DELETE", path: string, token: string): Promise<CfReply> {
  const res = await fetch(CF_API + path, {
    method,
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  const errors = Array.isArray(body?.errors) ? (body!.errors as Array<Record<string, unknown>>) : [];
  const codes = errors.map((e) => Number(e.code)).filter(Number.isFinite);
  const tooMany =
    codes.includes(TOO_MANY_DEPLOYMENTS) ||
    errors.some((e) => /too many deployments/i.test(String(e.message || "")));
  return { status: res.ok && body?.success !== false ? res.status : res.ok ? 400 : res.status, codes, tooMany, body };
}

function cfFailure(reply: CfReply, kind: "pages" | "worker"): DeleteOutcome {
  const permission = kind === "pages" ? "Cloudflare Pages: Edit" : "Workers Scripts: Edit";
  if (reply.status === 401 || reply.status === 403)
    return {
      ok: false,
      code: "forbidden",
      message:
        "Cloudflare refused: the key for this account cannot delete. Give it the “" +
        permission +
        "” permission in Cloudflare (My Profile → API Tokens), then try again.",
    };
  return {
    ok: false,
    code: "rejected",
    message:
      "Cloudflare did not delete it (HTTP " +
      reply.status +
      (reply.codes[0] ? " / code " + reply.codes[0] : "") +
      "). " +
      (kind === "worker"
        ? "If other Workers use this one (Durable Objects or service bindings), remove those links first."
        : "Check the project in the Cloudflare dashboard."),
  };
}

/** Removes old deployments (never the live one) so Cloudflare allows deleting the project. */
async function sweepDeployments(project: string, token: string): Promise<number> {
  const list = await cf("GET", project + "/deployments?per_page=" + DEPLOYMENT_SWEEP + "&sort_by=created_on&sort_order=asc", token);
  if (list.status !== 200) return 0;
  const rows = Array.isArray(list.body?.result) ? (list.body!.result as Array<Record<string, unknown>>) : [];
  const ids = rows
    .filter((d) => !(d.aliases && Array.isArray(d.aliases) && d.aliases.length))
    .map((d) => String(d.id || ""))
    .filter((id) => /^[a-f0-9][a-f0-9-]{7,63}$/i.test(id));
  let removed = 0;
  for (let i = 0; i < ids.length; i += 8) {
    const batch = await Promise.all(
      ids.slice(i, i + 8).map((id) => cf("DELETE", project + "/deployments/" + id + "?force=true", token)),
    );
    removed += batch.filter((r) => r.status === 200).length;
  }
  return removed;
}

export async function deleteCloudflareResource(
  input: { accountId: string; kind: "pages" | "worker"; name: string },
  env: Record<string, string | undefined> = process.env,
): Promise<DeleteOutcome> {
  if (!configuredAccounts(env).includes(input.accountId) || !CF_NAME.test(input.name))
    return { ok: false, code: "invalid", message: "Unknown Cloudflare project for this app." };
  const token =
    input.kind === "pages"
      ? deployTokenFor(input.accountId, env) || pagesTokenFor(input.accountId, env)
      : workersTokenFor(input.accountId, env);
  if (!token)
    return { ok: false, code: "forbidden", message: "No Cloudflare key is set up for this account." };
  const path =
    "/accounts/" +
    input.accountId +
    (input.kind === "pages" ? "/pages/projects/" : "/workers/scripts/") +
    encodeURIComponent(input.name);
  let reply = await cf("DELETE", path, token);
  if (input.kind === "pages" && reply.tooMany) {
    const removed = await sweepDeployments(path, token);
    reply = await cf("DELETE", path, token);
    if (reply.tooMany)
      return {
        ok: false,
        code: "blocked",
        message:
          "Cloudflare only deletes projects with fewer deployments. Removed " +
          removed +
          " old deployments — press Delete again to continue.",
      };
  }
  if (reply.status === 404) return { ok: true, alreadyGone: true, message: "It was already gone from Cloudflare." };
  if (reply.status >= 200 && reply.status < 300)
    return { ok: true, alreadyGone: false, message: "Deleted from Cloudflare." };
  return cfFailure(reply, input.kind);
}

export async function deleteGitHubRepository(
  input: { owner: string; repo: string },
  env: Record<string, string | undefined> = process.env,
): Promise<DeleteOutcome> {
  const account = githubTokenFor(input.owner, env);
  if (!account || !GH_NAME.test(input.repo))
    return { ok: false, code: "invalid", message: "This repository is not in one of your connected GitHub accounts." };
  const url = "https://api.github.com/repos/" + account.owner + "/" + encodeURIComponent(input.repo);
  const headers = {
    Authorization: "Bearer " + account.token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mission-control",
  };
  const res = await fetch(url, { method: "DELETE", headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (res.status === 204) return { ok: true, alreadyGone: false, message: "Deleted from GitHub." };
  if (res.status === 404) {
    // GitHub also answers 404 when the key lacks access; confirm it is really gone.
    const check = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (check.status === 404) return { ok: true, alreadyGone: true, message: "It was already gone from GitHub." };
  }
  if (res.status === 403 || res.status === 404 || res.status === 401)
    return {
      ok: false,
      code: "forbidden",
      message:
        "GitHub refused: the key for " +
        account.owner +
        " is not allowed to delete repositories. On GitHub open Settings → Developer settings → Personal access tokens, tick “delete_repo” on that key, then try again.",
    };
  return { ok: false, code: "rejected", message: "GitHub did not delete it (HTTP " + res.status + "). Try again in a minute." };
}
