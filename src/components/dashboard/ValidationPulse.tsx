import { ShieldQuestion, Check, X } from "lucide-react";
import type { Validation } from "@/lib/db";
import { statusLabel, isDueForReview } from "@/lib/validations";
import { setValidationResult } from "@/lib/validations";
import { useNavigationStore } from "@/stores/navigationStore";

const TONE: Record<string, string> = {
  failed: "border-destructive/30 bg-destructive/[0.06]",
  monitoring: "border-info/25 bg-info/[0.05]",
  validating: "border-border/60 bg-secondary/30",
  pending: "border-border/60 bg-secondary/30",
  passed: "border-emerald-500/25 bg-emerald-500/[0.05]",
};

export default function ValidationPulse({ items, today }: { items: Validation[]; today: string }) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);

  if (items.length === 0) return null;

  const open = (v: Validation) => {
    if (v.entityId) setFocusEntity({ type: "validation", id: v.entityId, label: v.entityLabel });
    if (v.section) setActiveSection(v.section);
  };

  return (
    <section className="enterprise-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-info/10 text-info">
          <ShieldQuestion size={15} />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Proof</div>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight text-foreground">Validating</h3>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((v) => (
          <div key={v.id} className={`rounded-2xl border p-3 ${TONE[v.status]}`}>
            <button onClick={() => open(v)} className="block w-full text-left">
              <div className="text-[12.5px] font-bold text-foreground">{v.title}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {statusLabel(v, today)}
                {v.reviewAt ? ` · review ${v.reviewAt}` : ""}
                {v.entityLabel ? ` · ${v.entityLabel}` : ""}
              </div>
              {v.successCriteria && (
                <div className="mt-1 text-[10px] text-muted-foreground/80">Success: {v.successCriteria}</div>
              )}
            </button>
            {isDueForReview(v, today) && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setValidationResult(v.id, "passed", "Verified from Daily Home")}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300"
                >
                  <Check size={12} /> Worked
                </button>
                <button
                  onClick={() => setValidationResult(v.id, "failed", "Did not work")}
                  className="inline-flex items-center gap-1 rounded-xl bg-destructive/12 px-2.5 py-1.5 text-[11px] font-bold text-destructive"
                >
                  <X size={12} /> Did not work
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
