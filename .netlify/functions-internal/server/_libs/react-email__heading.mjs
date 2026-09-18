import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/@react-email/heading/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var withMargin = (props) => {
	const candidates = [
		withSpace(props.m, ["margin"]),
		withSpace(props.mx, ["marginLeft", "marginRight"]),
		withSpace(props.my, ["marginTop", "marginBottom"]),
		withSpace(props.mt, ["marginTop"]),
		withSpace(props.mr, ["marginRight"]),
		withSpace(props.mb, ["marginBottom"]),
		withSpace(props.ml, ["marginLeft"])
	];
	const mergedStyles = {};
	for (const style of candidates) if (Object.keys(style).length > 0) Object.assign(mergedStyles, style);
	return mergedStyles;
};
var withSpace = (value, properties) => {
	const styles = {};
	if (value === void 0) return styles;
	if (Number.isNaN(Number.parseFloat(String(value)))) return styles;
	for (const property of properties) styles[property] = `${value}px`;
	return styles;
};
var Heading = import_react.forwardRef(({ as: Tag = "h1", children, style, m, mx, my, mt, mr, mb, ml, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, {
		...props,
		ref,
		style: {
			...withMargin({
				m,
				mx,
				my,
				mt,
				mr,
				mb,
				ml
			}),
			...style
		},
		children
	});
});
Heading.displayName = "Heading";
//#endregion
export { Heading as t };
