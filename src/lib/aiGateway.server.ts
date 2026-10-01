// Server-only Lovable AI Gateway helpers.
// Used for (a) accurate multilingual speech-to-text and (b) multimodal file
// understanding (images, PDFs, documents). Never import from client code.

import { normalizeRequestedLanguage } from "@/lib/voiceCaptureQuality";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const TRANSCRIBE_MODEL = "google/gemini-3.5-transcribe";
export const REASONING_MODEL = "openai/gpt-6-astra";

function apiKey(): string | undefined {
  return process.env["LOVABLE_API_KEY"];
}

function geminiKey(): string | undefined {
  return process.env["GEMINI_API_KEY"];
}

export function gatewayStatus() {
  const lovable = Boolean(apiKey());
  const gemini = Boolean(geminiKey());
  return {
    configured: lovable || gemini,
    lovable,
    gemini,
  };
}

export function hasGateway(): boolean {
  return gatewayStatus().configured;
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
): Promise<{ text: string; provider: "lovable" | "gemini" } | null> {
  const key = apiKey();

  if (!key) {
    return transcribeAudioWithGemini(file, language);
  }

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
  const requestedLanguage = normalizeRequestedLanguage(language ?? "auto");
  if (requestedLanguage) form.append("language", requestedLanguage);
  form.append("stream", "true");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
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
    if (trimmed) return { text: trimmed, provider: "lovable" };
    return transcribeAudioWithGemini(file, language);
  } catch (error) {
    // If the Lovable transcription path is unavailable or rate-limited, use
    // the configured direct Gemini key rather than dropping to browser STT.
    const fallback = await transcribeAudioWithGemini(file, language).catch(() => null);
    if (fallback) return fallback;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function uploadGeminiAudio(
  file: File,
  key: string,
  signal: AbortSignal,
): Promise<{ uri: string; name?: string; mimeType: string } | null> {
  const mimeType = (file.type || "audio/wav").split(";")[0] || "audio/wav";
  const bytes = await file.arrayBuffer();

  const start = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({ file: { display_name: "mission-control-voice" } }),
  });
  if (!start.ok) return null;

  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) return null;

  const finish = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
      "Content-Type": mimeType,
    },
    signal,
    body: bytes,
  });
  if (!finish.ok) return null;

  const body = (await finish.json().catch(() => null)) as
    | { file?: { uri?: string; name?: string; mimeType?: string; mime_type?: string } }
    | null;
  const uri = body?.file?.uri;
  if (!uri) return null;
  return {
    uri,
    name: body?.file?.name,
    mimeType: body?.file?.mimeType || body?.file?.mime_type || mimeType,
  };
}

async function deleteGeminiFile(name: string | undefined, key: string) {
  if (!name) return;
  try {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, {
      method: "DELETE",
      headers: { "x-goog-api-key": key },
    });
  } catch {
    /* best-effort cleanup */
  }
}

async function genericGeminiAudioFallback(
  file: File,
  key: string,
  language?: string,
): Promise<{ text: string; provider: "gemini" } | null> {
  const requestedLanguage = normalizeRequestedLanguage(language ?? "auto");
  const mimeType = (file.type || "audio/wav").split(";")[0] || "audio/wav";
  const data = arrayBufferToBase64(await file.arrayBuffer());
  const languageRule = requestedLanguage
    ? `The spoken language is ${requestedLanguage}. Preserve that language exactly.`
    : "Detect the spoken language automatically and preserve it exactly.";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            {
              text: [
                "Transcribe this audio verbatim.",
                languageRule,
                "Do not summarize, translate, paraphrase, or omit words.",
                "Preserve proper nouns, domains, acronyms, numbers, and product names.",
                "Return only the transcript text.",
              ].join(" "),
            },
            { inlineData: { mimeType, data } },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      }),
    },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  return text ? { text, provider: "gemini" } : null;
}

async function transcribeAudioWithGemini(
  file: File,
  language?: string,
): Promise<{ text: string; provider: "gemini" } | null> {
  const key = geminiKey();
  if (!key) return null;

  const requestedLanguage = normalizeRequestedLanguage(language ?? "auto");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let uploaded: { uri: string; name?: string; mimeType: string } | null = null;

  try {
    uploaded = await uploadGeminiAudio(file, key, controller.signal);
    if (uploaded) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                fileData: {
                  fileUri: uploaded.uri,
                  mimeType: uploaded.mimeType,
                },
              }],
            }],
            generationConfig: {
              audioTranscriptionConfig: {
                languageCodes: requestedLanguage ? [requestedLanguage] : [],
                mode: "VERBATIM",
              },
            },
          }),
        },
      );

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = json.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();
        if (text) return { text, provider: "gemini" };
      }
    }

    // Compatibility fallback for transient dedicated-model/API failures.
    return await genericGeminiAudioFallback(file, key, language);
  } catch {
    return await genericGeminiAudioFallback(file, key, language).catch(() => null);
  } finally {
    clearTimeout(timeout);
    await deleteGeminiFile(uploaded?.name, key);
  }
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
  if (!key) return geminiResponsesJson<T>(opts);

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
      const completed = event.response as
        | {
            output_text?: string | string[];
            output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
          }
        | undefined;
      const out = completed?.output_text;
      if (typeof out === "string" && out.trim()) text = out;
      else if (Array.isArray(out) && out.length) text = out.join("");
      else if (!text.trim() && Array.isArray(completed?.output)) {
        const joined = completed.output
          .flatMap((item) => item.content ?? [])
          .filter((part) => part?.type === "output_text" && typeof part.text === "string")
          .map((part) => part.text as string)
          .join("");
        if (joined.trim()) text = joined;
      }
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

async function geminiResponsesJson<T>(opts: {
  system: string;
  parts: ResponseInputPart[];
  schemaName: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  signal?: AbortSignal;
}): Promise<T | null> {
  const key = geminiKey();
  if (!key) return null;
  const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = opts.parts.map((part) => {
    if (part.type === "input_text") return { text: part.text };
    const dataUrl = part.type === "input_image" ? part.image_url : part.file_data;
    const mimeType = dataUrl.match(/^data:([^;,]+)/i)?.[1] || (part.type === "input_image" ? "image/jpeg" : "application/octet-stream");
    const comma = dataUrl.indexOf(",");
    return { inlineData: { mimeType, data: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl } };
  });
  contents.unshift({ text: opts.system });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({ contents: [{ role: "user", parts: contents }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "")) as T; } catch { return null; }
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

  // Some proxies close an SSE stream without a final newline. Do not discard
  // the final transcript event in that case.
  const line = buffer.trim();
  if (line.startsWith("data:")) {
    const payload = line.slice(5).trim();
    if (payload && payload !== "[DONE]") {
      try {
        yield JSON.parse(payload) as SseEvent;
      } catch {
        // Ignore an incomplete final frame.
      }
    }
  }
}
