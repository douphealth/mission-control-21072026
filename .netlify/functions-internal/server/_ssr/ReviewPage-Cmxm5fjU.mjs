import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { Q as useUpdateItem, X as useTrashedTasks, Y as useTasks } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as daysOverdue, l as todayISO } from "./overdue-CpArWbx3.mjs";
import { Cn as CircleCheck, D as Sparkles, Fn as CalendarClock, K as RefreshCcw, L as Search, Yn as Archive, c as Undo2, ct as Moon, d as TriangleAlert, h as Trash2, y as Target } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as isArchived, c as sortByPriority, i as daysSinceTouch, n as addDaysISO, r as buildReviewQueues, t as QUADRANTS } from "./triage-Q9v9lxCb.mjs";
import { c as restoreTasks, i as purgeTasks, u as softDeleteTasks } from "./taskActions-CDh7MXDW.mjs";
import { t as DayClose } from "./DayClose-DbzsXX5_.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
import { t as TaskQuickEditor } from "./TaskQuickEditor-CeQxnFy3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ReviewPage-Cmxm5fjU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var useReviewStore = create()(persist((set) => ({
	lastWeeklyReview: null,
	lastShutdown: null,
	markWeeklyReview: (day) => set({ lastWeeklyReview: day }),
	markShutdown: (day) => set({ lastShutdown: day })
}), { name: "mc-review-v1" }));
function daysAgoLabel(iso) {
	if (!iso) return "never";
	const d = Math.round((Date.now() - (/* @__PURE__ */ new Date(`${iso}T00:00:00`)).getTime()) / 864e5);
	if (d <= 0) return "today";
	if (d === 1) return "yesterday";
	return `${d} days ago`;
}
function TaskRow({ task, today, onDone, onPush, onArchive, onDelete, onToday, onOpen }) {
	const od = daysOverdue(task, today);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		draggable: true,
		onDragStart: (e) => {
			e.dataTransfer.setData("text/mc-task", task.id);
			e.dataTransfer.effectAllowed = "move";
		},
		className: "flex cursor-grab flex-col gap-2 rounded-2xl border border-border/30 bg-secondary/30 p-3 active:cursor-grabbing sm:flex-row sm:items-center sm:gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => onOpen(task),
			className: "min-w-0 flex-1 text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "truncate text-sm font-semibold text-foreground hover:text-primary",
				children: task.title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "uppercase tracking-wide",
						children: task.priority
					}),
					task.dueDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["due ", task.dueDate] }),
					od > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-semibold text-red-500",
						children: [od, "d overdue"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"untouched ",
						daysSinceTouch(task, today),
						"d"
					] })
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => onDone(task),
					title: "Mark done",
					className: "flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-500 transition hover:bg-emerald-500/20",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 12 }), " Done"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => onToday(task),
					title: "Do today",
					className: "flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { size: 12 }), " Today"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => onPush(task, 7),
					title: "Push a week",
					className: "flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { size: 12 }), " +7d"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => onArchive(task),
					title: "Archive",
					className: "flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { size: 12 }), " Archive"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => onDelete(task),
					title: "Delete",
					className: "rounded-xl bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive transition hover:bg-destructive/20",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
				})
			]
		})]
	});
}
function ReviewPage() {
	const tasks = useTasks();
	const updateItem = useUpdateItem();
	const cd = useConfirmDialog();
	const today = todayISO();
	const { lastWeeklyReview, markWeeklyReview } = useReviewStore();
	const [showArchive, setShowArchive] = (0, import_react.useState)(false);
	const [showTrash, setShowTrash] = (0, import_react.useState)(false);
	const trashed = useTrashedTasks();
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [dragOver, setDragOver] = (0, import_react.useState)(null);
	const [matrixSearch, setMatrixSearch] = (0, import_react.useState)("");
	const q = (0, import_react.useMemo)(() => buildReviewQueues(tasks, today), [tasks, today]);
	const archived = (0, import_react.useMemo)(() => sortByPriority(tasks.filter(isArchived)), [tasks]);
	const editing = (0, import_react.useMemo)(() => tasks.find((t) => t.id === editingId) ?? null, [tasks, editingId]);
	const onOpen = (0, import_react.useCallback)((t) => setEditingId(t.id), []);
	const moveToQuadrant = (0, import_react.useCallback)(async (taskId, quad) => {
		const t = tasks.find((x) => x.id === taskId);
		if (!t) return;
		const plan = {
			do: {
				important: true,
				dueDate: today,
				priority: t.priority === "low" ? "high" : t.priority
			},
			schedule: {
				important: true,
				dueDate: addDaysISO(7, today)
			},
			delegate: {
				important: false,
				dueDate: today
			},
			later: {
				important: false,
				dueDate: addDaysISO(21, today)
			}
		};
		await updateItem("tasks", taskId, {
			...plan[quad],
			touchedAt: today
		});
		toast.success(`Moved to “${QUADRANTS.find((qd) => qd.id === quad)?.label}”`);
	}, [
		tasks,
		updateItem,
		today
	]);
	const onDone = (0, import_react.useCallback)(async (t) => {
		await updateItem("tasks", t.id, {
			status: "done",
			completedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		toast.success("Closed ✓");
	}, [updateItem]);
	const onToday = (0, import_react.useCallback)(async (t) => {
		await updateItem("tasks", t.id, {
			dueDate: today,
			status: "in-progress"
		});
		toast.success("Moved to today");
	}, [updateItem, today]);
	const onPush = (0, import_react.useCallback)(async (t, d) => {
		await updateItem("tasks", t.id, { dueDate: addDaysISO(d, today) });
		toast.success(`Rescheduled +${d}d`);
	}, [updateItem, today]);
	const onArchive = (0, import_react.useCallback)(async (t) => {
		await updateItem("tasks", t.id, {
			archived: true,
			archivedAt: today
		});
		toast.success("Archived — out of the active list");
	}, [updateItem, today]);
	const onRestore = (0, import_react.useCallback)(async (t) => {
		await updateItem("tasks", t.id, {
			archived: false,
			dueDate: today
		});
		toast.success("Restored to today");
	}, [updateItem, today]);
	const onDelete = (0, import_react.useCallback)((t) => softDeleteTasks([t.id]), []);
	const onPurge = (0, import_react.useCallback)((t) => {
		cd.confirm({
			title: "Delete forever",
			description: `"${t.title}" will be permanently removed. This cannot be undone.`,
			onConfirm: async () => {
				await purgeTasks([t.id]);
				toast.success("Permanently deleted");
			}
		});
	}, [cd]);
	const purgeAllRotten = (0, import_react.useCallback)(() => {
		if (!q.rotten.length) return;
		cd.confirm({
			title: `Archive ${q.rotten.length} rotting task(s)`,
			description: `Everything overdue by 30+ days gets archived. Nothing is deleted — you can restore any of it below.`,
			onConfirm: async () => {
				for (const t of q.rotten) await updateItem("tasks", t.id, {
					archived: true,
					archivedAt: today
				});
				toast.success(`Archived ${q.rotten.length} — graveyard cleared`);
			}
		});
	}, [
		q.rotten,
		cd,
		updateItem,
		today
	]);
	const finishWeekly = (0, import_react.useCallback)(() => {
		markWeeklyReview(today);
		toast.success("Weekly review logged. Inbox is clear.");
	}, [markWeeklyReview, today]);
	const tomorrowPlan = (0, import_react.useMemo)(() => sortByPriority(q.matrix.do.concat(q.matrix.schedule)).slice(0, 3), [q.matrix]);
	const reviewDue = !lastWeeklyReview || (Date.now() - (/* @__PURE__ */ new Date(`${lastWeeklyReview}T00:00:00`)).getTime()) / 864e5 >= 7;
	const visibleMatrix = (0, import_react.useMemo)(() => {
		const needle = matrixSearch.trim().toLowerCase();
		return Object.fromEntries(QUADRANTS.map((quad) => [quad.id, q.matrix[quad.id].filter((t) => !needle || `${t.title} ${t.description ?? ""} ${t.category ?? ""}`.toLowerCase().includes(needle))]));
	}, [q.matrix, matrixSearch]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCcw, {
						size: 20,
						className: "text-primary"
					}), " Review"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-0.5 text-xs text-muted-foreground sm:text-sm",
					children: [
						q.openCount,
						" open · ",
						q.overdue.length,
						" overdue · ",
						q.stale.length,
						" stale · last review",
						" ",
						daysAgoLabel(lastWeeklyReview)
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: finishWeekly,
					className: "flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 15 }), " Mark review done"]
				})]
			}),
			reviewDue && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					size: 16,
					className: "mt-0.5 shrink-0 text-amber-500"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold text-amber-600 dark:text-amber-400",
						children: "Weekly review is due"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 text-xs text-muted-foreground",
						children: "Work top to bottom: clear the graveyard, decide on stale items, then plan tomorrow. It takes 10 minutes and it is the only thing that stops the backlog rotting."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card-elevated space-y-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "flex items-center gap-2 text-sm font-bold text-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
								size: 15,
								className: "text-red-500"
							}),
							" Graveyard · ",
							30,
							"d+ overdue"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[11px] text-muted-foreground",
						children: [q.rotten.length, " task(s) that are not happening as written."]
					})] }), q.rotten.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: purgeAllRotten,
						className: "flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/20",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { size: 13 }),
							" Archive all ",
							q.rotten.length
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [q.rotten.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, {
						task: t,
						today,
						onDone,
						onPush,
						onArchive,
						onDelete,
						onToday,
						onOpen
					}, t.id)), !q.rotten.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-4 text-center text-xs text-muted-foreground",
						children: "Nothing rotting. ✅"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card-elevated space-y-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "flex items-center gap-2 text-sm font-bold text-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, {
							size: 15,
							className: "text-amber-500"
						}),
						" Decide · untouched ",
						14,
						"d+"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[11px] text-muted-foreground",
					children: [q.stale.length, " task(s) waiting on a decision, not on time."]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [q.stale.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, {
						task: t,
						today,
						onDone,
						onPush,
						onArchive,
						onDelete,
						onToday,
						onOpen
					}, t.id)), !q.stale.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-4 text-center text-xs text-muted-foreground",
						children: "Everything active has been touched recently."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "flex items-center gap-2 text-sm font-bold text-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, {
							size: 15,
							className: "text-primary"
						}), " Priority matrix"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-muted-foreground",
						children: "Drag on desktop, use Move on touch devices, or tap any task to fully edit it. Every change is live everywhere."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "relative block sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 13,
							className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: matrixSearch,
							onChange: (e) => setMatrixSearch(e.target.value),
							placeholder: "Find a task in Review…",
							className: "w-full rounded-xl border border-border/40 bg-secondary/40 py-2 pl-8 pr-3 text-xs text-foreground outline-none focus:border-primary/50"
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 gap-3 md:grid-cols-2",
					children: QUADRANTS.map((quad) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onDragOver: (e) => {
							e.preventDefault();
							e.dataTransfer.dropEffect = "move";
							setDragOver(quad.id);
						},
						onDragLeave: () => setDragOver((d) => d === quad.id ? null : d),
						onDrop: (e) => {
							e.preventDefault();
							setDragOver(null);
							const id = e.dataTransfer.getData("text/mc-task");
							if (id) moveToQuadrant(id, quad.id);
						},
						className: `rounded-2xl border p-3 transition ${quad.accent} ${dragOver === quad.id ? "ring-2 ring-primary/60 scale-[1.01]" : ""}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-bold uppercase tracking-wide",
								children: quad.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] opacity-70",
								children: quad.hint
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 space-y-1.5",
							children: [visibleMatrix[quad.id].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								draggable: true,
								onDragStart: (e) => {
									e.dataTransfer.setData("text/mc-task", t.id);
									e.dataTransfer.effectAllowed = "move";
								},
								className: "flex min-h-11 cursor-grab items-center gap-2 rounded-xl border border-transparent bg-background/60 px-2.5 py-2 transition hover:border-primary/20 hover:shadow-sm active:cursor-grabbing",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => onOpen(t),
										className: "min-w-0 flex-1 truncate text-left text-[12px] font-medium text-foreground hover:text-primary",
										children: t.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										"aria-label": "Move task",
										value: quad.id,
										onChange: (e) => void moveToQuadrant(t.id, e.target.value),
										className: "max-w-[104px] rounded-lg bg-secondary/70 px-1 py-1 text-[10px] font-semibold text-muted-foreground outline-none",
										children: QUADRANTS.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: o.id,
											children: o.label
										}, o.id))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => onDone(t),
										className: "text-emerald-500 transition hover:scale-110",
										title: "Done",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 13 })
									})
								]
							}, t.id)), !visibleMatrix[quad.id].length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "py-4 text-center text-[11px] opacity-60",
								children: "Drop a task here"
							})]
						})]
					}, quad.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DayClose, { tasks }),
			tomorrowPlan.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card-elevated space-y-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "flex items-center gap-2 text-sm font-bold text-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, {
						size: 15,
						className: "text-indigo-400"
					}), " Likely top three tomorrow"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: tomorrowPlan.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-2xl border border-border/30 bg-secondary/30 p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[11px] font-bold text-primary",
							children: i + 1
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate text-sm font-medium text-foreground",
							children: t.title
						})]
					}, t.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card-elevated space-y-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowArchive((s) => !s),
					className: "flex w-full items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 text-sm font-bold text-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, {
								size: 15,
								className: "text-muted-foreground"
							}),
							" Archive (",
							q.archivedCount,
							")"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] text-muted-foreground",
						children: showArchive ? "Hide" : "Show"
					})]
				}), showArchive && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [archived.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-2xl border border-border/20 bg-secondary/20 p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 flex-1 truncate text-sm text-muted-foreground",
								children: t.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => onRestore(t),
								className: "flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-secondary/70",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { size: 12 }), " Restore"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onDelete(t),
								title: "Move to Trash",
								className: "rounded-xl bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
							})
						]
					}, t.id)), !archived.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-4 text-center text-xs text-muted-foreground",
						children: "Archive is empty."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card-elevated space-y-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowTrash((s) => !s),
					className: "flex w-full items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 text-sm font-bold text-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
								size: 15,
								className: "text-muted-foreground"
							}),
							" Trash (",
							trashed.length,
							")"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] text-muted-foreground",
						children: showTrash ? "Hide" : `Show · kept 30 days`
					})]
				}), showTrash && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [trashed.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-2xl border border-border/20 bg-secondary/20 p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1 truncate text-sm text-muted-foreground",
								children: [t.title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-2 text-[10px]",
									children: ["deleted ", daysAgoLabel(t.deletedAt.slice(0, 10))]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => restoreTasks([t.id]),
								className: "flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-secondary/70",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { size: 12 }), " Restore"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onPurge(t),
								title: "Delete forever",
								className: "rounded-xl bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive",
								children: "Forever"
							})
						]
					}, t.id)), !trashed.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-4 text-center text-xs text-muted-foreground",
						children: "Trash is empty."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskQuickEditor, {
				task: editing,
				onClose: () => setEditingId(null)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { ReviewPage as default };
