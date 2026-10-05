import { describe, expect, it } from "vitest";
import {
  browserEnvironmentLanguageHint,
  browserRecognitionLanguage,
  hasUsableVoiceCapture,
  inferLanguageFromTranscript,
  normalizeRequestedLanguage,
  shouldUseServerVoiceCapture,
  voiceServerBackoffMs,
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

  it("does not mistake timezone for language when Chrome declares English", () => {
    expect(browserEnvironmentLanguageHint(["en-US"], "en-US", "Europe/Athens")).toBe("en");
  });

  it("uses regional Greek only when the browser exposes no usable language", () => {
    expect(browserEnvironmentLanguageHint([], "", "Europe/Athens")).toBe("el");
  });

  it("prefers an explicit Greek browser locale over timezone inference", () => {
    expect(browserEnvironmentLanguageHint(["el-GR", "en-US"], "en-US", "Europe/London")).toBe("el");
  });

  it("normalizes explicit language hints for the transcription provider", () => {
    expect(normalizeRequestedLanguage("en")).toBe("en-US");
    expect(normalizeRequestedLanguage("el")).toBe("el-GR");
    expect(normalizeRequestedLanguage("el-GR")).toBe("el-GR");
    expect(normalizeRequestedLanguage("ar")).toBe("ar-EG");
    expect(normalizeRequestedLanguage("zh")).toBe("cmn-Hans-CN");
    expect(normalizeRequestedLanguage("auto")).toBeUndefined();
    expect(normalizeRequestedLanguage("not a language")).toBeUndefined();
  });
  it("infers several non-Latin script families locally", () => {
    expect(inferLanguageFromTranscript("Привет как дела")).toBe("ru");
    expect(inferLanguageFromTranscript("مرحبا كيف حالك")).toBe("ar");
    expect(inferLanguageFromTranscript("こんにちは世界")).toBe("ja");
    expect(inferLanguageFromTranscript("안녕하세요 세계")).toBe("ko");
  });

  it("backs off the server after a transcription failure instead of looping forever", () => {
    const now = 1_000_000;
    expect(
      shouldUseServerVoiceCapture({
        serverReady: true,
        browserRecognitionAvailable: true,
        serverFailureUntil: now + 30_000,
        now,
      }),
    ).toBe(false);
    expect(
      shouldUseServerVoiceCapture({
        serverReady: true,
        browserRecognitionAvailable: true,
        serverFailureUntil: now - 1,
        now,
      }),
    ).toBe(true);
  });

  it("uses bounded exponential server backoff", () => {
    expect(voiceServerBackoffMs(1)).toBe(15_000);
    expect(voiceServerBackoffMs(2)).toBe(30_000);
    expect(voiceServerBackoffMs(10)).toBe(300_000);
  });
});
