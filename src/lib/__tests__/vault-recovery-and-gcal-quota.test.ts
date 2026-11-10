import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { decrypt, encrypt, setVaultSessionKey } from "../encryption";
import { createRecoveryCode, lockPrivateVault, recoverVaultWithCode, recoveryCodeStatus, unlockPrivateVault } from "../privateVault";
import { createGCalEvent, gcalCooldownRemaining, isGCalBusy, startGCalCooldown } from "../googleCalendar";

beforeEach(async () => { const { db } = await import("../db"); await db.settings.clear(); localStorage.clear(); sessionStorage.clear(); setVaultSessionKey(null); Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true }); });

describe("vault recovery code", () => {
  it("opens existing passwords with a new passphrase after the old one is forgotten", async () => {
    await unlockPrivateVault("old passphrase 123");
    const secret = await encrypt("bank-password");
    const code = await createRecoveryCode();
    expect(await recoveryCodeStatus()).toBe("current");
    lockPrivateVault();
    await recoverVaultWithCode(code.toLowerCase(), "brand new passphrase");
    expect(await decrypt(secret)).toBe("bank-password");
    lockPrivateVault();
    await unlockPrivateVault("brand new passphrase");
    expect(await decrypt(secret)).toBe("bank-password");
    lockPrivateVault();
    await expect(unlockPrivateVault("old passphrase 123")).rejects.toThrow();
  }, 60_000);

  it("rejects a wrong recovery code without changing anything", async () => {
    await unlockPrivateVault("old passphrase 123");
    await createRecoveryCode();
    lockPrivateVault();
    await expect(recoverVaultWithCode("AAAAA-AAAAA-AAAAA-AAAAA-AAAAA", "brand new passphrase")).rejects.toThrow(/not correct/);
    await unlockPrivateVault("old passphrase 123");
  }, 60_000);
});

describe("family note person names", () => {
  it("turns a name above its details into a sub-heading", async () => {
    const { toFamilyMarkdown } = await import("../familyMarkdown");
    const md = toFamilyMarkdown("Μαρία\nΑΜΚΑ: 01020304050\nΓιώργος\nΑΜΚΑ: 02030405060");
    expect(md).toContain("### Μαρία\n- **ΑΜΚΑ:** 01020304050");
    expect(md).toContain("### Γιώργος");
  });
});

describe("Google Calendar rate-limit cool-down", () => {
  it("makes no Google calls for 10 minutes after a rate limit", async () => {
    startGCalCooldown();
    expect(gcalCooldownRemaining()).toBeGreaterThan(9 * 60_000);
    const error = await createGCalEvent("primary", { summary: "x", start: { date: "2026-11-10" }, end: { date: "2026-11-11" } }).catch(e => e);
    expect(isGCalBusy(error)).toBe(true);
  });
});
