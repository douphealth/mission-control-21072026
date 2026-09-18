import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/@react-email/head/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var Head = import_react.forwardRef(({ children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", {
	...props,
	ref,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("meta", {
			content: "text/html; charset=UTF-8",
			httpEquiv: "Content-Type"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("meta", { name: "x-apple-disable-message-reformatting" }),
		children
	]
}));
Head.displayName = "Head";
//#endregion
export { Head as t };
