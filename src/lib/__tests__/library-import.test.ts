import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {}, genId: () => crypto.randomUUID() }));
import { identityKey, planDeduplicatedImport } from "@/lib/dedup";
import { normalizeLibraryRecord, parseLibraryIntake, promptVariables, renderPrompt, safeLibraryUrl } from "@/lib/libraryIntake";

const allocator = () => { let next = 0; return () => `new-${++next}`; };
describe("atomic import planner", () => {
  it("assigns IDs before enriching duplicate drafts from one batch", () => {
    const input = [{ label: "Server", service: "Hosting", username: "alex", notes: "" }, { label: "Server", service: "Hosting", username: "alex", notes: "Production" }];
    const snapshot = JSON.stringify(input);
    const result = planDeduplicatedImport("credentials", [], input, allocator());
    expect(result.creates).toEqual([{ ...input[0], notes: "Production", id: "new-1" }]);
    expect(result.updates).toEqual([]);
    expect(result.result).toEqual({ created: 1, updated: 0, skipped: 1, ids: ["new-1", "new-1"] });
    expect(JSON.stringify(input)).toBe(snapshot);
  });
  it("preserves existing IDs and nonempty fields", () => {
    const stored = [{ id: "saved", title: "Original", url: "https://example.com/path", description: "", pinned: true }];
    const result = planDeduplicatedImport("links", stored, [{ title: "Replacement", url: stored[0].url, description: "Details", pinned: false }], allocator());
    expect(result.updates[0]).toMatchObject({ id: "saved", title: "Original", description: "Details", pinned: true });
    expect(result.result).toMatchObject({ created: 0, updated: 1 });
    expect(stored[0].description).toBe("");
  });
  it("reimports are idempotent", () => {
    const input = [{ title: "One", url: "https://example.com/A?tag=alex-20" }];
    const first = planDeduplicatedImport("links", [], input, allocator());
    const second = planDeduplicatedImport("links", first.creates, input, allocator());
    expect(second.result).toMatchObject({ created: 0, updated: 0, skipped: 1 });
  });
  it.each(["https://example.com/b?tag=x", "https://example.com/A?tag=x", "https://example.com/a?tag=y", "https://example.com/a?tag=x#section"])("keeps full affiliate identity %s", url => {
    const rows = planDeduplicatedImport("links", [], [{ url: "https://example.com/a?tag=x" }, { url }], allocator());
    expect(rows.creates).toHaveLength(2);
  });
  it("keeps identical links for distinct website assignments", () => {
    expect(identityKey("links", { url: "https://example.com", website: "One" })).not.toEqual(identityKey("links", { url: "https://example.com", website: "Two" }));
  });
  it("rejects secret conflicts without leaking the values", () => {
    const a = { label: "same", password: "secret-one" };
    const b = { label: "same", password: "secret-two" };
    expect(() => planDeduplicatedImport("credentials", [], [a, b], allocator())).toThrow(/conflicts/);
    try { planDeduplicatedImport("credentials", [], [a, b], allocator()); } catch (error) { expect(String(error)).not.toContain("secret-one"); expect(String(error)).not.toContain("secret-two"); }
  });
  it("does not merge different vault accounts or labels", () => {
    const items = [{ label: "prod", username: "Alex" }, { label: "test", username: "Alex" }, { label: "prod", username: "alex" }];
    expect(planDeduplicatedImport("credentials", [], items, allocator()).creates).toHaveLength(3);
  });
  it("keeps complete prompt variants rather than matching the first 100 characters", () => {
    const common = "a".repeat(150);
    const result = planDeduplicatedImport("notes", [], [{ title: "same", kind: "ai-prompt", content: common + "A" }, { title: "same", kind: "ai-prompt", content: common + "B" }], allocator());
    expect(result.creates).toHaveLength(2);
  });
  it("does not merge a prompt with an ordinary note", () => {
    const result = planDeduplicatedImport("notes", [], [{ title: "same", content: "same" }, { kind: "ai-prompt", title: "same", content: "same" }], allocator());
    expect(result.creates).toHaveLength(2);
  });
  it("rejects invalid records and existing empty keys", () => {
    expect(() => planDeduplicatedImport("links", [], [null], allocator())).toThrow(/Row 1/);
    expect(() => planDeduplicatedImport("links", [{ url: "https://example.com" }], [{ url: "https://example.com" }], allocator())).toThrow(/invalid ID/);
  });
});

describe("local library intake", () => {
  it("preserves an entire multi-line prompt without splitting numbered steps", () => {
    const content = "  Write for {{audience}}.\n\n1. Analyze\n2. Explain\n---\nDo not skip examples.  ";
    const result = parseLibraryIntake("prompts", content);
    expect(result.errors).toEqual([]); expect(result.rows).toHaveLength(1);
    expect(result.rows[0].content).toBe(content);
    expect(result.rows[0].variables).toEqual(["audience"]);
  });
  it("splits only the explicit prompt separator", () => {
    expect(parseLibraryIntake("prompts", "First\n---PROMPT---\nSecond").rows).toHaveLength(2);
  });
  it("reads quoted multiline CSV", () => {
    const csv = 'title,content,tags\nExample,"Line one\nLine two","work,research"';
    const result = parseLibraryIntake("prompts", csv);
    expect(result.errors).toEqual([]); expect(result.rows[0].content).toBe("Line one\nLine two"); expect(result.rows[0].tags).toEqual(["work", "research"]);
  });
  it("round trips JSON exports with original text and affiliate URL", () => {
    const original = { title: "Deal", url: "https://example.com/A?tag=other-20&sig=A%2Bb%2FC", network: "Partner", kind: "affiliate", website: "Site", tags: ["deal"] };
    const result = parseLibraryIntake("links", JSON.stringify({ links: [original] }));
    expect(result.errors).toEqual([]); expect(result.rows[0]).toMatchObject(original);
  });
  it("detects Amazon attribution without replacing the original tag", () => {
    const row = normalizeLibraryRecord("links", { url: "https://www.amazon.com/dp/B000?tag=other-20" });
    expect(row).toMatchObject({ trackingId: "other-20", kind: "affiliate", merchant: "Amazon" });
    expect(row.url).not.toContain("papalex-20");
  });
  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://example.com", "https://user:secret@example.com"])("rejects unsafe link %s", url => {
    expect(() => safeLibraryUrl(url)).toThrow();
  });
  it("reports row errors rather than silently dropping invalid entries", () => {
    const result = parseLibraryIntake("links", '[{"url":"https://example.com"},{"url":"javascript:x"}]');
    expect(result.rows).toHaveLength(1); expect(result.errors[0]).toContain("Row 2");
  });
  it("bounds input volume", () => {
    expect(parseLibraryIntake("links", "x".repeat(1_000_001)).errors).toHaveLength(1);
    expect(parseLibraryIntake("links", Array(1001).fill("https://example.com").join("\n")).errors).toHaveLength(1);
  });
  it("treats variable values as literal text including dollar patterns", () => {
    expect(renderPrompt("Do {{task}}", { task: "$& $1" })).toBe("Do $& $1");
    expect(renderPrompt("{{constructor}}", {})).toBe("{{constructor}}");
    expect(promptVariables("{{audience}} {{ audience }} {{topic}}")).toEqual(["audience", "topic"]);
  });
});
