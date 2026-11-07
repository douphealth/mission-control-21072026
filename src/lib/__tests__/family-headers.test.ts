import { describe, expect, it } from "vitest";
import { parseFamilyImport } from "../familyBulk";

describe("family import header matching", () => {
  it("accepts common spreadsheet headers and keeps extra columns as notes", () => {
    const r = parseFamilyImport("Full Name,Document Type,ID Number,Expiry\nMaria,Passport,00123,2030\nNikos,Bank,GR0012,");
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ member: "Maria", label: "Passport", value: "00123" });
    expect(r.rows[0].notes.toLowerCase()).toContain("expiry: 2030");
    expect(r.rows[1].category).toBe("Banking");
  });
  it("keeps rows without a member as Unassigned instead of rejecting them", () => {
    const r = parseFamilyImport("Record,Value\nAMKA,123");
    expect(r.errors).toEqual([]);
    expect(r.rows[0].member).toBe("Unassigned");
  });
});
