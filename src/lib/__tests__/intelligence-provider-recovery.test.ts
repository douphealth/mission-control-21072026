import { afterEach, describe, expect, it, vi } from "vitest";
import { readAudience } from "../audienceProviders.server";
import { discoverFeed, readSourceFeed } from "../controlCenter.server";
import { mergeNewsCoverage } from "../newsProviders.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const feed = (title = "Release") => `<rss><channel><item><title>${title}</title><link>https://publisher.test/article</link><pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
const profileHtml = '<html><script type="application/json">{"username":"gearuptofit","edge_followed_by":{"count":0},"edge_owner_to_timeline_media":{"count":12}}</script></html>';

describe("audience requests on the Cloudflare runtime", () => {
  it("uses supported manual redirects and accepts an identity-bound measured zero", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", ""); vi.stubEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "");
    const fetch = vi.fn().mockImplementation(async (_url, init) => {
      if (init.redirect === "error") throw new Error("Invalid redirect value at the edge");
      return new Response(profileHtml, { headers: { "content-type": "text/html" } });
    });
    vi.stubGlobal("fetch", fetch);
    const result = await readAudience("instagram", "https://www.instagram.com/gearuptofit/");
    expect(result).toMatchObject({ status: "ok", followers: 0, identityVerified: true });
    expect(fetch.mock.calls[0][1].redirect).toBe("manual");
  });

  it("allows a public profile's same-platform canonical redirect", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", ""); vi.stubEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "");
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "https://www.instagram.com/gearuptofit/" } })).mockResolvedValueOnce(new Response(profileHtml));
    vi.stubGlobal("fetch", fetch);
    expect((await readAudience("instagram", "https://instagram.com/gearuptofit/")).followers).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("never follows an authenticated API redirect or a public redirect to another platform", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://example.test/collect" } }));
    vi.stubGlobal("fetch", fetch);
    expect((await readAudience("x", "https://x.com/gearuptofit")).followers).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.stubEnv("META_ACCESS_TOKEN", ""); vi.stubEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "");
    const pageFetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://example.test/collect" } }));
    vi.stubGlobal("fetch", pageFetch);
    expect((await readAudience("instagram", "https://instagram.com/gearuptofit/")).followers).toBeNull();
    expect(pageFetch).toHaveBeenCalledTimes(1);
  });
});

describe("publisher feed discovery and recovery", () => {
  it("selects the official Google blog and GitHub changelog feeds instead of generic web pages", async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response(feed()));
    vi.stubGlobal("fetch", fetch);
    const google = await readSourceFeed("https://developers.google.com/search/blog", "https://developers.google.com/search/blog");
    const github = await readSourceFeed("https://github.blog/changelog/", "https://github.blog/feed/");
    expect(google.feedUrl).toBe("https://feeds.feedburner.com/blogspot/amDG");
    expect(github.feedUrl).toBe("https://github.blog/changelog/feed/");
    expect(google.items).toHaveLength(1); expect(github.items).toHaveLength(1);
  });

  it("discovers ordinary RSS anchor links and prefers the selected section over the root feed", async () => {
    const html = '<html><head><link rel="alternate" type="application/rss+xml" href="/feed/"/></head><body><a href="/news/feed/">Copy RSS feed URL</a></body></html>';
    const fetch = vi.fn().mockImplementation(async (url: string) => new Response(url === "https://publisher.test/news/" ? html : feed()));
    vi.stubGlobal("fetch", fetch);
    expect(await discoverFeed("https://publisher.test/news/")).toBe("https://publisher.test/news/feed/");
    expect(fetch.mock.calls.map(call => call[0])).toEqual(["https://publisher.test/news/", "https://publisher.test/news/feed/"]);
  });

  it("rediscovers after a cached feed becomes a webpage", async () => {
    const fetch = vi.fn().mockImplementation(async (url: string) => new Response(url === "https://publisher.test/broken.xml" ? '<html>Not a feed</html>' : url === "https://publisher.test/news/" ? '<a href="/news/feed/">RSS</a>' : feed()));
    vi.stubGlobal("fetch", fetch);
    const result = await readSourceFeed("https://publisher.test/news/", "https://publisher.test/broken.xml");
    expect(result.feedUrl).toBe("https://publisher.test/news/feed/");
    expect(result.items).toHaveLength(1);
  });

  it("merges a Bing wrapper and direct publisher URL without losing provider provenance", () => {
    const rows = mergeNewsCoverage([
      { provider: "bing-news", items: [{ title: "Release", url: `https://www.bing.com/news/apiclick.aspx?tid=1&url=${encodeURIComponent("https://publisher.test/article")}` }] },
      { provider: "google-news", items: [{ title: "Release", url: "https://publisher.test/article?utm_source=news", source: "Publisher", sourceUrl: "https://publisher.test/" }] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].url).toBe("https://publisher.test/article");
    expect(rows[0].retrievalProviders).toEqual(["bing-news", "google-news"]);
    expect(rows[0].sourceUrl).toBe("https://publisher.test/");
  });
});

describe("feed document check", () => {
  it("accepts an RSS feed whose items embed full HTML pages", async () => {
    const { assertFeedDocument } = await import("@/lib/publicFeedFetch.server");
    expect(() => assertFeedDocument('<?xml version="1.0"?><rss version="2.0"><channel><item><description><![CDATA[<!DOCTYPE html><html></html>]]></description></item></channel></rss>')).not.toThrow();
    expect(() => assertFeedDocument("<!doctype html><html><body>Challenge</body></html>")).toThrow();
  });
});
