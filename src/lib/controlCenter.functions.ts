import { collectMentionCoverage, collectAudienceMetrics } from "./intelligenceCollectors.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  discoverFeed,
  hostOf,
  httpGet,
  parseFeed,
  type RawItem,
} from "./controlCenter.server";
import { anthropicComplete, isAnthropicAvailable } from "@/lib/anthropicServer";
import {
  canonicalWebUrl,
  queryRelevance,
  isRecentIso,
  titleSimilarity,
} from "@/lib/intelligenceQuality";
import {
  searchNewsCoverage,
  summarizeProviderFailures,
  type NewsCoverageItem,
} from "@/lib/newsProviders.server";

function evidenceStrength(input: {
  source?: string;
  sourceUrl?: string;
  corroborationCount?: number;
  directFeed?: boolean;
}) {
  const corroboration = input.corroborationCount ?? 0;
  if (input.directFeed) {
    return {
      level: "high" as const,
      reason: "Direct publisher/feed source selected by the user.",
    };
  }
  if (corroboration >= 2) {
    return {
      level: "high" as const,
      reason: `Similar headlines appear across ${corroboration + 1} publishers. This is not a factual verification.`,
    };
  }
  if (input.source || input.sourceUrl) {
    return {
      level: "medium" as const,
      reason: "Publisher attribution is present, but this result is not independently corroborated here.",
    };
  }
  return {
    level: "limited" as const,
    reason: "Publisher attribution is incomplete.",
  };
}

// ─── Industry / feed collection ───────────────────────────────────────────────

const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  feedUrl: z.string().url().optional(),
  topics: z.array(z.string()).max(20).optional(),
});

export const collectIndustry = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sources: z.array(SourceSchema).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.sources.map(async (src) => {
        try {
          const feedUrl = src.feedUrl ?? (await discoverFeed(src.url));
          if (!feedUrl) {
            return {
              sourceId: src.id,
              feedUrl: null,
              items: [] as RawItem[],
              error: "No readable feed found",
            };
          }
          const xml = await httpGet(feedUrl);
          const items = parseFeed(xml)
            .slice(0, 40)
            .map((i) => ({
              ...i,
              source: i.source || src.name || hostOf(src.url),
              sourceUrl: i.sourceUrl || src.url,
            }));
          return { sourceId: src.id, feedUrl, items, error: null as string | null };
        } catch (e: any) {
          return {
            sourceId: src.id,
            feedUrl: null,
            items: [] as RawItem[],
            error: String(e?.message ?? e).slice(0, 200),
          };
        }
      }),
    );

    // Optional topic-phrase discovery uses multiple live providers.
    const topics = [
      ...new Set(
        data.sources
          .flatMap((s) => s.topics ?? [])
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ].slice(0, 8);
    const topicResults = await Promise.all(
      topics.map(async (topic) => {
        const coverage = await searchNewsCoverage(`"${topic}"`, 7);
        return {
          sourceId: `topic:${topic}`,
          feedUrl: null,
          error: coverage.allFailed
            ? summarizeProviderFailures(coverage).join(" · ") || "All news providers failed"
            : null,
          items: coverage.items.slice(0, 18).map((item) => ({
            ...item,
            source: item.source || hostOf(item.sourceUrl || "") || "News coverage",
            sourceUrl: item.sourceUrl,
          })),
        };
      }),
    );

    return { results: [...results, ...topicResults] };
  });

export const searchIndustryTopic = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      query: z.string().min(2).max(180),
      days: z.number().int().min(1).max(30),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const query = data.query.trim();
    const coverage = await searchNewsCoverage(query, data.days);

    if (coverage.allFailed) {
      return {
        query,
        days: data.days,
        fetchedAt: new Date().toISOString(),
        items: [] as Array<
          NewsCoverageItem & {
            corroborationCount: number;
            relevanceScore: number;
            evidenceLevel: "high" | "medium" | "limited";
            evidenceReason: string;
          }
        >,
        providers: coverage.providers,
        degraded: true,
        error:
          summarizeProviderFailures(coverage).join(" · ") ||
          "All live news providers are temporarily unavailable.",
      };
    }

    const items = coverage.items.filter(item => isRecentIso(item.publishedAt, data.days)).slice(0, 90).map((item) => ({
      ...item,
      source: item.source || hostOf(item.sourceUrl || "") || "News coverage",
      sourceUrl: item.sourceUrl,
    }));

    const enriched = items
      .map((item, index) => {
        const publishers = new Set<string>();
        items.forEach((other, otherIndex) => {
          if (otherIndex === index || titleSimilarity(item.title, other.title) < 0.5) return;
          const publisher = other.source || hostOf(other.sourceUrl || "");
          if (publisher && publisher !== item.source) publishers.add(publisher);
        });
        // Search-engine duplication is not independent reporting or fact verification.
        const corroborationCount = publishers.size;
        const relevanceScore = queryRelevance(query, item.title, item.summary);
        const evidence = evidenceStrength({
          source: item.source,
          sourceUrl: item.sourceUrl,
          corroborationCount,
        });
        return {
          ...item,
          corroborationCount,
          relevanceScore,
          evidenceLevel: evidence.level,
          evidenceReason:
            item.retrievalProviders.length > 1
              ? `${evidence.reason} Also indexed by ${item.retrievalProviders.length} search providers.`
              : evidence.reason,
        };
      })
      .filter((item) => item.relevanceScore >= 40)
      .sort(
        (a, b) =>
          b.relevanceScore - a.relevanceScore ||
          (b.corroborationCount ?? 0) - (a.corroborationCount ?? 0) ||
          new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
      );

    return {
      query,
      days: data.days,
      fetchedAt: new Date().toISOString(),
      items: enriched,
      providers: coverage.providers,
      degraded: coverage.degraded,
      error: null as string | null,
    };
  });

// ─── Brand mentions ───────────────────────────────────────────────────────────

const TermSchema = z.object({
  id: z.string(),
  term: z.string().min(2),
  type: z.enum(["name", "brand", "handle", "domain"]),
  anchors: z.array(z.string()).max(24).optional(),
  negatives: z.array(z.string()).max(24).optional(),
});

export const collectMentions = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ terms: z.array(TermSchema).max(12) }).parse(d))
  .handler(async ({ data }) => collectMentionCoverage(data.terms));

// ─── Audience metrics ─────────────────────────────────────────────────────────

export const collectAudience = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        accounts: z
          .array(
            z.object({
              id: z.string(),
              platform: z.enum([
                "youtube",
                "x",
                "instagram",
                "facebook",
                "linkedin",
                "threads",
                "tiktok",
                "github",
                "bluesky",
              ]),
              url: z.string().url(),
            }),
          )
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => collectAudienceMetrics(data.accounts));

// ─── Optional AI ranking / summarising (no user API key needed) ───────────────

export const rankStories = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        context: z.string().max(400).optional(),
        stories: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              source: z.string().optional(),
              summary: z.string().optional(),
            }),
          )
          .max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.stories.length)
      return { ranked: [] as { id: string; score: number; summary: string }[] };
    if (!isAnthropicAvailable())
      return { ranked: [] as { id: string; score: number; summary: string }[] };

    const systemPrompt =
      'You rank business/industry stories by how much they matter to the operator of this business. Return STRICT JSON {"ranked":[{"id":"","score":0-100,"summary":"one crisp sentence, max 140 chars, no hype"}]}. Score 80+ only for direct, material impact. Never invent facts beyond the given title/summary.';
    const userContent = `${data.context ? `Operator context: ${data.context}\n\n` : ""}Stories:\n${data.stories
      .map(
        (s) => `- id=${s.id} | ${s.title} | ${s.source ?? ""} | ${(s.summary ?? "").slice(0, 200)}`,
      )
      .join("\n")}`;

    const raw = await anthropicComplete(systemPrompt, userContent, { maxTokens: 2048 });
    if (!raw) return { ranked: [] as { id: string; score: number; summary: string }[] };

    try {
      const parsed = JSON.parse(raw);
      const ranked = Array.isArray(parsed?.ranked) ? parsed.ranked : [];
      return {
        ranked: ranked
          .filter((r: any) => r && typeof r.id === "string")
          .map((r: any) => ({
            id: r.id as string,
            score: Math.max(0, Math.min(100, Number(r.score) || 0)),
            summary: typeof r.summary === "string" ? r.summary.slice(0, 200) : "",
          })),
      };
    } catch {
      return { ranked: [] as { id: string; score: number; summary: string }[] };
    }
  });
