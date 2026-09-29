import { describe, expect, it } from "vitest";
import {
  browserEnvironmentLanguageHint,
  browserRecognitionLanguage,
  hasUsableVoiceCapture,
  inferLanguageFromTranscript,
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

  it("sends quiet captured audio to server STT even when browser recognition heard nothing", () => {
    expect(hasUsableVoiceCapture("", 18_000, 900)).toBe(true);
  });

  it("maps explicit language preferences to browser BCP-47 locales", () => {
    expect(browserRecognitionLanguage("el", "en-US")).toBe("el-GR");
    expect(browserRecognitionLanguage("en", "el-GR")).toBe("en-US");
  });

  it("uses the learned adaptive language before the browser locale in auto mode", () => {
    expect(browserRecognitionLanguage("auto", "en-US", "el")).toBe("el-GR");
    expect(browserRecognitionLanguage("auto", "fr-CA", null)).toBe("fr-CA");
  });

  it("infers Greek from Greek-script transcripts", () => {
    expect(inferLanguageFromTranscript("Θέλω να τηλεφωνήσω αύριο στον Γιώργο")).toBe("el");
    expect(inferLanguageFromTranscript("Call the client tomorrow morning")).toBe("en");
  });

  it("uses Greek as a regional fallback when Chrome is English but the device timezone is Athens", () => {
    expect(browserEnvironmentLanguageHint(["en-US"], "en-US", "Europe/Athens")).toBe("el");
  });

  it("prefers an explicit Greek browser locale over timezone inference", () => {
    expect(browserEnvironmentLanguageHint(["el-GR", "en-US"], "en-US", "Europe/London")).toBe("el");
  });

  it("normalizes explicit language hints for the transcription provider", () => {
    expect(normalizeRequestedLanguage("en")).toBe("en-US");
    expect(normalizeRequestedLanguage("el")).toBe("el-GR");
    expect(normalizeRequestedLanguage("el-GR")).toBe("el-GR");
    expect(normalizeRequestedLanguage("auto")).toBeUndefined();
    expect(normalizeRequestedLanguage("not a language")).toBeUndefined();
  });
});
