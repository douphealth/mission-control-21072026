import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  clearPrivateSnapshots,
  readSnapshot,
  snapshotAge,
  writeSnapshot,
} from "@/lib/snapshotCache";

describe("instant-open snapshot cache", () => {
  it("returns the saved copy with its original age so a background refresh still runs", async () => {
    await writeSnapshot("github-public-owners", [{ owner: "douphealth" }], 1_000);
    const saved = await readSnapshot<{ owner: string }[]>("github-public-owners");
    expect(saved?.at).toBe(1_000);
    expect(saved?.value[0].owner).toBe("douphealth");
  });

  it("Lock wipes owner-only inventory but keeps public listings", async () => {
    await writeSnapshot("private:cloudflare-control", { rows: 261 });
    await writeSnapshot("github-public-owners", [{ owner: "Papalexios" }]);
    await clearPrivateSnapshots();
    expect(await readSnapshot("private:cloudflare-control")).toBeNull();
    expect(await readSnapshot("github-public-owners")).not.toBeNull();
  });

  it("describes snapshot age in plain words", () => {
    const now = Date.parse("2026-11-13T12:00:00Z");
    expect(snapshotAge(now - 30_000, now)).toBe("just now");
    expect(snapshotAge(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(snapshotAge("2026-11-13T09:00:00Z", now)).toBe("3 h ago");
  });
});
