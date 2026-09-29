import { describe, expect, it } from "vitest";
import {
  appendSpeechSegment,
  compressRepeatedPhrases,
  countTranscriptWords,
  maxReasonableVoiceWords,
  sanitizeVoiceTranscript,
} from "@/lib/speechTranscript";

describe("voice transcript deduplication", () => {
  it("does not append a long Chrome replay that already exists in the transcript", () => {
    const phrase = Array.from({ length: 50 }, (_, i) => `word${i + 1}`).join(" ");
    expect(appendSpeechSegment(phrase, phrase)).toBe(phrase);
  });

  it("collapses repeated long blocks instead of allowing runaway inflation", () => {
    const phrase = Array.from({ length: 50 }, (_, i) => `λέξη${i + 1}`).join(" ");
    const inflated = Array.from({ length: 20 }, () => phrase).join(" ");
    const cleaned = sanitizeVoiceTranscript(inflated);
    expect(countTranscriptWords(cleaned)).toBe(50);
  });

  it("merges cumulative recognition snapshots without duplicating the existing prefix", () => {
    const base = "θέλω να γράψω μία σύντομη σημείωση";
    const cumulative = "θέλω να γράψω μία σύντομη σημείωση για το αυριανό ραντεβού";
    expect(appendSpeechSegment(base, cumulative)).toBe(cumulative);
  });

  it("allows generous but finite spoken-word limits by recording duration", () => {
    expect(maxReasonableVoiceWords(10_000)).toBe(80);
    expect(maxReasonableVoiceWords(60_000)).toBe(330);
  });

  it("still compresses ordinary adjacent phrase stutter", () => {
    expect(compressRepeatedPhrases("call maria tomorrow call maria tomorrow")).toBe("call maria tomorrow");
  });
});
