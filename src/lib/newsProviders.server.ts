import {
  googleNewsUrl,
  hostOf,
  httpGet,
  parseFeed,
  type RawItem,
} from "./controlCenter.server";

export type NewsProvider = "dataforseo" | "google-news" | "bing-news";

export interface NewsCoverageItem extends RawItem {
  retrievalProvider: NewsProvider;
  retrievalProviders: NewsProvider[];
}

export interface NewsProviderStatus {
  provider: NewsProvider;
  ok: boolean;
  itemCount: number;
  error?: string;
  configured?: boolean;
}

export interface NewsCoverageResult {
  items: NewsCoverageItem[];
  providers: NewsProviderStatus[];
  degraded: boolean;
  allFailed: boolean;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

function isGreekQuery(query: string): boolean {
  return /[\u0370-\u03ff\u1f00-\u1fff]/u.test(query);
}

function providerLabel(provider: NewsProvider): string {
  if (provider === "dataforseo") return "DataForSEO Google News";
  if (provider === "bing-news") return "Bing News";
  return "Google News";
}

function cleanError(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|msclkid|ref|source)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString().replace(/\?$/, "");
  } catch {
    return raw.trim();
  }
}

function parseTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function sourceUrlFromDomain(domain: unknown): string | undefined {
  if (typeof domain !== "string" || !domain.trim()) return undefined;
  const clean = domain.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  try {
    return new URL(`https://${clean}`).toString();
  } catch {
    return undefined;
  }
}

function flattenDataForSeoItems(value: unknown, out: Array<Record<string, unknown>>) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenDataForSeoItems(item, out));
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const url = typeof record.url === "string" ? record.url.trim() : "";
  const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
  const source = typeof record.source === "string" ? record.source.trim() : "";
  const domain = typeof record.domain === "string" ? record.domain.trim() : "";

  if (
    title &&
    /^https?:\/\//i.test(url) &&
    (type.includes("news") || type.includes("top_stories") || source || domain)
  ) {
    out.push(record);
  }

  const nested = record.items;
  if (Array.isArray(nested)) flattenDataForSeoItems(nested, out);
}

function dataForSeoCredentials(): { login: string; password: string } | null {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  return login && password ? { login, password } : null;
}

async function dataForSeoNews(query: string): Promise<RawItem[] | null> {
  const credentials = dataForSeoCredentials();
  if (!credentials) return null;

  const auth = btoa(`${credentials.login}:${credentials.password}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const greek = isGreekQuery(query);
    const response = await fetch(
      "https://api.dataforseo.com/v3/serp/google/news/live/advanced",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify([
          {
            keyword: query,
            location_code: greek ? 2300 : 2840,
            language_code: greek ? "el" : "en",
            device: "desktop",
            os: "windows",
            depth: 30,
          },
        ]),
      },
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as {
      status_code?: number;
      status_message?: string;
      tasks?: Array<{
        status_code?: number;
        status_message?: string;
        result?: Array<{ items?: unknown[] }>;
      }>;
    };

    if (json.status_code && json.status_code !== 20000) {
      throw new Error(json.status_message || `DataForSEO status ${json.status_code}`);
    }
    const task = json.tasks?.[0];
    if (task?.status_code && task.status_code !== 20000) {
      throw new Error(task.status_message || `DataForSEO task status ${task.status_code}`);
    }

    const flattened: Array<Record<string, unknown>> = [];
    flattenDataForSeoItems(task?.result?.[0]?.items ?? [], flattened);

    const items: RawItem[] = [];
    for (const item of flattened) {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const url = typeof item.url === "string" ? item.url.trim() : "";
      if (!title || !url) continue;
      const source =
        (typeof item.source === "string" && item.source.trim()) ||
        (typeof item.domain === "string" && item.domain.trim()) ||
        hostOf(url);
      const summary =
        (typeof item.snippet === "string" && item.snippet.trim()) ||
        (typeof item.description === "string" && item.description.trim()) ||
        undefined;
      const publishedAt =
        parseTimestamp(item.timestamp) ||
        parseTimestamp(item.time_published) ||
        parseTimestamp(item.date);
      items.push({
        title,
        url,
        summary: summary?.slice(0, 500),
        publishedAt,
        source,
        sourceUrl: sourceUrlFromDomain(item.domain),
      });
    }
    return items;
  } finally {
    clearTimeout(timeout);
  }
}

export function bingNewsUrl(query: string): string {
  const language = isGreekQuery(query) ? "el-GR" : "en-US";
  const params = new URLSearchParams({
    q: query,
    format: "rss",
    setlang: language,
  });
  return `https://www.bing.com/news/search?${params.toString()}`;
}

function withinDays(item: RawItem, days: number, now = Date.now()): boolean {
  if (!item.publishedAt) return true;
  const ts = new Date(item.publishedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts <= now + 5 * 60_000 && ts >= now - days * 86_400_000;
}

async function googleNews(query: string, days: number): Promise<RawItem[]> {
  const xml = await httpGet(googleNewsUrl(`${query} when:${days}d`), 10_000, 2);
  return parseFeed(xml).filter((item) => withinDays(item, days));
}

async function bingNews(query: string, days: number): Promise<RawItem[]> {
  const xml = await httpGet(bingNewsUrl(query), 10_000, 2);
  return parseFeed(xml).filter((item) => withinDays(item, days));
}

export function mergeNewsCoverage(
  results: Array<{ provider: NewsProvider; items: RawItem[] }>,
): NewsCoverageItem[] {
  const merged = new Map<string, NewsCoverageItem>();

  for (const result of results) {
    for (const item of result.items) {
      const key = canonicalUrl(item.url);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          ...item,
          retrievalProvider: result.provider,
          retrievalProviders: [result.provider],
        });
        continue;
      }

      if (!existing.retrievalProviders.includes(result.provider)) {
        existing.retrievalProviders.push(result.provider);
      }
      if (!existing.summary && item.summary) existing.summary = item.summary;
      if (!existing.publishedAt && item.publishedAt) existing.publishedAt = item.publishedAt;
      if (!existing.source && item.source) existing.source = item.source;
      if (!existing.sourceUrl && item.sourceUrl) existing.sourceUrl = item.sourceUrl;
    }
  }

  return [...merged.values()];
}

export async function searchNewsCoverage(query: string, days: number): Promise<NewsCoverageResult> {
  const configuredDataForSeo = Boolean(dataForSeoCredentials());
  const providers: Array<{
    provider: NewsProvider;
    configured: boolean;
    run: () => Promise<RawItem[] | null>;
  }> = [
    {
      provider: "dataforseo",
      configured: configuredDataForSeo,
      run: () => dataForSeoNews(query),
    },
    {
      provider: "google-news",
      configured: true,
      run: () => googleNews(query, days),
    },
    {
      provider: "bing-news",
      configured: true,
      run: () => bingNews(query, days),
    },
  ];

  const active = providers.filter((provider) => provider.configured);
  const settled = await Promise.all(
    active.map(async (provider) => {
      try {
        const items = (await provider.run()) ?? [];
        return {
          provider: provider.provider,
          items,
          status: {
            provider: provider.provider,
            ok: true,
            itemCount: items.length,
            configured: true,
          } satisfies NewsProviderStatus,
        };
      } catch (error) {
        return {
          provider: provider.provider,
          items: [] as RawItem[],
          status: {
            provider: provider.provider,
            ok: false,
            itemCount: 0,
            configured: true,
            error: `${providerLabel(provider.provider)}: ${cleanError(error)}`,
          } satisfies NewsProviderStatus,
        };
      }
    }),
  );

  if (!configuredDataForSeo) {
    settled.unshift({
      provider: "dataforseo",
      items: [],
      status: {
        provider: "dataforseo",
        ok: false,
        itemCount: 0,
        configured: false,
        error: "DataForSEO not configured",
      },
    });
  }

  const successful = settled.filter((entry) => entry.status.ok);
  const usable = successful.filter((entry) => entry.items.length > 0);
  return {
    items: mergeNewsCoverage(usable.map((entry) => ({ provider: entry.provider, items: entry.items }))),
    providers: settled.map((entry) => entry.status),
    degraded: settled.some((entry) => entry.status.configured && !entry.status.ok),
    allFailed: active.length > 0 && successful.length === 0,
  };
}

export function summarizeProviderFailures(result: NewsCoverageResult): string[] {
  return result.providers
    .filter((provider) => provider.configured && !provider.ok && provider.error)
    .map((provider) => provider.error as string);
}

export function providerEvidence(provider: NewsProvider): string {
  return providerLabel(provider);
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE.has(status);
}
