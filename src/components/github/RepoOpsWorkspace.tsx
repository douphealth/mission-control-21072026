import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Archive,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Cloud,
  Code2,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  GitFork,
  GitPullRequest,
  Globe,
  LoaderCircle,
  Lock,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Settings,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { GitHubRepo } from "@/lib/db";
import { useAddItem, useBulkAddItems, useBulkPatch, useUpdateItem } from "@/hooks/useTableData";
import {
  OWNERS,
  cachedOwners,
  loadOwnerRepos,
  ownersRateLimitedUntil,
  type OwnerResult,
} from "@/lib/liveGitHub";
import {
  getPrivateGitHubInventory,
  type GitHubPrivateInventory,
} from "@/lib/githubPrivateInventory.functions";
import { useCloudflareControl } from "@/lib/cloudflareControlClient";
import type { CloudflareDeploymentRow, DeployHealth } from "@/lib/cloudflareInventory.server";
import { healthOf, hostOf, relativeTime } from "@/lib/cloudflareWorkspace";
import {
  buildRepoOps,
  compareRepoRows,
  matchesRepoQuick,
  repoOpsCsv,
  repoQuickCounts,
  repoSearchText,
  type RepoOpsRow,
  type RepoQuick,
  type RepoSort,
} from "@/lib/repoOps";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Priority = NonNullable<GitHubRepo["priority"]>;
const PREFS_KEY = "mc.github.workspace.v1";
type Prefs = { quick: RepoQuick; owner: string; sort: RepoSort };
const DEFAULT_PREFS: Prefs = { quick: "all", owner: "all", sort: "pushed" };
function readPrefs(): Prefs {
  try {
    return {
      ...DEFAULT_PREFS,
      ...(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}
function writePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* per-viewer convenience only */
  }
}

// Authenticated (server-side, Access-protected) inventory shared for 10 minutes.
let ownedCache: { at: number; value: GitHubPrivateInventory } | null = null;
let ownedInflight: Promise<GitHubPrivateInventory> | null = null;
function loadOwned(force = false): Promise<GitHubPrivateInventory> {
  if (!force && ownedCache && Date.now() - ownedCache.at < 10 * 60_000)
    return Promise.resolve(ownedCache.value);
  if (ownedInflight) return ownedInflight;
  ownedInflight = getPrivateGitHubInventory()
    .then((value) => {
      ownedCache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      ownedInflight = null;
    });
  return ownedInflight;
}

const CHIPS: Array<{ id: RepoQuick; label: string; tone?: "danger" | "warn" }> = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs action", tone: "warn" },
  { id: "failing", label: "Deploy problems", tone: "danger" },
  { id: "cloudflare", label: "On Cloudflare" },
  { id: "undeployed", label: "No verified app link" },
  { id: "recent", label: "Pushed ≤7d" },
  { id: "stale", label: "Stale >180d" },
  { id: "issues", label: "Open issues/PRs" },
  { id: "private", label: "Private" },
  { id: "unplanned", label: "No plan yet" },
  { id: "forks", label: "Forks" },
  { id: "archived", label: "Archived" },
];
const PRIORITY_CLS: Record<string, string> = {
  critical: "border-red-500/40 text-red-700 dark:text-red-300",
  high: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  medium: "border-border text-foreground",
  low: "border-border text-muted-foreground",
  "": "border-dashed border-border text-muted-foreground",
};
const CF_ICON: Record<DeployHealth, { icon: typeof CircleCheck; cls: string; label: string }> = {
  live: { icon: CircleCheck, cls: "text-emerald-500", label: "Live" },
  failing: { icon: CircleX, cls: "text-red-500", label: "Build failed" },
  building: { icon: LoaderCircle, cls: "text-sky-500 animate-spin", label: "Building" },
  none: { icon: CircleDashed, cls: "text-amber-500", label: "No deployment" },
  unknown: { icon: CircleDot, cls: "text-muted-foreground", label: "Unverified" },
};
const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground";
const copyText = (text: string, what: string) =>
  void navigator.clipboard.writeText(text).then(
    () => toast.success(what + " copied"),
    () => toast.error("Clipboard access unavailable"),
  );

function CloudflareCell({
  items,
  appUrl,
  known,
}: {
  items: CloudflareDeploymentRow[];
  appUrl: string | null;
  known: boolean;
}) {
  if (!items.length) {
    return appUrl ? (
      <a
        href={appUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
        title="App URL from saved plan or GitHub homepage; Cloudflare deployment not independently verified"
      >
        <Globe size={12} className="shrink-0" />
        <span className="truncate">{hostOf(appUrl)}</span>
      </a>
    ) : known ? (
      <span className="text-muted-foreground" title="No matched Cloudflare source or recorded app URL; deployment is not disproved">No verified app link</span>
    ) : (
      <span
        className="text-muted-foreground"
        title="Cloudflare inventory unavailable — deployment unknown"
      >
        Cloudflare n/a
      </span>
    );
  }
  const first = items[0];
  const ui = CF_ICON[healthOf(first)];
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1">
        <ui.icon size={12} className={"shrink-0 " + ui.cls} aria-label={ui.label} />
        <a
          href={first.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={ui.label + " · manage in Cloudflare"}
          className="truncate font-medium hover:text-primary"
        >
          {first.name}
        </a>
        {items.length > 1 && (
          <span
            className="shrink-0 text-[10px] text-muted-foreground"
            title={items
              .slice(1)
              .map((i) => i.name)
              .join(", ")}
          >
            +{items.length - 1}
          </span>
        )}
      </div>
      {first.publicUrl && (
        <a
          href={first.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[10px] text-primary hover:underline"
        >
          {hostOf(first.publicUrl)}
        </a>
      )}
    </div>
  );
}

export default function RepoOpsWorkspace({
  displayRepos,
  savedRepos,
  onEdit,
}: {
  displayRepos: GitHubRepo[];
  savedRepos: GitHubRepo[];
  onEdit: (repo: GitHubRepo) => void;
}) {
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const bulkAddItems = useBulkAddItems();
  const bulkPatch = useBulkPatch();
  const [owners, setOwners] = useState<Record<string, OwnerResult>>(cachedOwners);
  const [owned, setOwned] = useState<GitHubPrivateInventory | null>(ownedCache?.value ?? null);
  const [ownedNote, setOwnedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const cf = useCloudflareControl();
  const loadCloudflare = cf.load;
  // Without complete Cloudflare coverage, unmatched repositories are unknown, not undeployed.
  const cfKnown = Boolean(cf.snapshot?.inventory);
  const cfComplete = cf.snapshot?.inventory?.truthState === "live";

  const refresh = useCallback(
    async (force = false) => {
      setBusy(true);
      try {
        const [ownerResults, ownedResult] = await Promise.all([
          loadOwnerRepos({ force }),
          loadOwned(force).then(
            (v) => ({ ok: true as const, v }),
            () => ({ ok: false as const }),
          ),
        ]);
        setOwners((old) => {
          const next = { ...old };
          for (const result of ownerResults) next[result.owner] = result;
          return next;
        });
        if (ownedResult.ok) {
          setOwned(ownedResult.v);
          setOwnedNote(null);
        } else
          setOwnedNote(
            "Private/authenticated inventory unavailable (requires Cloudflare Access sign-in and server GitHub tokens).",
          );
        if (force) void loadCloudflare(true);
      } finally {
        setBusy(false);
      }
    },
    [loadCloudflare],
  );
  useEffect(() => {
    setPrefs(readPrefs());
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key === "/" &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || "") &&
        !target?.isContentEditable
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const update = (patch: Partial<Prefs>) =>
    setPrefs((old) => {
      const next = { ...old, ...patch };
      writePrefs(next);
      return next;
    });

  const live = useMemo(() => OWNERS.flatMap((o) => owners[o]?.repositories || []), [owners]);
  const cloud = cf.snapshot?.inventory?.rows;
  const all = useMemo(
    () =>
      buildRepoOps({
        displayRepos,
        savedRepos,
        live,
        owned: owned?.ownedRepositories || [],
        cloud: cloud || [],
      }),
    [displayRepos, savedRepos, live, owned, cloud],
  );
  const ownerScoped = useMemo(
    () =>
      all.filter(
        (r) => prefs.owner === "all" || r.owner.toLowerCase() === prefs.owner.toLowerCase(),
      ),
    [all, prefs.owner],
  );
  const quick: RepoQuick =
    !cfComplete &&
    (prefs.quick === "undeployed" || prefs.quick === "failing")
      ? "all"
      : prefs.quick;
  const counts = useMemo(() => repoQuickCounts(ownerScoped), [ownerScoped]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ownerScoped
      .filter((r) => matchesRepoQuick(r, quick) && (!needle || repoSearchText(r).includes(needle)))
      .sort((a, b) => compareRepoRows(a, b, prefs.sort));
  }, [ownerScoped, quick, prefs.sort, query]);
  const ownerOptions = useMemo(() => {
    const names = new Map<string, number>();
    for (const r of all) names.set(r.owner, (names.get(r.owner) || 0) + 1);
    return [...names.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);
  const selectedRows = rows.filter((r) => selected.has(r.key));
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.key));
  const linkedRepos = all.filter((r) => r.cloudflare.length).length;
  const rateLimited = ownersRateLimitedUntil();

  const toggle = (key: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const setPriority = async (targets: RepoOpsRow[], priority: Priority) => {
    const savedIds = targets.filter((r) => r.saved).map((r) => r.plan.id);
    const fresh = targets
      .filter((r) => !r.saved)
      .map((r) => {
        const { id: _id, ...plan } = r.plan;
        return { ...plan, name: r.name, url: r.url, visibility: r.visibility, priority };
      });
    try {
      if (savedIds.length === 1 && !fresh.length)
        await updateItem<GitHubRepo>("repos", savedIds[0], { priority });
      else if (savedIds.length) await bulkPatch("repos", savedIds, { priority });
      if (fresh.length === 1) await addItem<GitHubRepo>("repos", fresh[0]);
      else if (fresh.length) await bulkAddItems<GitHubRepo>("repos", fresh);
      toast.success(
        targets.length === 1
          ? targets[0].name + " → " + priority
          : targets.length + " repositories → " + priority,
      );
    } catch {
      toast.error("Priority was not saved. Try again.");
    }
  };
  const exportCsv = () => {
    const data = selectedRows.length ? selectedRows : rows;
    if (!data.length) return;
    const url = URL.createObjectURL(
      new Blob([repoOpsCsv(data)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "github-repositories-" + new Date().toISOString().slice(0, 10) + ".csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const resetFilters = () => {
    setQuery("");
    update(DEFAULT_PREFS);
  };

  return (
    <section aria-label="GitHub repository operations" className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              Repository operations
            </p>
            <h2 className="mt-0.5 text-lg font-bold">
              Every repo, its deployment, and its next action
            </h2>
            <p className="mt-1 text-xs text-muted-foreground" role="status">
              {OWNERS.map((o) => {
                const r = owners[o];
                return (
                  o +
                  " " +
                  (r?.state === "live"
                    ? "✓ " + r.repositories.length
                    : r?.state === "error"
                      ? "⚠ retained"
                      : "…")
                );
              }).join(" · ")}
              {" · "}Authenticated:{" "}
              {owned
                ? owned.truthState === "not_connected"
                  ? "not configured"
                  : owned.truthState +
                    " (" +
                    owned.ownedRepositories.length +
                    " repos, " +
                    owned.repositories.length +
                    " private)"
                : ownedNote
                  ? "unavailable"
                  : "checking…"}
              {" · "}Cloudflare:{" "}
              {cf.snapshot?.inventory
                ? (cloud?.length || 0) + " projects → " + linkedRepos + " repos"
                : cf.loading
                  ? "loading…"
                  : "unavailable"}
            </p>
            {rateLimited > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                GitHub public API rate-limited until {new Date(rateLimited).toLocaleTimeString()};
                showing last verified data.
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={() => void refresh(true)}
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />{" "}
            {busy ? "Refreshing…" : "Refresh all"}
          </button>
        </div>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        role="toolbar"
        aria-label="Repository quick filters"
      >
        {CHIPS.filter(
          (c) =>
            (c.id === "all" || counts[c.id] > 0 || quick === c.id) &&
            ((cfKnown || c.id !== "cloudflare") &&
              (cfComplete || (c.id !== "undeployed" && c.id !== "failing"))),
        ).map((chip) => {
          const active = quick === chip.id;
          const tone =
            chip.tone === "danger" && counts[chip.id]
              ? "text-red-600 dark:text-red-400"
              : chip.tone === "warn" && counts[chip.id]
                ? "text-amber-600 dark:text-amber-400"
                : "";
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => update({ quick: chip.id })}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-card/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {chip.label}{" "}
              <span className={`ml-1 tabular-nums ${active ? "" : tone}`}>{counts[chip.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_13rem_12rem_auto]">
        <label className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"
          />
          <span className="sr-only">Search repositories</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repo, description, next action, domain…  ( / )"
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm"
          />
        </label>
        <select
          aria-label="Filter GitHub account"
          value={prefs.owner}
          onChange={(e) => update({ owner: e.target.value })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All accounts ({all.length})</option>
          {ownerOptions.map(([name, n]) => (
            <option key={name} value={name}>
              {name} ({n})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm">
          <ArrowDownUp size={14} className="text-muted-foreground" />
          <span className="sr-only">Sort</span>
          <select
            aria-label="Sort repositories"
            value={prefs.sort}
            onChange={(e) => update({ sort: e.target.value as RepoSort })}
            className="w-full bg-transparent py-2"
          >
            <option value="pushed">Latest push</option>
            <option value="priority">My priority</option>
            <option value="issues">Open issues</option>
            <option value="stars">Stars</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows.length}
            className="btn-secondary text-xs"
            title="Export selected rows, or the filtered list"
          >
            <Download size={13} /> CSV
          </button>
          <button type="button" onClick={resetFilters} className="btn-secondary text-xs">
            <X size={13} /> Reset
          </button>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur">
          <strong>{selectedRows.length} selected</strong>
          <select
            aria-label="Set priority for selected repositories"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value as Priority;
              e.target.value = "";
              if (v) void setPriority(selectedRows, v);
            }}
            className="rounded-lg border border-border bg-background px-2 py-1"
          >
            <option value="" disabled>
              Set priority…
            </option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() =>
              copyText(
                selectedRows.map((r) => "git clone " + r.url + ".git").join("\n"),
                "Clone commands",
              )
            }
          >
            <Copy size={12} /> git clone commands
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => copyText(selectedRows.map((r) => r.url).join("\n"), "Repository URLs")}
          >
            <Copy size={12} /> URLs
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setSelected(new Set())}
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing <strong className="text-foreground">{rows.length}</strong> of {ownerScoped.length}{" "}
        repositories · all results rendered
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          {busy ? "Loading repositories…" : "No repositories match these filters."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
          <div className="hidden grid-cols-[1.25rem_minmax(0,2.3fr)_5.5rem_minmax(0,1.6fr)_minmax(0,1.5fr)_10.5rem] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <input
              type="checkbox"
              aria-label="Select all visible repositories"
              checked={allVisibleSelected}
              onChange={() =>
                setSelected(allVisibleSelected ? new Set() : new Set(rows.map((r) => r.key)))
              }
              className="h-4 w-4 accent-primary"
            />
            <span>Repository</span>
            <span>Pushed</span>
            <span>Cloudflare / app</span>
            <span>Plan</span>
            <span className="text-right">Manage</span>
          </div>
          <ul className="divide-y divide-border/60">
            {rows.map((row) => {
              const repoPath = row.key.split("/")[1];
              return (
                <li
                  key={row.key}
                  className={`grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-4 py-2.5 text-xs [contain-intrinsic-size:auto_68px] [content-visibility:auto] hover:bg-muted/30 md:grid-cols-[1.25rem_minmax(0,2.3fr)_5.5rem_minmax(0,1.6fr)_minmax(0,1.5fr)_10.5rem] md:items-center ${selected.has(row.key) ? "bg-primary/5" : ""}`}
                >
                  <input
                    type="checkbox"
                    aria-label={"Select " + row.key}
                    checked={selected.has(row.key)}
                    onChange={() => toggle(row.key)}
                    className="mt-1 h-4 w-4 accent-primary md:mt-0"
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-semibold hover:text-primary"
                        title={row.key}
                      >
                        <span className="font-normal text-muted-foreground">{row.owner}/</span>
                        {row.plan.name || repoPath}
                      </a>
                      {row.visibility === "private" && (
                        <Lock size={11} className="shrink-0 text-amber-500" aria-label="Private" />
                      )}
                      {row.archived && (
                        <Archive
                          size={11}
                          className="shrink-0 text-muted-foreground"
                          aria-label="Archived"
                        />
                      )}
                      {row.fork && (
                        <GitFork
                          size={11}
                          className="shrink-0 text-muted-foreground"
                          aria-label="Fork"
                        />
                      )}
                    </div>
                    <p
                      className="truncate text-[11px] text-muted-foreground"
                      title={row.description}
                    >
                      {[
                        row.language,
                        row.stars ? "★ " + row.stars : "",
                        row.openIssues ? row.openIssues + " open" : "",
                        row.description,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        (row.source === "snapshot"
                          ? "Snapshot only — refresh for live metadata"
                          : "No description")}
                    </p>
                  </div>
                  <div
                    className="justify-self-end text-muted-foreground md:justify-self-start"
                    title={
                      row.pushedAt
                        ? new Date(row.pushedAt).toLocaleString()
                        : "Push time not verified"
                    }
                  >
                    {relativeTime(row.pushedAt)}
                  </div>
                  <div className="col-span-2 col-start-2 min-w-0 md:col-span-1 md:col-start-auto">
                    <CloudflareCell items={row.cloudflare} appUrl={row.appUrl} known={cfComplete} />
                  </div>
                  <div className="col-span-2 col-start-2 flex min-w-0 items-center gap-2 md:col-span-1 md:col-start-auto">
                    <select
                      aria-label={"Priority for " + row.key}
                      value={row.plan.priority || ""}
                      onChange={(e) => {
                        if (e.target.value) void setPriority([row], e.target.value as Priority);
                      }}
                      className={`shrink-0 rounded-lg border bg-background px-1.5 py-1 text-[11px] font-semibold capitalize ${PRIORITY_CLS[row.plan.priority || ""]}`}
                    >
                      <option value="" disabled>
                        Priority
                      </option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onEdit(row.plan)}
                      title={row.plan.pendingSummary || "Add a next action"}
                      className="min-w-0 truncate text-left text-[11px] text-muted-foreground hover:text-primary"
                    >
                      {row.plan.pendingSummary || <span className="italic">+ next action</span>}
                    </button>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-0.5 md:col-span-1">
                    <a
                      className={iconBtn}
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={"Code for " + row.key}
                      title="Code"
                    >
                      <Code2 size={15} />
                    </a>
                    <a
                      className={iconBtn}
                      href={row.url + "/pulls"}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={"Pull requests for " + row.key}
                      title="Pull requests"
                    >
                      <GitPullRequest size={15} />
                    </a>
                    <a
                      className={iconBtn}
                      href={row.url + "/actions"}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={"Actions for " + row.key}
                      title="Actions / CI"
                    >
                      <Play size={15} />
                    </a>
                    {row.appUrl ? (
                      <a
                        className={iconBtn}
                        href={row.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={"Open app for " + row.key}
                        title={"Open " + hostOf(row.appUrl)}
                      >
                        <ExternalLink size={15} />
                      </a>
                    ) : (
                      <span className={iconBtn + " opacity-30"} aria-hidden="true">
                        <ExternalLink size={15} />
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={"More actions for " + row.key}
                        >
                          <Ellipsis size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 [&_[role=menuitem]]:gap-2">
                        <DropdownMenuLabel className="truncate text-xs">
                          {row.key}
                        </DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEdit(row.plan)}>
                          <Pencil size={14} /> Edit plan & links
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={"https://github.dev/" + row.owner + "/" + repoPath}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Code2 size={14} /> Edit in github.dev
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={row.url + "/issues"} target="_blank" rel="noopener noreferrer">
                            <CircleDot size={14} /> Issues
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={row.url + "/issues/new"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <CircleDot size={14} /> New issue
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={row.url + "/commits"} target="_blank" rel="noopener noreferrer">
                            <GitPullRequest size={14} /> Commits
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={row.url + "/deployments"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Cloud size={14} /> GitHub deployments
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={row.url + "/settings"} target="_blank" rel="noopener noreferrer">
                            <Settings size={14} /> Settings
                          </a>
                        </DropdownMenuItem>
                        {row.cloudflare.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            {row.cloudflare.map((c) => (
                              <DropdownMenuItem key={c.key} asChild>
                                <a href={c.projectUrl} target="_blank" rel="noopener noreferrer">
                                  <Cloud size={14} /> Cloudflare: {c.name}
                                </a>
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() =>
                            copyText("git clone " + row.url + ".git", "Clone command")
                          }
                        >
                          <Copy size={14} /> Copy git clone
                        </DropdownMenuItem>
                        {row.appUrl && (
                          <DropdownMenuItem onSelect={() => copyText(row.appUrl!, "App URL")}>
                            <Copy size={14} /> Copy app URL
                          </DropdownMenuItem>
                        )}
                        {row.stars !== null && (
                          <DropdownMenuItem asChild>
                            <a
                              href={row.url + "/stargazers"}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Star size={14} /> {row.stars} stars
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <AlertTriangle size={12} className="mt-px shrink-0" />
        Cloudflare links come only from the Git source each Pages project reports — no name
        guessing. Priorities and next actions are your saved plans; GitHub and Cloudflare data are
        read-only observations.
      </p>
    </section>
  );
}
