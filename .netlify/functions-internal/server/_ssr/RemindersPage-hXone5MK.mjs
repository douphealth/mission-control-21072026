import { i as __toESM } from "../_runtime.mjs";
import { n as genId, t as db } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as markCloudRecordDirty, u as queueCloudPush, z as useReminders } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { On as Check, Rn as Bell, X as Plus, _n as Clock, h as Trash2 } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as EmptyState, r as Panel, s as relTime, t as CCHeader } from "./ui-BiQ_kQgK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/RemindersPage-hXone5MK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RECURRENCES = [
	"none",
	"daily",
	"weekly",
	"monthly"
];
function nextOccurrence(iso, recurrence) {
	const d = new Date(iso);
	if (recurrence === "daily") d.setDate(d.getDate() + 1);
	else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
	else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
	return d.toISOString();
}
function toLocalInput(iso) {
	const d = new Date(iso);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function RemindersPage() {
	const reminders = useReminders();
	const [title, setTitle] = (0, import_react.useState)("");
	const [when, setWhen] = (0, import_react.useState)(() => toLocalInput(new Date(Date.now() + 36e5).toISOString()));
	const [recurrence, setRecurrence] = (0, import_react.useState)("none");
	const { due, upcoming, done } = (0, import_react.useMemo)(() => {
		const now = Date.now();
		const pending = reminders.filter((r) => r.status !== "done").sort((a, b) => a.remindAt.localeCompare(b.remindAt));
		return {
			due: pending.filter((r) => new Date(r.remindAt).getTime() <= now),
			upcoming: pending.filter((r) => new Date(r.remindAt).getTime() > now),
			done: reminders.filter((r) => r.status === "done").sort((a, b) => b.remindAt.localeCompare(a.remindAt)).slice(0, 20)
		};
	}, [reminders]);
	const add = async () => {
		const clean = title.trim();
		if (!clean || !when) return;
		const record = {
			id: genId(),
			title: clean,
			remindAt: new Date(when).toISOString(),
			recurrence,
			status: "pending",
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await db.reminders.put(record);
		markCloudRecordDirty("reminders", record.id);
		queueCloudPush();
		setTitle("");
		toast.success("Reminder set");
	};
	const complete = async (r) => {
		if (r.recurrence && r.recurrence !== "none") {
			await db.reminders.update(r.id, {
				remindAt: nextOccurrence(r.remindAt, r.recurrence),
				status: "pending"
			});
			toast.success("Rescheduled", { description: "Recurring reminder moved to its next slot." });
		} else await db.reminders.update(r.id, { status: "done" });
		markCloudRecordDirty("reminders", r.id);
		queueCloudPush();
	};
	const remove = async (id) => {
		await db.reminders.delete(id);
		markCloudRecordDirty("reminders", id, "delete");
		queueCloudPush();
	};
	const Row = ({ r, overdue }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex items-center gap-3 rounded-xl border p-3 ${overdue ? "border-rose-500/40 bg-rose-500/5" : "border-border/50 bg-background/40"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => complete(r),
				className: "shrink-0 w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-emerald-500/15 hover:border-emerald-500/40 text-muted-foreground hover:text-emerald-500",
				"aria-label": "Complete reminder",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 14 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `text-sm font-semibold ${r.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`,
					children: r.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 11 }),
						" ",
						new Date(r.remindAt).toLocaleString(),
						" · ",
						relTime(r.remindAt),
						r.recurrence && r.recurrence !== "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-primary",
							children: ["· ", r.recurrence]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => remove(r.id),
				className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10",
				"aria-label": "Delete reminder",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CCHeader, {
				title: "Reminders",
				subtitle: "Time-based nudges that live alongside your tasks — one-off or recurring."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-[1.6fr_auto_auto_auto]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: title,
						onChange: (e) => setTitle(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && add(),
						placeholder: "Remind me to…",
						className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "datetime-local",
						value: when,
						onChange: (e) => setWhen(e.target.value),
						className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: recurrence,
						onChange: (e) => setRecurrence(e.target.value),
						className: "px-3 py-2 rounded-xl bg-background border border-border text-sm capitalize",
						children: RECURRENCES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: r,
							children: r
						}, r))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: add,
						className: "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Add"]
					})
				]
			}) }),
			due.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[11px] uppercase tracking-wide font-semibold text-rose-500 flex items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { size: 12 }),
						" Due now (",
						due.length,
						")"
					]
				}), due.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					r,
					overdue: true
				}, r.id))]
			}),
			upcoming.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[11px] uppercase tracking-wide font-semibold text-muted-foreground",
					children: [
						"Upcoming (",
						upcoming.length,
						")"
					]
				}), upcoming.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { r }, r.id))]
			}),
			due.length === 0 && upcoming.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "Nothing scheduled",
				hint: "Add a reminder above — it syncs to the cloud with the rest of your data."
			}),
			done.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-wide font-semibold text-muted-foreground",
					children: "Completed"
				}), done.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { r }, r.id))]
			})
		]
	});
}
//#endregion
export { RemindersPage as default };
