import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { previewBulkIntake } from "@/lib/bulkIntake";
import { parseCredentialBatch, looksLikeCredentialPairs } from "@/lib/credentialBulk";

describe("October Mission Control bulk import regressions", () => {
  it("joins adjacent Google Sheets title/body rows into distinct prompts", () => {
    const cells = [
      ["Heading", "Actual Prompt"],
      ["SEO recovery", ""],
      ["", "You are a search engineer. Inspect the canonical and sitemap signals. Keep numbered steps intact."],
      ["WordPress deployment", ""],
      ["", "You are a TypeScript engineer. Verify build, rollback and production health."],
    ];
    const result = previewBulkIntake("prompts", Papa.unparse(cells, { delimiter: "\t", newline: "\n" }));
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map(row => row.title)).toEqual(["SEO recovery", "WordPress deployment"]);
    expect(result.rows[0].content).toBe(cells[2][1]);
    expect(result.rows[1].content).toBe(cells[4][1]);
    expect(result.splitMethod).toBe("paired spreadsheet rows");
  });

  it("does not merge independent complete heading/body rows", () => {
    const input = Papa.unparse([["Heading", "Actual Prompt"], ["First", "Act as a reviewer."], ["Second", "Act as a debugger."]], { delimiter: "\t" });
    const result = previewBulkIntake("prompts", input);
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
  });

  it("splits contiguous named credential blocks with no blank separators", () => {
    const input = ["Label: Hosting alpha", "Service: WordPress", "Username: account-a", "Password: demo-one",
      "Label: Payments beta", "Service: Stripe", "Username: account-b", "Password: demo-two"].join("\n");
    const result = parseCredentialBatch(input);
    expect(result.errors).toEqual([]);
    expect(result.items.map(row => row.label)).toEqual(["Hosting alpha", "Payments beta"]);
    expect(result.items.map(row => row.password)).toEqual(["demo-one", "demo-two"]);
  });

  it("detects spreadsheet field/value credential pairs without merging separate accounts", () => {
    const input = Papa.unparse([["Label", "Hosting alpha"], ["Service", "WordPress"], ["Username", "account-a"],
      ["Password", "demo-one"], ["Label", "Payments beta"], ["Service", "Stripe"],
      ["Username", "account-b"], ["Password", "demo-two"]], { delimiter: "\t" });
    expect(looksLikeCredentialPairs(input)).toBe(true);
    const result = previewBulkIntake("credentials", input);
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map(row => row.label)).toEqual(["Hosting alpha", "Payments beta"]);
    expect(result.needsSecretReview).toBe(true);
    expect(looksLikeCredentialPairs("Label\tPassword\nTest\tsecret")).toBe(false);
  });
});
