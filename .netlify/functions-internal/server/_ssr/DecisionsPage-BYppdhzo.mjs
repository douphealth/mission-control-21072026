import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { J as useSyncHealth, O as useDecisions, U as useSEOIssues, Y as useTasks, b as useAuditLog, p as restoreFromAudit, q as useStreamItems, t as describeAudit } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { B as Scale, K as RefreshCcw, Lt as History, On as Check, _n as Clock, n as X } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { s as relTime } from "./ui-BiQ_kQgK.mjs";
import { a as ignoreDecision, i as generateDecisions, n as actOnDecision, o as reopenDueDecisions, r as deferDecision, t as SEVERITY_STYLE } from "./decisions-BBH1QCp5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/DecisionsPage-BYppdhzo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FILTERS = [
	"open",
	"acted",
	"ignored",
	"later"
];
function DecisionsPage() {
	const decisions = useDecisions();
	const seoIssues = useSEOIssues();
	const streamItems = useStreamItems();
	const tasks = useTasks();
	const health = useSyncHealth();
	const audit = useAuditLog(40);
	const [filter, setFilter] = (0, import_react.useState)("open");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const list = (0, import_react.useMemo)(() => decisions.filter((d) => d.status === filter).sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")), [decisions, filter]);
	async function scan() {
		setBusy(true);
		try {
			await reopenDueDecisions();
			const created = await generateDecisions({
				seoIssues,
				mentions: streamItems,
				tasks,
				health
			});
			toast.success(created > 0 ? `${created} new decision(s) surfaced` : "No new findings — you are current");
		} catch (e) {
			toast.error(e?.message ?? "Scan failed");
		} finally {
			setBusy(false);
		}
	}
	async function act(d) {
		await actOnDecision(d);
		toast.success("Task created and linked");
	}
	async function ignore(d) {
		const reason = window.prompt("Why are you ignoring this? (kept in history)") ?? "";
		if (!reason.trim()) return;
		await ignoreDecision(d, reason.trim());
		toast.success("Ignored with reason");
	}
	async function later(d) {
		await deferDecision(d, 7);
		toast.success("Back in 7 days");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold tracking-tight text-foreground flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scale, {
						size: 22,
						className: "text-primary"
					}), " Decision Center"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground mt-1",
					children: "Every finding ends in a decision: act, ignore with a reason, or come back on a date."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: scan,
					disabled: busy,
					className: "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground disabled:opacity-60",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCcw, {
						size: 15,
						className: busy ? "animate-spin" : ""
					}), " Scan findings"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1.5",
				children: FILTERS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setFilter(f),
					className: `px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:bg-secondary/60"}`,
					children: [
						f,
						" (",
						decisions.filter((d) => d.status === f).length,
						")"
					]
				}, f))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 xl:grid-cols-3 gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "xl:col-span-2 space-y-2",
					children: [list.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 text-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted-foreground",
							children: [
								"No ",
								filter,
								" decisions. Run a scan to pull in fresh findings."
							]
						})
					}), list.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-semibold text-foreground",
										children: d.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground mt-1",
										children: d.context
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${SEVERITY_STYLE[d.severity]}`,
									children: d.severity
								})]
							}),
							d.recommendation && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs mt-2 rounded-xl bg-secondary/50 px-3 py-2 text-foreground",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold",
									children: "Recommended: "
								}), d.recommendation]
							}),
							d.status === "open" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2 mt-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => act(d),
										className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-primary-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 13 }), " Act"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => later(d),
										className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 hover:bg-secondary/60",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 13 }), " Later"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => ignore(d),
										className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 hover:bg-secondary/60",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 13 }), " Ignore"]
									})
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-muted-foreground mt-2",
								children: [d.status === "later" ? `Returns ${d.deferUntil}` : d.resolutionNote || `Marked ${d.status}`, d.resolvedAt ? ` · ${relTime(d.resolvedAt)}` : ""]
							})
						]
					}, d.id))]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 h-fit",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "font-semibold text-sm flex items-center gap-2 mb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, {
							size: 16,
							className: "text-primary"
						}), " Audit history"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5 max-h-[520px] overflow-y-auto pr-1",
						children: [audit.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "No changes recorded yet."
						}), audit.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border/50 px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-foreground truncate",
								children: describeAudit(a)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 mt-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-muted-foreground",
									children: relTime(a.at)
								}), a.before && (a.action === "delete" || a.action === "update") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: async () => {
										const ok = await restoreFromAudit(a);
										toast[ok ? "success" : "error"](ok ? "Restored previous version" : "Could not restore");
									},
									className: "text-[11px] font-semibold text-primary",
									children: "Restore"
								})]
							})]
						}, a.id))]
					})]
				})]
			})
		]
	});
}
//#endregion
export { DecisionsPage as default };
