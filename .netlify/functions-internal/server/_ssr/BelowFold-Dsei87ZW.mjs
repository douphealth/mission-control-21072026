import { i as __toESM } from "../_runtime.mjs";
import { t as db } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { J as useSyncHealth, n as forceCloudSync } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { B as Scale, Ht as Globe, K as RefreshCcw, M as ShieldCheck, On as Check, Tn as ChevronRight, j as ShieldQuestionMark, n as X, nn as EyeOff, q as Radar, rn as ExternalLink } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { m as useNavigationStore } from "./routes-qm6I9RAb.mjs";
import { s as upsertDecision } from "./decisions-BBH1QCp5.mjs";
import { i as effectiveStatus, n as SYNC_SOURCES, r as ageLabel, t as STATUS_STYLE } from "./reliability-C67EvvSL.mjs";
import { n as setValidationResult, r as statusLabel, t as isDueForReview } from "./DashboardHome-DOEc0LAH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/BelowFold-Dsei87ZW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TONE$1 = {
	attention: "border-amber-500/30 bg-amber-500/[0.06]",
	unknown: "border-border/60 bg-secondary/30",
	healthy: "border-emerald-500/25 bg-emerald-500/[0.05]"
};
var BADGE = {
	attention: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
	unknown: "bg-secondary text-muted-foreground",
	healthy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
};
function SitePulse({ rows }) {
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);
	if (rows.length === 0) return null;
	const open = (row) => {
		setFocusEntity({
			type: "website",
			id: row.id,
			label: row.name
		});
		setActiveSection(row.openIssues > 0 ? "seo" : "websites");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "enterprise-card rounded-[28px] p-5 sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { size: 15 })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
				children: "Portfolio"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-[17px] font-extrabold tracking-tight text-foreground",
				children: "Site pulse"
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => open(r),
				className: `flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${TONE$1[r.status]}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12.5px] font-bold text-foreground",
								children: r.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${BADGE[r.status]}`,
								children: r.status === "unknown" ? "Status unknown" : r.headline
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-0.5 truncate text-[11px] text-muted-foreground",
							children: r.detail
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70",
							children: r.provenance
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
					size: 14,
					className: "shrink-0 text-muted-foreground"
				})]
			}, r.id))
		})]
	});
}
var TONE = {
	failed: "border-destructive/30 bg-destructive/[0.06]",
	monitoring: "border-info/25 bg-info/[0.05]",
	validating: "border-border/60 bg-secondary/30",
	pending: "border-border/60 bg-secondary/30",
	passed: "border-emerald-500/25 bg-emerald-500/[0.05]"
};
function ValidationPulse({ items, today }) {
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);
	if (items.length === 0) return null;
	const open = (v) => {
		if (v.entityId) setFocusEntity({
			type: "validation",
			id: v.entityId,
			label: v.entityLabel
		});
		if (v.section) setActiveSection(v.section);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "enterprise-card rounded-[28px] p-5 sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex h-8 w-8 items-center justify-center rounded-xl bg-info/10 text-info",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldQuestionMark, { size: 15 })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
				children: "Proof"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-[17px] font-extrabold tracking-tight text-foreground",
				children: "Validating"
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children: items.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `rounded-2xl border p-3 ${TONE[v.status]}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => open(v),
					className: "block w-full text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[12.5px] font-bold text-foreground",
							children: v.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-0.5 text-[11px] text-muted-foreground",
							children: [
								statusLabel(v, today),
								v.reviewAt ? ` · review ${v.reviewAt}` : "",
								v.entityLabel ? ` · ${v.entityLabel}` : ""
							]
						}),
						v.successCriteria && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 text-[10px] text-muted-foreground/80",
							children: ["Success: ", v.successCriteria]
						})
					]
				}), isDueForReview(v, today) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setValidationResult(v.id, "passed", "Verified from Daily Home"),
						className: "inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 12 }), " Worked"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setValidationResult(v.id, "failed", "Did not work"),
						className: "inline-flex items-center gap-1 rounded-xl bg-destructive/12 px-2.5 py-1.5 text-[11px] font-bold text-destructive",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 12 }), " Did not work"]
					})]
				})]
			}, v.id))
		})]
	});
}
function freshness(iso) {
	const d = new Date(iso).getTime();
	if (!Number.isFinite(d)) return "unknown date";
	const hrs = Math.round((Date.now() - d) / 36e5);
	if (hrs < 1) return "just now";
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.round(hrs / 24)}d ago`;
}
function IntelligencePulse({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "enterprise-card rounded-[28px] p-5 sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radar, { size: 15 })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
				children: "Intelligence"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-[17px] font-extrabold tracking-tight text-foreground",
				children: "For you today"
			})] })]
		}), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[12px] text-muted-foreground",
			children: "No important developments require attention."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2.5",
			children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border/60 bg-secondary/25 p-3.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: i.url,
						target: "_blank",
						rel: "noreferrer noopener",
						className: "block text-[12.5px] font-bold text-foreground hover:text-primary",
						children: [
							i.title,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
								size: 11,
								className: "inline align-baseline"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 text-[11px] text-muted-foreground",
						children: i.relevance
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70",
						children: [
							i.source,
							" · ",
							freshness(i.publishedAt)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: async () => {
								await upsertDecision({
									title: i.title,
									context: `${i.relevance}. Source: ${i.source} — ${i.url}`,
									source: "manual",
									fingerprintParts: ["intel", i.id],
									severity: "medium"
								});
								toast.success("Finding created");
							},
							className: "inline-flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scale, { size: 12 }), " Create finding"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: async () => {
								await db.streamItems.update(i.id, { read: true });
								toast.message("Dismissed");
							},
							className: "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { size: 12 }), " Ignore"]
						})]
					})
				]
			}, i.id))
		})]
	});
}
function ReliabilityPanel({ compact = false }) {
	const health = useSyncHealth();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const rows = SYNC_SOURCES.map((s) => {
		const row = health.find((h) => h.id === s.id);
		const status = effectiveStatus(row);
		return {
			...s,
			row,
			status
		};
	});
	const shown = compact ? rows.filter((r) => r.status !== "not-configured").slice(0, 4) : rows;
	const retry = async () => {
		setBusy(true);
		try {
			await forceCloudSync();
			toast.success("Sync retried");
		} catch (e) {
			toast.error(e?.message ?? "Retry failed");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 sm:p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3 mb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				className: "font-semibold text-sm flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, {
					size: 16,
					className: "text-primary"
				}), " Reliability"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: retry,
				disabled: busy,
				className: "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-secondary/60 disabled:opacity-50",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCcw, {
					size: 12,
					className: busy ? "animate-spin" : ""
				}), " Retry sync"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-1.5",
			children: [shown.map((r) => {
				const style = STATUS_STYLE[r.status];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-foreground truncate",
							children: r.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-muted-foreground truncate",
							children: r.row?.error ? r.row.error : `Last success ${ageLabel(r.row?.lastSuccessAt)}${r.row?.pending ? ` · ${r.row.pending} pending` : ""}`
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: `shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${style.cls}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `w-1.5 h-1.5 rounded-full ${style.dot}` }), style.label]
					})]
				}, r.id);
			}), shown.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "No sources connected yet."
			})]
		})]
	});
}
function BelowFold({ ops }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-1 gap-4 lg:grid-cols-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-4 lg:col-span-7",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SitePulse, { rows: ops.sitePulse }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ValidationPulse, {
				items: ops.validationPulse,
				today: ops.today
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-4 lg:col-span-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReliabilityPanel, { compact: true }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntelligencePulse, { items: ops.intelligence })]
		})]
	});
}
//#endregion
export { BelowFold as default };
