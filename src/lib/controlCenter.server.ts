// Server-only collection helpers for the Control Center.
// Pure fetch + string parsing — no DOM, no native deps (Worker-safe).


export interface RawItem {
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  source?: string;
  sourceUrl?: string;
}

import { fetchPublicFeed, publicFeedUrl } from "./publicFeedFetch.server";
export const httpGet = fetchPublicFeed;

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]).trim() : undefined;
}

function safeArticleUrl(value: string | undefined, baseUrl?: string): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, baseUrl);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return undefined;
    return /^https?:\/\//i.test(value) ? value : parsed.toString();
  } catch { return undefined; }
}

function linkFrom(block: string, baseUrl?: string): string | undefined {
  const plain = tag(block, "link");
  if (plain && safeArticleUrl(plain.trim(), baseUrl)) return safeArticleUrl(plain.trim(), baseUrl);
  // Atom feeds commonly put their rel=self API URL before the article link.
  for (const link of block.match(/<link\b[^>]*>/gi) ?? []) {
    const relation = link.match(/\brel=["']([^"']+)["']/i)?.[1];
    if (relation && relation.toLowerCase() !== "alternate") continue;
    const href = link.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const url = safeArticleUrl(href ? decodeEntities(href) : undefined, baseUrl);
    if (url) return url;
  }
  const guid = tag(block, "guid");
  if (guid && /^https?:/i.test(guid)) return safeArticleUrl(guid);
  return undefined;
}

/** Parse RSS 2.0 / Atom into items. Tolerant of malformed feeds. */
export function parseFeed(xml: string, baseUrl?: string): RawItem[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const out: RawItem[] = [];
  for (const block of blocks) {
    const title = stripTags(tag(block, "title") ?? "");
    const url = linkFrom(block, baseUrl);
    if (!title || !url) continue;
    const dateRaw =
      tag(block, "pubDate") ??
      tag(block, "published") ??
      tag(block, "updated") ??
      tag(block, "dc:date");
    const parsed = dateRaw ? new Date(dateRaw) : null;
    const desc = tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content");
    const source = stripTags(tag(block, "source") ?? "") || undefined;
    const sourceTag = block.match(/<source[^>]*url=["']([^"']+)["'][^>]*>/i);
    out.push({
      title,
      url,
      summary: desc ? stripTags(desc).slice(0, 400) : undefined,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined,
      source,
      sourceUrl: sourceTag ? safeArticleUrl(decodeEntities(sourceTag[1]), baseUrl) : undefined,
    });
  }
  return out;
}

/** Find a feed URL from a homepage: <link rel=alternate> then common paths. */
export async function discoverFeed(pageUrl: string): Promise<string | null> {
  const base = publicFeedUrl(pageUrl);
  try {
    const html = await httpGet(base.toString(), 6000, 0);
    if (/<(rss|feed)[\s>]/i.test(html.slice(0, 2000))) return base.toString();
    const links = html.match(/<link[^>]+>/gi) ?? [];
    for (const l of links) {
      if (!/rel=["']?alternate/i.test(l)) continue;
      if (!/type=["'][^"']*(rss|atom)\+xml/i.test(l)) continue;
      const href = l.match(/href=["']([^"']+)["']/i);
      if (href) return publicFeedUrl(new URL(decodeEntities(href[1]), base).toString()).toString();
    }
  } catch {
    /* homepage may be blocked — fall through to common paths */
  }
  const candidates = [
    "/feed",
    "/rss",
    "/rss.xml",
    "/feed.xml",

  ];
  for (const path of candidates) {
    try {
      const url = new URL(path, base).toString();
      const body = await httpGet(url, 4500, 0);
      if (/<(rss|feed)[\s>]/i.test(body.slice(0, 2000))) return url;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function googleNewsUrl(
  query: string,
  locale?: { hl: string; gl: string; ceid: string },
): string {
  const resolved =
    locale ??
    (/[Ͱ-Ͽἀ-῿]/i.test(query)
      ? { hl: "el", gl: "GR", ceid: "GR:el" }
      : { hl: "en-US", gl: "US", ceid: "US:en" });
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(resolved.hl)}&gl=${encodeURIComponent(resolved.gl)}&ceid=${encodeURIComponent(resolved.ceid)}`;
}

export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
export { readAudience } from "./audienceProviders.server";
