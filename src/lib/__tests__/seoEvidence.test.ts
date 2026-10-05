import { describe, expect, it } from "vitest";
import {
  issueEvidenceState,
  snapshotFreshness,
} from "@/lib/seoEvidence";

const now = Date.parse("2026-10-05T12:00:00Z");

describe("SEO evidence truth rules", () => {
  it("treats recent imported snapshots as fresh and old snapshots as stale/expired", () => {
    expect(
      snapshotFreshness(
        { date: "2026-10-01", importedAt: "2026-10-02T08:00:00Z" },
        now,
      ),
    ).toBe("fresh");
    expect(
      snapshotFreshness(
        { date: "2026-09-12", importedAt: "2026-09-13T08:00:00Z" },
        now,
      ),
    ).toBe("stale");
    expect(
      snapshotFreshness(
        { date: "2026-07-01", importedAt: "2026-07-02T08:00:00Z" },
        now,
      ),
    ).toBe("expired");
  });

  it("does not treat old manual audit findings as current live issues", () => {
    expect(
      issueEvidenceState(
        {
          status: "open",
          source: "manual",
          observedAt: "2026-08-24",
          evidence: "Historical audit evidence",
        },
        now,
      ),
    ).toBe("stale");
  });

  it("allows a manually revalidated issue to become current", () => {
    expect(
      issueEvidenceState(
        {
          status: "in-progress",
          source: "manual",
          observedAt: "2026-08-24",
          lastValidatedAt: "2026-10-03T08:00:00Z",
          evidence: "Rechecked manually",
        },
        now,
      ),
    ).toBe("current");
  });

  it("refuses to call an evidence-free issue current", () => {
    expect(
      issueEvidenceState(
        {
          status: "open",
          source: "gsc",
          observedAt: "2026-10-04",
          evidence: "",
        },
        now,
      ),
    ).toBe("unverified");
  });
});
