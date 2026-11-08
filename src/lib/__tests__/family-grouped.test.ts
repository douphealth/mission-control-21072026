import { describe, it, expect } from "vitest";
import { parseFamilyImport } from "../familyBulk";
describe("grouped family list", () => {
  it("splits headings and person lines into records", () => {
    const { rows, errors } = parseFamilyImport("Ημερομηνίες Γέννησης:\nΑλεξάνδρα Π: 22/12/2009\n\nΑΜΚΑ:\nΑλέξιος Π: 02051101331\nΠΡΟΣΩΠΙΚΟΣ ΑΡΙΘΜΟΣ:\nΑλέξης: 0ΕΡ184897688");
    expect(errors).toEqual([]);
    expect(rows.map(r => [r.member, r.label, r.category, r.value])).toEqual([
      ["Αλεξάνδρα Π", "Ημερομηνίες Γέννησης", "Identity", "22/12/2009"],
      ["Αλέξιος Π", "ΑΜΚΑ", "Health", "02051101331"],
      ["Αλέξης", "ΠΡΟΣΩΠΙΚΟΣ ΑΡΙΘΜΟΣ", "Identity", "0ΕΡ184897688"],
    ]);
  });
});
