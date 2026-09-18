import { i as __toESM } from "../_runtime.mjs";
import { n as genId, t as db } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as useFeedSources, o as markCloudRecordDirty, q as useStreamItems, u as queueCloudPush } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { G as RefreshCw, X as Plus, Y as Power, d as TriangleAlert, h as Trash2 } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as StreamRow, n as EmptyState, r as Panel, s as relTime, t as CCHeader, u as runIndustryCollector } from "./ui-BiQ_kQgK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/IndustryPage-YGnzCjB7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function IndustryPage() {
	const sources = useFeedSources();
	const items = useStreamItems();
	const [url, setUrl] = (0, import_react.useState)("");
	const [name, setName] = (0, import_react.useState)("");
	const [topics, setTopics] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [showArchived, setShowArchived] = (0, import_react.useState)(false);
	const stories = (0, import_react.useMemo)(() => items.filter((i) => i.kind === "industry" && (showArchived ? i.status === "archived" : i.status === "active")).sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt)).slice(0, 120), [items, showArchived]);
	const addSource = async () => {
		const clean = url.trim();
		if (!clean) return;
		const normalised = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
		let host = "";
		try {
			host = new URL(normalised).hostname.replace(/^www\./, "");
		} catch {
			toast.error("That does not look like a valid URL");
			return;
		}
		const record = {
			id: genId(),
			name: name.trim() || host,
			url: normalised,
			topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
			enabled: true,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await db.feedSources.put(record);
		markCloudRecordDirty("feedSources", record.id);
		queueCloudPush();
		setUrl("");
		setName("");
		setTopics("");
		toast.success(`Added ${record.name}`);
	};
	const refresh = async () => {
		setBusy(true);
		try {
			const { added, errors } = await runIndustryCollector();
			toast[errors.length && !added ? "warning" : "success"](added ? `${added} new ${added === 1 ? "story" : "stories"}` : "No new stories", { description: errors.slice(0, 2).join(" · ") || void 0 });
		} catch (e) {
			toast.error("Refresh failed", { description: String(e?.message ?? e) });
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CCHeader, {
				title: "Industry News",
				subtitle: "Feeds you choose, ranked by what actually matters today.",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setShowArchived((v) => !v),
					className: "px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/70 text-foreground",
					children: showArchived ? "Show active" : "Show archived"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: refresh,
					disabled: busy || !sources.length,
					className: "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
						size: 13,
						className: busy ? "animate-spin" : ""
					}), " Refresh feeds"]
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-3",
					children: "Add a source"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-[1.4fr_1fr_1.2fr_auto]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: url,
							onChange: (e) => setUrl(e.target.value),
							onKeyDown: (e) => e.key === "Enter" && addSource(),
							placeholder: "Site or feed URL (e.g. techcrunch.com)",
							className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: name,
							onChange: (e) => setName(e.target.value),
							placeholder: "Label (optional)",
							className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: topics,
							onChange: (e) => setTopics(e.target.value),
							placeholder: "Topics, comma separated",
							className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: addSource,
							className: "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Add"]
						})
					]
				}),
				sources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: `group inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs ${s.enabled ? "border-border bg-background/60 text-foreground" : "border-border/50 bg-muted/40 text-muted-foreground"}`,
						title: s.lastError ? s.lastError : s.lastCheckedAt ? `Checked ${relTime(s.lastCheckedAt)}` : "Never checked",
						children: [
							s.lastError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
								size: 12,
								className: "text-amber-500"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: s.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: async () => {
									await db.feedSources.update(s.id, { enabled: !s.enabled });
									markCloudRecordDirty("feedSources", s.id);
									queueCloudPush();
								},
								className: "p-1 rounded-full hover:bg-secondary",
								"aria-label": "Toggle source",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { size: 12 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: async () => {
									await db.feedSources.delete(s.id);
									markCloudRecordDirty("feedSources", s.id, "delete");
									queueCloudPush();
								},
								className: "p-1 rounded-full hover:bg-destructive/15 hover:text-destructive",
								"aria-label": "Remove source",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
							})
						]
					}, s.id))
				})
			] }),
			stories.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: sources.length ? "No stories yet" : "Add your first source",
				hint: sources.length ? "Hit “Refresh feeds” to pull the latest headlines." : "Paste any site URL — the feed is discovered automatically. Topics let you surface specific themes."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2.5",
				children: stories.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamRow, { item: s }, s.id))
			})
		]
	});
}
//#endregion
export { IndustryPage as default };
