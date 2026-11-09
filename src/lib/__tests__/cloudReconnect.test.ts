import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { cloudNeedsReconnect } from "@/lib/cloudSync";

describe("cloud reconnect detection", () => {
  beforeEach(() => localStorage.clear());

  it("asks to load latest when a previously connected device has no live Google session", () => {
    localStorage.setItem("mc-cloud-user-email", "owner@example.com");
    expect(cloudNeedsReconnect()).toBe(true);
  });

  it("does not ask on a device that was never connected", () => {
    expect(cloudNeedsReconnect()).toBe(false);
  });

  it("does not ask while the Google session is still valid", () => {
    localStorage.setItem("mc-cloud-user-email", "owner@example.com");
    localStorage.setItem("mc_google_access_token_v1", JSON.stringify({
      access_token: "t", expires_at: Date.now() + 30 * 60_000,
      scope: "https://www.googleapis.com/auth/drive.appdata",
    }));
    expect(cloudNeedsReconnect()).toBe(false);
  });
});
