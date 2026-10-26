import { describe, expect, it } from "vitest";
import { cloudflareTruthState, cloudflareSetupRequired } from "@/lib/cloudflareControlState";

describe("Cloudflare connection truth", () => {
  it("distinguishes missing Access and missing tokens from API outages", () => {
    expect(cloudflareTruthState("access_not_configured")).toBe("not_connected");
    expect(cloudflareTruthState("login_required")).toBe("unavailable");
    expect(cloudflareTruthState("not_connected")).toBe("not_connected");
    expect(cloudflareTruthState("partial")).toBe("error");
    expect(cloudflareTruthState("live")).toBe("live");
  });
  it("always reveals setup-dependent states without exposing credentials", () => {
    expect(cloudflareSetupRequired("access_not_configured")).toBe(true);
    expect(cloudflareSetupRequired("login_required")).toBe(true);
    expect(cloudflareSetupRequired("not_connected")).toBe(true);
    expect(cloudflareSetupRequired("live")).toBe(false);
  });
});