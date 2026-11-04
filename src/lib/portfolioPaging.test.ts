import { describe, expect, it } from "vitest";
import { portfolioPage } from "@/lib/portfolioPaging";

describe("bounded portfolio list presentation", () => {
  const all = Array.from({ length: 270 }, (_, i) => i + 1);
  it("renders one bounded page without discarding the complete source", () => {
    const data = portfolioPage(all, 3, 50);
    expect(data).toMatchObject({page: 3, pages: 6, from: 101, to: 150, total: 270, pageSize: 50});
    expect(data.items).toEqual(all.slice(100, 150));
    expect(all).toHaveLength(270);
  });
  it("clamps out-of-range pages when filters shrink the list", () => {
    const data = portfolioPage(all.slice(0, 3), 99, 50);
    expect(data).toMatchObject({page: 1, pages: 1, from: 1, to: 3});
  });
  it("handles zero rows, NaN and unapproved page sizes safely", () => {
    expect(portfolioPage([], Number.NaN, 999)).toMatchObject({page: 1, pages: 1, pageSize: 50, from: 0, to: 0, items: []});
    expect(portfolioPage(all, -4, 25).items).toEqual(all.slice(0, 25));
  });
});
