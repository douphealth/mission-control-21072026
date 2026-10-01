import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  discoverFeed,
  googleNewsUrl,
  hostOf,
  httpGet,
  parseFeed,
  readAudience,
  type RawItem,
} from "./controlCenter.server";
import { anthropicComplete, isAnthropicAvailable } from "@/lib/anthropicServer";

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
      reason: `Similar coverage appears across ${corroboration + 1} publisher results.`,
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

    // Optional topic-phrase discovery via Google News.
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
        try {
          const xml = await httpGet(googleNewsUrl(`"${topic}"`));
          return {
            sourceId: `topic:${topic}`,
            feedUrl: null,
            error: null as string | null,
            items: parseFeed(xml)
              .slice(0, 12)
              .map((i) => ({
                ...i,
                source: i.source || hostOf(i.sourceUrl || "") || "Google News",
                sourceUrl: i.sourceUrl,
              })),
          };
        } catch {
          return {
            sourceId: `topic:${topic}`,
            feedUrl: null,
            items: [] as RawItem[],
            error: null as string | null,
          };
        }
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
    const xml = await httpGet(googleNewsUrl(query + " when:" + data.days + "d"));
    const minTime = Date.now() - data.days * 86_400_000;
    const items = parseFeed(xml)
      .filter((item) => {
        if (!item.publishedAt) return true;
        const ts = new Date(item.publishedAt).getTime();
        return Number.isFinite(ts) && ts >= minTime;
      })
      .slice(0, 60)
      .map((item) => ({
        ...item,
        source: item.source || hostOf(item.sourceUrl || "") || "Google News",
        sourceUrl: item.sourceUrl,
      }));

    const words = (title: string) =>
      new Set(
        title
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, " ")
          .split(/\s+/)
          .filter((word) => word.length >= 4)
          .filter((word) => !["with", "from", "that", "this", "have", "will", "into", "over"].includes(word)),
      );
    const similarity = (a: string, b: string) => {
      const left = words(a);
      const right = words(b);
      if (!left.size || !right.size) return 0;
      let overlap = 0;
      left.forEach((word) => {
        if (right.has(word)) overlap += 1;
      });
      return overlap / Math.max(left.size, right.size);
    };

    const enriched = items.map((item, index) => {
      const publishers = new Set<string>();
      items.forEach((other, otherIndex) => {
        if (otherIndex === index || similarity(item.title, other.title) < 0.5) return;
        const publisher = other.source || hostOf(other.sourceUrl || "");
        if (publisher) publishers.add(publisher);
      });
      const corroborationCount = publishers.size;
      const evidence = evidenceStrength({
        source: item.source,
        sourceUrl: item.sourceUrl,
        corroborationCount,
      });
      return {
        ...item,
        corroborationCount,
        evidenceLevel: evidence.level,
        evidenceReason: evidence.reason,
      };
    });

    return { query, days: data.days, fetchedAt: new Date().toISOString(), items: enriched };
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
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.terms.map(async (t) => {
        const cleanTerm = t.term.replace(/^@/, "").trim();
        const anchors = (t.anchors ?? []).map((a) => a.trim()).filter(Boolean);
        const negatives = (t.negatives ?? []).map((n) => n.toLowerCase()).filter(Boolean);
        if (t.type === "name" && !anchors.length) {
          return {
            termId: t.id,
            term: t.term,
            items: [] as Array<RawItem & {
              matchedAnchors?: string[];
              verification?: "exact-domain" | "exact-handle" | "anchored-name" | "exact-brand";
              confidence?: "high" | "medium" | "low";
            }>,
            error: "Name monitoring requires at least one identity anchor.",
          };
        }

        const queries =
          (t.type === "name" || t.type === "brand") && anchors.length
            ? anchors.slice(0, 5).map((anchor) => '"' + cleanTerm + '" "' + anchor + '"')
            : ['"' + (t.type === "handle" ? "@" : "") + cleanTerm + '"'];

        try {
          const batches = await Promise.all(
            queries.map(async (query) => parseFeed(await httpGet(googleNewsUrl(query))).slice(0, 30)),
          );
          const dedup = new Map<string, RawItem>();
          batches.flat().forEach((item) => {
            if (!dedup.has(item.url)) dedup.set(item.url, item);
          });
          const needle = cleanTerm.toLowerCase();

          const items = [...dedup.values()]
            .map((item) => {
              const hay = (item.title + " " + (item.summary ?? "")).toLowerCase();
              const matchedAnchors = anchors.filter((anchor) =>
                hay.includes(anchor.toLowerCase()),
              );
              const source = item.source || hostOf(item.sourceUrl || "") || "Google News";
              const sourceHost = hostOf(item.sourceUrl || "").toLowerCase();
              const exactDomain =
                t.type === "domain" &&
                (sourceHost === needle || sourceHost.endsWith("." + needle) || hay.includes(needle));
              const exactHandle =
                t.type === "handle" &&
                (hay.includes("@" + needle) || hay.split(/[^a-z0-9_]+/).includes(needle));
              const exactPhrase = hay.includes(needle);
              let verification:
                | "exact-domain"
                | "exact-handle"
                | "anchored-name"
                | "exact-brand"
                | undefined;
              let confidence: "high" | "medium" | "low" = "low";

              if (exactDomain) {
                verification = "exact-domain";
                confidence = "high";
              } else if (exactHandle) {
                verification = "exact-handle";
                confidence = "high";
              } else if (t.type === "name" && exactPhrase && matchedAnchors.length) {
                verification = "anchored-name";
                confidence = "high";
              } else if (t.type === "brand" && exactPhrase) {
                verification = "exact-brand";
                confidence = matchedAnchors.length ? "high" : "medium";
              }

              return {
                ...item,
                source,
                sourceUrl: item.sourceUrl,
                matchedAnchors,
                verification,
                confidence,
              };
            })
            .filter((item) => {
              const hay = (item.title + " " + (item.summary ?? "")).toLowerCase();
              if (negatives.some((negative) => hay.includes(negative))) return false;
              return Boolean(item.verification);
            });

          return { termId: t.id, term: t.term, items, error: null as string | null };
        } catch (e: any) {
          return {
            termId: t.id,
            term: t.term,
            items: [] as Array<RawItem & {
              matchedAnchors?: string[];
              verification?: "exact-domain" | "exact-handle" | "anchored-name" | "exact-brand";
              confidence?: "high" | "medium" | "low";
            }>,
            error: String(e?.message ?? e).slice(0, 200),
          };
        }
      }),
    );
    return { results };
  });

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
              ]),
              url: z.string().url(),
            }),
          )
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const readings = await Promise.all(
      data.accounts.map(async (a) => {
        const r = await readAudience(a.platform, a.url);
        return { accountId: a.id, ...r };
      }),
    );
    return { readings };
  });

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
