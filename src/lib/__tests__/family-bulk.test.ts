// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { parseFamilyImport } from "../familyBulk";
import { addFamilyRecords, editFamilyRecords, deleteFamilyRecords, familyDb, readFamilyRecords, unlockPrivateVault, lockPrivateVault } from "../privateVault";
import { setVaultSessionKey } from "../encryption";
import { db } from "../db";

beforeEach(async () => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  localStorage.clear(); setVaultSessionKey(null);
  await familyDb.records.clear();
  await db.vaultMeta.clear();
  await db.familyMigration.clear();
});
describe("family vault bulk management", () => {
  it("preserves actual private strings and leading zeroes from CSV", () => {
    const parsed = parseFamilyImport('member,category,label,value,notes\nAlex,Banking,Account," 001234 ","Private, note"');
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].value).toBe(" 001234 ");
    expect(parsed.rows[0].notes).toBe("Private, note");
  });
  it("supports 1,500 family records and rejects non-text numbers rather than losing zeroes", () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ member: "Alex", label: `Record ${i}`, value: `00${i}` }));
    expect(parseFamilyImport(JSON.stringify(rows)).rows).toHaveLength(1500);
    expect(parseFamilyImport('[{"member":"Alex","label":"Account","value":123}]').errors).toHaveLength(1);
  });
  it("rejects oversized imports before storing any records", () => {
    const rows = Array.from({ length: 5001 }, () => ({ member: "Alex", label: "ID", value: "00123" }));
    const parsed = parseFamilyImport(JSON.stringify(rows));
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors).toHaveLength(1);
  });
  it("bulk adds encrypted new records without overwriting imported IDs", async () => {
    await unlockPrivateVault("synthetic master passphrase");
    const rows = parseFamilyImport('[{"member":"Alex","label":"Account","value":"00123"}]').rows;
    await addFamilyRecords(rows); await addFamilyRecords(rows);
    const saved = await readFamilyRecords();
    expect(saved).toHaveLength(2); expect(saved[0].id).not.toBe(saved[1].id);
    expect(saved.every(r => r.value === "00123")).toBe(true);
    expect(JSON.stringify(await familyDb.records.toArray())).not.toContain("00123");
  });
  it("edits only selected records while preserving private values and names", async () => {
    await unlockPrivateVault("synthetic master passphrase");
    await addFamilyRecords(parseFamilyImport('[{"member":"Alex","label":"Bank","value":" 00123 "},{"member":"Jo","label":"ID","value":"00456"}]').rows);
    const before = await readFamilyRecords();
    const chosen = before.find(r => r.member === "Alex");
    if (!chosen) throw new Error("Missing fixture");
    await editFamilyRecords([chosen.id], { category: "Banking", notes: "updated" });
    const after = await readFamilyRecords();
    expect(after.find(r => r.id === chosen.id)).toEqual({ ...chosen, category: "Banking", notes: "updated" });
    expect(after.find(r => r.member === "Jo")).toEqual(before.find(r => r.member === "Jo"));
  });
  it("rejects invalid bulk edits without partial changes", async () => {
    await unlockPrivateVault("synthetic master passphrase");
    await addFamilyRecords(parseFamilyImport('[{"member":"Alex","label":"ID","value":"00123"}]').rows);
    const before = await familyDb.records.toArray();
    await expect(editFamilyRecords([before[0].id], { member: "" })).rejects.toThrow();
    expect(await familyDb.records.toArray()).toEqual(before);
  });
  it("bulk deletes only the selected records and refuses locked operations", async () => {
    await unlockPrivateVault("synthetic master passphrase");
    await addFamilyRecords(parseFamilyImport('[{"member":"Alex","label":"ID","value":"00123"},{"member":"Jo","label":"ID","value":"00456"}]').rows);
    const before = await readFamilyRecords();
    await deleteFamilyRecords([before[0].id]);
    expect(await readFamilyRecords()).toEqual([before[1]]);
    lockPrivateVault();
    await expect(deleteFamilyRecords([before[1].id])).rejects.toThrow();
    expect(await familyDb.records.count()).toBe(1);
  });
});