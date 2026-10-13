import { describe, expect, it } from "vitest";
import { parseCredentialBatch } from "@/lib/credentialBulk";

describe("credential intake preserves rows for transactional reconciliation", () => {
  it("retains complementary metadata instead of silently discarding it", () => {
    const row = { label: "Test server", service: "Hosting", username: "alex", password: "synthetic-only" };
    const result = parseCredentialBatch(JSON.stringify([{ ...row, notes: "" }, { ...row, notes: "Production" }]));
    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(2);
    expect(result.items[1].notes).toBe("Production");
  });
  it("keeps distinct case-sensitive paths and accounts", () => {
    const row = { label: "Case test", service: "Hosting", password: "synthetic-only" };
    const result = parseCredentialBatch(JSON.stringify([
      { ...row, url: "https://example.com/A", username: "Alex" },
      { ...row, url: "https://example.com/a", username: "Alex" },
      { ...row, url: "https://example.com/A", username: "alex" },
    ]));
    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(3);
  });
  it("retains conflicting secrets for explicit rejection by the writer", () => {
    const result = parseCredentialBatch(JSON.stringify([
      { label: "Conflict", password: "synthetic-one" },
      { label: "Conflict", password: "synthetic-two" },
    ]));
    expect(result.items).toHaveLength(2);
  });
  it("continues combining truly identical rows", () => {
    const row = { label: "Identical", password: "synthetic-only", notes: "Keep" };
    expect(parseCredentialBatch(JSON.stringify([row, row])).items).toHaveLength(1);
  });
});
