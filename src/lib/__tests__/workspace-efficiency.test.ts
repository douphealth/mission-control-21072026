import { describe, expect, it } from "vitest";
import type { Task } from "../db";
import { matchesTaskView, taskMatchesSearch, visibleSelection } from "../taskViews";
import { isRecentPublication, matchesResearchEvidence, mergeResearchStories } from "../researchStories";
const task = (changes: Partial<Task> = {}): Task => ({ id: "one", title: "Review launch", priority: "high", status: "todo", dueDate: "2026-11-07", startDate: "", category: "Business", description: "", linkedProject: "", subtasks: [], createdAt: "2026-11-01", ...changes });
describe("task view accuracy", () => {
  it("uses the supplied current day for deadlines", () => {
    expect(matchesTaskView(task(), "today", "2026-11-06")).toBe(false);
    expect(matchesTaskView(task(), "today", "2026-11-07")).toBe(true);
    expect(matchesTaskView(task(), "today", "2026-11-08")).toBe(true);
  });
  it("Done today excludes earlier completions and archived records", () => {
    expect(matchesTaskView(task({ status: "done", completedAt: "2026-11-07T10:00:00Z" }), "done", "2026-11-07")).toBe(true);
    expect(matchesTaskView(task({ status: "done", completedAt: "2026-11-06" }), "done", "2026-11-07")).toBe(false);
    expect(matchesTaskView(task({ archived: true }), "all", "2026-11-07")).toBe(false);
  });
  it("searches category, tags and checklist without requiring exact phrase order", () => {
    const value = task({ tags: ["release"], subtasks: [{ id: "sub", title: "Check DNS", done: false }] });
    expect(taskMatchesSearch(value, "dns business release")).toBe(true);
    expect(taskMatchesSearch(value, "missing")).toBe(false);
  });
  it("never applies visible bulk selection to hidden IDs of the same count", () => {
    expect([...visibleSelection(new Set(["hidden", "one"]), [{ id: "one" }, { id: "two" }])]).toEqual(["one"]);
  });
});
describe("research provenance accuracy", () => {
  it("retains stronger tracked evidence independently from higher search relevance", () => {
    const result = mergeResearchStories([
      { title: "Original", url: "https://example.com/story", evidenceLevel: "high", evidenceReason: "Tracked feed", relevanceScore: 40 },
      { title: "Search", url: "https://example.com/story", evidenceLevel: "medium", relevanceScore: 95, retrievalProvider: "dataforseo" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].evidenceLevel).toBe("high");
    expect(result[0].evidenceReason).toBe("Tracked feed");
    expect(result[0].relevanceScore).toBe(95);
    expect(result[0].retrievalProviders).toEqual(["dataforseo"]);
  });
  it("unknown evidence is not silently promoted to attributed evidence", () => {
    expect(matchesResearchEvidence({ title: "Unknown", url: "https://example.com" }, "medium")).toBe(false);
    expect(matchesResearchEvidence({ title: "Unknown", url: "https://example.com" }, "all")).toBe(true);
  });
  it("excludes invalid and future publication dates", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    expect(isRecentPublication("2026-11-06T12:00:00Z", 7, now)).toBe(true);
    expect(isRecentPublication("2026-11-08T12:00:00Z", 7, now)).toBe(false);
    expect(isRecentPublication("invalid", 7, now)).toBe(false);
  });
});