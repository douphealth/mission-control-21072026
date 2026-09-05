import { AlertTriangle, ArrowUpRight, ShieldCheck } from "lucide-react";
import type { AttentionItem } from "@/lib/whyNow";
import { useNavigationStore } from "@/stores/navigationStore";

const TONE: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/[0.06]",
  warning: "border-amber-500/30 bg-amber-500/[0.06]",
  info: "border-border/60 bg-secondary/30",
};

export default function AttentionFeed({ items }: { items: AttentionItem[] }) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);

  return (
    <section className="enterprise-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle size={15} />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Exceptions
          </div>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight text-foreground">
            Needs attention
          </h3>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
          <ShieldCheck size={18} className="text-emerald-500" />
          <p className="text-[12px] text-muted-foreground">
            No exceptions. Deadlines, payments, decisions and syncs are all healthy.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 5).map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveSection(a.section)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 ${TONE[a.severity]}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-foreground">{a.title}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.detail}</div>
                {a.provenance && (
                  <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {a.provenance}
                  </div>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-bold text-foreground">
                {a.actionLabel} <ArrowUpRight size={11} />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
