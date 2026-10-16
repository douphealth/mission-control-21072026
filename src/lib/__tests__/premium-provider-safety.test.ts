import { describe, it, expect, vi, afterEach } from "vitest";
import { publicFeedUrl, assertFeedDocument, fetchPublicFeed } from "@/lib/publicFeedFetch.server";
import { repositoryIdentity, readRepositoryOverview } from "@/lib/repositoryOverview";
afterEach(() => vi.unstubAllGlobals());
describe("public feed safety", () => {
  it.each(["http://127.0.0.1/feed", "http://169.254.169.254/", "https://user:password@example.com/", "file:///etc/hosts", "https://service.local/rss", "http://[::1]/"])("rejects unsafe public feed input %s", raw => expect(() => publicFeedUrl(raw)).toThrow());
  it("distinguishes an empty RSS feed from an HTML challenge", () => { expect(() => assertFeedDocument('<?xml version="1.0"?><rss><channel></channel></rss>')).not.toThrow(); expect(() => assertFeedDocument("<html><title>Just a moment</title></html>")).toThrow(/not an RSS/); });
  it("checks a redirect before fetching its destination", async () => { const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } })); vi.stubGlobal("fetch", fetch); await expect(fetchPublicFeed("https://publisher.example/feed")).rejects.toThrow(); expect(fetch).toHaveBeenCalledTimes(1); });
  it("bounds response sizes", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("huge", { headers: { "content-length": "3000000" } }))); await expect(fetchPublicFeed("https://another-publisher.example/feed")).rejects.toThrow(/2 MB/); });
});
describe("repository metadata", () => {
  it("accepts only exact repository URLs", () => { expect(repositoryIdentity("https://github.com/example/project.git").repo).toBe("project"); expect(() => repositoryIdentity("https://github.com/example/project/issues")).toThrow(); expect(() => repositoryIdentity("https://not-github.example/example/project")).toThrow(); });
  it("deduplicates concurrent requests and treats a measured zero as valid", async () => { const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ full_name: "fixture/repo", stargazers_count: 0, forks_count: 0, open_issues_count: 3, size: 24, default_branch: "main", visibility: "public" }))); vi.stubGlobal("fetch", fetch); const [a, b] = await Promise.all([readRepositoryOverview("https://github.com/fixture/repo"), readRepositoryOverview("https://github.com/fixture/repo")]); expect(a.stars).toBe(0); expect(a.openItems).toBe(3); expect(a.fetchedAt).toBe(b.fetchedAt); expect(fetch).toHaveBeenCalledTimes(1); });
});
