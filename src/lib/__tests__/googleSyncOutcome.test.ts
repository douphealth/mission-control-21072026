import { describe, expect, it } from "vitest";
import { googleSyncFailure } from "@/lib/googleSyncOutcome";
import { EMPTY_COUNTS, type GoogleSyncStatus } from "@/lib/googleSyncState";

const idle: GoogleSyncStatus = {
  state: "idle",
  lastSyncAt: "2026-11-03T12:00:00.000Z",
  lastError: null,
  lastCounts: { ...EMPTY_COUNTS },
  heldDeletions: 0,
};

describe("Google sync result verification", () => {
  it("does not claim success when a resolved request recorded a provider failure", () => {
    expect(googleSyncFailure({ ...idle, state: "error", lastError: "Google returned 503" })).toBe("Google returned 503");
    expect(googleSyncFailure({ ...idle, state: "reconnect", lastError: "Sign-in expired" })).toBe("Sign-in expired");
    expect(googleSyncFailure({ ...idle, state: "disconnected" })).toMatch(/not connected/);
    expect(googleSyncFailure({ ...idle, state: "syncing" })).toMatch(/not been confirmed/);
  });

  it("requires held deletions to clear before reporting that their review completed", () => {
    expect(googleSyncFailure({ ...idle, heldDeletions: 4 }, true)).toMatch(/4 deletions are still held/);
    expect(googleSyncFailure({ ...idle, heldDeletions: 1 }, true)).toMatch(/1 deletion is still held/);
    expect(googleSyncFailure(idle, true)).toBeNull();
  });

  it("does not equate pending deletion protection with a failed ordinary sync", () => {
    expect(googleSyncFailure({ ...idle, heldDeletions: 4 })).toBeNull();
    expect(googleSyncFailure(idle)).toBeNull();
  });
});
