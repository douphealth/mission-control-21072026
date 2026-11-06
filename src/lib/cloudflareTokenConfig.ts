/** Merges per-account Cloudflare tokens; OVERRIDES replaces whole account entries (newer keys win). */
export function cloudflareAccountTokens(env: Record<string, string | undefined>): Record<string, unknown> {
  const parse = (v?: string) => {
    try { const o = JSON.parse(v || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; }
    catch { return {}; }
  };
  return { ...parse(env["CLOUDFLARE_ACCOUNT_TOKENS_JSON"]), ...parse(env["CLOUDFLARE_ACCOUNT_TOKEN_OVERRIDES_JSON"]) };
}
