// Server-only collection helpers for the Control Center.
// Pure fetch + string parsing — no DOM, no native deps (Worker-safe).

export interface RawItem {
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  source?: string;
}

const UA = "Mozilla/5.0 (compatible; MissionControl/1.0; +https://mission-control-001.lovable.app)";

export async function httpGet(url: string, timeoutMs = 12_000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*", "Accept-Language": "en,el;q=0.8" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

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

function linkFrom(block: string): string | undefined {
  const plain = tag(block, "link");
  if (plain && /^https?:/i.test(plain.trim())) return plain.trim();
  const href = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  if (href) return decodeEntities(href[1]);
  const guid = tag(block, "guid");
  if (guid && /^https?:/i.test(guid)) return guid;
  return undefined;
}

/** Parse RSS 2.0 / Atom into items. Tolerant of malformed feeds. */
export function parseFeed(xml: string): RawItem[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const out: RawItem[] = [];
  for (const block of blocks) {
    const title = stripTags(tag(block, "title") ?? "");
    const url = linkFrom(block);
    if (!title || !url) continue;
    const dateRaw =
      tag(block, "pubDate") ??
      tag(block, "published") ??
      tag(block, "updated") ??
      tag(block, "dc:date");
    const parsed = dateRaw ? new Date(dateRaw) : null;
    const desc = tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content");
    out.push({
      title,
      url,
      summary: desc ? stripTags(desc).slice(0, 400) : undefined,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined,
    });
  }
  return out;
}

/** Find a feed URL from a homepage: <link rel=alternate> then common paths. */
export async function discoverFeed(pageUrl: string): Promise<string | null> {
  const base = new URL(pageUrl);
  try {
    const html = await httpGet(base.toString());
    if (/<(rss|feed)[\s>]/i.test(html.slice(0, 2000))) return base.toString();
    const links = html.match(/<link[^>]+>/gi) ?? [];
    for (const l of links) {
      if (!/rel=["']?alternate/i.test(l)) continue;
      if (!/type=["'][^"']*(rss|atom)\+xml/i.test(l)) continue;
      const href = l.match(/href=["']([^"']+)["']/i);
      if (href) return new URL(decodeEntities(href[1]), base).toString();
    }
  } catch {
    /* homepage may be blocked — fall through to common paths */
  }
  const candidates = [
    "/feed",
    "/rss",
    "/rss.xml",
    "/feed.xml",
    "/atom.xml",
    "/index.xml",
    "/blog/feed",
  ];
  for (const path of candidates) {
    try {
      const url = new URL(path, base).toString();
      const body = await httpGet(url, 8000);
      if (/<(rss|feed)[\s>]/i.test(body.slice(0, 2000))) return url;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function googleNewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Public-page audience metrics. Best effort; never invents a zero. */
export async function readAudience(
  platform: string,
  url: string,
): Promise<{
  followers: number | null;
  posts: number | null;
  status: "ok" | "unavailable" | "limited";
}> {
  let html = "";
  try {
    html = await httpGet(url, 12_000);
  } catch {
    return { followers: null, posts: null, status: "unavailable" };
  }

  const num = (raw: string): number | null => {
    const cleaned = raw.replace(/[,\s]/g, "").toUpperCase();
    const m = cleaned.match(/^([\d.]+)([KMB])?$/);
    if (!m) return null;
    const base = parseFloat(m[1]);
    if (!Number.isFinite(base)) return null;
    const mult = m[2] === "K" ? 1e3 : m[2] === "M" ? 1e6 : m[2] === "B" ? 1e9 : 1;
    return Math.round(base * mult);
  };

  const patterns: Record<string, RegExp[]> = {
    youtube: [
      /"subscriberCountText":\{"simpleText":"([^"]+?) subscribers?"/i,
      /([\d.,]+[KMB]?) subscribers/i,
    ],
    x: [/([\d.,]+[KMB]?)\s*Followers/i, /"followers_count":(\d+)/i],
    instagram: [/"edge_followed_by":\{"count":(\d+)\}/i, /([\d.,]+[KMB]?) Followers/i],
    facebook: [/([\d.,]+[KMB]?)\s*(?:followers|people follow)/i],
    linkedin: [/([\d.,]+[KMB]?)\s*followers/i],
    threads: [/([\d.,]+[KMB]?)\s*followers/i],
    tiktok: [/"followerCount":(\d+)/i, /([\d.,]+[KMB]?)\s*Followers/i],
  };

  for (const re of patterns[platform] ?? []) {
    const m = html.match(re);
    const v = m ? num(m[1]) : null;
    if (v !== null && v >= 0) {
      const postsMatch = html.match(
        /"(?:videoCount|edge_owner_to_timeline_media|videoCountText)"[^\d]{0,20}(\d+)/i,
      );
      return { followers: v, posts: postsMatch ? Number(postsMatch[1]) : null, status: "ok" };
    }
  }
  return { followers: null, posts: null, status: "limited" };
}
