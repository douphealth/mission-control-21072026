import { describe, expect, it } from "vitest";
import {
  browserRecognitionLanguage,
  hasUsableVoiceCapture,
  normalizeRequestedLanguage,
} from "@/lib/voiceCaptureQuality";

describe("voice capture quality guards", () => {
  it("keeps quiet speech when browser recognition produced words", () => {
    expect(hasUsableVoiceCapture("  call the client  ", 800, 900)).toBe(true);
  });

  it("rejects an empty tap even when it produced a tiny WAV", () => {
    expect(hasUsableVoiceCapture("", 1800, 900)).toBe(false);
  });

  it("accepts a short but valid spoken phrase", () => {
    expect(hasUsableVoiceCapture("yes", 2200, 650)).toBe(true);
  });

  it("maps language preferences to browser BCP-47 locales", () => {
    expect(browserRecognitionLanguage("el", "en-US")).toBe("el-GR");
    expect(browserRecognitionLanguage("auto", "fr-CA")).toBe("fr-CA");
  });

  it("only forwards safe explicit language hints to the transcription provider", () => {
    expect(normalizeRequestedLanguage("en")).toBe("en");
    expect(normalizeRequestedLanguage("el-GR")).toBe("el-GR");
    expect(normalizeRequestedLanguage("auto")).toBeUndefined();
    expect(normalizeRequestedLanguage("not a language")).toBeUndefined();
  });
});
