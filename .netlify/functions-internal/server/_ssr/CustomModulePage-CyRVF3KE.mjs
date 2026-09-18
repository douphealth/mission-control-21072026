import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { E as useCustomModules, Q as useUpdateItem, k as useDeleteItem } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { L as Search, P as Settings2, X as Plus, b as Table2, h as Trash2, n as X, nt as Pen, on as Download } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as FormTagsInput, i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/CustomModulePage-CyRVF3KE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FIELD_TYPES = [
	{
		value: "text",
		label: "Text"
	},
	{
		value: "url",
		label: "URL"
	},
	{
		value: "number",
		label: "Number"
	},
	{
		value: "date",
		label: "Date"
	},
	{
		value: "textarea",
		label: "Long Text"
	},
	{
		value: "boolean",
		label: "Checkbox"
	},
	{
		value: "tags",
		label: "Tags"
	},
	{
		value: "select",
		label: "Dropdown"
	}
];
function CustomModulePage({ sectionId }) {
	const moduleId = sectionId.replace("custom-", "");
	const customModules = useCustomModules();
	const updateItem = useUpdateItem();
	useDeleteItem();
	const mod = customModules.find((m) => m.id === moduleId);
	const [search, setSearch] = (0, import_react.useState)("");
	const [editingRow, setEditingRow] = (0, import_react.useState)(null);
	const [editingRowIdx, setEditingRowIdx] = (0, import_react.useState)(null);
	const [showFieldEditor, setShowFieldEditor] = (0, import_react.useState)(false);
	const [newField, setNewField] = (0, import_react.useState)({
		key: "",
		label: "",
		type: "text",
		options: ""
	});
	const cd = useConfirmDialog();
	const fields = mod?.fields || [];
	const data = mod?.data || [];
	const filtered = (0, import_react.useMemo)(() => {
		if (!search) return data;
		const q = search.toLowerCase();
		return data.filter((row) => fields.some((f) => String(row[f.key] || "").toLowerCase().includes(q)));
	}, [
		data,
		search,
		fields
	]);
	if (!mod) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center justify-center py-20 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-5xl mb-4",
				children: "📊"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-xl font-bold text-foreground mb-2",
				children: "Module not found"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground text-sm",
				children: "This custom module may have been deleted."
			})
		]
	});
	const openAddRow = () => {
		const empty = { __id: `row-${Date.now()}` };
		fields.forEach((f) => {
			empty[f.key] = f.type === "boolean" ? false : f.type === "tags" ? [] : f.type === "number" ? 0 : "";
		});
		setEditingRow(empty);
		setEditingRowIdx(null);
	};
	const openEditRow = (row, idx) => {
		setEditingRow({ ...row });
		setEditingRowIdx(idx);
	};
	const saveRow = async () => {
		if (!editingRow || !mod) return;
		const newData = [...data];
		if (editingRowIdx !== null) newData[editingRowIdx] = editingRow;
		else newData.push(editingRow);
		await updateItem("customModules", mod.id, { data: newData });
		setEditingRow(null);
		setEditingRowIdx(null);
		toast.success(editingRowIdx !== null ? "Row updated" : "Row added");
	};
	const deleteRow = (idx) => {
		cd.confirm({
			title: "Delete Row",
			description: "This row will be permanently removed.",
			onConfirm: async () => {
				const newData = data.filter((_, i) => i !== idx);
				await updateItem("customModules", mod.id, { data: newData });
				toast.success("Row deleted");
			}
		});
	};
	const addField = async () => {
		if (!newField.label.trim()) return;
		const key = newField.key || newField.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
		if (fields.some((f) => f.key === key)) {
			toast.error("Field key already exists");
			return;
		}
		const field = {
			key,
			label: newField.label.trim(),
			type: newField.type
		};
		if (newField.type === "select" && newField.options) field.options = newField.options.split(",").map((o) => o.trim()).filter(Boolean);
		await updateItem("customModules", mod.id, { fields: [...fields, field] });
		setNewField({
			key: "",
			label: "",
			type: "text",
			options: ""
		});
		toast.success("Field added");
	};
	const removeField = async (key) => {
		await updateItem("customModules", mod.id, {
			fields: fields.filter((f) => f.key !== key),
			data: data.map((row) => {
				const { [key]: _, ...rest } = row;
				return rest;
			})
		});
		toast.success("Field removed");
	};
	const exportCSV = () => {
		const headers = fields.map((f) => f.label);
		const rows = data.map((row) => fields.map((f) => {
			const v = row[f.key];
			return Array.isArray(v) ? v.join("; ") : String(v ?? "");
		}));
		const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, "\"\"")}"`).join(","))].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${mod.name}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Exported CSV");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-3xl",
						children: mod.icon
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-xl sm:text-2xl font-bold text-foreground",
						children: mod.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
						children: [
							data.length,
							" rows · ",
							fields.length,
							" columns"
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setShowFieldEditor((e) => !e),
							className: "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium transition-colors touch-manipulation",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { size: 14 }), " Columns"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: exportCSV,
							className: "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium transition-colors touch-manipulation",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 14 }), " Export"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: openAddRow,
							className: "flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20 touch-manipulation",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " Add Row"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: showFieldEditor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-elevated p-4 space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-sm font-bold text-foreground flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Table2, { size: 14 }), " Manage Columns"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-1.5",
							children: fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm text-foreground flex-1",
										children: f.label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md",
										children: f.type
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => removeField(f.key),
										className: "text-muted-foreground hover:text-destructive p-1 transition-colors",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
									})
								]
							}, f.key))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2 flex-wrap",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: newField.label,
									onChange: (e) => setNewField((f) => ({
										...f,
										label: e.target.value
									})),
									placeholder: "Column name",
									className: "flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: newField.type,
									onChange: (e) => setNewField((f) => ({
										...f,
										type: e.target.value
									})),
									className: "px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none appearance-none",
									children: FIELD_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: t.value,
										children: t.label
									}, t.value))
								}),
								newField.type === "select" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: newField.options,
									onChange: (e) => setNewField((f) => ({
										...f,
										options: e.target.value
									})),
									placeholder: "Options (comma separated)",
									className: "flex-1 min-w-[150px] px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: addField,
									className: "px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 })
								})
							]
						})
					]
				})
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 max-w-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
						size: 14,
						className: "text-muted-foreground"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: search,
						onChange: (e) => setSearch(e.target.value),
						placeholder: "Search rows...",
						className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
					}),
					search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setSearch(""),
						className: "text-muted-foreground hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 12 })
					})
				]
			}),
			fields.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-16 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Table2, {
						size: 40,
						className: "mx-auto mb-3 opacity-20"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold text-foreground",
						children: "No columns defined"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm mt-1",
						children: "Click \"Columns\" to add your first column, then start adding rows."
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card-elevated overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-border/40",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide",
										children: "#"
									}),
									fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap",
										children: f.label
									}, f.key)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-4 py-3 w-20" })
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filtered.map((row, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-border/20 hover:bg-secondary/30 transition-colors group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3 text-muted-foreground text-xs",
										children: idx + 1
									}),
									fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3 max-w-[250px]",
										children: f.type === "url" && row[f.key] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: row[f.key],
											target: "_blank",
											rel: "noopener",
											className: "text-primary hover:underline truncate block text-xs",
											children: row[f.key]
										}) : f.type === "boolean" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: row[f.key] ? "text-emerald-500" : "text-muted-foreground",
											children: row[f.key] ? "✓" : "✗"
										}) : f.type === "tags" && Array.isArray(row[f.key]) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex gap-1 flex-wrap",
											children: row[f.key].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground",
												children: t
											}, t))
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground text-xs truncate block",
											children: String(row[f.key] ?? "")
										})
									}, f.key)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => openEditRow(row, data.indexOf(row)),
												className: "p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 12 })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => deleteRow(data.indexOf(row)),
												className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
											})]
										})
									})
								]
							}, row.__id || idx)) })]
						})
					}),
					filtered.length === 0 && data.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-center py-8 text-muted-foreground text-sm",
						children: "No rows match your search"
					}),
					data.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-center py-12 text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm",
							children: "No data yet. Click \"Add Row\" to start."
						})
					})
				]
			}),
			editingRow && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormModal, {
				open: !!editingRow,
				onClose: () => {
					setEditingRow(null);
					setEditingRowIdx(null);
				},
				title: editingRowIdx !== null ? "Edit Row" : "Add Row",
				onSubmit: saveRow,
				children: fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
					label: f.label,
					children: f.type === "textarea" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
						value: editingRow[f.key] || "",
						onChange: (v) => setEditingRow((r) => r ? {
							...r,
							[f.key]: v
						} : r)
					}) : f.type === "tags" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTagsInput, {
						value: editingRow[f.key] || [],
						onChange: (v) => setEditingRow((r) => r ? {
							...r,
							[f.key]: v
						} : r)
					}) : f.type === "select" && f.options ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
						value: editingRow[f.key] || "",
						onChange: (v) => setEditingRow((r) => r ? {
							...r,
							[f.key]: v
						} : r),
						options: f.options.map((o) => ({
							value: o,
							label: o
						}))
					}) : f.type === "boolean" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setEditingRow((r) => r ? {
								...r,
								[f.key]: !r[f.key]
							} : r),
							className: `relative w-10 h-5 rounded-full transition-colors ${editingRow[f.key] ? "bg-primary" : "bg-secondary"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editingRow[f.key] ? "translate-x-5" : ""}` })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted-foreground",
							children: editingRow[f.key] ? "Yes" : "No"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
						value: String(editingRow[f.key] ?? ""),
						onChange: (v) => setEditingRow((r) => r ? {
							...r,
							[f.key]: f.type === "number" ? parseFloat(v) || 0 : v
						} : r),
						type: f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"
					})
				}, f.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { CustomModulePage as default };
