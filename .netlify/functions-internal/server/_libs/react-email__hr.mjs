import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/@react-email/hr/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var Hr = import_react.forwardRef(({ style, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("hr", {
	...props,
	ref,
	style: {
		width: "100%",
		border: "none",
		borderTop: "1px solid #eaeaea",
		...style
	}
}));
Hr.displayName = "Hr";
//#endregion
export { Hr as t };
