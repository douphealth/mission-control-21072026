// Server-only Lovable AI Gateway helpers.
// Used for (a) accurate multilingual speech-to-text and (b) multimodal file
// understanding (images, PDFs, documents). Never import from client code.

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const TRANSCRIBE_MODEL = "google/gemini-3.5-transcribe";
export const REASONING_MODEL = "openai/gpt-6-astra";

function apiKey(): string | undefined {
  return process.env["LOVABLE_API_KEY"];
}

export function hasGateway(): boolean {
  return Boolean(apiKey());
}

export class GatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Transcribe a complete audio file. Language is auto-detected (85+ languages)
 * unless an explicit BCP-47 code is passed.
 */
export async function transcribeAudio(
  file: File,
  language?: string,
): Promise<{ text: string } | null> {
  const key = apiKey();
  if (!key) return null;

  const form = new FormData();
  form.append("model", TRANSCRIBE_MODEL);
  const mime = (file.type || "audio/wav").split(";")[0];
  const ext =
    mime.includes("wav") || mime.includes("wave")
      ? "wav"
      : mime.includes("mp4") || mime.includes("m4a")
        ? "mp4"
        : mime.includes("ogg")
          ? "ogg"
          : mime.includes("mpeg") || mime.includes("mp3")
            ? "mp3"
            : "webm";
  // Gemini transcription rejects video/* parts — always declare audio/*.
  const audio = new File([await file.arrayBuffer()], `recording.${ext}`, {
    type: mime.startsWith("audio/") ? mime : `audio/${ext}`,
  });
  form.append("file", audio);
  if (language && language !== "auto" && /^[a-z]{2}(-[A-Za-z0-9]+)?$/.test(language)) {
    form.append("language", language);
  }
  form.append("stream", "true");

  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    throw new GatewayError(res.status, (await res.text().catch(() => "")).slice(0, 400));
  }

  let text = "";
  for await (const event of readSse(res)) {
    if (event.type === "transcript.text.delta" && typeof event.delta === "string") {
      text += event.delta;
    } else if (event.type === "transcript.text.done" && typeof event.text === "string") {
      text = event.text;
    }
  }
  const trimmed = text.trim();
  return trimmed ? { text: trimmed } : null;
}

export type ResponseInputPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string }
  | { type: "input_file"; filename: string; file_data: string };

/**
 * Streamed Responses-API call returning strict JSON matching `schema`.
 * Streaming is mandatory on this endpoint (reasoning runs can last minutes).
 */
export async function responsesJson<T = Record<string, unknown>>(opts: {
  system: string;
  parts: ResponseInputPart[];
  schemaName: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  signal?: AbortSignal;
}): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;

  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    signal: opts.signal,
    body: JSON.stringify({
      model: REASONING_MODEL,
      stream: true,
      instructions: opts.system,
      input: [{ role: "user", content: opts.parts }],
      reasoning: { effort: opts.effort ?? "low" },
      text: {
        format: {
          type: "json_schema",
          name: opts.schemaName,
          strict: true,
          schema: opts.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new GatewayError(res.status, (await res.text().catch(() => "")).slice(0, 400));
  }

  let text = "";
  for await (const event of readSse(res)) {
    if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      text += event.delta;
    } else if (event.type === "response.completed") {
      const completed = event.response as { output_text?: string | string[] } | undefined;
      const out = completed?.output_text;
      if (typeof out === "string" && out.trim()) text = out;
      else if (Array.isArray(out) && out.length) text = out.join("");
    }
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

type SseEvent = Record<string, unknown> & { type?: string };

async function* readSse(res: Response): AsyncGenerator<SseEvent> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let index: number;
    while ((index = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        yield JSON.parse(payload) as SseEvent;
      } catch {
        // ignore keep-alive / partial frames
      }
    }
  }
}
