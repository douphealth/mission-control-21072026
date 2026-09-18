import { i as __toESM } from "../_runtime.mjs";
import { n as genId, t as db } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { et as useWatchTerms, o as markCloudRecordDirty, q as useStreamItems, u as queueCloudPush } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { G as RefreshCw, X as Plus, Y as Power, h as Trash2 } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as StreamRow, d as runMentionCollector, n as EmptyState, r as Panel, s as relTime, t as CCHeader } from "./ui-BiQ_kQgK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/MentionsPage-BwBs7IhW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TYPES = [
	"name",
	"brand",
	"handle",
	"domain"
];
function MentionsPage() {
	const terms = useWatchTerms();
	const items = useStreamItems();
	const [term, setTerm] = (0, import_react.useState)("");
	const [type, setType] = (0, import_react.useState)("brand");
	const [anchors, setAnchors] = (0, import_react.useState)("");
	const [negatives, setNegatives] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const mentions = (0, import_react.useMemo)(() => items.filter((i) => i.kind === "mention" && i.status === "active").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 120), [items]);
	const addTerm = async () => {
		const clean = term.trim();
		if (!clean) return;
		const record = {
			id: genId(),
			term: clean,
			type,
			anchors: anchors.split(",").map((a) => a.trim()).filter(Boolean),
			negatives: negatives.split(",").map((a) => a.trim()).filter(Boolean),
			enabled: true,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await db.watchTerms.put(record);
		markCloudRecordDirty("watchTerms", record.id);
		queueCloudPush();
		setTerm("");
		setAnchors("");
		setNegatives("");
		toast.success(`Watching “${record.term}”`);
	};
	const refresh = async () => {
		setBusy(true);
		try {
			const { added, errors } = await runMentionCollector();
			toast.success(added ? `${added} new ${added === 1 ? "mention" : "mentions"}` : "No new mentions", { description: errors.slice(0, 2).join(" · ") || void 0 });
		} catch (e) {
			toast.error("Mention scan failed", { description: String(e?.message ?? e) });
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CCHeader, {
				title: "Brand Mentions",
				subtitle: "Identity-verified monitoring — anchors keep common names from producing noise.",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: refresh,
					disabled: busy || !terms.length,
					className: "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
						size: 13,
						className: busy ? "animate-spin" : ""
					}), " Scan now"]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-3",
					children: "Watch a term"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-[1.2fr_auto_1.2fr_1.2fr_auto]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: term,
							onChange: (e) => setTerm(e.target.value),
							onKeyDown: (e) => e.key === "Enter" && addTerm(),
							placeholder: "Your name, brand, @handle or domain",
							className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: type,
							onChange: (e) => setType(e.target.value),
							className: "px-3 py-2 rounded-xl bg-background border border-border text-sm capitalize",
							children: TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: t,
								children: t
							}, t))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: anchors,
							onChange: (e) => setAnchors(e.target.value),
							placeholder: "Must also mention (comma separated)",
							className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: negatives,
							onChange: (e) => setNegatives(e.target.value),
							placeholder: "Exclude if it mentions…",
							className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: addTerm,
							className: "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Watch"]
						})
					]
				}),
				terms.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: terms.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: `inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs ${t.enabled ? "border-border bg-background/60" : "border-border/50 bg-muted/40 text-muted-foreground"}`,
						title: t.lastCheckedAt ? `Scanned ${relTime(t.lastCheckedAt)}` : "Never scanned",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: t.term
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] uppercase text-muted-foreground",
								children: t.type
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: async () => {
									await db.watchTerms.update(t.id, { enabled: !t.enabled });
									markCloudRecordDirty("watchTerms", t.id);
									queueCloudPush();
								},
								className: "p-1 rounded-full hover:bg-secondary",
								"aria-label": "Toggle term",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { size: 12 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: async () => {
									await db.watchTerms.delete(t.id);
									markCloudRecordDirty("watchTerms", t.id, "delete");
									queueCloudPush();
								},
								className: "p-1 rounded-full hover:bg-destructive/15 hover:text-destructive",
								"aria-label": "Remove term",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
							})
						]
					}, t.id))
				})
			] }),
			mentions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: terms.length ? "No verified mentions yet" : "Add a term to watch",
				hint: "Anchors (company, city, niche) are required for common personal names so you only see the real you."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2.5",
				children: mentions.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamRow, { item: m }, m.id))
			})
		]
	});
}
//#endregion
export { MentionsPage as default };
