import { ExternalLink, Archive, Sparkles } from "lucide-react";
import type { StreamItem } from "@/lib/db";
import { archiveStreamItem } from "@/lib/controlCenter";

export function CCHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 sm:p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Panel className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </Panel>
  );
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

function scoreTone(score: number) {
  if (score >= 80) return "bg-rose-500/15 text-rose-500 border-rose-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
}

export function StreamRow({ item, onArchive }: { item: StreamItem; onArchive?: () => void }) {
  return (
    <div className="group flex gap-3 rounded-xl border border-border/50 bg-background/40 p-3 hover:border-primary/40 transition-colors">
      <span
        className={`shrink-0 h-7 min-w-7 px-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center tabular-nums ${scoreTone(item.score)}`}
        title="Importance score"
      >
        {item.score}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-foreground hover:text-primary line-clamp-2"
        >
          {item.title}
        </a>
        <p className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2">
          <span className="font-medium">{item.source || "Unknown source"}</span>
          <span>·</span>
          <span>{relTime(item.publishedAt)}</span>
          {item.matchedTerm && (
            <>
              <span>·</span>
              <span className="text-primary font-medium">{item.matchedTerm}</span>
            </>
          )}
        </p>
        {(item.aiSummary || item.summary) && (
          <p className="text-xs text-muted-foreground/90 mt-1.5 line-clamp-2">
            {item.aiSummary && <Sparkles size={11} className="inline mr-1 -mt-0.5 text-primary" />}
            {item.aiSummary || item.summary}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          aria-label="Open story"
        >
          <ExternalLink size={14} />
        </a>
        <button
          onClick={() => (onArchive ? onArchive() : archiveStreamItem(item.id))}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          aria-label="Archive story"
        >
          <Archive size={14} />
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-12 rounded-2xl border border-dashed border-border/70">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{hint}</p>}
    </div>
  );
}
