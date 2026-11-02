import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Download,
  FolderGit2,
  GitPullRequest,
  LayoutGrid,
  Lock,
  Pin,
  PinOff,
  Rows3,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { ConnectorEmpty } from "@/components/TruthUI";
import { useEstate, useLinkedEstate, useRepoAnnotations } from "@/hooks/useEstate";
import {
  BUILT_IN_VIEWS,
  DEFAULT_FILTERS,
  facet,
  matchesFilters,
  reposToCsv,
  sortRepos,
  type RepoRow,
  type RepoSortKey,
} from "@/lib/estate/model";
import { ESTATE_GITHUB_ACCOUNTS } from "@/lib/estate/types";
import { useEstateViewStore } from "@/stores/estateViewStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { cn } from "@/lib/utils";
import {
  ActivityPill,
  ago,
  CiPill,
  HealthMeter,
  LangDot,
  PagesHealthPill,
  Pill,
  PriorityPill,
  SkeletonRows,
  StatTile,
} from "@/components/estate/bits";
import { ChoiceMenu, FacetMenu } from "@/components/estate/FacetMenu";
import { EstateGateNotice, FreshnessLine, RefreshButton } from "@/components/estate/EstateStatus";
import RepoDrawer from "@/components/estate/RepoDrawer";
import { useSectionKeys } from "@/components/estate/useSectionKeys";

const PAGE = 80;

export default function GitHubCommandCenter({
  onEditRecord,
}: {
  onEditRecord?: (row: RepoRow) => void;
}) {
  const estate = useEstate();
  const { map, save } = useRepoAnnotations();
  const derived = useLinkedEstate(estate.snapshot, map);
  const view = useEstateViewStore();
  const focusEntity = useNavigationStore((s) => s.focusEntity);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);
  const searchRef = useRef<HTMLInputElement>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const refresh = useCallback(() => void estate.refresh(), [estate]);
  useSectionKeys(searchRef, refresh);

  const all = useMemo(() => derived?.linked.repos ?? [], [derived]);
  const rows = useMemo(
    () =>
      sortRepos(
        all.filter((r) => matchesFilters(r, view.filters)),
        view.sort,
      ),
    [all, view.filters, view.sort],
  );
  const openRow = all.find((r) => r.key === openKey) ?? null;

  // Deep links from the command palette, dashboard strip and Cloudflare section.
  useEffect(() => {
    if (focusEntity?.type !== "repo" || !all.length) return;
    const hit = all.find((r) => r.key === focusEntity.id.toLowerCase());
    if (hit) setOpenKey(hit.key);
    setFocusEntity(null);
  }, [focusEntity, all, setFocusEntity]);

  useEffect(() => setLimit(PAGE), [view.filters, view.sort]);

  const facets = useMemo(
    () => ({
      languages: facet(all, (r) => r.primaryLanguage ?? "Unknown"),
      categories: facet(all, (r) => r.annotation.category ?? "Uncategorised"),
      accounts: ESTATE_GITHUB_ACCOUNTS.map((a) => ({
        value: a,
        count: all.filter((r) => r.account === a).length,
      })),
    }),
    [all],
  );

  const s = derived?.summary;
  const gh = estate.snapshot?.github;
  const selectedRows = rows.filter((r) => selected.has(r.key));
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const bulk = async (patch: Parameters<typeof save>[1], label: string) => {
    if (!selectedRows.length) return;
    if (await save(selectedRows, patch)) {
      toast.success(label + " · " + selectedRows.length + " repositories");
      setSelected(new Set());
    }
  };
  const sortBy = (key: RepoSortKey) =>
    view.setSort({ key, dir: view.sort.key === key && view.sort.dir === "desc" ? "asc" : "desc" });
  const exportCsv = () => {
    const blob = new Blob([reposToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "github-repositories-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const filtersActive =
    JSON.stringify({ ...view.filters, q: "" }) !== JSON.stringify({ ...DEFAULT_FILTERS, q: "" }) ||
    view.filters.q.trim() !== "";

  return (
    <section className="space-y-4" aria-label="Unified GitHub repository command center">
      <PageHeader
        icon={FolderGit2}
        eyebrow="Engineering estate"
        title="GitHub"
        tone="violet"
        subtitle={
          gh
            ? gh.accounts.filter((a) => a.state === "live").length +
              " of " +
              ESTATE_GITHUB_ACCOUNTS.length +
              " accounts live · repositories, CI, pull requests and the Cloudflare apps they deploy"
            : "Every repository across your four GitHub accounts, with CI, pull requests and the Cloudflare apps they deploy."
        }
        stats={
          s
            ? [
                { label: "Repos", value: s.repos },
                { label: "Open PRs", value: s.openPrs, tone: "sky" },
                { label: "Open issues", value: s.openIssues, tone: "amber" },
                { label: "Pushed 7d", value: s.pushed7d, tone: "accent" },
                { label: "Deployed", value: s.linkedRepos, tone: "violet" },
              ]
            : undefined
        }
        actions={<RefreshButton state={estate} />}
      />

      <FreshnessLine state={estate} part={gh?.truthState} source="GitHub GraphQL API" />
      <EstateGateNotice state={estate} what="GitHub" />

      {gh && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="GitHub accounts">
          {gh.accounts.map((a) => {
            const on = view.filters.accounts.length === 1 && view.filters.accounts[0] === a.account;
            return (
              <button
                key={a.account}
                type="button"
                onClick={() => view.setFilters({ accounts: on ? [] : [a.account] })}
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition hover:border-primary/40",
                  on ? "border-primary/50 bg-primary/10" : "border-border/60 bg-card/70",
                )}
                title={a.error ?? undefined}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    a.state === "live"
                      ? "bg-emerald-500"
                      : a.state === "error"
                        ? "bg-red-500"
                        : "bg-muted-foreground/40",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs font-bold text-foreground">
                    {a.account}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {a.state === "live"
                      ? a.repoCount + " repos"
                      : a.state === "error"
                        ? a.error
                        : "Token not configured"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {estate.loading && <SkeletonRows rows={8} />}

      {gh?.truthState === "not_connected" && (
        <ConnectorEmpty
          title="No GitHub accounts connected"
          description='Add GITHUB_PORTFOLIO_TOKENS_JSON to the server environment, e.g. {"douphealth":"…","Papalexios":"…","papalexios01":"…","papalexios001-wq":"…"}. Each token is checked against its account before use.'
          onRetry={refresh}
        />
      )}

      {derived && all.length > 0 && (
        <>
          {s && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <StatTile
                label="CI failing"
                value={s.ciFailing}
                tone={s.ciFailing ? "bad" : "muted"}
                onClick={() => view.applyView(BUILT_IN_VIEWS[1]!)}
              />
              <StatTile
                label="Deploy failing"
                value={all.filter((r) => r.deployState === "failing").length}
                tone={all.some((r) => r.deployState === "failing") ? "bad" : "muted"}
                onClick={() => view.applyView(BUILT_IN_VIEWS[2]!)}
              />
              <StatTile
                label="CI passing"
                value={s.ciPassing}
                tone="good"
                onClick={() => view.setFilters({ ci: "passing" })}
              />
              <StatTile
                label="Private"
                value={s.privateRepos}
                onClick={() => view.setFilters({ visibility: "private" })}
              />
              <StatTile
                label="Pinned"
                value={s.pinned}
                tone="violet"
                onClick={() => view.applyView(BUILT_IN_VIEWS[4]!)}
              />
              <StatTile
                label="Gone quiet"
                value={s.stale}
                tone="warn"
                hint="no push in 180d"
                onClick={() => view.applyView(BUILT_IN_VIEWS[6]!)}
              />
            </div>
          )}

          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Saved views"
          >
            {[...BUILT_IN_VIEWS, ...view.savedViews].map((v) => (
              <span key={v.id} className="group relative shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view.activeViewId === v.id}
                  onClick={() => view.applyView(v)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                    view.activeViewId === v.id
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
                    !v.builtIn && "pr-6",
                  )}
                >
                  {!v.builtIn && <Bookmark size={10} className="mr-1 inline" />}
                  {v.name}
                </button>
                {!v.builtIn && (
                  <button
                    type="button"
                    aria-label={"Delete view " + v.name}
                    onClick={() => view.deleteView(v.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
            {filtersActive && view.activeViewId === null && (
              <button
                type="button"
                className="shrink-0 rounded-full border border-dashed border-primary/50 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                onClick={() => {
                  const name = window.prompt("Name this view");
                  if (name) view.saveView(name);
                }}
              >
                + Save view
              </button>
            )}
          </div>

          <div className="sticky top-0 z-10 -mx-1 space-y-2 rounded-2xl border border-border/50 bg-background/85 p-2 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="flex h-8 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-2.5 focus-within:border-primary">
                <Search size={13} className="text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={view.filters.q}
                  onChange={(e) => view.setFilters({ q: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      view.setFilters({ q: "" });
                      e.currentTarget.blur();
                    }
                    if (e.key === "Enter" && rows[0]) setOpenKey(rows[0].key);
                  }}
                  placeholder={"Search " + all.length + " repos, topics, domains, notes…"}
                  aria-label="Search repositories"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <kbd className="hidden rounded border border-border px-1 text-[10px] text-muted-foreground sm:inline">
                  /
                </kbd>
              </label>
              <FacetMenu
                label="Account"
                options={facets.accounts}
                selected={view.filters.accounts}
                onChange={(accounts) => view.setFilters({ accounts })}
              />
              <FacetMenu
                label="Language"
                options={facets.languages}
                selected={view.filters.languages}
                onChange={(languages) => view.setFilters({ languages })}
              />
              <FacetMenu
                label="Activity"
                options={(["hot", "active", "quiet", "stale", "dormant"] as const).map((v) => ({
                  value: v,
                  count: all.filter((r) => r.activity === v).length,
                }))}
                selected={view.filters.activity}
                onChange={(activity) =>
                  view.setFilters({ activity: activity as typeof view.filters.activity })
                }
              />
              <ChoiceMenu
                label="CI"
                value={view.filters.ci}
                onChange={(ci) => view.setFilters({ ci })}
                options={[
                  { value: "", label: "Any" },
                  { value: "failing", label: "Failing" },
                  { value: "passing", label: "Passing" },
                  { value: "pending", label: "Running" },
                  { value: "none", label: "No CI" },
                ]}
              />
              <ChoiceMenu
                label="Deploy"
                value={view.filters.deploy}
                onChange={(deploy) => view.setFilters({ deploy })}
                options={[
                  { value: "", label: "Any" },
                  { value: "linked", label: "On Cloudflare" },
                  { value: "failing", label: "Deploy failing" },
                  { value: "none", label: "Not deployed" },
                ]}
              />
              <FacetMenu
                label="Priority"
                options={(["critical", "high", "medium", "low", "unset"] as const).map((v) => ({
                  value: v,
                  label: v === "unset" ? "Not set" : v,
                  count: all.filter((r) => (r.annotation.priority ?? "unset") === v).length,
                }))}
                selected={view.filters.priorities}
                onChange={(p) =>
                  view.setFilters({ priorities: p as typeof view.filters.priorities })
                }
              />
              <FacetMenu
                label="Status"
                options={(["active", "stable", "paused", "archived", "unset"] as const).map(
                  (v) => ({
                    value: v,
                    label: v === "unset" ? "Not set" : v,
                    count: all.filter((r) => (r.annotation.status ?? "unset") === v).length,
                  }),
                )}
                selected={view.filters.statuses}
                onChange={(p) => view.setFilters({ statuses: p as typeof view.filters.statuses })}
              />
              <FacetMenu
                label="Category"
                options={facets.categories}
                selected={view.filters.categories}
                onChange={(categories) => view.setFilters({ categories })}
              />
              <ChoiceMenu
                label="Visibility"
                value={view.filters.visibility}
                onChange={(visibility) => view.setFilters({ visibility })}
                options={[
                  { value: "", label: "Any" },
                  { value: "private", label: "Private" },
                  { value: "public", label: "Public" },
                ]}
              />
              <ChoiceMenu
                label="Archived"
                value={view.filters.archived}
                onChange={(archived) => view.setFilters({ archived })}
                options={[
                  { value: "hide", label: "Hidden" },
                  { value: "include", label: "Included" },
                  { value: "only", label: "Only" },
                ]}
              />
              <ChoiceMenu
                label="Forks"
                value={view.filters.forks}
                onChange={(forks) => view.setFilters({ forks })}
                options={[
                  { value: "include", label: "Included" },
                  { value: "hide", label: "Hidden" },
                  { value: "only", label: "Only" },
                ]}
              />
              <button
                type="button"
                onClick={() => view.setFilters({ pinned: !view.filters.pinned })}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold",
                  view.filters.pinned
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <Pin size={12} /> Pinned
              </button>
              {filtersActive && (
                <button
                  type="button"
                  onClick={view.resetFilters}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{rows.length}</strong> of {all.length}{" "}
                repositories
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Sort repositories"
                  value={view.sort.key}
                  onChange={(e) =>
                    view.setSort({ ...view.sort, key: e.target.value as RepoSortKey })
                  }
                  className="h-8 rounded-lg border border-border/70 bg-card/70 px-2 text-xs text-foreground"
                >
                  <option value="pushed">Last push</option>
                  <option value="health">Health</option>
                  <option value="priority">Priority</option>
                  <option value="prs">Open PRs</option>
                  <option value="issues">Open issues</option>
                  <option value="stars">Stars</option>
                  <option value="name">Name</option>
                </select>
                <button
                  type="button"
                  aria-label="Toggle sort direction"
                  onClick={() =>
                    view.setSort({ ...view.sort, dir: view.sort.dir === "asc" ? "desc" : "asc" })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card/70 text-muted-foreground hover:text-foreground"
                >
                  {view.sort.dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                </button>
                <div
                  className="flex rounded-lg border border-border/70 bg-card/70 p-0.5"
                  role="group"
                  aria-label="Layout"
                >
                  <button
                    type="button"
                    aria-label="Table"
                    onClick={() => view.setLayout("table")}
                    className={cn(
                      "rounded-md p-1.5",
                      view.layout === "table"
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    <Rows3 size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Cards"
                    onClick={() => view.setLayout("cards")}
                    className={cn(
                      "rounded-md p-1.5",
                      view.layout === "cards"
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    <LayoutGrid size={13} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-card/70 px-2.5 font-semibold text-muted-foreground hover:text-foreground"
                  title="Export the current view as CSV"
                >
                  <Download size={12} /> CSV
                </button>
              </div>
            </div>
            {selected.size > 0 && (
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-2 py-1.5 text-xs"
                aria-label="Bulk actions"
              >
                <strong className="px-1 text-foreground">{selectedRows.length} selected</strong>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => void bulk({ pinned: true }, "Pinned")}
                >
                  <Pin size={12} /> Pin
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => void bulk({ pinned: false }, "Unpinned")}
                >
                  <PinOff size={12} /> Unpin
                </button>
                <select
                  aria-label="Set priority"
                  value=""
                  onChange={(e) =>
                    e.target.value &&
                    void bulk(
                      { priority: e.target.value as "high" },
                      "Priority set to " + e.target.value,
                    )
                  }
                  className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
                >
                  <option value="">Set priority…</option>
                  {["critical", "high", "medium", "low"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Set status"
                  value=""
                  onChange={(e) =>
                    e.target.value &&
                    void bulk(
                      { status: e.target.value as "active" },
                      "Status set to " + e.target.value,
                    )
                  }
                  className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
                >
                  <option value="">Set status…</option>
                  {["active", "stable", "paused", "archived"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelected(new Set())}
                >
                  <Trash2 size={12} /> Clear selection
                </button>
              </div>
            )}
          </div>

          {!rows.length ? (
            <EmptyState
              icon={Search}
              title="No repositories match"
              description="Try a different search or clear the filters."
              action={
                <button type="button" className="btn-secondary text-xs" onClick={view.resetFilters}>
                  Clear filters
                </button>
              }
            />
          ) : view.layout === "table" ? (
            <RepoTable
              rows={rows.slice(0, limit)}
              selected={selected}
              toggle={toggle}
              onOpen={setOpenKey}
              sort={view.sort}
              sortBy={sortBy}
              allSelected={rows.length > 0 && rows.every((r) => selected.has(r.key))}
              toggleAll={() =>
                setSelected((prev) =>
                  rows.every((r) => prev.has(r.key)) ? new Set() : new Set(rows.map((r) => r.key)),
                )
              }
              onPin={(r) => void save([r], { pinned: !r.annotation.pinned })}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {rows.slice(0, limit).map((r) => (
                <RepoCard
                  key={r.key}
                  row={r}
                  selected={selected.has(r.key)}
                  toggle={() => toggle(r.key)}
                  onOpen={() => setOpenKey(r.key)}
                />
              ))}
            </div>
          )}
          {rows.length > limit && (
            <button
              type="button"
              className="btn-secondary mx-auto flex text-xs"
              onClick={() => setLimit((l) => l + PAGE * 2)}
            >
              Show {Math.min(PAGE * 2, rows.length - limit)} more of {rows.length - limit}
            </button>
          )}
        </>
      )}

      {derived && !all.length && gh?.truthState !== "not_connected" && (
        <EmptyState
          icon={FolderGit2}
          title="No repositories returned"
          description="The connected tokens returned no repositories. Check each account card above for errors."
        />
      )}

      <RepoDrawer
        row={openRow}
        onClose={() => setOpenKey(null)}
        save={save}
        onEditRecord={onEditRecord}
      />
    </section>
  );
}

function SortHead({
  label,
  k,
  sort,
  sortBy,
  className,
}: {
  label: string;
  k: RepoSortKey;
  sort: { key: RepoSortKey; dir: string };
  sortBy: (k: RepoSortKey) => void;
  className?: string;
}) {
  const on = sort.key === k;
  return (
    <th
      className={cn("px-2 py-2 font-bold", className)}
      aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => sortBy(k)}
        className={cn(
          "inline-flex items-center gap-0.5 uppercase tracking-wide hover:text-foreground",
          on && "text-primary",
        )}
      >
        {label}
        {on && (sort.dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
      </button>
    </th>
  );
}

function RepoTable({
  rows,
  selected,
  toggle,
  toggleAll,
  allSelected,
  onOpen,
  onPin,
  sort,
  sortBy,
}: {
  rows: RepoRow[];
  selected: Set<string>;
  toggle: (k: string) => void;
  toggleAll: () => void;
  allSelected: boolean;
  onOpen: (k: string) => void;
  onPin: (r: RepoRow) => void;
  sort: { key: RepoSortKey; dir: string };
  sortBy: (k: RepoSortKey) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/70">
      <table className="w-full min-w-[920px] text-left text-xs">
        <thead className="border-b border-border/60 bg-muted/30 text-[10px] text-muted-foreground">
          <tr>
            <th className="w-8 px-2 py-2">
              <input
                type="checkbox"
                aria-label="Select all matching"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-[hsl(var(--primary))]"
              />
            </th>
            <SortHead label="Repository" k="name" sort={sort} sortBy={sortBy} />
            <th className="px-2 py-2 font-bold uppercase tracking-wide">Language</th>
            <th className="px-2 py-2 font-bold uppercase tracking-wide">CI</th>
            <SortHead label="Pushed" k="pushed" sort={sort} sortBy={sortBy} />
            <SortHead label="PRs" k="prs" sort={sort} sortBy={sortBy} className="text-right" />
            <SortHead
              label="Issues"
              k="issues"
              sort={sort}
              sortBy={sortBy}
              className="text-right"
            />
            <SortHead label="Health" k="health" sort={sort} sortBy={sortBy} />
            <th className="px-2 py-2 font-bold uppercase tracking-wide">Cloudflare</th>
            <SortHead label="Priority" k="priority" sort={sort} sortBy={sortBy} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((r) => (
            <tr
              key={r.key}
              tabIndex={0}
              onClick={() => onOpen(r.key)}
              onKeyDown={(e) => e.key === "Enter" && onOpen(r.key)}
              className={cn(
                "cursor-pointer transition hover:bg-primary/5 focus:bg-primary/5 focus:outline-none",
                selected.has(r.key) && "bg-primary/8",
              )}
            >
              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={"Select " + r.fullName}
                  checked={selected.has(r.key)}
                  onChange={() => toggle(r.key)}
                  className="accent-[hsl(var(--primary))]"
                />
              </td>
              <td className="max-w-[360px] px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={r.annotation.pinned ? "Unpin" : "Pin"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(r);
                    }}
                    className={cn(
                      "shrink-0",
                      r.annotation.pinned
                        ? "text-primary"
                        : "text-muted-foreground/30 hover:text-muted-foreground",
                    )}
                  >
                    <Pin size={12} className={r.annotation.pinned ? "fill-current" : undefined} />
                  </button>
                  <span className="truncate font-semibold text-foreground">{r.name}</span>
                  {r.isPrivate && <Lock size={10} className="shrink-0 text-muted-foreground" />}
                  {r.isArchived && <Archive size={10} className="shrink-0 text-amber-500" />}
                  {r.isFork && <span className="text-[10px] text-muted-foreground">fork</span>}
                </div>
                <div className="truncate pl-[18px] text-[11px] text-muted-foreground">
                  <span className="font-mono">{r.owner}</span>
                  {r.description && " · " + r.description}
                </div>
              </td>
              <td className="px-2 py-2">
                <LangDot name={r.primaryLanguage} color={r.languageColor} />
              </td>
              <td className="px-2 py-2">
                <CiPill state={r.ciState} />
              </td>
              <td
                className="whitespace-nowrap px-2 py-2 text-muted-foreground"
                title={r.pushedAt ?? undefined}
              >
                {ago(r.pushedAt)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 text-right tabular-nums",
                  r.openPrs ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {r.openPrs}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {r.openIssues}
              </td>
              <td className="px-2 py-2">
                <HealthMeter score={r.health.score} compact />
              </td>
              <td className="px-2 py-2">
                {r.links.length ? (
                  <span className="inline-flex items-center gap-1">
                    {r.deployState === "failing" ? (
                      <PagesHealthPill health="failing" />
                    ) : r.deployState === "building" ? (
                      <PagesHealthPill health="building" />
                    ) : (
                      <Pill tone="good">{r.links.length} live</Pill>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </td>
              <td className="px-2 py-2">
                <PriorityPill priority={r.annotation.priority} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RepoCard({
  row: r,
  selected,
  toggle,
  onOpen,
}: {
  row: RepoRow;
  selected: boolean;
  toggle: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-2xl border bg-card/80 p-3.5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "border-primary/50" : "border-border/60",
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          aria-label={"Select " + r.fullName}
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={toggle}
          className="mt-1 accent-[hsl(var(--primary))]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {r.annotation.pinned && (
              <Pin size={12} className="shrink-0 fill-current text-primary" />
            )}
            <h3 className="truncate text-sm font-bold text-foreground">{r.name}</h3>
            {r.isPrivate && <Lock size={11} className="shrink-0 text-muted-foreground" />}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{r.owner}</div>
        </div>
        <HealthMeter score={r.health.score} compact />
      </div>
      <p className="line-clamp-2 min-h-[2.5em] text-xs text-muted-foreground">
        {r.annotation.nextAction || r.description || "No description."}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <CiPill state={r.ciState} />
        <ActivityPill band={r.activity} />
        <PriorityPill priority={r.annotation.priority} />
        {r.links.map((l) => (
          <Pill
            key={l.key}
            tone={l.health === "failing" ? "bad" : l.kind === "pages" ? "info" : "violet"}
          >
            {l.name}
          </Pill>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
        <LangDot name={r.primaryLanguage} color={r.languageColor} />
        <span className="inline-flex items-center gap-1">
          <GitPullRequest size={11} />
          {r.openPrs}
        </span>
        <span>{r.openIssues} issues</span>
        <span className="ml-auto">{ago(r.pushedAt)}</span>
      </div>
    </article>
  );
}
