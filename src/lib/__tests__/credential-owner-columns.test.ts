import { describe, it, expect } from "vitest";
import { previewBulkIntake } from "@/lib/bulkIntake";
const H = "Application\tNature\tLinks\tUsername\tPassword\tPayPal (Payment)\tPayPal (Date Payment done)\tPayPal (Payment valid until)\tPayPal (Payment renewal)\tComment\tComment 2\tComment 3";
describe("owner credential column layout", () => {
  it("keeps every column and allows blanks", () => {
    const r = previewBulkIntake("credentials", `${H}\nCanva\tDesign\thttps://canva.com\tme@x.com\tAb!c12/x\t€120\t01/02/2025\t01/02/2026\tYearly\tc1\tc2\tc3\nOnlyName\t\t\t\t\t\t\t\t\t\t\t`);
    const [a, b] = r.rows as any[];
    expect(r.rows).toHaveLength(2);
    expect(a.label).toBe("Canva"); expect(a.service).toBe("Design"); expect(a.url).toBe("https://canva.com");
    expect(a.username).toBe("me@x.com"); expect(a.password).toBe("Ab!c12/x");
    for (const t of ["PayPal (Payment): €120", "PayPal (Payment valid until): 01/02/2026", "PayPal (Payment renewal): Yearly", "c1", "c2", "c3"]) expect(a.notes).toContain(t);
    expect(b.label).toBe("OnlyName"); expect(b.password).toBe("");
  });
  it("applies the same layout when the header row is not pasted", () => {
    const rows = [
      "Seobility\tSEO Checker\thttps://www.seobility.net/en/\tpapalexios@gmail.com\tSe0b!lity#22\t\t\t\t\t\t\t",
      "SEOdity\tOptimize your SEO strategy for Google with a data-driven platform\thttps://seodity.com\t\tpass word 1\t$49\t4/8/2022\t4/8/2023\tYearly\tlifetime deal\t\t",
      "Serpapi\tSerpapi\thttps://serpapi.com\tme@x.com\tKx9vQ2mZpL7wR4tY8nB3cF6hJ1dS5aE0\t\t1/1/2026",
    ].join("\n");
    const r = previewBulkIntake("credentials", rows);
    const [a, b, c] = r.rows as any[];
    expect(r.rows).toHaveLength(3);
    expect(a.label).toBe("Seobility"); expect(a.service).toBe("SEO Checker"); expect(a.url).toBe("https://www.seobility.net/en/");
    expect(a.username).toBe("papalexios@gmail.com"); expect(a.password).toBe("Se0b!lity#22"); expect(a.apiKey).toBe("");
    expect(b.username).toBe(""); expect(b.password).toBe("pass word 1");
    expect(b.notes).toContain("PayPal (Payment): $49"); expect(b.notes).toContain("PayPal (Date Payment done): 4/8/2022"); expect(b.notes).toContain("lifetime deal");
    expect(c.password).toBe("Kx9vQ2mZpL7wR4tY8nB3cF6hJ1dS5aE0"); expect(c.apiKey).toBe("");
    expect(c.notes).toContain("PayPal (Date Payment done): 1/1/2026"); expect(c.notes).not.toContain("Column");
  });
});
