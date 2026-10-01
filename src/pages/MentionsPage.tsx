import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Filter,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useStreamItems, useWatchTerms, genId } from "@/hooks/useTableData";
import { db, type WatchTermType } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { runMentionCollector } from "@/lib/controlCenter";
import { isRecentIso } from "@/lib/intelligenceQuality";
import { CCHeader, EmptyState, Panel, StreamRow, relTime } from "@/components/controlcenter/ui";

const TYPES: { id: WatchTermType; label: string; hint: string }[] = [
  { id: "brand", label: "Brand", hint: "Exact brand phrase; anchors increase precision." },
  { id: "domain", label: "Domain", hint: "Exact domain/publisher identity gets high confidence." },
  { id: "handle", label: "Handle", hint: "Exact @handle or token match gets high confidence." },
  { id: "name", label: "Person name", hint: "Requires at least one identity anchor." },
];

export default function MentionsPage() {
  const terms = useWatchTerms();
  const items = useStreamItems();
  const [term, setTerm] = useState("");
  const [type, setType] = useState<WatchTermType>("brand");
  const [anchors, setAnchors] = useState("");
  const [negatives, setNegatives] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [confidence, setConfidence] = useState<"all" | "high" | "medium">("high");
  const autoScanStarted = useRef(false);

  const mentions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => item.kind === "mention" && item.status === "active")
      .filter((item) => confidence === "all" || item.confidence === confidence)
      .filter((item) =>
        !q
          ? true
          : [item.title, item.source, item.matchedTerm, ...(item.matchedAnchors || [])]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) => {
        const rank = (value?: string) => (value === "high" ? 0 : value === "medium" ? 1 : 2);
        return rank(a.confidence) - rank(b.confidence) || b.publishedAt.localeCompare(a.publishedAt);
      })
      .slice(0, 160);
  }, [items, search, confidence]);

  const highConfidence = items.filter(
    (item) =>
      item.kind === "mention" &&
      item.status === "active" &&
      item.confidence === "high" &&
      item.dateBasis === "published" &&
      isRecentIso(item.publishedAt, 30),
  ).length;
  const enabledTerms = terms.filter((watch) => watch.enabled);
  const neverScanned = enabledTerms.filter((watch) => !watch.lastCheckedAt).length;
  const latestScan = enabledTerms
    .map((watch) => watch.lastCheckedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  useEffect(() => {
    if (autoScanStarted.current || !enabledTerms.length) return;
    const stale = enabledTerms.some(
      (watch) =>
        !watch.lastCheckedAt ||
        Date.now() - new Date(watch.lastCheckedAt).getTime() > 6 * 3_600_000,
    );
    if (!stale) return;
    autoScanStarted.current = true;
    void runMentionCollector(false).catch(() => {
      // Collector health captures the failure without interrupting navigation.
    });
  }, [enabledTerms]);

  const addTerm = async () => {
    const clean = term.trim();
    if (!clean) return;

    const anchorList = anchors
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const negativeList = negatives
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (type === "name" && !anchorList.length) {
      toast.error("A personal name needs at least one identity anchor", {
        description: "Add a company, domain, city, niche, title, or other phrase that should co-occur.",
      });
      return;
    }

    const duplicate = terms.find(
      (watch) => watch.type === type && watch.term.toLowerCase() === clean.toLowerCase(),
    );
    if (duplicate) {
      toast.info("This watch term already exists");
      return;
    }

    const record = {
      id: genId(),
      term: clean,
      type,
      anchors: anchorList,
      negatives: negativeList,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await db.watchTerms.put(record);
    markCloudRecordDirty("watchTerms", record.id);
    queueCloudPush();
    setTerm("");
    setAnchors("");
    setNegatives("");
    toast.success(`Watching “${record.term}”`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const { added, errors } = await runMentionCollector();
      toast[errors.length && !added ? "warning" : "success"](
        added ? `${added} new verified mention${added === 1 ? "" : "s"}` : "No new verified mentions",
        {
          description: errors.slice(0, 3).join(" · ") || undefined,
        },
      );
    } catch (error: any) {
      toast.error("Mention scan failed", { description: String(error?.message ?? error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <CCHeader
        title="Brand Mentions"
        subtitle="Fresh identity-filtered monitoring across publisher coverage and your tracked feeds. Exact domains/handles and anchored names are high-confidence; ambiguous matches are rejected before storage."
        actions={
          <button
            onClick={() => void refresh()}
            disabled={busy || !enabledTerms.length}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            Scan current coverage
          </button>
        }
      />

      <section className="grid gap-2 sm:grid-cols-4">
        {[
          ["Enabled terms", enabledTerms.length, "primary"],
          ["High confidence 30d", highConfidence, "success"],
          ["Never scanned", neverScanned, neverScanned ? "warning" : "success"],
          ["Last scan", latestScan ? relTime(latestScan) : "—", "neutral"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="cc-intel-kpi" data-tone={String(tone)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck size={13} className="text-primary" />
              Identity rule
            </div>
            <p className="mt-1 max-w-3xl text-[10px] leading-5 text-muted-foreground">
              Person-name watches require anchors. Domain and handle watches use exact identity checks.
              Brand watches are medium confidence unless an anchor also matches. This intentionally
              favors precision over noisy volume.
            </p>
          </div>
          <span className="rounded-full border border-info/20 bg-info/8 px-2.5 py-1 text-[9px] font-bold text-info">
            Google News + tracked feeds
          </span>
        </div>

        <div className="mt-4 grid gap-2 xl:grid-cols-[1.1fr_auto_1.1fr_1.1fr_auto]">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void addTerm()}
            placeholder="Brand, domain, @handle or person name"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as WatchTermType)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm capitalize"
          >
            {TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={anchors}
            onChange={(event) => setAnchors(event.target.value)}
            placeholder={type === "name" ? "Required anchors: company, domain, niche…" : "Identity anchors (recommended)"}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={negatives}
            onChange={(event) => setNegatives(event.target.value)}
            placeholder="Exclude contexts, comma separated"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button onClick={() => void addTerm()} className="btn-primary justify-center">
            <Plus size={14} /> Watch
          </button>
        </div>
        <p className="mt-2 text-[9px] text-muted-foreground">
          {TYPES.find((option) => option.id === type)?.hint}
        </p>

        {!!terms.length && (
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {terms.map((watch) => (
              <div key={watch.id} className="cc-watch-card" data-enabled={watch.enabled ? "true" : "false"}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="truncate text-[11px] text-foreground">{watch.term}</strong>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[8px] font-bold uppercase text-muted-foreground">
                      {watch.type}
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] text-muted-foreground">
                    {watch.anchors?.length ? `${watch.anchors.length} anchor${watch.anchors.length === 1 ? "" : "s"}` : "No anchors"}
                    {" · "}
                    {watch.lastCheckedAt ? `scanned ${relTime(watch.lastCheckedAt)}` : "never scanned"}
                  </div>
                  {!!watch.negatives?.length && (
                    <div className="mt-1 truncate text-[8px] text-muted-foreground/70">
                      Excludes: {watch.negatives.join(", ")}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await db.watchTerms.update(watch.id, { enabled: !watch.enabled });
                    markCloudRecordDirty("watchTerms", watch.id);
                    queueCloudPush();
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                  aria-label="Toggle term"
                >
                  <Power size={12} />
                </button>
                <button
                  onClick={async () => {
                    await db.watchTerms.delete(watch.id);
                    markCloudRecordDirty("watchTerms", watch.id, "delete");
                    queueCloudPush();
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove term"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <BadgeCheck size={15} className="text-success" />
              Verified mention stream
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              High-confidence matches first. Publisher, match method and anchors remain visible.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-2.5">
              <Search size={12} className="text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter mentions"
                className="h-9 w-36 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 sm:w-52"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-2.5">
              <Filter size={12} className="text-muted-foreground" />
              <select
                value={confidence}
                onChange={(event) => setConfidence(event.target.value as "all" | "high" | "medium")}
                className="h-9 bg-transparent text-xs font-semibold outline-none"
              >
                <option value="all">All confidence</option>
                <option value="high">High only</option>
                <option value="medium">Medium only</option>
              </select>
            </label>
          </div>
        </div>
      </Panel>

      {mentions.length === 0 ? (
        <EmptyState
          title={terms.length ? "No verified mentions match these filters" : "Add a term to watch"}
          hint={
            terms.length
              ? "A zero here means the identity filters rejected ambiguous coverage or no current Google News result matched."
              : "Start with your brand/domain. For personal names, add identity anchors before scanning."
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {mentions.map((mention) => (
            <StreamRow key={mention.id} item={mention} />
          ))}
        </div>
      )}

      {!!enabledTerms.length && neverScanned > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning/7 p-3 text-[10px] leading-5 text-muted-foreground">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          {neverScanned} enabled watch term{neverScanned === 1 ? " has" : "s have"} never been scanned.
          Run a scan before treating the dashboard as current.
        </div>
      )}
    </div>
  );
}
