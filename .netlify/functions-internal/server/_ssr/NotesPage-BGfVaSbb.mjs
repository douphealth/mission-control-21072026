import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, L as useNotes, Z as useUpdateData } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $ as Pin, En as ChevronLeft, L as Search, T as SquareCheckBig, Tn as ChevronRight, X as Plus, et as PinOff, h as Trash2, n as X, un as Copy } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as useIsMobile } from "./routes-qm6I9RAb.mjs";
import { n as useBulkActions, t as BulkActionBar } from "./BulkActionBar-CAKTOtt7.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/NotesPage-BGfVaSbb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var noteColors = [
	"blue",
	"amber",
	"green",
	"rose",
	"purple",
	"teal"
];
var colorMap = {
	blue: {
		border: "border-l-info",
		dot: "bg-info"
	},
	amber: {
		border: "border-l-warning",
		dot: "bg-warning"
	},
	green: {
		border: "border-l-success",
		dot: "bg-success"
	},
	rose: {
		border: "border-l-destructive",
		dot: "bg-destructive"
	},
	purple: {
		border: "border-l-purple-400",
		dot: "bg-purple-400"
	},
	teal: {
		border: "border-l-accent",
		dot: "bg-accent"
	}
};
function NotesPage() {
	const notes = useNotes();
	const updateData = useUpdateData();
	const duplicateItem = useDuplicateItem();
	const isMobile = useIsMobile();
	const [selectedId, setSelectedId] = (0, import_react.useState)(notes[0]?.id ?? null);
	const [search, setSearch] = (0, import_react.useState)("");
	const bulk = useBulkActions();
	const selected = notes.find((n) => n.id === selectedId);
	const filtered = notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
	const updateNote = (0, import_react.useCallback)((field, value) => {
		updateData({ notes: notes.map((n) => n.id === selectedId ? {
			...n,
			[field]: value,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		} : n) });
	}, [
		notes,
		selectedId,
		updateData
	]);
	const addNote = () => {
		const id = Math.random().toString(36).slice(2, 10);
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		updateData({ notes: [{
			id,
			title: "Untitled Note",
			content: "",
			color: "blue",
			pinned: false,
			tags: [],
			createdAt: now,
			updatedAt: now
		}, ...notes] });
		setSelectedId(id);
	};
	const togglePin = (id) => {
		updateData({ notes: notes.map((n) => n.id === id ? {
			...n,
			pinned: !n.pinned
		} : n) });
	};
	const cd = useConfirmDialog();
	const deleteNote = (id) => {
		cd.confirm({
			title: "Delete Note",
			description: "This note will be permanently removed.",
			onConfirm: () => {
				const remaining = notes.filter((n) => n.id !== id);
				updateData({ notes: remaining });
				if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
			}
		});
	};
	const duplicateNote = async (id) => {
		const newId = await duplicateItem("notes", id);
		if (newId) {
			toast.success("Note duplicated");
			setSelectedId(newId);
		}
	};
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (bulk.selectedCount === 0) return;
		cd.confirm({
			title: `Delete ${bulk.selectedCount} Note(s)`,
			description: `This will permanently remove ${bulk.selectedCount} notes.`,
			onConfirm: () => {
				const remaining = notes.filter((n) => !bulk.selectedIds.has(n.id));
				updateData({ notes: remaining });
				if (bulk.selectedIds.has(selectedId || "")) setSelectedId(remaining[0]?.id ?? null);
				toast.success(`${bulk.selectedCount} notes deleted`);
				bulk.clearSelection();
			}
		});
	}, [
		bulk,
		notes,
		updateData,
		selectedId,
		cd
	]);
	(0, import_react.useCallback)(() => {
		updateData({ notes: notes.map((n) => bulk.selectedIds.has(n.id) ? {
			...n,
			pinned: !n.pinned
		} : n) });
		toast.success(`${bulk.selectedCount} notes toggled pin`);
		bulk.clearSelection();
	}, [
		bulk,
		notes,
		updateData
	]);
	const showEditor = isMobile ? !!selectedId && !bulk.bulkMode : true;
	const showList = isMobile ? !selectedId || bulk.bulkMode : true;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3 sm:space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground",
					children: "Notes"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[11px] sm:text-sm text-muted-foreground mt-0.5",
					children: [
						notes.length,
						" notes · ",
						notes.filter((n) => n.pinned).length,
						" pinned"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: bulk.toggleBulkMode,
						className: `flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation ${bulk.bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 14 }),
							" ",
							bulk.bulkMode ? "Cancel" : "Bulk"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: addNote,
						className: "flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20 touch-manipulation",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 15 }),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "New"
							}),
							" Note"
						]
					})]
				})]
			}),
			bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulkActionBar, {
				selectedCount: bulk.selectedCount,
				totalCount: filtered.length,
				onSelectAll: () => bulk.selectAll(filtered),
				allSelected: bulk.selectedCount === filtered.length && filtered.length > 0,
				onDelete: bulkDelete,
				dropdowns: []
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4",
				style: { minHeight: 420 },
				children: [showList && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center bg-secondary rounded-xl px-3 py-2.5 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
								size: 14,
								className: "text-muted-foreground shrink-0"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: search,
								onChange: (e) => setSearch(e.target.value),
								placeholder: "Search notes...",
								className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
							}),
							search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSearch(""),
								className: "text-muted-foreground hover:text-foreground touch-manipulation",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 12 })
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5 max-h-[520px] sm:max-h-[460px] overflow-y-auto pr-1",
						children: [filtered.map((note) => {
							const c = colorMap[note.color] || colorMap.blue;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => bulk.bulkMode ? bulk.toggleSelect(note.id) : setSelectedId(note.id),
								className: `w-full text-left card-elevated p-3.5 border-l-[3px] ${c.border} transition-all touch-manipulation active:scale-[0.98] ${bulk.isSelected(note.id) ? "ring-1 ring-primary/30 border-primary/50" : selectedId === note.id && !bulk.bulkMode ? "ring-1 ring-primary/30 bg-primary/5" : "hover:bg-secondary/50"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5",
										children: [
											bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mr-1",
												children: bulk.isSelected(note.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
													size: 14,
													className: "text-primary"
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-3.5 h-3.5 rounded border border-muted-foreground/30" })
											}),
											note.pinned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, {
												size: 10,
												className: "text-warning flex-shrink-0"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-medium text-card-foreground truncate flex-1",
												children: note.title
											}),
											!bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
												size: 12,
												className: "text-muted-foreground/40 flex-shrink-0"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground truncate mt-1",
										children: note.content.slice(0, 80) || "Empty note..."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 mt-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-muted-foreground/60",
											children: note.updatedAt
										}), note.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex gap-1",
											children: note.tags.slice(0, 2).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[9px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground",
												children: t
											}, t))
										})]
									})
								]
							}, note.id);
						}), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-center py-8 text-muted-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm",
								children: "No notes found"
							})
						})]
					})]
				}), !bulk.bulkMode && showEditor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `lg:col-span-2 card-elevated p-4 sm:p-5 flex flex-col`,
					children: selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 mb-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setSelectedId(null),
									className: "lg:hidden p-2 rounded-xl hover:bg-secondary text-muted-foreground touch-manipulation",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { size: 18 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: selected.title,
									onChange: (e) => updateNote("title", e.target.value),
									className: "text-lg sm:text-xl font-bold text-card-foreground bg-transparent outline-none flex-1 min-w-0",
									placeholder: "Note title..."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-0.5 shrink-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => togglePin(selected.id),
											className: `p-2 rounded-xl hover:bg-secondary transition-colors touch-manipulation ${selected.pinned ? "text-warning" : "text-muted-foreground"}`,
											children: selected.pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinOff, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { size: 16 })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => duplicateNote(selected.id),
											className: "p-2 rounded-xl hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors touch-manipulation",
											title: "Duplicate",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 16 })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => deleteNote(selected.id),
											className: "p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-manipulation",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 16 })
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: selected.content,
							onChange: (e) => updateNote("content", e.target.value),
							className: "flex-1 bg-transparent text-sm text-card-foreground outline-none resize-none leading-relaxed min-h-[300px]",
							placeholder: "Start writing..."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between pt-3 border-t border-border mt-3 flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-muted-foreground",
									children: [selected.content.split(/\s+/).filter(Boolean).length, " words"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-muted-foreground hidden sm:inline",
									children: ["Updated ", selected.updatedAt]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex gap-1.5",
								children: noteColors.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => updateNote("color", c),
									className: `w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all touch-manipulation ${selected.color === c ? "border-foreground scale-110" : "border-transparent hover:scale-110"} ${colorMap[c]?.dot}`
								}, c))
							})]
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-5xl",
								children: "📝"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Select a note or create a new one" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: addNote,
								className: "text-primary hover:underline text-sm touch-manipulation",
								children: "+ New Note"
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { NotesPage as default };
