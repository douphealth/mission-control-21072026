import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/@react-email/text/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function parseMarginValue(value) {
	if (typeof value === "number") return {
		marginTop: value,
		marginBottom: value,
		marginLeft: value,
		marginRight: value
	};
	if (typeof value === "string") {
		const values = value.toString().trim().split(/\s+/);
		if (values.length === 1) return {
			marginTop: values[0],
			marginBottom: values[0],
			marginLeft: values[0],
			marginRight: values[0]
		};
		if (values.length === 2) return {
			marginTop: values[0],
			marginRight: values[1],
			marginBottom: values[0],
			marginLeft: values[1]
		};
		if (values.length === 3) return {
			marginTop: values[0],
			marginRight: values[1],
			marginBottom: values[2],
			marginLeft: values[1]
		};
		if (values.length === 4) return {
			marginTop: values[0],
			marginRight: values[1],
			marginBottom: values[2],
			marginLeft: values[3]
		};
	}
	return {
		marginTop: void 0,
		marginBottom: void 0,
		marginLeft: void 0,
		marginRight: void 0
	};
}
/**
* Parses all the values out of a margin string to get the value for all margin props in the four margin properties
* @example e.g. "10px" =\> mt: "10px", mr: "10px", mb: "10px", ml: "10px"
*/
function computeMargins(properties) {
	let result = {
		marginTop: void 0,
		marginRight: void 0,
		marginBottom: void 0,
		marginLeft: void 0
	};
	for (const [key, value] of Object.entries(properties)) if (key === "margin") result = parseMarginValue(value);
	else if (key === "marginTop") result.marginTop = value;
	else if (key === "marginRight") result.marginRight = value;
	else if (key === "marginBottom") result.marginBottom = value;
	else if (key === "marginLeft") result.marginLeft = value;
	return result;
}
var Text = import_react.forwardRef(({ style, ...props }, ref) => {
	/**
	* we do this clunky way of spreading these default margins because
	* if we were to simply spread, the ordering of the margins would be lost
	*
	* ex:
	* ```js
	* { ...{ marginTop: '16px', marginBottom: '16px' }, ...{ marginTop: '24px' } }
	* // would result in
	* { marginTop: '24px', marginBottom: '16px' }
	* // not the expected
	* { marginBottom: '16px', marginTop: '24px' }
	* ```
	*/
	const defaultMargins = {};
	if (style?.marginTop === void 0) defaultMargins.marginTop = "16px";
	if (style?.marginBottom === void 0) defaultMargins.marginBottom = "16px";
	const margins = computeMargins({
		...defaultMargins,
		...style
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		...props,
		ref,
		style: {
			fontSize: "14px",
			lineHeight: "24px",
			...style,
			...margins
		}
	});
});
Text.displayName = "Text";
//#endregion
export { Text as t };
