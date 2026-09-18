import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { T as SquareCheckBig, h as Trash2, w as Square } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/BulkActionBar-CAKTOtt7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useBulkActions() {
	const [bulkMode, setBulkMode] = (0, import_react.useState)(false);
	const [selectedIds, setSelectedIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	return {
		bulkMode,
		selectedIds,
		toggleBulkMode: (0, import_react.useCallback)(() => {
			setBulkMode((prev) => {
				if (prev) setSelectedIds(/* @__PURE__ */ new Set());
				return !prev;
			});
		}, []),
		toggleSelect: (0, import_react.useCallback)((id) => {
			setSelectedIds((prev) => {
				const n = new Set(prev);
				if (n.has(id)) n.delete(id);
				else n.add(id);
				return n;
			});
		}, []),
		selectAll: (0, import_react.useCallback)((items) => {
			setSelectedIds((prev) => {
				if (prev.size === items.length) return /* @__PURE__ */ new Set();
				return new Set(items.map((i) => i.id));
			});
		}, []),
		clearSelection: (0, import_react.useCallback)(() => {
			setSelectedIds(/* @__PURE__ */ new Set());
			setBulkMode(false);
		}, []),
		isSelected: (0, import_react.useCallback)((id) => selectedIds.has(id), [selectedIds]),
		selectedCount: selectedIds.size
	};
}
function BulkActionBar({ selectedCount, totalCount, onSelectAll, allSelected, onDelete, dropdowns = [] }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 flex-wrap",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: onSelectAll,
				className: "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 hover:bg-secondary transition-all",
				children: [allSelected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { size: 13 }), allSelected ? "Deselect All" : "Select All"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-xs text-muted-foreground font-medium",
				children: [
					selectedCount,
					" of ",
					totalCount,
					" selected"
				]
			}),
			selectedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-px bg-border/30" }),
				dropdowns.map((dd) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					onChange: (e) => {
						if (e.target.value) dd.onSelect(e.target.value);
						e.target.value = "";
					},
					className: "px-2.5 py-1.5 rounded-lg bg-secondary/50 text-xs font-semibold text-muted-foreground border border-border/15 outline-none cursor-pointer",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: dd.label
					}), dd.options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: o.value,
						children: o.label
					}, o.value))]
				}, dd.label)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: onDelete,
					className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all ml-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 }),
						" Delete (",
						selectedCount,
						")"
					]
				})
			] })
		]
	});
}
//#endregion
export { useBulkActions as n, BulkActionBar as t };
