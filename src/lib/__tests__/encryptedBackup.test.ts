import { describe, expect, it } from "vitest";
import { decryptBackup, encryptBackup, previewBackup } from "@/lib/encryptedBackup";
import { shouldWrite } from "@/lib/deviceStatus";

describe("encrypted backup", () => {
  it("round-trips with the right passphrase and rejects a wrong one", async () => {
    const enc = await encryptBackup('{"tasks":[{"id":"a"}]}', "correct horse");
    expect(enc).not.toContain('"tasks"');
    expect((await decryptBackup(enc, "correct horse")).json).toBe('{"tasks":[{"id":"a"}]}');
    await expect(decryptBackup(enc, "wrong pass!")).rejects.toThrow(/Wrong passphrase/);
  });
  it("preview flags rows without ids and compares counts", () => {
    const p = previewBackup(JSON.stringify({ tasks: [{ id: "a" }, { id: "b" }], notes: [{ title: "x" }] }), { tasks: 5, notes: 1 });
    expect(p.rows.find(r => r.table === "tasks")).toEqual({ table: "tasks", inBackup: 2, current: 5 });
    expect(p.problems).toEqual(["notes row 1 has no valid id"]);
  });
  it("device status only rewrites sync time every 10 minutes", () => {
    const now = Date.parse("2026-01-01T00:10:00Z");
    const prev = { label: "x", seenAt: "", lastSyncAt: "2026-01-01T00:05:00Z" };
    expect(shouldWrite(prev, { lastSyncAt: "z" }, now)).toBe(false);
    expect(shouldWrite(prev, { lastSyncAt: "z" }, now + 5 * 60_000)).toBe(true);
  });
});
