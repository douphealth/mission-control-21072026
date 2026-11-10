import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { decryptOrNull, encrypt, setVaultSessionKey } from "../encryption";

Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

describe("keys that sync in after this tab was unlocked", () => {
  it("opens device A's passwords on an already-unlocked device B without re-entering the passphrase", async () => {
    const { db } = await import("../db");
    const { unlockPrivateVault, refreshDeviceKeyrings, pendingDeviceKeyrings } = await import("../privateVault");
    await db.settings.clear(); localStorage.clear(); sessionStorage.clear(); setVaultSessionKey(null);
    // Device A creates the vault and saves a password; its key row has not synced to B yet.
    await unlockPrivateVault("shared master passphrase");
    const saved = await encrypt("pw-from-device-a");
    const rowsA = await db.settings.toArray();
    await db.settings.clear(); localStorage.clear(); sessionStorage.clear(); setVaultSessionKey(null);
    // Device B: new vault, same passphrase, stays unlocked.
    await unlockPrivateVault("shared master passphrase");
    expect(await decryptOrNull(saved)).toBeNull();
    await db.settings.bulkPut(rowsA); // A's key arrives through sync later
    expect(await pendingDeviceKeyrings()).toBe(1);
    expect(await refreshDeviceKeyrings()).toBe(1);
    expect(await decryptOrNull(saved)).toBe("pw-from-device-a");
    expect(await pendingDeviceKeyrings()).toBe(0);
  });
});
