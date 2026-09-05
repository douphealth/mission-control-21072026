import { RefreshCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSyncHealth } from "@/hooks/useTableData";
import { SYNC_SOURCES, ageLabel, effectiveStatus, STATUS_STYLE } from "@/lib/reliability";
import { forceCloudSync } from "@/lib/cloudSync";

export default function ReliabilityPanel({ compact = false }: { compact?: boolean }) {
  const health = useSyncHealth();
  const [busy, setBusy] = useState(false);

  const rows = SYNC_SOURCES.map((s) => {
    const row = health.find((h) => h.id === s.id);
    const status = effectiveStatus(row);
    return { ...s, row, status };
  });

  const shown = compact ? rows.filter((r) => r.status !== "not-configured").slice(0, 4) : rows;

  const retry = async () => {
    setBusy(true);
    try {
      await forceCloudSync();
      toast.success("Sync retried");
    } catch (e: any) {
      toast.error(e?.message ?? "Retry failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> Reliability
        </h3>
        <button
          onClick={retry}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-secondary/60 disabled:opacity-50"
        >
          <RefreshCcw size={12} className={busy ? "animate-spin" : ""} /> Retry sync
        </button>
      </div>

      <div className="space-y-1.5">
        {shown.map((r) => {
          const style = STATUS_STYLE[r.status];
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{r.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {r.row?.error
                    ? r.row.error
                    : `Last success ${ageLabel(r.row?.lastSuccessAt)}${r.row?.pending ? ` · ${r.row.pending} pending` : ""}`}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${style.cls}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="text-xs text-muted-foreground">No sources connected yet.</p>
        )}
      </div>
    </div>
  );
}
