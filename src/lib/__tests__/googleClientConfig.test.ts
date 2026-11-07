import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectGoogleClientId, validGoogleClientId } from "@/lib/googleClientConfig";

const first = "123456-first.apps.googleusercontent.com";
const second = "123456-second.apps.googleusercontent.com";

describe("Google configuration recovery", () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it("falls back past malformed values instead of blocking an available identity", () => {
    expect(selectGoogleClientId("invalid", ` ${first} `, second)).toBe(first);
    expect(validGoogleClientId("not-a-client-secret")).toBe("");
  });

  it("preserves sign-in when saving the same client ID", async () => {
    const auth = await import("@/lib/googleDirectAuth");
    auth.setGoogleClientId(first);
    localStorage.setItem("mc_google_access_token_v1", "test-token");
    auth.setGoogleClientId(` ${first} `);
    expect(localStorage.getItem("mc_google_access_token_v1")).toBe("test-token");
  });

  it("invalidates old sign-in only when identity changes", async () => {
    const auth = await import("@/lib/googleDirectAuth");
    auth.setGoogleClientId(first);
    localStorage.setItem("mc_google_access_token_v1", "test-token");
    auth.setGoogleClientId(second);
    expect(localStorage.getItem("mc_google_access_token_v1")).toBeNull();
    expect(auth.getGoogleClientId()).toBe(second);
  });

  it("uses a valid saved server identity when a user value is malformed", async () => {
    localStorage.setItem("mc_google_oauth_client_id", "invalid");
    localStorage.setItem("mc_google_oauth_client_id_server", first);
    const auth = await import("@/lib/googleDirectAuth");
    expect(auth.getGoogleClientId()).toBe(first);
  });

  it("rejects invalid changes without losing a working sign-in", async () => {
    const auth = await import("@/lib/googleDirectAuth");
    auth.setGoogleClientId(first);
    localStorage.setItem("mc_google_access_token_v1", "test-token");
    expect(() => auth.setGoogleClientId("wrong")).toThrow();
    expect(auth.getGoogleClientId()).toBe(first);
    expect(localStorage.getItem("mc_google_access_token_v1")).toBe("test-token");
  });
});