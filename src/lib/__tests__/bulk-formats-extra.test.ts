import { describe, it, expect } from "vitest";
import { parseCredentialBatch } from "../credentialBulk";
import { parseFamilyImport } from "../familyBulk";
const cred = (t: string) => parseCredentialBatch(t).items.map(i => [i.label, i.username, i.password, i.url]);
const fam = (t: string) => parseFamilyImport(t).rows.map(r => [r.member, r.label, r.category, r.value]);
describe("credential paste formats", () => {
  it("Greek key:value block", () => expect(cred("Τράπεζα Πειραιώς\nΧρήστης: alex\nΚωδικός: 1234")).toEqual([["Τράπεζα Πειραιώς", "alex", "1234", ""]]));
  it("pipe rows classify by content", () => expect(cred("Gmail | a@b.com | secret")).toEqual([["Gmail", "a@b.com", "secret", ""]]));
  it("url user password lines", () => expect(cred("https://x.com alex pass123")).toEqual([["x.com", "alex", "pass123", "https://x.com"]]));
  it("passwords with colons and commas survive", () => expect(cred("Gmail\nUsername: a@b.com\nPassword: p@ss:1\n\nGitHub\nUser: alex\nPass: x,y;z")).toEqual([["Gmail", "a@b.com", "p@ss:1", ""], ["GitHub", "alex", "x,y;z", ""]]));
});
describe("family paste formats", () => {
  it("person heading with typed lines", () => expect(fam("Αλέξιος:\nΑΜΚΑ: 26097302355\nΑΦΜ: 012345678")).toEqual([["Αλέξιος", "ΑΜΚΑ", "Health", "26097302355"], ["Αλέξιος", "ΑΦΜ", "Identity", "012345678"]]));
  it("wide spreadsheet: one record per column", () => expect(fam("Όνομα\tΑΜΚΑ\tΑΦΜ\nΑλέξιος\t26097302355\t012345678")).toEqual([["Αλέξιος", "ΑΜΚΑ", "Health", "26097302355"], ["Αλέξιος", "ΑΦΜ", "Identity", "012345678"]]));
});
