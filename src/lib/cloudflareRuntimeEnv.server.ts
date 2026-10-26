/**
 * Read ONLY the Cloudflare connector's named bindings, per request.
 * process.env can be empty on older Workers/Pages compatibility settings;
 * the native Cloudflare runtime binding is used as a fallback.
 * Never serialize, log, cache or ship the resolved values to the browser.
 */
const KEYS = [
  "CLOUDFLARE_ACCESS_TEAM_DOMAIN",
  "CLOUDFLARE_ACCESS_AUD",
  "CLOUDFLARE_ACCESS_ALLOWED_EMAILS",
  "CLOUDFLARE_ACCOUNT_IDS",
  "CLOUDFLARE_ACCOUNT_LABELS_JSON",
  "CLOUDFLARE_ACCOUNT_TOKENS_JSON",
  "CLOUDFLARE_API_TOKEN",
] as const;
type CloudflareRuntimeEnv = Record<string, string | undefined>;

export async function readCloudflareRuntimeEnv(): Promise<CloudflareRuntimeEnv> {
  const result: CloudflareRuntimeEnv = {};
  // The module is only imported on the server while processing a request.
  try {
    const moduleName = "cloudflare:workers";
    const native: unknown = await import(/* @vite-ignore */ moduleName);
    const binding = native && typeof native === "object" && "env" in native
      ? (native as { env?: Record<string, unknown> }).env : undefined;
    if (binding && typeof binding === "object") {
      for (const key of KEYS) {
        const value = binding[key];
        if (typeof value === "string") result[key] = value;
      }
    }
  } catch {
    // Local Node tests and non-Cloudflare deployments do not provide this module.
  }
  if (typeof process !== "undefined" && process.env) {
    for (const key of KEYS) {
      if (result[key] === undefined) result[key] = process.env[key];
    }
  }
  return result;
}
