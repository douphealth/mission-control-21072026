import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/@react-email/link/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var Link = import_react.forwardRef(({ target = "_blank", style, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
	...props,
	ref,
	style: {
		color: "#067df7",
		textDecorationLine: "none",
		...style
	},
	target,
	children: props.children
}));
Link.displayName = "Link";
//#endregion
export { Link as t };
