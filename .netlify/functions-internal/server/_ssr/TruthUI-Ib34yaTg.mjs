import { b as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Ct as Link2Off, U as RefreshCw, d as TriangleAlert, j as ShieldCheck } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/TruthUI-Ib34yaTg.js
var import_jsx_runtime = require_jsx_runtime();
var TRUTH_LABEL = {
	live: "LIVE",
	cached: "CACHED",
	manual: "MANUAL",
	stale: "STALE",
	not_connected: "NOT CONNECTED",
	unavailable: "UNAVAILABLE",
	error: "ERROR"
};
/** Tailwind classes per state — restrained, premium, works in light + dark. */
var TRUTH_TONE = {
	live: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
	cached: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/25",
	manual: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/25",
	stale: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
	not_connected: "text-muted-foreground bg-muted/40 border-border",
	unavailable: "text-muted-foreground bg-muted/40 border-border",
	error: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25"
};
/** "4m ago" / "3d ago" — returns null when we genuinely do not know. */
function freshness(iso) {
	if (!iso) return null;
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return null;
	const s = Math.max(0, Math.round((Date.now() - t) / 1e3));
	if (s < 45) return "just now";
	if (s < 3600) return `${Math.round(s / 60)}m ago`;
	if (s < 86400) return `${Math.round(s / 3600)}h ago`;
	return `${Math.round(s / 86400)}d ago`;
}
/** Small provenance chip. Every externally-sourced panel must render one. */
function TruthBadge({ state, meta, className = "" }) {
	const s = state ?? meta?.truthState ?? "unavailable";
	const age = freshness(meta?.fetchedAt ?? meta?.observedAt);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		title: meta?.error ?? meta?.source ?? void 0,
		className: `inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TRUTH_TONE[s]} ${className}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-1.5 w-1.5 rounded-full bg-current" }),
			TRUTH_LABEL[s],
			age && s !== "not_connected" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "font-semibold opacity-70",
				children: ["· ", age]
			})
		]
	});
}
/** Honest empty state for a connector that has no credentials configured. */
function ConnectorEmpty({ title, description, docsUrl, onRetry }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card-glass flex flex-col items-center gap-3 p-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2Off, { size: 20 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-bold text-foreground",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mx-auto mt-1 max-w-md text-xs text-muted-foreground",
				children: description
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [onRetry && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: onRetry,
					className: "btn-secondary text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 12 }), " Retry"]
				}), docsUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: docsUrl,
					target: "_blank",
					rel: "noopener noreferrer",
					className: "btn-primary text-xs",
					children: "How to connect"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { size: 11 }), " No demo data is ever shown here"]
			})
		]
	});
}
/** Real error surface — never silently swallowed. */
function ConnectorError({ message, onRetry }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card-glass flex items-start gap-3 border-red-500/25 p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
				size: 16,
				className: "mt-0.5 shrink-0 text-red-500"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-bold text-foreground",
					children: "Connector request failed"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 break-words text-xs text-muted-foreground",
					children: message
				})]
			}),
			onRetry && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: onRetry,
				className: "btn-secondary shrink-0 text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 12 }), " Retry"]
			})
		]
	});
}
//#endregion
export { freshness as i, ConnectorError as n, TruthBadge as r, ConnectorEmpty as t };
