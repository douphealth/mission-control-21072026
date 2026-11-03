import CollectorStatusPanel from "@/components/controlcenter/CollectorStatusPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Plus,
  Power,
  RefreshCw,
  Search,
  BookOpen,
  Download,
  Globe2,
  Pencil,
  Radio,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useFeedSources, useStreamItems } from "@/hooks/useTableData";
import { db } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { localScore, runIndustryCollector } from "@/lib/controlCenter";
import { ensureFeedSource } from "@/lib/intelligenceSources";
import { removeFeedSources, restoreFeedSources } from "@/lib/intelligenceSourceManagement";
import { deduplicateStreamItems, groupFeedSources } from "@/lib/intelligencePresentation";
import {
  IntelligenceMetrics,
  IntelligenceTabs,
  IntelligenceHeading,
  IntelligenceEmpty,
  downloadIntelligenceCsv,
} from "@/components/controlcenter/IntelligenceWorkspace";
import { canonicalWebUrl, queryRelevance } from "@/lib/intelligenceQuality";
import { searchIndustryTopic } from "@/lib/controlCenter.functions";
import { CCHeader, EmptyState, Panel, StreamRow, relTime } from "@/components/controlcenter/ui";

type SearchStory = {
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  source?: string;
  sourceUrl?: string;
  corroborationCount?: number;
  evidenceLevel?: "high" | "medium" | "limited";
  evidenceReason?: string;
  relevanceScore?: number;
  retrievalProvider?: "dataforseo" | "google-news" | "bing-news";
  retrievalProviders?: Array<"dataforseo" | "google-news" | "bing-news">;
};

export default function IndustryPage() {
  const savedSources = useFeedSources();
  const sources = useMemo(() => groupFeedSources(savedSources), [savedSources]);
  const items = useStreamItems();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [topics, setTopics] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [streamQuery, setStreamQuery] = useState("");
  const [streamDays, setStreamDays] = useState(30);
  const [streamSort, setStreamSort] = useState<"newest" | "priority">("newest");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tab, setTab] = useState<"monitor" | "research" | "sources">("monitor");
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceView, setSourceView] = useState<"all" | "attention" | "enabled" | "paused">("all");
  const [sourcePending, setSourcePending] = useState("");
  const sourceLock = useRef(false);
  const [editingSource, setEditingSource] = useState("");
  const [editName, setEditName] = useState("");
  const [editTopics, setEditTopics] = useState("");
  const [visibleCount, setVisibleCount] = useState(40);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(7);
  const [searching, setSearching] = useState(false);
  const [searchedAt, setSearchedAt] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const [cachedResult, setCachedResult] = useState(false);
  const [providerStatus, setProviderStatus] = useState<
    Awaited<ReturnType<typeof searchIndustryTopic>>["providers"]
  >([]);
  const searchLock = useRef(false);
  const [searchStories, setSearchStories] = useState<SearchStory[]>([]);
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "medium" | "high">("medium");
  const autoRefreshStarted = useRef(false);

  const allStories = useMemo(
    () => deduplicateStreamItems(items.filter((item) => item.kind === "industry")),
    [items],
  );
  const enabledTopics = useMemo(
    () => [
      ...new Set(
        sources.filter((source) => source.enabled).flatMap((source) => source.topics || []),
      ),
    ],
    [sources],
  );
  const sourceAliases = useMemo(
    () =>
      new Map(sources.flatMap((source) => source.memberIds.map((id) => [id, source.id] as const))),
    [sources],
  );
  const streamById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const stories = useMemo(
    () =>
      allStories
        .filter((item) => item.status === (showArchived ? "archived" : "active"))
        .filter(
          (item) =>
            sourceFilter === "all" ||
            item.memberIds.some(
              (id) => sourceAliases.get(streamById.get(id)?.sourceId || "") === sourceFilter,
            ),
        )
        .filter(
          (item) =>
            !streamQuery.trim() ||
            `${item.title} ${item.summary || ""} ${item.source}`
              .toLowerCase()
              .includes(streamQuery.trim().toLowerCase()),
        )
        .filter(
          (item) =>
            !streamDays ||
            (item.dateBasis === "published" &&
              Number.isFinite(Date.parse(item.publishedAt)) &&
              Date.parse(item.publishedAt) >= Date.now() - streamDays * 86_400_000 &&
              Date.parse(item.publishedAt) <= Date.now() + 300_000),
        )
        .map((item) => ({ ...item, score: localScore(item, enabledTopics) }))
        .sort((a, b) =>
          streamSort === "priority"
            ? b.score - a.score || b.publishedAt.localeCompare(a.publishedAt)
            : b.publishedAt.localeCompare(a.publishedAt) || b.score - a.score,
        ),
    [
      allStories,
      showArchived,
      sourceFilter,
      sourceAliases,
      streamById,
      streamQuery,
      streamDays,
      enabledTopics,
      streamSort,
    ],
  );
  const recentStories = allStories.filter(
    (item) =>
      item.status === "active" &&
      item.dateBasis === "published" &&
      Date.parse(item.publishedAt) >= Date.now() - 7 * 86_400_000 &&
      Date.parse(item.publishedAt) <= Date.now() + 300_000,
  ).length;
  const activeCount = allStories.filter((item) => item.status === "active").length;
  const searchResults = searchStories.filter(
    (story) =>
      evidenceFilter === "all" ||
      (evidenceFilter === "high"
        ? story.evidenceLevel === "high"
        : story.evidenceLevel !== "limited"),
  );

  const enabled = sources.filter((source) => source.enabled);
  const sourceErrors = sources.filter((source) => source.enabled && source.lastError);
  const visibleSources = sources.filter(
    (source) =>
      (!sourceSearch.trim() ||
        `${source.name} ${source.url} ${(source.topics || []).join(" ")}`
          .toLowerCase()
          .includes(sourceSearch.trim().toLowerCase())) &&
      (sourceView === "all" ||
        (sourceView === "attention"
          ? source.enabled && Boolean(source.lastError || !source.lastCheckedAt)
          : sourceView === "enabled"
            ? source.enabled
            : !source.enabled)),
  );
  const lastChecked = enabled
    .map((source) => source.lastCheckedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  useEffect(() => {
    if (autoRefreshStarted.current || !enabled.length) return;
    const stale = enabled.some(
      (source) =>
        !source.lastCheckedAt ||
        Date.now() - new Date(source.lastCheckedAt).getTime() > 6 * 3_600_000,
    );
    if (!stale) return;
    autoRefreshStarted.current = true;
    setBusy(true);
    void runIndustryCollector(false)
      .catch(() => {
        // Collector health records the failure; avoid noisy auto-refresh toasts.
      })
      .finally(() => setBusy(false));
  }, [enabled]);

  useEffect(() => {
    setVisibleCount(40);
  }, [streamQuery, streamDays, sourceFilter, streamSort, showArchived]);

  const addSource = async () => {
    const clean = url.trim();
    if (!clean || sourceLock.current) return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(clean) && !/^https?:\/\//i.test(clean)) {
      toast.error("Use an HTTP or HTTPS publisher URL");
      return;
    }
    const normalised = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    let host = "";
    try {
      const parsed = new URL(normalised);
      if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password)
        throw new Error("Use a public HTTP or HTTPS URL.");
      host = parsed.hostname.replace(/^www\./, "");
    } catch {
      toast.error("That does not look like a valid URL");
      return;
    }
    const duplicate = sources.find((source) => {
      try {
        return (
          canonicalWebUrl(source.url) === canonicalWebUrl(normalised) ||
          Boolean(source.feedUrl && canonicalWebUrl(source.feedUrl) === canonicalWebUrl(normalised))
        );
      } catch {
        return source.url === normalised;
      }
    });
    if (duplicate) {
      toast.info("Source already tracked", { description: duplicate.name });
      return;
    }
    const record = {
      name: name.trim() || host,
      url: normalised,
      topics: topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    sourceLock.current = true;
    setSourcePending("new");
    try {
      const saved = await ensureFeedSource(record);
      if (!saved.created) {
        toast.info(
          saved.record.enabled
            ? "Source already tracked"
            : "This source is already tracked and paused",
        );
        return;
      }
      queueCloudPush();
      setUrl("");
      setName("");
      setTopics("");
      toast.success(`Added ${record.name}`, {
        description: "Refresh tracked feeds to collect this publisher's latest available stories.",
      });
    } catch (error) {
      toast.error("Source was not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      sourceLock.current = false;
      setSourcePending("");
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const { added, errors, checked, total } = await runIndustryCollector();
      const unavailable = total > 0 && checked === 0;
      toast[unavailable || errors.length ? "warning" : "success"](
        unavailable
          ? "Tracked feeds unavailable — no fresh coverage verified"
          : added
            ? `${added} new ${added === 1 ? "story" : "stories"}`
            : "Feed refresh finished — no new published stories",
        {
          description: [
            `${checked}/${total} feeds checked successfully`,
            ...errors.slice(0, 2),
          ].join(" · "),
        },
      );
    } catch (error: any) {
      toast.error("Feed refresh failed", { description: String(error?.message ?? error) });
    } finally {
      setBusy(false);
    }
  };

  const searchLatest = async () => {
    if (searchLock.current) return;
    const clean = query.trim();
    if (clean.length < 2) {
      toast.error("Enter a subject to search");
      return;
    }
    searchLock.current = true;
    setSearching(true);
    setLookupStatus("");
    try {
      const response = await searchIndustryTopic({ data: { query: clean, days } });
      const minTime = Date.now() - days * 86_400_000;
      const trackedMatches: SearchStory[] = items
        .filter(
          (story) =>
            story.kind === "industry" &&
            story.status === "active" &&
            story.evidenceType === "direct-feed" &&
            story.dateBasis === "published" &&
            new Date(story.publishedAt).getTime() >= minTime,
        )
        .map((story) => ({
          title: story.title,
          url: story.url,
          summary: story.summary,
          publishedAt: story.publishedAt,
          source: story.source,
          sourceUrl: story.sourceUrl,
          corroborationCount: story.corroborationCount,
          relevanceScore: queryRelevance(clean, story.title, story.summary),
          evidenceLevel: "high" as const,
          evidenceReason: "Direct match from a publisher/feed source you explicitly track.",
        }))
        .filter((story) => story.relevanceScore >= 40);

      const merged = new Map<string, SearchStory>();
      [...trackedMatches, ...response.items].forEach((story) => {
        const key = canonicalWebUrl(story.url);
        const existing = merged.get(key);
        if (!existing || (story.relevanceScore ?? 0) > (existing.relevanceScore ?? 0)) {
          merged.set(key, story);
        }
      });
      const rank = (story: SearchStory) =>
        story.evidenceLevel === "high" ? 0 : story.evidenceLevel === "medium" ? 1 : 2;
      const combined = [...merged.values()].sort(
        (a, b) =>
          (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) ||
          rank(a) - rank(b) ||
          new Date(b.publishedAt || response.fetchedAt).getTime() -
            new Date(a.publishedAt || response.fetchedAt).getTime(),
      );

      setSearchStories(combined);
      setProviderStatus(response.providers || []);
      setSearchedAt(response.fetchedAt);
      setResolvedQuery(clean);
      setCachedResult(response.cached);
      setLookupStatus(
        response.error ||
          (response.degraded
            ? "Some providers failed. Coverage is incomplete; results are from remaining sources."
            : ""),
      );

      const providerSummary = (response.providers ?? [])
        .filter((provider) => provider.configured && provider.ok)
        .map((provider) => {
          const label =
            provider.provider === "dataforseo"
              ? "DataForSEO"
              : provider.provider === "bing-news"
                ? "Bing News"
                : "Google News";
          return `${label} ${provider.itemCount}`;
        })
        .join(" · ");

      if (response.error && !combined.length) {
        toast.warning("Live providers are temporarily unavailable", {
          description: trackedMatches.length
            ? `Tracked feeds were still checked. ${response.error}`
            : "No live provider returned usable coverage. Try again shortly; tracked feeds remain available.",
        });
      } else {
        toast[response.degraded ? "warning" : "success"](
          combined.length
            ? `${combined.length} current results for “${clean}”`
            : `No recent verified results for “${clean}”`,
          {
            description:
              [
                providerSummary || undefined,
                trackedMatches.length
                  ? `${trackedMatches.length} tracked-feed match${trackedMatches.length === 1 ? "" : "es"} included`
                  : undefined,
                response.degraded
                  ? "One live provider was unavailable; results were served by the remaining sources."
                  : undefined,
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
          },
        );
      }
    } catch (error: any) {
      setLookupStatus(
        "The latest search failed. Previous results keep their original query and retrieval date.",
      );
      toast.error("Live topic search failed", { description: String(error?.message ?? error) });
    } finally {
      setSearching(false);
      searchLock.current = false;
    }
  };

  const mutateSource = async (sourceId: string, action: () => Promise<void>) => {
    if (sourceLock.current) return;
    sourceLock.current = true;
    setSourcePending(sourceId);
    try {
      await action();
    } catch (error) {
      toast.error("Source change was not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      sourceLock.current = false;
      setSourcePending("");
    }
  };

  const clearFilters = () => {
    setStreamQuery("");
    setStreamDays(0);
    setSourceFilter("all");
    setShowArchived(false);
  };

  return (
    <div className="intel-workspace">
      <CCHeader
        title="Trends"
        subtitle="A focused view of the stories that can change your next decision. Track publishers, research a topic, and capture what matters."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy || !enabled.length}
            className="btn-primary disabled:opacity-50"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            {busy ? "Checking publishers…" : "Refresh feeds"}
          </button>
        }
      />

      <IntelligenceMetrics
        items={[
          {
            label: "Published this week",
            value: recentStories,
            hint: "Distinct saved stories · last 7 days",
            tone: "accent",
            onClick: () => {
              setTab("monitor");
              setShowArchived(false);
              setStreamDays(7);
              setSourceFilter("all");
              setStreamQuery("");
            },
          },
          {
            label: "Enabled sources",
            value: enabled.length,
            hint: `${sources.length - enabled.length} paused · identical feeds grouped`,
            onClick: () => {
              setTab("sources");
              setSourceView("enabled");
            },
          },
          {
            label: "Feed errors",
            value: sourceErrors.length,
            hint: sourceErrors.length
              ? "Enabled feeds requiring attention"
              : "No recorded errors in enabled feeds",
            tone: sourceErrors.length ? "warning" : undefined,
            onClick: () => {
              setTab("sources");
              setSourceView("attention");
            },
          },
          {
            label: "Latest feed check",
            value: lastChecked ? relTime(lastChecked) : "Not checked",
            hint: "Latest attempt · see source status for coverage",
          },
        ]}
      />

      <IntelligenceTabs
        value={tab}
        onChange={setTab}
        label="Trends workspace views"
        items={[
          { id: "monitor", label: "Monitor", count: activeCount, icon: <Radio size={15} /> },
          { id: "research", label: "Research a topic", icon: <Search size={15} /> },
          {
            id: "sources",
            label: "Sources",
            count: sources.length,
            icon: <SlidersHorizontal size={15} />,
          },
        ]}
      />

      {tab === "monitor" && (
        <section className="space-y-4" aria-label="Monitored stories">
          <IntelligenceHeading
            eyebrow="Your reading desk"
            title="Publisher intelligence"
            description="Newest publications first. Open the original source, capture a follow-up, or archive a story after review."
            actions={
              <button
                type="button"
                className="btn-secondary"
                disabled={!stories.length}
                onClick={() =>
                  downloadIntelligenceCsv(
                    "mission-control-trends.csv",
                    [
                      "Title",
                      "Source",
                      "URL",
                      "Date",
                      "Date basis",
                      "Priority",
                      "Evidence",
                      "Status",
                    ],
                    stories.map((story) => [
                      story.title,
                      story.source,
                      story.url,
                      story.publishedAt,
                      story.dateBasis || "unknown",
                      story.score,
                      story.evidenceType,
                      story.status,
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
              <Search size={15} aria-hidden="true" />
              <input
                aria-label="Filter saved trends"
                value={streamQuery}
                onChange={(event) => setStreamQuery(event.target.value)}
                placeholder="Search stories and publishers"
              />
            </label>
            <select
              className="intel-select"
              aria-label="Filter saved publication dates"
              value={streamDays}
              onChange={(event) => setStreamDays(Number(event.target.value))}
            >
              <option value={7}>Published · 7 days</option>
              <option value={30}>Published · 30 days</option>
              <option value={90}>Published · 90 days</option>
              <option value={0}>All saved dates</option>
            </select>
            <select
              className="intel-select"
              aria-label="Filter source"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
            >
              <option value="all">All sources</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            <select
              className="intel-select"
              aria-label="Sort saved trends"
              value={streamSort}
              onChange={(event) => setStreamSort(event.target.value as typeof streamSort)}
            >
              <option value="newest">Newest first</option>
              <option value="priority">Review priority</option>
            </select>
            <select
              className="intel-select"
              aria-label="Story status"
              value={showArchived ? "archived" : "active"}
              onChange={(event) => setShowArchived(event.target.value === "archived")}
            >
              <option value="active">Active stories</option>
              <option value="archived">Archived stories</option>
            </select>
          </div>
          <div className="intel-filter-note">
            <span>
              <strong>{stories.length.toLocaleString("en-US")}</strong> matching stories
              {streamDays
                ? " · Publication dates required for this window"
                : " · Includes undated discoveries"}{" "}
              · Duplicate URLs grouped
            </span>
            {(streamQuery || sourceFilter !== "all" || streamDays !== 0 || showArchived) && (
              <button type="button" className="intel-link-button" onClick={clearFilters}>
                Reset filters
              </button>
            )}
          </div>
          {stories.length ? (
            <div className="grid gap-3">
              {stories.slice(0, visibleCount).map((story) => (
                <StreamRow key={story.id} item={story} />
              ))}
              {stories.length > visibleCount && (
                <button
                  type="button"
                  className="btn-secondary justify-center"
                  onClick={() => setVisibleCount((count) => count + 40)}
                >
                  Show next {Math.min(40, stories.length - visibleCount)} stories ·{" "}
                  {stories.length - visibleCount} remaining
                </button>
              )}
            </div>
          ) : (
            <IntelligenceEmpty
              title={
                activeCount || showArchived
                  ? "No stories match this view"
                  : "Build your intelligence stream"
              }
              description={
                activeCount || showArchived
                  ? "Widen the date range or reset the publisher and search filters. An empty view does not mean your sources were checked successfully."
                  : "Add a publisher or RSS feed, then refresh. You can also research a topic without setting up a permanent source."
              }
              action={activeCount || showArchived ? "Show all saved stories" : "Add a publisher"}
              onAction={activeCount || showArchived ? clearFilters : () => setTab("sources")}
            />
          )}
        </section>
      )}

      {tab === "research" && (
        <section className="space-y-5" aria-label="Topic research">
          <Panel>
            <IntelligenceHeading
              eyebrow="On-demand research"
              title="What do you need to know?"
              description="Search current coverage from available news providers and your tracked feeds. Every result links to its original publisher."
            />
            <form
              className="mt-5 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void searchLatest();
              }}
            >
              <label className="intel-search-field">
                <Search size={16} aria-hidden="true" />
                <input
                  aria-label="Topic to research"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="A topic, market, product or search update…"
                  minLength={2}
                  required
                />
              </label>
              <select
                className="intel-select"
                aria-label="Search publication window"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                <option value={1}>Last 24 hours</option>
                <option value={3}>Last 3 days</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              <button type="submit" disabled={searching} className="btn-primary">
                <Search size={15} className={searching ? "animate-pulse" : ""} />
                {searching ? "Searching…" : "Search coverage"}
              </button>
            </form>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Coverage depends on provider availability. Similar reports across domains do not
              establish independent corroboration or verify a claim.
            </p>
          </Panel>
          {lookupStatus && (
            <div role="status" className="intel-notice" data-tone="warning">
              <AlertTriangle size={16} />
              <span>{lookupStatus}</span>
            </div>
          )}
          {searchedAt && (
            <>
              <IntelligenceHeading
                title={`Results for “${resolvedQuery}”`}
                description={`${searchResults.length} matching results · ${cachedResult ? "cached response" : "retrieved"} ${relTime(searchedAt)}`}
              />
              <div className="intel-toolbar">
                <select
                  className="intel-select"
                  aria-label="Search evidence filter"
                  value={evidenceFilter}
                  onChange={(event) =>
                    setEvidenceFilter(event.target.value as typeof evidenceFilter)
                  }
                >
                  <option value="medium">Publisher-attributed coverage</option>
                  <option value="high">Tracked / multiple domains</option>
                  <option value="all">All retrieved evidence</option>
                </select>
                <div className="flex flex-wrap gap-2" aria-label="Search provider coverage">
                  {providerStatus
                    .filter((provider) => provider.configured)
                    .map((provider) => (
                      <span
                        key={provider.provider}
                        className="intel-pill"
                        data-tone={provider.ok ? "success" : "warning"}
                        title={provider.error}
                      >
                        {provider.provider === "google-news"
                          ? "Google News"
                          : provider.provider === "bing-news"
                            ? "Bing News"
                            : "DataForSEO"}
                        : {provider.ok ? `${provider.itemCount} retrieved` : "unavailable"}
                      </span>
                    ))}
                </div>
              </div>
              {searchResults.length ? (
                <div className="intel-source-list">
                  {searchResults.slice(0, 60).map((story) => (
                    <article key={story.url} className="intel-source-row">
                      <div
                        className="intel-source-icon"
                        title="Subject relevance · not a credibility score"
                      >
                        {Math.round(
                          story.relevanceScore ??
                            queryRelevance(resolvedQuery, story.title, story.summary),
                        )}
                      </div>
                      <div className="intel-source-body">
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold leading-relaxed hover:text-primary"
                        >
                          {story.title}
                        </a>
                        <div className="intel-source-meta">
                          <strong>{story.source || "Publisher unavailable"}</strong>
                          <span title={story.publishedAt || searchedAt}>
                            {story.publishedAt
                              ? `Published ${relTime(story.publishedAt)}`
                              : `Publication date unavailable · retrieved ${relTime(searchedAt)}`}
                          </span>
                          <span title={story.evidenceReason}>
                            {story.evidenceLevel === "high"
                              ? "Tracked / multiple domains"
                              : story.evidenceLevel === "medium"
                                ? "Publisher attributed"
                                : "Limited evidence"}
                          </span>
                        </div>
                        {story.summary && (
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {story.summary}
                          </p>
                        )}
                        {!!story.corroborationCount && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Similar coverage on {story.corroborationCount + 1} publisher domains ·
                            independence unverified
                          </p>
                        )}
                      </div>
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open source: ${story.title}`}
                        className="intel-icon-button"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No coverage matches the selected evidence filter"
                  hint="Try all retrieved evidence, a broader subject or a longer publication window. Check provider statuses before drawing conclusions."
                />
              )}
              {searchResults.length > 60 && (
                <p className="text-xs text-muted-foreground">
                  Showing the first 60 ranked results. Narrow the query for a more focused research
                  set.
                </p>
              )}
            </>
          )}
          {!searchedAt && (
            <div className="intel-notice">
              <BookOpen size={18} />
              <span>
                Use a specific subject such as a named product, policy update or market change.
                Search results remain separate from the sources you monitor every day.
              </span>
            </div>
          )}
        </section>
      )}

      {tab === "sources" && (
        <section className="space-y-5" aria-label="Manage trend sources">
          <IntelligenceHeading
            eyebrow="Source directory"
            title="A reading list you control"
            description="Choose the publishers that inform your decisions. Add topic phrases to refine review priority, pause noisy sources, and inspect failures."
          />
          <Panel>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void addSource();
              }}
              className="intel-form"
            >
              <div className="intel-form-grid">
                <label className="intel-field">
                  Publisher website or RSS URL
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com/feed"
                    required
                  />
                  <small>
                    Feed discovery runs when you refresh. A saved URL alone does not confirm
                    availability.
                  </small>
                </label>
                <label className="intel-field">
                  Publisher name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Optional · defaults to domain"
                  />
                </label>
                <label className="intel-field sm:col-span-2">
                  Topics to prioritize
                  <input
                    value={topics}
                    onChange={(event) => setTopics(event.target.value)}
                    placeholder="AI search, technical SEO, running technology"
                  />
                  <small>
                    Comma-separated phrases. Topic matches influence priority, not source
                    credibility.
                  </small>
                </label>
              </div>
              <div className="intel-form-footer">
                <p>
                  {sources.length} source{sources.length === 1 ? "" : "s"} saved · {enabled.length}{" "}
                  enabled
                </p>
                <button type="submit" disabled={Boolean(sourcePending)} className="btn-primary">
                  <Plus size={15} />
                  {sourcePending === "new" ? "Saving…" : "Add source"}
                </button>
              </div>
            </form>
          </Panel>
          <div className="intel-toolbar">
            <label className="intel-search-field">
              <Search size={15} />
              <input
                aria-label="Find sources"
                value={sourceSearch}
                onChange={(event) => setSourceSearch(event.target.value)}
                placeholder="Find a publisher or topic"
              />
            </label>
            <select
              className="intel-select"
              aria-label="Source status filter"
              value={sourceView}
              onChange={(event) => setSourceView(event.target.value as typeof sourceView)}
            >
              <option value="all">All sources</option>
              <option value="enabled">Enabled sources</option>
              <option value="attention">Needs attention</option>
              <option value="paused">Paused sources</option>
            </select>
          </div>
          {visibleSources.length ? (
            <div className="intel-source-list">
              {visibleSources.map((source) => (
                <article key={source.id} className="intel-source-row" data-paused={!source.enabled}>
                  <div className="intel-source-icon">
                    <Globe2 size={17} />
                  </div>
                  <div className="intel-source-body">
                    <div className="intel-source-title">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        {source.name}
                      </a>
                      <span
                        className="intel-pill"
                        data-tone={source.enabled && source.lastError ? "warning" : undefined}
                      >
                        {!source.enabled
                          ? "Paused"
                          : source.lastError
                            ? "Needs attention"
                            : source.lastCheckedAt
                              ? "Enabled"
                              : "Not checked"}
                      </span>
                    </div>
                    <div className="intel-source-meta">
                      <span>{source.url}</span>
                      <span>
                        {source.lastCheckedAt
                          ? `Last attempt ${relTime(source.lastCheckedAt)}`
                          : "No refresh attempted"}
                      </span>
                    </div>
                    {!!source.topics?.length && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Topics: {source.topics.join(", ")}
                      </p>
                    )}
                    {source.duplicateCount > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {source.memberIds.length} identical saved entries · displayed as one source
                      </p>
                    )}
                    {source.lastError && (
                      <p className="mt-2 break-words text-xs leading-relaxed text-warning">
                        {source.lastError}
                      </p>
                    )}
                    {editingSource === source.id && (
                      <form
                        className="intel-form mt-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void mutateSource(source.id, async () => {
                            const patch = {
                              name: editName.trim() || source.name,
                              topics: [
                                ...new Set(
                                  editTopics
                                    .split(",")
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                ),
                              ],
                            };
                            await db.transaction("rw", db.feedSources, async () => {
                              for (const id of source.memberIds)
                                await db.feedSources.update(id, patch);
                            });
                            source.memberIds.forEach((id) =>
                              markCloudRecordDirty("feedSources", id),
                            );
                            queueCloudPush();
                            setEditingSource("");
                            toast.success("Source settings saved");
                          });
                        }}
                      >
                        <div className="intel-form-grid">
                          <label className="intel-field">
                            Publisher name
                            <input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              required
                            />
                          </label>
                          <label className="intel-field">
                            Topics
                            <input
                              value={editTopics}
                              onChange={(event) => setEditTopics(event.target.value)}
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={Boolean(sourcePending)}
                            className="btn-primary"
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSource("")}
                            className="btn-secondary"
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
                      disabled={Boolean(sourcePending)}
                      aria-label={`Edit ${source.name}`}
                      onClick={() => {
                        setEditingSource(source.id);
                        setEditName(source.name);
                        setEditTopics((source.topics || []).join(", "));
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="intel-icon-button"
                      disabled={Boolean(sourcePending)}
                      aria-pressed={source.enabled}
                      aria-label={`${source.enabled ? "Pause" : "Enable"} ${source.name}`}
                      onClick={() =>
                        void mutateSource(source.id, async () => {
                          await db.transaction("rw", db.feedSources, async () => {
                            for (const id of source.memberIds)
                              await db.feedSources.update(id, { enabled: !source.enabled });
                          });
                          source.memberIds.forEach((id) => markCloudRecordDirty("feedSources", id));
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
                      disabled={Boolean(sourcePending)}
                      aria-label={`Remove ${source.name}`}
                      onClick={() =>
                        void mutateSource(source.id, async () => {
                          const removed = await removeFeedSources(source.memberIds);
                          toast("Source removed", {
                            description: "Saved stories are preserved.",
                            action: {
                              label: "Undo",
                              onClick: () =>
                                void mutateSource(source.id, async () => {
                                  await restoreFeedSources(removed);
                                  toast.success("Source restored");
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
          ) : (
            <EmptyState
              title={
                sources.length ? "No sources match this filter" : "Your source directory is empty"
              }
              hint={
                sources.length
                  ? "Choose All sources or clear the search to see the full directory."
                  : "Add your first publisher above, then refresh feeds."
              }
            />
          )}
        </section>
      )}
      <CollectorStatusPanel kind="feeds" />
    </div>
  );
}
