import CollectorStatusPanel from "@/components/controlcenter/CollectorStatusPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useFeedSources, useStreamItems, genId } from "@/hooks/useTableData";
import { db } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { localScore, runIndustryCollector } from "@/lib/controlCenter";
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
  const sources = useFeedSources();
  const items = useStreamItems();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [topics, setTopics] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [streamQuery, setStreamQuery] = useState("");
  const [streamDays, setStreamDays] = useState(0);
  const [visibleCount, setVisibleCount] = useState(40);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(7);
  const [searching, setSearching] = useState(false);
  const [searchedAt, setSearchedAt] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const [cachedResult, setCachedResult] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Awaited<ReturnType<typeof searchIndustryTopic>>["providers"]>([]);
  const searchLock = useRef(false);
  const [searchStories, setSearchStories] = useState<SearchStory[]>([]);
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "medium" | "high">("medium");
  const autoRefreshStarted = useRef(false);

  const stories = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.kind === "industry" &&
            (showArchived ? item.status === "archived" : item.status === "active"),
        )
        .filter(item => !streamQuery.trim() || `${item.title} ${item.summary || ""} ${item.source}`.toLowerCase().includes(streamQuery.trim().toLowerCase()))
        .filter(item => !streamDays || (item.dateBasis === "published" && Date.parse(item.publishedAt) >= Date.now() - streamDays * 86_400_000))
        .map(item => ({ ...item, score: localScore(item, sources.filter(source => source.enabled).flatMap(source => source.topics || [])) }))
        .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt)),
    [items, showArchived, streamQuery, streamDays, sources],
  );

  const enabled = sources.filter((source) => source.enabled);
  const sourceErrors = sources.filter((source) => source.lastError);
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
    void runIndustryCollector(false).catch(() => {
      // Collector health records the failure; avoid noisy auto-refresh toasts.
    }).finally(() => setBusy(false));
  }, [enabled]);

  useEffect(() => { setVisibleCount(40); }, [streamQuery, streamDays, showArchived]);

  const addSource = async () => {
    const clean = url.trim();
    if (!clean) return;
    const normalised = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    let host = "";
    try {
      const parsed = new URL(normalised);
      if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("Use a public HTTP or HTTPS URL.");
      host = parsed.hostname.replace(/^www\./, "");
    } catch {
      toast.error("That does not look like a valid URL");
      return;
    }
    const duplicate = sources.find((source) => {
      try {
        return canonicalWebUrl(source.url) === canonicalWebUrl(normalised) || Boolean(source.feedUrl && canonicalWebUrl(source.feedUrl) === canonicalWebUrl(normalised));
      } catch {
        return source.url === normalised;
      }
    });
    if (duplicate) {
      toast.info("Source already tracked", { description: duplicate.name });
      return;
    }
    const record = {
      id: genId(),
      name: name.trim() || host,
      url: normalised,
      topics: topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await db.feedSources.put(record);
    markCloudRecordDirty("feedSources", record.id);
    queueCloudPush();
    setUrl("");
    setName("");
    setTopics("");
    toast.success(`Added ${record.name}`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const { added, errors, checked, total } = await runIndustryCollector();
      const unavailable = total > 0 && checked === 0;
      toast[unavailable || errors.length ? "warning" : "success"](
        unavailable ? "Tracked feeds unavailable — no fresh coverage verified"
          : added ? `${added} new ${added === 1 ? "story" : "stories"}`
          : "Feed refresh finished — no new published stories",
        { description: [`${checked}/${total} feeds checked successfully`, ...errors.slice(0, 2)].join(" · ") },
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
    searchLock.current = true; setSearching(true); setLookupStatus("");
    try {
      const response = await searchIndustryTopic({ data: { query: clean, days } });
      const minTime = Date.now() - days * 86_400_000;
      const trackedMatches: SearchStory[] = items
        .filter(
          (story) =>
            story.kind === "industry" && story.status === "active" &&
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
      setSearchedAt(response.fetchedAt); setResolvedQuery(clean); setCachedResult(response.cached); setLookupStatus(response.error || (response.degraded ? "Some providers failed. Coverage is incomplete; results are from remaining sources." : ""));

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
          description:
            trackedMatches.length
              ? `Tracked feeds were still checked. ${response.error}`
              : "No live provider returned usable coverage. Try again shortly; tracked feeds remain available.",
        });
      } else {
        toast[response.degraded ? "warning" : "success"](
          combined.length
            ? `${combined.length} current results for “${clean}”`
            : `No recent verified results for “${clean}”`,
          {
            description: [
              providerSummary || undefined,
              trackedMatches.length
                ? `${trackedMatches.length} tracked-feed match${trackedMatches.length === 1 ? "" : "es"} included`
                : undefined,
              response.degraded ? "One live provider was unavailable; results were served by the remaining sources." : undefined,
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
          },
        );
      }
    } catch (error: any) {
      setLookupStatus("The latest search failed. Previous results keep their original query and retrieval date.");
      toast.error("Live topic search failed", { description: String(error?.message ?? error) });
    } finally {
      setSearching(false); searchLock.current = false;
    }
  };

  return (
    <div className="space-y-5">
      <CCHeader
        title="Trends Intelligence"
        subtitle="Research topics that matter to your sites and apps. Compare current coverage, monitor trusted publishers, and turn useful signals into decisions."
        actions={
          <button
            onClick={refresh}
            disabled={busy || !enabled.length}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            {busy ? "Checking publishers…" : "Refresh tracked feeds"}
          </button>
        }
      />
      <CollectorStatusPanel kind="feeds" />

      <section className="cc-intel-search">
        <div className="cc-intel-search-glow" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-primary">
            <Sparkles size={12} />
            Live subject search
          </div>
          <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-foreground">
            What do you need to know right now?
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Searches multiple current coverage providers for the subject you enter and merges them
            with your tracked publisher feeds. Results are deduplicated, freshness-filtered and
            ranked by subject relevance, publication freshness and publisher attribution. Similar coverage across distinct domains is a discovery signal; syndication, ownership and factual claims are not independently verified.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-border/50 bg-background/65 px-3">
              <Search size={15} className="text-muted-foreground" />
              <input
                aria-label="Topic to research"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void searchLatest()}
                placeholder="e.g. Google search spam update, running shoe market, AI search visibility"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </label>
            <select
              aria-label="Search publication window"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="rounded-2xl border border-border/50 bg-background/65 px-3 text-xs font-semibold text-foreground"
            >
              <option value={1}>Last 24h</option>
              <option value={3}>Last 3 days</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button
              type="button"
              onClick={() => void searchLatest()}
              disabled={searching}
              className="btn-primary justify-center disabled:opacity-50"
            >
              <Search size={14} className={searching ? "animate-pulse" : ""} />
              {searching ? "Searching providers…" : "Search latest"}
            </button>
          </div>
        </div>
      </section>

      {lookupStatus && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{lookupStatus}</p>}
      {searchedAt && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-foreground">{cachedResult ? "Recent cached search results" : "Search results"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                “{resolvedQuery}” · {searchStories.length} evidence-qualified results · fetched {relTime(searchedAt)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Search provider coverage">
                {providerStatus.filter(provider => provider.configured).map(provider => <span key={provider.provider} title={provider.error} className={`rounded-full border px-2.5 py-1 text-xs ${provider.ok ? "border-success/20 bg-success/5 text-success" : "border-warning/25 bg-warning/5 text-warning"}`}>
                  {provider.provider === "google-news" ? "Google News" : provider.provider === "bing-news" ? "Bing News" : "DataForSEO"}: {provider.ok ? `${provider.itemCount} retrieved` : "unavailable"}
                </span>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["medium", "high", "all"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEvidenceFilter(level)}
                    aria-pressed={evidenceFilter === level}
                    className={`rounded-full border px-2 py-1 text-xs font-bold transition ${
                      evidenceFilter === level
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/45 bg-background/45 text-muted-foreground"
                    }`}
                  >
                    {level === "medium"
                      ? "Attributed coverage"
                      : level === "high"
                        ? "Tracked / multiple domains"
                        : "All evidence"}
                  </button>
                ))}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/8 px-2.5 py-1 text-xs font-bold text-success">
              <ShieldCheck size={11} />
              Relevance + publisher + date evidence
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {searchStories.filter((story) => {
              if (evidenceFilter === "all") return true;
              if (evidenceFilter === "high") return story.evidenceLevel === "high";
              return story.evidenceLevel !== "limited";
            }).length ? (
              searchStories
                .filter((story) => {
                  if (evidenceFilter === "all") return true;
                  if (evidenceFilter === "high") return story.evidenceLevel === "high";
                  return story.evidenceLevel !== "limited";
                })
                .slice(0, 30)
                .map((story) => {
                const publishedAt = story.publishedAt || searchedAt;
                const score = story.relevanceScore ?? queryRelevance(resolvedQuery, story.title, story.summary);
                return (
                  <article key={story.url} className="cc-intel-result">
                    <div className="cc-intel-score" title="Subject relevance score">{score}</div>
                    <div className="min-w-0 flex-1">
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 text-sm font-bold text-foreground hover:text-primary"
                      >
                        {story.title}
                      </a>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground/75">{story.source || "Publisher unavailable"}</span>
                        <span>·</span>
                        <span>{relTime(publishedAt)}</span>
                        {(story.corroborationCount || 0) > 0 && (
                          <>
                            <span>·</span>
                            <span>{(story.corroborationCount ?? 0) + 1} publisher domains with similar coverage</span>
                          </>
                        )}
                        {story.evidenceLevel && (
                          <>
                            <span>·</span>
                            <span
                              className={`font-bold ${
                                story.evidenceLevel === "high"
                                  ? "text-success"
                                  : story.evidenceLevel === "medium"
                                    ? "text-info"
                                    : "text-warning"
                              }`}
                              title={story.evidenceReason}
                            >
                              {story.evidenceLevel === "high"
                                ? "Tracked / multiple domains"
                                : story.evidenceLevel === "medium"
                                  ? "Publisher attributed"
                                  : "Limited evidence"}
                            </span>
                          </>
                        )}
                      </div>
                      {story.summary && (
                        <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
                          {story.summary}
                        </p>
                      )}
                    </div>
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open source"
                      className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </article>
                );
              })
            ) : (
              <EmptyState
                title="No current evidence-qualified coverage found"
                hint="Try a broader subject or a longer freshness window. Missing or weak evidence is filtered rather than padded with low-quality results."
              />
            )}
          </div>
        </Panel>
      )}

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Persistent monitored sources
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {enabled.length} enabled · {sourceErrors.length} errors
              {lastChecked ? ` · last checked ${relTime(lastChecked)}` : ""}
            </p>
          </div>
          <button
            onClick={() => setShowArchived((value) => !value)}
            className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground"
          >
            {showArchived ? "Show active" : "Show archived"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1.4fr_1fr_1.2fr_auto]">
          <input
            aria-label="Publisher website or RSS feed URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void addSource()}
            placeholder="Credible site or RSS URL"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            aria-label="Publisher label"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Publisher label"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            aria-label="Monitored topics, comma separated"
            value={topics}
            onChange={(event) => setTopics(event.target.value)}
            placeholder="Topics, comma separated"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button onClick={() => void addSource()} className="btn-secondary justify-center">
            <Plus size={14} /> Add source
          </button>
        </div>

        {!!sources.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sources.map((source) => (
              <span
                key={source.id}
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs ${
                  source.enabled
                    ? "border-border bg-background/60 text-foreground"
                    : "border-border/50 bg-muted/40 text-muted-foreground"
                }`}
                title={
                  source.lastError
                    ? source.lastError
                    : source.lastCheckedAt
                      ? `Checked ${relTime(source.lastCheckedAt)}`
                      : "Never checked"
                }
              >
                {source.lastError && <AlertTriangle size={11} className="text-warning" />}
                <span className="font-bold">{source.name}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await db.feedSources.update(source.id, { enabled: !source.enabled });
                    markCloudRecordDirty("feedSources", source.id);
                    queueCloudPush();
                  }}
                  className="rounded-full p-1 hover:bg-secondary"
                  aria-label={`${source.enabled ? "Pause" : "Enable"} ${source.name}`}
                  aria-pressed={source.enabled}
                >
                  <Power size={11} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await db.feedSources.delete(source.id);
                    markCloudRecordDirty("feedSources", source.id, "delete");
                    queueCloudPush();
                    toast("Source removed", { description: source.name, action: { label: "Undo", onClick: async () => {
                      await db.feedSources.put(source); markCloudRecordDirty("feedSources", source.id); queueCloudPush();
                    } } });
                  }}
                  className="rounded-full p-1 hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`Remove ${source.name}`}
                >
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Panel>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Tracked intelligence stream</h2>
            <p className="text-xs text-muted-foreground">
              {stories.length} {showArchived ? "archived" : "active"} stories. Priority is recalculated from age, topic relevance and headline signals.
            </p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Search size={15} className="text-muted-foreground" />
            <input aria-label="Filter saved trends" value={streamQuery} onChange={event => setStreamQuery(event.target.value)} placeholder="Find a story or publisher…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <select aria-label="Filter saved publication dates" value={streamDays} onChange={event => setStreamDays(Number(event.target.value))} className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm">
            <option value={0}>All saved coverage</option><option value={7}>Published in 7 days</option><option value={30}>Published in 30 days</option>
          </select>
        </div>
        {stories.length === 0 ? (
          <EmptyState
            title={sources.length ? "No tracked stories yet" : "Add a source or search a subject"}
            hint="Live subject search works without creating a permanent feed. Add sources for recurring daily monitoring."
          />
        ) : (
          <div className="grid gap-2.5">
            {stories.slice(0, visibleCount).map((story) => (
              <StreamRow key={story.id} item={story} />
            ))}
            {stories.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + 40)} className="btn-secondary justify-center min-h-11">Show more · {stories.length - visibleCount} remaining</button>}
          </div>
        )}
      </div>
    </div>
  );
}
