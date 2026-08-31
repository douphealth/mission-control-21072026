// ─── Anti-chaos: deterministic fingerprints, cooldowns, regressions ──────────
// One underlying problem must produce exactly one unit of work, no matter how
// many scanners observe it or how many times they run.

export function normalizeFingerprintPart(part: unknown): string {
  if (part == null) return '';
  return String(part)
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[\s_]+/g, ' ')
    .replace(/[^a-z0-9 ./:-]/g, '')
    .trim();
}

/** Stable 32-bit FNV-1a hash, rendered as 8 hex chars. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Deterministic identity for a finding. Same inputs → same fingerprint on any
 * device, in any order-independent scan.
 */
export function fingerprint(kind: string, parts: unknown[]): string {
  const body = parts.map(normalizeFingerprintPart).filter(Boolean).join('|');
  return `${normalizeFingerprintPart(kind) || 'finding'}:${fnv1a(body)}`;
}

export const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 } as const;
export type Severity = keyof typeof SEVERITY_RANK;

/** A resolved finding stays quiet until its cooldown expires. */
export function isSuppressed(
  record: { status: string; cooldownUntil?: string; deferUntil?: string },
  now: Date = new Date(),
): boolean {
  const ts = now.getTime();
  if (record.cooldownUntil && new Date(record.cooldownUntil).getTime() > ts) return true;
  if (record.status === 'later' && record.deferUntil && new Date(`${record.deferUntil}T23:59:59`).getTime() > ts) {
    return true;
  }
  return false;
}

/**
 * A regression is a finding that comes back *after* it was resolved and its
 * cooldown expired, or that comes back materially worse than when resolved.
 */
export function isRegression(
  record: { status: string; severity: Severity; cooldownUntil?: string },
  incomingSeverity: Severity | undefined,
  now: Date = new Date(),
): boolean {
  const resolved = record.status === 'acted' || record.status === 'ignored';
  if (!resolved) return false;
  const worse =
    !!incomingSeverity && SEVERITY_RANK[incomingSeverity] > SEVERITY_RANK[record.severity];
  if (worse) return true;
  return !isSuppressed(record, now);
}

export function cooldownFrom(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}
