import { afterEach, describe, expect, it, vi } from "vitest";
import {
  smartCapture,
  VoiceCaptureRequestError,
} from "@/lib/voiceAi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("voice AI failure semantics", () => {
  it("treats no-speech as a retryable user recording miss, not a provider outage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "I could not make out any speech in that recording. Try again.",
            failureKind: "no_speech",
            retryable: false,
            allowTextFallback: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await smartCapture(new Blob(["audio"]), "", "auto");
    expect(result.transcript).toBe("");
    expect(result.failureKind).toBe("no_speech");
  });

  it("surfaces a provider outage distinctly so the UI can back off only that path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "Multilingual AI transcription is temporarily unavailable.",
            failureKind: "provider_unavailable",
            retryable: true,
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(smartCapture(new Blob(["audio"]), "", "auto")).rejects.toMatchObject({
      name: "VoiceCaptureRequestError",
      kind: "provider_unavailable",
      retryable: true,
    } satisfies Partial<VoiceCaptureRequestError>);
  });

  it("uses a browser transcript immediately when the server path is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "Multilingual AI transcription is temporarily unavailable.",
            failureKind: "provider_unavailable",
            retryable: true,
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await smartCapture(null, "Υπενθύμισέ μου να τηλεφωνήσω αύριο", "el");
    expect(result.transcript).toContain("Υπενθύμισέ");
    expect(result.source).toBe("local");
  });
});
