import { describe, expect, it } from "vitest";
import {
  BULK_OPEN_LIMIT,
  clampIndex,
  flattenGroups,
  groupRows,
  limitOpen,
  markdownList,
  moveIndex,
  safeUrls,
} from "@/lib/consoleKit";

describe("keyboard cursor", () => {
  it("starts at the edge in the direction of travel and never leaves the list", () => {
    expect(moveIndex(-1, 1, 5)).toBe(0);
    expect(moveIndex(-1, -1, 5)).toBe(4);
    expect(moveIndex(0, -1, 5)).toBe(0);
    expect(moveIndex(4, 1, 5)).toBe(4);
    expect(moveIndex(2, 1, 5)).toBe(3);
  });
  it("has no cursor in an empty list and recovers when the list shrinks", () => {
    expect(moveIndex(0, 1, 0)).toBe(-1);
    expect(clampIndex(9, 3)).toBe(2);
    expect(clampIndex(1, 0)).toBe(-1);
    expect(clampIndex(-1, 3)).toBe(-1);
  });
});

describe("bulk URL safety", () => {
  it("keeps only unique http(s) URLs so bulk-open can never run script or file URLs", () => {
    const urls = safeUrls([
      "https://a.example/",
      "https://a.example/",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "not a url",
      "",
      null,
      undefined,
      "http://b.example/x",
    ]);
    expect(urls).toEqual(["https://a.example/", "http://b.example/x"]);
  });
  it("limits how many tabs open at once and reports what was skipped", () => {
    const many = Array.from({ length: 12 }, (_, i) => "https://x.example/" + i);
    const { open, skipped } = limitOpen(many);
    expect(open).toHaveLength(BULK_OPEN_LIMIT);
    expect(skipped).toBe(12 - BULK_OPEN_LIMIT);
    expect(limitOpen(many.slice(0, 3))).toEqual({ open: many.slice(0, 3), skipped: 0 });
  });
});

describe("markdownList", () => {
  it("formats links and prevents a title from breaking out of its link", () => {
    expect(
      markdownList([
        { title: "alpha", url: "https://github.com/o/alpha" },
        { title: "be]ta[", url: "https://github.com/o/beta" },
      ]),
    ).toBe("- [alpha](https://github.com/o/alpha)\n- [beta](https://github.com/o/beta)");
  });
});

describe("groupRows", () => {
  const rows = [
    { n: "a", g: "b" },
    { n: "b", g: "a" },
    { n: "c", g: "b" },
    { n: "d", g: "z" },
  ];
  const describeRow = (r: { g: string }) => ({
    key: r.g,
    label: r.g.toUpperCase(),
    order: r.g === "z" ? 9 : 0,
  });
  it("orders sections by order then label and keeps incoming order within a section", () => {
    const groups = groupRows(rows, describeRow);
    expect(groups.map((g) => g.label)).toEqual(["A", "B", "Z"]);
    expect(groups[1].rows.map((r) => r.n)).toEqual(["a", "c"]);
  });
  it("flattens back without losing or duplicating rows", () => {
    const flat = flattenGroups(groupRows(rows, describeRow));
    expect(flat).toHaveLength(rows.length);
    expect(new Set(flat.map((r) => r.n)).size).toBe(rows.length);
  });
});
