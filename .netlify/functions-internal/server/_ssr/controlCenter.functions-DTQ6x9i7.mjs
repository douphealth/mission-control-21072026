import { r as createServerFn } from "./server-BEODbGZS.mjs";
import { a as stringType, i as objectType, n as enumType, t as arrayType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-BUblNgf4.mjs";
import { i as anthropicComplete, o as isAnthropicAvailable } from "./anthropicServer-DVyUpP7T.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/controlCenter.functions-DTQ6x9i7.js
var UA = "Mozilla/5.0 (compatible; MissionControl/1.0; +https://mission-control-001.lovable.app)";
async function httpGet(url, timeoutMs = 12e3) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			headers: {
				"User-Agent": UA,
				Accept: "*/*",
				"Accept-Language": "en,el;q=0.8"
			},
			signal: ctrl.signal,
			redirect: "follow"
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.text();
	} finally {
		clearTimeout(t);
	}
}
function decodeEntities(s) {
	return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, "&");
}
function stripTags(s) {
	return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
function tag(block, name) {
	const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
	return m ? decodeEntities(m[1]).trim() : void 0;
}
function linkFrom(block) {
	const plain = tag(block, "link");
	if (plain && /^https?:/i.test(plain.trim())) return plain.trim();
	const href = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
	if (href) return decodeEntities(href[1]);
	const guid = tag(block, "guid");
	if (guid && /^https?:/i.test(guid)) return guid;
}
/** Parse RSS 2.0 / Atom into items. Tolerant of malformed feeds. */
function parseFeed(xml) {
	const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
	const out = [];
	for (const block of blocks) {
		const title = stripTags(tag(block, "title") ?? "");
		const url = linkFrom(block);
		if (!title || !url) continue;
		const dateRaw = tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated") ?? tag(block, "dc:date");
		const parsed = dateRaw ? new Date(dateRaw) : null;
		const desc = tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content");
		out.push({
			title,
			url,
			summary: desc ? stripTags(desc).slice(0, 400) : void 0,
			publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : void 0
		});
	}
	return out;
}
/** Find a feed URL from a homepage: <link rel=alternate> then common paths. */
async function discoverFeed(pageUrl) {
	const base = new URL(pageUrl);
	try {
		const html = await httpGet(base.toString());
		if (/<(rss|feed)[\s>]/i.test(html.slice(0, 2e3))) return base.toString();
		const links = html.match(/<link[^>]+>/gi) ?? [];
		for (const l of links) {
			if (!/rel=["']?alternate/i.test(l)) continue;
			if (!/type=["'][^"']*(rss|atom)\+xml/i.test(l)) continue;
			const href = l.match(/href=["']([^"']+)["']/i);
			if (href) return new URL(decodeEntities(href[1]), base).toString();
		}
	} catch {}
	for (const path of [
		"/feed",
		"/rss",
		"/rss.xml",
		"/feed.xml",
		"/atom.xml",
		"/index.xml",
		"/blog/feed"
	]) try {
		const url = new URL(path, base).toString();
		const body = await httpGet(url, 8e3);
		if (/<(rss|feed)[\s>]/i.test(body.slice(0, 2e3))) return url;
	} catch {}
	return null;
}
function googleNewsUrl(query) {
	return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}
function hostOf(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}
/** Public-page audience metrics. Best effort; never invents a zero. */
async function readAudience(platform, url) {
	let html = "";
	try {
		html = await httpGet(url, 12e3);
	} catch {
		return {
			followers: null,
			posts: null,
			status: "unavailable"
		};
	}
	const num = (raw) => {
		const m = raw.replace(/[,\s]/g, "").toUpperCase().match(/^([\d.]+)([KMB])?$/);
		if (!m) return null;
		const base = parseFloat(m[1]);
		if (!Number.isFinite(base)) return null;
		const mult = m[2] === "K" ? 1e3 : m[2] === "M" ? 1e6 : m[2] === "B" ? 1e9 : 1;
		return Math.round(base * mult);
	};
	for (const re of {
		youtube: [/"subscriberCountText":\{"simpleText":"([^"]+?) subscribers?"/i, /([\d.,]+[KMB]?) subscribers/i],
		x: [/([\d.,]+[KMB]?)\s*Followers/i, /"followers_count":(\d+)/i],
		instagram: [/"edge_followed_by":\{"count":(\d+)\}/i, /([\d.,]+[KMB]?) Followers/i],
		facebook: [/([\d.,]+[KMB]?)\s*(?:followers|people follow)/i],
		linkedin: [/([\d.,]+[KMB]?)\s*followers/i],
		threads: [/([\d.,]+[KMB]?)\s*followers/i],
		tiktok: [/"followerCount":(\d+)/i, /([\d.,]+[KMB]?)\s*Followers/i]
	}[platform] ?? []) {
		const m = html.match(re);
		const v = m ? num(m[1]) : null;
		if (v !== null && v >= 0) {
			const postsMatch = html.match(/"(?:videoCount|edge_owner_to_timeline_media|videoCountText)"[^\d]{0,20}(\d+)/i);
			return {
				followers: v,
				posts: postsMatch ? Number(postsMatch[1]) : null,
				status: "ok"
			};
		}
	}
	return {
		followers: null,
		posts: null,
		status: "limited"
	};
}
var SourceSchema = objectType({
	id: stringType(),
	name: stringType(),
	url: stringType().url(),
	feedUrl: stringType().url().optional(),
	topics: arrayType(stringType()).max(20).optional()
});
var collectIndustry_createServerFn_handler = createServerRpc({
	id: "0ac939d1f9749bc6eb9d62119c7cb9636ec246d346977069c42ebd4a63fc8127",
	name: "collectIndustry",
	filename: "src/lib/controlCenter.functions.ts"
}, (opts) => collectIndustry.__executeServer(opts));
var collectIndustry = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ sources: arrayType(SourceSchema).max(30) }).parse(d)).handler(collectIndustry_createServerFn_handler, async ({ data }) => {
	const results = await Promise.all(data.sources.map(async (src) => {
		try {
			const feedUrl = src.feedUrl ?? await discoverFeed(src.url);
			if (!feedUrl) return {
				sourceId: src.id,
				feedUrl: null,
				items: [],
				error: "No readable feed found"
			};
			const items = parseFeed(await httpGet(feedUrl)).slice(0, 40).map((i) => ({
				...i,
				source: src.name || hostOf(src.url)
			}));
			return {
				sourceId: src.id,
				feedUrl,
				items,
				error: null
			};
		} catch (e) {
			return {
				sourceId: src.id,
				feedUrl: null,
				items: [],
				error: String(e?.message ?? e).slice(0, 200)
			};
		}
	}));
	const topics = [...new Set(data.sources.flatMap((s) => s.topics ?? []).map((t) => t.trim()).filter(Boolean))].slice(0, 8);
	const topicResults = await Promise.all(topics.map(async (topic) => {
		try {
			const xml = await httpGet(googleNewsUrl(`"${topic}"`));
			return {
				sourceId: `topic:${topic}`,
				feedUrl: null,
				error: null,
				items: parseFeed(xml).slice(0, 12).map((i) => ({
					...i,
					source: hostOf(i.url) || "Google News"
				}))
			};
		} catch {
			return {
				sourceId: `topic:${topic}`,
				feedUrl: null,
				items: [],
				error: null
			};
		}
	}));
	return { results: [...results, ...topicResults] };
});
var TermSchema = objectType({
	id: stringType(),
	term: stringType().min(2),
	type: enumType([
		"name",
		"brand",
		"handle",
		"domain"
	]),
	anchors: arrayType(stringType()).max(24).optional(),
	negatives: arrayType(stringType()).max(24).optional()
});
var collectMentions_createServerFn_handler = createServerRpc({
	id: "6da686875556e7d5f08e2952a994c61a8a95ade5cdd3110eb66c49bcae94d3cb",
	name: "collectMentions",
	filename: "src/lib/controlCenter.functions.ts"
}, (opts) => collectMentions.__executeServer(opts));
var collectMentions = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ terms: arrayType(TermSchema).max(12) }).parse(d)).handler(collectMentions_createServerFn_handler, async ({ data }) => {
	return { results: await Promise.all(data.terms.map(async (t) => {
		const query = t.type === "domain" ? `"${t.term}"` : `"${t.term.replace(/^@/, "")}"`;
		try {
			const raw = parseFeed(await httpGet(googleNewsUrl(query))).slice(0, 25);
			const negatives = (t.negatives ?? []).map((n) => n.toLowerCase()).filter(Boolean);
			const anchors = (t.anchors ?? []).map((a) => a.toLowerCase()).filter(Boolean);
			const needle = t.term.replace(/^@/, "").toLowerCase();
			const items = raw.filter((item) => {
				const hay = `${item.title} ${item.summary ?? ""}`.toLowerCase();
				if (!hay.includes(needle)) return false;
				if (negatives.some((n) => hay.includes(n))) return false;
				if (anchors.length && t.type !== "handle" && t.type !== "domain") return anchors.some((a) => hay.includes(a));
				return true;
			});
			return {
				termId: t.id,
				term: t.term,
				error: null,
				items: items.map((i) => ({
					...i,
					source: hostOf(i.url) || "Google News"
				}))
			};
		} catch (e) {
			return {
				termId: t.id,
				term: t.term,
				items: [],
				error: String(e?.message ?? e).slice(0, 200)
			};
		}
	})) };
});
var collectAudience_createServerFn_handler = createServerRpc({
	id: "3cbe797ac530725c19d4989134c1833f801080abd3a13c01f6ad140de6fb36f5",
	name: "collectAudience",
	filename: "src/lib/controlCenter.functions.ts"
}, (opts) => collectAudience.__executeServer(opts));
var collectAudience = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ accounts: arrayType(objectType({
	id: stringType(),
	platform: enumType([
		"youtube",
		"x",
		"instagram",
		"facebook",
		"linkedin",
		"threads",
		"tiktok"
	]),
	url: stringType().url()
})).max(20) }).parse(d)).handler(collectAudience_createServerFn_handler, async ({ data }) => {
	return { readings: await Promise.all(data.accounts.map(async (a) => {
		const r = await readAudience(a.platform, a.url);
		return {
			accountId: a.id,
			...r
		};
	})) };
});
var rankStories_createServerFn_handler = createServerRpc({
	id: "2a969e2b170e98432401697f2c436abdba8022b83b80264ae91c00739f30ac87",
	name: "rankStories",
	filename: "src/lib/controlCenter.functions.ts"
}, (opts) => rankStories.__executeServer(opts));
var rankStories = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	context: stringType().max(400).optional(),
	stories: arrayType(objectType({
		id: stringType(),
		title: stringType(),
		source: stringType().optional(),
		summary: stringType().optional()
	})).max(40)
}).parse(d)).handler(rankStories_createServerFn_handler, async ({ data }) => {
	if (!data.stories.length) return { ranked: [] };
	if (!isAnthropicAvailable()) return { ranked: [] };
	const systemPrompt = "You rank business/industry stories by how much they matter to the operator of this business. Return STRICT JSON {\"ranked\":[{\"id\":\"\",\"score\":0-100,\"summary\":\"one crisp sentence, max 140 chars, no hype\"}]}. Score 80+ only for direct, material impact. Never invent facts beyond the given title/summary.";
	const userContent = `${data.context ? `Operator context: ${data.context}\n\n` : ""}Stories:\n${data.stories.map((s) => `- id=${s.id} | ${s.title} | ${s.source ?? ""} | ${(s.summary ?? "").slice(0, 200)}`).join("\n")}`;
	const raw = await anthropicComplete(systemPrompt, userContent, { maxTokens: 2048 });
	if (!raw) return { ranked: [] };
	try {
		const parsed = JSON.parse(raw);
		return { ranked: (Array.isArray(parsed?.ranked) ? parsed.ranked : []).filter((r) => r && typeof r.id === "string").map((r) => ({
			id: r.id,
			score: Math.max(0, Math.min(100, Number(r.score) || 0)),
			summary: typeof r.summary === "string" ? r.summary.slice(0, 200) : ""
		})) };
	} catch {
		return { ranked: [] };
	}
});
//#endregion
export { collectAudience_createServerFn_handler, collectIndustry_createServerFn_handler, collectMentions_createServerFn_handler, rankStories_createServerFn_handler };
