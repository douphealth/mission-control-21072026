/** Browser-safe types + helpers for the search performance dashboard. */
export type DailyPoint = { date: string; clicks: number; impressions: number; position: number | null };
export type Totals = { clicks: number; impressions: number; ctr: number; position: number | null };
export type RankRow = { key: string; clicks: number; impressions: number; ctr: number; position: number | null };
export type EngineSearch = { daily: DailyPoint[]; current: Totals; previous: Totals; topQueries: RankRow[]; topPages: RankRow[]; property?: string };
export type SiteSearch = {
  host: string;
  google: EngineSearch | null;
  bing: EngineSearch | null;
  crawl: { inIndex: number; crawled: number; errors4xx: number; errors5xx: number; date: string } | null;
  errors: string[];
};
export type SearchPerformance = { generatedAt: string; days: number; range: { start: string; end: string }; sites: SiteSearch[]; errors: string[] };

export type Engine = "all" | "google" | "bing";

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return cur ? null : 0;
  return ((cur - prev) / prev) * 100;
}

/** Merge daily series across sites/engines into one chart series keyed by date. */
export function mergeDaily(sites: SiteSearch[], engine: Engine) {
  const map = new Map<string, { date: string; google: number; bing: number; googleImpr: number; bingImpr: number }>();
  for (const s of sites) {
    for (const [name, data] of [["google", s.google], ["bing", s.bing]] as const) {
      if (!data || (engine !== "all" && engine !== name)) continue;
      for (const p of data.daily) {
        const row = map.get(p.date) ?? { date: p.date, google: 0, bing: 0, googleImpr: 0, bingImpr: 0 };
        row[name] += p.clicks;
        row[name === "google" ? "googleImpr" : "bingImpr"] += p.impressions;
        map.set(p.date, row);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function sumTotals(sites: SiteSearch[], engine: Engine, which: "current" | "previous"): Totals {
  let clicks = 0, impressions = 0, posW = 0, posImpr = 0;
  for (const s of sites) for (const [name, d] of [["google", s.google], ["bing", s.bing]] as const) {
    if (!d || (engine !== "all" && engine !== name)) continue;
    const t = d[which];
    clicks += t.clicks; impressions += t.impressions;
    if (t.position) { posW += t.position * t.impressions; posImpr += t.impressions; }
  }
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: posImpr ? posW / posImpr : null };
}

/** Queries ranking 4-20 with real impressions: the cheapest wins. */
export function quickWins(sites: SiteSearch[], limit = 12) {
  const out: (RankRow & { host: string })[] = [];
  for (const s of sites) for (const q of s.google?.topQueries ?? [])
    if (q.position && q.position >= 4 && q.position <= 20 && q.impressions >= 20) out.push({ ...q, host: s.host });
  return out.sort((a, b) => b.impressions - a.impressions).slice(0, limit);
}
