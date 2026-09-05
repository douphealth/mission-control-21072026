import { useMemo, useState } from "react";
import { Scale, RefreshCcw, Check, X, Clock, History } from "lucide-react";
import { toast } from "sonner";
import {
  useDecisions,
  useSEOIssues,
  useStreamItems,
  useTasks,
  useSyncHealth,
  useAuditLog,
} from "@/hooks/useTableData";
import {
  generateDecisions,
  actOnDecision,
  ignoreDecision,
  deferDecision,
  reopenDueDecisions,
  SEVERITY_STYLE,
} from "@/lib/decisions";
import { describeAudit, restoreFromAudit } from "@/lib/audit";
import { relTime } from "@/components/controlcenter/ui";
import type { Decision } from "@/lib/db";

const FILTERS = ["open", "acted", "ignored", "later"] as const;

export default function DecisionsPage() {
  const decisions = useDecisions();
  const seoIssues = useSEOIssues();
  const streamItems = useStreamItems();
  const tasks = useTasks();
  const health = useSyncHealth();
  const audit = useAuditLog(40);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open");
  const [busy, setBusy] = useState(false);

  const list = useMemo(
    () =>
      decisions
        .filter((d) => d.status === filter)
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
    [decisions, filter],
  );

  async function scan() {
    setBusy(true);
    try {
      await reopenDueDecisions();
      const created = await generateDecisions({ seoIssues, mentions: streamItems, tasks, health });
      toast.success(
        created > 0 ? `${created} new decision(s) surfaced` : "No new findings — you are current",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  async function act(d: Decision) {
    await actOnDecision(d);
    toast.success("Task created and linked");
  }
  async function ignore(d: Decision) {
    const reason = window.prompt("Why are you ignoring this? (kept in history)") ?? "";
    if (!reason.trim()) return;
    await ignoreDecision(d, reason.trim());
    toast.success("Ignored with reason");
  }
  async function later(d: Decision) {
    await deferDecision(d, 7);
    toast.success("Back in 7 days");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Scale size={22} className="text-primary" /> Decision Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every finding ends in a decision: act, ignore with a reason, or come back on a date.
          </p>
        </div>
        <button
          onClick={scan}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground disabled:opacity-60"
        >
          <RefreshCcw size={15} className={busy ? "animate-spin" : ""} /> Scan findings
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {f} ({decisions.filter((d) => d.status === f).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {list.length === 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No {filter} decisions. Run a scan to pull in fresh findings.
              </p>
            </div>
          )}

          {list.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.context}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${SEVERITY_STYLE[d.severity]}`}
                >
                  {d.severity}
                </span>
              </div>

              {d.recommendation && (
                <p className="text-xs mt-2 rounded-xl bg-secondary/50 px-3 py-2 text-foreground">
                  <span className="font-semibold">Recommended: </span>
                  {d.recommendation}
                </p>
              )}

              {d.status === "open" ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => act(d)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-primary-foreground"
                  >
                    <Check size={13} /> Act
                  </button>
                  <button
                    onClick={() => later(d)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 hover:bg-secondary/60"
                  >
                    <Clock size={13} /> Later
                  </button>
                  <button
                    onClick={() => ignore(d)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 hover:bg-secondary/60"
                  >
                    <X size={13} /> Ignore
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-2">
                  {d.status === "later"
                    ? `Returns ${d.deferUntil}`
                    : d.resolutionNote || `Marked ${d.status}`}
                  {d.resolvedAt ? ` · ${relTime(d.resolvedAt)}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 h-fit">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <History size={16} className="text-primary" /> Audit history
          </h3>
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {audit.length === 0 && (
              <p className="text-xs text-muted-foreground">No changes recorded yet.</p>
            )}
            {audit.map((a) => (
              <div key={a.id} className="rounded-xl border border-border/50 px-3 py-2">
                <p className="text-xs font-semibold text-foreground truncate">{describeAudit(a)}</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{relTime(a.at)}</span>
                  {a.before && (a.action === "delete" || a.action === "update") && (
                    <button
                      onClick={async () => {
                        const ok = await restoreFromAudit(a);
                        toast[ok ? "success" : "error"](
                          ok ? "Restored previous version" : "Could not restore",
                        );
                      }}
                      className="text-[11px] font-semibold text-primary"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
