import { afterEach, describe, expect, it, vi } from "vitest";
import type { AudienceReading } from "../db";
import { audienceMeasurementSummary } from "../audienceMeasurements";
import { audienceProfileKey } from "../audienceEvidence";
import { readAudience } from "../audienceProviders.server";
import { parseFeed } from "../controlCenter.server";
import { isTrustedAudienceReading } from "../intelligenceQuality";
import { buildIntelligenceCapture } from "../intelligenceCapture";

const now = Date.parse("2026-11-03T12:00:00Z");
const reading = (changes: Partial<AudienceReading> = {}): AudienceReading => ({
  id: "reading", accountId: "profile", capturedAt: "2026-11-03T11:00:00Z", followers: 120,
  status: "ok", method: "official-api", provider: "GitHub REST API", providerAccountId: "123",
  identityVerified: true, metricSemantics: "exact", ...changes,
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("audience measurements retain their actual meaning", () => {
  it("does not show an old successful reading as current", () => {
    const result = audienceMeasurementSummary([reading({ capturedAt: "2026-10-31T12:00:00Z" })], { lastStatus: "ok" }, now);
    expect(result.latest?.followers).toBe(120);
    expect(result.current).toBe(false);
  });

  it("keeps a current valid zero and marks a subsequent provider failure", () => {
    const rows = [reading({ followers: 0 })];
    expect(audienceMeasurementSummary(rows, { lastStatus: "ok" }, now).current).toBe(true);
    const failure = audienceMeasurementSummary(rows, { lastStatus: "unavailable" }, now);
    expect(failure.current).toBe(false);
    expect(failure.latest?.followers).toBe(0);
  });

  it("uses only the same provider, identity and metric definition for history and growth", () => {
    const rows = [
      reading({ id: "other-provider", provider: "Public page", method: "public-page", followers: 999, capturedAt: "2026-11-01T09:00:00Z" }),
      reading({ id: "other-identity", providerAccountId: "other", followers: 999, capturedAt: "2026-11-01T10:00:00Z" }),
      reading({ id: "rounded", metricSemantics: "rounded", followers: 100, capturedAt: "2026-11-01T11:00:00Z" }),
      reading({ id: "prior", followers: 110, capturedAt: "2026-11-02T11:00:00Z" }),
      reading(),
    ];
    const result = audienceMeasurementSummary(rows, { lastStatus: "ok" }, now);
    expect(result.series.map(item => item.id)).toEqual(["prior", "reading"]);
    expect(result.delta).toBe(10);
  });

  it("never calculates exact growth from rounded YouTube measurements", () => {
    const result = audienceMeasurementSummary([
      reading({ id: "prior", followers: 12000, metricSemantics: "rounded", capturedAt: "2026-11-02T11:00:00Z" }),
      reading({ followers: 12100, metricSemantics: "rounded" }),
    ], { lastStatus: "ok" }, now);
    expect(result.series).toHaveLength(2);
    expect(result.delta).toBeNull();
  });

  it("ignores invalid and future timestamps when finding the latest measurement", () => {
    const result = audienceMeasurementSummary([
      reading(), reading({ id: "future", capturedAt: "2027-01-01T00:00:00Z" }),
      reading({ id: "invalid", capturedAt: "invalid" }),
    ], { lastStatus: "ok" }, now);
    expect(result.latest?.id).toBe("reading");
  });

  it("requires explicit identity proof for official API results too", () => {
    expect(isTrustedAudienceReading(reading({ identityVerified: false }))).toBe(false);
    expect(isTrustedAudienceReading(reading({ identityVerified: undefined }))).toBe(false);
  });

  it("quarantines historic Facebook measurements that may have substituted likes", () => {
    expect(isTrustedAudienceReading(reading({ provider: "Facebook Graph API" }))).toBe(false);
    expect(isTrustedAudienceReading(reading({ provider: "Facebook Graph API — followers_count" }))).toBe(true);
  });

  it("never substitutes Facebook likes when the follower count is absent", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "12", username: "target", fan_count: 9400 }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await readAudience("facebook", "https://facebook.com/target");
    expect(result.followers).toBeNull();
    expect(result.status).toBe("limited");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("fields")).not.toContain("fan_count");
  });

  it("accepts actual Facebook followers, including zero", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "12", username: "target", followers_count: 0, fan_count: 9400 }), { headers: { "content-type": "application/json" } })));
    const result = await readAudience("facebook", "https://facebook.com/target");
    expect(result.followers).toBe(0);
    expect(isTrustedAudienceReading(result)).toBe(true);
  });

  it("deduplicates profile aliases while preserving case-sensitive channel IDs", () => {
    expect(audienceProfileKey("x", "https://twitter.com/Target/?utm_source=share")).toBe(audienceProfileKey("x", "https://x.com/target"));
    expect(audienceProfileKey("github", "https://www.github.com/Target/")).toBe(audienceProfileKey("github", "https://github.com/target"));
    expect(audienceProfileKey("youtube", "https://youtube.com/channel/UCabcdefghijklmnopqrstuv")).not.toBe(audienceProfileKey("youtube", "https://youtube.com/channel/UCABCDEFGHIJKLMNOPQRSTUV"));
  });
});

describe("publisher feed article links", () => {
  it("chooses Atom article alternate links instead of rel=self API links", () => {
    const [item] = parseFeed('<feed><entry><title>Release notes</title><link rel="self" href="https://example.com/api/1"/><link rel="alternate" href="/releases/1"/></entry></feed>', "https://example.com/feed.xml");
    expect(item.url).toBe("https://example.com/releases/1");
  });

  it("does not render active or credential-bearing feed URLs", () => {
    const feed = (url: string) => `<feed><entry><title>Untrusted</title><link rel="alternate" href="${url}"/></entry></feed>`;
    expect(parseFeed(feed("javascript:alert(1)"))).toHaveLength(0);
    expect(parseFeed(feed("https://username:password@example.com/"))).toHaveLength(0);
  });

  it("retains an article while rejecting an unsafe publisher attribution URL", () => {
    const [item] = parseFeed('<rss><channel><item><title>Article</title><link>https://example.com/article</link><source url="javascript:alert(1)">Publisher</source></item></channel></rss>');
    expect(item.url).toBe("https://example.com/article");
    expect(item.sourceUrl).toBeUndefined();
  });
});

describe("intelligence follow-up captures", () => {
  it("keeps the real source and evidence without inventing a deadline", () => {
    const item = { id: "story-1", kind: "mention" as const, title: "A reported launch", url: "https://example.com/report", source: "Publisher", publishedAt: "2026-11-03T10:00:00Z", dateBasis: "published" as const, discoveredAt: "2026-11-03T11:00:00Z", score: 75, status: "active" as const, matchedTerm: "Brand", verificationReason: "Exact brand in title" };
    const capture = buildIntelligenceCapture(item, "2026-11-03T12:00:00Z");
    expect(capture.inbox).toBe(true);
    expect(capture.dueDate).toBe("");
    expect(capture.description).toContain(item.url);
    expect(capture.description).toContain(item.verificationReason);
    expect(capture.description).toContain("Published: 2026-11-03T10:00:00Z");
    expect(buildIntelligenceCapture(item).id).toBe(capture.id);
    expect(capture.createdAt).toBe("2026-11-03T12:00:00Z");
  });
});
