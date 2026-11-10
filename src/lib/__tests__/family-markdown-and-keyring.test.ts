import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { toFamilyMarkdown } from "../familyMarkdown";
import { decrypt, encrypt, setVaultSessionKey } from "../encryption";
import { isGCalRetryable } from "../googleCalendar";

beforeEach(() => { localStorage.clear(); setVaultSessionKey(null); Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true }); });

describe("family notes as Markdown", () => {
  it("formats headings, key/value lines, bullets and tables without losing words", () => {
    const md = toFamilyMarkdown("ΥΓΕΙΑ\nΑΜΚΑ: 01020304050\n• Γιατρός Παπαδόπουλος\n\nName\tPhone\nMaria\t6900000000");
    expect(md).toContain("## ΥΓΕΙΑ");
    expect(md).toContain("- **ΑΜΚΑ:** 01020304050");
    expect(md).toContain("- Γιατρός Παπαδόπουλος");
    expect(md).toContain("| Maria | 6900000000 |");
  });
  it("leaves existing Markdown untouched", () => {
    expect(toFamilyMarkdown("# Title\n- a")).toBe("# Title\n- a");
  });
});

describe("vault keyring across devices", () => {
  it("decrypts values written with another device's key once both keys are unlocked", async () => {
    const otherDevice = await encrypt("pw-from-laptop", "laptop-key");
    const v3 = await (async () => { setVaultSessionKey("laptop-key"); const c = await encrypt("v3-from-laptop"); setVaultSessionKey(null); return c; })();
    setVaultSessionKey("phone-key", ["laptop-key"]);
    expect(await decrypt(otherDevice)).toBe("pw-from-laptop");
    expect(await decrypt(v3)).toBe("v3-from-laptop");
    setVaultSessionKey("phone-key");
    await expect(decrypt(v3)).rejects.toThrow();
  });
});

describe("Google Calendar rate limits", () => {
  it("retries rate-limit 403/429 but not permission 403", () => {
    expect(isGCalRetryable('Google Calendar 403: {"reason": "rateLimitExceeded"}')).toBe(true);
    expect(isGCalRetryable("Google Calendar 429: busy")).toBe(true);
    expect(isGCalRetryable('Google Calendar 403: {"reason": "forbidden"}')).toBe(false);
  });
});

describe("new device joins the account vault", async () => {
  const { unlockPrivateVault, lockedDeviceVaults, addOtherDevicePassphrase } = await import("../privateVault");
  it("opens passwords saved on device A after unlocking device B with the same passphrase", async () => {
    await unlockPrivateVault("first device passphrase");
    const saved = await encrypt("secret-from-device-a");
    localStorage.clear(); setVaultSessionKey(null); // device B: empty browser, synced settings rows
    await unlockPrivateVault("first device passphrase");
    expect(await decrypt(saved)).toBe("secret-from-device-a");
  });
  it("lets a device with its own older vault open device A's passwords with A's passphrase", async () => {
    const { db } = await import("../db");
    const { lockPrivateVault } = await import("../privateVault");
    await db.settings.clear(); localStorage.clear(); setVaultSessionKey(null);
    await unlockPrivateVault("device A passphrase!!");
    const saved = await encrypt("secret-a");
    const rowsA = await db.settings.toArray(); await db.settings.clear(); // A has not synced yet
    localStorage.clear(); setVaultSessionKey(null);
    await unlockPrivateVault("device B passphrase!!"); // B created its own vault
    await db.settings.bulkPut(rowsA); // A's protected key arrives through sync
    lockPrivateVault();
    await unlockPrivateVault("device B passphrase!!");
    expect(lockedDeviceVaults()).toBe(1);
    await expect(decrypt(saved)).rejects.toThrow();
    await addOtherDevicePassphrase("device A passphrase!!");
    expect(lockedDeviceVaults()).toBe(0);
    expect(await decrypt(saved)).toBe("secret-a");
    lockPrivateVault();
    await unlockPrivateVault("device A passphrase!!"); // B now uses A's passphrase
    expect(await decrypt(saved)).toBe("secret-a");
  });
});
