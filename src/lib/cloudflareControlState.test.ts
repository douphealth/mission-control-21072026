import { describe, expect, it } from "vitest";
import { cloudflareTruthState } from "@/lib/cloudflareControlState";

describe("secure Cloudflare dashboard connection states", () => {
  it("does not label an Access configuration gap as a Cloudflare API failure", () => {
    expect(cloudflareTruthState("access_not_configured")).toBe("not_connected");
    expect(cloudflareTruthState("login_required")).toBe("unavailable");
    expect(cloudflareTruthState("not_connected")).toBe("not_connected");
  });
  it("never reports partial/failed API inventory as live", () => {
    expect(cloudflareTruthState("partial")).toBe("error");
    expect(cloudflareTruthState("error")).toBe("error");
    expect(cloudflareTruthState("live")).toBe("live");
  });
});
