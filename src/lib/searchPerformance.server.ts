/**
 * Google Search Console (service account) + Bing Webmaster read-only collector.
 * Results are cached per isolate for 30 minutes to keep API quota low.
 */
import type { SearchPerformance, SiteSearch, EngineSearch, DailyPoint, RankRow } from "@/lib/searchPerformance";

type Env = Record<string, string | undefined>;
const CACHE_MS = 30 * 60_000;
const cache = new Map<string, { at: number; value: SearchPerformance }>();

const b64url = (bytes: Uint8Array | string) => {
  const bin = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function googleToken(json: string): Promise<string> {
  const sa = JSON.parse(json) as { client_email: string; private_key: string; token_uri?: string };
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: tokenUri, iat: now, exp: now + 3600,
  }))}`;
  const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const res = await fetch(tokenUri, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`Google sign-in failed [${res.status}]`);
  return ((await res.json()) as { access_token: string }).access_token;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
export const hostOf = (site: string) =>
  site.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();

function totals(points: DailyPoint[]) {
  const clicks = points.reduce((s, p) => s + p.clicks, 0);
  const impressions = points.reduce((s, p) => s + p.impressions, 0);
  const posW = points.reduce((s, p) => s + (p.position ?? 0) * p.impressions, 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions && posW ? posW / impressions : null };
}

async function gscSite(token: string, siteUrl: string, start: string, end: string, prevStart: string, prevEnd: string): Promise<EngineSearch> {
  const q = async (body: Record<string, unknown>) => {
    const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Search Console ${r.status}`);
    return ((await r.json()) as { rows?: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }[] }).rows ?? [];
  };
  const [daily, prev, queries, pages] = await Promise.all([
    q({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 500 }),
    q({ startDate: prevStart, endDate: prevEnd, rowLimit: 1 }),
    q({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 25 }),
    q({ startDate: start, endDate: end, dimensions: ["page"], rowLimit: 15 }),
  ]);
  const points: DailyPoint[] = daily.map((r) => ({ date: r.keys![0], clicks: r.clicks, impressions: r.impressions, position: r.position }));
  const row = (r: (typeof queries)[number]): RankRow => ({ key: r.keys![0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
  const p = prev[0];
  return {
    daily: points, current: totals(points),
    previous: p ? { clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position } : { clicks: 0, impressions: 0, ctr: 0, position: null },
    topQueries: queries.map(row), topPages: pages.map(row),
  };
}

const bingDate = (v: string) => { const m = /\/Date\((\d+)/.exec(v); return m ? new Date(Number(m[1])) : new Date(v); };

async function bingSite(key: string, siteUrl: string, start: Date, prevStart: Date, end: Date): Promise<EngineSearch & { crawl: SiteSearch["crawl"] }> {
  const get = async <T,>(path: string) => {
    const r = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/${path}?apikey=${encodeURIComponent(key)}&siteUrl=${encodeURIComponent(siteUrl)}`);
    if (!r.ok) throw new Error(`Bing ${r.status}`);
    return ((await r.json()) as { d?: T[] }).d ?? [];
  };
  const [traffic, queries, crawl] = await Promise.all([
    get<{ Date: string; Clicks: number; Impressions: number }>("GetRankAndTrafficStats"),
    get<{ Query: string; Date: string; Clicks: number; Impressions: number; AvgClickPosition: number; AvgImpressionPosition: number }>("GetQueryStats"),
    get<{ Date: string; InIndex: number; CrawledPages: number; Code4xx: number; Code5xx: number; CrawlErrors?: number }>("GetCrawlStats").catch(() => []),
  ]);
  const all = traffic.map((t) => ({ d: bingDate(t.Date), clicks: t.Clicks, impressions: t.Impressions })).sort((a, b) => +a.d - +b.d);
  const points: DailyPoint[] = all.filter((t) => t.d >= start && t.d <= addDays(end, 1)).map((t) => ({ date: iso(t.d), clicks: t.clicks, impressions: t.impressions, position: null }));
  const prevPts = all.filter((t) => t.d >= prevStart && t.d < start).map((t) => ({ date: iso(t.d), clicks: t.clicks, impressions: t.impressions, position: null }));
  const qmap = new Map<string, RankRow>();
  for (const q of queries) {
    if (bingDate(q.Date) < start) continue; // weekly rows: keep only the selected range
    const r = qmap.get(q.Query) ?? { key: q.Query, clicks: 0, impressions: 0, ctr: 0, position: q.AvgImpressionPosition > 0 ? q.AvgImpressionPosition : null };
    r.clicks += q.Clicks; r.impressions += q.Impressions; qmap.set(q.Query, r);
  }
  const topQueries = [...qmap.values()].map((r) => ({ ...r, ctr: r.impressions ? r.clicks / r.impressions : 0 }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25);
  const last = [...crawl].sort((a, b) => +bingDate(b.Date) - +bingDate(a.Date))[0];
  return {
    daily: points, current: totals(points), previous: totals(prevPts), topQueries, topPages: [],
    crawl: last ? { inIndex: last.InIndex, crawled: last.CrawledPages, errors4xx: last.Code4xx, errors5xx: last.Code5xx, date: iso(bingDate(last.Date)) } : null,
  };
}

export async function collectSearchPerformance(env: Env, days: number): Promise<SearchPerformance> {
  const hit = cache.get(String(days));
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const end = addDays(new Date(), -2); // Search Console data lags ~2 days
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const sites = new Map<string, SiteSearch>();
  const site = (host: string) => {
    let s = sites.get(host);
    if (!s) { s = { host, google: null, bing: null, crawl: null, errors: [] }; sites.set(host, s); }
    return s;
  };
  const errors: string[] = [];

  const gscJson = env.GSC_SERVICE_ACCOUNT_JSON;
  const googleTask = (async () => {
    if (!gscJson) { errors.push("Google Search Console is not connected"); return; }
    const token = await googleToken(gscJson);
    const r = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Search Console sites ${r.status}`);
    const list = (((await r.json()) as { siteEntry?: { siteUrl: string; permissionLevel: string }[] }).siteEntry ?? [])
      .filter((s) => s.permissionLevel !== "siteUnverifiedUser");
    // One property per host: Domain properties cover every subdomain and protocol, so prefer them.
    const chosen = new Map<string, string>();
    for (const s of list) {
      const h = hostOf(s.siteUrl);
      if (!chosen.has(h) || s.siteUrl.startsWith("sc-domain:")) chosen.set(h, s.siteUrl);
    }
    await Promise.all([...chosen].map(async ([h, url]) => {
      try { const g = await gscSite(token, url, iso(start), iso(end), iso(prevStart), iso(prevEnd)); Object.assign(site(h), { google: { ...g, property: url } }); }
      catch (e) { site(h).errors.push(`Google: ${(e as Error).message}`); }
    }));
  })().catch((e) => errors.push(`Google: ${(e as Error).message}`));

  const bingKey = env.BING_WEBMASTER_API_KEY;
  const bingTask = (async () => {
    if (!bingKey) { errors.push("Bing Webmaster is not connected"); return; }
    let r: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=${encodeURIComponent(bingKey.trim())}`, { headers: { Accept: "application/json" } });
      if (r.ok || (r.status < 500 && r.status !== 400 && r.status !== 429)) break;
      await new Promise((ok) => setTimeout(ok, 800 * (attempt + 1)));
    }
    if (!r || !r.ok) {
      const detail = r ? ((await r.text().catch(() => "")).match(/"Message":"([^"]{1,140})/)?.[1] ?? "") : "";
      throw new Error(`Bing sites ${r?.status ?? "unreachable"}${detail ? ` – ${detail}` : " – Bing is temporarily refusing requests; try Refresh in a minute"}`);
    }
    const list = (((await r.json()) as { d?: { Url: string; IsVerified: boolean }[] }).d ?? []).filter((s) => s.IsVerified);
    await Promise.all(list.map(async (s) => {
      const h = hostOf(s.Url);
      try { const { crawl, ...b } = await bingSite(bingKey, s.Url, start, prevStart, end); Object.assign(site(h), { bing: { ...b, property: s.Url }, crawl }); }
      catch (e) { site(h).errors.push(`Bing: ${(e as Error).message}`); }
    }));
  })().catch((e) => errors.push(`Bing: ${(e as Error).message}`));

  await Promise.all([googleTask, bingTask]);
  const value: SearchPerformance = {
    generatedAt: new Date().toISOString(), days, range: { start: iso(start), end: iso(end) },
    sites: [...sites.values()].sort((a, b) => (b.google?.current.clicks ?? 0) + (b.bing?.current.clicks ?? 0) - (a.google?.current.clicks ?? 0) - (a.bing?.current.clicks ?? 0)),
    errors,
  };
  cache.set(String(days), { at: Date.now(), value });
  return value;
}
