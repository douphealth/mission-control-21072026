//#region node_modules/.nitro/vite/services/ssr/index.js
var lastCapturedError;
function consumeLastCapturedError() {
	const error = lastCapturedError;
	lastCapturedError = void 0;
	return error;
}
var originalConsoleError = console.error.bind(console);
console.error = (...args) => {
	lastCapturedError = args[0];
	originalConsoleError(...args);
};
function renderErrorPage() {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Mission Control</title></head><body style="margin:0;background:#0d0f14;color:#f8fafc;font-family:system-ui,sans-serif;display:grid;min-height:100vh;place-items:center"><main style="max-width:560px;padding:32px;text-align:center"><h1>Mission Control didn't load</h1><p style="color:#94a3b8">Refresh the preview and try again.</p></main></body></html>`;
}
var serverEntryPromise;
async function getServerEntry() {
	if (!serverEntryPromise) serverEntryPromise = import("./server-BEODbGZS.mjs").then((n) => n.t).then((m) => m.default ?? m);
	return serverEntryPromise;
}
async function normalizeCatastrophicSsrResponse(response) {
	if (response.status < 500) return response;
	if (!(response.headers.get("content-type") ?? "").includes("application/json")) return response;
	const body = await response.clone().text();
	if (!isH3SwallowedErrorBody(body)) return response;
	console.error(consumeLastCapturedError() ?? /* @__PURE__ */ new Error(`h3 swallowed SSR error: ${body}`));
	return new Response(renderErrorPage(), {
		status: 500,
		headers: { "content-type": "text/html; charset=utf-8" }
	});
}
function isH3SwallowedErrorBody(body) {
	try {
		const payload = JSON.parse(body);
		return payload.unhandled === true && payload.message === "HTTPError";
	} catch {
		return false;
	}
}
var server_default = { async fetch(request, env, ctx) {
	try {
		return await normalizeCatastrophicSsrResponse(await (await getServerEntry()).fetch(request, env, ctx));
	} catch (error) {
		console.error(error);
		return new Response(renderErrorPage(), {
			status: 500,
			headers: { "content-type": "text/html; charset=utf-8" }
		});
	}
} };
//#endregion
export { server_default as default, renderErrorPage as t };
