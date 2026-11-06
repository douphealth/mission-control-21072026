/** Metricool (analytics) + Publer (account roster, scheduled queue) read-only collector. */
import type { SocialPerformance, SocialChannel, SocialBrand } from "@/lib/socialPerformance";

type Env = Record<string, string | undefined>;
const CACHE_MS = 30 * 60_000;
const cache = new Map<number, { at: number; value: SocialPerformance }>();

/** Metricool follower metric name per network (verified against the live API). */
const FOLLOWER_METRIC: Record<string, string> = {
  instagram: "followers", facebook: "pageFollows", tiktok: "followers_count",
  youtube: "totalSubscribers", threads: "followers_count", pinterest: "followers",
};
const PROFILE_FIELD: Record<string, string> = {
  instagram: "instagram", facebook: "facebook", tiktok: "tiktok", youtube: "youtube", threads: "threads", pinterest: "pinterest",
};

const fmt = (d: Date) => d.toISOString().slice(0, 19);

async function metricool(env: Env, days: number): Promise<{ brands: SocialBrand[]; error?: string }> {
  const token = env.METRICOOL_API_TOKEN;
  if (!token) return { brands: [], error: "Metricool is not connected" };
  const H = { "X-Mc-Auth": token };
  const r = await fetch("https://app.metricool.com/api/admin/simpleProfiles", { headers: H });
  if (!r.ok) return { brands: [], error: `Metricool ${r.status}` };
  const profiles = (await r.json()) as Record<string, unknown>[];
  const to = new Date(); const from = new Date(to.getTime() - days * 86_400_000);
  const brands = await Promise.all(profiles.map(async (p): Promise<SocialBrand> => {
    const base = `userId=${p.userId}&blogId=${p.id}&from=${fmt(from)}&to=${fmt(to)}&subject=account`;
    const nets = Object.keys(FOLLOWER_METRIC).filter((n) => p[PROFILE_FIELD[n]]);
    const channels = await Promise.all(nets.map(async (network): Promise<SocialChannel> => {
      const series = async (metric: string) => {
        const res = await fetch(`https://app.metricool.com/api/v2/analytics/timelines?${base}&metric=${metric}&network=${network}`, { headers: H });
        if (!res.ok) throw new Error(`${res.status}`);
        const j = (await res.json()) as { data?: { values?: { dateTime: string; value: number }[] }[] };
        return (j.data?.[0]?.values ?? []).map((v) => ({ date: v.dateTime.slice(0, 10), value: v.value })).sort((a, b) => a.date.localeCompare(b.date));
      };
      try {
        const [followers, reach] = await Promise.all([
          series(FOLLOWER_METRIC[network]),
          network === "instagram" ? series("reach").catch(() => []) : Promise.resolve([]),
        ]);
        const handle = typeof p[PROFILE_FIELD[network]] === "string" ? String(p[PROFILE_FIELD[network]]) : null;
        return { network, handle, followers, reach, error: null };
      } catch (e) {
        return { network, handle: null, followers: [], reach: [], error: `Metricool ${(e as Error).message}` };
      }
    }));
    return { id: String(p.id), label: String(p.label ?? p.title ?? p.id), url: (p.url as string) || null, picture: (p.picture as string) || null, channels };
  }));
  return { brands };
}

async function publer(env: Env): Promise<{ accounts: SocialPerformance["publerAccounts"]; error?: string }> {
  const key = env.PUBLER_API_KEY;
  if (!key) return { accounts: [], error: "Publer is not connected" };
  const auth = { Authorization: `Bearer-API ${key}` };
  const r = await fetch("https://app.publer.com/api/v1/workspaces", { headers: auth });
  if (!r.ok) return { accounts: [], error: `Publer ${r.status}` };
  const ws = (await r.json()) as { id: string; name: string }[];
  const lists = await Promise.all(ws.map(async (w) => {
    const h = { ...auth, "Publer-Workspace-Id": w.id };
    const [acc, sched] = await Promise.all([
      fetch("https://app.publer.com/api/v1/accounts", { headers: h }).then((x) => (x.ok ? x.json() : [])),
      fetch("https://app.publer.com/api/v1/posts?state=scheduled&limit=100", { headers: h }).then((x) => (x.ok ? x.json() : { posts: [] })),
    ]) as [Record<string, unknown>[], { posts?: { account_id?: string; scheduled_at?: string }[] }];
    const queue = new Map<string, { count: number; next: string | null }>();
    for (const p of sched.posts ?? []) {
      if (!p.account_id) continue;
      const q = queue.get(p.account_id) ?? { count: 0, next: null };
      q.count++; if (p.scheduled_at && (!q.next || p.scheduled_at < q.next)) q.next = p.scheduled_at;
      queue.set(p.account_id, q);
    }
    return (Array.isArray(acc) ? acc : []).map((a) => ({
      id: String(a.id), workspace: w.name, provider: String(a.provider), type: String(a.type ?? ""), name: String(a.name ?? ""),
      picture: (a.picture as string) || null, locked: Boolean(a.locked), lastSync: (a.last_posts_sync as string) || null,
      scheduled: queue.get(String(a.id))?.count ?? 0, nextPost: queue.get(String(a.id))?.next ?? null,
    }));
  }));
  return { accounts: lists.flat() };
}

export async function collectSocialPerformance(env: Env, days: number): Promise<SocialPerformance> {
  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const [m, p] = await Promise.all([
    metricool(env, days).catch((e) => ({ brands: [], error: `Metricool: ${(e as Error).message}` })),
    publer(env).catch((e) => ({ accounts: [], error: `Publer: ${(e as Error).message}` })),
  ]);
  const value: SocialPerformance = {
    generatedAt: new Date().toISOString(), days, brands: m.brands, publerAccounts: p.accounts,
    errors: [m.error, p.error].filter(Boolean) as string[],
  };
  cache.set(days, { at: Date.now(), value });
  return value;
}
