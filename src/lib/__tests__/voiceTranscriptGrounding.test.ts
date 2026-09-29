import { describe, expect, it } from "vitest";
import { chooseGroundedTranscript, transcriptAgreement } from "@/lib/voiceTranscriptGrounding";

describe("voice transcript grounding", () => {
  it("accepts punctuation and casing cleanup when the words stay grounded", () => {
    expect(
      chooseGroundedTranscript(
        "remind me to call alexios tomorrow",
        "Remind me to call Alexios tomorrow.",
      ),
    ).toBe("Remind me to call Alexios tomorrow.");
  });

  it("rejects a cleaned transcript that paraphrases or drops too much content", () => {
    const raw = "send the client the report and call maria tomorrow morning";
    expect(chooseGroundedTranscript(raw, "Contact Maria tomorrow.")).toBe(raw);
  });

  it("reports word overlap as a cross-check rather than a confidence score", () => {
    expect(transcriptAgreement("call maria tomorrow", "call maria tomorrow")).toBe(100);
    expect(transcriptAgreement("call maria tomorrow", "email george today")).toBe(0);
  });
});
