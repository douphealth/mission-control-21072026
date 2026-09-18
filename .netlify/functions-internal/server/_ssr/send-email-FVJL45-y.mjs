import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as render } from "../_libs/@react-email/render+[...].mjs";
import { t as TEMPLATES } from "./registry-xs9QoTYL.mjs";
import { r as sendLovableEmail, t as EmailAPIError } from "../_libs/@lovable.dev/email-js+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/send-email-FVJL45-y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var SITE_NAME = "mission-control-001";
var SENDER_DOMAIN = "notify.webmarketingbooks.com";
var FROM_DOMAIN = "webmarketingbooks.com";
/**
* Renders a registered template and sends it through Lovable's managed email
* API. Suppression, retries, and rate limits are enforced by Lovable
* server-side. A suppressed recipient is an expected outcome
* ({ sent: false }); any other failure throws — EmailAPIError exposes
* .code and .status for branching.
*/
async function sendTemplateEmail(templateName, to, options = {}) {
	const apiKey = process.env["LOVABLE_API_KEY"];
	if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
	const template = TEMPLATES[templateName];
	if (!template) throw new Error(`Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(", ")}`);
	const recipient = template.to || to;
	if (!recipient) throw new Error("Recipient is required (the template defines no fixed recipient)");
	const templateData = options.templateData ?? {};
	const element = import_react.createElement(template.component, templateData);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	const subject = typeof template.subject === "function" ? template.subject(templateData) : template.subject;
	try {
		await sendLovableEmail({
			to: recipient,
			from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
			sender_domain: SENDER_DOMAIN,
			subject,
			html,
			text,
			purpose: "transactional",
			label: templateName,
			idempotency_key: options.idempotencyKey || crypto.randomUUID(),
			reply_to: options.replyTo
		}, {
			apiKey,
			sendUrl: process.env["LOVABLE_SEND_URL"]
		});
	} catch (error) {
		if (error instanceof EmailAPIError && error.code === "recipient_suppressed") return {
			sent: false,
			reason: "recipient_suppressed"
		};
		throw error;
	}
	return { sent: true };
}
//#endregion
export { sendTemplateEmail };
