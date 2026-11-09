import "fake-indexeddb/auto";
import { db } from "../db";
import { beforeEach, describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { unlockPrivateVault, lockPrivateVault, VAULT_IDLE_MS } from "../privateVault";
import { encrypt, decrypt, setVaultSessionKey } from "../encryption";
import { previewBulkIntake } from "../bulkIntake";
beforeEach(async () => { localStorage.clear(); sessionStorage.clear(); setVaultSessionKey(null); Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true }); await db.vaultMeta.clear(); await db.familyRecords.clear(); await db.familyMigration.clear(); });
describe("private vault protections", () => {
  it("imports all 1,500 requested entries with exact password values", () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ label: `Account ${i}`, username: `u${i}@example.test`, password: `  synthetic ${i}  ` }));
    const result = previewBulkIntake("credentials", JSON.stringify(rows));
    expect(result.fatal).toBe(false); expect(result.issues).toEqual([]); expect(result.rows).toHaveLength(1500);
    expect(result.rows[1499].password).toBe("  synthetic 1499  ");
  });
  it("protects the existing key without persisting it in plaintext and rejects a wrong passphrase", async () => {
    const legacy = await encrypt("synthetic legacy record", "synthetic-existing-key");
    localStorage.setItem("mc-encryption-key", "synthetic-existing-key");
    await unlockPrivateVault("synthetic master passphrase");
    expect(localStorage.getItem("mc-encryption-key")).toBeNull();
    expect(await decrypt(legacy)).toBe("synthetic legacy record");
    lockPrivateVault();
    await expect(unlockPrivateVault("wrong passphrase")).rejects.toThrow("Incorrect passphrase");
    await expect(decrypt(legacy)).rejects.toThrow("Unlock your private vault");
    await unlockPrivateVault("synthetic master passphrase");
    expect(await decrypt(legacy)).toBe("synthetic legacy record");
  });
  it("uses distinct authenticated ciphertext per save and cannot decrypt while locked", async () => {
    await unlockPrivateVault("synthetic master passphrase");
    const a = await encrypt("synthetic private data"), b = await encrypt("synthetic private data");
    expect(a).not.toBe(b); expect(await decrypt(a)).toBe("synthetic private data");
    lockPrivateVault(); await expect(decrypt(a)).rejects.toThrow();
  });
  it("sets a five-minute inactivity lock", () => { expect(VAULT_IDLE_MS).toBe(300000); });
});