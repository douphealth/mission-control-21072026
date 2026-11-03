import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudflareAccessError, requireCloudflareViewer } from "../cloudflareAccess.server";
import { readIntelligenceConfiguration } from "../intelligenceConfiguration.server";
import { readAudience } from "../audienceProviders.server";
import { collectAudienceMetrics } from "../intelligenceCollectors.server";

vi.mock("../cloudflareAccess.server", async original => ({
  ...await original<typeof import("../cloudflareAccess.server")>(),
  requireCloudflareViewer: vi.fn(),
}));
vi.mock("../cloudflareRuntimeEnv.server", () => ({
  readCloudflareRuntimeEnv: vi.fn(async () => ({
    CLOUDFLARE_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
    CLOUDFLARE_ACCESS_AUD: "test-audience",
  })),
}));

const keys = ["YOUTUBE_API_KEY", "X_BEARER_TOKEN", "META_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID", "FACEBOOK_PAGE_ACCESS_TOKEN", "THREADS_ACCESS_TOKEN", "TIKTOK_ACCESS_TOKEN", "LINKEDIN_ACCESS_TOKEN", "MC_ALLOW_PAID_INTELLIGENCE"];
beforeEach(() => {
  vi.clearAllMocks();
  keys.forEach(key => vi.stubEnv(key, ""));
  vi.mocked(requireCloudflareViewer).mockResolvedValue({ email: "owner@example.com" });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("authenticated intelligence connection status", () => {
  it("does not expose connection configuration through the measurement collector", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "private-youtube-test-value");
    const result = await collectAudienceMetrics([]);
    expect(result).toEqual({ readings: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the existing cryptographic Access authorization before returning capability flags", async () => {
    const request = new Request("https://example.com/status");
    const result = await readIntelligenceConfiguration(request);
    expect(requireCloudflareViewer).toHaveBeenCalledWith(request, {
      CLOUDFLARE_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com", CLOUDFLARE_ACCESS_AUD: "test-audience",
    });
    expect(result.status).toBe("ok");
    expect(result.connections.filter(connection => connection.state === "public-api").map(connection => connection.platform)).toEqual(["github", "bluesky"]);
    expect(result.connections.filter(connection => connection.state === "missing")).toHaveLength(7);
    expect(result.paidEnabled).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("withholds all deployment capability flags when identity is not authorized", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "secret-present-but-not-disclosed");
    vi.mocked(requireCloudflareViewer).mockRejectedValue(new CloudflareAccessError("unauthorized"));
    const result = await readIntelligenceConfiguration(undefined);
    expect(result.status).toBe("authentication-required");
    expect(result.audience).toBeNull();
    expect(result.connections).toEqual([]);
    expect(result.paidEnabled).toBeNull();
    expect(JSON.stringify(result)).not.toContain("secret-present-but-not-disclosed");
  });

  it("distinguishes missing Access configuration from missing provider credentials", async () => {
    vi.mocked(requireCloudflareViewer).mockRejectedValue(new CloudflareAccessError("not_configured"));
    const result = await readIntelligenceConfiguration(undefined);
    expect(result.status).toBe("access-not-configured");
    expect(result.connections).toEqual([]);
  });

  it("returns only configuration status and static setup instructions, never credential values", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "private-youtube-test-value");
    vi.stubEnv("META_ACCESS_TOKEN", "private-meta-test-value");
    vi.stubEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "private-instagram-id");
    const result = await readIntelligenceConfiguration(new Request("https://example.com/status"));
    expect(result.connections.find(connection => connection.platform === "youtube")?.state).toBe("configured");
    expect(result.connections.find(connection => connection.platform === "instagram")?.state).toBe("configured");
    expect(result.connections.find(connection => connection.platform === "facebook")?.state).toBe("configured");
    expect(JSON.stringify(result)).not.toMatch(/private-(?:youtube|meta|instagram)/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("missing integrations return actionable unavailable states", () => {
  it.each([
    ["facebook", "https://facebook.com/page", "FACEBOOK_PAGE_ACCESS_TOKEN"],
    ["threads", "https://threads.net/@profile", "THREADS_ACCESS_TOKEN"],
    ["linkedin", "https://linkedin.com/company/business", "LINKEDIN_ACCESS_TOKEN"],
    ["youtube", "https://youtube.com/@profile", "YOUTUBE_API_KEY"],
  ])("does not fetch unsupported public HTML for %s", async (platform, url, key) => {
    const result = await readAudience(platform, url);
    expect(result.status).toBe("unavailable");
    expect(result.errorCode).toBe("api-not-configured");
    expect(result.followers).toBeNull();
    expect(result.action).toContain(key);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not promise personal LinkedIn follower support when a company token exists", async () => {
    vi.stubEnv("LINKEDIN_ACCESS_TOKEN", "test-value");
    const result = await readAudience("linkedin", "https://linkedin.com/in/person");
    expect(result.errorCode).toBe("unsupported-profile");
    expect(result.followers).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
