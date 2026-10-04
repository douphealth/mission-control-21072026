// Client helper: sends recorded audio to the server transcription route
// (AI speech-to-text + structured classification) and normalizes the
// response into the shape the capture UI expects.

import { classifyTranscript, type VoiceCaptureResult } from "@/lib/voice.functions";
import { todayISO } from "@/lib/overdue";

export type VoiceFailureKind = "no_speech" | "provider_unavailable" | "bad_request";

export class VoiceCaptureRequestError extends Error {
  kind: VoiceFailureKind;
  retryable: boolean;

  constructor(message: string, kind: VoiceFailureKind, retryable = false) {
    super(message);
    this.name = "VoiceCaptureRequestError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export interface SmartCaptureResult extends VoiceCaptureResult {
  source: "ai" | "browser" | "local";
  failureKind?: VoiceFailureKind;
  provider?: "lovable" | "gemini" | "browser";
  agreement?: number | null;
  rawTranscript?: string;
  browserTranscript?: string;
  subtasks?: string[];
  tags?: string[];
  startTime?: string;
  endTime?: string;
  language?: string;
}

interface ServerResponse {
  transcript?: string;
  source?: "ai" | "browser";
  provider?: "lovable" | "gemini" | "browser";
  agreement?: number | null;
  rawTranscript?: string;
  browserTranscript?: string;
  structured?: {
    type?: VoiceCaptureResult["type"];
    title?: string;
    cleanedTranscript?: string;
    priority?: VoiceCaptureResult["priority"];
    dueDate?: string;
    startTime?: string;
    endTime?: string;
    url?: string;
    subtasks?: string[];
    tags?: string[];
    language?: string;
  } | null;
  error?: string;
  allowTextFallback?: boolean;
  failureKind?: VoiceFailureKind;
  retryable?: boolean;
}

const VALID_TYPES = new Set(["tasks", "notes", "ideas", "links"]);

export async function smartCapture(
  audio: Blob | null,
  browserTranscript: string,
  language = "auto",
  languageHint?: string | null,
): Promise<SmartCaptureResult> {
  const form = new FormData();
  if (audio && audio.size > 0) {
    const mime = (audio.type || "audio/webm").split(";")[0];
    const ext = mime.includes("mp4")
      ? "mp4"
      : mime.includes("ogg")
        ? "ogg"
        : mime.includes("wav")
          ? "wav"
          : "webm";
    form.append("audio", audio, `recording.${ext}`);
  }
  form.append("browserTranscript", browserTranscript ?? "");
  form.append("language", language || "auto");
  if (languageHint) form.append("languageHint", languageHint);
  form.append("localDate", todayISO());

  try {
    const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as ServerResponse;

    if (!res.ok || !data.transcript) {
      if (browserTranscript.trim()) {
        return { ...classifyTranscript(browserTranscript), source: "local" };
      }

      const kind: VoiceFailureKind =
        data.failureKind ??
        (res.status >= 500 ? "provider_unavailable" : data.allowTextFallback ? "no_speech" : "bad_request");

      if (kind === "no_speech" && data.allowTextFallback) {
        return {
          transcript: "",
          type: "notes" as const,
          title: "",
          source: "local" as const,
          failureKind: kind,
        };
      }

      throw new VoiceCaptureRequestError(
        data.error || "Could not transcribe the recording.",
        kind,
        data.retryable ?? res.status >= 500,
      );
    }

    const s = data.structured;
    // Keep the provider's raw transcript as the source of truth. Structured
    // cleanup is useful for titles/tags, but must never silently rewrite words
    // the user actually spoke.
    const transcript = data.transcript.trim();

    if (!s || !s.type || !VALID_TYPES.has(s.type)) {
      return { ...classifyTranscript(transcript), source: data.source ?? "local" };
    }

    const result: SmartCaptureResult = {
      transcript,
      type: s.type,
      title: (s.title || transcript.slice(0, 80)).trim(),
      source: data.source ?? "ai",
      provider: data.provider,
      agreement: typeof data.agreement === "number" ? data.agreement : null,
      rawTranscript: data.rawTranscript,
      browserTranscript: data.browserTranscript,
      subtasks: Array.isArray(s.subtasks) ? s.subtasks.filter(Boolean).slice(0, 20) : undefined,
      tags: Array.isArray(s.tags) ? s.tags.filter(Boolean).slice(0, 6) : undefined,
      language: typeof s.language === "string" ? s.language : undefined,
    };

    if (s.type === "tasks") {
      result.priority = s.priority ?? "medium";
      result.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(s.dueDate ?? "")
        ? s.dueDate
        : todayISO();
      if (/^\d{2}:\d{2}$/.test(s.startTime ?? "")) result.startTime = s.startTime;
      if (/^\d{2}:\d{2}$/.test(s.endTime ?? "")) result.endTime = s.endTime;
    }
    if (s.type === "links" && s.url) {
      result.url = /^https?:\/\//i.test(s.url) ? s.url : `https://${s.url}`;
    }

    return result;
  } catch (err) {
    if (browserTranscript.trim()) {
      return { ...classifyTranscript(browserTranscript), source: "local" };
    }
    if (err instanceof VoiceCaptureRequestError) throw err;
    throw err instanceof Error
      ? new VoiceCaptureRequestError(err.message, "provider_unavailable", true)
      : new VoiceCaptureRequestError("Transcription failed", "provider_unavailable", true);
  }
}
