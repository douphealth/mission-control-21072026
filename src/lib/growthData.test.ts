import { describe, expect, it } from "vitest";
import { pctChange, quickWins, sumTotals, type SiteSearch } from "./searchPerformance";
import { audienceSeries, growth } from "./socialPerformance";

const eng = (clicks: number, impressions: number, position: number | null, q: { key: string; position: number; impressions: number }[] = []) => ({
  daily: [], current: { clicks, impressions, ctr: clicks / impressions, position }, previous: { clicks: 1, impressions: 10, ctr: 0.1, position },
  topQueries: q.map((x) => ({ ...x, clicks: 1, ctr: 0 })), topPages: [],
});
const site = (host: string, g: ReturnType<typeof eng> | null, b: ReturnType<typeof eng> | null): SiteSearch => ({ host, google: g, bing: b, crawl: null, errors: [] });

describe("search totals", () => {
  it("sums Google and Bing and weights position by impressions", () => {
    const t = sumTotals([site("a", eng(10, 100, 5), eng(5, 100, null)), site("b", eng(0, 300, 9), null)], "all", "current");
    expect(t.clicks).toBe(15);
    expect(t.impressions).toBe(500);
    expect(t.position).toBe(8); // (5*100 + 9*300) / 400
  });
  it("filters to a single engine", () => {
    expect(sumTotals([site("a", eng(10, 100, 5), eng(5, 100, null))], "bing", "current").clicks).toBe(5);
  });
  it("percent change handles zero baselines", () => {
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(5, 0)).toBeNull();
  });
  it("quick wins only include positions 4-20 with 20+ impressions", () => {
    const w = quickWins([site("a", eng(1, 1, 1, [{ key: "top", position: 2, impressions: 500 }, { key: "win", position: 8, impressions: 50 }, { key: "thin", position: 8, impressions: 5 }, { key: "deep", position: 35, impressions: 900 }]), null)]);
    expect(w.map((x) => x.key)).toEqual(["win"]);
  });
});

describe("social growth", () => {
  it("measures change between first and latest reading", () => {
    expect(growth([{ date: "1", value: 100 }, { date: "2", value: 110 }])).toEqual({ latest: 110, change: 10, pct: 10 });
  });
  it("carries forward channel values so gaps don't dip the total", () => {
    const s = audienceSeries([{ id: "1", label: "x", url: null, picture: null, channels: [
      { network: "a", handle: null, reach: [], error: null, followers: [{ date: "01", value: 10 }, { date: "03", value: 12 }] },
      { network: "b", handle: null, reach: [], error: null, followers: [{ date: "02", value: 5 }] },
    ] }]);
    expect(s).toEqual([{ date: "01", value: 10 }, { date: "02", value: 15 }, { date: "03", value: 17 }]);
  });
});

import { unifiedBrands } from "@/lib/socialPerformance";
import { cleanKeywords, bareDomain } from "@/lib/rankCheck";
describe("unifiedBrands", () => {
  const acc = (workspace: string) => ({ id: workspace + Math.random(), workspace, provider: "facebook", type: "page", name: "x", picture: null, locked: false, lastSync: null, scheduled: 0, nextPost: null });
  it("merges Publer workspaces into matching Metricool brands and keeps Publer-only brands", () => {
    const r = unifiedBrands({ brands: [{ id: "1", label: "Gear Up to Fit", url: "https://gearuptofit.com", picture: null, channels: [] }], publerAccounts: [acc("Gear Up to Fit"), acc("Mice Gone Guide"), acc("Gear Up to Grow")] });
    expect(r).toHaveLength(3);
    expect(r[0].label).toBe("Gear Up to Fit");
    expect(r[0].accounts).toHaveLength(1);
    expect(r.filter((u) => !u.brand).map((u) => u.label)).toEqual(["Gear Up to Grow", "Mice Gone Guide"]);
  });
});
describe("rank check input", () => {
  it("dedupes and caps keywords at 10", () => {
    expect(cleanKeywords("a, A\nb," + Array.from({ length: 20 }, (_, i) => `k${i}`).join(","))).toHaveLength(10);
    expect(cleanKeywords(" Foo ,foo")).toEqual(["foo"]);
  });
  it("strips protocol and www", () => expect(bareDomain("https://www.Site.com/path")).toBe("site.com"));
});
