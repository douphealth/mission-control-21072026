/**
 * Server-side verification of a Google sign-in for admin-only actions.
 *
 * The browser sends its current Google access token (or ID token) in the
 * dedicated `x-mc-admin-google-token` header. We ask Google itself who the
 * token belongs to (tokeninfo, plain fetch, workerd-safe) and only accept it
 * when Google says it is unexpired, issued to one of THIS app's configured
 * OAuth client IDs, and carries a verified email address. The token is never
 * logged, stored or returned.
 */
import { validGoogleClientId } from "@/lib/googleClientConfig";
import { ADMIN_GOOGLE_TOKEN_HEADER } from "@/lib/providerDeleteNames";

export { ADMIN_GOOGLE_TOKEN_HEADER };

type Env = Record<string, string | undefined>;
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const TOKENINFO = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export type GoogleIdentityFailure =
  | "missing"
  | "no_client_id"
  | "invalid"
  | "expired"
  | "wrong_audience"
  | "email_unverified"
  | "unreachable";

export type GoogleIdentityResult =
  { ok: true; email: string } | { ok: false; reason: GoogleIdentityFailure };

/** Every valid Google OAuth client ID configured on the server (public identifiers). */
export function configuredGoogleClientIds(env: Env): string[] {
  const ids = [env["GOOGLE_OAUTH_CLIENT_ID"], env["VITE_GOOGLE_CLIENT_ID"], env["GOOGLE_CLIENT_ID"]]
    .map(validGoogleClientId)
    .filter(Boolean);
  return [...new Set(ids)];
}

const asText = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/**
 * Ask Google to verify the token. Any doubt (network error, unexpected reply,
 * missing claim) is a refusal: this check fails closed.
 */
export async function verifyGoogleIdentity(
  token: string | null | undefined,
  env: Env,
  f: FetchLike = (input, init) => fetch(input, init),
): Promise<GoogleIdentityResult> {
  const clean = (token || "").trim();
  if (!clean) return { ok: false, reason: "missing" };
  const clientIds = configuredGoogleClientIds(env);
  if (!clientIds.length) return { ok: false, reason: "no_client_id" };
  if (clean.length > 4096 || !/^[A-Za-z0-9._~+/=-]+$/.test(clean))
    return { ok: false, reason: "invalid" };

  const isIdToken = clean.split(".").length === 3 && clean.startsWith("eyJ");
  let claims: Record<string, unknown>;
  try {
    // POST keeps the token out of URLs and any intermediary logs.
    const res = await f(TOKENINFO, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ [isIdToken ? "id_token" : "access_token"]: clean }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 400 || res.status === 401) return { ok: false, reason: "invalid" };
    if (!res.ok) return { ok: false, reason: "unreachable" };
    const body: unknown = await res.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      return { ok: false, reason: "unreachable" };
    claims = body as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  if (isIdToken && !GOOGLE_ISSUERS.has(asText(claims["iss"])))
    return { ok: false, reason: "invalid" };
  const aud = asText(claims["aud"]);
  const azp = asText(claims["azp"]);
  if (!clientIds.includes(aud) || (azp && !clientIds.includes(azp))) {
    return { ok: false, reason: "wrong_audience" };
  }
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(asText(claims["exp"]));
  const expiresIn =
    claims["expires_in"] === undefined ? null : Number(asText(claims["expires_in"]));
  if (!Number.isFinite(exp) || exp <= now || (expiresIn !== null && !(expiresIn > 0))) {
    return { ok: false, reason: "expired" };
  }
  const email = asText(claims["email"]).trim().toLowerCase();
  const verified = claims["email_verified"] === true || claims["email_verified"] === "true";
  if (!email.includes("@")) return { ok: false, reason: "invalid" };
  if (!verified) return { ok: false, reason: "email_unverified" };
  return { ok: true, email };
}
