import { Globe, ChevronRight } from "lucide-react";
import type { SitePulseRow } from "@/lib/sitePulse";
import { useNavigationStore } from "@/stores/navigationStore";

const TONE: Record<string, string> = {
  attention: "border-amber-500/30 bg-amber-500/[0.06]",
  unknown: "border-border/60 bg-secondary/30",
  healthy: "border-emerald-500/25 bg-emerald-500/[0.05]",
};

const BADGE: Record<string, string> = {
  attention: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  unknown: "bg-secondary text-muted-foreground",
  healthy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};

export default function SitePulse({ rows }: { rows: SitePulseRow[] }) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);

  if (rows.length === 0) return null;

  const open = (row: SitePulseRow) => {
    setFocusEntity({ type: "website", id: row.id, label: row.name });
    setActiveSection(row.openIssues > 0 ? "seo" : "websites");
  };

  return (
    <section className="enterprise-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Globe size={15} />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Portfolio</div>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight text-foreground">Site pulse</h3>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => open(r)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${TONE[r.status]}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12.5px] font-bold text-foreground">{r.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${BADGE[r.status]}`}>
                  {r.status === "unknown" ? "Status unknown" : r.headline}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.detail}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {r.provenance}
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}
