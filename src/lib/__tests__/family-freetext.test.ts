import { describe, it, expect } from "vitest";
import { parseFamilyImport } from "../familyBulk";
const view = (t: string, existing = []) => parseFamilyImport(t, existing).rows.map(r => [r.member, r.label, r.value]);

describe("family free-text import", () => {
  it("reads dash separators under a type heading without a colon", () => {
    expect(view("ΑΜΚΑ\nΑλέξιος Παπαϊωάννου - 26097302355\nΑναστασία Κυρίτση – 17057502266")).toEqual([
      ["Αλέξιος Παπαϊωάννου", "ΑΜΚΑ", "26097302355"], ["Αναστασία Κυρίτση", "ΑΜΚΑ", "17057502266"]]);
  });
  it("strips bullets and bold markers", () => {
    expect(view("**ΑΦΜ:**\n- Αλέξιος Παπαϊωάννου: 123456789\n• Αναστασία Κυρίτση: 987654321")).toEqual([
      ["Αλέξιος Παπαϊωάννου", "ΑΦΜ", "123456789"], ["Αναστασία Κυρίτση", "ΑΦΜ", "987654321"]]);
  });
  it("reads lines with no separator at all", () => {
    expect(view("ΑΜΚΑ\nΑλέξιος Παπαϊωάννου 26097302355")).toEqual([["Αλέξιος Παπαϊωάννου", "ΑΜΚΑ", "26097302355"]]);
  });
  it("uses a person heading for following typed lines and keeps URLs whole", () => {
    expect(view("Αλέξιος Παπαϊωάννου\nIBAN: GR16 0110 1250\nSite login: https://example.com\nΑναστασία Κυρίτση\nΑΜΚΑ: 17057502266")).toEqual([
      ["Αλέξιος Παπαϊωάννου", "IBAN", "GR16 0110 1250"], ["Αλέξιος Παπαϊωάννου", "Site login", "https://example.com"], ["Αναστασία Κυρίτση", "ΑΜΚΑ", "17057502266"]]);
  });
  it("splits inline lists sharing one name", () => {
    expect(view("Αλέξιος ΑΜΚΑ 26097302355, ΑΦΜ 123456789")).toEqual([["Αλέξιος", "ΑΜΚΑ", "26097302355"], ["Αλέξιος", "ΑΦΜ", "123456789"]]);
  });
  it("expands a first name to the one matching full name", () => {
    expect(view("ΑΜΚΑ:\nΑλεξάνδρα Παπαϊωάννου: 22120900927\nΠΡΟΣΩΠΙΚΟΣ ΑΡΙΘΜΟΣ:\nΑλεξάνδρα: 0ΕΡ184897688")[1][0]).toBe("Αλεξάνδρα Παπαϊωάννου");
  });
  it("skips records already saved and repeated in the paste", () => {
    const saved = [{ id: "x", member: "Αλέξιος Παπαϊωάννου", label: "ΑΜΚΑ", category: "Health", value: "26097302355", notes: "" }];
    const r = parseFamilyImport("ΑΜΚΑ:\nΑλέξιος Παπαϊωάννου: 26097302355\nΑναστασία Κυρίτση: 1\nΑναστασία Κυρίτση: 1", saved as never);
    expect(r.rows.length).toBe(1);
    expect(r.duplicates).toBe(2);
  });
});
