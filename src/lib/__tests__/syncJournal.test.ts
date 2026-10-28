import { describe, expect, it } from "vitest";
import { parseLegacyJournal, newerJournalChange, sameJournalChange } from "@/lib/syncJournal";

describe("durable cloud journal migration", () => {
  const edit = { operation: "put" as const, changedAt: "2026-10-28T12:00:00.000Z", revision: "a" };
  const newer = { operation: "delete" as const, changedAt: "2026-10-28T12:00:01.000Z", revision: "b" };

  it("preserves explicit pending edits and deletions", () => {
    expect(parseLegacyJournal(JSON.stringify({ "tasks::a": edit, "tasks::b": newer }))).toEqual({
      "tasks::a": edit, "tasks::b": newer,
    });
  });
  it("refuses invalid or unreadable legacy data instead of silently losing pending records", () => {
    expect(() => parseLegacyJournal("{")).toThrow();
    expect(() => parseLegacyJournal(JSON.stringify({ "bad-key": edit }))).toThrow();
    expect(() => parseLegacyJournal(JSON.stringify({ "tasks::a": { operation: "put" } }))).toThrow();
  });
  it("keeps the most recent mutation when merging a legacy journal", () => {
    expect(newerJournalChange(edit, newer)).toEqual(newer);
    expect(newerJournalChange(newer, edit)).toEqual(newer);
  });
  it("acknowledges exactly the matching revision, not a concurrent edit", () => {
    expect(sameJournalChange(edit, { ...edit })).toBe(true);
    expect(sameJournalChange(edit, newer)).toBe(false);
  });
});
