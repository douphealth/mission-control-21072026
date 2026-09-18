import { n as genId, t as db } from "./db-DLy-AV_e.mjs";
import { o as markCloudRecordDirty, u as queueCloudPush } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { r as createServerFn } from "./server-BEODbGZS.mjs";
import { D as Sparkles, Yn as Archive, rn as ExternalLink } from "../_libs/lucide-react.mjs";
import { a as stringType, i as objectType, n as enumType, t as arrayType } from "../_libs/zod.mjs";
import { y as createSsrRpc } from "./routes-qm6I9RAb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ui-BiQ_kQgK.js
var import_jsx_runtime = require_jsx_runtime();
var SourceSchema = objectType({
	id: stringType(),
	name: stringType(),
	url: stringType().url(),
	feedUrl: stringType().url().optional(),
	topics: arrayType(stringType()).max(20).optional()
});
var collectIndustry = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ sources: arrayType(SourceSchema).max(30) }).parse(d)).handler(createSsrRpc("0ac939d1f9749bc6eb9d62119c7cb9636ec246d346977069c42ebd4a63fc8127"));
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
var collectMentions = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ terms: arrayType(TermSchema).max(12) }).parse(d)).handler(createSsrRpc("6da686875556e7d5f08e2952a994c61a8a95ade5cdd3110eb66c49bcae94d3cb"));
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
})).max(20) }).parse(d)).handler(createSsrRpc("3cbe797ac530725c19d4989134c1833f801080abd3a13c01f6ad140de6fb36f5"));
var rankStories = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	context: stringType().max(400).optional(),
	stories: arrayType(objectType({
		id: stringType(),
		title: stringType(),
		source: stringType().optional(),
		summary: stringType().optional()
	})).max(40)
}).parse(d)).handler(createSsrRpc("2a969e2b170e98432401697f2c436abdba8022b83b80264ae91c00739f30ac87"));
var LAST_RUN_KEY = "mc-cc-last-run";
function canonicalUrl(raw) {
	try {
		const u = new URL(raw);
		u.hash = "";
		[...u.searchParams.keys()].forEach((k) => {
			if (/^(utm_|fbclid|gclid|ref|source)/i.test(k)) u.searchParams.delete(k);
		});
		return `${u.origin}${u.pathname.replace(/\/$/, "")}${u.search}`.toLowerCase();
	} catch {
		return raw.trim().toLowerCase();
	}
}
/** Local importance model: recency + source weight + topic hits. */
function localScore(item, topics = []) {
	const ageHours = Math.max(0, (Date.now() - new Date(item.publishedAt).getTime()) / 36e5);
	const recency = Math.max(0, 45 - ageHours * .8);
	const hay = `${item.title} ${item.summary ?? ""}`.toLowerCase();
	const topicHits = topics.filter((t) => t && hay.includes(t.toLowerCase())).length;
	const signal = /launch|acquisi|funding|outage|breach|update|release|ban|lawsuit|price|record/i.test(hay) ? 12 : 0;
	const depth = Math.min(15, (item.summary?.length ?? 0) / 30);
	return Math.round(Math.min(100, 25 + recency + topicHits * 8 + signal + depth));
}
async function persistItems(kind, incoming) {
	if (!incoming.length) return 0;
	const existing = await db.streamItems.toArray();
	const seen = new Set(existing.map((i) => canonicalUrl(i.url)));
	const fresh = [];
	for (const item of incoming) {
		const key = canonicalUrl(item.url);
		if (!item.title || !item.url || seen.has(key)) continue;
		seen.add(key);
		fresh.push({
			...item,
			id: genId(),
			kind,
			status: "active",
			discoveredAt: (/* @__PURE__ */ new Date()).toISOString()
		});
	}
	if (!fresh.length) return 0;
	await db.streamItems.bulkPut(fresh);
	fresh.forEach((f) => markCloudRecordDirty("streamItems", f.id));
	queueCloudPush();
	return fresh.length;
}
async function aiRerank(kind, context) {
	const items = (await db.streamItems.where("kind").equals(kind).toArray()).filter((i) => i.status === "active" && !i.aiSummary).sort((a, b) => b.score - a.score).slice(0, 25);
	if (!items.length) return;
	try {
		const { ranked } = await rankStories({ data: {
			context,
			stories: items.map((i) => ({
				id: i.id,
				title: i.title,
				source: i.source,
				summary: i.summary
			}))
		} });
		for (const r of ranked) {
			const target = items.find((i) => i.id === r.id);
			if (!target) continue;
			await db.streamItems.update(r.id, {
				score: r.score || target.score,
				aiSummary: r.summary || void 0
			});
			markCloudRecordDirty("streamItems", r.id);
		}
		if (ranked.length) queueCloudPush();
	} catch {}
}
async function runIndustryCollector(useAi = true) {
	const sources = (await db.feedSources.toArray()).filter((s) => s.enabled);
	if (!sources.length) return {
		added: 0,
		errors: []
	};
	const { results } = await collectIndustry({ data: { sources: sources.map((s) => ({
		id: s.id,
		name: s.name,
		url: s.url,
		feedUrl: s.feedUrl,
		topics: s.topics
	})) } });
	const allTopics = sources.flatMap((s) => s.topics ?? []);
	const errors = [];
	const payload = [];
	const now = (/* @__PURE__ */ new Date()).toISOString();
	for (const r of results) {
		const src = sources.find((s) => s.id === r.sourceId);
		if (src) {
			await db.feedSources.update(src.id, {
				lastCheckedAt: now,
				feedUrl: r.feedUrl ?? src.feedUrl,
				lastError: r.error ?? void 0
			});
			markCloudRecordDirty("feedSources", src.id);
			if (r.error) errors.push(`${src.name}: ${r.error}`);
		}
		for (const item of r.items) {
			const publishedAt = item.publishedAt ?? now;
			payload.push({
				title: item.title,
				url: item.url,
				source: item.source ?? src?.name ?? "",
				sourceId: src?.id,
				summary: item.summary,
				publishedAt,
				score: localScore({
					...item,
					publishedAt
				}, allTopics)
			});
		}
	}
	const added = await persistItems("industry", payload);
	if (useAi && added) await aiRerank("industry");
	return {
		added,
		errors
	};
}
async function runMentionCollector(useAi = true) {
	const terms = (await db.watchTerms.toArray()).filter((t) => t.enabled);
	if (!terms.length) return {
		added: 0,
		errors: []
	};
	const { results } = await collectMentions({ data: { terms: terms.slice(0, 12).map((t) => ({
		id: t.id,
		term: t.term,
		type: t.type,
		anchors: t.anchors,
		negatives: t.negatives
	})) } });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const errors = [];
	const payload = [];
	for (const r of results) {
		await db.watchTerms.update(r.termId, { lastCheckedAt: now });
		markCloudRecordDirty("watchTerms", r.termId);
		if (r.error) errors.push(`${r.term}: ${r.error}`);
		for (const item of r.items) {
			const publishedAt = item.publishedAt ?? now;
			payload.push({
				title: item.title,
				url: item.url,
				source: item.source ?? "",
				sourceId: r.termId,
				summary: item.summary,
				publishedAt,
				score: localScore({
					...item,
					publishedAt
				}) + 5,
				matchedTerm: r.term
			});
		}
	}
	const added = await persistItems("mention", payload);
	if (useAi && added) await aiRerank("mention", "These are mentions of the operator’s own name or brand.");
	return {
		added,
		errors
	};
}
async function runAudienceCollector() {
	const accounts = await db.audienceAccounts.toArray();
	if (!accounts.length) return { updated: 0 };
	const { readings } = await collectAudience({ data: accounts.map ? { accounts: accounts.map((a) => ({
		id: a.id,
		platform: a.platform,
		url: a.url
	})) } : {} });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	let updated = 0;
	for (const r of readings) {
		const recent = (await db.audienceReadings.where("accountId").equals(r.accountId).toArray()).filter((p) => Date.now() - new Date(p.capturedAt).getTime() < 432e5).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
		if (recent) {
			await db.audienceReadings.update(recent.id, {
				followers: r.followers,
				posts: r.posts,
				capturedAt: now,
				status: r.status
			});
			markCloudRecordDirty("audienceReadings", recent.id);
		} else {
			const rec = {
				id: genId(),
				accountId: r.accountId,
				capturedAt: now,
				followers: r.followers,
				posts: r.posts,
				status: r.status
			};
			await db.audienceReadings.put(rec);
			markCloudRecordDirty("audienceReadings", rec.id);
		}
		await db.audienceAccounts.update(r.accountId, {
			lastCheckedAt: now,
			lastStatus: r.status
		});
		markCloudRecordDirty("audienceAccounts", r.accountId);
		updated++;
	}
	queueCloudPush();
	return { updated };
}
async function runAllCollectors(useAi = true) {
	const [industry, mentions, audience] = await Promise.all([
		runIndustryCollector(useAi).catch(() => ({
			added: 0,
			errors: ["Industry collector failed"]
		})),
		runMentionCollector(useAi).catch(() => ({
			added: 0,
			errors: ["Mention collector failed"]
		})),
		runAudienceCollector().catch(() => ({ updated: 0 }))
	]);
	try {
		localStorage.setItem(LAST_RUN_KEY, (/* @__PURE__ */ new Date()).toISOString());
	} catch {}
	return {
		industry,
		mentions,
		audience
	};
}
function lastCollectorRun() {
	try {
		return localStorage.getItem(LAST_RUN_KEY);
	} catch {
		return null;
	}
}
async function archiveStreamItem(id) {
	await db.streamItems.update(id, { status: "archived" });
	markCloudRecordDirty("streamItems", id);
	queueCloudPush();
}
function CCHeader({ title, subtitle, actions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-end justify-between gap-3 mb-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-bold tracking-tight text-foreground",
			children: title
		}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground mt-1",
			children: subtitle
		})] }), actions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: actions
		})]
	});
}
function Panel({ children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 sm:p-5 shadow-sm ${className}`,
		children
	});
}
function StatTile({ label, value, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		className: "min-w-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] uppercase tracking-wide text-muted-foreground font-semibold",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-2xl font-bold text-foreground mt-1 tabular-nums",
				children: value
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-muted-foreground mt-0.5 truncate",
				children: hint
			})
		]
	});
}
function relTime(iso) {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.round(diff / 6e4);
	if (Number.isNaN(mins)) return "";
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.round(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.round(hrs / 24);
	return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}
function scoreTone(score) {
	if (score >= 80) return "bg-rose-500/15 text-rose-500 border-rose-500/30";
	if (score >= 60) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
	return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
}
function StreamRow({ item, onArchive }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "group flex gap-3 rounded-xl border border-border/50 bg-background/40 p-3 hover:border-primary/40 transition-colors",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `shrink-0 h-7 min-w-7 px-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center tabular-nums ${scoreTone(item.score)}`,
				title: "Importance score",
				children: item.score
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: item.url,
						target: "_blank",
						rel: "noopener noreferrer",
						className: "text-sm font-semibold text-foreground hover:text-primary line-clamp-2",
						children: item.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: item.source || "Unknown source"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: relTime(item.publishedAt) }),
							item.matchedTerm && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary font-medium",
								children: item.matchedTerm
							})] })
						]
					}),
					(item.aiSummary || item.summary) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground/90 mt-1.5 line-clamp-2",
						children: [item.aiSummary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, {
							size: 11,
							className: "inline mr-1 -mt-0.5 text-primary"
						}), item.aiSummary || item.summary]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: item.url,
					target: "_blank",
					rel: "noopener noreferrer",
					className: "p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground",
					"aria-label": "Open story",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => onArchive ? onArchive() : archiveStreamItem(item.id),
					className: "p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground",
					"aria-label": "Archive story",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { size: 14 })
				})]
			})
		]
	});
}
function EmptyState({ title, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "text-center py-12 rounded-2xl border border-dashed border-border/70",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-semibold text-foreground",
			children: title
		}), hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted-foreground mt-1 max-w-md mx-auto",
			children: hint
		})]
	});
}
//#endregion
export { StreamRow as a, runAllCollectors as c, runMentionCollector as d, StatTile as i, runAudienceCollector as l, EmptyState as n, lastCollectorRun as o, Panel as r, relTime as s, CCHeader as t, runIndustryCollector as u };
