//#region node_modules/@lovable.dev/webhooks-js/dist/index.js
var DEFAULT_SIGNATURE_HEADER = "x-lovable-signature";
var DEFAULT_TIMESTAMP_HEADER = "x-lovable-timestamp";
var DEFAULT_TOLERANCE_MS = 3e5;
var DEFAULT_MAX_BODY_BYTES = 1 << 20;
var WebhookError = class extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
	}
};
async function computeSignature(signedPayload, secret) {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
	return "sha256=" + Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a, b) {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return result === 0;
}
async function verifyWebhookSignature({ signedPayload, signature, secret, secrets }) {
	if (!signature) return false;
	const candidates = [secret, ...secrets ?? []].filter((value) => Boolean(value));
	if (candidates.length === 0) throw new WebhookError("missing_secret", "Missing webhook secret");
	for (const candidate of candidates) if (constantTimeEqual(signature, await computeSignature(signedPayload, candidate))) return true;
	return false;
}
function parseTimestamp(timestamp) {
	const numeric = Number(timestamp);
	if (Number.isFinite(numeric)) {
		if (Math.abs(numeric) < 0xe8d4a51000) return numeric * 1e3;
		return numeric;
	}
	const parsed = Date.parse(timestamp);
	if (!Number.isNaN(parsed)) return parsed;
	throw new WebhookError("invalid_timestamp", "Invalid webhook timestamp");
}
async function verifyWebhookRequest({ req, secret, secrets, signatureHeader = DEFAULT_SIGNATURE_HEADER, timestampHeader = DEFAULT_TIMESTAMP_HEADER, toleranceMs = DEFAULT_TOLERANCE_MS, maxBodyBytes = DEFAULT_MAX_BODY_BYTES, parser }) {
	const signature = req.headers.get(signatureHeader);
	const timestamp = req.headers.get(timestampHeader);
	if (!timestamp) throw new WebhookError("missing_timestamp", "Missing webhook timestamp");
	const timestampMs = parseTimestamp(timestamp);
	if (Math.abs(Date.now() - timestampMs) > toleranceMs) throw new WebhookError("stale_timestamp", "Webhook timestamp outside tolerance window");
	const body = await req.text();
	if (new TextEncoder().encode(body).length > maxBodyBytes) throw new WebhookError("body_too_large", "Webhook body exceeds size limit");
	if (!await verifyWebhookSignature({
		signedPayload: `${timestamp}.${body}`,
		signature,
		secret,
		secrets
	})) throw new WebhookError("invalid_signature", "Invalid webhook signature");
	const parseBody = parser ?? ((raw) => JSON.parse(raw));
	let payload;
	try {
		payload = parseBody(body);
	} catch {
		if (parser) throw new WebhookError("invalid_payload", "Failed to parse webhook payload");
		throw new WebhookError("invalid_json", "Invalid JSON in request body");
	}
	return {
		body,
		payload,
		timestamp
	};
}
//#endregion
//#region node_modules/@lovable.dev/email-js/dist/index.js
var DEFAULT_AUTH_HEADER = "Authorization";
var DEFAULT_API_BASE_URL = "https://api.lovable.dev";
function resolveApiBaseUrl(apiBaseUrl) {
	return (apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}
var EmailAPIError = class extends Error {
	constructor(status, message, retryAfterSeconds, code = null) {
		super(message);
		this.name = "EmailAPIError";
		this.status = status;
		this.retryAfterSeconds = retryAfterSeconds;
		this.code = code;
	}
	get retryable() {
		return this.status === 429 || this.status >= 500 && this.status < 600;
	}
};
function parseRetryAfter(header) {
	if (!header) return null;
	const parsed = Number(header);
	if (!Number.isNaN(parsed)) return parsed;
	const date = new Date(header);
	if (!Number.isNaN(date.getTime())) return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1e3));
	return null;
}
function buildAuthHeaderValue(apiKey) {
	return `Bearer ${apiKey}`;
}
function parseErrorCode(body) {
	try {
		const parsed = JSON.parse(body);
		if (parsed && typeof parsed === "object" && "type" in parsed && typeof parsed.type === "string") return parsed.type;
	} catch {
		return null;
	}
	return null;
}
async function throwIfNotOk(response) {
	if (response.ok) return;
	const errorText = await response.text();
	const safeErrorText = errorText.length > 500 ? `${errorText.slice(0, 500)}...` : errorText;
	const retryAfterSeconds = parseRetryAfter(response.headers.get("Retry-After"));
	const code = parseErrorCode(errorText);
	if (response.status === 429) console.error("[email-js] rate limited:", {
		status: response.status,
		code,
		retryAfterSeconds
	});
	throw new EmailAPIError(response.status, `Email API error: ${response.status} ${safeErrorText}`, retryAfterSeconds, code);
}
var DEFAULT_SEND_PATH = "/v1/messaging/email/send";
async function sendLovableEmail(payload, options) {
	const apiKey = options.apiKey;
	if (!apiKey) throw new Error("Missing Lovable API key");
	const authHeader = options.authHeader ?? DEFAULT_AUTH_HEADER;
	const url = options.sendUrl || `${resolveApiBaseUrl(options.apiBaseUrl)}${DEFAULT_SEND_PATH}`;
	const idempotencyKey = options.idempotencyKey ?? payload.idempotency_key ?? payload.run_id;
	const headers = {
		[authHeader]: buildAuthHeaderValue(apiKey),
		"Content-Type": "application/json"
	};
	if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
	const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(payload)
	});
	await throwIfNotOk(response);
	return await response.json();
}
var WEBHOOK_ERROR_STATUS = {
	missing_secret: 401,
	missing_timestamp: 401,
	invalid_timestamp: 401,
	stale_timestamp: 401,
	invalid_signature: 401,
	body_too_large: 400,
	invalid_json: 400,
	invalid_payload: 400
};
function parseAuthEmailWebhookPayload(body) {
	const parsed = JSON.parse(body);
	const payload = parsed;
	if (!parsed || typeof parsed !== "object" || typeof payload.version !== "string" || payload.type !== "auth" || !payload.data || typeof payload.data !== "object" || typeof payload.data.action_type !== "string" || typeof payload.data.email !== "string") throw new Error("Invalid auth email webhook payload");
	return payload;
}
function domainOfAddress(from) {
	return /@([^@\s<>]+)>?\s*$/.exec(from.trim())?.[1];
}
function createAuthEmailHandler(options) {
	const { apiKey, from, emails } = options;
	if (!apiKey) throw new Error("Missing Lovable API key");
	const senderDomain = options.senderDomain ?? domainOfAddress(from);
	if (!senderDomain) throw new Error(`Cannot derive a sender domain from "${from}"; pass senderDomain`);
	return async (req) => {
		if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, {
			status: 405,
			headers: { Allow: "POST" }
		});
		let event;
		try {
			({payload: event} = await verifyWebhookRequest({
				req,
				secret: apiKey,
				parser: parseAuthEmailWebhookPayload
			}));
		} catch (error) {
			if (error instanceof WebhookError) return Response.json({ error: error.message }, { status: WEBHOOK_ERROR_STATUS[error.code] });
			console.error("[email-js] auth webhook verification failed:", error);
			return Response.json({ error: "Webhook verification failed" }, { status: 500 });
		}
		if (!event.run_id) return Response.json({ error: "Missing run_id" }, { status: 400 });
		if (event.version !== "1") return Response.json({ error: `Unsupported payload version: ${event.version}` }, { status: 400 });
		const actionType = event.data.action_type;
		const definition = Object.prototype.hasOwnProperty.call(emails, actionType) ? emails[actionType] : void 0;
		if (!definition) return Response.json({ error: `Unknown auth email action type: ${actionType}` }, { status: 400 });
		try {
			const { render } = await import("../@react-email/render+[...].mjs").then((n) => n.t);
			const { subject, element } = typeof definition === "function" ? await definition(event.data) : {
				subject: definition.subject,
				element: await definition.render(event.data)
			};
			const html = await render(element);
			const text = await render(element, { plainText: true });
			await sendLovableEmail({
				run_id: event.run_id,
				to: event.data.email,
				from,
				sender_domain: senderDomain,
				subject,
				html,
				text,
				purpose: "transactional",
				label: actionType
			}, {
				apiKey,
				sendUrl: options.sendUrl
			});
		} catch (error) {
			console.error("[email-js] auth email send failed:", error);
			if (error instanceof EmailAPIError && !error.retryable) return Response.json({ error: "Email send rejected" }, { status: 400 });
			return Response.json({ error: "Failed to send email" }, { status: 500 });
		}
		return Response.json({
			success: true,
			sent: true
		});
	};
}
//#endregion
export { createAuthEmailHandler as n, sendLovableEmail as r, EmailAPIError as t };
