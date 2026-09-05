// ─── Canonical data-truth model ────────────────────────────────────────────────
// Every externally-sourced value in Mission Control must carry a truth state.
// No API call succeeded ≠ connected. No error ≠ healthy. No data ≠ zero.

export type TruthState =
  | "live"
  | "cached"
  | "manual"
  | "stale"
  | "not_connected"
  | "unavailable"
  | "error";

export interface TruthMeta {
  truthState: TruthState;
  /** Human name of the origin: "Cloudflare API", "Manual record", … */
  source: string;
  /** ISO — when the external system observed the value */
  observedAt?: string | null;
  /** ISO — when we fetched it */
  fetchedAt?: string | null;
  /** ISO — last time an authenticated call actually succeeded */
  lastSuccessAt?: string | null;
  /** Real error text when truthState === 'error' */
  error?: string | null;
}

export const TRUTH_LABEL: Record<TruthState, string> = {
  live: "LIVE",
  cached: "CACHED",
  manual: "MANUAL",
  stale: "STALE",
  not_connected: "NOT CONNECTED",
  unavailable: "UNAVAILABLE",
  error: "ERROR",
};

/** Tailwind classes per state — restrained, premium, works in light + dark. */
export const TRUTH_TONE: Record<TruthState, string> = {
  live: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  cached: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/25",
  manual: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/25",
  stale: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
  not_connected: "text-muted-foreground bg-muted/40 border-border",
  unavailable: "text-muted-foreground bg-muted/40 border-border",
  error: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25",
};

/** "4m ago" / "3d ago" — returns null when we genuinely do not know. */
export function freshness(iso?: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/** Downgrade a successful fetch to `stale` once it ages past the window. */
export function ageState(meta: TruthMeta, staleAfterMs = 30 * 60 * 1000): TruthState {
  if (meta.truthState !== "live") return meta.truthState;
  const t = meta.fetchedAt ? Date.parse(meta.fetchedAt) : NaN;
  if (Number.isNaN(t)) return meta.truthState;
  return Date.now() - t > staleAfterMs ? "stale" : "live";
}

export function notConnected(source: string): TruthMeta {
  return { truthState: "not_connected", source, fetchedAt: null, lastSuccessAt: null };
}
