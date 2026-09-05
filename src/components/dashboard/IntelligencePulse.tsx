import { Radar, ExternalLink, Scale, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { IntelItem } from "@/lib/intelligence";
import { db } from "@/lib/db";
import { upsertDecision } from "@/lib/decisions";

function freshness(iso: string): string {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "unknown date";
  const hrs = Math.round((Date.now() - d) / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function IntelligencePulse({ items }: { items: IntelItem[] }) {
  return (
    <section className="enterprise-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
          <Radar size={15} />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Intelligence
          </div>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight text-foreground">
            For you today
          </h3>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          No important developments require attention.
        </p>
      ) : (
        <div className="space-y-2.5">
          {items.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border/60 bg-secondary/25 p-3.5">
              <a
                href={i.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block text-[12.5px] font-bold text-foreground hover:text-primary"
              >
                {i.title} <ExternalLink size={11} className="inline align-baseline" />
              </a>
              <div className="mt-1 text-[11px] text-muted-foreground">{i.relevance}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {i.source} · {freshness(i.publishedAt)}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={async () => {
                    await upsertDecision({
                      title: i.title,
                      context: `${i.relevance}. Source: ${i.source} — ${i.url}`,
                      source: "manual",
                      fingerprintParts: ["intel", i.id],
                      severity: "medium",
                    });
                    toast.success("Finding created");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-foreground"
                >
                  <Scale size={12} /> Create finding
                </button>
                <button
                  onClick={async () => {
                    await db.streamItems.update(i.id, { read: true });
                    toast.message("Dismissed");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
                >
                  <EyeOff size={12} /> Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
