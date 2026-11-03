import CollectorStatusPanel from "@/components/controlcenter/CollectorStatusPanel";
import { isOwnedDomainCoverage } from "@/lib/intelligenceRunQuality";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileText,
  Pencil,
  Radio,
  SlidersHorizontal,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useStreamItems, useWatchTerms } from "@/hooks/useTableData";
import { ensureWatchTerm, groupWatchTerms, watchIdentityKey } from "@/lib/watchTerms";
import { db, type WatchTermType } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { runMentionCollector } from "@/lib/controlCenter";
import { deduplicateStreamItems } from "@/lib/intelligencePresentation";
import { removeWatchTerms, restoreWatchTerms } from "@/lib/intelligenceSourceManagement";
import {
  IntelligenceMetrics,
  IntelligenceTabs,
  IntelligenceHeading,
  IntelligenceEmpty,
  downloadIntelligenceCsv,
} from "@/components/controlcenter/IntelligenceWorkspace";
import { isRecentIso } from "@/lib/intelligenceQuality";
import { CCHeader, EmptyState, Panel, StreamRow, relTime } from "@/components/controlcenter/ui";

const TYPES: { id: WatchTermType; label: string; hint: string }[] = [
  { id: "brand", label: "Brand", hint: "Exact brand phrase; anchors increase precision." },
  { id: "domain", label: "Domain", hint: "Exact domain/publisher identity gets high confidence." },
  {
    id: "handle",
    label: "Handle",
    hint: "Requires the exact @handle. Bare-name/token matches are rejected.",
  },
  { id: "name", label: "Person name", hint: "Requires at least one identity anchor." },
];

export default function MentionsPage() {
  const savedTerms = useWatchTerms();
  const terms = useMemo(() => groupWatchTerms(savedTerms), [savedTerms]);
  const sourceAliases = useMemo(
    () => new Map(terms.flatMap((watch) => watch.memberIds.map((id) => [id, watch.id] as const))),
    [terms],
  );
  const watchIdentities = useMemo(
    () =>
      new Map(
        terms.flatMap((watch) =>
          watch.memberIds.map((id) => [id, watchIdentityKey(watch)] as const),
        ),
      ),
    [terms],
  );
  const items = useStreamItems();
  const streamById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const watchById = useMemo(
    () => new Map(savedTerms.map((watch) => [watch.id, watch])),
    [savedTerms],
  );
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
  const [tab, setTab] = useState<"coverage" | "rules" | "report">("coverage");
  const [publicationDays, setPublicationDays] = useState(0);
  const [sort, setSort] = useState<"newest" | "confidence">("newest");
  const [ruleQuery, setRuleQuery] = useState("");
  const [rulePending, setRulePending] = useState("");
  const ruleLock = useRef(false);
  const [editingRule, setEditingRule] = useState("");
  const [editAnchors, setEditAnchors] = useState("");
  const [editNegatives, setEditNegatives] = useState("");
  const autoScanStarted = useRef(false);
  const [report, setReport] = useState<Awaited<ReturnType<typeof runMentionCollector>> | null>(
    null,
  );

  const externalMentions = useMemo(
    () =>
      deduplicateStreamItems(
        items
          .filter((item) => item.kind === "mention")
          .filter((item) => {
            const watch = watchById.get(item.sourceId || "");
            return !watch || !isOwnedDomainCoverage(watch, item);
          }),
        watchIdentities,
      ),
    [items, watchById, watchIdentities],
  );
  const mentions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return externalMentions
      .filter((item) => item.status === (showArchived ? "archived" : "active"))
      .filter(
        (item) =>
          watchFilter === "all" ||
          item.memberIds.some(
            (id) => sourceAliases.get(streamById.get(id)?.sourceId || "") === watchFilter,
          ),
      )
      .filter((item) => confidence === "all" || item.confidence === confidence)
      .filter(
        (item) =>
          !publicationDays ||
          (item.dateBasis === "published" && isRecentIso(item.publishedAt, publicationDays)),
      )
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
        return sort === "confidence"
          ? rank(a.confidence) - rank(b.confidence) || b.publishedAt.localeCompare(a.publishedAt)
          : b.publishedAt.localeCompare(a.publishedAt) || rank(a.confidence) - rank(b.confidence);
      });
  }, [
    externalMentions,
    search,
    confidence,
    showArchived,
    watchFilter,
    sourceAliases,
    streamById,
    publicationDays,
    sort,
  ]);

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
  const rulesNeedingAttention = enabledTerms.filter(
    (watch) => watch.lastError || !watch.lastSuccessAt || !isRecentIso(watch.lastSuccessAt, 1),
  ).length;
  const activeMentions = externalMentions.filter((item) => item.status === "active").length;
  const visibleRules = terms.filter(
    (watch) =>
      !ruleQuery.trim() ||
      `${watch.term} ${watch.type} ${(watch.anchors || []).join(" ")} ${(watch.negatives || []).join(" ")}`
        .toLowerCase()
        .includes(ruleQuery.trim().toLowerCase()),
  );
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
    void runMentionCollector(false)
      .then(setReport)
      .catch(() => {
        // Collector health captures the failure without interrupting navigation.
      })
      .finally(() => setBusy(false));
  }, [enabledTerms]);

  useEffect(() => {
    setVisibleCount(40);
  }, [search, confidence, watchFilter, showArchived, publicationDays, sort]);

  const addTerm = async () => {
    if (ruleLock.current) return;
    let clean = term.trim();
    if (type === "domain" && clean) {
      try {
        const parsed = new URL(/^https?:\/\//i.test(clean) ? clean : `https://${clean}`);
        if (!parsed.hostname.includes(".") || parsed.username || parsed.password) throw new Error();
        clean = parsed.hostname.toLowerCase().replace(/^www\./, "");
      } catch {
        toast.error("Enter a valid domain, such as example.com.");
        return;
      }
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
        description:
          "Add a company, domain, city, niche, title, or other phrase that should co-occur.",
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
    ruleLock.current = true;
    setRulePending("new");
    try {
      saved = await ensureWatchTerm(record);
    } catch (error) {
      toast.error("Watch was not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
      return;
    } finally {
      ruleLock.current = false;
      setRulePending("");
    }
    if (!saved.created) {
      toast.info(
        saved.record.enabled
          ? "This exact watch rule already exists"
          : "This exact watch rule exists and is paused",
      );
      return;
    }
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
      if (result.outcome === "unavailable")
        toast.error("Mention coverage unavailable", {
          description:
            "No provider completed the scan. This is not evidence that no mentions exist.",
        });
      else if (result.partial || result.failed)
        toast.warning("Mention scan partially completed", {
          description: `${result.checked}/${result.total} terms checked; ${result.matched} matches, ${result.added} newly saved.`,
        });
      else
        toast.success(
          result.added
            ? `${result.added} new identity-matched mentions`
            : result.matched
              ? `${result.matched} matches already in your stream`
              : "Scan completed: no matching external coverage",
          {
            description:
              "Search results cover the providers checked, not the entire web. Owned-domain articles are excluded.",
          },
        );
    } catch (error: any) {
      toast.error("Mention scan failed", { description: String(error?.message ?? error) });
    } finally {
      setBusy(false);
    }
  };

  const changeRule = async (id: string, action: () => Promise<void>) => {
    if (ruleLock.current) return;
    ruleLock.current = true;
    setRulePending(id);
    try {
      await action();
    } catch (error) {
      toast.error("Watch change was not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      ruleLock.current = false;
      setRulePending("");
    }
  };
  const resetView = () => {
    setSearch("");
    setConfidence("all");
    setWatchFilter("all");
    setShowArchived(false);
    setPublicationDays(0);
  };

  return (
    <div className="intel-workspace">
      <CCHeader
        title="Mentions"
        subtitle="See who is talking about your brands. Inspect the identity match, open the source, and turn relevant coverage into a follow-up."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy || !enabledTerms.length}
            className="btn-primary"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            {busy ? "Scanning coverage…" : "Scan coverage"}
          </button>
        }
      />
      <IntelligenceMetrics
        items={[
          {
            label: "Saved external matches",
            value: activeMentions,
            hint: "Active results · equivalent duplicates grouped",
            tone: "accent",
            onClick: () => {
              setTab("coverage");
              resetView();
            },
          },
          {
            label: "High confidence · 30d",
            value: highConfidence,
            hint: "Published date confirmed · identity match only",
            onClick: () => {
              setTab("coverage");
              resetView();
              setConfidence("high");
              setPublicationDays(30);
            },
          },
          {
            label: "Enabled watch rules",
            value: enabledTerms.length,
            hint: `${terms.length - enabledTerms.length} paused · ${rulesNeedingAttention} need a successful check`,
            onClick: () => setTab("rules"),
          },
          {
            label: "Latest scan attempt",
            value: latestScan ? relTime(latestScan) : "Not scanned",
            hint: "Provider completion is shown in scan details",
            onClick: () => setTab("report"),
          },
        ]}
      />
      <IntelligenceTabs
        value={tab}
        onChange={setTab}
        label="Mention workspace views"
        items={[
          { id: "coverage", label: "Coverage", count: activeMentions, icon: <Radio size={15} /> },
          {
            id: "rules",
            label: "Watch rules",
            count: terms.length,
            icon: <SlidersHorizontal size={15} />,
          },
          { id: "report", label: "Scan details", icon: <FileText size={15} /> },
        ]}
      />

      {tab === "coverage" && (
        <section className="space-y-4" aria-label="External mention coverage">
          <IntelligenceHeading
            eyebrow="Reputation & opportunity"
            title="Your mention inbox"
            description="External coverage of the identities you watch. Identity confidence describes the match; the publisher's claims remain unverified."
            actions={
              <button
                type="button"
                disabled={!mentions.length}
                className="btn-secondary"
                onClick={() =>
                  downloadIntelligenceCsv(
                    "mission-control-mentions.csv",
                    [
                      "Title",
                      "Watched identity",
                      "Publisher",
                      "URL",
                      "Date",
                      "Date basis",
                      "Identity confidence",
                      "Evidence",
                      "Status",
                    ],
                    mentions.map((item) => [
                      item.title,
                      item.matchedTerm,
                      item.source,
                      item.url,
                      item.publishedAt,
                      item.dateBasis || "unknown",
                      item.confidence,
                      item.verificationReason,
                      item.status,
                    ]),
                  )
                }
              >
                <Download size={14} />
                Export view
              </button>
            }
          />
          <div className="intel-toolbar">
            <label className="intel-search-field">
              <Search size={15} />
              <input
                aria-label="Filter mentions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search a mention, publisher or identity"
              />
            </label>
            <select
              aria-label="Filter by watched identity"
              className="intel-select"
              value={watchFilter}
              onChange={(event) => setWatchFilter(event.target.value)}
            >
              <option value="all">All identities</option>
              {terms.map((watch) => (
                <option key={watch.id} value={watch.id}>
                  {watch.term}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter identity confidence"
              className="intel-select"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value as typeof confidence)}
            >
              <option value="all">All confidence levels</option>
              <option value="high">High confidence</option>
              <option value="medium">Medium confidence</option>
            </select>
            <select
              aria-label="Filter mention publication dates"
              className="intel-select"
              value={publicationDays}
              onChange={(event) => setPublicationDays(Number(event.target.value))}
            >
              <option value={0}>All saved dates</option>
              <option value={7}>Published · 7 days</option>
              <option value={30}>Published · 30 days</option>
              <option value={90}>Published · 90 days</option>
            </select>
            <select
              aria-label="Sort mentions"
              className="intel-select"
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="newest">Newest first</option>
              <option value="confidence">Identity confidence</option>
            </select>
            <select
              aria-label="Mention status"
              className="intel-select"
              value={showArchived ? "archived" : "active"}
              onChange={(event) => setShowArchived(event.target.value === "archived")}
            >
              <option value="active">Active matches</option>
              <option value="archived">Archived matches</option>
            </select>
          </div>
          <div className="intel-filter-note">
            <span>
              {mentions.length} matching {showArchived ? "archived" : "active"} results ·
              Owned-domain pages excluded
              {publicationDays
                ? " · Published dates required"
                : " · Undated discoveries may be included"}
            </span>
            {(search ||
              confidence !== "all" ||
              watchFilter !== "all" ||
              showArchived ||
              publicationDays !== 0) && (
              <button type="button" className="intel-link-button" onClick={resetView}>
                Reset filters
              </button>
            )}
          </div>
          {!!rulesNeedingAttention && (
            <div className="intel-notice" data-tone="warning">
              <AlertTriangle size={16} />
              <div>
                {rulesNeedingAttention} enabled rule
                {rulesNeedingAttention === 1 ? " needs" : "s need"} a recent successful scan.
                Missing or failed coverage is unknown, not evidence that no mentions exist.{" "}
                <button
                  type="button"
                  onClick={() => setTab("report")}
                  className="intel-link-button"
                >
                  View scan details
                </button>
              </div>
            </div>
          )}
          {mentions.length ? (
            <div className="grid gap-3">
              {mentions.slice(0, visibleCount).map((item) => (
                <StreamRow key={item.id} item={item} />
              ))}
              {mentions.length > visibleCount && (
                <button
                  type="button"
                  className="btn-secondary justify-center"
                  onClick={() => setVisibleCount((count) => count + 40)}
                >
                  Show next {Math.min(40, mentions.length - visibleCount)} matches ·{" "}
                  {mentions.length - visibleCount} remaining
                </button>
              )}
            </div>
          ) : (
            <IntelligenceEmpty
              title={
                terms.length
                  ? "No matching external coverage in this view"
                  : "Start with an identity that matters"
              }
              description={
                terms.length
                  ? "Review the scan results to distinguish a completed search with no matches from unavailable providers. You can also widen your filters or refine the watch rule."
                  : "Track a brand, domain, exact handle or person. Identity anchors help separate relevant coverage from namesakes."
              }
              action={terms.length ? "Review scan details" : "Create a watch rule"}
              onAction={() => setTab(terms.length ? "report" : "rules")}
            />
          )}
        </section>
      )}

      {tab === "rules" && (
        <section className="space-y-5" aria-label="Manage mention watch rules">
          <IntelligenceHeading
            eyebrow="Identity directory"
            title="Watch the right names"
            description="Each rule is a precise identity search. Add context to avoid namesakes, and exclude phrases that repeatedly create false matches."
          />
          <Panel>
            <form
              className="intel-form"
              onSubmit={(event) => {
                event.preventDefault();
                void addTerm();
              }}
            >
              <div className="intel-form-grid">
                <label className="intel-field">
                  Brand, domain, handle or name
                  <input
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="e.g. GearUpToFit"
                    required
                  />
                </label>
                <label className="intel-field">
                  Identity type
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as WatchTermType)}
                  >
                    {TYPES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="intel-field">
                  {type === "name" ? "Required identity anchors" : "Identity anchors"}
                  <input
                    value={anchors}
                    onChange={(event) => setAnchors(event.target.value)}
                    placeholder="Company, domain, field of work"
                    required={type === "name"}
                  />
                  <small>Comma-separated context. Person names require at least one anchor.</small>
                </label>
                <label className="intel-field">
                  Exclude these contexts
                  <input
                    value={negatives}
                    onChange={(event) => setNegatives(event.target.value)}
                    placeholder="Unrelated company, location or topic"
                  />
                  <small>Comma-separated phrases that indicate an unrelated result.</small>
                </label>
              </div>
              <div className="intel-form-footer">
                <p>{TYPES.find((option) => option.id === type)?.hint}</p>
                <button type="submit" disabled={Boolean(rulePending)} className="btn-primary">
                  <Plus size={15} />
                  {rulePending === "new" ? "Saving…" : "Add watch rule"}
                </button>
              </div>
            </form>
          </Panel>
          {!!terms.length && (
            <>
              <div className="intel-toolbar">
                <label className="intel-search-field">
                  <Search size={15} />
                  <input
                    value={ruleQuery}
                    onChange={(event) => setRuleQuery(event.target.value)}
                    aria-label="Find watch rules"
                    placeholder="Find an identity or anchor"
                  />
                </label>
                <span className="text-xs text-muted-foreground">
                  {visibleRules.length} of {terms.length} rules · equivalent copies grouped
                </span>
              </div>
              <div className="intel-source-list">
                {visibleRules.map((watch) => (
                  <article key={watch.id} className="intel-source-row" data-paused={!watch.enabled}>
                    <div className="intel-source-icon">
                      <UserRound size={17} />
                    </div>
                    <div className="intel-source-body">
                      <div className="intel-source-title">
                        {watch.term}
                        <span className="intel-pill">{watch.type}</span>
                        <span
                          className="intel-pill"
                          data-tone={watch.enabled && watch.lastError ? "warning" : undefined}
                        >
                          {watch.enabled
                            ? watch.lastError
                              ? "Needs attention"
                              : "Enabled"
                            : "Paused"}
                        </span>
                      </div>
                      <div className="intel-source-meta">
                        <span>
                          {watch.lastSuccessAt
                            ? `Last success ${relTime(watch.lastSuccessAt)}`
                            : "No successful lookup recorded"}
                        </span>
                        {watch.records.length > 1 && (
                          <span>{watch.records.length} identical saved copies</span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Anchors: {watch.anchors?.join(", ") || "None"}
                        {!!watch.negatives?.length && ` · Excludes: ${watch.negatives.join(", ")}`}
                      </p>
                      {watch.lastError && (
                        <p className="mt-2 break-words text-xs leading-relaxed text-warning">
                          {watch.lastError}
                        </p>
                      )}
                      {editingRule === watch.id && (
                        <form
                          className="intel-form mt-4"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void changeRule(watch.id, async () => {
                              const patch = {
                                anchors: [
                                  ...new Set(
                                    editAnchors
                                      .split(",")
                                      .map((value) => value.trim())
                                      .filter(Boolean),
                                  ),
                                ],
                                negatives: [
                                  ...new Set(
                                    editNegatives
                                      .split(",")
                                      .map((value) => value.trim())
                                      .filter(Boolean),
                                  ),
                                ],
                                lastCheckedAt: undefined,
                                lastSuccessAt: undefined,
                                lastError: undefined,
                              };
                              if (watch.type === "name" && !patch.anchors.length) {
                                toast.error("A personal-name rule needs at least one anchor");
                                return;
                              }
                              await db.transaction("rw", db.watchTerms, async () => {
                                for (const id of watch.memberIds)
                                  await db.watchTerms.update(id, patch);
                              });
                              watch.memberIds.forEach((id) =>
                                markCloudRecordDirty("watchTerms", id),
                              );
                              queueCloudPush();
                              setEditingRule("");
                              toast.success("Watch rule updated", {
                                description:
                                  "Run a new scan to apply this context. Saved matches retain their original evidence.",
                              });
                            });
                          }}
                        >
                          <div className="intel-form-grid">
                            <label className="intel-field">
                              Identity anchors
                              <input
                                value={editAnchors}
                                onChange={(event) => setEditAnchors(event.target.value)}
                                required={watch.type === "name"}
                              />
                            </label>
                            <label className="intel-field">
                              Excluded contexts
                              <input
                                value={editNegatives}
                                onChange={(event) => setEditNegatives(event.target.value)}
                              />
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={Boolean(rulePending)}
                              className="btn-primary"
                            >
                              Save rule
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setEditingRule("")}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                    <div className="intel-source-actions">
                      <button
                        type="button"
                        className="intel-icon-button"
                        disabled={Boolean(rulePending)}
                        aria-label={`Edit matching context for ${watch.term}`}
                        onClick={() => {
                          setEditingRule(watch.id);
                          setEditAnchors((watch.anchors || []).join(", "));
                          setEditNegatives((watch.negatives || []).join(", "));
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="intel-icon-button"
                        disabled={Boolean(rulePending)}
                        aria-pressed={watch.enabled}
                        aria-label={`${watch.enabled ? "Pause" : "Enable"} watch for ${watch.term}`}
                        onClick={() =>
                          void changeRule(watch.id, async () => {
                            await db.transaction("rw", db.watchTerms, async () => {
                              for (const id of watch.memberIds)
                                await db.watchTerms.update(id, { enabled: !watch.enabled });
                            });
                            watch.memberIds.forEach((id) => markCloudRecordDirty("watchTerms", id));
                            queueCloudPush();
                          })
                        }
                      >
                        <Power size={15} />
                      </button>
                      <button
                        type="button"
                        className="intel-icon-button"
                        data-danger="true"
                        disabled={Boolean(rulePending)}
                        aria-label={`Remove watch for ${watch.term}`}
                        onClick={() =>
                          void changeRule(watch.id, async () => {
                            const removed = await removeWatchTerms(watch.memberIds);
                            toast("Watch rule removed", {
                              description: "Previously saved mentions are preserved.",
                              action: {
                                label: "Undo",
                                onClick: () =>
                                  void changeRule(watch.id, async () => {
                                    await restoreWatchTerms(removed);
                                    toast.success("Watch rule restored");
                                  }),
                              },
                            });
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!visibleRules.length && (
                <EmptyState
                  title="No watch rules match"
                  hint="Clear the rule search to see all saved identities."
                />
              )}
            </>
          )}
        </section>
      )}

      {tab === "report" && (
        <section className="space-y-5" aria-label="Mention scan report">
          <IntelligenceHeading
            eyebrow="Collection evidence"
            title="Know what was actually checked"
            description="A scan covers the providers it can reach, not the entire web. Undated search results are discoveries, not proof of recent publication."
          />
          {report ? (
            <>
              <div
                role="status"
                className="intel-notice"
                data-tone={
                  report.outcome === "unavailable" || report.partial || report.failed
                    ? "warning"
                    : undefined
                }
              >
                <ShieldCheck size={18} />
                <div>
                  <strong className="text-foreground">
                    {report.checked}/{report.total} terms checked · {report.matched} identity
                    matches · {report.added} newly saved.
                  </strong>
                  <p>
                    {report.outcome === "unavailable"
                      ? "No provider completed this scan. Coverage remains unknown."
                      : report.partial || report.failed
                        ? "Some checks failed. The saved matches do not represent complete coverage."
                        : "Configured checks completed. Results still require source review."}
                  </p>
                </div>
              </div>
              <div className="intel-source-list">
                {report.details.map((detail) => (
                  <article key={detail.termId} className="intel-source-row">
                    <div className="intel-source-body">
                      <div className="intel-source-title">
                        {detail.term}
                        <span
                          className="intel-pill"
                          data-tone={detail.checked && !detail.error ? "success" : "warning"}
                        >
                          {detail.checked ? (detail.error ? "Partial" : "Checked") : "Unavailable"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {detail.checked
                          ? `${detail.matches} identity matches from ${detail.candidates} candidates · ${detail.excludedOwned} owned pages excluded`
                          : "No provider completed a trustworthy lookup for this term."}
                        {detail.cached ? " · Cached lookup (up to 5 minutes)" : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {detail.providers?.map((provider) => (
                          <span
                            key={provider.name}
                            className="intel-pill"
                            data-tone={provider.ok ? "success" : "warning"}
                            title={provider.error || undefined}
                          >
                            {provider.name}:{" "}
                            {provider.ok ? `${provider.count} candidates` : "unavailable"}
                          </span>
                        ))}
                      </div>
                      {detail.error && (
                        <p className="mt-2 text-xs leading-relaxed text-warning">{detail.error}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="intel-notice">
              <FileText size={18} />
              <div>
                No detailed scan report is available in this session. Run{" "}
                <strong>Scan coverage</strong> to see per-provider results. Saved rule timestamps
                and errors remain available below.
              </div>
            </div>
          )}
          {!!enabledTerms.length && (
            <Panel>
              <h3 className="text-sm font-semibold">Saved rule health</h3>
              <div className="mt-4 space-y-3">
                {enabledTerms.map((watch) => (
                  <div
                    key={watch.id}
                    className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <strong className="text-sm">{watch.term}</strong>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {watch.lastError ||
                          (watch.lastSuccessAt
                            ? "A successful lookup is recorded; review its date."
                            : "No successful lookup recorded.")}
                      </p>
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      <div>
                        Attempt: {watch.lastCheckedAt ? relTime(watch.lastCheckedAt) : "Never"}
                      </div>
                      <div>
                        Success:{" "}
                        {watch.lastSuccessAt ? relTime(watch.lastSuccessAt) : "Not recorded"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {neverScanned > 0 && (
                <p className="mt-3 text-xs text-warning">
                  {neverScanned} enabled rules have never been scanned.
                </p>
              )}
            </Panel>
          )}
        </section>
      )}
      <CollectorStatusPanel kind="mentions" />
    </div>
  );
}
