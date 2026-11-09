import { describe, it, expect } from "vitest";
import { parseFamilyImport } from "@/lib/familyBulk";
describe("family import accepts any text", () => {
  it("reads broken JSON as plain text instead of refusing", () => {
    const r = parseFamilyImport("{ Maria AMKA: 12345678901");
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.some(x => x.value.includes("12345678901"))).toBe(true);
  });
});
