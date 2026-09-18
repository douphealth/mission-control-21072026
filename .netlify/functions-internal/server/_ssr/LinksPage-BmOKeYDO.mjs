import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, I as useLinks, Z as useUpdateData } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $ as Pin, L as Search, T as SquareCheckBig, X as Plus, et as PinOff, h as Trash2, nt as Pen, rn as ExternalLink, un as Copy } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useBulkActions, t as BulkActionBar } from "./BulkActionBar-CAKTOtt7.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/LinksPage-BmOKeYDO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var emptyLink = {
	title: "",
	url: "",
	category: "Tools",
	status: "active",
	description: "",
	dateAdded: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
	pinned: false
};
function LinksPage() {
	const links = useLinks();
	const updateData = useUpdateData();
	useDuplicateItem();
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterCat, setFilterCat] = (0, import_react.useState)("all");
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyLink);
	const bulk = useBulkActions();
	const cd = useConfirmDialog();
	const categories = ["all", ...Array.from(new Set(links.map((l) => l.category)))];
	const filtered = links.filter((l) => filterCat === "all" || l.category === filterCat).filter((l) => l.title.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
	const openAdd = () => {
		setEditId(null);
		setForm(emptyLink);
		setModalOpen(true);
	};
	const openEdit = (l) => {
		setEditId(l.id);
		const { id, ...rest } = l;
		setForm(rest);
		setModalOpen(true);
	};
	const saveForm = () => {
		if (!form.title.trim() || !form.url.trim()) return;
		if (editId) updateData({ links: links.map((l) => l.id === editId ? {
			...l,
			...form
		} : l) });
		else updateData({ links: [{
			id: Math.random().toString(36).slice(2, 10),
			...form,
			dateAdded: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		}, ...links] });
		setModalOpen(false);
	};
	const togglePin = (id) => updateData({ links: links.map((l) => l.id === id ? {
		...l,
		pinned: !l.pinned
	} : l) });
	const deleteLink = (id) => {
		cd.confirm({
			title: "Delete Link",
			description: "This link will be permanently removed.",
			onConfirm: () => {
				updateData({ links: links.filter((l) => l.id !== id) });
				toast.success("Link deleted");
			}
		});
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (bulk.selectedCount === 0) return;
		cd.confirm({
			title: `Delete ${bulk.selectedCount} Link(s)`,
			description: `This will permanently remove ${bulk.selectedCount} links.`,
			onConfirm: () => {
				updateData({ links: links.filter((l) => !bulk.selectedIds.has(l.id)) });
				toast.success(`${bulk.selectedCount} links deleted`);
				bulk.clearSelection();
			}
		});
	}, [
		bulk,
		links,
		updateData,
		cd
	]);
	const bulkUpdateCategory = (0, import_react.useCallback)((cat) => {
		updateData({ links: links.map((l) => bulk.selectedIds.has(l.id) ? {
			...l,
			category: cat
		} : l) });
		toast.success(`${bulk.selectedCount} links updated`);
		bulk.clearSelection();
	}, [
		bulk,
		links,
		updateData
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground",
					children: "Links Hub"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
					children: [
						links.length,
						" links · ",
						links.filter((l) => l.pinned).length,
						" pinned"
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
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " Add Link"]
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
					label: "Set Category...",
					onSelect: bulkUpdateCategory,
					options: [
						"Tools",
						"Documentation",
						"Resources",
						"APIs",
						"Design",
						"Learning",
						"Social Media",
						"Hosting",
						"Domains",
						"Other"
					].map((c) => ({
						value: c,
						label: c
					}))
				}]
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
						placeholder: "Search links...",
						className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto hide-scrollbar",
					children: categories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setFilterCat(c),
						className: `px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterCat === c ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
						children: c === "all" ? "All" : c
					}, c))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
				children: filtered.map((link, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					onClick: bulk.bulkMode ? () => bulk.toggleSelect(link.id) : void 0,
					className: `card-elevated p-4 group ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(link.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`,
					children: [
						bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2",
							children: bulk.isSelected(link.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
								size: 16,
								className: "text-primary"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-4 h-4 rounded border border-muted-foreground/30" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0",
								children: link.title.charAt(0)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5",
										children: [link.pinned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, {
											size: 10,
											className: "text-warning flex-shrink-0"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-medium text-card-foreground truncate",
											children: link.title
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground truncate",
										children: link.description
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "text-[11px] text-primary hover:underline truncate block mt-0.5",
										children: link.url
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "badge-muted text-[10px] mt-1.5",
										children: link.category
									})
								]
							})]
						}),
						!bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 mt-3 pt-2 border-t border-border/20 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-secondary transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										navigator.clipboard.writeText(link.url);
										toast.success("URL copied");
									},
									className: "text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 14 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => togglePin(link.id),
									className: "text-muted-foreground hover:text-warning p-1.5 rounded-lg hover:bg-warning/10 transition-colors",
									children: link.pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinOff, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { size: 14 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ml-auto flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => openEdit(link),
										className: "text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 14 })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => deleteLink(link.id),
										className: "text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
									})]
								})
							]
						})
					]
				}, link.id))
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-16 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-5xl mb-3",
						children: "🔗"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "No links found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: openAdd,
						className: "mt-3 text-sm text-primary hover:underline",
						children: "+ Add your first link"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Link" : "Add Link",
				onSubmit: saveForm,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Title *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.title,
							onChange: (v) => uf("title", v),
							placeholder: "My Tool"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "URL *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.url,
							onChange: (v) => uf("url", v),
							placeholder: "https://example.com"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Description",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.description,
							onChange: (v) => uf("description", v),
							placeholder: "What is this link for?",
							rows: 2
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 sm:gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Category",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: form.category,
								onChange: (v) => uf("category", v),
								options: [
									"Tools",
									"Documentation",
									"Resources",
									"APIs",
									"Design",
									"Learning",
									"Social Media",
									"Hosting",
									"Domains",
									"Other"
								].map((c) => ({
									value: c,
									label: c
								}))
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Status",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: form.status,
								onChange: (v) => uf("status", v),
								options: [{
									value: "active",
									label: "Active"
								}, {
									value: "archived",
									label: "Archived"
								}]
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { LinksPage as default };
