/**
 * Authorization for permanent deletes, separate from ordinary viewing.
 *
 * Viewing needs the owner passcode or Cloudflare Access. Deleting additionally
 * needs an ADMIN identity, checked here on the server:
 *   - a verified Cloudflare Access login whose email is in MC_ADMIN_EMAILS, or
 *   - the separate MC_ADMIN_PASSCODE (16+ chars, must differ from the viewer
 *     passcode), typed for each browser tab and never stored.
 * With neither configured, deleting is switched off (fails closed).
 * Cross-site requests are always refused (CSRF).
 */
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { assertSameOrigin } from "@/lib/cloudflareActions.server";
import {
  type DeleteFailureCode,
  cleanupPagesDeployments,
  deleteCloudflareResource,
  deleteGitHubRepository,
  type CleanupOutcome,
  type DeleteOutcome,
  type FetchLike,
} from "@/lib/providerDelete.server";

type Env = Record<string, string | undefined>;
export type GateResult =
  | { ok: true; via: "access" | "admin_passcode" }
  | { ok: false; code: DeleteFailureCode; message: string };

async function sameSecret(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const p = new Uint8Array(x);
  const q = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < p.length; i++) diff |= (p[i] ?? 0) ^ (q[i] ?? 0);
  return diff === 0;
}

export function adminEmails(env: Env): string[] {
  return (env["MC_ADMIN_EMAILS"] || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export async function authorizeDestructive(
  request: Request | undefined,
  env: Env,
  adminPasscode?: string,
): Promise<GateResult> {
  if (!request)
    return {
      ok: false,
      code: "unauthorized",
      message: "Sign in again, then retry. Nothing was deleted.",
    };
  try {
    assertSameOrigin(request);
  } catch {
    return {
      ok: false,
      code: "invalid",
      message: "Deletes can only be started from this app itself. Nothing was deleted.",
    };
  }
  // 1. Ordinary viewer sign-in (owner passcode or Cloudflare Access).
  try {
    await requireCloudflareViewer(request, env);
  } catch (error) {
    return {
      ok: false,
      code: "unauthorized",
      message:
        error instanceof CloudflareAccessError && error.code === "not_configured"
          ? "Sign-in is not set up on the server, so deleting is off. Nothing was deleted."
          : "Sign in again, then retry. Nothing was deleted.",
    };
  }
  // 2. Admin identity, independent of the viewer sign-in.
  const emails = adminEmails(env);
  const viewerPass = (env["MC_OWNER_PASSCODE"] || "").trim();
  const adminPass = (env["MC_ADMIN_PASSCODE"] || "").trim();
  const adminPassUsable = adminPass.length >= 16 && adminPass !== viewerPass;
  if (!emails.length && !adminPassUsable)
    return {
      ok: false,
      code: "not_configured",
      message:
        "Deleting is switched off until an admin is set up on the server (an admin email or a separate admin passcode). Nothing was deleted.",
    };
  if (emails.length && request.headers.get("cf-access-jwt-assertion")) {
    try {
      // Verify the Access login on its own: the viewer passcode must not stand in for it.
      const { email } = await requireCloudflareViewer(request, { ...env, MC_OWNER_PASSCODE: "" });
      if (email && emails.includes(email)) return { ok: true, via: "access" };
    } catch {
      /* fall through to the admin passcode */
    }
  }
  if (adminPassUsable && (await sameSecret((adminPasscode || "").trim(), adminPass)))
    return { ok: true, via: "admin_passcode" };
  return {
    ok: false,
    code: "admin_required",
    message: adminPasscode
      ? "That admin passcode is not correct. Nothing was deleted."
      : "Deleting needs the admin passcode (separate from your normal sign-in). Nothing was deleted.",
  };
}

// ---------------------------------------------------------------- gated entry points

const mismatch = {
  ok: false as const,
  code: "invalid" as const,
  message: "The typed name does not match exactly. Nothing was deleted.",
};

export async function gatedCloudflareDelete(
  request: Request | undefined,
  env: Env,
  data: {
    accountId: string;
    kind: "pages" | "worker";
    name: string;
    confirm: string;
    adminPasscode?: string;
  },
  f?: FetchLike,
): Promise<DeleteOutcome> {
  const gate = await authorizeDestructive(request, env, data.adminPasscode);
  if (!gate.ok) return gate;
  if (data.confirm !== data.name) return mismatch;
  return deleteCloudflareResource(
    { accountId: data.accountId, kind: data.kind, name: data.name },
    env,
    f,
  );
}

export async function gatedPagesCleanup(
  request: Request | undefined,
  env: Env,
  data: {
    accountId: string;
    name: string;
    confirm: string;
    acknowledge: boolean;
    adminPasscode?: string;
  },
  f?: FetchLike,
): Promise<CleanupOutcome> {
  const gate = await authorizeDestructive(request, env, data.adminPasscode);
  if (!gate.ok) return gate;
  if (data.confirm !== data.name) return mismatch;
  if (data.acknowledge !== true)
    return {
      ok: false,
      code: "invalid",
      message: "Tick the box to confirm removing old deployments. Nothing was removed.",
    };
  return cleanupPagesDeployments({ accountId: data.accountId, name: data.name }, env, f);
}

export async function gatedGitHubDelete(
  request: Request | undefined,
  env: Env,
  data: { owner: string; repo: string; confirm: string; adminPasscode?: string },
  f?: FetchLike,
): Promise<DeleteOutcome> {
  const gate = await authorizeDestructive(request, env, data.adminPasscode);
  if (!gate.ok) return gate;
  if (data.confirm !== data.owner + "/" + data.repo) return mismatch;
  return deleteGitHubRepository({ owner: data.owner, repo: data.repo }, env, f);
}
