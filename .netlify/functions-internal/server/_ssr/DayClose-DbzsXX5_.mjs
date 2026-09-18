import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { Q as useUpdateItem } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { l as todayISO } from "./overdue-CpArWbx3.mjs";
import { a as fmtMinutes, r as estimateOf, s as isPlannedToday } from "./planning-CdLbbCHg.mjs";
import { Cn as CircleCheck, Fn as CalendarClock, Pt as Inbox, R as Scissors, Wn as ArrowRight, ct as Moon, h as Trash2 } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { E as usePlanStore } from "./routes-qm6I9RAb.mjs";
import { o as isOpen } from "./triage-Q9v9lxCb.mjs";
import { a as reduceScope, l as sendToInbox, s as rescheduleToTomorrow, u as softDeleteTasks } from "./taskActions-CDh7MXDW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/DayClose-DbzsXX5_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DayClose({ tasks, compact = false }) {
	const today = todayISO();
	const updateItem = useUpdateItem();
	const { lastDayClose, markDayClose } = usePlanStore();
	const [decided, setDecided] = (0, import_react.useState)({});
	const unfinished = (0, import_react.useMemo)(() => tasks.filter((t) => isOpen(t) && !t.deletedAt && isPlannedToday(t, today)), [tasks, today]);
	const doneToday = (0, import_react.useMemo)(() => tasks.filter((t) => t.status === "done" && (t.completedAt ?? "").slice(0, 10) === today), [tasks, today]);
	const essentialDone = doneToday.filter((t) => t.important || t.priority === "critical").length;
	const remaining = unfinished.filter((t) => !decided[t.id]);
	const closedToday = lastDayClose === today;
	const act = async (t, choice) => {
		if (choice === "done") await updateItem("tasks", t.id, {
			status: "done",
			completedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		else if (choice === "reschedule") await rescheduleToTomorrow(t, today);
		else if (choice === "reduce") await reduceScope(t, Math.max(15, Math.round(estimateOf(t) / 2 / 5) * 5));
		else if (choice === "inbox") await sendToInbox(t);
		else if (choice === "delete") await softDeleteTasks([t.id]);
		setDecided((d) => ({
			...d,
			[t.id]: choice
		}));
	};
	const finish = () => {
		markDayClose(today);
		toast.success(essentialDone > 0 ? "Your essential commitments are complete." : "Day closed. Tomorrow has a plan.");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `card-elevated space-y-3 ${compact ? "p-3.5" : "p-4"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "flex items-center gap-2 text-sm font-bold text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, {
					size: 15,
					className: "text-indigo-400"
				}), " Close the day"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[11px] text-muted-foreground",
				children: [
					doneToday.length,
					" finished today · ",
					remaining.length,
					" still need a decision"
				]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: finish,
				disabled: remaining.length > 0 && !closedToday,
				className: "flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
				title: remaining.length ? "Decide on every open item first" : "Finish the day",
				children: [
					closedToday ? "Closed" : "Finish",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 13 })
				]
			})]
		}), remaining.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "rounded-2xl bg-emerald-500/8 px-3 py-3 text-xs text-emerald-600 dark:text-emerald-400",
			children: essentialDone > 0 ? "Your essential commitments are complete. Nothing is rolling forward without your say." : "Everything planned for today has a decision. Rest."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2",
			children: remaining.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "rounded-2xl border border-border/30 bg-secondary/30 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate text-sm font-medium text-foreground",
							children: t.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "shrink-0 text-[10px] text-muted-foreground",
							children: fmtMinutes(estimateOf(t))
						}),
						t.dueDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "shrink-0 text-[10px] text-muted-foreground",
							children: ["due ", t.dueDate]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 12 }),
							label: "Done",
							tone: "ok",
							onClick: () => act(t, "done")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { size: 12 }),
							label: "Tomorrow",
							hint: "deadline unchanged",
							onClick: () => act(t, "reschedule")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, { size: 12 }),
							label: "Reduce",
							hint: "halve the estimate",
							onClick: () => act(t, "reduce")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { size: 12 }),
							label: "Inbox",
							hint: "undecided, no date",
							onClick: () => act(t, "inbox")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 }),
							label: "Delete",
							tone: "danger",
							hint: "Trash, 30 days",
							onClick: () => act(t, "delete")
						})
					]
				})]
			}, t.id))
		})]
	});
}
function Choice({ icon, label, hint, tone, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick,
		title: hint,
		className: `flex min-h-9 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${tone === "ok" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400" : tone === "danger" ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
		children: [
			icon,
			" ",
			label
		]
	});
}
//#endregion
export { DayClose as t };
