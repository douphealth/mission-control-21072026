// ── Voice transcription + classification route ──────────────────────────────
// 1. The recorded audio is transcribed server-side with a multilingual
//    speech-to-text model that auto-detects the spoken language (85+ langs).
// 2. The resulting transcript is structured into one Mission Control item.
// The browser's own SpeechRecognition transcript (when available) is used as a
// hint and as a fallback if server transcription is unavailable.

import { createFileRoute } from "@tanstack/react-router";
import { anthropicToolUse, isAnthropicAvailable } from "@/lib/anthropicServer";
import { gatewayStatus, hasGateway, responsesJson, transcribeAudio } from "@/lib/aiGateway.server";
import { chooseGroundedTranscript, transcriptAgreement } from "@/lib/voiceTranscriptGrounding";

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
- Use null for any field that does not apply.`;

const TOOL_SCHEMA = {
  type: "object" as const,
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
};

// Strict-mode variant for the Responses API: every property required,
// optional values expressed as nullable types.
const STRICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["tasks", "notes", "ideas", "links"] },
    language: { type: ["string", "null"] },
    title: { type: "string" },
    cleanedTranscript: { type: "string" },
    priority: { type: ["string", "null"], enum: ["critical", "high", "medium", "low", null] },
    dueDate: { type: ["string", "null"] },
    startTime: { type: ["string", "null"] },
    endTime: { type: ["string", "null"] },
    url: { type: ["string", "null"] },
    subtasks: { type: ["array", "null"], items: { type: "string" } },
    tags: { type: ["array", "null"], items: { type: "string" } },
  },
  required: [
    "type",
    "language",
    "title",
    "cleanedTranscript",
    "priority",
    "dueDate",
    "startTime",
    "endTime",
    "url",
    "subtasks",
    "tags",
  ],
};

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      GET: async () => {
        const gateway = gatewayStatus();
        return json({
          ok: true,
          transcriptionConfigured: gateway.configured,
          providers: {
            lovable: gateway.lovable,
            gemini: gateway.gemini,
          },
          mode: gateway.configured ? "ai_multilingual" : "browser_fallback",
          browserFallbackSupported: true,
        });
      },
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("multipart/form-data")) {
          return json({ error: "Expected multipart/form-data upload." }, 400);
        }

        const form = await request.formData();
        const file = form.get("audio");
        const browserTranscript = String(form.get("browserTranscript") ?? "").trim();
        const requestedLanguage = String(form.get("language") ?? "auto").trim();
        const languageHint = String(form.get("languageHint") ?? "").trim();
        const localDateRaw = String(form.get("localDate") ?? "").trim();
        const localDate = /^\d{4}-\d{2}-\d{2}$/.test(localDateRaw)
          ? localDateRaw
          : new Date().toISOString().slice(0, 10);
        const hasAudio = file instanceof File && file.size > 2048;

        // ── 1. Server-side speech-to-text (auto language detection) ─────────
        let transcript = "";
        let source: "ai" | "browser" = "browser";
        let provider: "lovable" | "gemini" | "browser" = "browser";
        let transcriptionError: unknown = null;

        if (hasAudio) {
          try {
            // The AI audio model can genuinely detect language. Keep "auto"
            // truly automatic instead of forcing a browser-derived hint.
            const result = await transcribeAudio(file as File, requestedLanguage);
            if (result?.text) {
              transcript = result.text;
              source = "ai";
              provider = result.provider;
            }
          } catch (err) {
            transcriptionError = err;
            console.error("[voice] transcription failed", err);
          }
        }

        // Prefer the accurate server transcript; fall back to the browser's.
        if (!transcript) transcript = browserTranscript;

        if (!transcript) {
          if (hasAudio && transcriptionError) {
            return json(
              {
                error: "Multilingual AI transcription is temporarily unavailable.",
                failureKind: "provider_unavailable",
                retryable: true,
              },
              503,
            );
          }

          return json(
            {
              error: hasAudio
                ? "I could not make out any speech in that recording. Try again."
                : "No audio or transcript received.",
              failureKind: hasAudio ? "no_speech" : "bad_request",
              retryable: false,
              allowTextFallback: hasAudio,
            },
            hasAudio ? 200 : 400,
          );
        }

        const today = localDate;

        // ── 2. Structure the transcript ─────────────────────────────────────
        if (hasGateway()) {
          try {
            const structured = await responsesJson<Record<string, unknown>>({
              system: `${SYSTEM_PROMPT}\nCurrent date: ${today}.`,
              parts: [{
                type: "input_text",
                text: [
                  `Primary audio transcript:\n"""${transcript}"""`,
                  browserTranscript
                    ? `Browser recognition hypothesis (use only to correct names/domains/obvious recognition errors, never to add content):\n"""${browserTranscript}"""`
                    : "",
                  requestedLanguage === "auto" && languageHint
                    ? `Previous successful language hint: ${languageHint}. This is only a hint; trust the actual transcript language.`
                    : "",
                ].filter(Boolean).join("\n\n"),
              }],
              schemaName: "capture_item",
              schema: STRICT_SCHEMA,
              effort: "low",
            });
            if (structured) {
              const cleanedTranscript =
                typeof structured.cleanedTranscript === "string"
                  ? structured.cleanedTranscript
                  : null;
              return json({
                transcript: chooseGroundedTranscript(transcript, cleanedTranscript),
                rawTranscript: transcript,
                browserTranscript,
                agreement: browserTranscript ? transcriptAgreement(transcript, browserTranscript) : null,
                source,
                provider,
                structured,
              });
            }
          } catch (err) {
            console.error("[voice] classification failed", err);
          }
        }

        if (isAnthropicAvailable()) {
          const structured = await anthropicToolUse(
            `${SYSTEM_PROMPT}\nCurrent date: ${today}.`,
            [
              `Primary audio transcript:\n"""${transcript}"""`,
              browserTranscript
                ? `Browser recognition hypothesis (correction hints only):\n"""${browserTranscript}"""`
                : "",
            ].filter(Boolean).join("\n\n"),
            {
              name: "capture_item",
              description: "Structure a voice capture into a Mission Control item",
              input_schema: TOOL_SCHEMA,
            },
          );

          if (structured) {
            const cleanedTranscript =
              typeof structured.cleanedTranscript === "string"
                ? structured.cleanedTranscript
                : null;
            return json({
              transcript: chooseGroundedTranscript(transcript, cleanedTranscript),
              rawTranscript: transcript,
              browserTranscript,
              agreement: browserTranscript ? transcriptAgreement(transcript, browserTranscript) : null,
              source,
              provider,
              structured,
            });
          }
        }

        // AI unavailable — return the transcript for client-side classification.
        return json({ transcript, rawTranscript: transcript, browserTranscript, agreement: browserTranscript ? transcriptAgreement(transcript, browserTranscript) : null, source, provider, structured: null });
      },
    },
  },
});
