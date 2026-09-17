// Server-only Anthropic API helper.
// Bolt environments provide ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL, and
// ANTHROPIC_SMALL_FAST_MODEL — we use those instead of the legacy Lovable gateway.

export const ANTHROPIC_BASE = (
  process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"
).replace(/\/$/, "");
export const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
export const ANTHROPIC_SMALL_MODEL =
  process.env.ANTHROPIC_SMALL_FAST_MODEL || "claude-haiku-4-5-20251001";

export function isAnthropicAvailable(): boolean {
  return Boolean(ANTHROPIC_KEY);
}

/**
 * Call the Anthropic Messages API and return the text content.
 * Returns null on any failure (caller decides fallback behavior).
 */
export async function anthropicComplete(
  systemPrompt: string,
  userContent: string,
  options?: { maxTokens?: number; jsonMode?: boolean },
): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;
  const maxTokens = options?.maxTokens ?? 4096;

  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_SMALL_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const textBlock = data.content?.find((c) => c.type === "text");
  return textBlock?.text ?? null;
}

/**
 * Call the Anthropic Messages API with a tool-use schema and return the parsed
 * tool input. Returns null on any failure.
 */
export async function anthropicToolUse(
  systemPrompt: string,
  userContent: string,
  tool: { name: string; description: string; input_schema: Record<string, unknown> },
  options?: { maxTokens?: number },
): Promise<Record<string, unknown> | null> {
  if (!ANTHROPIC_KEY) return null;
  const maxTokens = options?.maxTokens ?? 1024;

  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_SMALL_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      tools: [
        {
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        },
      ],
      tool_choice: { type: "tool", name: tool.name },
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    content?: { type: string; name?: string; input?: Record<string, unknown> }[];
  };
  const toolUse = data.content?.find((c) => c.type === "tool_use" && c.name === tool.name);
  return toolUse?.input ?? null;
}
