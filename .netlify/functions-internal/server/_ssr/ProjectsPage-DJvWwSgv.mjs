import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Bt as GripVertical, Dn as ChevronDown, L as Search, X as Plus, h as Trash2, nt as Pen } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as useIsMobile } from "./routes-qm6I9RAb.mjs";
import { a as FormTagsInput, i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./alert-dialog-191NluCC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ProjectsPage-DJvWwSgv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var columns = [
	{
		id: "ideas",
		label: "💡 Ideas",
		color: "from-purple-500/20 to-purple-500/5",
		accent: "bg-purple-500"
	},
	{
		id: "backlog",
		label: "📋 Backlog",
		color: "from-muted/40 to-muted/10",
		accent: "bg-muted-foreground"
	},
	{
		id: "in-progress",
		label: "🔨 In Progress",
		color: "from-primary/20 to-primary/5",
		accent: "bg-primary"
	},
	{
		id: "review",
		label: "👀 Review",
		color: "from-warning/20 to-warning/5",
		accent: "bg-warning"
	},
	{
		id: "completed",
		label: "✅ Completed",
		color: "from-success/20 to-success/5",
		accent: "bg-success"
	}
];
var priorityConfig = {
	P0: {
		class: "badge-destructive",
		label: "Critical",
		dot: "bg-destructive"
	},
	P1: {
		class: "badge-warning",
		label: "High",
		dot: "bg-warning"
	},
	P2: {
		class: "badge-info",
		label: "Medium",
		dot: "bg-info"
	},
	P3: {
		class: "badge-success",
		label: "Low",
		dot: "bg-success"
	}
};
var emptyCard = {
	title: "",
	priority: "P2",
	column: "ideas",
	progress: 0,
	deadline: "",
	tags: [],
	description: ""
};
function ProjectsPage() {
	const isMobile = useIsMobile();
	const [cards, setCards] = (0, import_react.useState)(() => {
		try {
			const saved = localStorage.getItem("mc-kanban");
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	});
	const [dragId, setDragId] = (0, import_react.useState)(null);
	const [dragOverCol, setDragOverCol] = (0, import_react.useState)(null);
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyCard);
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterPriority, setFilterPriority] = (0, import_react.useState)("all");
	const [expandedCol, setExpandedCol] = (0, import_react.useState)("in-progress");
	const [pendingDeleteId, setPendingDeleteId] = (0, import_react.useState)(null);
	const save = (0, import_react.useCallback)((c) => {
		setCards(c);
		localStorage.setItem("mc-kanban", JSON.stringify(c));
	}, []);
	const filteredCards = cards.filter((c) => (filterPriority === "all" || c.priority === filterPriority) && (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())));
	const onDragOver = (e, colId) => {
		e.preventDefault();
		setDragOverCol(colId);
	};
	const onDragLeave = () => setDragOverCol(null);
	const onDrop = (col) => {
		if (!dragId) return;
		const progress = col === "completed" ? 100 : void 0;
		save(cards.map((c) => c.id === dragId ? {
			...c,
			column: col,
			...progress !== void 0 ? { progress } : {}
		} : c));
		setDragId(null);
		setDragOverCol(null);
	};
	const openAdd = (column) => {
		setEditId(null);
		setForm({
			...emptyCard,
			column
		});
		setModalOpen(true);
	};
	const openEdit = (card) => {
		setEditId(card.id);
		const { id, ...rest } = card;
		setForm(rest);
		setModalOpen(true);
	};
	const saveForm = () => {
		if (!form.title.trim()) return;
		if (editId) save(cards.map((c) => c.id === editId ? {
			...c,
			...form
		} : c));
		else save([{
			id: Math.random().toString(36).slice(2, 10),
			...form
		}, ...cards]);
		setModalOpen(false);
	};
	const deleteCard = (id) => setPendingDeleteId(id);
	const confirmDelete = (0, import_react.useCallback)(() => {
		if (!pendingDeleteId) return;
		save(cards.filter((c) => c.id !== pendingDeleteId));
		toast.success("Card deleted");
		setPendingDeleteId(null);
	}, [
		pendingDeleteId,
		cards,
		save
	]);
	const moveCard = (id, newCol) => {
		const progress = newCol === "completed" ? 100 : void 0;
		save(cards.map((c) => c.id === id ? {
			...c,
			column: newCol,
			...progress !== void 0 ? { progress } : {}
		} : c));
		toast.success("Card moved");
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const isOverdue = (d) => d && d < (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
	const totalByPriority = (p) => cards.filter((c) => c.priority === p).length;
	const renderCard = (card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		draggable: !isMobile,
		className: `card-elevated p-3.5 space-y-2.5 group/card ${!isMobile ? "cursor-grab active:cursor-grabbing" : ""} ${dragId === card.id ? "opacity-40 scale-95" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2 flex-1 min-w-0",
					children: [!isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, {
						size: 14,
						className: "text-muted-foreground/30 mt-0.5 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-medium text-card-foreground leading-snug",
						children: card.title
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${priorityConfig[card.priority].dot}` })]
			}),
			card.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: `text-xs text-muted-foreground line-clamp-2 ${!isMobile ? "pl-6" : ""}`,
				children: card.description
			}),
			card.progress > 0 && card.progress < 100 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: !isMobile ? "pl-6" : "",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between text-[10px] text-muted-foreground mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Progress" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [card.progress, "%"] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1.5 rounded-full bg-muted overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all",
						style: { width: `${card.progress}%` }
					})
				})]
			}),
			card.progress === 100 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: !isMobile ? "pl-6" : "",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] text-success font-medium",
					children: "✅ Complete"
				})
			}),
			card.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `flex flex-wrap gap-1 ${!isMobile ? "pl-6" : ""}`,
				children: card.tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground",
					children: t
				}, t))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `flex items-center justify-between ${!isMobile ? "pl-6" : ""}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `${priorityConfig[card.priority].class} text-[9px]`,
						children: card.priority
					}), card.deadline && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: `text-[10px] ${isOverdue(card.deadline) && card.column !== "completed" ? "text-destructive font-medium" : "text-muted-foreground"}`,
						children: [isOverdue(card.deadline) && card.column !== "completed" ? "⚠️ " : "📅 ", card.deadline]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-0.5 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => openEdit(card),
						className: "text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 12 })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => deleteCard(card.id),
						className: "text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
					})]
				})]
			}),
			isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1 pt-1 border-t border-border/20 overflow-x-auto hide-scrollbar",
				children: columns.filter((c) => c.id !== card.column).map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => moveCard(card.id, col.id),
					className: "text-[9px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:text-foreground whitespace-nowrap flex-shrink-0 transition-colors",
					children: ["→ ", col.label]
				}, col.id))
			})
		]
	}, card.id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground",
					children: "Projects Tracker"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
					children: [
						cards.length,
						" projects · ",
						cards.filter((c) => c.column === "in-progress").length,
						" in progress · ",
						cards.filter((c) => c.column === "completed").length,
						" completed"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => openAdd("ideas"),
					className: "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " New Project"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 sm:max-w-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
						size: 14,
						className: "text-muted-foreground"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: search,
						onChange: (e) => setSearch(e.target.value),
						placeholder: "Search projects...",
						className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto hide-scrollbar",
					children: [
						"all",
						"P0",
						"P1",
						"P2",
						"P3"
					].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setFilterPriority(p),
						className: `px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterPriority === p ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
						children: p === "all" ? `All (${cards.length})` : `${p} (${totalByPriority(p)})`
					}, p))
				})]
			}),
			!isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-3 overflow-x-auto pb-4 -mx-2 px-2",
				style: { minHeight: 520 },
				children: columns.map((col) => {
					const colCards = filteredCards.filter((c) => c.column === col.id);
					const isDragOver = dragOverCol === col.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `flex-shrink-0 w-72 rounded-2xl p-3 flex flex-col transition-all duration-200 ${isDragOver ? "bg-primary/5 ring-2 ring-primary/20 scale-[1.01]" : "bg-secondary/30"}`,
						onDragOver: (e) => onDragOver(e, col.id),
						onDragLeave,
						onDrop: () => onDrop(col.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-3 px-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-2 h-2 rounded-full ${col.accent}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-card-foreground",
									children: col.label
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center font-medium",
									children: colCards.length
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => openAdd(col.id),
									className: "text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-md hover:bg-primary/10",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 })
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2 flex-1",
							children: [colCards.map(renderCard), colCards.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-center py-8 text-muted-foreground/40 border-2 border-dashed border-muted/30 rounded-xl",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs",
									children: "Drop cards here"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => openAdd(col.id),
									className: "text-[10px] text-primary hover:underline mt-1",
									children: "+ Add card"
								})]
							})]
						})]
					}, col.id);
				})
			}),
			isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: columns.map((col) => {
					const colCards = filteredCards.filter((c) => c.column === col.id);
					const isExpanded = expandedCol === col.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl bg-secondary/30 overflow-hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setExpandedCol(isExpanded ? null : col.id),
							className: "w-full flex items-center justify-between p-3.5 touch-manipulation",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-2.5 h-2.5 rounded-full ${col.accent}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-semibold text-card-foreground",
										children: col.label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center font-medium",
										children: colCards.length
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: (e) => {
										e.stopPropagation();
										openAdd(col.id);
									},
									className: "text-muted-foreground hover:text-primary p-1",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
									size: 16,
									className: `text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`
								})]
							})]
						}), isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-3 pb-3 space-y-2",
							children: [colCards.map(renderCard), colCards.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-center py-6 text-muted-foreground/40",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs",
									children: "No cards"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => openAdd(col.id),
									className: "text-[11px] text-primary hover:underline mt-1",
									children: "+ Add card"
								})]
							})]
						})]
					}, col.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Project" : "New Project Card",
				onSubmit: saveForm,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Title *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.title,
							onChange: (v) => uf("title", v),
							placeholder: "Project name"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Description",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.description,
							onChange: (v) => uf("description", v),
							placeholder: "Brief description",
							rows: 2
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 sm:gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Priority",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
									value: form.priority,
									onChange: (v) => uf("priority", v),
									options: [
										{
											value: "P0",
											label: "🔴 P0 - Critical"
										},
										{
											value: "P1",
											label: "🟠 P1 - High"
										},
										{
											value: "P2",
											label: "🟡 P2 - Medium"
										},
										{
											value: "P3",
											label: "🟢 P3 - Low"
										}
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Column",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
									value: form.column,
									onChange: (v) => uf("column", v),
									options: columns.map((c) => ({
										value: c.id,
										label: c.label
									}))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Progress %",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: String(form.progress),
									onChange: (v) => uf("progress", Math.min(100, parseInt(v) || 0)),
									type: "number"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Deadline",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.deadline,
									onChange: (v) => uf("deadline", v),
									type: "date"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Tags",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTagsInput, {
							value: form.tags,
							onChange: (v) => uf("tags", v),
							placeholder: "Add tag and press Enter"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: pendingDeleteId !== null,
				onOpenChange: (open) => {
					if (!open) setPendingDeleteId(null);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete card" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This action cannot be undone." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: confirmDelete,
					children: "Delete"
				})] })] })
			})
		]
	});
}
//#endregion
export { ProjectsPage as default };
