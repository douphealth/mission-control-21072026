import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { ConnectorEmpty, ConnectorError, TruthBadge } from "@/components/TruthUI";
import type { EstateState } from "@/hooks/useEstate";
import type { EstateTruth } from "@/lib/estate/types";
import type { TruthState } from "@/lib/truth";
import { ago, Kbd } from "@/components/estate/bits";

export function truthOf(state: EstateState, part: EstateTruth | undefined): TruthState {
  if (!state.snapshot || !part)
    return state.gate && state.gate !== "ok" ? "unavailable" : "not_connected";
  if (state.freshness === "cached") return "cached";
  // Partial = live data for the accounts that answered; the gap is shown next to the badge.
  if (part === "partial") return "live";
  if (part === "error") return "error";
  if (part === "not_connected") return "not_connected";
  return "live";
}

export function RefreshButton({ state }: { state: EstateState }) {
  return (
    <button
      type="button"
      onClick={() => void state.refresh()}
      disabled={state.refreshing}
      className="btn-primary inline-flex items-center gap-1.5 text-xs disabled:opacity-60"
      title="Re-collect from GitHub and Cloudflare now (Shift+R)"
    >
      {state.refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
      {state.refreshing ? "Refreshing…" : "Refresh"}
    </button>
  );
}

/** One line of provenance: truth badge, age and what the user can press. */
export function FreshnessLine({
  state,
  part,
  source,
}: {
  state: EstateState;
  part: EstateTruth | undefined;
  source: string;
}) {
  const truth = truthOf(state, part);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <TruthBadge
        meta={{ truthState: truth, source, fetchedAt: state.snapshot?.fetchedAt ?? null }}
      />
      {state.snapshot && <span>Collected {ago(state.snapshot.fetchedAt)}</span>}
      {state.snapshot && part === "partial" && (
        <span className="font-semibold text-amber-600 dark:text-amber-400">
          Some accounts did not answer fully
        </span>
      )}
      {state.freshness === "cached" && state.refreshing && (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" />
          checking for changes…
        </span>
      )}
      <span className="hidden items-center gap-1 md:inline-flex">
        <Kbd>/</Kbd> search <Kbd>⇧R</Kbd> refresh <Kbd>g</Kbd>
        <Kbd>g</Kbd>/<Kbd>g</Kbd>
        <Kbd>c</Kbd> switch
      </span>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck size={11} /> tokens stay on the server
      </span>
    </div>
  );
}

/**
 * Gate and failure surfaces shown above the content. Returns null when there
 * is a snapshot to show and nothing to warn about.
 */
export function EstateGateNotice({
  state,
  what,
}: {
  state: EstateState;
  what: "GitHub" | "Cloudflare";
}) {
  if (state.gate && state.gate !== "ok") {
    if (state.snapshot) {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          Showing the snapshot saved on this device. {state.message}
        </div>
      );
    }
    if (state.gate === "unavailable")
      return (
        <ConnectorError
          message={state.message ?? "The estate could not be loaded."}
          onRetry={() => void state.refresh()}
        />
      );
    return (
      <ConnectorEmpty
        title={what + " estate is locked"}
        description={state.message ?? "Sign in through Cloudflare Access to load private data."}
        onRetry={() => void state.refresh()}
      />
    );
  }
  return null;
}
