import { parseFeed, googleNewsUrl, hostOf, type RawItem } from './controlCenter.server';
import { canonicalWebUrl, isRecentIso } from './intelligenceQuality';
import { mapLimited } from './intelligenceRunQuality';

export interface MentionCoverage {
  items: RawItem[];
  providers: Array<{ name: string; ok: boolean; count: number; error?: string }>;
  fetchedAt: string;
  cached: boolean;
}
const cache = new Map<string, { expires: number; value: MentionCoverage }>();
const pending = new Map<string, Promise<MentionCoverage>>();
const cooldown = new Map<string, number>();
async function request(url: string, init: RequestInit = {}): Promise<string> {
  const host = new URL(url).hostname;
  if ((cooldown.get(host) || 0) > Date.now()) throw new Error('Provider temporarily rate-limited or unavailable; retry after cooldown.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const r = await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
    if (!r.ok) {
      if ([429, 503].includes(r.status)) cooldown.set(host, Date.now() + 60_000);
      throw new Error(`Provider HTTP ${r.status}`);
    }
    const text = await r.text();
    if (text.length > 3_000_000) throw new Error('Provider response exceeded the size limit');
    return text;
  } finally { clearTimeout(timer); }
}
function unwrapBing(item: RawItem): RawItem {
  let url = item.url;
  try {
    const u = new URL(url);
    if (u.hostname === 'bing.com' || u.hostname.endsWith('.bing.com')) {
      const target = u.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) url = target;
    }
  } catch { /* Retain the attributed result, never invent a target. */ }
  return { ...item, url, source: item.source || hostOf(url), sourceUrl: item.sourceUrl || new URL(url).origin };
}
async function rss(url: string) {
  const xml = await request(url, { headers: {
    Accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml',
    'User-Agent': 'MissionControl/2.0 coverage-monitor',
  } });
  if (!/<(?:rss|feed)\b/i.test(xml)) throw new Error('Provider returned a non-feed response, not a successful empty search.');
  return parseFeed(xml).slice(0, 30).map(unwrapBing);
}
async function organic(query: string): Promise<RawItem[]> {
  const greek = /[\u0370-\u03ff]/u.test(query);
  const body = await request('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
    method: 'POST', headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`)}`,
    },
    body: JSON.stringify([{ keyword: query, location_code: greek ? 2300 : 2840, language_code: greek ? 'el' : 'en', depth: 10 }]),
  });
  const result = JSON.parse(body);
  const task = result.tasks?.[0];
  if (result.status_code !== 20000 || task?.status_code !== 20000 || !Array.isArray(task.result)) {
    throw new Error('DataForSEO did not return a successful search task.');
  }
  return (task.result[0]?.items || [])
    .filter((i: any) => i.type === 'organic' && typeof i.title === 'string' && /^https?:\/\//i.test(i.url || ''))
    .map((i: any) => {
      const timestamp = typeof i.timestamp === 'string' ? Date.parse(i.timestamp) : NaN;
      return {
        title: i.title, url: i.url,
        summary: typeof i.description === 'string' ? i.description.slice(0, 600) : undefined,
        publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined,
        source: i.domain || hostOf(i.url), sourceUrl: new URL(i.url).origin,
      };
    });
}
export async function searchExternalMentions(query: string): Promise<MentionCoverage> {
  const cached = cache.get(query);
  if (cached && cached.expires > Date.now()) return { ...cached.value, cached: true };
  if (pending.has(query)) return pending.get(query)!;
  const operation = (async () => {
    const hasOrganicApi = Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
    const sources = [
      {
        name: hasOrganicApi ? 'DataForSEO web search' : 'Bing web RSS',
        run: () => hasOrganicApi ? organic(query) : rss(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`),
      },
      { name: 'Google News RSS', run: () => rss(googleNewsUrl(`${query} when:30d`)) },
    ];
    const results = await mapLimited(sources, 2, async source => {
      try {
        const items = await source.run();
        return { items, status: { name: source.name, ok: true, count: items.length, error: undefined as string | undefined } };
      } catch (error) {
        return { items: [] as RawItem[], status: {
          name: source.name, ok: false, count: 0,
          error: error instanceof Error ? error.message : 'Provider unavailable',
        } };
      }
    });
    const dedup = new Map<string, RawItem>();
    for (const { items } of results) for (const item of items) {
      // Undated web results are discovery evidence, never asserted to be new publications.
      if (item.publishedAt && !isRecentIso(item.publishedAt, 30)) continue;
      dedup.set(canonicalWebUrl(item.url), item);
    }
    const value: MentionCoverage = {
      items: [...dedup.values()], providers: results.map(r => r.status),
      fetchedAt: new Date().toISOString(), cached: false,
    };
    if (value.providers.some(p => p.ok)) {
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(query, { expires: Date.now() + 5 * 60_000, value });
    }
    return value;
  })().finally(() => pending.delete(query));
  pending.set(query, operation);
  return operation;
}
