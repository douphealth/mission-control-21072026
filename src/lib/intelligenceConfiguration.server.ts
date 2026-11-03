import { audienceCapabilities } from "./audienceProviders.server";
import { CloudflareAccessError, requireCloudflareViewer } from "./cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "./cloudflareRuntimeEnv.server";

type AudienceCapabilities = ReturnType<typeof audienceCapabilities>;
export type AudienceConnection = {
  platform: "github" | "bluesky" | "youtube" | "x" | "instagram" | "facebook" | "threads" | "tiktok" | "linkedin";
  label: string;
  state: "public-api" | "configured" | "missing";
  fallback: string;
  setup: string;
};

/** Static requirements plus capability booleans only; never token values. */
export function audienceConnectionSetup(capabilities: AudienceCapabilities): AudienceConnection[] {
  return [
    { platform: "github", label: "GitHub", state: "public-api", fallback: "Public follower counts from the exact GitHub username. Provider rate limits still apply.", setup: "No server credential required." },
    { platform: "bluesky", label: "Bluesky", state: "public-api", fallback: "Public profile counts from the exact Bluesky handle or DID.", setup: "No server credential required." },
    { platform: "youtube", label: "YouTube", state: capabilities.youtube ? "configured" : "missing", fallback: "No public-page fallback. Subscriber counts remain unavailable until the official API is configured.", setup: "YOUTUBE_API_KEY" },
    { platform: "x", label: "X", state: capabilities.x ? "configured" : "missing", fallback: "A public-page count is accepted only when structured data contains the exact profile identity. Availability is not guaranteed.", setup: "X_BEARER_TOKEN" },
    { platform: "instagram", label: "Instagram", state: capabilities.instagram ? "configured" : "missing", fallback: "Exact-profile structured public data may be readable. Official Business Discovery requires a supported professional account.", setup: "META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID" },
    { platform: "facebook", label: "Facebook Pages", state: capabilities.facebook ? "configured" : "missing", fallback: "No public-page follower parser is implemented. A Page token with appropriate access is required.", setup: "FACEBOOK_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN" },
    { platform: "threads", label: "Threads", state: capabilities.threads ? "configured" : "missing", fallback: "No public-page follower parser is implemented. The token must belong to the exact tracked profile.", setup: "THREADS_ACCESS_TOKEN" },
    { platform: "tiktok", label: "TikTok", state: capabilities.tiktok ? "configured" : "missing", fallback: "Exact-profile structured public data may be readable. The official token must authorize the tracked profile and follower statistics.", setup: "TIKTOK_ACCESS_TOKEN with user.info.profile + user.info.stats scopes" },
    { platform: "linkedin", label: "LinkedIn companies", state: capabilities.linkedin ? "configured" : "missing", fallback: "Company followers require authorized Organization API access. Personal LinkedIn follower counts are not supported.", setup: "LINKEDIN_ACCESS_TOKEN" },
  ];
}

/** Uses the same cryptographic Access verification as the existing infrastructure endpoints. */
export async function readIntelligenceConfiguration(request: Request | undefined) {
  const inspectedAt = new Date().toISOString();
  try {
    const accessEnvironment = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(request, accessEnvironment);
  } catch (error) {
    return {
      status: error instanceof CloudflareAccessError && error.code === "not_configured"
        ? "access-not-configured" as const : "authentication-required" as const,
      error: error instanceof CloudflareAccessError && error.code === "not_configured"
        ? "Configure Cloudflare Access for this deployment before inspecting connection status."
        : "Sign in through this deployment’s Cloudflare Access gate, then check connections again.",
      audience: null,
      connections: [] as AudienceConnection[],
      paidEnabled: null,
      inspectedAt,
    };
  }

  // Read precisely the configuration used by the current provider adapters.
  // Browser vault entries, Google sign-in and ChatGPT connectors are not consumed by them.
  const audience = audienceCapabilities();
  return {
    status: "ok" as const,
    error: null,
    audience,
    connections: audienceConnectionSetup(audience),
    paidEnabled: process.env.MC_ALLOW_PAID_INTELLIGENCE === "true",
    inspectedAt,
  };
}
