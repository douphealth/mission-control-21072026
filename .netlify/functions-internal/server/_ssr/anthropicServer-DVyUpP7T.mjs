//#region node_modules/.nitro/vite/services/ssr/assets/anthropicServer-DVyUpP7T.js
var ANTHROPIC_BASE = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
var ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
var ANTHROPIC_SMALL_MODEL = process.env.ANTHROPIC_SMALL_FAST_MODEL || "claude-haiku-4-5-20251001";
function isAnthropicAvailable() {
	return Boolean(ANTHROPIC_KEY);
}
/**
* Call the Anthropic Messages API and return the text content.
* Returns null on any failure (caller decides fallback behavior).
*/
async function anthropicComplete(systemPrompt, userContent, options) {
	if (!ANTHROPIC_KEY) return null;
	const maxTokens = options?.maxTokens ?? 4096;
	const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
		method: "POST",
		headers: {
			"x-api-key": ANTHROPIC_KEY,
			"anthropic-version": "2023-06-01",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model: ANTHROPIC_SMALL_MODEL,
			max_tokens: maxTokens,
			system: systemPrompt,
			messages: [{
				role: "user",
				content: userContent
			}]
		})
	});
	if (!res.ok) return null;
	return ((await res.json()).content?.find((c) => c.type === "text"))?.text ?? null;
}
/**
* Call the Anthropic Messages API with a tool-use schema and return the parsed
* tool input. Returns null on any failure.
*/
async function anthropicToolUse(systemPrompt, userContent, tool, options) {
	if (!ANTHROPIC_KEY) return null;
	const maxTokens = options?.maxTokens ?? 1024;
	const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
		method: "POST",
		headers: {
			"x-api-key": ANTHROPIC_KEY,
			"anthropic-version": "2023-06-01",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model: ANTHROPIC_SMALL_MODEL,
			max_tokens: maxTokens,
			system: systemPrompt,
			messages: [{
				role: "user",
				content: userContent
			}],
			tools: [{
				name: tool.name,
				description: tool.description,
				input_schema: tool.input_schema
			}],
			tool_choice: {
				type: "tool",
				name: tool.name
			}
		})
	});
	if (!res.ok) return null;
	return ((await res.json()).content?.find((c) => c.type === "tool_use" && c.name === tool.name))?.input ?? null;
}
//#endregion
export { anthropicToolUse as a, anthropicComplete as i, ANTHROPIC_KEY as n, isAnthropicAvailable as o, ANTHROPIC_SMALL_MODEL as r, ANTHROPIC_BASE as t };
