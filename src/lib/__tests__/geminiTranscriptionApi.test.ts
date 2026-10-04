import { describe, expect, it } from "vitest";
import {
  buildGeminiTranscriptionRequest,
  extractGeminiInteractionTranscript,
} from "@/lib/aiGateway.server";

describe("Gemini transcription API contract", () => {
  it("uses the Gemini Interactions transcription schema in auto mode", () => {
    expect(
      buildGeminiTranscriptionRequest({
        uri: "https://example.invalid/files/abc",
        mimeType: "audio/wav",
        language: "auto",
      }),
    ).toEqual({
      model: "gemini-3.5-transcribe",
      input: [
        {
          type: "audio",
          uri: "https://example.invalid/files/abc",
          mime_type: "audio/wav",
        },
      ],
      generation_config: {
        transcription_config: {
          language_codes: [],
          mode: { type: "verbatim" },
        },
      },
    });
  });

  it("passes an explicit BCP-47 language when requested", () => {
    const request = buildGeminiTranscriptionRequest({
      uri: "file-uri",
      mimeType: "audio/wav",
      language: "el",
    });
    expect(request.generation_config.transcription_config.language_codes).toEqual(["el-GR"]);
  });

  it("extracts transcript text from Interactions model_output steps", () => {
    expect(
      extractGeminiInteractionTranscript({
        steps: [
          {
            type: "model_output",
            content: [
              { type: "text", text: "Καλημέρα " },
              { type: "text", text: "Αλέξη" },
            ],
          },
        ],
      }),
    ).toBe("Καλημέρα Αλέξη");
  });
});
