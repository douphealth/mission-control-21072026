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
            .map((i) => ({ ...i, source: src.name || hostOf(src.url) }));
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
              .map((i) => ({ ...i, source: hostOf(i.url) || "Google News" })),
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
        const query = t.type === "domain" ? `"${t.term}"` : `"${t.term.replace(/^@/, "")}"`;
        try {
          const xml = await httpGet(googleNewsUrl(query));
          const raw = parseFeed(xml).slice(0, 25);
          const negatives = (t.negatives ?? []).map((n) => n.toLowerCase()).filter(Boolean);
          const anchors = (t.anchors ?? []).map((a) => a.toLowerCase()).filter(Boolean);
          const needle = t.term.replace(/^@/, "").toLowerCase();

          const items = raw.filter((item) => {
            const hay = `${item.title} ${item.summary ?? ""}`.toLowerCase();
            if (!hay.includes(needle)) return false;
            if (negatives.some((n) => hay.includes(n))) return false;
            // Unique handles/domains qualify directly; broad names need an anchor when configured.
            if (anchors.length && t.type !== "handle" && t.type !== "domain") {
              return anchors.some((a) => hay.includes(a));
            }
            return true;
          });

          return {
            termId: t.id,
            term: t.term,
            error: null as string | null,
            items: items.map((i) => ({ ...i, source: hostOf(i.url) || "Google News" })),
          };
        } catch (e: any) {
          return {
            termId: t.id,
            term: t.term,
            items: [] as RawItem[],
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ranked: [] as { id: string; score: number; summary: string }[] };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              'You rank business/industry stories by how much they matter to the operator of this business. Return STRICT JSON {"ranked":[{"id":"","score":0-100,"summary":"one crisp sentence, max 140 chars, no hype"}]}. Score 80+ only for direct, material impact. Never invent facts beyond the given title/summary.',
          },
          {
            role: "user",
            content: `${data.context ? `Operator context: ${data.context}\n\n` : ""}Stories:\n${data.stories
              .map(
                (s) =>
                  `- id=${s.id} | ${s.title} | ${s.source ?? ""} | ${(s.summary ?? "").slice(0, 200)}`,
              )
              .join("\n")}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      // Deterministic local ranking still works — never fail the collector.
      return { ranked: [] as { id: string; score: number; summary: string }[] };
    }
    const json = await res.json();
    try {
      const parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? "{}");
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
