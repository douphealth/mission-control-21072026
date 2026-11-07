import { parseFamilyImport } from "@/lib/familyBulk";
import { it, expect } from "vitest";
it("tolerant csv", () => {
  const r = parseFamilyImport("member;label;category;value\nAnna;SSN;Identity;0123\nBob;Bank;Banking;GR12;extra");
  expect(r.errors).toEqual([]); expect(r.rows.length).toBe(2); expect(r.rows[0].value).toBe("0123");
});
