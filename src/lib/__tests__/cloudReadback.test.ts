import { describe, expect, it } from "vitest";
import { confirmCloudReadback, mismatchedReadbackKeys } from "@/lib/cloudReadback";
import type { RemoteRecords } from "@/lib/cloudSyncProtocol";

const expected: RemoteRecords = {
  "tasks::one": { data: { id: "one", title: "Save" }, deleted: false, updatedAt: "2026-10-26T12:00:00Z", revision: "rev-2" },
};

describe("Google Drive cloud read-back", () => {
  it("does not confirm stale revisions", () => {
    expect(mismatchedReadbackKeys(expected, {
      "tasks::one": { ...expected["tasks::one"], revision: "rev-1" },
    }, ["tasks::one"])).toBe(1);
  });
  it("retries stale media until the uploaded revision is observed", async () => {
    let attempts = 0;
    await confirmCloudReadback(expected, ["tasks::one"], async () => {
      attempts++;
      return attempts < 3 ? {} : expected;
    }, { delaysMs: [0, 1, 2], sleep: async () => {} });
    expect(attempts).toBe(3);
  });
  it("fails closed after persistent mismatches and preserves queued changes", async () => {
    await expect(confirmCloudReadback(expected, ["tasks::one"], async () => ({}), {
      delaysMs: [0, 1], sleep: async () => {},
    })).rejects.toThrow("Changes remain queued locally");
  });
  it("does not retry invalid authorization", async () => {
    let calls = 0;
    await expect(confirmCloudReadback(expected, ["tasks::one"], async () => {
      calls++;
      throw new Error("Google Drive sync failed (403). Local changes remain queued.");
    }, { delaysMs: [0, 1, 2], sleep: async () => {} })).rejects.toThrow("403");
    expect(calls).toBe(1);
  });
});