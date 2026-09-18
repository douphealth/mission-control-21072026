import { i as __toESM } from "../_runtime.mjs";
import { n as genId } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { Q as useUpdateItem } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { l as todayISO } from "./overdue-CpArWbx3.mjs";
import { a as fmtMinutes, c as minToHHMM, o as hhmmToMin, t as blockMinutes } from "./planning-CdLbbCHg.mjs";
import { Bt as GripVertical, Cn as CircleCheck, Fn as CalendarClock, R as Scissors, X as Plus, Yn as Archive, c as Undo2, h as Trash2, n as X } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { E as usePlanStore } from "./routes-qm6I9RAb.mjs";
import { n as addDaysISO } from "./triage-Q9v9lxCb.mjs";
import { d as splitBlockToTomorrow, n as completeBlock, o as removeBlock, r as moveBlock, t as addBlock, u as softDeleteTasks } from "./taskActions-CDh7MXDW.mjs";
import { t as Button } from "./button-PG0S_gA6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/TaskQuickEditor-CeQxnFy3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var inputCls = "rounded-lg border border-border/50 bg-secondary/40 px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-primary/60";
function WorkBlocksEditor({ task }) {
	const today = todayISO();
	const bump = usePlanStore((s) => s.bump);
	const blocks = [...task.blocks ?? []].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
	const planned = blocks.filter((b) => !b.done).reduce((s, b) => s + blockMinutes(b), 0);
	const est = task.estimateMin ?? 30;
	const add = () => {
		const last = blocks[blocks.length - 1];
		const start = last ? last.end : "09:00";
		const remaining = Math.max(15, est - planned);
		addBlock(task, {
			date: last?.date ?? today,
			start,
			end: minToHHMM(hhmmToMin(start) + Math.min(remaining, 120))
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-1.5 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-[11px] font-semibold text-muted-foreground",
				children: [
					"Work blocks",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-normal",
						children: [
							"· ",
							fmtMinutes(planned),
							" planned of ",
							fmtMinutes(est)
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: add,
				className: "flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10.5px] font-bold text-primary hover:bg-primary/15",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 11 }), " Block"]
			})]
		}),
		blocks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "rounded-xl border border-dashed border-border/60 px-3 py-2 text-[11px] text-muted-foreground",
			children: "No time reserved yet. Blocks are when you'll work; the deadline is separate."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-1",
			children: blocks.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `flex flex-wrap items-center gap-1.5 rounded-xl border border-border/40 bg-background/50 px-2 py-1.5 ${b.done ? "opacity-60" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "date",
						value: b.date,
						disabled: b.done,
						onChange: (e) => {
							bump("blockMoves");
							moveBlock(task, b.id, { date: e.target.value });
						},
						className: inputCls,
						"aria-label": "Block date"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "time",
						value: b.start,
						disabled: b.done,
						onChange: (e) => {
							const len = blockMinutes(b);
							bump("blockMoves");
							moveBlock(task, b.id, {
								start: e.target.value,
								end: minToHHMM(hhmmToMin(e.target.value) + len)
							});
						},
						className: inputCls,
						"aria-label": "Block start"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] text-muted-foreground",
						children: "–"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "time",
						value: b.end,
						disabled: b.done,
						onChange: (e) => void moveBlock(task, b.id, { end: e.target.value }),
						className: inputCls,
						"aria-label": "Block end"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-auto text-[10px] tabular-nums text-muted-foreground",
						children: fmtMinutes(blockMinutes(b))
					}),
					!b.done && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void completeBlock(task, b.id),
						title: "Block done (task stays open)",
						"aria-label": "Mark block done",
						className: "rounded-md p-1 text-muted-foreground hover:text-emerald-500",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 13 })
					}), blockMinutes(b) >= 30 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void splitBlockToTomorrow(task, b.id, today),
						title: "Split: half now, half tomorrow",
						"aria-label": "Split block",
						className: "rounded-md p-1 text-muted-foreground hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, { size: 13 })
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void removeBlock(task, b.id),
						title: "Remove block",
						"aria-label": "Remove block",
						className: "rounded-md p-1 text-muted-foreground hover:text-destructive",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 })
					})
				]
			}, b.id))
		})
	] });
}
var PRIORITIES = [
	"critical",
	"high",
	"medium",
	"low"
];
var STATUSES = [
	"todo",
	"in-progress",
	"blocked",
	"done"
];
var PRI_TONE = {
	critical: "bg-red-500/15 text-red-500 border-red-500/30",
	high: "bg-amber-500/15 text-amber-500 border-amber-500/30",
	medium: "bg-sky-500/15 text-sky-500 border-sky-500/30",
	low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
};
function TaskQuickEditor({ task, onClose }) {
	const updateItem = useUpdateItem();
	const today = todayISO();
	const [title, setTitle] = (0, import_react.useState)(task?.title ?? "");
	const [description, setDescription] = (0, import_react.useState)(task?.description ?? "");
	const [newSubtask, setNewSubtask] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setTitle(task?.title ?? "");
		setDescription(task?.description ?? "");
	}, [
		task?.id,
		task?.title,
		task?.description
	]);
	(0, import_react.useEffect)(() => {
		if (!task) return;
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [task, onClose]);
	if (!task) return null;
	const patch = async (changes) => {
		await updateItem("tasks", task.id, {
			...changes,
			touchedAt: today
		});
	};
	const archived = task.archived === true;
	const addSubtask = async () => {
		const nextTitle = newSubtask.trim();
		if (!nextTitle) return;
		await patch({ subtasks: [...task.subtasks ?? [], {
			id: genId(),
			title: nextTitle,
			done: false
		}] });
		setNewSubtask("");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[70] flex items-end justify-center sm:items-center",
		role: "dialog",
		"aria-modal": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			"aria-label": "Close editor",
			onClick: onClose,
			className: "absolute inset-0 bg-black/50 backdrop-blur-sm"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative z-10 flex max-h-[94vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-border/50 bg-card p-4 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
							children: "Edit task"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-[11px] text-muted-foreground",
							children: "Changes save instantly everywhere."
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						"aria-label": "Close task editor",
						title: "Close",
						variant: "secondary",
						size: "icon",
						onClick: onClose,
						className: "h-9 w-9 rounded-xl text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 15 })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: title,
					onChange: (e) => setTitle(e.target.value),
					onBlur: () => {
						if (title.trim() && title !== task.title) patch({ title: title.trim() });
					},
					onKeyDown: (e) => {
						if (e.key === "Enter") e.target.blur();
					},
					className: "w-full rounded-2xl border border-border/50 bg-secondary/40 px-3 py-3 text-base font-semibold text-foreground outline-none focus:border-primary/60",
					placeholder: "Task title"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: description,
					onChange: (e) => setDescription(e.target.value),
					onBlur: () => {
						if (description !== (task.description ?? "")) patch({ description });
					},
					rows: 3,
					className: "mt-2 w-full resize-y rounded-2xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60",
					placeholder: "Notes, context, next physical action…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-[11px] font-semibold text-muted-foreground",
						children: ["Category", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							defaultValue: task.category ?? "",
							onBlur: (e) => {
								if (e.target.value !== task.category) patch({ category: e.target.value });
							},
							className: "mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary/60",
							placeholder: "Work, personal, admin…"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-[11px] font-semibold text-muted-foreground",
						children: ["Project", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							defaultValue: task.linkedProject ?? "",
							onBlur: (e) => {
								if (e.target.value !== task.linkedProject) patch({ linkedProject: e.target.value });
							},
							className: "mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary/60",
							placeholder: "Linked project"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1.5 text-[11px] font-semibold text-muted-foreground",
						children: "Priority"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5",
						children: PRIORITIES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => void patch({ priority: p }),
							className: `rounded-xl border px-3 py-2 text-[12px] font-semibold capitalize transition ${task.priority === p ? PRI_TONE[p] : "border-border/40 bg-secondary/50 text-muted-foreground hover:text-foreground"}`,
							children: p
						}, p))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1.5 text-[11px] font-semibold text-muted-foreground",
						children: "Status"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5",
						children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => void patch({
								status: s,
								completedAt: s === "done" ? (/* @__PURE__ */ new Date()).toISOString() : void 0
							}),
							className: `rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${task.status === s ? "border-primary/40 bg-primary/15 text-primary" : "border-border/40 bg-secondary/50 text-muted-foreground hover:text-foreground"}`,
							children: s.replace("-", " ")
						}, s))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-1.5 text-[11px] font-semibold text-muted-foreground",
							children: "Deadline & effort"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-[10px] text-muted-foreground",
									children: ["Due (deadline)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "date",
										value: task.dueDate || "",
										onChange: (e) => void patch({ dueDate: e.target.value }),
										className: "mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-[10px] text-muted-foreground",
									children: ["Estimate", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: task.estimateMin ?? "",
										onChange: (e) => void patch({ estimateMin: e.target.value ? Number(e.target.value) : void 0 }),
										className: "mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "— (30 min)"
										}), [
											15,
											30,
											45,
											60,
											90,
											120,
											180,
											240,
											480
										].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: m,
											children: m < 60 ? `${m} min` : `${m / 60}h`
										}, m))]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-[10px] text-muted-foreground",
									children: [
										"Area ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "opacity-70",
											children: "(view filter)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: task.area ?? "work",
											onChange: (e) => void patch({ area: e.target.value }),
											className: "mt-1 w-full rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "work",
												children: "Work"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "personal",
												children: "Personal"
											})]
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkBlocksEditor, { task })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-wrap gap-1.5",
							children: [
								["Today", 0],
								["Tomorrow", 1],
								["+3d", 3],
								["+1w", 7],
								["+1m", 30]
							].map(([lbl, d]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => void patch({ dueDate: addDaysISO(d, today) }),
								className: "rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, {
									size: 11,
									className: "mr-1 inline"
								}), lbl]
							}, lbl))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subtasks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								task.subtasks?.filter((st) => st.done).length ?? 0,
								"/",
								task.subtasks?.length ?? 0
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-1",
							children: (task.subtasks ?? []).map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex w-full items-center gap-2 rounded-xl bg-secondary/40 px-2.5 py-2 text-[12px]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, {
										size: 12,
										className: "shrink-0 text-muted-foreground/50"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										"aria-label": st.done ? "Reopen subtask" : "Complete subtask",
										onClick: () => void patch({ subtasks: task.subtasks.map((x) => x.id === st.id ? {
											...x,
											done: !x.done
										} : x) }),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
											size: 14,
											className: st.done ? "text-emerald-500" : "text-muted-foreground"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										defaultValue: st.title,
										onBlur: (e) => void patch({ subtasks: task.subtasks.map((x) => x.id === st.id ? {
											...x,
											title: e.target.value.trim() || x.title
										} : x) }),
										className: `min-w-0 flex-1 bg-transparent outline-none ${st.done ? "text-muted-foreground line-through" : "text-foreground"}`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										"aria-label": "Delete subtask",
										onClick: () => void patch({ subtasks: task.subtasks.filter((x) => x.id !== st.id) }),
										className: "text-muted-foreground hover:text-destructive",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 13 })
									})
								]
							}, st.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1.5 flex gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: newSubtask,
								onChange: (e) => setNewSubtask(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") addSubtask();
								},
								className: "min-w-0 flex-1 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60",
								placeholder: "Add a next step…"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								"aria-label": "Add subtask",
								title: "Add subtask",
								variant: "secondary",
								size: "icon",
								onClick: () => void addSubtask(),
								className: "h-9 w-9 rounded-xl",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 })
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: async () => {
								await patch({
									status: "done",
									completedAt: (/* @__PURE__ */ new Date()).toISOString()
								});
								toast.success("Closed ✓");
								onClose();
							},
							className: "flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-500 transition hover:bg-emerald-500/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 13 }), " Done"]
						}),
						archived ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: async () => {
								await patch({
									archived: false,
									dueDate: today
								});
								toast.success("Restored");
							},
							className: "flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-[12px] font-semibold text-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { size: 13 }), " Restore"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: async () => {
								await patch({
									archived: true,
									archivedAt: today
								});
								toast.success("Archived");
								onClose();
							},
							className: "flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-[12px] font-semibold text-muted-foreground transition hover:text-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { size: 13 }), " Archive"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: async () => {
								await softDeleteTasks([task.id]);
								onClose();
							},
							title: "Moves to Trash — recoverable for 30 days",
							className: "ml-auto flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive transition hover:bg-destructive/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 }), " Delete"]
						})
					]
				})
			]
		})]
	});
}
//#endregion
export { TaskQuickEditor as t };
