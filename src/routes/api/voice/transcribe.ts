import { createFileRoute } from "@tanstack/react-router";

const AI_BASE = "https://ai.gateway.lovable.dev/v1";
const STT_MODEL = "openai/gpt-4o-transcribe";
const CLASSIFY_MODEL = "google/gemini-2.5-flash";
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED_AUDIO = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
]);

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mpga": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are the capture brain of "Mission Control", a personal work dashboard.
You receive a raw voice transcript in ANY language. Clean it up and turn it into one structured item.

Rules:
- ALWAYS keep the speaker's original language for title and cleanedTranscript. Never translate.
- Fix obvious speech-recognition errors, punctuation, casing, diacritics and de-duplicate stuttered/repeated phrases.
- Set language to the BCP-47 code of the detected spoken language (e.g. en, el, de, fr).
- NEVER invent content that was not said.
- Classify into exactly one of: tasks | notes | ideas | links.
- title: a short, human, imperative summary (max 80 chars, no trailing period).
- cleanedTranscript: the full corrected text of what was said.
- For tasks: set priority (critical|high|medium|low) and dueDate (YYYY-MM-DD) resolved from natural language relative to the provided current date. If no date is mentioned, use the current date.
- For tasks: if the speaker lists several actions, put the extra ones in subtasks (array of short strings).
- For tasks: startTime/endTime as HH:MM (24h) only if a time was actually mentioned.
- For links: extract the url (add https:// if missing).
- tags: 1-4 short lowercase keywords.
Respond with the tool call only.`;

const TOOL = {
  type: "function",
  function: {
    name: "capture_item",
    description: "Structure a voice capture into a Mission Control item",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["tasks", "notes", "ideas", "links"] },
        language: { type: "string" },
        title: { type: "string" },
        cleanedTranscript: { type: "string" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        dueDate: { type: "string" },
        startTime: { type: "string" },
        endTime: { type: "string" },
        url: { type: "string" },
        subtasks: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["type", "title", "cleanedTranscript"],
      additionalProperties: false,
    },
  },
} as const;

const STT_PROMPT =
  "Personal productivity voice memo. Transcribe verbatim in the spoken language, with correct punctuation. " +
  "Keep proper nouns, product names, URLs, dates and times exact. Do not translate, summarize or add words.";

async function transcribe(apiKey: string, file: File, language?: string): Promise<string> {
  const mime = (file.type || "audio/webm").split(";")[0];
  const ext = EXT_BY_MIME[mime] ?? "webm";

  const buildForm = () => {
    const form = new FormData();
    form.append("model", STT_MODEL);
    form.append("file", file, `recording.${ext}`);
    form.append("prompt", STT_PROMPT);
    form.append("temperature", "0");
    if (language && language !== "auto") form.append("language", language);
    return form;
  };

  let res!: globalThis.Response;
  // Bounded retry: only transient failures (429 / 5xx) are retried.
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${AI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: buildForm(),
    });
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 800 * Math.pow(2, attempt) + Math.random() * 400;
    if (attempt < 2) await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let message = detail;
    try {
      const parsed = JSON.parse(detail) as {
        error?: { message?: string } | string;
        message?: string;
      };
      message =
        typeof parsed.error === "string"
          ? parsed.error
          : parsed.error?.message || parsed.message || detail;
    } catch {
      /* keep upstream text */
    }
    throw new Response(
      JSON.stringify({ error: message.slice(0, 500) || `Transcription failed (${res.status})` }),
      { status: res.status, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

async function classify(apiKey: string, transcript: string, hint?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${AI_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLASSIFY_MODEL,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\nCurrent date: ${today}.` },
        {
          role: "user",
          content: hint
            ? `Primary transcript:\n"""${transcript}"""\n\nSecondary (browser) transcript for cross-checking wording:\n"""${hint}"""`
            : `Transcript:\n"""${transcript}"""`,
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "capture_item" } },
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  try {
    return JSON.parse(args) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json({ error: "AI is not configured on this project." }, 500);

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("multipart/form-data")) {
          return json({ error: "Expected multipart/form-data upload." }, 400);
        }

        const form = await request.formData();
        const file = form.get("audio");
        const browserTranscript = String(form.get("browserTranscript") ?? "").trim();
        const rawLanguage = String(form.get("language") ?? "auto").trim();
        const language = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/.test(rawLanguage)
          ? rawLanguage.slice(0, 2)
          : undefined;

        if (!(file instanceof File) || file.size === 0) {
          if (browserTranscript) {
            const structured = await classify(apiKey, browserTranscript);
            return json({ transcript: browserTranscript, source: "browser", structured });
          }
          return json({ error: "No audio received." }, 400);
        }
        if (file.size > MAX_BYTES) return json({ error: "Recording is too large." }, 413);
        const mime = (file.type || "").split(";")[0];
        if (!ACCEPTED_AUDIO.has(mime))
          return json({ error: "Unsupported audio format. Please record again." }, 400);

        try {
          let transcript = await transcribe(apiKey, file, language);
          let source: "ai" | "browser" = "ai";

          // If the model heard nothing useful, fall back to the browser transcript.
          if (transcript.replace(/\W/g, "").length < 2 && browserTranscript) {
            transcript = browserTranscript;
            source = "browser";
          }
          if (!transcript) return json({ error: "No speech detected in the recording." }, 422);

          const structured = await classify(
            apiKey,
            transcript,
            source === "ai" ? browserTranscript : undefined,
          );
          return json({ transcript, source, structured });
        } catch (err) {
          if (err instanceof Response) return err;
          const message = err instanceof Error ? err.message : "Transcription failed";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
