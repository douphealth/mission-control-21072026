import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { Q as useUpdateItem, Y as useTasks } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Dn as ChevronDown, En as ChevronLeft, G as RefreshCw, Mn as Calendar, N as Settings, T as SquareCheckBig, Tn as ChevronRight, X as Plus, Zt as Flag, _n as Clock, d as TriangleAlert, gt as LogIn, h as Trash2, hn as Cloud, n as X, rn as ExternalLink, t as Zap, xt as ListTodo, yt as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as hasGoogleClientId, c as isSignedIn, d as signIn, f as signOut, g as useIsMobile, l as listTaskLists, m as useNavigationStore, s as GoogleSetupModal, u as listTasks } from "./routes-qm6I9RAb.mjs";
import { t as useGoogleCalendar } from "./useGoogleCalendar-Bhv1HlZF.mjs";
import { expandRecurringTask } from "./recurrence-CgknE5Dl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/CalendarPage-DcCqDKRY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Google Tasks → Calendar bridge.
* Fetches the user's task lists, lets them pick which ones to include,
* and exposes the tasks (with due dates) as CalEvent-shaped objects.
*/
var SELECTED_KEY = "gtasks_calendar_selected_lists_v1";
var SHOW_DONE_KEY = "gtasks_calendar_show_completed_v1";
function readSelected() {
	try {
		const raw = localStorage.getItem(SELECTED_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function writeSelected(ids) {
	localStorage.setItem(SELECTED_KEY, JSON.stringify(ids));
}
function useGoogleTasksCalendar() {
	const [signed, setSigned] = (0, import_react.useState)(() => isSignedIn());
	const [lists, setLists] = (0, import_react.useState)([]);
	const [selected, setSelected] = (0, import_react.useState)(() => readSelected() || []);
	const [showCompleted, setShowCompleted] = (0, import_react.useState)(() => localStorage.getItem(SHOW_DONE_KEY) === "1");
	const [tasksByList, setTasksByList] = (0, import_react.useState)({});
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [lastSync, setLastSync] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const refresh = (0, import_react.useCallback)(async () => {
		if (!isSignedIn()) {
			setSigned(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const ls = await listTaskLists();
			setLists(ls);
			let selIds = readSelected();
			if (selIds === null) {
				selIds = ls.map((l) => l.id);
				writeSelected(selIds);
				setSelected(selIds);
			}
			const activeIds = selIds.filter((id) => ls.some((l) => l.id === id));
			const results = await Promise.all(activeIds.map((id) => listTasks(id, showCompleted).then((t) => [id, t]).catch(() => [id, []])));
			const map = {};
			for (const [id, t] of results) map[id] = t;
			setTasksByList(map);
			setLastSync((/* @__PURE__ */ new Date()).toISOString());
		} catch (e) {
			setError(e?.message || "Failed to load Google Tasks");
			if (/session expired|Not signed in/i.test(e?.message || "")) setSigned(false);
		} finally {
			setLoading(false);
		}
	}, [showCompleted]);
	(0, import_react.useEffect)(() => {
		if (signed) refresh();
	}, [signed, refresh]);
	const doSignIn = (0, import_react.useCallback)(async () => {
		try {
			await signIn();
			setSigned(true);
		} catch (e) {
			setError(e?.message || "Sign-in failed");
			throw e;
		}
	}, []);
	const doSignOut = (0, import_react.useCallback)(() => {
		signOut();
		setSigned(false);
		setLists([]);
		setTasksByList({});
	}, []);
	const toggleList = (0, import_react.useCallback)((id) => {
		setSelected((prev) => {
			const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
			writeSelected(next);
			return next;
		});
	}, []);
	const setShowCompletedPersisted = (0, import_react.useCallback)((v) => {
		localStorage.setItem(SHOW_DONE_KEY, v ? "1" : "0");
		setShowCompleted(v);
	}, []);
	const events = [];
	for (const list of lists) {
		if (!selected.includes(list.id)) continue;
		const items = tasksByList[list.id] || [];
		for (const t of items) {
			if (!t.due) continue;
			const date = t.due.slice(0, 10);
			events.push({
				id: `gtask-${list.id}-${t.id}`,
				title: t.title || "(untitled)",
				date,
				notes: t.notes,
				listId: list.id,
				listTitle: list.title,
				done: t.status === "completed"
			});
		}
	}
	return {
		signed,
		lists,
		selected,
		showCompleted,
		loading,
		lastSync,
		error,
		events,
		refresh,
		signIn: doSignIn,
		signOut: doSignOut,
		toggleList,
		setShowCompleted: setShowCompletedPersisted
	};
}
var DAYS_SHORT = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat"
];
var DAYS_MINI = [
	"S",
	"M",
	"T",
	"W",
	"T",
	"F",
	"S"
];
var MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];
var PRIORITY_COLOR = {
	critical: "#ef4444",
	high: "#f97316",
	medium: "#3b82f6",
	low: "#10b981"
};
var EVENT_COLORS = [
	{
		label: "Blue",
		value: "#3b82f6"
	},
	{
		label: "Purple",
		value: "#8b5cf6"
	},
	{
		label: "Pink",
		value: "#ec4899"
	},
	{
		label: "Green",
		value: "#10b981"
	},
	{
		label: "Amber",
		value: "#f59e0b"
	},
	{
		label: "Red",
		value: "#ef4444"
	},
	{
		label: "Cyan",
		value: "#06b6d4"
	},
	{
		label: "Indigo",
		value: "#6366f1"
	}
];
var CATEGORIES = [
	"Work",
	"Personal",
	"Meeting",
	"Deadline",
	"Event",
	"Health",
	"Travel",
	"Learning"
];
function fmtDate(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(s) {
	const [y, m, d] = s.split("-").map(Number);
	return new Date(y, m - 1, d);
}
function addDays(d, n) {
	const r = new Date(d);
	r.setDate(r.getDate() + n);
	return r;
}
function startOfWeek(d) {
	const r = new Date(d);
	r.setDate(r.getDate() - r.getDay());
	return r;
}
function EventModal({ open, event, onClose, onSave, onDelete }) {
	const today = fmtDate(/* @__PURE__ */ new Date());
	const [title, setTitle] = (0, import_react.useState)(event?.title || "");
	const [date, setDate] = (0, import_react.useState)(event?.date || today);
	const [endDate, setEndDate] = (0, import_react.useState)(event?.endDate || "");
	const [start, setStart] = (0, import_react.useState)(event?.startTime || "");
	const [end, setEnd] = (0, import_react.useState)(event?.endTime || "");
	const [color, setColor] = (0, import_react.useState)(event?.color || "#3b82f6");
	const [cat, setCat] = (0, import_react.useState)(event?.category || "Work");
	const [desc, setDesc] = (0, import_react.useState)(event?.description || "");
	const [allDay, setAllDay] = (0, import_react.useState)(event?.allDay ?? false);
	(0, import_react.useEffect)(() => {
		if (open) {
			setTitle(event?.title || "");
			setDate(event?.date || today);
			setEndDate(event?.endDate || "");
			setStart(event?.startTime || "09:00");
			setEnd(event?.endTime || "10:00");
			setColor(event?.color || "#3b82f6");
			setCat(event?.category || "Work");
			setDesc(event?.description || "");
			setAllDay(event?.allDay ?? false);
		}
	}, [
		event,
		open,
		today
	]);
	const save = () => {
		if (!title.trim()) {
			toast.error("Title is required");
			return;
		}
		onSave({
			id: event?.id,
			title: title.trim(),
			date,
			endDate: endDate || void 0,
			startTime: allDay ? void 0 : start || void 0,
			endTime: allDay ? void 0 : end || void 0,
			color,
			category: cat,
			description: desc,
			allDay,
			isTask: event?.isTask,
			taskId: event?.taskId,
			priority: event?.priority,
			status: event?.status
		});
		onClose();
	};
	const isEdit = !!event?.id;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4",
		onClick: onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-foreground/20 backdrop-blur-sm" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[92vh] flex flex-col",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1.5 w-full",
					style: { background: color }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center pt-2 pb-0 sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-10 h-1 rounded-full bg-muted-foreground/15" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-5 py-3 sm:py-4 border-b border-border/50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "text-base font-bold text-card-foreground flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
							size: 16,
							style: { color }
						}), isEdit ? "Edit Event" : "New Event"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [isEdit && onDelete && !event?.isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								onDelete(event.id);
								onClose();
							},
							className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors touch-manipulation",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 16 })
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoFocus: true,
							value: title,
							onChange: (e) => setTitle(e.target.value),
							onKeyDown: (e) => e.key === "Enter" && save(),
							placeholder: "Event title...",
							className: "w-full text-lg font-semibold bg-transparent text-card-foreground outline-none placeholder:text-muted-foreground/50 border-b border-border/40 pb-2"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1",
								children: "Date"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: date,
								onChange: (e) => setDate(e.target.value),
								className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1",
								children: "End Date"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: endDate,
								onChange: (e) => setEndDate(e.target.value),
								className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setAllDay((a) => !a),
								className: `relative w-10 h-5 rounded-full transition-colors ${allDay ? "bg-primary" : "bg-secondary"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allDay ? "translate-x-5" : ""}` })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm text-muted-foreground",
								children: "All day"
							})]
						}),
						!allDay && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1",
								children: "Start time"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "time",
								value: start,
								onChange: (e) => setStart(e.target.value),
								className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1",
								children: "End time"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "time",
								value: end,
								onChange: (e) => setEnd(e.target.value),
								className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1",
								children: "Category"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: cat,
								onChange: (e) => setCat(e.target.value),
								className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none appearance-none",
								children: CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: c,
									children: c
								}, c))
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1",
								children: "Color"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2 pt-1",
								children: EVENT_COLORS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setColor(c.value),
									title: c.label,
									className: `w-6 h-6 rounded-full transition-all touch-manipulation ${color === c.value ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "hover:scale-105"}`,
									style: { background: c.value }
								}, c.value))
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1",
							children: "Notes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: desc,
							onChange: (e) => setDesc(e.target.value),
							rows: 2,
							placeholder: "Optional details...",
							className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50"
						})] }),
						event?.isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-xs text-muted-foreground bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
								size: 12,
								className: "text-emerald-500"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Linked to Task — changes sync automatically." })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: save,
						className: "px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 touch-manipulation",
						style: { background: color },
						children: isEdit ? "Save Changes" : "Add Event"
					})]
				})
			]
		})]
	}) });
}
var EventPill = (0, import_react.memo)(function EventPill({ ev, onClick, compact }) {
	const isTask = ev.isTask;
	const isGoogle = ev.isGoogleEvent;
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick,
		className: "w-full h-1 rounded-full",
		style: { background: ev.color }
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick,
		className: "w-full text-left text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium transition-all hover:brightness-110 active:scale-95 flex items-center gap-1 touch-manipulation",
		style: {
			background: ev.color + "22",
			color: ev.color,
			borderLeft: `2.5px solid ${ev.color}`
		},
		children: [
			isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
				size: 8,
				className: "shrink-0"
			}),
			isGoogle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, {
				size: 8,
				className: "shrink-0 opacity-70"
			}),
			ev.startTime && !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "opacity-70 shrink-0",
				children: ev.startTime
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate",
				children: ev.title
			})
		]
	});
});
function DayDetailSheet({ date, events, onClose, onAdd, onEdit, onToggleTask }) {
	const d = parseDate(date);
	const isToday = date === fmtDate(/* @__PURE__ */ new Date());
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4",
		onClick: onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-foreground/20 backdrop-blur-sm" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[70vh] flex flex-col",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center pt-3 pb-1 sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-10 h-1 rounded-full bg-muted-foreground/15" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-5 py-3 border-b border-border/30",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-base font-bold text-foreground flex items-center gap-2",
						children: [isToday && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-primary animate-pulse" }), d.toLocaleDateString("en-US", {
							weekday: "long",
							month: "long",
							day: "numeric"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[11px] text-muted-foreground mt-0.5",
						children: [
							events.length,
							" event",
							events.length !== 1 ? "s" : ""
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onAdd,
							className: "p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors touch-manipulation",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors touch-manipulation sm:block hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 16 })
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 overflow-y-auto p-4 space-y-2 pb-[env(safe-area-inset-bottom)]",
					children: events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center py-8 text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
								size: 32,
								className: "mx-auto mb-2 opacity-30"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium",
								children: "No events"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: onAdd,
								className: "text-primary text-sm font-semibold mt-2 hover:underline touch-manipulation",
								children: "+ Add event"
							})
						]
					}) : events.map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => ev.isGoogleEvent && ev.htmlLink ? window.open(ev.htmlLink, "_blank") : onEdit(ev),
						className: "w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 hover:border-primary/20 hover:bg-secondary/30 transition-all touch-manipulation active:scale-[0.98]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-1 h-10 rounded-full shrink-0",
								style: { background: ev.color }
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [
										ev.isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
											size: 11,
											className: "text-muted-foreground shrink-0"
										}),
										ev.isGoogleEvent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, {
											size: 11,
											className: "text-blue-400 shrink-0"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-sm font-semibold text-foreground truncate ${ev.status === "done" ? "line-through opacity-50" : ""}`,
											children: ev.title
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 mt-1",
									children: [ev.startTime && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-muted-foreground flex items-center gap-0.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 8 }),
											" ",
											ev.startTime,
											ev.endTime ? ` – ${ev.endTime}` : ""
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-muted-foreground/50",
										children: ev.category
									})]
								})]
							}),
							ev.isTask && ev.taskId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: (e) => {
									e.stopPropagation();
									onToggleTask(ev.taskId, ev.status || "todo");
								},
								className: `p-2 rounded-xl transition-colors touch-manipulation ${ev.status === "done" ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 16 })
							})
						]
					}, ev.id))
				})
			]
		})]
	});
}
var STORAGE_KEY = "mc_calendar_events";
function loadEvents() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
	} catch {
		return [];
	}
}
function saveEvents(evs) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(evs));
}
function CalendarPage() {
	const tasks = useTasks();
	const updateItem = useUpdateItem();
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	const isMobile = useIsMobile();
	const [view, setView] = (0, import_react.useState)("month");
	const [cursor, setCursor] = (0, import_react.useState)(/* @__PURE__ */ new Date());
	const [events, setEvents] = (0, import_react.useState)(loadEvents);
	const [modal, setModal] = (0, import_react.useState)({ open: false });
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const today = fmtDate(/* @__PURE__ */ new Date());
	const gcal = useGoogleCalendar({ autoFetch: true });
	const gtasks = useGoogleTasksCalendar();
	const [gtPickerOpen, setGtPickerOpen] = (0, import_react.useState)(false);
	const [gcalPickerOpen, setGcalPickerOpen] = (0, import_react.useState)(false);
	const [gtSetupOpen, setGtSetupOpen] = (0, import_react.useState)(false);
	const googleEvents = (0, import_react.useMemo)(() => gcal.events.map((gev) => ({
		id: gev.id,
		title: gev.title,
		date: gev.date,
		endDate: gev.endDate,
		startTime: gev.startTime,
		endTime: gev.endTime,
		color: gev.color,
		category: gev.category,
		description: gev.description,
		isTask: false,
		isGoogleEvent: true,
		allDay: gev.allDay,
		htmlLink: gev.htmlLink,
		googleEventId: gev.googleEventId
	})), [gcal.events]);
	const googleTaskEvents = (0, import_react.useMemo)(() => gtasks.events.map((gt) => ({
		id: gt.id,
		title: gt.title,
		date: gt.date,
		color: gt.done ? "#10b981" : "#f59e0b",
		category: "Google Tasks",
		description: gt.notes ? `${gt.notes}\n\n— ${gt.listTitle}` : `— ${gt.listTitle}`,
		isTask: true,
		isGoogleEvent: true,
		status: gt.done ? "done" : "todo",
		allDay: true
	})), [gtasks.events]);
	const taskEvents = (0, import_react.useMemo)(() => {
		const now = /* @__PURE__ */ new Date();
		const rangeStart = fmtDate(new Date(now.getFullYear(), now.getMonth() - 6, 1));
		const rangeEnd = fmtDate(new Date(now.getFullYear(), now.getMonth() + 6, 0));
		const result = [];
		tasks.filter((t) => t.dueDate).forEach((t) => {
			const baseEvent = {
				title: t.title,
				color: PRIORITY_COLOR[t.priority] || "#3b82f6",
				category: t.category || "Deadline",
				description: t.description,
				isTask: true,
				taskId: t.id,
				priority: t.priority,
				status: t.status,
				startTime: t.startTime,
				endTime: t.endTime,
				allDay: t.allDay !== false
			};
			if (t.recurring && t.recurringInterval) expandRecurringTask(t, rangeStart, rangeEnd).forEach((inst) => {
				result.push({
					...baseEvent,
					id: `task-${t.id}-r${inst.occurrenceIndex}`,
					date: inst.date,
					title: `🔁 ${t.title}`
				});
			});
			else result.push({
				...baseEvent,
				id: `task-${t.id}`,
				date: t.dueDate
			});
		});
		return result;
	}, [tasks]);
	const allEvents = (0, import_react.useMemo)(() => {
		const taskIds = new Set(taskEvents.map((te) => te.id));
		return [
			...events.filter((e) => !taskIds.has(e.id)),
			...taskEvents,
			...googleEvents,
			...googleTaskEvents
		];
	}, [
		events,
		taskEvents,
		googleEvents,
		googleTaskEvents
	]);
	const filteredEvents = (0, import_react.useMemo)(() => allEvents.filter((e) => filter === "all" || e.category === filter || filter === "Google Calendar" && e.isGoogleEvent), [allEvents, filter]);
	const year = cursor.getFullYear();
	const month = cursor.getMonth();
	const firstDow = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;
	const monthCells = [];
	for (let i = 0; i < firstDow; i++) monthCells.push(null);
	for (let d = 1; d <= daysInMonth; d++) monthCells.push(d);
	while (monthCells.length < totalCells) monthCells.push(null);
	const eventsByDate = (0, import_react.useMemo)(() => {
		const map = {};
		filteredEvents.forEach((e) => {
			if (e.endDate && e.endDate > e.date) {
				let cur = parseDate(e.date);
				const end = parseDate(e.endDate);
				while (cur <= end) {
					const k = fmtDate(cur);
					(map[k] = map[k] || []).push(e);
					cur = addDays(cur, 1);
				}
			} else (map[e.date] = map[e.date] || []).push(e);
		});
		return map;
	}, [filteredEvents]);
	const weekStart = startOfWeek(cursor);
	const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	const agendaEvents = (0, import_react.useMemo)(() => {
		const sorted = filteredEvents.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""));
		const groups = [];
		sorted.forEach((ev) => {
			const last = groups[groups.length - 1];
			if (last && last.date === ev.date) last.events.push(ev);
			else groups.push({
				date: ev.date,
				events: [ev]
			});
		});
		return groups;
	}, [filteredEvents, today]);
	const saveEvent = (0, import_react.useCallback)(async (ev) => {
		if (ev.isTask && ev.taskId) {
			await updateItem("tasks", ev.taskId, {
				title: ev.title,
				dueDate: ev.date,
				description: ev.description || "",
				category: ev.category,
				startTime: ev.allDay ? void 0 : ev.startTime,
				endTime: ev.allDay ? void 0 : ev.endTime,
				allDay: ev.allDay
			});
			setEvents((prev) => {
				const next = prev.filter((e) => e.id !== ev.id);
				saveEvents(next);
				return next;
			});
			toast.success("Task & calendar event updated");
			return;
		}
		setEvents((prev) => {
			let next;
			if (ev.id) {
				if (prev.some((e) => e.id === ev.id)) next = prev.map((e) => e.id === ev.id ? {
					...e,
					...ev
				} : e);
				else next = [...prev, {
					...ev,
					id: ev.id
				}];
			} else next = [...prev, {
				...ev,
				id: `evt-${Date.now()}`
			}];
			saveEvents(next);
			return next;
		});
		toast.success(ev.id ? "Event updated" : "Event created");
	}, [updateItem]);
	const deleteEvent = (0, import_react.useCallback)((id) => {
		setEvents((prev) => {
			const n = prev.filter((e) => e.id !== id);
			saveEvents(n);
			return n;
		});
		toast.success("Event deleted");
	}, []);
	const openNewEvent = (date) => {
		setModal({
			open: true,
			event: {
				date,
				allDay: false,
				startTime: "09:00",
				endTime: "10:00"
			}
		});
	};
	const openEditEvent = (ev) => {
		setModal({
			open: true,
			event: ev
		});
	};
	const toggleTaskDone = async (taskId, currentStatus) => {
		const next = currentStatus === "done" ? "todo" : "done";
		await updateItem("tasks", taskId, { status: next });
		toast.success(next === "done" ? "✅ Task marked done!" : "Task reopened");
	};
	const prev = () => {
		if (view === "month") setCursor(new Date(year, month - 1, 1));
		else if (view === "week") setCursor((d) => addDays(d, -7));
		else setCursor((d) => addDays(d, -7));
	};
	const next = () => {
		if (view === "month") setCursor(new Date(year, month + 1, 1));
		else if (view === "week") setCursor((d) => addDays(d, 7));
		else setCursor((d) => addDays(d, 7));
	};
	const goToday = () => setCursor(/* @__PURE__ */ new Date());
	const headerLabel = (0, import_react.useMemo)(() => {
		if (view === "month") return `${MONTHS[month]} ${year}`;
		if (view === "week") return `${weekStart.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric"
		})} – ${addDays(weekStart, 6).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		})}`;
		return "Agenda";
	}, [view, cursor]);
	const selectedEvents = selected ? eventsByDate[selected] || [] : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-0",
		style: { height: isMobile ? "auto" : "calc(100vh - 140px)" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 flex flex-col space-y-3 sm:space-y-4 min-w-0 overflow-auto",
				children: [
					gcal.connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/8 via-green-500/5 to-purple-500/8 border border-blue-500/15 relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 flex-1 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png",
										alt: "",
										className: "w-4 h-4 shrink-0"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-foreground truncate",
										children: "Google Calendar"
									}),
									gcal.lastSync && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-muted-foreground hidden sm:inline",
										children: ["· ", new Date(gcal.lastSync).toLocaleTimeString()]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 shrink-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setGcalPickerOpen((o) => !o),
									className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary text-foreground text-[11px] font-semibold hover:bg-secondary/70 transition-colors",
									children: [
										"Calendars (",
										gcal.enabledCalendarIds.length,
										"/",
										gcal.calendars.length,
										")",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { size: 10 })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => {
										gcal.syncEvents(true);
										if (gtasks.signed) gtasks.refresh();
									},
									disabled: gcal.syncing,
									className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors touch-manipulation",
									children: [gcal.syncing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
										size: 10,
										className: "animate-spin"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 10 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "hidden sm:inline",
										children: "Sync"
									})]
								})]
							}),
							gcalPickerOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "absolute right-3 top-full mt-2 z-50 w-72 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-xl p-2 space-y-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1",
										children: "Include calendars"
									}),
									gcal.calendars.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground px-2 py-2",
										children: "No calendars found."
									}),
									gcal.calendars.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary cursor-pointer",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: gcal.enabledCalendarIds.includes(c.id),
												onChange: () => gcal.toggleCalendar(c.id)
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "w-2.5 h-2.5 rounded-sm shrink-0",
												style: { background: c.backgroundColor || "#3b82f6" }
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-foreground truncate flex-1",
												children: c.summary || c.id
											}),
											c.primary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[9px] uppercase text-muted-foreground",
												children: "Primary"
											})
										]
									}, c.id))
								]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 px-3 sm:px-4 py-3 rounded-2xl bg-destructive/5 border border-destructive/20",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png",
								alt: "",
								className: "w-5 h-5 shrink-0 opacity-60"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs font-semibold text-foreground",
									children: "Google Calendar sync is offline"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted-foreground",
									children: gcal.error || "Connect your Google account to sync events."
								})]
							}),
							!hasGoogleClientId() ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setGtSetupOpen(true),
								disabled: gcal.connecting || gcal.syncing,
								className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors touch-manipulation disabled:opacity-50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { size: 10 }), " Set up Google"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => void gcal.connect(),
								disabled: gcal.connecting || gcal.syncing,
								className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors touch-manipulation disabled:opacity-50",
								children: [gcal.connecting || gcal.syncing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
									size: 10,
									className: "animate-spin"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 10 }), "Retry"]
							})
						]
					}),
					gtasks.signed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 flex-1 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListTodo, {
										size: 14,
										className: "text-amber-500 shrink-0"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-foreground truncate",
										children: "Google Tasks"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-muted-foreground hidden sm:inline",
										children: [
											"· ",
											gtasks.events.length,
											" on calendar",
											gtasks.lastSync && ` · ${new Date(gtasks.lastSync).toLocaleTimeString()}`
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 shrink-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setGtPickerOpen((o) => !o),
									className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary text-foreground text-[11px] font-semibold hover:bg-secondary/70 transition-colors",
									children: [
										"Lists (",
										gtasks.selected.length,
										"/",
										gtasks.lists.length,
										") ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { size: 10 })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => gtasks.refresh(),
									disabled: gtasks.loading,
									className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold hover:bg-amber-500/20 transition-colors",
									children: [gtasks.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
										size: 10,
										className: "animate-spin"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 10 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "hidden sm:inline",
										children: "Sync"
									})]
								})]
							}),
							gtPickerOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "absolute right-3 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-card shadow-xl p-2 space-y-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1",
										children: "Include lists on calendar"
									}),
									gtasks.lists.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground px-2 py-2",
										children: "No task lists found."
									}),
									gtasks.lists.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: gtasks.selected.includes(l.id),
											onChange: () => {
												gtasks.toggleList(l.id);
												setTimeout(() => gtasks.refresh(), 0);
											}
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-foreground truncate",
											children: l.title
										})]
									}, l.id)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "border-t border-border pt-1 mt-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary cursor-pointer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: gtasks.showCompleted,
												onChange: (e) => {
													gtasks.setShowCompleted(e.target.checked);
													setTimeout(() => gtasks.refresh(), 0);
												}
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-muted-foreground",
												children: "Show completed"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												gtasks.signOut();
												setGtPickerOpen(false);
											},
											className: "w-full text-left text-xs text-destructive px-2 py-1.5 rounded-lg hover:bg-destructive/10",
											children: "Disconnect Google Tasks"
										})]
									})
								]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-2xl bg-secondary/40 border border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListTodo, {
								size: 14,
								className: "text-muted-foreground shrink-0"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs font-semibold text-foreground",
									children: "Show Google Tasks on calendar"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted-foreground",
									children: gtasks.error ? gtasks.error : hasGoogleClientId() ? "Connect to display your Google Tasks with due dates." : "One-time setup: paste your Google OAuth Client ID in Settings."
								})]
							}),
							!hasGoogleClientId() ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setGtSetupOpen(true),
								className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { size: 10 }), " Set up Google"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => void gtasks.signIn(),
								className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, { size: 10 }), " Connect"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 sm:gap-3 flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1 bg-secondary rounded-xl p-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: prev,
										className: "p-1.5 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground touch-manipulation",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { size: 16 })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: goToday,
										className: "px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors whitespace-nowrap touch-manipulation",
										children: "Today"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: next,
										className: "p-1.5 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground touch-manipulation",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 16 })
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg sm:text-xl font-bold text-foreground flex-1 truncate",
								children: headerLabel
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-1 bg-secondary rounded-xl p-1",
								children: [
									"month",
									"week",
									"agenda"
								].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setView(v),
									className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize touch-manipulation ${view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
									children: v === "month" && isMobile ? "Mo" : v === "agenda" && isMobile ? "Ag" : v
								}, v))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: filter,
								onChange: (e) => setFilter(e.target.value),
								className: "px-2.5 sm:px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-medium outline-none appearance-none cursor-pointer touch-manipulation hidden sm:block",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "all",
										children: "All"
									}),
									CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: c,
										children: c
									}, c)),
									gcal.connected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Google Calendar",
										children: "Google"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => openNewEvent(today),
								className: "btn-primary text-xs sm:text-sm flex items-center gap-1.5 touch-manipulation",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }),
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "hidden sm:inline",
										children: "New Event"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sm:hidden",
										children: "Add"
									})
								]
							})
						]
					}),
					view === "month" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-elevated flex-1 overflow-hidden flex flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-7 border-b border-border/40",
							children: (isMobile ? DAYS_MINI : DAYS_SHORT).map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold tracking-wide ${i === 0 || i === 6 ? "text-muted-foreground/50" : "text-muted-foreground"}`,
								children: d
							}, `${d}-${i}`))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex-1 grid grid-cols-7",
							style: { gridTemplateRows: `repeat(${monthCells.length / 7}, 1fr)` },
							children: monthCells.map((day, idx) => {
								if (day === null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `border-b border-r border-border/20 p-0.5 sm:p-1 ${idx % 7 === 6 ? "border-r-0" : ""} bg-secondary/20` }, `empty-${idx}`);
								const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
								const dayEvts = eventsByDate[dateStr] || [];
								const isToday = dateStr === today;
								const isSel = dateStr === selected;
								const isWeekend = idx % 7 === 0 || idx % 7 === 6;
								const hasOverdue = dayEvts.some((e) => e.isTask && e.status !== "done" && e.date < today);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `
                      border-b border-r border-border/20 p-0.5 sm:p-1 group relative cursor-pointer transition-all
                      ${isMobile ? "min-h-[52px]" : "min-h-[90px]"}
                      ${idx % 7 === 6 ? "border-r-0" : ""}
                      ${isWeekend ? "bg-secondary/10" : ""}
                      ${isSel ? "bg-primary/8 ring-1 ring-inset ring-primary/30" : "hover:bg-secondary/30"}
                      ${isToday ? "bg-primary/6" : ""}
                    `,
									onClick: () => {
										if (isMobile) setSelected(dateStr);
										else setSelected(isSel ? null : dateStr);
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start justify-between mb-0.5 sm:mb-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `
                        inline-flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold transition-all
                        ${isMobile ? "w-5 h-5" : "w-6 h-6"}
                        ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}
                      `,
												children: day
											}), !isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: (e) => {
													e.stopPropagation();
													openNewEvent(dateStr);
												},
												className: "opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-primary/10 text-primary transition-all",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 11 })
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: isMobile ? "flex flex-wrap gap-0.5 px-0.5" : "space-y-0.5",
											children: isMobile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [dayEvts.slice(0, 3).map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-1.5 h-1.5 rounded-full",
												style: { background: ev.color }
											}, ev.id)), dayEvts.length > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[8px] text-muted-foreground font-bold",
												children: ["+", dayEvts.length - 3]
											})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [dayEvts.slice(0, 3).map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventPill, {
												ev,
												onClick: (e) => {
													e.stopPropagation();
													openEditEvent(ev);
												}
											}, ev.id)), dayEvts.length > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: (e) => {
													e.stopPropagation();
													setSelected(dateStr);
												},
												className: "text-[9px] text-muted-foreground hover:text-primary font-semibold pl-1",
												children: [
													"+",
													dayEvts.length - 3,
													" more"
												]
											})] })
										}),
										hasOverdue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" })
									]
								}, dateStr);
							})
						})]
					}),
					view === "week" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-elevated flex-1 overflow-hidden flex flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-7 border-b border-border/40",
							children: weekDates.map((d, i) => {
								const ds = fmtDate(d);
								const isT = ds === today;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `py-2 sm:py-3 text-center border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-secondary/30 transition-colors touch-manipulation ${isT ? "bg-primary/8" : ""}`,
									onClick: () => {
										if (isMobile) setSelected(ds);
										else setSelected(ds === selected ? null : ds);
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide ${isT ? "text-primary" : "text-muted-foreground"}`,
											children: isMobile ? DAYS_MINI[d.getDay()] : DAYS_SHORT[d.getDay()]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `mt-0.5 sm:mt-1 text-base sm:text-lg font-bold ${isT ? "text-primary" : "text-foreground"}`,
											children: d.getDate()
										}),
										(eventsByDate[ds]?.length || 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[9px] text-muted-foreground",
											children: eventsByDate[ds]?.length
										})
									]
								}, ds);
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-7 flex-1 overflow-y-auto",
							children: weekDates.map((d) => {
								const ds = fmtDate(d);
								const dayEvts = eventsByDate[ds] || [];
								const isT = ds === today;
								const isSel = ds === selected;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `border-r border-border/20 last:border-r-0 p-1 sm:p-1.5 min-h-[120px] sm:min-h-[200px] transition-colors ${isT ? "bg-primary/4" : ""} ${isSel ? "bg-primary/8 ring-1 ring-inset ring-primary/20" : "hover:bg-secondary/20"} group cursor-pointer`,
									onClick: () => {
										if (isMobile) setSelected(ds);
										else setSelected(isSel ? null : ds);
									},
									children: [!isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex justify-end mb-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: (e) => {
												e.stopPropagation();
												openNewEvent(ds);
											},
											className: "opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-primary/10 text-primary text-xs transition-all",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 11 })
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [dayEvts.slice(0, isMobile ? 2 : 99).map((ev) => isMobile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-full h-1 rounded-full",
											style: { background: ev.color }
										}, ev.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventPill, {
											ev,
											onClick: (e) => {
												e.stopPropagation();
												openEditEvent(ev);
											}
										}, ev.id)), isMobile && dayEvts.length > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[8px] text-muted-foreground",
											children: ["+", dayEvts.length - 2]
										})]
									})]
								}, ds);
							})
						})]
					}),
					view === "agenda" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "card-elevated flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 sm:space-y-6",
						children: agendaEvents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center py-16 text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
									size: 40,
									className: "mx-auto mb-3 opacity-30"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold text-foreground",
									children: "No upcoming events"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm mt-1",
									children: "Create an event or add tasks with due dates."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => openNewEvent(today),
									className: "btn-primary mt-4 text-sm touch-manipulation",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 13 }), " Add Event"]
								})
							]
						}) : agendaEvents.map((group) => {
							const d = parseDate(group.date);
							const isT = group.date === today;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3 sm:gap-5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "w-12 sm:w-16 shrink-0 text-right pt-0.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${isT ? "text-primary" : "text-muted-foreground"}`,
											children: DAYS_SHORT[d.getDay()]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `text-xl sm:text-2xl font-extrabold leading-none ${isT ? "text-primary" : "text-foreground"}`,
											children: d.getDate()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[9px] sm:text-[10px] text-muted-foreground",
											children: MONTHS[d.getMonth()].slice(0, 3)
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex-1 space-y-2",
									children: group.events.map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-border/30 hover:border-primary/20 hover:bg-secondary/30 group transition-all cursor-pointer touch-manipulation active:scale-[0.98]",
										onClick: () => ev.isGoogleEvent && ev.htmlLink ? window.open(ev.htmlLink, "_blank") : openEditEvent(ev),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-1 h-8 sm:h-10 rounded-full shrink-0",
												style: { background: ev.color }
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex-1 min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1.5 flex-wrap",
													children: [
														ev.isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
															size: 11,
															className: "text-muted-foreground shrink-0"
														}),
														ev.isGoogleEvent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, {
															size: 11,
															className: "text-blue-400 shrink-0"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: `text-sm font-semibold text-foreground truncate ${ev.status === "done" ? "line-through opacity-50" : ""}`,
															children: ev.title
														})
													]
												}), ev.startTime && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 9 }),
														" ",
														ev.startTime,
														ev.endTime ? ` – ${ev.endTime}` : ""
													]
												})]
											}),
											ev.isTask && ev.taskId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: (e) => {
													e.stopPropagation();
													toggleTaskDone(ev.taskId, ev.status || "todo");
												},
												className: `p-2 rounded-xl transition-colors touch-manipulation shrink-0 ${ev.status === "done" ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"}`,
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 14 })
											})
										]
									}, ev.id))
								})]
							}, group.date);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden lg:flex w-72 shrink-0 flex-col gap-4 overflow-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-elevated p-4 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xs font-bold text-muted-foreground uppercase tracking-wide",
							children: "This Month"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [
								{
									label: "Events",
									value: events.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length,
									icon: Calendar,
									color: "text-primary"
								},
								{
									label: "Tasks",
									value: taskEvents.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length,
									icon: SquareCheckBig,
									color: "text-emerald-500"
								},
								{
									label: "Overdue",
									value: taskEvents.filter((e) => e.date < today && e.status !== "done").length,
									icon: TriangleAlert,
									color: "text-red-500"
								},
								...gcal.connected ? [{
									label: "Google",
									value: googleEvents.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length,
									icon: Cloud,
									color: "text-blue-500"
								}] : [],
								...!gcal.connected ? [{
									label: "Done",
									value: taskEvents.filter((e) => e.status === "done").length,
									icon: Zap,
									color: "text-amber-500"
								}] : []
							].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-secondary/40 rounded-xl p-2.5 text-center",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, {
										size: 14,
										className: `mx-auto mb-1 ${s.color}`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-lg font-bold text-foreground",
										children: s.value
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-muted-foreground",
										children: s.label
									})
								]
							}, s.label))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: selected && !isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-elevated p-4 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-bold text-foreground",
								children: parseDate(selected).toLocaleDateString("en-US", {
									weekday: "short",
									month: "short",
									day: "numeric"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => openNewEvent(selected),
								className: "p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 13 })
							})]
						}), selectedEvents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground text-center py-3",
							children: "No events. Click + to add one."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: selectedEvents.map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2 p-2.5 rounded-xl hover:bg-secondary/50 group cursor-pointer transition-colors",
								onClick: () => openEditEvent(ev),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-2 h-2 rounded-full mt-1.5 shrink-0",
										style: { background: ev.color }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `text-xs font-semibold text-foreground truncate ${ev.status === "done" ? "line-through opacity-50" : ""}`,
												children: ev.title
											}),
											ev.startTime && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[10px] text-muted-foreground",
												children: [ev.startTime, ev.endTime ? `–${ev.endTime}` : ""]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-muted-foreground",
												children: ev.category
											})
										]
									}),
									ev.isTask && ev.taskId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: (e) => {
											e.stopPropagation();
											toggleTaskDone(ev.taskId, ev.status || "todo");
										},
										className: "opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-emerald-500 transition-all",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 12 })
									})
								]
							}, ev.id))
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-elevated p-4 flex-1 overflow-hidden flex flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, { size: 11 }), " Upcoming Tasks"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveSection("tasks"),
								className: "text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5",
								children: ["View all ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 9 })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5 overflow-y-auto flex-1",
							children: [tasks.filter((t) => t.status !== "done" && t.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 12).map((t) => {
								const pc = PRIORITY_COLOR[t.priority] || "#3b82f6";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/50 group cursor-pointer transition-colors",
									onClick: () => {
										setCursor(parseDate(t.dueDate));
										setView("month");
										setSelected(t.dueDate);
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-2 h-2 rounded-full shrink-0",
											style: { background: pc }
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] text-foreground flex-1 truncate",
											children: t.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-[10px] shrink-0 font-semibold text-muted-foreground`,
											children: t.dueDate === today ? "Today" : parseDate(t.dueDate).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: async (e) => {
												e.stopPropagation();
												await toggleTaskDone(t.id, t.status);
											},
											className: "opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-muted-foreground hover:text-emerald-500 transition-all shrink-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 11 })
										})
									]
								}, t.id);
							}), tasks.filter((t) => t.status !== "done" && t.dueDate >= today).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted-foreground text-center py-4",
								children: "🎉 All tasks done!"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-elevated p-4 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2",
								children: "Legend"
							}),
							Object.entries(PRIORITY_COLOR).map(([p, c]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 text-xs text-muted-foreground capitalize",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-2.5 h-2.5 rounded-full",
									style: { background: c }
								}), p]
							}, p)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t border-border/30 pt-2 mt-2 space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-xs text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
										size: 10,
										className: "text-primary"
									}), " Synced from Tasks"]
								}), gcal.connected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-xs text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, {
										size: 10,
										className: "text-blue-400"
									}), " Google Calendar"]
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: selected && isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DayDetailSheet, {
				date: selected,
				events: selectedEvents,
				onClose: () => setSelected(null),
				onAdd: () => {
					openNewEvent(selected);
					setSelected(null);
				},
				onEdit: (ev) => {
					openEditEvent(ev);
					setSelected(null);
				},
				onToggleTask: toggleTaskDone
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleSetupModal, {
				open: gtSetupOpen,
				onClose: () => setGtSetupOpen(false)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventModal, {
				open: modal.open,
				event: modal.event,
				onClose: () => setModal({ open: false }),
				onSave: saveEvent,
				onDelete: deleteEvent
			})
		]
	});
}
//#endregion
export { CalendarPage as default };
