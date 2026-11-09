import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import Dexie from "dexie";
import { renderToStaticMarkup } from "react-dom/server";
import SafeMarkdownPreview from "@/components/SafeMarkdownPreview";
import { db } from "../db";
import { decrypt, encrypt, setVaultSessionKey } from "../encryption";
import {
  familyRecordCiphertext, lockPrivateVault, readFamilyRecords,
  saveFamilyRecord, unlockPrivateVault, vaultConfigurationExists,
  type FamilyRecord,
} from "../privateVault";

const passphrase = "synthetic family passphrase";
const fixture = (id = "fixture-1"): FamilyRecord => ({
  id, member: "Alex", category: "Identity", label: "Document",
  value: "001234", notes: "# Header\n- **Important**",
});

beforeEach(async () => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  localStorage.clear();
  sessionStorage.clear();
  setVaultSessionKey(null);
  await Promise.all([
    db.familyRecords.clear(),
    db.vaultMeta.clear(),
    db.familyMigration.clear(),
  ]);
  const legacy = new Dexie("MissionControlPrivateFamily");
  legacy.version(1).stores({ records: "id" });
  await legacy.table("records").clear();
  legacy.close();
});

describe("family vault secure synchronization", () => {
  it("stores only ciphertext in the synced family table and key metadata without a plaintext key", async () => {
    await unlockPrivateVault(passphrase);
    await saveFamilyRecord(fixture(), null);
    const rows = await db.familyRecords.toArray();
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("001234");
    expect(JSON.stringify(rows)).not.toContain("Important");
    expect(await readFamilyRecords()).toEqual([fixture()]);
    const metadata = await db.vaultMeta.get("primary");
    expect(metadata?.envelope).toBeTruthy();
    expect(metadata?.envelope).not.toContain(passphrase);
    expect(metadata?.envelope).not.toContain("001234");
  });

  it("opens synchronized encrypted records on a new device using the original master passphrase", async () => {
    await unlockPrivateVault(passphrase);
    await saveFamilyRecord(fixture(), null);
    lockPrivateVault();
    localStorage.removeItem("mc-private-vault-envelope-v1");
    expect(await vaultConfigurationExists()).toBe(true);
    await unlockPrivateVault(passphrase);
    expect(await readFamilyRecords()).toEqual([fixture()]);
  });

  it("refuses conflicting master key envelopes and does not overwrite any records", async () => {
    await unlockPrivateVault(passphrase);
    await saveFamilyRecord(fixture(), null);
    const previous = await db.familyRecords.toArray();
    await db.vaultMeta.put({ id: "primary", envelope: '{"version":1,"salt":"invalid","iv":"invalid","data":"invalid"}' });
    lockPrivateVault();
    await expect(unlockPrivateVault(passphrase)).rejects.toThrow("different vault keys");
    expect(await db.familyRecords.toArray()).toEqual(previous);
  });

  it("prevents concurrent edits from replacing newer record data", async () => {
    await unlockPrivateVault(passphrase);
    await saveFamilyRecord(fixture(), null);
    const stale = await familyRecordCiphertext("fixture-1");
    expect(stale).toBeTruthy();
    const updated = { ...fixture(), notes: "new" };
    await saveFamilyRecord(updated, stale);
    await expect(saveFamilyRecord({ ...fixture(), notes: "stale" }, stale)).rejects.toThrow("edited elsewhere");
    expect(await readFamilyRecords()).toEqual([updated]);
  });

  it("migrates legacy encrypted records once without deleting their recovery copy", async () => {
    await unlockPrivateVault(passphrase);
    const record = fixture("legacy-id");
    const payload = await encrypt(JSON.stringify(record));
    const legacy = new Dexie("MissionControlPrivateFamily");
    legacy.version(1).stores({ records: "id" });
    await legacy.table("records").put({ id: record.id, payload });
    legacy.close();
    lockPrivateVault();
    await unlockPrivateVault(passphrase);
    expect(await readFamilyRecords()).toContainEqual(record);
    await saveFamilyRecord({ ...record, notes: "edited after migration" }, await familyRecordCiphertext(record.id));
    lockPrivateVault();
    await unlockPrivateVault(passphrase);
    expect(await db.familyRecords.count()).toBe(1);
    expect((await readFamilyRecords())[0].notes).toBe("edited after migration");
    const recovery = new Dexie("MissionControlPrivateFamily");
    recovery.version(1).stores({ records: "id" });
    expect(await decrypt((await recovery.table("records").get(record.id)).payload)).toBe(JSON.stringify(record));
    recovery.close();
  });

  it("renders Markdown without running HTML or unsafe links", () => {
    const html = renderToStaticMarkup(<SafeMarkdownPreview value={'# Title\n**Bold** <script>alert(1)</script>\n[jump](javascript:alert(1))\n[docs](https://example.com)'} />);
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.com/"');
  });
});
