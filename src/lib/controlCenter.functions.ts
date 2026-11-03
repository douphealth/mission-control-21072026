import { collectMentionCoverage, collectAudienceMetrics } from "./intelligenceCollectors.server";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { readIntelligenceConfiguration } from "./intelligenceConfiguration.server";
import { z } from "zod";
import {
  hostOf,
  readSourceFeed,
  type RawItem,
} from "./controlCenter.server";
import { anthropicComplete, isAnthropicAvailable } from "@/lib/anthropicServer";
import {
  canonicalWebUrl,
  queryRelevance,
  isRecentIso,
  independentPublisherCorroboration,
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
  if (corroboration >= 1) {
    return {
      level: "high" as const,
      reason: `A similar headline appears across ${corroboration + 1} distinct publisher domains. Syndication and common ownership are not checked; this is coverage evidence, not independent fact verification.`,
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
  .inputValidator((d) => z.object({ sources: z.array(SourceSchema).max(4) }).parse(d))
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.sources.map(async (src) => {
        try {
          const { feedUrl, items: feedItems } = await readSourceFeed(src.url, src.feedUrl);
          const items = feedItems
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

    // Monitoring retrieves the publishers the user chose. Broader topic research
    // belongs to the explicit search action; generic source tags must not silently
    // fill the monitoring stream (or spend on a configured search provider).
    return { results };
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
        fetchedAt: coverage.fetchedAt,
        cached: coverage.cached,
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
        const corroboration = independentPublisherCorroboration(item, items);
        // Search-engine duplication is not independent reporting or fact verification.
        const corroborationCount = Math.max(0, corroboration.independentPublishers - 1);
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
          evidenceReason: [
            evidence.reason,
            corroboration.publisherHosts.length
              ? `Publisher domains: ${corroboration.publisherHosts.join(", ")}.`
              : "Publisher domain could not be verified.",
            item.retrievalProviders.length > 1
              ? `Indexed by ${item.retrievalProviders.length} retrieval providers; this does not increase publisher corroboration.`
              : undefined,
          ].filter(Boolean).join(" "),
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
      fetchedAt: coverage.fetchedAt,
        cached: coverage.cached,
      items: enriched,
      providers: coverage.providers,
      degraded: coverage.degraded,
      error: null as string | null,
    };
  });

// ─── Brand mentions ───────────────────────────────────────────────────────────

const TermSchema = z.object({
  id: z.string(),
  term: z.string().trim().min(1).max(180),
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
    if (process.env.MC_ALLOW_PAID_INTELLIGENCE !== "true" || !isAnthropicAvailable())
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

/** Authenticated capability flags only. No measurements, secrets or paid provider calls. */
export const intelligenceCapabilities = createServerFn({ method: "GET" })
  .handler(async () => readIntelligenceConfiguration(getRequest()));
