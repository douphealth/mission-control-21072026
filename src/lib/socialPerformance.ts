/** Browser-safe types + helpers for the social dashboard. */
export type SeriesPoint = { date: string; value: number };
export type SocialChannel = { network: string; handle: string | null; followers: SeriesPoint[]; reach: SeriesPoint[]; error: string | null };
export type SocialBrand = { id: string; label: string; url: string | null; picture: string | null; channels: SocialChannel[] };
export type PublerAccount = {
  id: string; workspace: string; provider: string; type: string; name: string; picture: string | null;
  locked: boolean; lastSync: string | null; scheduled: number; nextPost: string | null;
};
export type SocialPerformance = { generatedAt: string; days: number; brands: SocialBrand[]; publerAccounts: PublerAccount[]; errors: string[] };

/** First and last real reading, and the change between them. */
export function growth(series: SeriesPoint[]) {
  if (!series.length) return { latest: null as number | null, change: null as number | null, pct: null as number | null };
  const first = series[0].value, latest = series[series.length - 1].value;
  return { latest, change: latest - first, pct: first ? ((latest - first) / first) * 100 : null };
}

export function totalAudience(brands: SocialBrand[]) {
  let latest = 0, change = 0;
  for (const b of brands) for (const c of b.channels) { const g = growth(c.followers); latest += g.latest ?? 0; change += g.change ?? 0; }
  return { latest, change };
}

/** Sum all followers per day (carrying forward each channel's last value so gaps don't dip the line). */
export function audienceSeries(brands: SocialBrand[], network = "all") {
  const chans = brands.flatMap((b) => b.channels).filter((c) => network === "all" || c.network === network);
  const dates = [...new Set(chans.flatMap((c) => c.followers.map((p) => p.date)))].sort();
  return dates.map((date) => {
    let v = 0;
    for (const c of chans) { let last: number | null = null; for (const p of c.followers) { if (p.date > date) break; last = p.value; } v += last ?? 0; }
    return { date, value: v };
  });
}

/** One row per brand: Metricool brands plus every Publer workspace, matched by normalized name. */
export type UnifiedBrand = { key: string; label: string; brand: SocialBrand | null; accounts: PublerAccount[] };
const norm = (s: string) => s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\.(com|net|org|io|co)(\/.*)?$/, "").replace(/[^a-z0-9]/g, "");
export function unifiedBrands(data: Pick<SocialPerformance, "brands" | "publerAccounts">): UnifiedBrand[] {
  const out = new Map<string, UnifiedBrand>();
  for (const b of data.brands) {
    const k = norm(b.url ?? "") || norm(b.label);
    out.set(k, { key: k, label: b.label, brand: b, accounts: [] });
    if (norm(b.label) !== k) out.set(norm(b.label), out.get(k)!);
  }
  for (const a of data.publerAccounts) {
    const k = norm(a.workspace);
    let u = out.get(k);
    if (!u) { u = { key: k, label: a.workspace, brand: null, accounts: [] }; out.set(k, u); }
    u.accounts.push(a);
  }
  return [...new Set(out.values())].sort((x, y) => Number(!!y.brand) - Number(!!x.brand) || x.label.localeCompare(y.label));
}
