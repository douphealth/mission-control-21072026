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

const UA = "Mozilla/5.0 (compatible; MissionControl/1.0)";

export async function httpGet(
  url: string,
  timeoutMs = 12_000,
  retries = 1,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.5",
          "Accept-Language": "en-US,en;q=0.9,el;q=0.8",
          "Cache-Control": "no-cache",
        },
        signal: ctrl.signal,
        redirect: "follow",
      });

      if (res.ok) return await res.text();

      const retryable = [408, 425, 429, 500, 502, 503, 504].includes(res.status);
      const retryAfterRaw = res.headers.get("retry-after");
      const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : NaN;
      lastError = new Error(`HTTP ${res.status}`);

      if (!retryable || attempt >= retries) throw lastError;

      const delayMs = Number.isFinite(retryAfterSeconds)
        ? Math.min(5_000, Math.max(250, retryAfterSeconds * 1_000))
        : Math.min(2_500, 300 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      lastError = error;
      const name = error instanceof Error ? error.name : "";
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        name === "AbortError" ||
        /HTTP (408|425|429|500|502|503|504)\b/.test(message);

      if (!retryable || attempt >= retries) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(2_500, 300 * 2 ** attempt)),
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
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
    const source = stripTags(tag(block, "source") ?? "") || undefined;
    const sourceTag = block.match(/<source[^>]*url=["']([^"']+)["'][^>]*>/i);
    out.push({
      title,
      url,
      summary: desc ? stripTags(desc).slice(0, 400) : undefined,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined,
      source,
      sourceUrl: sourceTag ? decodeEntities(sourceTag[1]) : undefined,
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
