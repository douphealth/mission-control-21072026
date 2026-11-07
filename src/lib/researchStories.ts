import { canonicalWebUrl } from "./intelligenceQuality";

export type SearchStory = {
  title: string; url: string; summary?: string; publishedAt?: string;
  source?: string; sourceUrl?: string; corroborationCount?: number;
  evidenceLevel?: "high" | "medium" | "limited"; evidenceReason?: string;
  relevanceScore?: number;
  retrievalProvider?: "dataforseo" | "google-news" | "bing-news";
  retrievalProviders?: Array<"dataforseo" | "google-news" | "bing-news">;
};
const strength = (story: SearchStory) => story.evidenceLevel === "high" ? 2 : story.evidenceLevel === "medium" ? 1 : 0;

/** Article identity, provenance and topic relevance are independent signals. */
export function mergeResearchStories(stories: SearchStory[]): SearchStory[] {
  const merged = new Map<string, SearchStory>();
  for (const story of stories) {
    const key = canonicalWebUrl(story.url);
    const existing = merged.get(key);
    if (!existing) { merged.set(key, { ...story }); continue; }
    const stronger = strength(story) > strength(existing) ? story : existing;
    const other = stronger === story ? existing : story;
    merged.set(key, {
      ...other, ...stronger,
      summary: stronger.summary || other.summary,
      publishedAt: stronger.publishedAt || other.publishedAt,
      source: stronger.source || other.source,
      sourceUrl: stronger.sourceUrl || other.sourceUrl,
      relevanceScore: Math.max(existing.relevanceScore || 0, story.relevanceScore || 0),
      corroborationCount: Math.max(existing.corroborationCount || 0, story.corroborationCount || 0),
      retrievalProviders: [...new Set([...existing.retrievalProviders || [], ...story.retrievalProviders || [], ...existing.retrievalProvider ? [existing.retrievalProvider] : [], ...story.retrievalProvider ? [story.retrievalProvider] : []])],
    });
  }
  return [...merged.values()].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0) || strength(b) - strength(a) || (b.publishedAt || "").localeCompare(a.publishedAt || ""));
}

export function matchesResearchEvidence(story: SearchStory, filter: "all" | "medium" | "high"): boolean {
  return filter === "all" || strength(story) >= (filter === "high" ? 2 : 1);
}

export function isRecentPublication(value: string | undefined, days: number, now = Date.now()): boolean {
  const time = Date.parse(value || "");
  return Number.isFinite(time) && time >= now - days * 86_400_000 && time <= now + 300_000;
}