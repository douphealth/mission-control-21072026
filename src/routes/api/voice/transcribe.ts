// ── Voice transcription + classification route ──────────────────────────────
// The browser transcribes speech via Chrome SpeechRecognition (supports Greek
// and 14+ languages). This route classifies the transcript via Anthropic and
// returns structured data. Falls back gracefully if AI is unavailable.

import { createFileRoute } from "@tanstack/react-router";
import { anthropicToolUse, isAnthropicAvailable } from "@/lib/anthropicServer";

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
You MUST call the capture_item tool.`;

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

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("multipart/form-data")) {
          return json({ error: "Expected multipart/form-data upload." }, 400);
        }

        const form = await request.formData();
        const file = form.get("audio");
        const browserTranscript = String(form.get("browserTranscript") ?? "").trim();
        const hasAudio = file instanceof File && file.size > 0;

        if (!browserTranscript) {
          if (hasAudio) {
            return json(
              {
                error:
                  "Browser did not transcribe the audio. Try using Chrome for voice capture, or type your note instead.",
              },
              422,
            );
          }
          return json({ error: "No audio or transcript received." }, 400);
        }

        // Try AI classification via Anthropic
        if (isAnthropicAvailable()) {
          const today = new Date().toISOString().slice(0, 10);
          const structured = await anthropicToolUse(
            `${SYSTEM_PROMPT}\nCurrent date: ${today}.`,
            `Transcript:\n"""${browserTranscript}"""`,
            {
              name: "capture_item",
              description: "Structure a voice capture into a Mission Control item",
              input_schema: TOOL_SCHEMA,
            },
          );

          if (structured) {
            return json({
              transcript: (structured.cleanedTranscript as string) || browserTranscript,
              source: "browser" as const,
              structured,
            });
          }
        }

        // AI unavailable or failed — return raw transcript for client-side classification
        return json({
          transcript: browserTranscript,
          source: "browser" as const,
          structured: null,
        });
      },
    },
  },
});
