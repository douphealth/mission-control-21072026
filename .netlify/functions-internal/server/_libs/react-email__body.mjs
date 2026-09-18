import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/@react-email/body/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var marginProperties = [
	"margin",
	"marginTop",
	"marginBottom",
	"marginRight",
	"marginLeft",
	"marginInline",
	"marginBlock",
	"marginBlockStart",
	"marginBlockEnd",
	"marginInlineStart",
	"marginInlineEnd"
];
var paddingProperties = [
	"padding",
	"paddingTop",
	"paddingBottom",
	"paddingRight",
	"paddingLeft",
	"paddingInline",
	"paddingBlock",
	"paddingBlockStart",
	"paddingBlockEnd",
	"paddingInlineStart",
	"paddingInlineEnd"
];
var Body = import_react.forwardRef(({ children, style, ...props }, ref) => {
	const bodyStyle = {
		background: style?.background,
		backgroundColor: style?.backgroundColor
	};
	if (style) for (const property of [...marginProperties, ...paddingProperties]) bodyStyle[property] = style[property] !== void 0 ? 0 : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("body", {
		...props,
		style: bodyStyle,
		ref,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
			border: 0,
			width: "100%",
			cellPadding: "0",
			cellSpacing: "0",
			role: "presentation",
			align: "center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				style,
				children
			}) }) })
		})
	});
});
Body.displayName = "Body";
//#endregion
export { Body as t };
