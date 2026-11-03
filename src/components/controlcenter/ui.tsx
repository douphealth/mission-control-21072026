import { useRef, useState } from "react";
import { ExternalLink, Archive, ArchiveRestore, Sparkles, Inbox, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigationStore } from "@/stores/navigationStore";
import SharedEmptyState from "@/components/EmptyState";
import type { StreamItem } from "@/lib/db";
import { archiveStreamItem, captureStreamItem, restoreStreamItem } from "@/lib/controlCenter";

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
    <div className="cc-header relative overflow-hidden rounded-[26px] border border-border/50 bg-card/65 p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:p-5 mb-6">
      <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
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
      className={`cc-panel rounded-[22px] border border-border/50 bg-card/68 backdrop-blur-xl p-4 sm:p-5 shadow-[var(--shadow-sm)] ${className}`}
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
    <Panel className="cc-stat min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
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

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";

export function StreamRow({ item, onArchive }: { item: StreamItem; onArchive?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [captured, setCaptured] = useState(false);
  const lock = useRef(false);
  const setActiveSection = useNavigationStore(state => state.setActiveSection);
  const archived = item.status === "archived";

  async function mutate(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await action(); }
    catch (error) { toast.error("The change was not saved", { description: error instanceof Error ? error.message : "Please try again." }); }
    finally { lock.current = false; setBusy(false); }
  }

  return <article className="cc-stream-row rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 px-2 text-sm font-bold tabular-nums text-primary" title="Calculated review priority from recency, configured topics and headline signals; not a source credibility rating.">
        {Number.isFinite(item.score) ? Math.round(item.score) : "—"}
      </span>
      <div className="min-w-0 flex-1">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold leading-relaxed text-foreground hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-base">
          {item.title}
        </a>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">{item.source || "Publisher unavailable"}</a> : <span className="font-medium">{item.source || "Publisher unavailable"}</span>}
          <span aria-hidden="true">·</span>
          <span title={item.publishedAt}>{item.dateBasis === "published" ? "Published " : "Discovered "}{relTime(item.publishedAt)}</span>
          {item.matchedTerm && <span className="rounded-lg bg-primary/8 px-2 py-1 font-medium text-primary">{item.matchedTerm}</span>}
        </div>
        {(item.aiSummary || item.summary) && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {item.aiSummary && <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-primary"><Sparkles size={13} />AI summary ·</span>}
          {item.aiSummary || item.summary}
        </p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {item.verification && <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">{item.verification.replaceAll("-", " ")}</span>}
          {item.confidence && <span className={`rounded-full px-2.5 py-1 font-medium ${item.confidence === "high" ? "bg-success/8 text-success" : "bg-secondary text-muted-foreground"}`}>
            {item.confidence} {item.kind === "mention" ? "identity confidence" : "source confidence"}
          </span>}
          {item.evidenceType && <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">{item.evidenceType.replaceAll("-", " ")}</span>}
        </div>
        {(item.matchedAnchors?.length || item.verificationReason) && <details className="mt-3 text-xs leading-relaxed text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">View match evidence</summary>
          {!!item.matchedAnchors?.length && <p className="mt-2">Identity anchors: {item.matchedAnchors.join(", ")}</p>}
          {item.verificationReason && <p className="mt-2">{item.verificationReason}</p>}
        </details>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={actionClass} aria-label={`Open source: ${item.title}`}><ExternalLink size={15} />Open source</a>
      <button type="button" disabled={busy} className={actionClass} aria-label={`Capture for follow-up: ${item.title}`} onClick={() => void mutate(async () => {
        const result = await captureStreamItem(item.id);
        if (result === "trash") { toast.info("An earlier capture is in Trash", { description: "Restore it from Tasks to preserve its history." }); return; }
        setCaptured(true);
        toast.success(result === "created" ? "Saved to Captures" : "Already captured", { description: "Source and evidence are attached. Choose a next action in Captures or Tasks.", action: { label: result === "created" ? "Open Captures" : "Open Tasks", onClick: () => setActiveSection(result === "created" ? "control-center" : "tasks") } });
      })}>{captured ? <Check size={15} /> : <Plus size={15} />}{captured ? "Captured" : "Capture follow-up"}</button>
      <button type="button" disabled={busy} className={actionClass} aria-label={`${archived ? "Restore" : "Archive"} story: ${item.title}`} onClick={() => void mutate(async () => {
        if (archived) await restoreStreamItem(item.id);
        else if (onArchive) await onArchive();
        else await archiveStreamItem(item.id);
        toast.success(archived ? "Story restored" : "Story archived", { action: { label: "Undo", onClick: () => void (archived ? archiveStreamItem(item.id) : restoreStreamItem(item.id)) } });
      })}>{archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}{archived ? "Restore" : "Archive"}</button>
    </div>
  </article>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return <SharedEmptyState compact icon={Inbox} title={title} description={hint} />;
}
