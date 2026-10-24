/**
 * Verify Cloudflare Access identity at the origin, not merely the presence of
 * the CF-Access-Jwt-Assertion header. Used for all infrastructure inventory
 * functions. The served app and its API must also be covered by an Access
 * application policy. Never accept a caller-provided API token.
 */
export class CloudflareAccessError extends Error {
  constructor(public readonly code: "not_configured" | "unauthorized") {
    super(code === "not_configured"
      ? "Cloudflare Access is not configured for this deployment."
      : "Cloudflare Access authentication is required.");
    this.name = "CloudflareAccessError";
  }
}

type AccessClaims = {
  iss?: string;
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  email?: string;
};

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
let keyCache: { host: string; expires: number; keys: Jwk[] } | undefined;

function decodedPart(part: string): Record<string, unknown> {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new CloudflareAccessError("unauthorized");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CloudflareAccessError("unauthorized");
  }
  return parsed as Record<string, unknown>;
}

async function signingKeys(host: string): Promise<Jwk[]> {
  if (keyCache?.host === host && keyCache.expires > Date.now()) return keyCache.keys;
  const res = await fetch("https://" + host + "/cdn-cgi/access/certs", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new CloudflareAccessError("unauthorized");
  const data: unknown = await res.json();
  if (!data || typeof data !== "object" || !("keys" in data)) {
    throw new CloudflareAccessError("unauthorized");
  }
  const keys = (data as { keys?: Jwk[] }).keys;
  if (!Array.isArray(keys) || !keys.length) throw new CloudflareAccessError("unauthorized");
  keyCache = { host, expires: Date.now() + 10 * 60_000, keys };
  return keys;
}

/**
 * Reject requests without a cryptographically valid Cloudflare Access token
 * for this exact Access application. Missing configuration fails closed.
 */
export async function requireCloudflareViewer(
  request: Request | undefined,
  environment: Record<string, string | undefined> = process.env,
): Promise<{ email: string | null }> {
  const hostname = (environment["CLOUDFLARE_ACCESS_TEAM_DOMAIN"] || "").trim().toLowerCase();
  const audience = (environment["CLOUDFLARE_ACCESS_AUD"] || "").trim();
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(hostname) || !audience) {
    throw new CloudflareAccessError("not_configured");
  }
  const token = request?.headers.get("cf-access-jwt-assertion") || "";
  if (!token || token.length > 16_384) throw new CloudflareAccessError("unauthorized");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed token");
    const header = decodedPart(parts[0]);
    const claims = decodedPart(parts[1]) as AccessClaims;
    if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("Algorithm");
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== "https://" + hostname ||
        !Array.isArray(claims.aud) && claims.aud !== audience ||
        Array.isArray(claims.aud) && !claims.aud.includes(audience) ||
        typeof claims.exp !== "number" || claims.exp <= now ||
        typeof claims.nbf === "number" && claims.nbf > now + 30) {
      throw new Error("Invalid claims");
    }
    const key = (await signingKeys(hostname)).find(k =>
      k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256"));
    if (!key) throw new Error("Unknown key");
    const cryptoKey = await crypto.subtle.importKey(
      "jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const encodedSignature = parts[2].replace(/-/g, "+").replace(/_/g, "/");
    const signature = Uint8Array.from(
      atob(encodedSignature.padEnd(Math.ceil(encodedSignature.length / 4) * 4, "=")),
      char => char.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signature,
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    );
    if (!valid) throw new Error("Bad signature");
    const email = typeof claims.email === "string" ? claims.email.toLowerCase() : null;
    const allow = (environment["CLOUDFLARE_ACCESS_ALLOWED_EMAILS"] || "")
      .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allow.length && (!email || !allow.includes(email))) throw new Error("Not allowed");
    return { email };
  } catch {
    throw new CloudflareAccessError("unauthorized");
  }
}
