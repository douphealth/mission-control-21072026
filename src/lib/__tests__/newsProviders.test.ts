import { describe, expect, it } from "vitest";
import { bingNewsUrl, mergeNewsCoverage } from "@/lib/newsProviders.server";

describe("news provider resilience", () => {
  it("builds a Bing News RSS query URL", () => {
    const url = new URL(bingNewsUrl("Google spam update"));
    expect(url.hostname).toBe("www.bing.com");
    expect(url.pathname).toBe("/news/search");
    expect(url.searchParams.get("q")).toBe("Google spam update");
    expect(url.searchParams.get("format")).toBe("rss");
  });

  it("merges provider provenance without losing publisher evidence", () => {
    const items = mergeNewsCoverage([
      {
        provider: "google-news",
        items: [{
          title: "Example launches update",
          url: "https://example.com/story",
          source: "Example",
          sourceUrl: "https://example.com/",
          publishedAt: "2026-10-01T08:00:00.000Z",
        }],
      },
      {
        provider: "bing-news",
        items: [{
          title: "Example launches update",
          url: "https://example.com/story?utm_source=bing",
          publishedAt: "2026-10-01T08:00:00.000Z",
        }],
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].retrievalProviders.sort()).toEqual(["bing-news", "google-news"]);
    expect(items[0].sourceUrl).toBe("https://example.com/");
  });

  it("derives publisher origin when a provider omits source metadata", () => {
    const items = mergeNewsCoverage([
      {
        provider: "bing-news",
        items: [{
          title: "Mice Gone Guide coverage",
          url: "https://micegoneguide.com/example-story",
        }],
      },
    ]);

    expect(items[0].source).toBe("micegoneguide.com");
    expect(items[0].sourceUrl).toBe("https://micegoneguide.com/");
  });
});
