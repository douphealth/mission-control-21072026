import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, Q as useUpdateItem, Y as useTasks, _ as useAddItem } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Bt as GripVertical, Cn as CircleCheck, Dn as ChevronDown, L as Search, Mn as Calendar, Nn as CalendarRange, Ot as LayoutGrid, Rn as Bell, T as SquareCheckBig, W as Repeat, Wn as ArrowRight, X as Plus, _n as Clock, bn as Circle, bt as List, d as TriangleAlert, h as Trash2, kt as Layers, n as X, nt as Pen, t as Zap, un as Copy, y as Target } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as requestNotificationPermission, n as REMINDER_LABELS, r as getReminderLabel } from "./routes-qm6I9RAb.mjs";
import { u as softDeleteTasks } from "./taskActions-CDh7MXDW.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
import { t as useVirtualizer } from "../_libs/@tanstack/react-virtual+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/TasksPage-CkWMMJlL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STATUSES = [
	{
		id: "todo",
		label: "To Do",
		color: "#6366f1",
		bg: "from-indigo-500/20 to-indigo-600/5",
		icon: Circle
	},
	{
		id: "in-progress",
		label: "In Progress",
		color: "#f59e0b",
		bg: "from-amber-500/20 to-amber-600/5",
		icon: Zap
	},
	{
		id: "blocked",
		label: "Blocked",
		color: "#ef4444",
		bg: "from-red-500/20 to-red-600/5",
		icon: TriangleAlert
	},
	{
		id: "done",
		label: "Done",
		color: "#10b981",
		bg: "from-emerald-500/20 to-emerald-600/5",
		icon: CircleCheck
	}
];
var PRIORITIES = [
	{
		id: "critical",
		label: "Critical",
		color: "#ef4444",
		bg: "bg-red-500/15 text-red-400",
		dot: "bg-red-500"
	},
	{
		id: "high",
		label: "High",
		color: "#f97316",
		bg: "bg-orange-500/15 text-orange-400",
		dot: "bg-orange-500"
	},
	{
		id: "medium",
		label: "Medium",
		color: "#3b82f6",
		bg: "bg-blue-500/15 text-blue-400",
		dot: "bg-blue-500"
	},
	{
		id: "low",
		label: "Low",
		color: "#10b981",
		bg: "bg-emerald-500/15 text-emerald-400",
		dot: "bg-emerald-500"
	}
];
var CATEGORIES = ["Private", "Business"];
var today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
function getPriority(id) {
	return PRIORITIES.find((p) => p.id === id) || PRIORITIES[2];
}
function getStatus(id) {
	return STATUSES.find((s) => s.id === id) || STATUSES[0];
}
function isOverdue(t) {
	return t.status !== "done" && !!t.dueDate && t.dueDate < today;
}
function isToday(t) {
	return t.dueDate === today && t.status !== "done";
}
function daysUntil(date) {
	const diff = Math.ceil((new Date(date).getTime() - new Date(today).getTime()) / 864e5);
	if (diff < 0) return `${Math.abs(diff)}d overdue`;
	if (diff === 0) return "Today";
	if (diff === 1) return "Tomorrow";
	return `${diff}d left`;
}
var EMPTY = {
	title: "",
	priority: "medium",
	status: "todo",
	startDate: today,
	dueDate: today,
	category: "Private",
	description: "",
	linkedProject: "",
	subtasks: [],
	createdAt: today,
	reminder: "none",
	reminderFired: false,
	reminders: [],
	remindersFired: []
};
function TaskModal({ open, task, defaultStatus, onClose, onSave, onDelete }) {
	const [form, setForm] = (0, import_react.useState)(() => task ? { ...task } : {
		...EMPTY,
		status: defaultStatus || "todo"
	});
	const [newSub, setNewSub] = (0, import_react.useState)("");
	const uf = (k, v) => setForm((f) => ({
		...f,
		[k]: v
	}));
	(0, import_react.useMemo)(() => {
		setForm(task ? { ...task } : {
			...EMPTY,
			status: defaultStatus || "todo"
		});
	}, [task?.id, open]);
	const addSub = () => {
		if (!newSub.trim()) return;
		uf("subtasks", [...form.subtasks, {
			id: `s-${Date.now()}`,
			title: newSub.trim(),
			done: false
		}]);
		setNewSub("");
	};
	const removeSub = (id) => uf("subtasks", form.subtasks.filter((s) => s.id !== id));
	const toggleSub = (id) => uf("subtasks", form.subtasks.map((s) => s.id === id ? {
		...s,
		done: !s.done
	} : s));
	const updateSub = (id, changes) => uf("subtasks", form.subtasks.map((s) => s.id === id ? {
		...s,
		...changes
	} : s));
	const save = () => {
		if (!form.title.trim()) {
			toast.error("Title required");
			return;
		}
		onSave({
			...task?.id ? { id: task.id } : {},
			...form
		});
		onClose();
	};
	const pr = getPriority(form.priority);
	getStatus(form.status);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[200] flex items-end sm:items-start justify-center sm:p-4 sm:pt-16",
		onClick: onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-foreground/20 backdrop-blur-sm" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative w-full sm:max-w-2xl bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[95vh] sm:max-h-none flex flex-col",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1 w-full",
					style: { background: pr.color }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-6 py-4 border-b border-border/40",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "font-bold text-card-foreground flex items-center gap-2 text-base",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, {
							size: 16,
							style: { color: pr.color }
						}), task ? "Edit Task" : "New Task"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [task && onDelete && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								onDelete(task.id);
								onClose();
							},
							className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 16 })
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							autoFocus: true,
							rows: 2,
							value: form.title,
							onChange: (e) => uf("title", e.target.value),
							placeholder: "Task title...",
							ref: (el) => {
								if (el) {
									el.style.height = "auto";
									el.style.height = el.scrollHeight + "px";
								}
							},
							onInput: (e) => {
								const el = e.currentTarget;
								el.style.height = "auto";
								el.style.height = el.scrollHeight + "px";
							},
							style: { overflow: "hidden" },
							className: "w-full text-lg font-semibold bg-transparent text-card-foreground outline-none placeholder:text-muted-foreground/40 resize-none border-b border-border/40 pb-2"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							rows: 2,
							value: form.description,
							onChange: (e) => uf("description", e.target.value),
							placeholder: "Description (optional)...",
							ref: (el) => {
								if (el) {
									el.style.height = "auto";
									el.style.height = el.scrollHeight + "px";
								}
							},
							onInput: (e) => {
								const el = e.currentTarget;
								el.style.height = "auto";
								el.style.height = el.scrollHeight + "px";
							},
							style: { overflow: "hidden" },
							className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2",
								children: "Status"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-2 gap-1.5",
								children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => uf("status", s.id),
									className: `px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${form.status === s.id ? "ring-2 ring-offset-1 ring-offset-card" : "bg-secondary opacity-60 hover:opacity-100"}`,
									style: form.status === s.id ? {
										background: s.color + "22",
										color: s.color
									} : {},
									children: s.label
								}, s.id))
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2",
								children: "Priority"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-2 gap-1.5",
								children: PRIORITIES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => uf("priority", p.id),
									className: `px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${p.bg} ${form.priority === p.id ? "ring-2 ring-offset-1 ring-offset-card" : "opacity-50 hover:opacity-100"}`,
									style: form.priority === p.id ? {} : {},
									children: p.label
								}, p.id))
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5",
									children: "Start Date"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "date",
									value: form.startDate || form.dueDate,
									onChange: (e) => {
										uf("startDate", e.target.value);
										if (e.target.value > form.dueDate) uf("dueDate", e.target.value);
									},
									className: "w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5",
									children: "End Date"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "date",
									value: form.dueDate,
									onChange: (e) => {
										uf("dueDate", e.target.value);
										if (form.startDate && e.target.value < form.startDate) uf("startDate", e.target.value);
									},
									min: form.startDate || void 0,
									className: "w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5",
									children: "Category"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: form.category,
									onChange: (e) => uf("category", e.target.value),
									className: "w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none appearance-none",
									children: CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: c }, c))
								})] })
							]
						}),
						form.startDate && form.startDate !== form.dueDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-xs text-primary",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 12 }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-medium",
									children: [
										Math.ceil((new Date(form.dueDate).getTime() - new Date(form.startDate).getTime()) / 864e5) + 1,
										" ",
										"days"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-primary/60",
									children: [
										"(",
										form.startDate,
										" → ",
										form.dueDate,
										")"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => uf("allDay", !(form.allDay !== false)),
										className: `relative w-10 h-5 rounded-full transition-colors ${form.allDay !== false ? "bg-primary" : "bg-secondary"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.allDay !== false ? "translate-x-5" : ""}` })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide",
										children: "All day"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-muted-foreground ml-auto",
										children: "Syncs to Calendar"
									})
								]
							}), form.allDay === false && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5",
									children: "Start Time"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "time",
									value: form.startTime || "09:00",
									onChange: (e) => uf("startTime", e.target.value),
									className: "w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5",
									children: "End Time"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "time",
									value: form.endTime || "10:00",
									onChange: (e) => uf("endTime", e.target.value),
									className: "w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
								})] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2 flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat, {
									size: 12,
									className: "text-primary"
								}), " Repeat"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1.5 mb-2",
								children: [
									{
										key: void 0,
										label: "None"
									},
									{
										key: "daily",
										label: "Daily"
									},
									{
										key: "weekdays",
										label: "Weekdays"
									},
									{
										key: "weekly",
										label: "Weekly"
									},
									{
										key: "biweekly",
										label: "Bi-weekly"
									},
									{
										key: "monthly",
										label: "Monthly"
									},
									{
										key: "yearly",
										label: "Yearly"
									},
									{
										key: "custom",
										label: "Custom"
									}
								].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										if (opt.key) {
											uf("recurring", true);
											uf("recurringInterval", opt.key);
										} else {
											uf("recurring", false);
											uf("recurringInterval", void 0);
										}
									},
									className: `px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation ${opt.key === void 0 && !form.recurring || form.recurring && form.recurringInterval === opt.key ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
									children: opt.label
								}, opt.label))
							}),
							form.recurring && form.recurringInterval === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 mb-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted-foreground",
										children: "Every"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: "1",
										value: form.recurringCustomDays || 1,
										onChange: (e) => uf("recurringCustomDays", Math.max(1, parseInt(e.target.value) || 1)),
										className: "w-16 px-2 py-1.5 rounded-xl bg-secondary text-foreground text-sm outline-none text-center"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted-foreground",
										children: "days"
									})
								]
							}),
							form.recurring && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/20",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5",
										children: "Ends"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5",
										children: [
											{
												key: "never",
												label: "♾️ Never",
												desc: "Repeats forever (birthdays, etc.)"
											},
											{
												key: "date",
												label: "📅 On date",
												desc: "Stops on a specific date"
											},
											{
												key: "count",
												label: "🔢 After N times",
												desc: "Stops after N completions"
											}
										].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => uf("recurringEndType", opt.key),
											className: `px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation ${(form.recurringEndType || "never") === opt.key ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
											title: opt.desc,
											children: opt.label
										}, opt.key))
									}),
									(form.recurringEndType || "never") === "date" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 mt-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarRange, {
											size: 12,
											className: "text-muted-foreground"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "date",
											value: form.recurringEndDate || "",
											onChange: (e) => uf("recurringEndDate", e.target.value),
											min: form.dueDate,
											className: "px-3 py-1.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
										})]
									}),
									form.recurringEndType === "count" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 mt-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-muted-foreground",
												children: "After"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												min: "1",
												value: form.recurringEndCount || 10,
												onChange: (e) => uf("recurringEndCount", Math.max(1, parseInt(e.target.value) || 1)),
												className: "w-16 px-2 py-1.5 rounded-xl bg-secondary text-foreground text-sm outline-none text-center"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-muted-foreground",
												children: "times"
											}),
											(form.recurringCompletedCount || 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[10px] text-primary ml-auto",
												children: [
													"(",
													form.recurringCompletedCount,
													" done)"
												]
											})
										]
									}),
									(form.recurringEndType || "never") === "never" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[10px] text-muted-foreground/60 mt-1",
										children: "Perfect for birthdays, anniversaries, recurring meetings"
									})
								]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2 flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
									size: 12,
									className: "text-primary"
								}), " Reminders"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-1.5 mb-2",
								children: (form.reminders || []).map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary text-sm text-foreground",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
											size: 11,
											className: "text-primary/70 shrink-0"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "flex-1",
											children: getReminderLabel(r)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												const next = [...form.reminders || []];
												next.splice(i, 1);
												uf("reminders", next);
												uf("remindersFired", (form.remindersFired || []).filter((f) => f !== r));
											},
											className: "text-muted-foreground hover:text-destructive transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 12 })
										})
									]
								}, i))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1.5 mb-2",
								children: [
									{
										key: "at-time",
										label: "At time"
									},
									{
										key: "5min",
										label: "5 min"
									},
									{
										key: "15min",
										label: "15 min"
									},
									{
										key: "30min",
										label: "30 min"
									},
									{
										key: "1hr",
										label: "1 hour"
									},
									{
										key: "2hr",
										label: "2 hours"
									},
									{
										key: "1day",
										label: "1 day"
									},
									{
										key: "custom:2880",
										label: "2 days"
									},
									{
										key: "custom:4320",
										label: "3 days"
									},
									{
										key: "custom:10080",
										label: "1 week"
									}
								].filter((p) => !(form.reminders || []).includes(p.key)).map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: async () => {
										uf("reminders", [...form.reminders || [], preset.key]);
										uf("remindersFired", []);
										if (!await requestNotificationPermission()) toast.info("Enable browser notifications for push alerts");
									},
									className: "px-2.5 py-1 rounded-lg bg-secondary text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:text-primary transition-colors touch-manipulation",
									children: ["+ ", preset.label]
								}, preset.key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2 items-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: "1",
									placeholder: "Custom minutes...",
									className: "flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50",
									onKeyDown: async (e) => {
										if (e.key !== "Enter") return;
										const mins = parseInt(e.currentTarget.value, 10);
										if (isNaN(mins) || mins < 1) {
											toast.error("Enter a valid number");
											return;
										}
										const key = `custom:${mins}`;
										if ((form.reminders || []).includes(key)) {
											toast.info("Already added");
											return;
										}
										uf("reminders", [...form.reminders || [], key]);
										uf("remindersFired", []);
										e.currentTarget.value = "";
										if (!await requestNotificationPermission()) toast.info("Enable browser notifications for push alerts");
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-muted-foreground whitespace-nowrap",
									children: "min before"
								})]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5",
							children: "Linked Project"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: form.linkedProject,
							onChange: (e) => uf("linkedProject", e.target.value),
							placeholder: "Project name...",
							className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2",
								children: [
									"Subtasks",
									" ",
									form.subtasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-primary",
										children: [
											"(",
											form.subtasks.filter((s) => s.done).length,
											"/",
											form.subtasks.length,
											")"
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-1.5 mb-2",
								children: form.subtasks.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-2 px-3 py-2 rounded-xl bg-secondary/50 group",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => toggleSub(sub.id),
											className: `shrink-0 mt-0.5 transition-colors ${sub.done ? "text-emerald-500" : "text-muted-foreground hover:text-primary"}`,
											children: sub.done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { size: 14 })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `text-sm block ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`,
												children: sub.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5 mt-1 flex-wrap",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "date",
														value: sub.dueDate || "",
														onChange: (e) => updateSub(sub.id, { dueDate: e.target.value }),
														className: "px-2 py-0.5 rounded-lg bg-card text-[10px] text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 w-[120px]",
														title: "Subtask date"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "time",
														value: sub.dueTime || "",
														onChange: (e) => updateSub(sub.id, { dueTime: e.target.value }),
														className: "px-2 py-0.5 rounded-lg bg-card text-[10px] text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 w-[85px]",
														title: "Subtask time"
													}),
													(sub.dueDate || sub.dueTime) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => updateSub(sub.id, {
															dueDate: void 0,
															dueTime: void 0
														}),
														className: "text-muted-foreground/50 hover:text-destructive text-[9px]",
														children: "clear"
													})
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => removeSub(sub.id),
											className: "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 mt-0.5",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 11 })
										})
									]
								}, sub.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: newSub,
									onChange: (e) => setNewSub(e.target.value),
									onKeyDown: (e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addSub();
										}
									},
									placeholder: "Add subtask... (Enter to add)",
									className: "flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: addSub,
									className: "px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 })
								})]
							})
						] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border/40 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: save,
						className: "px-5 py-2.5 sm:py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90 touch-manipulation",
						style: {
							background: `linear-gradient(135deg, ${pr.color}, ${pr.color}cc)`,
							boxShadow: `0 4px 15px ${pr.color}40`
						},
						children: task ? "Save Changes" : "Create Task"
					})]
				})
			]
		})]
	}) });
}
var KanbanCard = (0, import_react.memo)(function KanbanCard({ task, onEdit, onDelete, onDuplicate, onToggle, onToggleSub, isDragging, onDragStart, onDragEnd }) {
	const pr = getPriority(task.priority);
	const overdue = isOverdue(task);
	const todayTask = isToday(task);
	const doneSubs = task.subtasks.filter((s) => s.done).length;
	const subPct = task.subtasks.length ? doneSubs / task.subtasks.length * 100 : 0;
	const [expanded, setExpanded] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		draggable: true,
		onDragStart,
		onDragEnd,
		className: `
        kanban-card group cursor-grab active:cursor-grabbing select-none
        ${overdue ? "!border-red-500/40" : ""}
        ${todayTask ? "!border-amber-500/50" : ""}
        ${task.status === "done" ? "opacity-60" : ""}
        ${isDragging ? "dragging" : ""}
      `,
		style: {
			borderLeft: `3px solid ${pr.color}`,
			boxShadow: overdue ? "0 4px 18px -8px hsl(0 74% 55% / 0.4)" : todayTask ? "0 4px 18px -8px hsl(36 94% 58% / 0.4)" : void 0
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-3.5 pb-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: (e) => {
								e.stopPropagation();
								onToggle();
							},
							className: "mt-0.5 shrink-0 transition-colors hover:scale-110",
							style: { color: task.status === "done" ? "#10b981" : "#6b7280" },
							children: task.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { size: 16 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: `text-sm font-semibold leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-card-foreground"}`,
								children: task.title
							}), task.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted-foreground mt-1 line-clamp-2",
								children: task.description
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: (e) => {
										e.stopPropagation();
										onDuplicate();
									},
									className: "p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors touch-manipulation",
									title: "Duplicate",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 12 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: (e) => {
										e.stopPropagation();
										onEdit();
									},
									className: "p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 12 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: (e) => {
										e.stopPropagation();
										onDelete();
									},
									className: "p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center flex-wrap gap-1.5 mt-2.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${pr.bg}`,
							children: pr.label
						}),
						task.category && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium",
							children: task.category
						}),
						task.linkedProject && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-medium truncate max-w-[90px]",
							children: task.linkedProject
						})
					]
				}),
				task.subtasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setExpanded((e) => !e),
						className: "flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { size: 10 }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								doneSubs,
								"/",
								task.subtasks.length,
								" subtasks"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex-1 bg-secondary rounded-full h-1 overflow-hidden ml-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full rounded-full transition-all duration-500",
									style: {
										width: `${subPct}%`,
										background: pr.color
									}
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
								size: 10,
								className: `transition-transform ${expanded ? "rotate-180" : ""}`
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-hidden mt-1.5 space-y-1",
						children: task.subtasks.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onToggleSub(sub.id),
							className: "flex items-center gap-1.5 text-[11px] w-full text-left hover:text-foreground transition-colors",
							style: { color: sub.done ? "#10b981" : "#9ca3af" },
							children: [sub.done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 11 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { size: 11 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: sub.done ? "line-through" : "",
								children: sub.title
							})]
						}, sub.id))
					}) })]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between px-3.5 pb-3 pt-1 border-t border-border/20",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `flex items-center gap-1 text-[10px] font-semibold ${overdue ? "text-red-400" : todayTask ? "text-amber-400" : "text-muted-foreground"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { size: 9 }),
					task.dueDate ? daysUntil(task.dueDate) : "No date",
					task.allDay === false && task.startTime && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-1 text-primary/70 font-medium",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, {
								size: 8,
								className: "inline -mt-0.5 mr-0.5"
							}),
							task.startTime,
							task.endTime ? `–${task.endTime}` : ""
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5",
				children: [(task.reminders && task.reminders.length > 0 || task.reminder && task.reminder !== "none") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					title: (task.reminders || []).map(getReminderLabel).join(", ") || REMINDER_LABELS[task.reminder || "none"],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
						size: 10,
						className: "text-primary/60"
					}), (task.reminders?.length || 0) > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[8px] text-primary/60 ml-0.5",
						children: task.reminders.length
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, {
					size: 12,
					className: "text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors"
				})]
			})]
		})]
	});
});
function KanbanColumn({ status, tasks, onEdit, onDelete, onDuplicate, onToggle, onToggleSub, onAddNew, onDrop, draggingId, onCardDragStart, onCardDragEnd }) {
	const [dragOver, setDragOver] = (0, import_react.useState)(false);
	const handleDragOver = (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOver(true);
	};
	const handleDrop = (e) => {
		e.preventDefault();
		setDragOver(false);
		const taskId = e.dataTransfer.getData("taskId") || e.dataTransfer.getData("text/plain") || draggingId;
		if (taskId) onDrop(taskId, status.id);
	};
	status.icon;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		onDragOver: handleDragOver,
		onDragLeave: () => setDragOver(false),
		onDrop: handleDrop,
		className: `kanban-col flex-1 min-w-[240px] sm:min-w-[260px] max-w-[320px] flex flex-col snap-start ${dragOver ? "drag-over" : ""}`,
		style: { ["--col-accent"]: status.color },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between px-4 py-3.5 rounded-t-[21px]",
			style: { background: `linear-gradient(90deg, ${status.color}1f, transparent 70%)` },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-2.5 h-2.5 rounded-full",
						style: {
							background: status.color,
							boxShadow: `0 0 10px ${status.color}99`
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-bold text-foreground font-display tracking-tight",
						children: status.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums",
						style: {
							background: `${status.color}1a`,
							color: status.color
						},
						children: tasks.length
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: onAddNew,
				className: "p-1 rounded-lg hover:bg-card/50 text-muted-foreground hover:text-foreground transition-colors",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 })
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[120px] rounded-b-[21px] transition-colors ${dragOver ? "bg-primary/3" : "bg-transparent"}`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: tasks.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KanbanCard, {
				task: t,
				isDragging: draggingId === t.id,
				onEdit: () => onEdit(t),
				onDelete: () => onDelete(t.id),
				onDuplicate: () => onDuplicate(t.id),
				onToggle: () => onToggle(t.id),
				onToggleSub: (subId) => onToggleSub(t.id, subId),
				onDragStart: (e) => {
					onCardDragStart(t.id);
					e.dataTransfer.setData("text/plain", t.id);
					e.dataTransfer.setData("taskId", t.id);
					e.dataTransfer.effectAllowed = "move";
				},
				onDragEnd: onCardDragEnd
			}, t.id)) }), tasks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `relative flex flex-col items-center justify-center gap-1 h-24 rounded-xl border-2 border-dashed transition-all duration-200 ${dragOver ? "border-primary/50 text-primary bg-primary/5" : "border-border/30 text-muted-foreground/60"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-1.5 h-1.5 rounded-full transition-all",
						style: {
							background: dragOver ? status.color : "currentColor",
							opacity: dragOver ? 1 : .35,
							boxShadow: dragOver ? `0 0 10px ${status.color}` : void 0
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold",
						children: dragOver ? "Drop here" : tasks.length === 0 && status.id === "done" ? "Nothing done yet" : "Nothing here"
					}),
					!dragOver && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] opacity-60",
						children: "Drag cards or + to add"
					})
				]
			})]
		})]
	});
}
function shiftISO(base, days) {
	const d = /* @__PURE__ */ new Date(`${base || today}T00:00:00`);
	d.setDate(d.getDate() + days);
	return d.toISOString().split("T")[0];
}
var ListRow = (0, import_react.memo)(function ListRow({ task, onEdit, onDelete, onDuplicate, onToggle, onToggleSub, onRename, onSetDue, onSetPriority, onSetStatus, index, bulkMode, selected, onToggleSelect }) {
	const pr = getPriority(task.priority);
	const st = getStatus(task.status);
	const overdue = isOverdue(task);
	const [expanded, setExpanded] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)(task.title);
	const [menu, setMenu] = (0, import_react.useState)(null);
	const doneSubs = task.subtasks.filter((s) => s.done).length;
	const commit = () => {
		setEditing(false);
		const v = draft.trim();
		if (v && v !== task.title) onRename(v);
		else setDraft(task.title);
	};
	const quickDates = [
		{
			label: "Today",
			date: today
		},
		{
			label: "Tomorrow",
			date: shiftISO(today, 1)
		},
		{
			label: "+3 days",
			date: shiftISO(today, 3)
		},
		{
			label: "Next week",
			date: shiftISO(today, 7)
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `
        rounded-2xl border group transition-all
        hover:border-primary/20 hover:bg-secondary/20 hover:shadow-md
        ${task.status === "done" ? "opacity-55" : ""}
        ${overdue ? "border-destructive/30 bg-destructive/5" : "border-border/30 bg-card/60"}
      `,
		style: { borderLeft: `3px solid ${pr.color}` },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5",
			children: [
				bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: onToggleSelect,
					className: `shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all touch-manipulation ${selected ? "bg-primary border-primary" : "border-border hover:border-primary/50"}`,
					children: selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
						size: 12,
						className: "text-primary-foreground"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: onToggle,
					title: task.status === "done" ? "Reopen" : "Mark done",
					className: "shrink-0 transition-all hover:scale-110 touch-manipulation p-1",
					style: { color: task.status === "done" ? "hsl(var(--success))" : "hsl(var(--muted-foreground))" },
					children: task.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { size: 18 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 min-w-0",
					children: [editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						autoFocus: true,
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						onBlur: commit,
						onKeyDown: (e) => {
							if (e.key === "Enter") commit();
							if (e.key === "Escape") {
								setDraft(task.title);
								setEditing(false);
							}
						},
						className: "w-full text-sm font-semibold bg-secondary/70 rounded-lg px-2 py-1 text-foreground outline-none ring-1 ring-primary/40"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-2 mb-0.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							onClick: () => {
								setDraft(task.title);
								setEditing(true);
							},
							title: "Click to rename · double-click for full editor",
							onDoubleClick: onEdit,
							role: "button",
							tabIndex: 0,
							className: `text-sm font-semibold truncate cursor-text ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`,
							children: task.title
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5 flex-wrap relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setMenu((m) => m === "priority" ? null : "priority"),
								className: `text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${pr.bg} hover:ring-1 hover:ring-primary/30 touch-manipulation`,
								children: pr.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setMenu((m) => m === "status" ? null : "status"),
								className: "text-[10px] px-1.5 py-0.5 rounded-md font-semibold hover:ring-1 hover:ring-primary/30 touch-manipulation",
								style: {
									background: st.color + "22",
									color: st.color
								},
								children: st.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setMenu((m) => m === "due" ? null : "due"),
								className: `text-[10px] px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-1 bg-secondary/70 hover:ring-1 hover:ring-primary/30 touch-manipulation ${overdue ? "text-destructive" : isToday(task) ? "text-warning" : "text-muted-foreground"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { size: 9 }), task.dueDate ? daysUntil(task.dueDate) : "No date"]
							}),
							task.category && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[10px] text-muted-foreground/50 hidden sm:inline",
								children: ["· ", task.category]
							}),
							task.linkedProject && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[10px] text-primary/60 font-medium truncate max-w-[80px] hidden sm:inline",
								children: ["↳ ", task.linkedProject]
							}),
							menu && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "absolute z-30 top-full left-0 mt-1 p-1 rounded-xl bg-card border border-border/60 shadow-xl flex flex-wrap gap-1 max-w-[280px]",
								children: [
									menu === "priority" && PRIORITIES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											onSetPriority(p.id);
											setMenu(null);
										},
										className: `text-[11px] px-2 py-1 rounded-lg font-semibold ${p.bg} ${task.priority === p.id ? "ring-1 ring-primary/50" : ""}`,
										children: p.label
									}, p.id)),
									menu === "status" && STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											onSetStatus(s.id);
											setMenu(null);
										},
										className: `text-[11px] px-2 py-1 rounded-lg font-semibold ${task.status === s.id ? "ring-1 ring-primary/50" : ""}`,
										style: {
											background: s.color + "22",
											color: s.color
										},
										children: s.label
									}, s.id)),
									menu === "due" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [quickDates.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											onSetDue(q.date);
											setMenu(null);
										},
										className: "text-[11px] px-2 py-1 rounded-lg font-semibold bg-secondary text-foreground hover:bg-primary/15 hover:text-primary",
										children: q.label
									}, q.label)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "date",
										value: task.dueDate || "",
										onChange: (e) => {
											if (e.target.value) {
												onSetDue(e.target.value);
												setMenu(null);
											}
										},
										className: "text-[11px] px-2 py-1 rounded-lg bg-secondary text-foreground outline-none"
									})] })
								]
							})
						]
					})]
				}),
				task.subtasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setExpanded((e) => !e),
					className: "flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0 bg-secondary px-2 py-1 rounded-lg touch-manipulation",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 10 }),
						doneSubs,
						"/",
						task.subtasks.length,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
							size: 9,
							className: `transition-transform ${expanded ? "rotate-180" : ""}`
						})
					]
				}),
				task.status !== "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onSetDue(today),
							title: "Due today",
							className: "text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 font-semibold",
							children: "Today"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onSetDue(shiftISO(task.dueDate || today, 1)),
							title: "Push 1 day",
							className: "text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 font-semibold",
							children: "+1d"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onSetDue(shiftISO(task.dueDate || today, 7)),
							title: "Push 1 week",
							className: "text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 font-semibold",
							children: "+1w"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onDuplicate,
							className: "p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation",
							title: "Duplicate",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 13 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onEdit,
							className: "p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation",
							title: "Open editor",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 13 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onDelete,
							className: "p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation",
							title: "Delete",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 })
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: expanded && task.subtasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-hidden border-t border-border/20 mx-3 sm:mx-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "py-2 space-y-1",
				children: task.subtasks.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onToggleSub(sub.id),
					className: "flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/40 w-full text-left group/sub hover:bg-secondary/70 transition-colors touch-manipulation",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { color: sub.done ? "hsl(var(--success))" : "hsl(var(--muted-foreground))" },
						children: sub.done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { size: 13 })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `text-xs transition-colors ${sub.done ? "line-through text-muted-foreground" : "text-foreground group-hover/sub:text-foreground"}`,
						children: sub.title
					})]
				}, sub.id))
			})
		}) })]
	}) });
});
function VirtualizedList({ tasks, bulkMode, selectedIds, onEdit, onDelete, onDuplicate, onToggle, onToggleSub, onToggleSelect, onRename, onSetDue, onSetPriority, onSetStatus }) {
	const parentRef = (0, import_react.useRef)(null);
	const virtualizer = useVirtualizer({
		count: tasks.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 76,
		overscan: 8,
		measureElement: (el) => el?.getBoundingClientRect().height ?? 76
	});
	const rowProps = (task, i) => ({
		task,
		index: i,
		onEdit: () => onEdit(task),
		onDelete: () => onDelete(task.id),
		onDuplicate: () => onDuplicate(task.id),
		onToggle: () => onToggle(task.id),
		onToggleSub: (subId) => onToggleSub(task.id, subId),
		onRename: (title) => onRename(task.id, title),
		onSetDue: (date) => onSetDue(task.id, date),
		onSetPriority: (p) => onSetPriority(task.id, p),
		onSetStatus: (s) => onSetStatus(task.id, s),
		bulkMode,
		selected: selectedIds.has(task.id),
		onToggleSelect: () => onToggleSelect(task.id)
	});
	if (tasks.length <= 30) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: tasks.map((task, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListRow, { ...rowProps(task, i) }, task.id)) });
	const items = virtualizer.getVirtualItems();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: parentRef,
		className: "overflow-auto",
		style: {
			maxHeight: "calc(100vh - 280px)",
			contain: "strict"
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				height: virtualizer.getTotalSize(),
				width: "100%",
				position: "relative"
			},
			children: items.map((v) => {
				const task = tasks[v.index];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"data-index": v.index,
					ref: virtualizer.measureElement,
					style: {
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						transform: `translateY(${v.start}px)`,
						paddingBottom: 6
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListRow, { ...rowProps(task, v.index) })
				}, task.id);
			})
		})
	});
}
function TasksPage() {
	const tasks = useTasks();
	const addItem = useAddItem();
	const updateItem = useUpdateItem();
	const duplicateItem = useDuplicateItem();
	const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
	const [view, setView] = (0, import_react.useState)(isMobile ? "list" : "kanban");
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterStatus, setFilterStatus] = (0, import_react.useState)("all");
	const [filterPriority, setFilterPriority] = (0, import_react.useState)("all");
	const [filterCategory, setFilterCategory] = (0, import_react.useState)("all");
	const [modal, setModal] = (0, import_react.useState)({ open: false });
	const [quickAdd, setQuickAdd] = (0, import_react.useState)("");
	const [draggingId, setDraggingId] = (0, import_react.useState)(null);
	const [sortBy, setSortBy] = (0, import_react.useState)("priority");
	const [grouped, setGrouped] = (0, import_react.useState)(true);
	const [collapsedGroups, setCollapsedGroups] = (0, import_react.useState)(/* @__PURE__ */ new Set(["done"]));
	const [preset, setPreset] = (0, import_react.useState)("open");
	const [bulkMode, setBulkMode] = (0, import_react.useState)(false);
	const [selectedIds, setSelectedIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const toggleSelect = (0, import_react.useCallback)((id) => {
		setSelectedIds((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});
	}, []);
	const exitBulk = (0, import_react.useCallback)(() => {
		setBulkMode(false);
		setSelectedIds(/* @__PURE__ */ new Set());
	}, []);
	const didNormalizeRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (didNormalizeRef.current) return;
		if (!tasks || tasks.length === 0) return;
		didNormalizeRef.current = true;
		const matchPriority = (title) => {
			const t = title || "";
			if (t.includes("[URGENT") || t.includes("[Phase 1]")) return "critical";
			if (t.includes("[Phase 2]")) return "high";
			if (t.includes("[Phase 3]")) return "medium";
			return null;
		};
		const candidates = tasks.map((t) => ({
			task: t,
			nextPriority: matchPriority(t.title)
		})).filter((x) => x.nextPriority !== null);
		const toUpdate = candidates.filter(({ task, nextPriority }) => task.category !== "Business" || task.priority !== nextPriority);
		console.log(`[Phase normalize] DRY RUN — ${candidates.length} matching, ${toUpdate.length} need update.`, toUpdate.map(({ task, nextPriority }) => ({
			id: task.id,
			title: task.title,
			from: {
				category: task.category,
				priority: task.priority
			},
			to: {
				category: "Business",
				priority: nextPriority
			}
		})));
		toast.message("Phase normalize (dry run)", { description: `${candidates.length} match • ${toUpdate.length} would update` });
		if (toUpdate.length === 0) return;
		(async () => {
			for (const { task, nextPriority } of toUpdate) await updateItem("tasks", task.id, {
				category: "Business",
				priority: nextPriority
			});
			toast.success(`Updated ${toUpdate.length} Phase/Urgent task(s) → Business`);
		})();
	}, [tasks]);
	const stats = (0, import_react.useMemo)(() => ({
		total: tasks.length,
		open: tasks.filter((t) => t.status !== "done").length,
		done: tasks.filter((t) => t.status === "done").length,
		overdue: tasks.filter(isOverdue).length,
		todayTask: tasks.filter(isToday).length,
		critical: tasks.filter((t) => t.priority === "critical" && t.status !== "done").length,
		blocked: tasks.filter((t) => t.status === "blocked").length,
		pct: tasks.length ? Math.round(tasks.filter((t) => t.status === "done").length / tasks.length * 100) : 0
	}), [tasks]);
	const filtered = (0, import_react.useMemo)(() => {
		const PORD = {
			critical: 0,
			high: 1,
			medium: 2,
			low: 3
		};
		return tasks.filter((t) => t.archived !== true).filter((t) => filterStatus === "all" || t.status === filterStatus).filter((t) => filterPriority === "all" || t.priority === filterPriority).filter((t) => filterCategory === "all" || t.category === filterCategory).filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
			if (sortBy === "priority") {
				if (a.status === "done" && b.status !== "done") return 1;
				if (a.status !== "done" && b.status === "done") return -1;
				return (PORD[a.priority] ?? 3) - (PORD[b.priority] ?? 3);
			}
			if (sortBy === "dueDate") return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
			return b.createdAt.localeCompare(a.createdAt);
		});
	}, [
		tasks,
		filterStatus,
		filterPriority,
		filterCategory,
		search,
		sortBy
	]);
	const listTasks = (0, import_react.useMemo)(() => {
		const weekEnd = shiftISO(today, 7);
		return filtered.filter((t) => {
			switch (preset) {
				case "all": return true;
				case "open": return t.status !== "done";
				case "overdue": return t.status !== "done" && !!t.dueDate && t.dueDate < today;
				case "today": return t.status !== "done" && (t.dueDate === today || !!t.dueDate && t.dueDate < today);
				case "week": return t.status !== "done" && !!t.dueDate && t.dueDate <= weekEnd;
				case "critical": return t.status !== "done" && (t.priority === "critical" || t.priority === "high");
				default: return true;
			}
		});
	}, [filtered, preset]);
	const tasksByStatus = (0, import_react.useMemo)(() => {
		const map = {
			todo: [],
			"in-progress": [],
			blocked: [],
			done: []
		};
		filtered.forEach((t) => {
			(map[t.status] = map[t.status] || []).push(t);
		});
		return map;
	}, [filtered]);
	const handleSave = (0, import_react.useCallback)(async (t) => {
		if (t.id) {
			const { id, ...rest } = t;
			await updateItem("tasks", id, rest);
			toast.success("Task updated ✓");
		} else if (await addItem("tasks", {
			...t,
			createdAt: today
		})) toast.success("Task created ✓");
		else toast.error("Duplicate task — already exists");
	}, [addItem, updateItem]);
	const cd = useConfirmDialog();
	const handleDelete = (0, import_react.useCallback)(async (id) => {
		await softDeleteTasks([id]);
	}, []);
	const handleBulkDelete = (0, import_react.useCallback)(async () => {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		await softDeleteTasks(ids);
		exitBulk();
	}, [selectedIds, exitBulk]);
	const handleDuplicate = (0, import_react.useCallback)(async (id) => {
		if (await duplicateItem("tasks", id, {
			status: "todo",
			completedAt: void 0
		})) toast.success("Task duplicated ✓");
	}, [duplicateItem]);
	const handleToggle = (0, import_react.useCallback)(async (id) => {
		const t = tasks.find((x) => x.id === id);
		if (!t) return;
		const next = t.status === "done" ? "todo" : "done";
		await updateItem("tasks", id, {
			status: next,
			completedAt: next === "done" ? today : void 0
		});
		toast.success(next === "done" ? "✅ Done!" : "Reopened");
	}, [tasks, updateItem]);
	const handleToggleSub = (0, import_react.useCallback)(async (taskId, subId) => {
		const t = tasks.find((x) => x.id === taskId);
		if (!t) return;
		const subtasks = t.subtasks.map((s) => s.id === subId ? {
			...s,
			done: !s.done
		} : s);
		await updateItem("tasks", taskId, { subtasks });
	}, [tasks, updateItem]);
	const handleDrop = (0, import_react.useCallback)(async (taskId, newStatus) => {
		const t = tasks.find((x) => x.id === taskId);
		if (!t || t.status === newStatus) return;
		await updateItem("tasks", taskId, {
			status: newStatus,
			completedAt: newStatus === "done" ? today : void 0
		});
		setDraggingId(null);
		const st = getStatus(newStatus);
		toast.success(`Moved to ${st.label}`, { icon: "↪" });
	}, [tasks, updateItem]);
	const quickAddTask = (0, import_react.useCallback)(async () => {
		if (!quickAdd.trim()) return;
		const newId = await addItem("tasks", {
			...EMPTY,
			title: quickAdd.trim(),
			createdAt: today
		});
		setQuickAdd("");
		if (newId) toast.success("Task added ✓");
		else toast.error("Duplicate task — already exists");
	}, [quickAdd, addItem]);
	const handleRename = (0, import_react.useCallback)(async (id, title) => {
		await updateItem("tasks", id, { title });
	}, [updateItem]);
	const handleSetDue = (0, import_react.useCallback)(async (id, date) => {
		await updateItem("tasks", id, { dueDate: date });
		toast.success(`Due ${date === today ? "today" : date}`);
	}, [updateItem]);
	const handleSetPriority = (0, import_react.useCallback)(async (id, priority) => {
		await updateItem("tasks", id, { priority });
	}, [updateItem]);
	const handleSetStatus = (0, import_react.useCallback)(async (id, status) => {
		await updateItem("tasks", id, {
			status,
			completedAt: status === "done" ? today : void 0
		});
	}, [updateItem]);
	const bulkApply = (0, import_react.useCallback)(async (changes, label) => {
		const ids = Array.from(selectedIds);
		if (!ids.length) return;
		for (const id of ids) await updateItem("tasks", id, changes);
		toast.success(`${label} · ${ids.length} task${ids.length > 1 ? "s" : ""}`);
		exitBulk();
	}, [
		selectedIds,
		updateItem,
		exitBulk
	]);
	const selectGroup = (0, import_react.useCallback)((groupTasks) => {
		setSelectedIds((prev) => {
			const n = new Set(prev);
			groupTasks.forEach((t) => n.add(t.id));
			return n;
		});
	}, []);
	const toggleGroup = (0, import_react.useCallback)((id) => {
		setCollapsedGroups((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});
	}, []);
	const groups = (0, import_react.useMemo)(() => {
		const weekEnd = shiftISO(today, 7);
		return [
			{
				id: "overdue",
				label: "Overdue",
				tone: "text-destructive",
				match: (t) => t.status !== "done" && !!t.dueDate && t.dueDate < today
			},
			{
				id: "today",
				label: "Today",
				tone: "text-amber-400",
				match: (t) => t.status !== "done" && t.dueDate === today
			},
			{
				id: "week",
				label: "Next 7 days",
				tone: "text-primary",
				match: (t) => t.status !== "done" && !!t.dueDate && t.dueDate > today && t.dueDate <= weekEnd
			},
			{
				id: "later",
				label: "Later",
				tone: "text-muted-foreground",
				match: (t) => t.status !== "done" && !!t.dueDate && t.dueDate > weekEnd
			},
			{
				id: "nodate",
				label: "No due date",
				tone: "text-muted-foreground",
				match: (t) => t.status !== "done" && !t.dueDate
			},
			{
				id: "done",
				label: "Done",
				tone: "text-emerald-400",
				match: (t) => t.status === "done"
			}
		].map((d) => ({
			...d,
			tasks: collapsedGroups.has(d.id) ? [] : listTasks.filter(d.match),
			count: listTasks.filter(d.match).length
		})).filter((g) => g.count > 0);
	}, [listTasks, collapsedGroups]);
	const allCategories = (0, import_react.useMemo)(() => {
		const cats = new Set(tasks.map((t) => t.category).filter(Boolean));
		return Array.from(cats);
	}, [tasks]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "title-grad text-2xl font-extrabold flex items-center gap-2 sm:text-3xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, {
						size: 24,
						className: "text-primary",
						style: { WebkitTextFillColor: "initial" }
					}), "Task Manager"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground mt-1",
					children: [
						stats.open,
						" open · ",
						stats.done,
						" done",
						stats.overdue > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-red-400 font-semibold",
							children: [
								" · ⚠ ",
								stats.overdue,
								" overdue"
							]
						}),
						stats.todayTask > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-amber-400 font-semibold",
							children: [
								" ",
								"· 🔥 ",
								stats.todayTask,
								" due today"
							]
						})
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setModal({
						open: true,
						task: null
					}),
					className: "btn-primary flex items-center gap-1.5 text-sm shadow-lg shadow-primary/25",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 15 }), " New Task"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible",
				children: [
					{
						label: "Total",
						value: stats.total,
						accent: "hsl(var(--foreground))"
					},
					{
						label: "Open",
						value: stats.open,
						accent: "hsl(245 80% 65%)"
					},
					{
						label: "In Progress",
						value: tasksByStatus["in-progress"].length,
						accent: "hsl(36 94% 58%)"
					},
					{
						label: "Blocked",
						value: stats.blocked,
						accent: "hsl(0 74% 55%)"
					},
					{
						label: "Done",
						value: stats.done,
						accent: "hsl(152 68% 46%)"
					},
					{
						label: "Overdue",
						value: stats.overdue,
						accent: "hsl(0 74% 55%)"
					},
					{
						label: "Critical",
						value: stats.critical,
						accent: "hsl(24 90% 55%)"
					}
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "stat-tile min-w-[88px] flex-shrink-0 sm:flex-shrink sm:min-w-0",
					style: { ["--tile-accent"]: s.accent },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "stat-num",
						style: { color: s.accent },
						children: s.value
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
						children: s.label
					})]
				}, s.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "progress-luxe flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "progress-luxe-fill",
						style: { width: `${stats.pct}%` }
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-xs font-bold text-muted-foreground shrink-0 tabular-nums",
					children: [stats.pct, "% complete"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card-elevated p-3 flex items-center gap-3 hover:shadow-lg transition-shadow",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
						size: 18,
						className: "text-muted-foreground shrink-0"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: quickAdd,
						onChange: (e) => setQuickAdd(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && quickAddTask(),
						placeholder: "Quick add task... press Enter ↵",
						className: "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
					}),
					quickAdd && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: quickAddTask,
						className: "px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors",
						children: "Add"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 flex-1 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
								size: 13,
								className: "text-muted-foreground shrink-0"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: search,
								onChange: (e) => setSearch(e.target.value),
								placeholder: "Search tasks...",
								className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none flex-1 min-w-0"
							}),
							search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSearch(""),
								className: "text-muted-foreground hover:text-foreground touch-manipulation",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 12 })
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1 bg-secondary rounded-xl p-1 shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setView("kanban"),
							className: `p-1.5 rounded-lg transition-all touch-manipulation ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`,
							title: "Kanban Board",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, { size: 14 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setView("list"),
							className: `p-1.5 rounded-lg transition-all touch-manipulation ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`,
							title: "List View",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, { size: 14 })
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2 overflow-x-auto hide-scrollbar pb-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-1 bg-secondary rounded-xl p-1 shrink-0",
							children: ["all", ...STATUSES.map((s) => s.id)].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setFilterStatus(s),
								className: `px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all whitespace-nowrap touch-manipulation ${filterStatus === s ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`,
								children: s === "all" ? `All` : getStatus(s).label
							}, s))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: filterPriority,
							onChange: (e) => setFilterPriority(e.target.value),
							className: "px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold outline-none appearance-none cursor-pointer shrink-0 touch-manipulation",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "Priority"
							}), PRIORITIES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: p.id,
								children: p.label
							}, p.id))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: filterCategory,
							onChange: (e) => setFilterCategory(e.target.value),
							className: "px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold outline-none appearance-none cursor-pointer shrink-0 touch-manipulation",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "Category"
							}), allCategories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c,
								children: c
							}, c))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: sortBy,
							onChange: (e) => setSortBy(e.target.value),
							className: "px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold outline-none appearance-none cursor-pointer shrink-0 touch-manipulation",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "priority",
									children: "Priority"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "dueDate",
									children: "Due Date"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "created",
									children: "Created"
								})
							]
						})
					]
				})]
			}),
			view === "kanban" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory",
				style: { minHeight: 400 },
				children: STATUSES.map((status) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KanbanColumn, {
					status,
					tasks: tasksByStatus[status.id] || [],
					onEdit: (t) => setModal({
						open: true,
						task: t
					}),
					onDelete: handleDelete,
					onDuplicate: handleDuplicate,
					onToggle: handleToggle,
					onToggleSub: handleToggleSub,
					onAddNew: () => setModal({
						open: true,
						task: null,
						defaultStatus: status.id
					}),
					onDrop: handleDrop,
					draggingId,
					onCardDragStart: setDraggingId,
					onCardDragEnd: () => setDraggingId(null)
				}, status.id))
			}),
			view === "list" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 overflow-x-auto hide-scrollbar pb-1 items-center",
						children: [[
							{
								id: "open",
								label: "Open",
								count: stats.open
							},
							{
								id: "overdue",
								label: "Overdue",
								count: stats.overdue
							},
							{
								id: "today",
								label: "Due today",
								count: stats.todayTask
							},
							{
								id: "week",
								label: "This week",
								count: null
							},
							{
								id: "critical",
								label: "Important",
								count: stats.critical
							},
							{
								id: "all",
								label: "Everything",
								count: stats.total
							}
						].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setPreset(p.id),
							className: `shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation ${preset === p.id ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
							children: [p.label, p.count != null && p.count > 0 ? ` · ${p.count}` : ""]
						}, p.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setGrouped((g) => !g),
							className: `shrink-0 ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation ${grouped ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
							title: "Group by due date",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { size: 13 }), " Group by date"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 flex-wrap",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => bulkMode ? exitBulk() : setBulkMode(true),
							className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation ${bulkMode ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 13 }), bulkMode ? "Cancel" : "Select"]
						}), bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									if (selectedIds.size === listTasks.length) setSelectedIds(/* @__PURE__ */ new Set());
									else setSelectedIds(new Set(listTasks.map((t) => t.id)));
								},
								className: "px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-all touch-manipulation",
								children: selectedIds.size === listTasks.length && listTasks.length > 0 ? "Deselect all" : "Select all"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs text-muted-foreground font-medium",
								children: [selectedIds.size, " selected"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => bulkApply({
									status: "done",
									completedAt: today
								}, "Completed"),
								disabled: selectedIds.size === 0,
								className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40 touch-manipulation",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 12 }), " Done"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => bulkApply({ dueDate: today }, "Due today"),
								disabled: selectedIds.size === 0,
								className: "px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-40 touch-manipulation",
								children: "Due today"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => bulkApply({ dueDate: shiftISO(today, 7) }, "Pushed 1 week"),
								disabled: selectedIds.size === 0,
								className: "px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-40 touch-manipulation",
								children: "Push +1w"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: "",
								onChange: (e) => {
									if (e.target.value) bulkApply({ priority: e.target.value }, "Priority updated");
								},
								disabled: selectedIds.size === 0,
								className: "px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary text-foreground outline-none disabled:opacity-40 touch-manipulation",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Priority…"
								}), PRIORITIES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: p.id,
									children: p.label
								}, p.id))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: handleBulkDelete,
								disabled: selectedIds.size === 0,
								className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 }),
									"Delete",
									selectedIds.size > 0 ? ` (${selectedIds.size})` : ""
								]
							})
						] })]
					}),
					(() => {
						const listHandlers = {
							bulkMode,
							selectedIds,
							onEdit: (t) => setModal({
								open: true,
								task: t
							}),
							onDelete: handleDelete,
							onDuplicate: handleDuplicate,
							onToggle: handleToggle,
							onToggleSub: handleToggleSub,
							onToggleSelect: toggleSelect,
							onRename: handleRename,
							onSetDue: handleSetDue,
							onSetPriority: handleSetPriority,
							onSetStatus: handleSetStatus
						};
						if (!grouped) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VirtualizedList, {
							tasks: listTasks,
							...listHandlers
						});
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-4",
							children: groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => toggleGroup(g.id),
									className: "w-full flex items-center gap-2 px-1 py-1 text-left touch-manipulation",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
											size: 13,
											className: `text-muted-foreground transition-transform ${collapsedGroups.has(g.id) ? "-rotate-90" : ""}`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-xs font-bold uppercase tracking-wide ${g.tone}`,
											children: g.label
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-semibold text-muted-foreground bg-secondary rounded-full px-2 py-0.5",
											children: g.tasks.length
										}),
										bulkMode && g.tasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											onClick: (e) => {
												e.stopPropagation();
												selectGroup(g.tasks);
											},
											className: "ml-auto text-[10px] font-semibold text-primary hover:underline",
											children: "Select group"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VirtualizedList, {
									tasks: g.tasks,
									...listHandlers
								})]
							}, g.id))
						});
					})(),
					listTasks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center py-20 text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
								size: 42,
								className: "mx-auto mb-3 opacity-20"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-semibold text-foreground",
								children: "Nothing here — you're clear"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm mt-1",
								children: "Clear filters or create a new task"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setModal({
									open: true,
									task: null
								}),
								className: "btn-primary mt-4 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 13 }), " New Task"]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskModal, {
				open: modal.open,
				task: modal.task,
				defaultStatus: modal.defaultStatus,
				onClose: () => setModal({ open: false }),
				onSave: handleSave,
				onDelete: handleDelete
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { TasksPage as default };
