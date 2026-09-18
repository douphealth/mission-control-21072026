import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./alert-dialog-191NluCC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ConfirmDialog-Cy6Yh3O-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ConfirmDialog = (0, import_react.forwardRef)(function ConfirmDialog({ open, onOpenChange, title = "Are you sure?", description = "This action cannot be undone.", confirmLabel = "Delete", cancelLabel = "Cancel", variant = "destructive", onConfirm }, ref) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, {
			ref,
			className: "rounded-2xl border-border/50 bg-card shadow-2xl max-w-[400px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, {
				className: "text-base font-bold text-card-foreground",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, {
				className: "text-sm text-muted-foreground",
				children: description
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, {
				className: "gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
					className: "rounded-xl text-sm font-medium",
					children: cancelLabel
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: onConfirm,
					className: `rounded-xl text-sm font-semibold ${variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`,
					children: confirmLabel
				})]
			})]
		})
	});
});
function useConfirmDialog() {
	const [state, setState] = (0, import_react.useState)({
		open: false,
		title: "",
		description: "",
		confirmLabel: "Delete",
		onConfirm: () => {}
	});
	return {
		confirm: (0, import_react.useCallback)((opts) => {
			setState({
				open: true,
				...opts,
				confirmLabel: opts.confirmLabel || "Delete"
			});
		}, []),
		dialogProps: {
			open: state.open,
			onOpenChange: (open) => setState((s) => ({
				...s,
				open
			})),
			title: state.title,
			description: state.description,
			confirmLabel: state.confirmLabel,
			onConfirm: state.onConfirm
		}
	};
}
//#endregion
export { useConfirmDialog as n, ConfirmDialog as t };
