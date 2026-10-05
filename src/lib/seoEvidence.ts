import type { SEOIssue, SEOSnapshot } from "@/lib/db";

export type EvidenceFreshness = "fresh" | "stale" | "expired" | "missing";
export type SEOIssueEvidenceState = "current" | "stale" | "unverified" | "closed";

export const SEO_SNAPSHOT_FRESH_DAYS = 14;
export const SEO_SNAPSHOT_EXPIRED_DAYS = 45;
export const SEO_ISSUE_FRESH_DAYS = 30;
export const SEO_MANUAL_ISSUE_FRESH_DAYS = 14;

export function evidenceAgeDays(value?: string, now = Date.now()): number | null {
  if (!value) return null;
  const ts = Date.parse(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((now - ts) / 86_400_000));
}

export function snapshotFreshness(
  snapshot?: Pick<SEOSnapshot, "date" | "importedAt">,
  now = Date.now(),
): EvidenceFreshness {
  if (!snapshot) return "missing";
  const observedAge = evidenceAgeDays(snapshot.date, now);
  const importedAge = evidenceAgeDays(snapshot.importedAt, now);
  const age =
    observedAge === null
      ? importedAge
      : importedAge === null
        ? observedAge
        : Math.max(observedAge, importedAge);

  if (age === null) return "missing";
  if (age <= SEO_SNAPSHOT_FRESH_DAYS) return "fresh";
  if (age <= SEO_SNAPSHOT_EXPIRED_DAYS) return "stale";
  return "expired";
}

export function issueEvidenceState(
  issue: Pick<
    SEOIssue,
    "status" | "source" | "observedAt" | "lastValidatedAt" | "evidence"
  >,
  now = Date.now(),
): SEOIssueEvidenceState {
  if (issue.status !== "open" && issue.status !== "in-progress") return "closed";

  const evidenceAt = issue.lastValidatedAt || issue.observedAt;
  const age = evidenceAgeDays(evidenceAt, now);
  const hasEvidence = Boolean(issue.evidence?.trim());

  if (!hasEvidence || age === null) return "unverified";

  const maxAge =
    issue.source === "manual" && !issue.lastValidatedAt
      ? SEO_MANUAL_ISSUE_FRESH_DAYS
      : SEO_ISSUE_FRESH_DAYS;

  return age <= maxAge ? "current" : "stale";
}

export function isCurrentSEOIssue(
  issue: Pick<
    SEOIssue,
    "status" | "source" | "observedAt" | "lastValidatedAt" | "evidence"
  >,
  now = Date.now(),
): boolean {
  return issueEvidenceState(issue, now) === "current";
}

export function latestSnapshotBySite(
  snapshots: SEOSnapshot[],
): Map<string, SEOSnapshot> {
  const out = new Map<string, SEOSnapshot>();
  for (const snapshot of snapshots) {
    const current = out.get(snapshot.websiteId);
    if (
      !current ||
      snapshot.date > current.date ||
      (snapshot.date === current.date && snapshot.importedAt > current.importedAt)
    ) {
      out.set(snapshot.websiteId, snapshot);
    }
  }
  return out;
}
