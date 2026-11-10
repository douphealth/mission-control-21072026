// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import "fake-indexeddb/auto";
import { familyDb, readFamilyMarkdownNotes, saveFamilyMarkdownNote, deleteFamilyMarkdownNote, familyMarkdownChanged, exportPrivateVault, decodePrivateBackup, unlockPrivateVault, lockPrivateVault } from "../privateVault";
import { setVaultSessionKey } from "../encryption";
beforeEach(async()=>{
  Object.defineProperty(globalThis,"crypto",{ value:webcrypto, configurable:true });
  await familyDb.documents.clear();
  localStorage.clear();
  setVaultSessionKey(null);
});
describe("Family Markdown encrypted notebook",()=>{
  it("keeps separate documents with identical Markdown independent", async () => {
    await unlockPrivateVault("example secure passphrase 123");
    const time = new Date().toISOString();
    const first = {id: crypto.randomUUID(), title: "Shared title", member: "Family", markdown: "# Same text", createdAt: time, updatedAt: time};
    const second = {...first, id: crypto.randomUUID()};
    expect(familyMarkdownChanged(second, first)).toBe(true);
    expect(familyMarkdownChanged(first, first)).toBe(false);
    await saveFamilyMarkdownNote(first, null);
    await saveFamilyMarkdownNote(second, null);
    expect((await readFamilyMarkdownNotes()).map(note => note.id).sort()).toEqual([first.id, second.id].sort());
  });

  it("saves arbitrary Markdown and keeps the IndexedDB payload encrypted",async()=>{
    await unlockPrivateVault("example secure passphrase 123");
    const time=new Date().toISOString();
    const doc={id:crypto.randomUUID(),title:"Family reference",member:"Household",markdown:"# Hello\n- **Important**\n| Key | Value |\n|---|---|\n| A | 00123 |",createdAt:time,updatedAt:time};
    await saveFamilyMarkdownNote(doc,null);
    const raw=await familyDb.documents.get(doc.id);
    expect(raw?.payload).not.toContain("00123");
    expect((await readFamilyMarkdownNotes())[0]).toEqual(doc);
    lockPrivateVault();
    await expect(readFamilyMarkdownNotes()).rejects.toThrow();
  });
  it("refuses stale writes and restores Markdown documents in an encrypted backup",async()=>{
    await unlockPrivateVault("example secure passphrase 123");
    const time=new Date().toISOString();
    const doc={id:crypto.randomUUID(),title:"Shared notes",member:"",markdown:"Notes",createdAt:time,updatedAt:time};
    await saveFamilyMarkdownNote(doc,null);
    await expect(saveFamilyMarkdownNote({...doc,markdown:"Wrong"},"2000-01-01T00:00:00.000Z")).rejects.toThrow("another tab");
    const backup=await exportPrivateVault([]);
    const decoded=await decodePrivateBackup(backup,"example secure passphrase 123");
    expect(decoded.data.familyMarkdown).toHaveLength(1);
    await deleteFamilyMarkdownNote(doc.id,time);
    expect(await readFamilyMarkdownNotes()).toHaveLength(0);
  });
});
