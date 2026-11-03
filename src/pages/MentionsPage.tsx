import CollectorStatusPanel from "@/components/controlcenter/CollectorStatusPanel";
import { isOwnedDomainCoverage } from "@/lib/intelligenceRunQuality";
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
import { useStreamItems, useWatchTerms } from "@/hooks/useTableData";
import { ensureWatchTerm, groupWatchTerms } from "@/lib/watchTerms";
import { db, type WatchTermType } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { runMentionCollector } from "@/lib/controlCenter";
import { isRecentIso } from "@/lib/intelligenceQuality";
import { CCHeader, EmptyState, Panel, StreamRow, relTime } from "@/components/controlcenter/ui";

const TYPES: { id: WatchTermType; label: string; hint: string }[] = [
  { id: "brand", label: "Brand", hint: "Exact brand phrase; anchors increase precision." },
  { id: "domain", label: "Domain", hint: "Exact domain/publisher identity gets high confidence." },
  { id: "handle", label: "Handle", hint: "Requires the exact @handle. Bare-name/token matches are rejected." },
  { id: "name", label: "Person name", hint: "Requires at least one identity anchor." },
];

export default function MentionsPage() {
  const savedTerms = useWatchTerms();
  const terms = useMemo(() => groupWatchTerms(savedTerms), [savedTerms]);
  const sourceAliases = useMemo(() => new Map(terms.flatMap(watch => watch.memberIds.map(id => [id, watch.id] as const))), [terms]);
  const items = useStreamItems();
  const [term, setTerm] = useState("");
  const [type, setType] = useState<WatchTermType>("brand");
  const [anchors, setAnchors] = useState("");
  const [negatives, setNegatives] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [confidence, setConfidence] = useState<"all" | "high" | "medium">("all");
  const [watchFilter, setWatchFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const autoScanStarted = useRef(false);
  const [report, setReport] = useState<Awaited<ReturnType<typeof runMentionCollector>> | null>(null);

  const externalMentions = useMemo(() => items
    .filter(item => item.kind === "mention")
    .filter(item => { const watch = savedTerms.find(t => t.id === item.sourceId); return !watch || !isOwnedDomainCoverage(watch, item); }), [items, savedTerms]);
  const mentions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return externalMentions
      .filter((item) => item.status === (showArchived ? "archived" : "active"))
      .filter(item => watchFilter === "all" || sourceAliases.get(item.sourceId || "") === watchFilter)
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
      });
  }, [externalMentions, search, confidence, showArchived, watchFilter, sourceAliases]);

  const highConfidence = externalMentions.filter(
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
    setBusy(true);
    void runMentionCollector(false).then(setReport).catch(() => {
      // Collector health captures the failure without interrupting navigation.
    }).finally(() => setBusy(false));
  }, [enabledTerms]);

  useEffect(() => { setVisibleCount(40); }, [search, confidence, watchFilter, showArchived]);

  const addTerm = async () => {
    let clean = term.trim();
    if (type === "domain" && clean) {
      try { const parsed = new URL(/^https?:\/\//i.test(clean) ? clean : `https://${clean}`); if (!parsed.hostname.includes(".") || parsed.username || parsed.password) throw new Error(); clean = parsed.hostname.toLowerCase().replace(/^www\./, ""); }
      catch { toast.error("Enter a valid domain, such as example.com."); return; }
    }
    if (type === "handle" && clean) clean = "@" + clean.replace(/^@+/, "");
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

    const record = {
      term: clean,
      type,
      anchors: anchorList,
      negatives: negativeList,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    let saved: Awaited<ReturnType<typeof ensureWatchTerm>>;
    try { saved = await ensureWatchTerm(record); }
    catch (error) { toast.error("Watch was not saved", { description: error instanceof Error ? error.message : "Please try again." }); return; }
    if (!saved.created) { toast.info(saved.record.enabled ? "This exact watch rule already exists" : "This exact watch rule exists and is paused"); return; }
    queueCloudPush();
    setTerm("");
    setAnchors("");
    setNegatives("");
    toast.success(`Watching “${record.term}”`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const result = await runMentionCollector();
      setReport(result);
      if (result.outcome === "unavailable") toast.error("Mention coverage unavailable", { description: "No provider completed the scan. This is not evidence that no mentions exist." });
      else if (result.partial || result.failed) toast.warning("Mention scan partially completed", { description: `${result.checked}/${result.total} terms checked; ${result.matched} matches, ${result.added} newly saved.` });
      else toast.success(result.added ? `${result.added} new identity-matched mentions` : result.matched ? `${result.matched} matches already in your stream` : "Scan completed: no matching external coverage", { description: "Search results cover the providers checked, not the entire web. Owned-domain articles are excluded." });
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
        subtitle="Find external coverage of your brands, domains and people. Review the matching evidence, open the publisher, and turn relevant mentions into action."
        actions={
          <button
            onClick={() => void refresh()}
            disabled={busy || !enabledTerms.length}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            {busy ? "Scanning coverage…" : "Scan current coverage"}
          </button>
        }
      />
      <CollectorStatusPanel kind="mentions" />

      {report && <Panel>
        <div role="status" className="text-sm font-bold">{report.checked}/{report.total} terms checked · {report.matched} matches · {report.added} new</div>
        <p className="mt-1 text-xs text-muted-foreground">Identity matched in retrieved titles/snippets; not independently fact-checked. Undated web results are discovery evidence, not new publications.</p>
        <div className="mt-3 space-y-2">{report.details.map(detail => <div key={detail.termId} className="rounded-xl border border-border p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{detail.term}</strong>
            <span className={detail.checked ? "text-success" : "text-warning"}>
              {detail.checked ? detail.error ? "Partial provider coverage" : "Configured providers checked" : "Coverage unavailable"}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">
            {detail.checked
              ? `${detail.matches} identity matches from ${detail.candidates} candidates; ${detail.excludedOwned} owned pages excluded`
              : "No provider completed a trustworthy lookup for this term."}
            {detail.cached ? " · cached lookup (up to 5 minutes)" : ""}
          </p>
          {!!detail.providers?.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detail.providers.map(provider => (
                <span
                  key={provider.name}
                  className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                    provider.ok
                      ? "border-success/20 bg-success/8 text-success"
                      : "border-warning/20 bg-warning/7 text-warning"
                  }`}
                  title={provider.error || undefined}
                >
                  {provider.name}: {provider.ok ? `${provider.count} candidates` : "unavailable"}
                </span>
              ))}
            </div>
          )}
          {detail.error && <p className="mt-1 text-warning">{detail.error}</p>}
        </div>)}</div>
      </Panel>}
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
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck size={13} className="text-primary" />
              Identity rule
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              Person-name watches require anchors. Domain and handle watches use exact identity checks.
              Search snippets are treated as discovery evidence, not independent fact verification.
              Direct tracked feeds carry stronger publisher evidence. This intentionally favors precision over noisy volume.
            </p>
          </div>
          <span className="rounded-full border border-info/20 bg-info/8 px-2.5 py-1 text-xs font-bold text-info">
            Web search + news + tracked feeds
          </span>
        </div>

        <div className="mt-4 grid gap-2 xl:grid-cols-[1.1fr_auto_1.1fr_1.1fr_auto]">
          <input
            aria-label="Watch term"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void addTerm()}
            placeholder="Brand, domain, @handle or person name"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            aria-label="Watch term type"
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
            aria-label="Identity anchors, comma separated"
            value={anchors}
            onChange={(event) => setAnchors(event.target.value)}
            placeholder={type === "name" ? "Required anchors: company, domain, niche…" : "Identity anchors (recommended)"}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            aria-label="Excluded contexts, comma separated"
            value={negatives}
            onChange={(event) => setNegatives(event.target.value)}
            placeholder="Exclude contexts, comma separated"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button onClick={() => void addTerm()} className="btn-primary justify-center">
            <Plus size={14} /> Watch
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {TYPES.find((option) => option.id === type)?.hint}
        </p>

        {!!terms.length && (
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {terms.map((watch) => (
              <div key={watch.id} className="cc-watch-card" data-enabled={watch.enabled ? "true" : "false"}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="truncate text-xs text-foreground">{watch.term}</strong>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs font-bold uppercase text-muted-foreground">
                      {watch.type}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {watch.anchors?.length ? `${watch.anchors.length} anchor${watch.anchors.length === 1 ? "" : "s"}` : "No anchors"}
                    {" · "}
                    {watch.lastSuccessAt ? `last successful lookup ${relTime(watch.lastSuccessAt)}` : "no successful lookup recorded"}
                  </div>
                  {watch.records.length > 1 && <p className="mt-1 text-xs text-muted-foreground">{watch.records.length} identical saved copies · displayed and scanned once</p>}
                  {!!watch.negatives?.length && (
                    <div className="mt-1 truncate text-xs text-muted-foreground/70">
                      Excludes: {watch.negatives.join(", ")}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await db.transaction("rw", db.watchTerms, async () => {
                      for (const id of watch.memberIds) await db.watchTerms.update(id, { enabled: !watch.enabled });
                    });
                    watch.memberIds.forEach(id => markCloudRecordDirty("watchTerms", id));
                    queueCloudPush();
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                  aria-label={`${watch.enabled ? "Pause" : "Enable"} watch for ${watch.term}`}
                  aria-pressed={watch.enabled}
                >
                  <Power size={12} />
                </button>
                <button
                  onClick={async () => {
                    await db.watchTerms.bulkDelete(watch.memberIds);
                    watch.memberIds.forEach(id => markCloudRecordDirty("watchTerms", id, "delete"));
                    queueCloudPush();
                    toast("Watch removed", { description: watch.term, action: { label: "Undo", onClick: async () => {
                      await db.watchTerms.bulkPut(watch.records); watch.memberIds.forEach(id => markCloudRecordDirty("watchTerms", id)); queueCloudPush();
                    } } });
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove watch for ${watch.term}`}
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
              Identity-matched coverage
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {mentions.length} matching {showArchived ? "archived" : "active"} results. Identity confidence describes the match, not the truth of a publisher’s claims.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-2.5">
              <Search size={12} className="text-muted-foreground" />
              <input
                aria-label="Filter mentions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter mentions"
                className="h-9 w-36 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 sm:w-52"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-2.5">
              <Filter size={12} className="text-muted-foreground" />
              <select
                aria-label="Filter identity confidence"
                value={confidence}
                onChange={(event) => setConfidence(event.target.value as "all" | "high" | "medium")}
                className="h-9 bg-transparent text-xs font-semibold outline-none"
              >
                <option value="all">All confidence</option>
                <option value="high">High only</option>
                <option value="medium">Medium only</option>
              </select>
            </label>
            <select aria-label="Filter by watched identity" value={watchFilter} onChange={event => setWatchFilter(event.target.value)} className="min-h-11 max-w-full rounded-xl border border-border bg-background px-3 text-xs">
              <option value="all">All watched identities</option>
              {terms.map(watch => <option key={watch.id} value={watch.id}>{watch.term}</option>)}
            </select>
            <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived(value => !value)} className="btn-secondary min-h-11">{showArchived ? "Show active" : "Show archived"}</button>
          </div>
        </div>
      </Panel>

      {mentions.length === 0 ? (
        <EmptyState
          title={terms.length ? "No identity-matched mentions in this view" : "Add a term to watch"}
          hint={
            terms.length
              ? "Check the scan report above: failed providers mean unknown coverage, not zero mentions. Successful searches may return no matching external coverage."
              : "Start with your brand/domain. For personal names, add identity anchors before scanning."
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {mentions.slice(0, visibleCount).map((mention) => (
            <StreamRow key={mention.id} item={mention} />
          ))}
          {mentions.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + 40)} className="btn-secondary justify-center min-h-11">Show more · {mentions.length - visibleCount} remaining</button>}
        </div>
      )}

      {!!enabledTerms.length && neverScanned > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning/7 p-3 text-xs leading-5 text-muted-foreground">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          {neverScanned} enabled watch term{neverScanned === 1 ? " has" : "s have"} never been scanned.
          Run a scan before treating the dashboard as current.
        </div>
      )}
    </div>
  );
}
