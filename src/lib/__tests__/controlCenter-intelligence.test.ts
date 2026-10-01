import { describe, expect, it } from "vitest";
import { parseFeed } from "../controlCenter.server";
import { canonicalUrl, localScore } from "../controlCenter";

describe("control-center intelligence evidence", () => {
  it("preserves publisher name and publisher URL from RSS source metadata", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel><item>
        <title>Search platform ships an indexing update</title>
        <link>https://news.google.com/articles/example</link>
        <pubDate>Wed, 01 Oct 2026 07:00:00 GMT</pubDate>
        <description>Material search indexing update.</description>
        <source url="https://example.com">Example Publisher</source>
      </item></channel></rss>`;
    const item = parseFeed(xml)[0];
    expect(item.source).toBe("Example Publisher");
    expect(item.sourceUrl).toBe("https://example.com");
    expect(item.publishedAt).toContain("2026-10-01");
  });

  it("canonicalizes tracking-noisy URLs before deduplication", () => {
    expect(
      canonicalUrl("https://example.com/story/?utm_source=x&fbclid=123#section"),
    ).toBe("https://example.com/story");
  });

  it("gives fresher relevant stories more local importance than stale unrelated ones", () => {
    const fresh = localScore(
      {
        title: "Google Search ranking update released",
        summary: "A ranking update affects indexing and search visibility.",
        publishedAt: new Date().toISOString(),
      },
      ["Google Search", "ranking", "indexing"],
    );
    const stale = localScore(
      {
        title: "Unrelated company office story",
        summary: "General background information.",
        publishedAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      },
      ["Google Search", "ranking", "indexing"],
    );
    expect(fresh).toBeGreaterThan(stale);
  });
});
