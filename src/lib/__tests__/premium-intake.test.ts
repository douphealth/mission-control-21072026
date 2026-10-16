import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { previewBulkIntake } from "@/lib/bulkIntake";
import { organizePromptBatch } from "@/lib/promptOrganization";
import { appendChecklistItems, parseChecklistItems } from "@/lib/taskChecklist";

describe("Google Sheets prompt pairs", () => {
  const pairs = Array.from({ length: 24 }, (_, i) => [i % 2 ? `Python debugging ${i}` : `SEO audit ${i}`, `You are a specialist for case ${i}.\n\n# Context\nKeep commas, quotes "yes" and tabs\tinside cells.\n1. Inspect.\n2. Explain.`]);
  it("reads headerless title/body rows and preserves every character of multiline prompts", () => {
    const result = previewBulkIntake("prompts", Papa.unparse(pairs, { delimiter: "\t", newline: "\n" }));
    expect(result.issues).toEqual([]); expect(result.rows).toHaveLength(24); expect(result.table?.hasHeader).toBe(false);
    pairs.forEach(([title, content], i) => expect(result.rows[i]).toMatchObject({ title, content, category: i % 2 ? "Development" : "SEO & content" }));
  });
  it("recognizes heading/actual prompt columns and skips identical repeated headers", () => {
    const result = previewBulkIntake("prompts", Papa.unparse([["Heading", "Actual Prompt"], ...pairs.slice(0, 12), ["Heading", "Actual Prompt"], ...pairs.slice(12)], { delimiter: "\t" }));
    expect(result.table?.hasHeader).toBe(true); expect(result.rows).toHaveLength(24); expect(result.issues).toEqual([]); expect(result.rows[23].content).toBe(pairs[23][1]);
  });
  it("recognizes Greek headings and explicit custom categories", () => {
    const raw = Papa.unparse([["\u03a4\u03af\u03c4\u03bb\u03bf\u03c2", "\u039f\u03b4\u03b7\u03b3\u03af\u03b5\u03c2", "\u039a\u03b1\u03c4\u03b7\u03b3\u03bf\u03c1\u03af\u03b1"], ["My prompt", "Keep instructions.\nDo not combine cells.", "My own category"]], { delimiter: "\t" });
    const result = previewBulkIntake("prompts", raw); expect(result.rows).toHaveLength(1); expect(result.rows[0].category).toBe("My own category");
  });
  it("supports explicitly importing each cell independently", () => { expect(previewBulkIntake("prompts", "One instruction\tTwo instructions\nThird instruction\tFourth instruction", { layout: "prompt-cells" }).rows).toHaveLength(4); });
  it("creates a shared subject category only when the batch supplies a coherent repeated subject", () => {
    expect(organizePromptBatch([{ title: "Astrophotography planning", content: "Plan deep sky imaging." }, { title: "Astrophotography processing", content: "Stack exposures carefully." }]).map(row => row.category)).toEqual(["Astrophotography", "Astrophotography"]);
    expect(organizePromptBatch([{ title: "Mystery instructions", content: "Inspect and summarize." }])[0].category).toBe("Uncategorized");
  });
});
describe("wide heterogeneous credential spreadsheets", () => {
  it("preserves 103 accounts with keys moving between columns ten and eleven", () => {
    const rows = Array.from({ length: 103 }, (_, i) => [`Fixture ${i}`, "Service", "https://example.com", `fixture${i}@example.com`, "fixture-password", "", "6/2/2026", "", "", i % 3 ? `synthetic_key_${i}_0123456789abcdefgh` : "Service API Key", i % 3 ? "" : `synthetic_key_${i}_0123456789abcdefgh`]);
    const result = previewBulkIntake("credentials", Papa.unparse(rows, { delimiter: "\t" })); expect(result.issues).toEqual([]); expect(result.rows).toHaveLength(103);
    result.rows.forEach((row, i) => { expect(row.label).toBe(`Fixture ${i}`); expect(row.apiKey).toBe(`synthetic_key_${i}_0123456789abcdefgh`); expect(String(row.notes)).not.toContain("synthetic_key_"); });
  });
  it("separates multiple mapped keys into stable labelled entries without overwriting or exposing secrets", () => {
    const raw = Papa.unparse([["Label", "Email", "Password", "Provider API Key", "Client Secret"], ["Two keys", "fixture@example.com", "fixture", "  first-key-value  ", "second-key-value"]], { delimiter: "\t" });
    const result = previewBulkIntake("credentials", raw); expect(result.issues).toEqual([]); expect(result.rows).toHaveLength(2); expect(result.needsSecretReview).toBe(true); expect(result.rows[0].apiKey).toBe("  first-key-value  "); expect(result.rows[1].apiKey).toBe("second-key-value"); expect(result.rows[1].label).toContain("column 5"); expect(result.sourceLines).toEqual([2, 2]); expect(JSON.stringify(result.rows.map(row => row.notes))).not.toContain("key-value");
  });
});
it("imports 500 affiliates with exact attribution and separate audit fields", () => {
  const rows = Array.from({ length: 500 }, (_, i) => [`Partner ${i}`, "Web Hosting", "Affiliate", `https://example.com/${i}?sig=X%2BY&ref=Case${i}#Anchor`, "USE NOW", "200", "not-a-real-password"]);
  const raw = Papa.unparse([["Program", "Category", "Type", "Affiliate/referral link", "Strategy status", "HTTP", "Password"], ...rows], { delimiter: "\t" });
  const result = previewBulkIntake("links", raw); expect(result.rows).toHaveLength(500); expect(result.issues).toEqual([]); result.rows.forEach((row, i) => expect(row).toMatchObject({ url: rows[i][3], strategyStatus: "USE NOW", httpStatus: "200", vertical: "Hosting & infrastructure" })); expect(JSON.stringify(result.rows)).not.toContain("not-a-real-password");
});
it("keeps decimal quantities, removes checklist markers and appends without changing existing IDs or ticks", () => {
  expect(parseChecklistItems("- [ ] Milk 1,5 L\r\n2. Eggs\n[x] Bread; Bread, Fruit")).toEqual(["Milk 1,5 L", "Eggs", "Bread", "Fruit"]);
  const old = [{ id: "saved", title: "Milk", done: true, dueDate: "2026-10-16" }]; const result = appendChecklistItems(old, "milk\nEggs\nEGGS"); expect(result).toHaveLength(2); expect(result[0]).toEqual(old[0]); expect(result[1].id).toBeTruthy();
});
