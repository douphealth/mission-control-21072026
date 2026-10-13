import { describe, expect, it } from "vitest";
import { parseLibraryIntake } from "@/lib/libraryIntake";

describe("library text and structured input detection", () => {
  it("imports Markdown links without treating them as a JSON array", () => {
    const result = parseLibraryIntake("links", "[Tool](https://example.com/Tool?tag=partner-20)\n[Guide](https://example.com/guide)");
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ title: "Tool", url: "https://example.com/Tool?tag=partner-20" });
  });
  it("preserves bracketed roles in plain text prompts", () => {
    const prompt = "[Role: editor]\n\nKeep every instruction.";
    const result = parseLibraryIntake("prompts", prompt);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].content).toBe(prompt);
  });
  it("retains errors for malformed structured input", () => {
    expect(parseLibraryIntake("links", '[{"url":').errors.length).toBeGreaterThan(0);
  });
});
