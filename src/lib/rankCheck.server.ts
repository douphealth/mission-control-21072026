/** DataForSEO Google organic rank check — one batched call, 6h cache, only on explicit request. */
import { bareDomain, type RankCheck, type RankRow } from "@/lib/rankCheck";

type Env = Record<string, string | undefined>;
const CACHE_MS = 6 * 3_600_000;
const cache = new Map<string, { at: number; value: RankCheck }>();

export async function runRankCheck(env: Env, domainIn: string, keywords: string[], location: number): Promise<RankCheck> {
  const domain = bareDomain(domainIn);
  const key = `${domain}|${location}|${[...keywords].sort().join("|")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit.value, cached: true };
  const login = env.DATAFORSEO_LOGIN ?? process.env.DATAFORSEO_LOGIN;
  const pass = env.DATAFORSEO_PASSWORD ?? process.env.DATAFORSEO_PASSWORD;
  if (!login || !pass) throw new Error("DataForSEO is not connected");
  // One POST with one task per keyword; depth 100 = top 100 results (single billed page).
  const tasks = keywords.map((k) => ({ keyword: k, location_code: location, language_code: "en", depth: 100 }));
  const r = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/regular", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${login}:${pass}`)}`, "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  });
  if (!r.ok) throw new Error(`DataForSEO ${r.status}`);
  const body = (await r.json()) as { cost?: number; tasks?: { data?: { keyword?: string }; status_message?: string; result?: { item_types?: string[]; items?: { type: string; rank_group: number; domain?: string; url?: string; title?: string }[] }[] }[] };
  const rows: RankRow[] = (body.tasks ?? []).map((t, i) => {
    const res = t.result?.[0];
    const organic = (res?.items ?? []).filter((x) => x.type === "organic");
    const mine = organic.find((x) => x.domain && bareDomain(x.domain).endsWith(domain));
    return {
      keyword: t.data?.keyword ?? keywords[i],
      position: mine?.rank_group ?? null, url: mine?.url ?? null, title: mine?.title ?? null,
      topDomain: organic[0]?.domain ?? null,
      serpFeatures: (res?.item_types ?? []).filter((x) => x !== "organic"),
    };
  });
  const value: RankCheck = { domain, checkedAt: new Date().toISOString(), costUsd: body.cost ?? 0, rows, cached: false };
  cache.set(key, { at: Date.now(), value });
  return value;
}
