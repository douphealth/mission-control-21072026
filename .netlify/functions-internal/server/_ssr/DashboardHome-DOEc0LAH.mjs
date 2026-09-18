import { i as __toESM } from "../_runtime.mjs";
import { t as db } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { $ as useValidations, G as useSEOSnapshots, J as useSyncHealth, L as useNotes, O as useDecisions, Q as useUpdateItem, R as usePayments, U as useSEOIssues, W as useSEOProfiles, Y as useTasks, c as onDirtyRecordsChange, i as getRecordSyncState, m as retryCloudPush, q as useStreamItems, tt as useWebsites, z as useReminders } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as daysOverdue, l as todayISO, n as addDaysLocal, r as buildBriefing, t as PRIORITY_RANK } from "./overdue-CpArWbx3.mjs";
import { a as fmtMinutes, d as suggestOutcomes, i as fixedEventsFor, n as computeCapacity, r as estimateOf, s as isPlannedToday } from "./planning-CdLbbCHg.mjs";
import { $ as Pin, An as ChartBar, At as Keyboard, Cn as CircleCheck, D as Sparkles, Dn as ChevronDown, Fn as CalendarClock, H as RotateCcw, Hn as ArrowUpRight, Jt as Focus, L as Search, Pt as Inbox, Q as Play, Tn as ChevronRight, Wn as ArrowRight, Zt as Flag, _n as Clock, ct as Moon, d as TriangleAlert, dt as Mic, et as PinOff, fn as Command, g as Timer, h as Trash2, hn as Cloud, n as X, rt as Pause, t as Zap } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { E as usePlanStore, T as inArea, g as useIsMobile, m as useNavigationStore, o as QuickCaptureBar } from "./routes-qm6I9RAb.mjs";
import { i as daysSinceTouch, o as isOpen } from "./triage-Q9v9lxCb.mjs";
import { n as actOnDecision, r as deferDecision } from "./decisions-BBH1QCp5.mjs";
import { i as effectiveStatus, n as SYNC_SOURCES, r as ageLabel } from "./reliability-C67EvvSL.mjs";
import { o as isGCalConnected } from "./googleCalendar-B8JefTzG.mjs";
import { s as rescheduleToTomorrow, u as softDeleteTasks } from "./taskActions-CDh7MXDW.mjs";
import { t as useGoogleCalendar } from "./useGoogleCalendar-Bhv1HlZF.mjs";
import { t as DayClose } from "./DayClose-DbzsXX5_.mjs";
import { n as scoreItem, t as reasonsOf } from "./priorityEngine-CLGg7F_y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/DashboardHome-DOEc0LAH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var OPEN_STATUSES = [
	"pending",
	"validating",
	"monitoring"
];
function isOpenValidation(v) {
	return OPEN_STATUSES.includes(v.status);
}
/** Only things needing proof now, or very soon. Newest review date first. */
function pendingValidations(all, today = todayISO(), limit = 4) {
	return all.filter((v) => v.status === "failed" || isOpenValidation(v)).sort((a, b) => {
		if (a.status === "failed" && b.status !== "failed") return -1;
		if (b.status === "failed" && a.status !== "failed") return 1;
		return (a.reviewAt || "9999").localeCompare(b.reviewAt || "9999");
	}).slice(0, limit);
}
function isDueForReview(v, today = todayISO()) {
	return !!v.reviewAt && v.reviewAt <= today && isOpenValidation(v);
}
function statusLabel(v, today = todayISO()) {
	switch (v.status) {
		case "pending": return "Waiting for validation";
		case "validating": return isDueForReview(v, today) ? "Ready to verify" : "Validating";
		case "monitoring": return isDueForReview(v, today) ? "Observation window closed" : "Monitoring";
		case "passed": return "Verified";
		default: return "Failed";
	}
}
async function setValidationResult(id, status, result) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	await db.validations.update(id, {
		status,
		result,
		validatedAt: status === "passed" || status === "failed" ? now : void 0,
		updatedAt: now
	});
}
var subscribe = (cb) => onDirtyRecordsChange(cb);
/** Live saved / pending / failed state for one record. */
function useRecordSync(collection, recordId) {
	return (0, import_react.useSyncExternalStore)(subscribe, () => getRecordSyncState(collection, recordId), () => "saved");
}
function SyncDot({ id }) {
	const state = useRecordSync("tasks", id);
	if (state === "saved" || state === "local-only") return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: state === "failed" ? () => void retryCloudPush() : void 0,
		title: state === "failed" ? "Cloud save failed — click to retry" : "Saved here · syncing to cloud",
		"aria-label": state === "failed" ? "Sync failed, retry" : "Pending sync",
		className: `inline-flex h-4 shrink-0 items-center gap-1 rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wide ${state === "failed" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`,
		children: state === "failed" ? "retry" : "pending"
	});
}
function DueBadge({ due, today }) {
	if (!due) return null;
	const overdue = due < today;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `inline-flex items-center gap-1 text-[10.5px] font-semibold ${overdue ? "text-destructive" : due === today ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`,
		children: [overdue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
			size: 10,
			"aria-hidden": true
		}), overdue ? `overdue · was due ${due.slice(5)}` : due === today ? "due today" : `due ${due.slice(5)}`]
	});
}
function TodayPlan({ today, nextAction, commitments, outcomesAreChosen, suggestedPlan, capacity, fixed, onComplete, onCommit, onFocus }) {
	const updateItem = useUpdateItem();
	const { markMorningPlan, lastMorningPlan } = usePlanStore();
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	const [planStart] = (0, import_react.useState)(() => Date.now());
	const over = capacity.overMin > 0;
	const next = nextAction;
	const applySuggestion = async () => {
		for (const s of suggestedPlan) await updateItem("tasks", s.task.id, {
			committedOn: today,
			inbox: false,
			estimateMin: s.task.estimateMin ?? s.minutes
		});
		markMorningPlan(today, Date.now() - planStart);
		toast.success(`Planned ${suggestedPlan.length} outcome${suggestedPlan.length > 1 ? "s" : ""}`, { description: "Deadlines untouched. Unpin any of them to change your mind." });
	};
	const unpin = async (item) => {
		await updateItem("tasks", item.refId, { committedOn: void 0 });
	};
	const moveOne = async (item) => {
		await rescheduleToTomorrow(item.raw, today);
		toast.success("Moved to tomorrow — deadline unchanged");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "se-card ultra-rise-3 p-4 sm:p-6",
		"aria-labelledby": "today-heading",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "se-label",
						children: "Do next"
					}), next ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						id: "today-heading",
						className: "title-grad mt-1.5 font-display text-[22px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[28px]",
						children: next.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground",
						children: [
							next.kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, {
										size: 11,
										"aria-hidden": true
									}),
									" ",
									fmtMinutes(estimateOf(next.raw))
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DueBadge, {
								due: next.due,
								today
							}),
							next.context && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: next.context
							}),
							next.kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SyncDot, { id: next.refId })
						]
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						id: "today-heading",
						className: "mt-1.5 font-display text-[22px] font-extrabold tracking-tight text-foreground",
						children: "Nothing chosen yet"
					})]
				}), next && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex shrink-0 flex-col gap-2 sm:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => onFocus(next),
						className: "se-btn se-btn-primary h-10 px-4 text-[12.5px]",
						children: ["Start ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 14 })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => onComplete(next),
						"aria-label": "Mark done",
						className: "se-btn se-btn-ghost h-10 px-3 text-[12.5px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 14 }), " Done"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 rounded-2xl border border-border/40 bg-background/40 p-3.5",
				role: "status",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3 text-[11.5px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5 font-semibold text-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, {
									size: 12,
									"aria-hidden": true
								}),
								fmtMinutes(capacity.plannedMin),
								" selected · ",
								fmtMinutes(capacity.availableMin),
								" free",
								capacity.fixedMin > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-normal text-muted-foreground",
									children: [
										"(",
										fmtMinutes(capacity.fixedMin),
										" in meetings)"
									]
								})
							]
						}), over ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-bold text-destructive",
							children: ["over by ", fmtMinutes(capacity.overMin)]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground",
							children: "realistic"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2.5 zen-cap-bar",
						"aria-hidden": true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `zen-cap-fill ${over ? "over" : ""}`,
							style: { width: `${Math.min(100, capacity.ratio * 100)}%` }
						})
					}),
					over && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2.5 flex items-start gap-1.5 text-[11.5px] text-foreground/85",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
							size: 12,
							className: "mt-0.5 shrink-0 text-destructive",
							"aria-hidden": true
						}), "Your selected work exceeds today's available time. Choose what to move — deadlines stay where they are."]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "se-label",
							children: outcomesAreChosen ? "Today's outcomes" : "Suggested for today"
						}), !outcomesAreChosen && suggestedPlan.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: applySuggestion,
							className: "se-btn se-btn-ghost h-8 px-3 text-[11px]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 11 }),
								" Commit ",
								suggestedPlan.length
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-3 space-y-2",
						children: [
							(outcomesAreChosen ? commitments : []).map((item) => {
								const isDone = item.raw && item.raw.status === "done";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: `se-outcome group ${isDone ? "se-outcome-done" : ""}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => onComplete(item),
											"aria-label": `Mark "${item.title}" done`,
											className: "se-check",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 13 })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "se-outcome-title truncate text-[13.5px] font-semibold text-foreground",
												children: item.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-muted-foreground",
												children: [
													item.kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmtMinutes(estimateOf(item.raw)) }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DueBadge, {
														due: item.due,
														today
													}),
													item.kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SyncDot, { id: item.refId })
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex shrink-0 items-center gap-1",
											children: [over && item.kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => moveOne(item),
												title: "Move to tomorrow (deadline unchanged)",
												className: "se-icon-btn",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { size: 13 })
											}), item.kind === "task" && item.raw.committedOn === today && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => unpin(item),
												title: "Unpin from today",
												className: "se-icon-btn",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinOff, { size: 13 })
											})]
										})
									]
								}, item.id);
							}),
							!outcomesAreChosen && suggestedPlan.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-center gap-3 rounded-2xl border border-dashed border-border/50 px-3.5 py-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "truncate text-[13.5px] font-semibold text-foreground",
										children: s.task.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-0.5 text-[10.5px] text-muted-foreground",
										children: [
											fmtMinutes(s.minutes),
											" · because ",
											s.reason
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => updateItem("tasks", s.task.id, {
										committedOn: today,
										inbox: false
									}),
									title: "Pin just this one",
									className: "se-icon-btn",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { size: 13 })
								})]
							}, s.task.id)),
							!outcomesAreChosen && suggestedPlan.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "rounded-2xl border border-dashed border-border/50 px-3.5 py-5 text-center text-[12px] text-muted-foreground",
								children: [
									"Nothing queued for today. Capture something with",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
										className: "rounded border border-border/60 px-1 text-[10px]",
										children: "N"
									}),
									" or",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setActiveSection("tasks"),
										className: "font-semibold text-primary underline-offset-2 hover:underline",
										children: "pick from Tasks"
									}),
									"."
								]
							})
						]
					}),
					outcomesAreChosen && lastMorningPlan !== today && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => markMorningPlan(today, Date.now() - planStart),
						className: "mt-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground",
						children: "This is my plan for today ✓"
					})
				]
			}),
			fixed.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "se-label",
					children: "Fixed today"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2.5 divide-y divide-border/30 rounded-2xl border border-border/30 bg-background/30",
					children: fixed.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-[92px] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground",
								children: f.allDay ? "all day" : `${f.start}–${f.end}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 flex-1 truncate font-medium text-foreground",
								children: f.title
							}),
							f.htmlLink && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: f.htmlLink,
								target: "_blank",
								rel: "noreferrer",
								className: "text-[10.5px] font-semibold text-muted-foreground hover:text-foreground",
								children: "open"
							})
						]
					}, f.id))
				})]
			})
		]
	});
}
var KIND_STYLE = {
	task: {
		badge: "bg-primary/10 text-primary",
		dot: "bg-primary",
		label: "Task"
	},
	reminder: {
		badge: "bg-info/10 text-info",
		dot: "bg-info",
		label: "Reminder"
	},
	payment: {
		badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
		dot: "bg-amber-500",
		label: "Payment"
	},
	decision: {
		badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
		dot: "bg-violet-500",
		label: "Decision"
	},
	flag: {
		badge: "bg-destructive/10 text-destructive",
		dot: "bg-destructive",
		label: "Attention"
	}
};
var SEVERITY_RING = {
	critical: "border-destructive/30 bg-destructive/[0.04]",
	warning: "border-amber-500/30 bg-amber-500/[0.04]",
	info: "border-border/50 bg-background/40"
};
function EntryRow({ entry, onComplete, onPlan, onCommit, isNow }) {
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	const setFocusTaskId = useNavigationStore((s) => s.setFocusTaskId);
	const ks = KIND_STYLE[entry.kind] ?? KIND_STYLE.task;
	if (entry.kind === "flag") {
		const sev = entry.severity ?? "warning";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setActiveSection(entry.flag?.section ?? entry.section),
			className: `group relative flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 ${SEVERITY_RING[sev]}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${sev === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 14 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[13px] font-bold leading-snug text-foreground",
						children: entry.title
					}), entry.reasons[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-0.5 block truncate text-[11px] text-muted-foreground",
						children: entry.reasons[0]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-bold text-foreground",
					children: [
						entry.flag?.actionLabel ?? "Open",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { size: 10 })
					]
				})
			]
		});
	}
	const w = entry.workItem;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `se-tl-row group ${isNow ? "se-tl-row-now" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "se-time",
				children: entry.time ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
					size: 12,
					className: "text-primary"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `se-pill ${ks.badge}`,
							children: ks.label
						}),
						isNow && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "living-badge",
							children: "Now"
						}),
						w && w.overdueDays > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "se-pill bg-destructive/12 text-destructive",
							children: [w.overdueDays, "d late"]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setActiveSection(entry.section),
					className: "mt-1 block w-full text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[13px] font-semibold leading-snug text-foreground",
						children: entry.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-0.5 block truncate text-[11px] text-muted-foreground",
						children: entry.reasons.join(" · ")
					})]
				})]
			}),
			w && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 items-center gap-1 opacity-50 transition group-hover:opacity-100",
				children: [
					w.kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setFocusTaskId(w.refId);
							setActiveSection("focus");
						},
						title: "Start a focus session",
						className: "se-icon-btn",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { size: 14 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onPlan?.(w, 1),
						title: "Plan for tomorrow",
						className: "se-icon-btn",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 14 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onComplete?.(w),
						title: "Complete",
						className: "se-icon-btn hover:bg-emerald-500/10 hover:text-emerald-500",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 14 })
					})
				]
			})
		]
	});
}
function TodayTimeline({ timeline, onComplete, onPlan, onCommit }) {
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	const { entries, nowIndex, counts } = timeline;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "se-card-acc ultra-rise-3 p-5 sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "zen-glow-spot -top-16 -right-10",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "se-label",
						children: "Today"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "title-grad mt-1 font-display text-[20px] font-extrabold tracking-tight sm:text-[24px]",
						children: "One timeline"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 text-[11px] text-muted-foreground",
						children: [
							counts.flags > 0 ? `${counts.flags} needing attention · ` : "",
							counts.timed,
							" timed · ",
							counts.untimed,
							" queued"
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setActiveSection("calendar"),
					className: "se-btn se-btn-ghost h-8 px-3 text-[11px]",
					children: "Calendar"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative space-y-2.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "zen-rail absolute top-2 bottom-2 left-[27px] w-px sm:left-[31px]",
						"aria-hidden": true
					}),
					entries.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-2xl border border-dashed border-border/60 p-6 text-center text-[12px] text-muted-foreground",
						children: "Nothing today. Capture something or review what is coming."
					}),
					entries.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [i === nowIndex && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative z-10 my-2 flex items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex h-[14px] w-[14px] shrink-0 translate-x-[20px] items-center justify-center sm:translate-x-[24px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute h-[10px] w-[10px] animate-ping rounded-full bg-primary/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative h-[8px] w-[8px] rounded-full bg-primary" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary",
									children: "Now"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-primary/20" })
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative z-10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntryRow, {
								entry: e,
								isNow: i === nowIndex && e.kind !== "flag",
								onComplete,
								onPlan,
								onCommit
							})
						})]
					}, e.id)),
					nowIndex === entries.length && entries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 mt-2 flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex h-[14px] w-[14px] shrink-0 translate-x-[20px] items-center justify-center sm:translate-x-[24px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute h-[10px] w-[10px] animate-ping rounded-full bg-primary/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative h-[8px] w-[8px] rounded-full bg-primary" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary",
								children: "Now"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-primary/20" })
						]
					}),
					counts.flags === 0 && entries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
							size: 16,
							className: "text-emerald-500"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[12px] text-muted-foreground",
							children: "No exceptions. Deadlines, payments, decisions and syncs are all healthy."
						})]
					})
				]
			})
		]
	});
}
function InboxStrip({ tasks, today }) {
	const updateItem = useUpdateItem();
	const [open, setOpen] = (0, import_react.useState)(false);
	if (!tasks.length) return null;
	const shown = open ? tasks : tasks.slice(0, 3);
	const pin = (t) => updateItem("tasks", t.id, {
		committedOn: today,
		inbox: false
	});
	const later = (t) => {
		const d = addDaysLocal(today, 1);
		return updateItem("tasks", t.id, {
			scheduledAt: d,
			notBefore: d,
			inbox: false
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "se-card p-3.5 sm:p-4",
		"aria-labelledby": "inbox-heading",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				id: "inbox-heading",
				className: "flex items-center gap-2 text-[12.5px] font-bold text-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, {
						size: 14,
						className: "text-muted-foreground"
					}),
					" Inbox",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-full bg-secondary px-1.5 text-[10px] font-bold text-muted-foreground",
						children: tasks.length
					})
				]
			}), tasks.length > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setOpen((o) => !o),
				className: "flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground",
				children: [open ? "Less" : `All ${tasks.length}`, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
					size: 12,
					className: open ? "rotate-180" : ""
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-2.5 space-y-1",
			children: shown.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "group flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-secondary/40",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 flex-1 truncate text-[13px] text-foreground",
					children: t.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex shrink-0 items-center gap-0.5 opacity-50 transition group-hover:opacity-100",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => pin(t),
							title: "Do today",
							"aria-label": `Do "${t.title}" today`,
							className: "se-icon-btn hover:bg-primary/10 hover:text-primary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { size: 13 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => later(t),
							title: "Tomorrow",
							"aria-label": `Plan "${t.title}" for tomorrow`,
							className: "se-icon-btn",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { size: 13 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => softDeleteTasks([t.id]),
							title: "Delete (recoverable)",
							"aria-label": `Delete "${t.title}"`,
							className: "se-icon-btn hover:bg-destructive/10 hover:text-destructive",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 })
						})
					]
				})]
			}, t.id))
		})]
	});
}
var TOTAL = 1500;
function FocusDock({ item, onDone, onClose }) {
	const [remaining, setRemaining] = (0, import_react.useState)(TOTAL);
	const [running, setRunning] = (0, import_react.useState)(true);
	const intervalRef = (0, import_react.useRef)(void 0);
	const updateItem = useUpdateItem();
	const today = todayISO();
	(0, import_react.useEffect)(() => {
		if (running && remaining > 0) intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1e3);
		else if (running && remaining === 0) setRunning(false);
		return () => clearInterval(intervalRef.current);
	}, [running, remaining]);
	const complete = async () => {
		if (item.kind === "task") {
			await updateItem("tasks", item.refId, {
				status: "done",
				completedAt: (/* @__PURE__ */ new Date()).toISOString(),
				touchedAt: today
			});
			toast.success(`"${item.title}" done — session closed`);
		} else {
			toast.info("Only tasks complete from the dock — open the item for other kinds");
			return;
		}
		onDone?.();
		onClose();
	};
	const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
	const ss = String(remaining % 60).padStart(2, "0");
	const pct = (TOTAL - remaining) / TOTAL * 100;
	const c = 2 * Math.PI * 15;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative overflow-hidden rounded-[24px] border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl sm:p-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "44",
						height: "44",
						viewBox: "0 0 36 36",
						className: "-rotate-90",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "18",
							cy: "18",
							r: "15",
							fill: "none",
							strokeWidth: "3.5",
							className: "stroke-white/15"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "18",
							cy: "18",
							r: "15",
							fill: "none",
							strokeWidth: "3.5",
							strokeLinecap: "round",
							stroke: "#6ee7b7",
							strokeDasharray: c,
							strokeDashoffset: c - Math.min(100, pct) / 100 * c,
							style: { transition: "stroke-dashoffset 1s linear" }
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular-nums text-white",
						children: [
							mm,
							":",
							ss
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { size: 10 }), " Focus session"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 truncate text-[14px] font-bold text-white",
							children: item.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-0.5 text-[11px] text-white/60",
							children: running ? "Running — one thing, no tabs" : remaining === 0 ? "Session complete" : "Paused"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex shrink-0 items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setRunning((r) => !r),
							className: "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition active:scale-95",
							title: running ? "Pause" : "Resume",
							children: running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
								size: 15,
								className: "ml-0.5"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setRemaining(TOTAL),
							className: "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition active:scale-95",
							title: "Reset",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 14 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: complete,
							className: "flex h-10 items-center gap-1.5 rounded-2xl bg-white px-3 text-[12px] font-bold text-slate-900 transition active:scale-95",
							title: "Complete the task",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 14 }), " Done"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "flex h-10 w-10 items-center justify-center rounded-2xl text-white/50 transition hover:text-white",
							title: "Close dock",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 16 })
						})
					]
				})
			]
		})
	});
}
var STARTERS = [
	{
		icon: Zap,
		title: "Capture your first task",
		hint: "Type anything in the bar above — \"fix sitemap tomorrow urgent\" lands as a task with a date and priority."
	},
	{
		icon: Mic,
		title: "Or just talk",
		hint: "The floating mic turns speech into structured items — tasks, notes, ideas, links."
	},
	{
		icon: Cloud,
		title: "Bring your data back",
		hint: "Already using Mission Control elsewhere? Sign in and this device fills itself from your private backup."
	}
];
function FirstRunExperience() {
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "se-card ultra-rise relative overflow-hidden p-6 sm:p-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-primary/[0.06] blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent/[0.05] blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 11 }), " First run"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-4 max-w-lg font-display text-[26px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-[34px]",
						children: "This system tells you what matters — the moment it knows your work."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground",
						children: "No data on this device yet — and that is stated honestly, never faked. One capture is all it takes: the timeline, the NOW marker, and the priority engine turn on with the first item you add."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-7 grid gap-3 sm:grid-cols-3",
						children: STARTERS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "se-empty-card group flex flex-col rounded-[22px] border border-border/50 bg-background/60 p-4 transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_48px_-32px_hsl(var(--primary)/0.6)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "se-empty-action",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { size: 18 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "mt-3 font-display text-[14.5px] font-bold leading-snug tracking-tight text-foreground",
									children: s.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1.5 flex-1 text-[11.5px] leading-relaxed text-muted-foreground",
									children: s.hint
								})
							]
						}, s.title))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-7 flex flex-wrap items-center gap-2.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveSection("tasks"),
								className: "se-btn se-btn-primary h-10 px-4 text-[12.5px]",
								children: ["Open Tasks ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 14 })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5 rounded-2xl border border-border/50 bg-secondary/40 px-3.5 py-2.5 text-[11.5px] font-semibold text-muted-foreground",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Keyboard, { size: 13 }), " Cmd+K anywhere"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5 rounded-2xl border border-border/50 bg-secondary/40 px-3.5 py-2.5 text-[11.5px] font-semibold text-muted-foreground",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { size: 13 }), " Focus dock on the hero"]
							})
						]
					})
				]
			})
		]
	});
}
function useClock() {
	const [now, setNow] = (0, import_react.useState)(() => /* @__PURE__ */ new Date());
	(0, import_react.useEffect)(() => {
		const t = window.setInterval(() => setNow(/* @__PURE__ */ new Date()), 15e3);
		return () => window.clearInterval(t);
	}, []);
	return now;
}
function ProgressArc({ pct, size = 72, stroke = 6 }) {
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const offset = c - Math.min(100, Math.max(0, pct)) / 100 * c;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: size,
		height: size,
		className: "-rotate-90",
		viewBox: `0 0 ${size} ${size}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: size / 2,
				cy: size / 2,
				r,
				strokeWidth: stroke,
				fill: "none",
				className: "se-arc-track"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: size / 2,
				cy: size / 2,
				r,
				strokeWidth: stroke,
				strokeLinecap: "round",
				fill: "none",
				stroke: "url(#seArcGrad)",
				strokeDasharray: c,
				strokeDashoffset: offset,
				className: "se-arc-fill"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
				id: "seArcGrad",
				x1: "0",
				y1: "0",
				x2: "1",
				y2: "1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "0%",
						stopColor: "#6ee7b7"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "45%",
						stopColor: "#38bdf8"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "100%",
						stopColor: "#a78bfa"
					})
				]
			}) })
		]
	});
}
function HeroNowBand({ nextAction, commitmentsTotal, commitmentsDone, plannedMin, availableMin, onFocus, onComplete }) {
	const now = useClock();
	const hhmm = now.toLocaleTimeString(void 0, {
		hour: "2-digit",
		minute: "2-digit"
	});
	const hour = now.getHours();
	const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
	const dateLabel = now.toLocaleDateString(void 0, {
		weekday: "long",
		day: "numeric",
		month: "long"
	});
	const donePct = commitmentsTotal > 0 ? Math.round(commitmentsDone / commitmentsTotal * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "se-hero ultra-rise text-white",
		"aria-label": "Now and day progress",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "se-hero-orb se-hero-orb--1",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "se-hero-orb se-hero-orb--2",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "se-hero-grid",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "se-hero-glow",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "se-hero-content p-5 sm:p-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-start justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70 backdrop-blur",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "relative flex h-1.5 w-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" })]
								}), dateLabel]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-4 font-display text-[30px] font-extrabold leading-[1.02] tracking-tighter text-white sm:text-[42px]",
								children: greeting
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1.5 text-[13px] text-white/45 sm:text-[14px]",
								children: commitmentsTotal > 0 ? `${commitmentsDone} of ${commitmentsTotal} outcomes complete · ${fmtMinutes(Math.max(0, availableMin))} free today` : "Capture something to get started"
							}),
							commitmentsTotal > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 max-w-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "se-bar",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "se-bar-fill",
										style: { width: `${donePct}%` }
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1.5 flex items-center justify-between text-[10.5px] font-semibold text-white/40",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [donePct, "% done"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono tabular-nums text-white/60",
										children: hhmm
									})]
								})]
							})
						]
					}), commitmentsTotal > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative shrink-0",
						role: "status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressArc, {
							pct: donePct,
							size: 80,
							stroke: 7
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-0 flex flex-col items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-display text-[18px] font-extrabold tabular-nums text-white",
								children: [donePct, "%"]
							})
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl sm:p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-emerald-300",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 10 }), " Do this now"]
					}), nextAction ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-[19px] font-bold leading-snug tracking-tight text-white sm:text-[24px]",
							children: nextAction.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-white/45",
							children: [
								nextAction.kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { size: 11 }),
										" ",
										fmtMinutes(estimateOf(nextAction.raw))
									]
								}),
								nextAction.due && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 11 }),
										" due ",
										nextAction.due.slice(5)
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1 text-emerald-300/60",
									children: [
										plannedMin > 0 ? fmtMinutes(plannedMin) : "0 min",
										" planned ·",
										" ",
										fmtMinutes(Math.max(0, availableMin)),
										" free"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => onFocus(nextAction),
								className: "se-btn se-btn-primary h-10 px-4 text-[12.5px]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { size: 14 }),
									" Start",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 14 })
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => onComplete(nextAction),
								className: "se-btn h-10 border border-white/15 bg-white/8 px-4 text-[12.5px] font-semibold text-white backdrop-blur hover:bg-white/15",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 14 }), " Done"]
							})]
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-[19px] font-bold tracking-tight text-white sm:text-[22px]",
							children: "Nothing is demanding your attention"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-[12px] text-white/45",
							children: [
								"Press ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
									className: "rounded border border-white/20 px-1 text-[10px]",
									children: "N"
								}),
								" to capture, or ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
									className: "rounded border border-white/20 px-1 text-[10px]",
									children: "?"
								}),
								" ",
								"for shortcuts."
							]
						})]
					})]
				})]
			})
		]
	});
}
var GROUPS = [{
	title: "Capture",
	items: [
		{
			keys: "N",
			label: "Focus the capture bar",
			icon: Inbox
		},
		{
			keys: "⌘K / Ctrl K",
			label: "Command palette — search, jump, act",
			icon: Search
		},
		{
			keys: "⌘N / Ctrl N",
			label: "Quick add menu",
			icon: Command
		},
		{
			keys: "Esc",
			label: "Clear or close",
			icon: X
		}
	]
}, {
	title: "Work",
	items: [{
		keys: "Focus button",
		label: "Start a focus session on any task",
		icon: Focus
	}]
}];
function ShortcutsOverlay({ open, onClose }) {
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const handler = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onClose]);
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-[70] flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Keyboard shortcuts",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v10-card w-full max-w-md rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-[var(--shadow-lg)] backdrop-blur-2xl sm:p-6",
			onClick: (e) => e.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Keyboard, { size: 16 })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-[15px] font-extrabold tracking-tight text-foreground",
						children: "Shortcuts"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10.5px] text-muted-foreground",
						children: "The fast paths — everything is one keystroke away"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: onClose,
					"aria-label": "Close shortcuts",
					className: "rounded-xl p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 15 })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 space-y-4",
				children: GROUPS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "zen-label text-[9.5px] font-bold uppercase tracking-[0.16em]",
					children: g.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-1.5 space-y-1",
					children: g.items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3 rounded-2xl px-2.5 py-2 transition hover:bg-secondary/50",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(it.icon, {
								size: 13,
								className: "shrink-0 text-muted-foreground",
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex-1 text-[12.5px] font-medium text-foreground",
								children: it.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
								className: "rounded-lg border border-border/60 bg-secondary/70 px-2 py-1 font-mono text-[10px] font-bold text-foreground",
								children: it.keys
							})
						]
					}, it.keys))
				})] }, g.title))
			})]
		})
	});
}
var OPTIONS = [
	{
		id: "all",
		label: "All"
	},
	{
		id: "personal",
		label: "Personal"
	},
	{
		id: "work",
		label: "Work"
	}
];
function AreaSwitch({ className = "" }) {
	const { area, setArea } = usePlanStore();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "radiogroup",
		"aria-label": "Show tasks from",
		title: "A view filter only — hidden items are not private",
		className: `inline-flex rounded-xl border border-border/60 bg-secondary/50 p-0.5 ${className}`,
		children: OPTIONS.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			role: "radio",
			"aria-checked": area === o.id,
			onClick: () => setArea(o.id),
			className: `rounded-[10px] px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${area === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
			children: o.label
		}, o.id))
	});
}
function scoreOf(input) {
	return scoreItem(input);
}
function bucketOf(item) {
	if (item.overdueDays > 0) return "today";
	if (item.due && item.due <= item.today) return "today";
	if (item.kind === "decision") return "today";
	return "later";
}
function buildWorkQueue(input) {
	const today = input.today ?? todayISO();
	const items = [];
	for (const t of input.tasks) {
		if (!isOpen(t)) continue;
		const overdue = daysOverdue(t, today);
		const stale = daysSinceTouch(t, today);
		const committed = t.committedOn === today;
		const openBlockDays = (t.blocks ?? []).filter((b) => !b.done).map((b) => b.date);
		const scheduled = openBlockDays.length ? [...openBlockDays].sort()[0] : t.scheduledAt;
		const plannedNow = !!scheduled && scheduled <= today;
		const base = {
			priority: t.priority,
			overdueDays: overdue,
			staleDays: stale,
			due: t.dueDate || void 0,
			scheduled,
			today,
			kind: "task",
			pinned: committed
		};
		const scored = scoreOf(base);
		const notBefore = t.notBefore;
		const deferred = !!notBefore && notBefore > today;
		items.push({
			id: `task:${t.id}`,
			kind: "task",
			refId: t.id,
			title: t.title,
			subtitle: t.description?.slice(0, 120) || void 0,
			due: t.dueDate || void 0,
			time: t.startTime,
			priority: t.priority,
			context: t.linkedProject || t.category,
			overdueDays: overdue,
			staleDays: stale,
			score: scored.score,
			scoreDimensions: scored.dimensions,
			bucket: deferred && !committed ? "later" : committed || plannedNow ? "today" : bucketOf(base),
			source: "Tasks",
			scheduled,
			notBefore,
			raw: t
		});
	}
	for (const r of input.reminders ?? []) {
		if (r.status !== "pending") continue;
		const due = (r.remindAt || "").slice(0, 10);
		const overdue = due && due < today ? Math.round(((/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime() - (/* @__PURE__ */ new Date(`${due}T00:00:00`)).getTime()) / 864e5) : 0;
		const base = {
			priority: "medium",
			overdueDays: overdue,
			staleDays: 0,
			due,
			today,
			kind: "reminder"
		};
		const scored = scoreOf(base);
		items.push({
			id: `reminder:${r.id}`,
			kind: "reminder",
			refId: r.id,
			title: r.title,
			subtitle: r.notes,
			due,
			time: (r.remindAt || "").slice(11, 16) || void 0,
			priority: "medium",
			context: "Reminder",
			overdueDays: overdue,
			staleDays: 0,
			score: scored.score,
			scoreDimensions: scored.dimensions,
			bucket: bucketOf(base),
			source: "Reminders",
			raw: r
		});
	}
	for (const p of input.payments ?? []) {
		if (p.status !== "pending" && p.status !== "overdue") continue;
		const due = (p.dueDate || "").slice(0, 10);
		if (!due) continue;
		const overdue = due < today ? Math.round(((/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime() - (/* @__PURE__ */ new Date(`${due}T00:00:00`)).getTime()) / 864e5) : 0;
		const base = {
			priority: overdue > 0 ? "critical" : "high",
			overdueDays: overdue,
			staleDays: 0,
			due,
			today,
			kind: "payment"
		};
		const scored = scoreOf(base);
		items.push({
			id: `payment:${p.id}`,
			kind: "payment",
			refId: p.id,
			title: p.title,
			subtitle: `${p.amount ?? ""} ${p.currency ?? ""}`.trim() || void 0,
			due,
			priority: base.priority,
			context: p.category || "Payment",
			overdueDays: overdue,
			staleDays: 0,
			score: scored.score,
			scoreDimensions: scored.dimensions,
			bucket: bucketOf(base),
			source: "Payments",
			raw: p
		});
	}
	for (const d of input.decisions ?? []) {
		if (d.status !== "open") continue;
		const scored = scoreOf({
			priority: d.severity,
			overdueDays: 0,
			staleDays: 0,
			due: void 0,
			today,
			kind: "decision"
		});
		items.push({
			id: `decision:${d.id}`,
			kind: "decision",
			refId: d.id,
			title: d.title,
			subtitle: d.recommendation || d.context,
			priority: d.severity,
			context: "Decision",
			overdueDays: 0,
			staleDays: 0,
			score: scored.score,
			scoreDimensions: scored.dimensions,
			bucket: "today",
			source: "Decision Center",
			raw: d
		});
	}
	return items.sort((a, b) => b.score - a.score || (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
}
function splitQueue(items) {
	const today = items.filter((i) => i.bucket === "today");
	const later = items.filter((i) => i.bucket === "later");
	const now = today[0] ?? later[0];
	return {
		now,
		today: today.filter((i) => i.id !== now?.id),
		later,
		all: items
	};
}
function buildAttention(input) {
	const today = input.today ?? todayISO();
	const out = [];
	const failedValidations = (input.validations ?? []).filter((v) => v.status === "failed");
	if (failedValidations.length > 0) out.push({
		id: "attn:validation-failed",
		title: `${failedValidations.length} change${failedValidations.length === 1 ? "" : "s"} did not work`,
		detail: failedValidations.slice(0, 3).map((v) => v.title).join(" · "),
		severity: "critical",
		section: "seo",
		actionLabel: "Re-plan",
		provenance: "Validation ledger · live"
	});
	const dueValidations = (input.validations ?? []).filter((v) => v.reviewAt && v.reviewAt <= today && v.status !== "passed" && v.status !== "failed");
	if (dueValidations.length > 0) out.push({
		id: "attn:validation-due",
		title: `${dueValidations.length} change${dueValidations.length === 1 ? "" : "s"} waiting for proof`,
		detail: dueValidations.slice(0, 3).map((v) => v.title).join(" · "),
		severity: "warning",
		section: "seo",
		actionLabel: "Verify",
		provenance: "Validation ledger · live"
	});
	const criticalSeo = (input.seoIssues ?? []).filter((i) => (i.status === "open" || i.status === "in-progress") && (i.severity === "critical" || i.severity === "high"));
	if (criticalSeo.length > 0) out.push({
		id: "attn:seo",
		title: `${criticalSeo.length} high-impact site issue${criticalSeo.length === 1 ? "" : "s"} unresolved`,
		detail: criticalSeo.slice(0, 3).map((i) => i.title).join(" · "),
		severity: criticalSeo.some((i) => i.severity === "critical") ? "critical" : "warning",
		section: "seo",
		actionLabel: "Fix",
		provenance: "Site audit · live"
	});
	const overdue = input.work.filter((i) => i.overdueDays > 0);
	if (overdue.length > 0) out.push({
		id: "attn:overdue",
		title: `${overdue.length} item${overdue.length === 1 ? "" : "s"} past their deadline`,
		detail: overdue.slice(0, 3).map((i) => i.title).join(" · "),
		severity: "critical",
		section: "tasks",
		actionLabel: "Triage",
		provenance: "Mission Control · live"
	});
	const duePayments = input.payments.filter((p) => (p.status === "pending" || p.status === "overdue") && p.dueDate && p.dueDate.slice(0, 10) <= addDays(today, 2));
	if (duePayments.length > 0) out.push({
		id: "attn:payments",
		title: `${duePayments.length} payment${duePayments.length === 1 ? "" : "s"} due within 48 hours`,
		detail: duePayments.slice(0, 3).map((p) => p.title).join(" · "),
		severity: "warning",
		section: "payments",
		actionLabel: "Open finance",
		provenance: "Manual · live"
	});
	const open = input.decisions.filter((d) => d.status === "open");
	if (open.length > 0) out.push({
		id: "attn:decisions",
		title: `${open.length} finding${open.length === 1 ? "" : "s"} waiting on a decision`,
		detail: open.slice(0, 3).map((d) => d.title).join(" · "),
		severity: open.some((d) => d.severity === "critical") ? "critical" : "warning",
		section: "decisions",
		actionLabel: "Decide"
	});
	for (const src of SYNC_SOURCES) {
		const row = input.health.find((h) => h.id === src.id);
		const status = effectiveStatus(row);
		if (status === "error" || status === "stale") out.push({
			id: `attn:sync:${src.id}`,
			title: `${src.label} ${status === "error" ? "is failing" : "data is stale"}`,
			detail: row?.error || `Last successful sync ${ageLabel(row?.lastSuccessAt)}`,
			severity: status === "error" ? "critical" : "warning",
			section: "settings",
			actionLabel: "Inspect",
			provenance: `${src.label} · ${ageLabel(row?.lastSuccessAt)}`
		});
	}
	const rank = {
		critical: 0,
		warning: 1,
		info: 2
	};
	return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
function addDays(iso, days) {
	const d = /* @__PURE__ */ new Date(`${iso}T00:00:00`);
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}
var SEVERITY_RANK = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3
};
function buildSitePulse(input) {
	const issues = (input.seoIssues ?? []).filter((i) => i.status === "open" || i.status === "in-progress");
	const rows = [];
	for (const site of input.websites) {
		if (site.status === "archived") continue;
		const profile = (input.seoProfiles ?? []).find((p) => p.websiteId === site.id);
		const siteIssues = issues.filter((i) => i.websiteId === site.id).sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));
		const snapshot = (input.seoSnapshots ?? []).filter((s) => s.websiteId === site.id).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
		const hasEvidence = !!snapshot || !!profile?.lastSyncedAt || siteIssues.length > 0;
		let status = "unknown";
		let headline = "Status unknown";
		let detail = "No observation has been recorded for this site yet.";
		if (site.status === "down") {
			status = "attention";
			headline = "Marked down";
			detail = "The site is flagged as down in your portfolio.";
		} else if (siteIssues.length > 0) {
			status = "attention";
			headline = siteIssues[0].category.toUpperCase();
			const top = siteIssues.filter((i) => i.severity === "critical" || i.severity === "high").length;
			detail = top > 0 ? `${top} unresolved high-priority SEO issue${top === 1 ? "" : "s"}` : `${siteIssues.length} open SEO issue${siteIssues.length === 1 ? "" : "s"}`;
		} else if (profile?.syncStatus === "error") {
			status = "attention";
			headline = "Sync failing";
			detail = profile.syncError || "The search data connection returned an error.";
		} else if (profile?.syncStatus === "stale") {
			status = "unknown";
			headline = "Data stale";
			detail = `Last successful sync ${ageLabel(profile.lastSyncedAt)}`;
		} else if (hasEvidence) {
			status = "healthy";
			headline = "Healthy";
			detail = "No action required.";
		}
		const sourceBits = [];
		if (snapshot) sourceBits.push(`${snapshot.source.toUpperCase()} · ${snapshot.date}`);
		else if (profile?.lastSyncedAt) sourceBits.push(`Search data · ${ageLabel(profile.lastSyncedAt)}`);
		else sourceBits.push("No verified source");
		rows.push({
			id: site.id,
			name: site.name,
			status,
			headline,
			detail,
			provenance: sourceBits.join(" · "),
			openIssues: siteIssues.length
		});
	}
	const order = {
		attention: 0,
		unknown: 1,
		healthy: 2
	};
	return rows.sort((a, b) => order[a.status] - order[b.status] || b.openIssues - a.openIssues).slice(0, input.limit ?? 4);
}
var TOPICS = [
	"seo",
	"search",
	"google",
	"index",
	"schema",
	"core web vitals",
	"wordpress",
	"cloudflare",
	"ai",
	"llm",
	"automation",
	"analytics",
	"hosting",
	"security"
];
function tokens(text) {
	return text.toLowerCase();
}
function selectIntelligence(input) {
	const siteNames = input.websites.filter((w) => w.status !== "archived").map((w) => ({
		name: w.name,
		host: (w.url || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "")
	}));
	const out = [];
	for (const item of input.stream) {
		if (item.status !== "active" || item.read) continue;
		const hay = tokens(`${item.title} ${item.summary ?? ""} ${item.aiSummary ?? ""}`);
		const matched = [];
		for (const s of siteNames) if (s.name && hay.includes(s.name.toLowerCase())) matched.push(s.name);
		else if (s.host && hay.includes(s.host.toLowerCase())) matched.push(s.name || s.host);
		const topic = TOPICS.find((t) => hay.includes(t));
		if (matched.length === 0 && !topic && item.kind !== "mention") continue;
		const relevance = matched.length > 0 ? `Mentions ${matched.slice(0, 2).join(", ")} in your portfolio` : item.kind === "mention" ? "Matches one of your monitored brand terms" : `Touches ${topic} — relevant to how your sites are run`;
		out.push({
			id: item.id,
			title: item.title,
			url: item.url,
			source: item.source,
			publishedAt: item.publishedAt,
			summary: item.aiSummary || item.summary,
			relevance,
			matched
		});
	}
	return out.sort((a, b) => b.matched.length - a.matched.length || b.publishedAt.localeCompare(a.publishedAt)).slice(0, input.limit ?? 3);
}
/** Current local time as HH:MM — never UTC. */
function hhmmNow(d = /* @__PURE__ */ new Date()) {
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
var DEFAULT_FLAG_LIMIT = 4;
var DEFAULT_UNTIMED_LIMIT = 8;
function reasonsFor(item, today) {
	const dims = item.scoreDimensions;
	if (dims && dims.length > 0) return reasonsOf({
		score: item.score,
		dimensions: dims
	});
	const out = [];
	if (item.overdueDays > 0) out.push(item.overdueDays === 1 ? "overdue since yesterday" : `${item.overdueDays} days overdue`);
	else if (item.due === today) out.push("due today");
	else if (item.scheduled === today) out.push("planned for today");
	if (item.kind === "decision") out.push("blocks other work until decided");
	if (item.kind === "payment") out.push("money has a hard deadline");
	return out.length > 0 ? out.slice(0, 3) : ["top of your queue right now"];
}
function toEntry(i, today) {
	return {
		id: i.id,
		time: i.time,
		title: i.title,
		kind: i.kind,
		severity: i.overdueDays > 0 ? "critical" : void 0,
		reasons: reasonsFor(i, today),
		section: sectionFor(i),
		workItem: i,
		score: i.score
	};
}
function buildTimeline(input) {
	const flagLimit = input.flagLimit ?? DEFAULT_FLAG_LIMIT;
	const untimedLimit = input.untimedLimit ?? DEFAULT_UNTIMED_LIMIT;
	const flags = input.attention.slice(0, flagLimit).map((a) => ({
		id: a.id,
		title: a.title,
		kind: "flag",
		severity: a.severity,
		reasons: a.detail ? [a.detail] : [],
		section: a.section,
		flag: a
	}));
	const timed = input.items.filter((i) => !!i.time).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
	const elapsedTimed = timed.filter((i) => (i.time ?? "") < input.nowTime);
	const upcomingTimed = timed.filter((i) => (i.time ?? "") >= input.nowTime);
	const untimed = input.items.filter((i) => !i.time).sort((a, b) => b.score - a.score).slice(0, untimedLimit);
	const elapsedEntries = elapsedTimed.map((i) => toEntry(i, input.today));
	const upcomingEntries = upcomingTimed.map((i) => toEntry(i, input.today));
	const untimedEntries = untimed.map((i) => toEntry(i, input.today));
	return {
		entries: [
			...flags,
			...elapsedEntries,
			...upcomingEntries,
			...untimedEntries
		],
		nowIndex: flags.length + elapsedEntries.length,
		counts: {
			flags: flags.length,
			timed: timed.length,
			untimed: untimedEntries.length
		}
	};
}
function sectionFor(i) {
	switch (i.kind) {
		case "task": return "tasks";
		case "reminder": return "reminders";
		case "payment": return "payments";
		case "decision": return "decisions";
		default: return "tasks";
	}
}
function useDailyOps() {
	const allTasks = useTasks();
	const reminders = useReminders();
	const payments = usePayments();
	const decisions = useDecisions();
	const health = useSyncHealth();
	const updateItem = useUpdateItem();
	const websites = useWebsites();
	const notes = useNotes();
	const seoProfiles = useSEOProfiles();
	const seoIssues = useSEOIssues();
	const seoSnapshots = useSEOSnapshots();
	const stream = useStreamItems();
	const validations = useValidations();
	const { area, workdayStart, workdayEnd } = usePlanStore();
	const gcal = useGoogleCalendar({ autoFetch: isGCalConnected() });
	const gcalEvents = gcal.rawEvents;
	/** Area is a visibility filter, never a permission. */
	const tasks = (0, import_react.useMemo)(() => allTasks.filter((t) => inArea(t, area)), [allTasks, area]);
	const today = todayISO();
	const queues = (0, import_react.useMemo)(() => splitQueue(buildWorkQueue({
		tasks,
		reminders,
		payments,
		decisions,
		today
	})), [
		tasks,
		reminders,
		payments,
		decisions,
		today
	]);
	const attention = (0, import_react.useMemo)(() => buildAttention({
		work: queues.all,
		decisions,
		payments,
		health,
		seoIssues,
		validations,
		today
	}), [
		queues.all,
		decisions,
		payments,
		health,
		seoIssues,
		validations,
		today
	]);
	const sitePulse = (0, import_react.useMemo)(() => buildSitePulse({
		websites,
		seoProfiles,
		seoIssues,
		seoSnapshots,
		health
	}), [
		websites,
		seoProfiles,
		seoIssues,
		seoSnapshots,
		health
	]);
	const validationPulse = (0, import_react.useMemo)(() => pendingValidations(validations, today), [validations, today]);
	const intelligence = (0, import_react.useMemo)(() => selectIntelligence({
		stream,
		websites,
		tasks
	}), [
		stream,
		websites,
		tasks
	]);
	const briefing = (0, import_react.useMemo)(() => buildBriefing(tasks, today), [tasks, today]);
	/** True first-run: zero rows in every core table. Drives the gorgeous
	*  empty state instead of a dead dashboard. Never fabricated rows. */
	const isEmpty = (0, import_react.useMemo)(() => tasks.length === 0 && reminders.length === 0 && payments.length === 0 && decisions.length === 0 && websites.length === 0 && notes.length === 0, [
		tasks,
		reminders,
		payments,
		decisions,
		websites,
		notes
	]);
	/** Outcomes = tasks explicitly chosen for today (pinned or with a block/plan
	*  for today). The engine fills in when nothing has been chosen yet. */
	const dayItems = (0, import_react.useMemo)(() => queues.now ? [queues.now, ...queues.today] : queues.today, [queues.now, queues.today]);
	const chosenOutcomes = (0, import_react.useMemo)(() => dayItems.filter((i) => i.kind === "task" && isPlannedToday(i.raw, today)), [dayItems, today]);
	const commitments = (0, import_react.useMemo)(() => chosenOutcomes.length ? chosenOutcomes.slice(0, 5) : queues.today.slice(0, 3), [chosenOutcomes, queues.today]);
	const outcomesAreChosen = chosenOutcomes.length > 0;
	const upNext = (0, import_react.useMemo)(() => queues.today.filter((i) => !commitments.some((c) => c.id === i.id)), [queues.today, commitments]);
	/** One clear next action: the top of what was chosen, else the engine's #1. */
	const nextAction = (0, import_react.useMemo)(() => commitments.find((i) => i.kind === "task" && i.raw.status !== "blocked") ?? queues.now ?? null, [commitments, queues.now]);
	/** The unified Today timeline: attention flags + timed commitments + the
	*  engine-ordered queue, one chronology with a NOW marker. Replaces the
	*  siloed agenda / commitments / attention trio. */
	const timeline = (0, import_react.useMemo)(() => buildTimeline({
		items: dayItems,
		attention,
		nowTime: hhmmNow(),
		today
	}), [
		dayItems,
		attention,
		today
	]);
	/** Fixed commitments from Google Calendar (read-only, never tasks). */
	const fixed = (0, import_react.useMemo)(() => fixedEventsFor(gcalEvents, today), [gcalEvents, today]);
	/** Available time vs selected work — the "is this realistic?" answer. */
	const capacity = (0, import_react.useMemo)(() => computeCapacity({
		tasks,
		fixed,
		today,
		nowHHMM: hhmmNow(),
		workdayStart,
		workdayEnd
	}), [
		tasks,
		fixed,
		today,
		workdayStart,
		workdayEnd
	]);
	/** Deterministic plan suggestion — preview only, applied on confirmation. */
	const suggestedPlan = (0, import_react.useMemo)(() => suggestOutcomes(queues.today.filter((i) => i.kind === "task" && !isPlannedToday(i.raw, today)).map((i) => ({
		task: i.raw,
		score: i.score,
		reasons: [i.overdueDays > 0 ? `${i.overdueDays}d overdue` : i.due === today ? "due today" : i.priority === "critical" || i.priority === "high" ? `${i.priority} priority` : "highest in your queue"]
	})), Math.max(0, capacity.availableMin - capacity.plannedMin), Math.max(0, 3 - chosenOutcomes.length)), [
		queues.today,
		today,
		capacity.availableMin,
		capacity.plannedMin,
		chosenOutcomes.length
	]);
	const waiting = (0, import_react.useMemo)(() => tasks.filter((t) => t.status === "blocked").length, [tasks]);
	/** Inbox: captured but undecided — no deadline, no plan, no block. */
	const inboxTasks = (0, import_react.useMemo)(() => tasks.filter((t) => t.status === "todo" && !t.dueDate && !t.scheduledAt && !(t.blocks && t.blocks.length) && !t.archived), [tasks]);
	const inbox = inboxTasks.length;
	const openDecisions = (0, import_react.useMemo)(() => decisions.filter((d) => d.status === "open").length, [decisions]);
	/** Agenda: only real, time-stamped commitments. Never fabricated. */
	const agenda = (0, import_react.useMemo)(() => {
		const rows = [];
		for (const t of tasks) {
			if (t.status === "done") continue;
			if ((t.scheduledAt || t.dueDate) !== today || !t.startTime) continue;
			rows.push({
				id: `t:${t.id}`,
				time: t.startTime,
				title: t.title,
				kind: "Task",
				section: "tasks"
			});
		}
		for (const r of reminders) {
			if (r.status !== "pending" || !r.remindAt) continue;
			if (r.remindAt.slice(0, 10) !== today) continue;
			rows.push({
				id: `r:${r.id}`,
				time: r.remindAt.slice(11, 16),
				title: r.title,
				kind: "Reminder",
				section: "reminders"
			});
		}
		for (const p of payments) {
			if (p.status !== "pending" && p.status !== "overdue") continue;
			if ((p.dueDate || "").slice(0, 10) !== today) continue;
			rows.push({
				id: `p:${p.id}`,
				time: "—",
				title: p.title,
				kind: "Payment due",
				section: "payments"
			});
		}
		return rows.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6);
	}, [
		tasks,
		reminders,
		payments,
		today
	]);
	async function complete(item) {
		if (item.kind === "task") await updateItem("tasks", item.refId, {
			status: "done",
			completedAt: (/* @__PURE__ */ new Date()).toISOString(),
			touchedAt: today
		});
		else if (item.kind === "reminder") await updateItem("reminders", item.refId, { status: "done" });
		else if (item.kind === "payment") await updateItem("payments", item.refId, {
			status: "paid",
			paidDate: today
		});
		else {
			await actOnDecision(item.raw);
			toast.success("Decision turned into a task");
			return;
		}
		toast.success("Done — next one is up");
	}
	/** Planning, not deadline mutation: the real dueDate is never touched. */
	async function schedule(item, days) {
		const next = addDaysLocal(today, days);
		if (item.kind === "task") {
			await updateItem("tasks", item.refId, {
				notBefore: next,
				scheduledAt: next,
				reviewAt: next,
				touchedAt: today,
				committedOn: void 0
			});
			toast.success(`Planned for ${next} — deadline unchanged`);
			return;
		}
		if (item.kind === "reminder") await updateItem("reminders", item.refId, { remindAt: `${next}T09:00:00` });
		else if (item.kind === "decision") await deferDecision(item.raw, days);
		else {
			toast.warning("Payment deadlines cannot be moved — pay or renegotiate.");
			return;
		}
		toast.success(`Planned for ${next}`);
	}
	async function commit(item) {
		if (item.kind !== "task") return;
		await updateItem("tasks", item.refId, {
			committedOn: today,
			notBefore: void 0
		});
		toast.success("Pinned to today");
	}
	return {
		today,
		queues,
		now: queues.now,
		commitments,
		upNext,
		timeline,
		isEmpty,
		attention,
		sitePulse,
		validationPulse,
		intelligence,
		briefing,
		agenda,
		waiting,
		inbox,
		inboxTasks,
		openDecisions,
		complete,
		schedule,
		commit,
		nextAction,
		outcomesAreChosen,
		fixed,
		capacity,
		suggestedPlan,
		area,
		gcalConnected: gcal.connected,
		allTasks
	};
}
var InsightsPanel = (0, import_react.lazy)(() => import("./InsightsPanel-C3ss6u1b.mjs"));
var BelowFold = (0, import_react.lazy)(() => import("./BelowFold-Dsei87ZW.mjs"));
function DashboardHome() {
	const ops = useDailyOps();
	const isMobile = useIsMobile();
	const [showInsights, setShowInsights] = (0, import_react.useState)(false);
	const [showMore, setShowMore] = (0, import_react.useState)(false);
	const [showClose, setShowClose] = (0, import_react.useState)(false);
	const [showShortcuts, setShowShortcuts] = (0, import_react.useState)(false);
	const [dockItem, setDockItem] = (0, import_react.useState)(null);
	const workdayEnd = usePlanStore((s) => s.workdayEnd);
	const evening = hhmmNow() >= workdayEnd || showClose;
	(0, import_react.useEffect)(() => {
		const handler = (e) => {
			if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
			const el = document.activeElement;
			if (!!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
			e.preventDefault();
			setShowShortcuts((v) => !v);
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);
	const commitmentsTotal = ops.commitments.length;
	const commitmentsDone = ops.commitments.filter((c) => c.raw && c.raw.status === "done").length;
	const attentionCount = ops.timeline.counts.flags;
	const timedCount = ops.timeline.counts.timed;
	const queuedCount = ops.timeline.counts.untimed;
	const plan = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TodayPlan, {
		today: ops.today,
		nextAction: ops.nextAction,
		commitments: ops.commitments,
		outcomesAreChosen: ops.outcomesAreChosen,
		suggestedPlan: ops.suggestedPlan,
		capacity: ops.capacity,
		fixed: ops.fixed,
		onComplete: ops.complete,
		onCommit: ops.commit,
		onFocus: (item) => setDockItem(item)
	});
	const timeline = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TodayTimeline, {
		timeline: ops.timeline,
		onComplete: ops.complete,
		onPlan: ops.schedule,
		onCommit: ops.commit
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4 pb-8 sm:gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ultra-fade flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[12px] font-semibold text-muted-foreground",
					children: (/* @__PURE__ */ new Date()).toLocaleDateString(void 0, {
						weekday: "long",
						day: "numeric",
						month: "long"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AreaSwitch, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setShowClose((v) => !v),
						className: "flex h-8 items-center gap-1.5 rounded-xl border border-border/50 bg-secondary/40 px-2.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
						"aria-pressed": showClose,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { size: 12 }), " Close day"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ultra-rise-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickCaptureBar, {})
			}),
			dockItem && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusDock, {
				item: dockItem,
				onDone: () => setDockItem(null),
				onClose: () => setDockItem(null)
			}),
			ops.isEmpty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FirstRunExperience, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroNowBand, {
					nextAction: ops.nextAction,
					commitmentsTotal,
					commitmentsDone,
					plannedMin: ops.capacity.plannedMin,
					availableMin: ops.capacity.availableMin,
					onFocus: (item) => setDockItem(item),
					onComplete: ops.complete
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ultra-rise-2 ultra-stat-grid",
					role: "status",
					children: [
						attentionCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ultra-stat",
							"data-tone": "bad",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-icon",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 15 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-num",
									children: attentionCount
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-label",
									children: "needing attention"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ultra-stat",
							"data-tone": "info",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-icon",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { size: 15 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-num",
									children: timedCount
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-label",
									children: "timed today"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ultra-stat",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-icon",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { size: 15 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-num",
									children: queuedCount
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-label",
									children: "queued"
								})
							]
						}),
						commitmentsTotal > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ultra-stat",
							"data-tone": "good",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-icon",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 15 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ultra-stat-num",
									children: [
										commitmentsDone,
										"/",
										commitmentsTotal
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-label",
									children: "outcomes done"
								})
							]
						}),
						ops.inboxTasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ultra-stat",
							"data-tone": "violet",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-icon",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { size: 15 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-num",
									children: ops.inboxTasks.length
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ultra-stat-label",
									children: "in inbox"
								})
							]
						})
					]
				}),
				isMobile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ultra-rise-3 flex flex-col gap-4",
					children: [
						plan,
						evening && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DayClose, {
							tasks: ops.allTasks,
							compact: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InboxStrip, {
							tasks: ops.inboxTasks,
							today: ops.today
						}),
						timeline
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ultra-rise-3 grid grid-cols-1 gap-4 lg:grid-cols-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-4 lg:col-span-7",
						children: [
							plan,
							evening && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DayClose, { tasks: ops.allTasks }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InboxStrip, {
								tasks: ops.inboxTasks,
								today: ops.today
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "lg:col-span-5",
						children: timeline
					})]
				})
			] }),
			!ops.isEmpty && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "ultra-rise-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowMore((v) => !v),
					className: "se-card flex w-full items-center justify-between p-4 text-left transition hover:-translate-y-0.5 sm:p-5",
					"aria-expanded": showMore,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-display text-[15px] font-extrabold tracking-tight text-foreground",
						children: "Sites, validations, intelligence & sync"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[11px] text-muted-foreground",
						children: "Operational pulses — not needed to pick your next action"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
						size: 16,
						className: `text-muted-foreground transition-transform ${showMore ? "rotate-180" : ""}`
					})]
				}), showMore && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
						fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "v10-skeleton h-40" }),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BelowFold, { ops })
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "ultra-rise-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowInsights((v) => !v),
					className: "se-card flex w-full items-center justify-between p-4 text-left transition hover:-translate-y-0.5 sm:p-5",
					"aria-expanded": showInsights,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartBar, { size: 16 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-display text-[15px] font-extrabold tracking-tight text-foreground",
							children: "Insights & portfolio"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[11px] text-muted-foreground",
							children: "Momentum, board, finance, sites, notes — the full picture"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
						size: 16,
						className: `text-muted-foreground transition-transform ${showInsights ? "rotate-180" : ""}`
					})]
				}), showInsights && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
						fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "v10-skeleton h-40" }),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InsightsPanel, {})
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShortcutsOverlay, {
				open: showShortcuts,
				onClose: () => setShowShortcuts(false)
			})
		]
	});
}
//#endregion
export { DashboardHome as default, setValidationResult as n, statusLabel as r, isDueForReview as t };
