import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyRemoteDeleted,
  filterDeleted,
  getDeletedState,
  markDeleted,
  mergeDeletedStates,
  reconcileDeleted,
  resetDeletedForTests,
} from "@/lib/deletedResources";

const MIN = 60_000;
function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}
beforeEach(() => {
  vi.stubGlobal("localStorage", fakeStorage());
  resetDeletedForTests();
});
afterEach(() => vi.unstubAllGlobals());

const rows = [{ key: "douphealth/old-app" }, { key: "douphealth/keep" }];

describe("deleted marks", () => {
  it("hides a deleted item until the provider shows it again 15+ minutes later", () => {
    const now = Date.now();
    markDeleted("douphealth/old-app", now);
    expect(filterDeleted(rows)).toEqual([{ key: "douphealth/keep" }]);
    reconcileDeleted(["douphealth/old-app"], now + MIN); // provider echo right after delete
    expect(filterDeleted(rows)).toHaveLength(1);
    reconcileDeleted(["douphealth/old-app"], now + 16 * MIN); // recreated later
    expect(filterDeleted(rows)).toHaveLength(2);
  });

  it("still reads marks saved by the previous version", () => {
    localStorage.setItem(
      "mc.deleted-resources.v1",
      JSON.stringify({ "douphealth/old-app": Date.now() }),
    );
    resetDeletedForTests();
    expect(filterDeleted(rows)).toEqual([{ key: "douphealth/keep" }]);
  });

  it("carries a delete to another device through the synced copy", () => {
    const now = Date.now();
    const deviceA = { marks: { "douphealth/old-app": now }, cleared: {} };
    applyRemoteDeleted(deviceA, now); // device B receives A's copy
    expect(filterDeleted(rows)).toEqual([{ key: "douphealth/keep" }]);
  });

  it("an older copy from another device never brings back a cleared mark", () => {
    const now = Date.now();
    markDeleted("douphealth/old-app", now);
    const stale = { marks: { ...getDeletedState().marks }, cleared: {} };
    reconcileDeleted(["douphealth/old-app"], now + 20 * MIN); // recreated: cleared here
    applyRemoteDeleted(stale, now + 21 * MIN);
    expect(filterDeleted(rows)).toHaveLength(2);
  });

  it("merging keeps the newest time per key, in any order", () => {
    const now = Date.now();
    const a = { marks: { x: now, y: now - 5 * MIN }, cleared: { y: now - MIN } };
    const b = { marks: { y: now - 2 * MIN, z: now }, cleared: {} };
    expect(mergeDeletedStates(a, b, now)).toEqual(mergeDeletedStates(b, a, now));
    expect(mergeDeletedStates(a, b, now).marks).toEqual({ x: now, y: now - 2 * MIN, z: now });
  });
});
