import { beforeEach, describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { decrypt, encrypt, setVaultSessionKey } from "../encryption";
import { prepareCredentialImport } from "../credentialImport";
import { planDeduplicatedImport } from "../dedup";
import type { CredentialVault } from "../db";

beforeEach(() => { localStorage.clear(); setVaultSessionKey(null); Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true }); });

const base = { service: "", category: "Other", url: "", notes: "", tags: [], createdAt: "2026-01-01" };

describe("re-importing fills passwords that can't be opened on this device", () => {
  it("replaces the unreadable password on the same entry instead of adding a duplicate", async () => {
    setVaultSessionKey("laptop-key");
    const unreadable = await encrypt("old-pass");
    setVaultSessionKey("phone-key");
    const stored = [{ ...base, id: "c1", label: "Serpapi", username: "me@x.com", password: unreadable, apiKey: "" }] as unknown as CredentialVault[];
    const incoming = await prepareCredentialImport([{ ...base, label: "Serpapi", username: "me@x.com", password: "new-pass" }], stored);
    const plan = planDeduplicatedImport("credentials", stored, incoming, () => "new-id");
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].id).toBe("c1");
    expect(plan.updates[0]).not.toHaveProperty("__healsSecretOf");
    expect(await decrypt(plan.updates[0].password)).toBe("new-pass");
  });

  it("still keeps a readable different password as its own entry", async () => {
    setVaultSessionKey("phone-key");
    const stored = [{ ...base, id: "c1", label: "Serpapi", username: "me@x.com", password: await encrypt("pass-a"), apiKey: "" }] as unknown as CredentialVault[];
    const incoming = await prepareCredentialImport([{ ...base, label: "Serpapi", username: "me@x.com", password: "pass-b" }], stored);
    const plan = planDeduplicatedImport("credentials", stored, incoming, () => "new-id");
    expect(plan.creates).toHaveLength(1);
    expect(plan.updates).toHaveLength(0);
  });
});
