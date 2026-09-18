import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/@react-email/column/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var Column = import_react.forwardRef(({ children, style, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
		...props,
		"data-id": "__react-email-column",
		ref,
		style,
		children
	});
});
Column.displayName = "Column";
//#endregion
export { Column as t };
