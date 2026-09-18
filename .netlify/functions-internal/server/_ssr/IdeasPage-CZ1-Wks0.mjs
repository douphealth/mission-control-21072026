import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, P as useIdeas, Z as useUpdateData } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { D as Sparkles, Et as Lightbulb, L as Search, Sn as CircleParking, T as SquareCheckBig, U as Rocket, Yt as FlaskConical, _ as ThumbsUp, h as Trash2, nt as Pen, un as Copy } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as FormTagsInput, i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useBulkActions, t as BulkActionBar } from "./BulkActionBar-CAKTOtt7.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/IdeasPage-CZ1-Wks0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var statusConfig = {
	spark: {
		label: "Spark",
		icon: Sparkles,
		class: "badge-warning",
		bg: "from-warning/20 to-warning/5"
	},
	exploring: {
		label: "Exploring",
		icon: FlaskConical,
		class: "badge-info",
		bg: "from-info/20 to-info/5"
	},
	validated: {
		label: "Validated",
		icon: ThumbsUp,
		class: "badge-success",
		bg: "from-success/20 to-success/5"
	},
	building: {
		label: "Building",
		icon: Rocket,
		class: "badge-primary",
		bg: "from-primary/20 to-primary/5"
	},
	parked: {
		label: "Parked",
		icon: CircleParking,
		class: "badge-muted",
		bg: "from-muted/40 to-muted/10"
	}
};
var priorityDot = {
	high: "bg-destructive",
	medium: "bg-warning",
	low: "bg-success"
};
var emptyIdea = {
	title: "",
	description: "",
	category: "General",
	priority: "medium",
	status: "spark",
	tags: [],
	linkedProject: "",
	votes: 0,
	createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
	updatedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
};
function IdeasPage() {
	const ideas = useIdeas();
	const updateData = useUpdateData();
	const duplicateItem = useDuplicateItem();
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterStatus, setFilterStatus] = (0, import_react.useState)("all");
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyIdea);
	const bulk = useBulkActions();
	const cd = useConfirmDialog();
	const filtered = ideas.filter((i) => filterStatus === "all" || i.status === filterStatus).filter((i) => i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.votes - a.votes);
	const openAdd = () => {
		setEditId(null);
		setForm(emptyIdea);
		setModalOpen(true);
	};
	const openEdit = (idea) => {
		setEditId(idea.id);
		const { id, ...rest } = idea;
		setForm(rest);
		setModalOpen(true);
	};
	const saveForm = () => {
		if (!form.title.trim()) return;
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		if (editId) {
			updateData({ ideas: ideas.map((i) => i.id === editId ? {
				...i,
				...form,
				updatedAt: now
			} : i) });
			toast.success("Idea updated");
		} else {
			updateData({ ideas: [{
				id: Math.random().toString(36).slice(2, 10),
				...form,
				createdAt: now,
				updatedAt: now
			}, ...ideas] });
			toast.success("Idea added");
		}
		setModalOpen(false);
	};
	const deleteIdea = (id) => {
		cd.confirm({
			title: "Delete Idea",
			description: "This idea will be permanently removed.",
			onConfirm: () => {
				updateData({ ideas: ideas.filter((i) => i.id !== id) });
				toast.success("Idea deleted");
			}
		});
	};
	const duplicateIdea = async (id) => {
		if (await duplicateItem("ideas", id, { votes: 0 })) toast.success("Idea duplicated");
	};
	const upvote = (id) => {
		updateData({ ideas: ideas.map((i) => i.id === id ? {
			...i,
			votes: i.votes + 1
		} : i) });
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (bulk.selectedCount === 0) return;
		cd.confirm({
			title: `Delete ${bulk.selectedCount} Idea(s)`,
			description: `This will permanently remove ${bulk.selectedCount} ideas.`,
			onConfirm: () => {
				updateData({ ideas: ideas.filter((i) => !bulk.selectedIds.has(i.id)) });
				toast.success(`${bulk.selectedCount} ideas deleted`);
				bulk.clearSelection();
			}
		});
	}, [
		bulk,
		ideas,
		updateData,
		cd
	]);
	const bulkUpdateStatus = (0, import_react.useCallback)((status) => {
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		updateData({ ideas: ideas.map((i) => bulk.selectedIds.has(i.id) ? {
			...i,
			status,
			updatedAt: now
		} : i) });
		toast.success(`${bulk.selectedCount} ideas updated`);
		bulk.clearSelection();
	}, [
		bulk,
		ideas,
		updateData
	]);
	const bulkUpdatePriority = (0, import_react.useCallback)((priority) => {
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		updateData({ ideas: ideas.map((i) => bulk.selectedIds.has(i.id) ? {
			...i,
			priority,
			updatedAt: now
		} : i) });
		toast.success(`${bulk.selectedCount} ideas updated`);
		bulk.clearSelection();
	}, [
		bulk,
		ideas,
		updateData
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground",
					children: "Ideas Board"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
					children: [
						ideas.length,
						" ideas ·",
						" ",
						ideas.filter((i) => i.status === "exploring" || i.status === "validated").length,
						" ",
						"active"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: bulk.toggleBulkMode,
						className: `flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 15 }),
							" ",
							bulk.bulkMode ? "Cancel" : "Bulk"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: openAdd,
						className: "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbulb, { size: 16 }), " New Idea"]
					})]
				})]
			}),
			bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulkActionBar, {
				selectedCount: bulk.selectedCount,
				totalCount: filtered.length,
				onSelectAll: () => bulk.selectAll(filtered),
				allSelected: bulk.selectedCount === filtered.length && filtered.length > 0,
				onDelete: bulkDelete,
				dropdowns: [{
					label: "Set Status...",
					onSelect: bulkUpdateStatus,
					options: Object.entries(statusConfig).map(([k, v]) => ({
						value: k,
						label: v.label
					}))
				}, {
					label: "Set Priority...",
					onSelect: bulkUpdatePriority,
					options: [
						{
							value: "high",
							label: "🔴 High"
						},
						{
							value: "medium",
							label: "🟡 Medium"
						},
						{
							value: "low",
							label: "🟢 Low"
						}
					]
				}]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 sm:grid-cols-5 gap-2",
				children: Object.entries(statusConfig).map(([key, cfg]) => {
					const count = ideas.filter((i) => i.status === key).length;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setFilterStatus(filterStatus === key ? "all" : key),
						className: `card-elevated p-3 text-center transition-all ${filterStatus === key ? "ring-2 ring-primary/30 scale-[1.02]" : "hover:scale-[1.01]"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(cfg.icon, {
								size: 18,
								className: "mx-auto text-muted-foreground mb-1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-lg font-bold text-card-foreground",
								children: count
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-muted-foreground",
								children: cfg.label
							})
						]
					}, key);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 w-full sm:max-w-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
					size: 14,
					className: "text-muted-foreground"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: search,
					onChange: (e) => setSearch(e.target.value),
					placeholder: "Search ideas...",
					className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4",
				children: filtered.map((idea, i) => {
					const cfg = statusConfig[idea.status] || statusConfig.spark;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onClick: bulk.bulkMode ? () => bulk.toggleSelect(idea.id) : void 0,
						className: `card-elevated overflow-hidden group ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(idea.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-1.5 bg-gradient-to-r ${cfg.bg}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4 space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 min-w-0",
										children: [
											bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: bulk.isSelected(idea.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
												size: 16,
												className: "text-primary"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-4 h-4 rounded border border-muted-foreground/30" }) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDot[idea.priority]}` }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
												className: "font-semibold text-card-foreground text-sm truncate",
												children: idea.title
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `${cfg.class} flex-shrink-0`,
										children: cfg.label
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground line-clamp-3",
									children: idea.description
								}),
								idea.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-1",
									children: idea.tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground",
										children: t
									}, t))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between pt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: (e) => {
												e.stopPropagation();
												upvote(idea.id);
											},
											className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/10 touch-manipulation",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThumbsUp, { size: 13 }),
												" ",
												idea.votes
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "badge-muted text-[10px]",
											children: idea.category
										})]
									}), !bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => duplicateIdea(idea.id),
												className: "text-muted-foreground hover:text-blue-500 p-1.5 rounded-lg hover:bg-secondary transition-colors",
												title: "Duplicate",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 13 })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => openEdit(idea),
												className: "text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 13 })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => deleteIdea(idea.id),
												className: "text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 })
											})
										]
									})]
								})
							]
						})]
					}, idea.id);
				})
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-16 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-5xl mb-3",
						children: "💡"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "No ideas yet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: openAdd,
						className: "mt-3 text-sm text-primary hover:underline",
						children: "+ Capture your first idea"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Idea" : "New Idea",
				onSubmit: saveForm,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Title *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.title,
							onChange: (v) => uf("title", v),
							placeholder: "Your brilliant idea"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Description",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.description,
							onChange: (v) => uf("description", v),
							placeholder: "Describe the idea in detail...",
							rows: 3
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
											value: "high",
											label: "🔴 High"
										},
										{
											value: "medium",
											label: "🟡 Medium"
										},
										{
											value: "low",
											label: "🟢 Low"
										}
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Status",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
									value: form.status,
									onChange: (v) => uf("status", v),
									options: Object.entries(statusConfig).map(([k, v]) => ({
										value: k,
										label: v.label
									}))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Category",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.category,
									onChange: (v) => uf("category", v),
									placeholder: "SaaS, Tool, etc."
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Linked Project",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.linkedProject,
									onChange: (v) => uf("linkedProject", v),
									placeholder: "Project name"
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { IdeasPage as default };
