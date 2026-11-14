/**
 * Authorization for permanent deletes, separate from ordinary viewing.
 *
 * Viewing needs the owner passcode or Cloudflare Access. Deleting additionally
 * needs a VERIFIED admin identity, checked here on the server, whose email is
 * in MC_ADMIN_EMAILS:
 *   - a Cloudflare Access login (JWT verified on its own — the viewer
 *     passcode never stands in for it), or
 *   - a Google sign-in, verified directly with Google: unexpired, issued to
 *     this app's own OAuth client ID, email verified.
 * MC_ADMIN_PASSCODE, when set (16+ chars, different from the viewer
 * passcode), is an extra second factor on top of that identity. On its own it
 * never authorizes anything. No allowlist → deleting is off (fails closed).
 * Cross-site requests are always refused (CSRF).
 */
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { assertSameOrigin } from "@/lib/cloudflareActions.server";
import {
  ADMIN_GOOGLE_TOKEN_HEADER,
  configuredGoogleClientIds,
  type GoogleIdentityFailure,
  verifyGoogleIdentity,
} from "@/lib/googleAdminIdentity.server";
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
export type AdminIdentity = { via: "access" | "google"; email: string };
export type GateResult =
  | { ok: true; identity: AdminIdentity; secondFactor: boolean }
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

const NOTHING = " Nothing was deleted.";
const GOOGLE_REFUSAL: Record<GoogleIdentityFailure, string> = {
  missing: "Sign in with Google as an admin to delete.",
  no_client_id:
    "Google sign-in for deletes is not set up on the server (the app's Google client ID is missing).",
  invalid: "Google did not accept that sign-in. Sign in with Google again.",
  expired: "Your Google sign-in has expired. Sign in with Google again.",
  wrong_audience: "That Google sign-in was made for a different app, so it cannot be used here.",
  email_unverified: "That Google account's email address is not verified by Google.",
  unreachable: "Could not check your Google sign-in with Google right now. Try again in a moment.",
};

export type AdminSetup =
  | { ok: true; emails: string[]; adminPass: string | null; googleReady: boolean }
  | { ok: false; message: string };

/** What the server has configured for admin deletes (no secrets leave this function). */
export function adminSetup(env: Env): AdminSetup {
  const emails = adminEmails(env);
  if (!emails.length)
    return {
      ok: false,
      message:
        "Deleting is switched off: the server has no admin email allowlist (MC_ADMIN_EMAILS). Add your admin email there, then sign in with Google or Cloudflare Access as that account." +
        NOTHING,
    };
  const viewerPass = (env["MC_OWNER_PASSCODE"] || "").trim();
  const adminPass = (env["MC_ADMIN_PASSCODE"] || "").trim();
  if (adminPass && (adminPass.length < 16 || adminPass === viewerPass))
    return {
      ok: false,
      message:
        "Deleting is switched off: the admin passcode on the server must be at least 16 characters and different from the normal sign-in passcode." +
        NOTHING,
    };
  return {
    ok: true,
    emails,
    adminPass: adminPass || null,
    googleReady: configuredGoogleClientIds(env).length > 0,
  };
}

type IdentityCheck =
  { ok: true; identity: AdminIdentity } | { ok: false; message: string; email?: string };

/** Resolve the verified admin identity for this request (Access first, then Google). */
export async function verifiedAdminIdentity(
  request: Request,
  env: Env,
  emails: string[],
  googleFetch?: FetchLike,
): Promise<IdentityCheck> {
  if (request.headers.get("cf-access-jwt-assertion")) {
    try {
      // Verify the Access login on its own: the viewer passcode must not stand in for it.
      const { email } = await requireCloudflareViewer(request, { ...env, MC_OWNER_PASSCODE: "" });
      if (email && emails.includes(email)) return { ok: true, identity: { via: "access", email } };
    } catch {
      /* fall through to Google */
    }
  }
  const token = request.headers.get(ADMIN_GOOGLE_TOKEN_HEADER);
  const google = await verifyGoogleIdentity(token, env, googleFetch);
  if (!google.ok) return { ok: false, message: GOOGLE_REFUSAL[google.reason] };
  if (!emails.includes(google.email))
    return {
      ok: false,
      email: google.email,
      message: "Signed in with Google as " + google.email + ", which is not an admin for deletes.",
    };
  return { ok: true, identity: { via: "google", email: google.email } };
}

export async function authorizeDestructive(
  request: Request | undefined,
  env: Env,
  adminPasscode?: string,
  googleFetch?: FetchLike,
): Promise<GateResult> {
  if (!request)
    return { ok: false, code: "unauthorized", message: "Sign in again, then retry." + NOTHING };
  try {
    assertSameOrigin(request);
  } catch {
    return {
      ok: false,
      code: "invalid",
      message: "Deletes can only be started from this app itself." + NOTHING,
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
          ? "Sign-in is not set up on the server, so deleting is off." + NOTHING
          : "Sign in again, then retry." + NOTHING,
    };
  }
  // 2. Admin setup must exist (allowlist), otherwise deleting is off.
  const setup = adminSetup(env);
  if (!setup.ok) return { ok: false, code: "not_configured", message: setup.message };
  // 3. Verified admin identity. A passcode can never replace this step.
  const who = await verifiedAdminIdentity(request, env, setup.emails, googleFetch);
  if (!who.ok) return { ok: false, code: "admin_required", message: who.message + NOTHING };
  // 4. Optional second factor on top of the identity.
  if (setup.adminPass && !(await sameSecret((adminPasscode || "").trim(), setup.adminPass)))
    return {
      ok: false,
      code: "admin_required",
      message:
        (adminPasscode
          ? "That admin passcode is not correct."
          : "Deleting also needs the admin passcode (separate from your normal sign-in).") +
        NOTHING,
    };
  return { ok: true, identity: who.identity, secondFactor: Boolean(setup.adminPass) };
}

/** Read-only pre-check for the confirmation window. Never deletes, never returns secrets. */
export type DeleteAdminStatus = {
  configured: boolean;
  /** Plain-language explanation when something is missing or refused. */
  message: string | null;
  secondFactorRequired: boolean;
  googleReady: boolean;
  identity: AdminIdentity | null;
  /** Verified Google email that is NOT in the allowlist (shown so the owner can switch account). */
  otherEmail: string | null;
};

export async function deleteAdminStatus(
  request: Request | undefined,
  env: Env,
  googleFetch?: FetchLike,
): Promise<DeleteAdminStatus> {
  const empty = {
    configured: false,
    secondFactorRequired: false,
    googleReady: false,
    identity: null,
    otherEmail: null,
  };
  if (!request) return { ...empty, message: "Sign in again, then retry." };
  try {
    assertSameOrigin(request);
    await requireCloudflareViewer(request, env);
  } catch {
    return { ...empty, message: "Sign in again, then retry." };
  }
  const setup = adminSetup(env);
  if (!setup.ok) return { ...empty, message: setup.message };
  const base = {
    configured: true,
    secondFactorRequired: Boolean(setup.adminPass),
    googleReady: setup.googleReady,
  };
  const who = await verifiedAdminIdentity(request, env, setup.emails, googleFetch);
  return who.ok
    ? { ...base, identity: who.identity, message: null, otherEmail: null }
    : { ...base, identity: null, message: who.message, otherEmail: who.email ?? null };
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
  googleFetch?: FetchLike,
): Promise<DeleteOutcome> {
  const gate = await authorizeDestructive(request, env, data.adminPasscode, googleFetch);
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
  googleFetch?: FetchLike,
): Promise<CleanupOutcome> {
  const gate = await authorizeDestructive(request, env, data.adminPasscode, googleFetch);
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
  googleFetch?: FetchLike,
): Promise<DeleteOutcome> {
  const gate = await authorizeDestructive(request, env, data.adminPasscode, googleFetch);
  if (!gate.ok) return gate;
  if (data.confirm !== data.owner + "/" + data.repo) return mismatch;
  return deleteGitHubRepository({ owner: data.owner, repo: data.repo }, env, f);
}
