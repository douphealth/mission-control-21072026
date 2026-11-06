/** Browser-safe types for the DataForSEO rank checker. */
export type RankRow = { keyword: string; position: number | null; url: string | null; title: string | null; topDomain: string | null; serpFeatures: string[] };
export type RankCheck = { domain: string; checkedAt: string; costUsd: number; rows: RankRow[]; cached: boolean };
export const MAX_KEYWORDS = 10;
/** Normalize user keywords: trim, lowercase, dedupe, cap. */
export function cleanKeywords(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]/).map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_KEYWORDS);
}
export const bareDomain = (d: string) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
