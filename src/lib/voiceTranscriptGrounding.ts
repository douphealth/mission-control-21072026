const WORD_RE = /[\p{L}\p{N}@._:/-]+/gu;

function canonicalToken(token: string): string {
  return token
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function words(text: string): string[] {
  return (text.match(WORD_RE) || []).map(canonicalToken).filter(Boolean);
}

function overlapRatio(a: string, b: string): number {
  const left = words(a);
  const right = words(b);
  if (!left.length || !right.length) return 0;

  const counts = new Map<string, number>();
  for (const token of left) counts.set(token, (counts.get(token) || 0) + 1);

  let overlap = 0;
  for (const token of right) {
    const count = counts.get(token) || 0;
    if (count <= 0) continue;
    overlap += 1;
    counts.set(token, count - 1);
  }
  return overlap / Math.max(left.length, right.length);
}

function lengthRatio(a: string, b: string): number {
  const left = words(a).length;
  const right = words(b).length;
  if (!left || !right) return 0;
  return Math.min(left, right) / Math.max(left, right);
}

/**
 * Accept an AI-cleaned transcript only when it remains strongly grounded in the
 * provider transcript. This allows punctuation, casing, diacritics and proper
 * noun fixes while rejecting paraphrases or dropped/added content.
 */
export function chooseGroundedTranscript(
  providerTranscript: string,
  cleanedTranscript?: string | null,
): string {
  const raw = providerTranscript.trim();
  const cleaned = cleanedTranscript?.trim() || "";
  if (!cleaned) return raw;

  const overlap = overlapRatio(raw, cleaned);
  const length = lengthRatio(raw, cleaned);
  return overlap >= 0.72 && length >= 0.78 ? cleaned : raw;
}

export function transcriptAgreement(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0;
  return Math.round(overlapRatio(a, b) * 100);
}
