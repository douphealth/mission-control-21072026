import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as X } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/FormModal-D0EgfRmB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FormModal = (0, import_react.forwardRef)(({ open, onClose, title, children, onSubmit, submitLabel = "Save", size = "md" }, _ref) => {
	const innerRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const handler = (e) => {
			if (e.key === "Escape") onClose();
		};
		if (open) document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onClose]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4",
		onClick: onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-foreground/20 backdrop-blur-sm" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: innerRef,
			className: `relative ${size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl"} w-full bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col`,
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base sm:text-lg font-semibold text-card-foreground",
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors touch-manipulation",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4",
					children
				}),
				onSubmit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-border pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onSubmit,
						className: "px-5 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity touch-manipulation",
						children: submitLabel
					})]
				})
			]
		})]
	}) });
});
FormModal.displayName = "FormModal";
function FormField({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "text-xs font-medium text-muted-foreground mb-1.5 block",
		children: label
	}), children] });
}
function FormInput({ value, onChange, placeholder, type = "text" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		value,
		onChange: (e) => onChange(e.target.value),
		placeholder,
		className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground"
	});
}
function FormTextarea({ value, onChange, placeholder, rows = 3 }) {
	const ref = (0, import_react.useRef)(null);
	const autoResize = () => {
		const el = ref.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = el.scrollHeight + "px";
	};
	(0, import_react.useEffect)(() => {
		autoResize();
	}, [value]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		ref,
		value,
		onChange: (e) => onChange(e.target.value),
		onInput: autoResize,
		placeholder,
		rows,
		style: { overflow: "hidden" },
		className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none placeholder:text-muted-foreground"
	});
}
function FormSelect({ value, onChange, options }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		value,
		onChange: (e) => onChange(e.target.value),
		className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow appearance-none cursor-pointer",
		children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
			value: o.value,
			children: o.label
		}, o.value))
	});
}
function FormTagsInput({ value, onChange, placeholder }) {
	const handleKeyDown = (e) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			const v = e.target.value.trim();
			if (v && !value.includes(v)) {
				onChange([...value, v]);
				e.target.value = "";
			}
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			onKeyDown: handleKeyDown,
			placeholder: placeholder || "Type and press Enter",
			className: "w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground"
		}), value.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-1.5",
			children: value.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs",
				children: [t, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => onChange(value.filter((x) => x !== t)),
					className: "hover:text-destructive",
					children: "×"
				})]
			}, t))
		})]
	});
}
//#endregion
export { FormTagsInput as a, FormSelect as i, FormInput as n, FormTextarea as o, FormModal as r, FormField as t };
