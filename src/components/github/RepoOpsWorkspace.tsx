import { onPrivateSnapshotsCleared, readSnapshot, writeSnapshot } from "@/lib/snapshotCache";
import {
  filterDeleted,
  markDeleted,
  reconcileDeleted,
  useDeletedMarks,
} from "@/lib/deletedResources";
import { getGitHubRepoKey } from "@/lib/unifiedGitHubCatalog";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Archive,
  ChevronsUpDown,
  CircleAlert,
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
  FolderGit2,
  GitFork,
  GitPullRequest,
  Github,
  Keyboard,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { portfolioPage, type PortfolioPageSize } from "@/lib/portfolioPaging";
import PortfolioPager from "@/components/controlcenter/PortfolioPager";
import { githubTriage } from "@/lib/portfolioTriage";
import SavedFilterViews from "@/components/controlcenter/SavedFilterViews";
import { recentOperatorActivity } from "@/lib/operatorActivity";
import {
  matchesRepositoryFacets,
  repositoryPortfolioStats,
  type RepositoryFacets,
} from "@/lib/repositoryFacets";
import type { GitHubRepo } from "@/lib/db";
import {
  useAddItem,
  useBuildProjects,
  useBulkAddItems,
  useBulkPatch,
  useUpdateItem,
} from "@/hooks/useTableData";
import {
  OWNERS,
  cachedOwners,
  hydrateOwnerRepos,
  loadOwnerRepos,
  ownersRateLimitedUntil,
  type OwnerResult,
} from "@/lib/liveGitHub";
import {
  getPrivateGitHubInventory,
  type GitHubPrivateInventory,
} from "@/lib/githubPrivateInventory.functions";
import { useCloudflareControl } from "@/lib/cloudflareControlClient";
import { relativeTime, hostOf } from "@/lib/cloudflareWorkspace";
import {
  buildRepoOps,
  compareRepoRows,
  matchesRepoQuick,
  repoOpsCsv,
  repoQuickCounts,
  repoSearchText,
  type RepoOpsRow,
  type RepoQuick,
} from "@/lib/repoOps";
import {
  REPO_DEPLOY_LABEL,
  REPO_PREFS_DEFAULT,
  clearRepoFilter,
  normalizeRepoPrefs,
  repoCloneCommand,
  repoDeployState,
  repoFilterChips,
  repoGroup,
  type RepoDeployState,
  type RepoGroupBy,
  type RepoPrefs,
} from "@/lib/repoConsole";
import {
  BULK_OPEN_LIMIT,
  flattenGroups,
  groupRows,
  limitOpen,
  markdownList,
  safeUrls,
} from "@/lib/consoleKit";
import { useConsoleFocus } from "@/stores/consoleFocusStore";
import { useNavigationStore } from "@/stores/navigationStore";
import {
  ActiveFilters,
  BulkBar,
  DensityToggle,
  GroupHeader,
  HealthTile,
  Pill,
  ShortcutHelp,
  TileRow,
  ctl,
  ctlPrimary,
  iconBtn,
  selectCls,
  useListKeyboard,
  type Shortcut,
  type Tone,
} from "@/components/console/ConsoleUI";
import RepoDrawer from "@/components/github/RepoDrawer";
import { logAudit } from "@/lib/audit";
import DeleteResourceDialog from "@/components/console/DeleteResourceDialog";
import { githubDeleteTarget } from "@/components/console/deleteTargets";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
function readPrefs(): RepoPrefs {
  try {
    return normalizeRepoPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"));
  } catch {
    return REPO_PREFS_DEFAULT;
  }
}
function writePrefs(prefs: RepoPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* per-viewer convenience only */
  }
}

// Authenticated (server-side, Access-protected) inventory shared for 10 minutes.
let ownedCache: { at: number; value: GitHubPrivateInventory } | null = null;
let ownedInflight: Promise<GitHubPrivateInventory> | null = null;
const OWNED_DISK_KEY = "private:github-owned";
let ownedHydration: Promise<void> | null = null;
onPrivateSnapshotsCleared(() => {
  ownedCache = null;
  ownedHydration = Promise.resolve();
});
function hydrateOwned(): Promise<void> {
  if (!ownedHydration)
    ownedHydration = readSnapshot<GitHubPrivateInventory>(OWNED_DISK_KEY).then((saved) => {
      if (saved && !ownedCache && saved.value?.truthState !== "not_connected") ownedCache = saved;
    });
  return ownedHydration;
}
function loadOwned(force = false): Promise<GitHubPrivateInventory> {
  if (ownedInflight) return ownedInflight;
  ownedInflight = hydrateOwned()
    .then(() => {
      if (!force && ownedCache && Date.now() - ownedCache.at < 10 * 60_000) return ownedCache.value;
      return getPrivateGitHubInventory().then((value) => {
        ownedCache = { at: Date.now(), value };
        reconcileDeleted(
          value.ownedRepositories.flatMap((r) => getGitHubRepoKey(r.url) || []),
          ownedCache.at,
        );
        if (value.truthState !== "not_connected" && value.repositories.length)
          void writeSnapshot(OWNED_DISK_KEY, value, ownedCache.at);
        return value;
      });
    })
    .finally(() => {
      ownedInflight = null;
    });
  return ownedInflight;
}

const QUICK_VIEWS: Array<{ id: RepoQuick; label: string }> = [
  { id: "all", label: "All repositories" },
  { id: "attention", label: "Needs action" },
  { id: "failing", label: "Failed Cloudflare builds" },
  { id: "cloudflare", label: "On Cloudflare" },
  { id: "undeployed", label: "No verified app link" },
  { id: "recent", label: "Pushed in 7 days" },
  { id: "stale", label: "Stale over 180 days" },
  { id: "issues", label: "Open issues / PRs" },
  { id: "private", label: "Private" },
  { id: "unplanned", label: "No plan yet" },
  { id: "forks", label: "Forks" },
  { id: "archived", label: "Archived" },
];

const DEPLOY_UI: Record<
  RepoDeployState,
  { tone: Tone; icon: typeof CircleCheck; spin?: boolean } | null
> = {
  failing: { tone: "danger", icon: CircleX },
  building: { tone: "info", icon: LoaderCircle, spin: true },
  deployed: { tone: "good", icon: CircleCheck },
  idle: { tone: "neutral", icon: CircleDashed },
  linked: { tone: "neutral", icon: CircleDot },
  none: null,
};
const PRIORITY_CLS: Record<string, string> = {
  critical: "border-red-500/45 bg-red-500/10 text-red-700 dark:text-red-300",
  high: "border-amber-500/45 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  medium: "border-border bg-muted/40 text-foreground",
  low: "border-border bg-transparent text-muted-foreground",
  "": "border-dashed border-border bg-transparent text-muted-foreground",
};
const SHORTCUTS: Shortcut[] = [
  { keys: ["/"], label: "Search repositories" },
  { keys: ["j", "↓"], label: "Next repository" },
  { keys: ["k", "↑"], label: "Previous repository" },
  { keys: ["Enter", "o"], label: "Open details drawer" },
  { keys: ["x"], label: "Select / unselect repository" },
  { keys: ["r"], label: "Refresh all sources" },
  { keys: ["Esc"], label: "Close drawer, then clear selection" },
  { keys: ["?"], label: "Show this help" },
];

const copyText = (text: string, what: string) =>
  void navigator.clipboard.writeText(text).then(
    () => toast.success(what + " copied"),
    () => toast.error("Clipboard access unavailable"),
  );
const openAll = (urls: ReadonlyArray<string | null | undefined>, what: string) => {
  const { open, skipped } = limitOpen(safeUrls(urls), BULK_OPEN_LIMIT);
  if (!open.length) {
    toast.info("No " + what + " to open for the selection");
    return;
  }
  open.forEach((url) => window.open(url, "_blank", "noopener,noreferrer"));
  toast.success(
    "Opened " +
      open.length +
      " " +
      what +
      (skipped ? " — " + skipped + " more skipped (limit " + BULK_OPEN_LIMIT + ")" : ""),
    {
      description:
        open.length > 1 ? "If only one tab opened, allow pop-ups for this site." : undefined,
    },
  );
};

const ownerDot = (state: OwnerResult["state"] | undefined) =>
  state === "live"
    ? "bg-emerald-500"
    : state === "error"
      ? "bg-amber-500"
      : "bg-muted-foreground/40";

export default function RepoOpsWorkspace({
  displayRepos,
  savedRepos,
  onEdit,
  onAdd,
}: {
  displayRepos: GitHubRepo[];
  savedRepos: GitHubRepo[];
  onEdit: (repo: GitHubRepo) => void;
  onAdd: () => void;
}) {
  const apps = useBuildProjects();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const bulkAddItems = useBulkAddItems();
  const bulkPatch = useBulkPatch();
  const setSection = useNavigationStore((s) => s.setActiveSection);
  const focusCloudflare = useConsoleFocus((s) => s.open);
  const focusRequest = useConsoleFocus((s) => s.request);
  const [owners, setOwners] = useState<Record<string, OwnerResult>>(cachedOwners);
  const [owned, setOwned] = useState<GitHubPrivateInventory | null>(ownedCache?.value ?? null);
  const [ownedNote, setOwnedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<RepoPrefs>(REPO_PREFS_DEFAULT);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PortfolioPageSize>(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
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
    // Paint the last saved copy immediately, then refresh in the background.
    void Promise.all([hydrateOwnerRepos(), hydrateOwned()]).then(() => {
      setOwners((old) => (Object.keys(old).length ? old : cachedOwners()));
      setOwned((old) => old ?? ownedCache?.value ?? null);
    });
    void refresh();
  }, [refresh]);

  const update = (patch: Partial<RepoPrefs>) => {
    setPage(1);
    setPrefs((old) => {
      const next = { ...old, ...patch };
      writePrefs(next);
      return next;
    });
  };
  const setFacet = (patch: Partial<RepositoryFacets>) =>
    update({ facets: { ...prefs.facets, ...patch } });

  /* ───────────── data model ───────────── */
  const live = useMemo(() => OWNERS.flatMap((o) => owners[o]?.repositories || []), [owners]);
  const cloud = cf.snapshot?.inventory?.rows;
  const deletedMarks = useDeletedMarks();
  const all = useMemo(
    () =>
      filterDeleted(
        buildRepoOps({
          displayRepos,
          savedRepos,
          live,
          owned: owned?.ownedRepositories || [],
          cloud: cloud || [],
          apps,
        }),
        deletedMarks,
      ),
    [displayRepos, savedRepos, live, owned, cloud, apps, deletedMarks],
  );
  const ownerScoped = useMemo(
    () =>
      all.filter(
        (r) => prefs.owner === "all" || r.owner.toLowerCase() === prefs.owner.toLowerCase(),
      ),
    [all, prefs.owner],
  );
  const quick: RepoQuick =
    !cfComplete && (prefs.quick === "undeployed" || prefs.quick === "failing")
      ? "all"
      : prefs.quick;
  const effectivePrefs = quick === prefs.quick ? prefs : { ...prefs, quick };
  const counts = useMemo(() => repoQuickCounts(ownerScoped), [ownerScoped]);
  const stats = useMemo(() => repositoryPortfolioStats(all), [all]);
  const triage = useMemo(
    () => githubTriage(ownerScoped, cf.snapshot?.inventory?.truthState || null),
    [ownerScoped, cf.snapshot?.inventory?.truthState],
  );
  const languages = useMemo(
    () =>
      [...new Set(ownerScoped.map((r) => r.language || "Unknown"))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [ownerScoped],
  );
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ownerScoped
      .filter(
        (r) =>
          matchesRepoQuick(r, quick) &&
          matchesRepositoryFacets(r, prefs.facets) &&
          (!needle || repoSearchText(r).includes(needle)),
      )
      .sort((a, b) => compareRepoRows(a, b, prefs.sort));
  }, [ownerScoped, quick, prefs.sort, prefs.facets, query]);
  const groups = useMemo(
    () => (prefs.groupBy === "none" ? null : groupRows(rows, (r) => repoGroup(r, prefs.groupBy))),
    [rows, prefs.groupBy],
  );
  const ordered = useMemo(() => (groups ? flattenGroups(groups) : rows), [groups, rows]);
  const groupCounts = useMemo(
    () => new Map((groups || []).map((g) => [g.key, g.rows.length])),
    [groups],
  );
  const current = portfolioPage(ordered, page, pageSize);
  const ownerOptions = useMemo(() => {
    const names = new Map<string, number>();
    for (const r of all) names.set(r.owner, (names.get(r.owner) || 0) + 1);
    return [...names.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);
  const recentActivity = useMemo(() => recentOperatorActivity(all, cloud || [], 8), [all, cloud]);
  const rateLimited = ownersRateLimitedUntil();
  const chips = repoFilterChips(effectivePrefs, query);

  const resetAll = () => {
    setQuery("");
    update({ ...REPO_PREFS_DEFAULT, density: prefs.density, groupBy: prefs.groupBy });
  };
  const clearChip = (id: string) => {
    const next = clearRepoFilter(effectivePrefs, id);
    if (next.clearQuery) setQuery("");
    else update(next.prefs);
  };

  /* ───────────── selection + saving ───────────── */
  const selectedRows = useMemo(
    () => ordered.filter((r) => selected.has(r.key)),
    [ordered, selected],
  );
  const allVisibleSelected =
    current.items.length > 0 && current.items.every((r) => selected.has(r.key));
  const toggle = (key: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /** Saved plans are patched in place; repositories without a plan get one created. */
  const savePlan = async (
    targets: RepoOpsRow[],
    patch: Partial<GitHubRepo>,
    successLabel: string,
  ) => {
    const savedIds = targets.filter((r) => r.saved).map((r) => r.plan.id);
    const fresh = targets
      .filter((r) => !r.saved)
      .map((r) => {
        const { id: _id, ...plan } = r.plan;
        return { ...plan, name: r.name, url: r.url, visibility: r.visibility, ...patch };
      });
    try {
      if (savedIds.length === 1 && !fresh.length)
        await updateItem<GitHubRepo>("repos", savedIds[0], patch);
      else if (savedIds.length) await bulkPatch("repos", savedIds, patch);
      if (fresh.length === 1) await addItem<GitHubRepo>("repos", fresh[0]);
      else if (fresh.length) await bulkAddItems<GitHubRepo>("repos", fresh);
      toast.success(
        targets.length === 1
          ? targets[0].name + " · " + successLabel
          : targets.length + " repositories · " + successLabel,
      );
    } catch {
      toast.error("That change was not saved. Nothing was modified on GitHub — try again.");
      throw new Error("save failed");
    }
  };
  const setPriority = (targets: RepoOpsRow[], priority: Priority) =>
    savePlan(targets, { priority }, "priority " + priority).catch(() => undefined);
  const setStatus = (targets: RepoOpsRow[], status: GitHubRepo["status"]) =>
    savePlan(targets, { status }, "status " + status).catch(() => undefined);

  const exportCsv = (data: RepoOpsRow[]) => {
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

  /* ───────────── drawer + keyboard ───────────── */
  const drawerRow = useMemo(
    () => (drawerKey ? (all.find((r) => r.key === drawerKey) ?? null) : null),
    [all, drawerKey],
  );
  const drawerIndex = drawerKey ? ordered.findIndex((r) => r.key === drawerKey) : -1;
  const pageOf = (index: number) => Math.floor(index / pageSize) + 1;

  const kb = useListKeyboard<RepoOpsRow>({
    items: ordered,
    enabled: !helpOpen,
    keyOf: (r) => r.key,
    onOpen: (r) => setDrawerKey(r.key),
    onToggleSelect: (r) => toggle(r.key),
    onSearch: () => searchRef.current?.focus(),
    onHelp: () => setHelpOpen(true),
    onRefresh: () => void refresh(true),
    onEscape: () => {
      if (selected.size && !drawerKey) {
        setSelected(new Set());
        return true;
      }
    },
    onMove: (index) => {
      setPage(pageOf(index));
      // While the drawer is open, j/k step it through the list.
      setDrawerKey((open) => (open ? (ordered[index]?.key ?? open) : open));
    },
  });
  const [deleteRow, setDeleteRow] = useState<RepoOpsRow | null>(null);
  /** Cheap re-read of the authenticated inventory only (no public API calls). */
  const refreshOwned = useCallback(() => {
    void loadOwned(true).then(setOwned, () => undefined);
  }, []);
  /** Runs only after GitHub confirmed the delete and a fresh read no longer finds it. */
  const handleDeleted = (row: RepoOpsRow, message: string) => {
    markDeleted(row.key);
    const keep = (r: { url: string }) => getGitHubRepoKey(r.url) !== row.key;
    if (ownedCache) {
      const value = {
        ...ownedCache.value,
        repositories: ownedCache.value.repositories.filter(keep),
        ownedRepositories: ownedCache.value.ownedRepositories.filter(keep),
      };
      ownedCache = { at: ownedCache.at, value };
      void writeSnapshot(OWNED_DISK_KEY, value, ownedCache.at);
      setOwned(value);
    }
    setSelected((old) => {
      if (!old.has(row.key)) return old;
      const next = new Set(old);
      next.delete(row.key);
      return next;
    });
    setDrawerKey((open) => (open === row.key ? null : open));
    toast.success(row.owner + "/" + row.name + " deleted", { description: message });
    void logAudit({
      action: "delete",
      collection: "github-repos",
      recordId: row.key,
      label: "GitHub delete · " + row.key,
      detail: "Confirmed by GitHub · " + message,
    });
    refreshOwned();
  };
  const openRow = (row: RepoOpsRow) => {
    const index = ordered.findIndex((r) => r.key === row.key);
    if (index >= 0) kb.setCursor(index);
    setDrawerKey(row.key);
  };
  const stepDrawer = (delta: number) => {
    if (drawerIndex < 0) return;
    const index = Math.min(ordered.length - 1, Math.max(0, drawerIndex + delta));
    kb.setCursor(index);
    setPage(pageOf(index));
    setDrawerKey(ordered[index].key);
  };

  // "Manage in GitHub console" hand-off from the Cloudflare console.
  useEffect(() => {
    if (focusRequest?.console !== "github" || !all.length) return;
    const key = useConsoleFocus.getState().consume("github");
    if (!key) return;
    const hit = all.find((r) => r.key.toLowerCase() === key.toLowerCase());
    if (hit) setDrawerKey(hit.key);
    else toast.info("That repository is not in the GitHub inventory yet — refresh and try again.");
  }, [focusRequest, all]);

  /* ───────────── header status ───────────── */
  const cfSummary = cf.snapshot?.inventory
    ? (cloud?.length || 0) + " projects · " + stats.cloudflareMatches + " linked"
    : cf.loading
      ? "loading…"
      : "not connected";
  const ownedSummary = owned
    ? owned.truthState === "not_connected"
      ? "not configured"
      : owned.repositories.length + " private"
    : ownedNote
      ? "unavailable"
      : "checking…";

  const tile = (id: RepoQuick) => ({
    active: effectivePrefs.quick === id && prefs.facets.deployment === "all",
    onClick: () =>
      update({
        quick: effectivePrefs.quick === id ? "all" : id,
        facets: { ...prefs.facets, deployment: "all" },
      }),
  });
  const compact = prefs.density === "compact";
  const bulkCount = selectedRows.length;

  return (
    <section aria-label="GitHub repository operations" className="space-y-3.5">
      {/* ───── header ───── */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <FolderGit2 size={12} /> Growth / Repositories
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            <Github size={26} className="shrink-0" /> GitHub
            <span className="text-base font-semibold tabular-nums text-muted-foreground">
              {all.length}
            </span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground" role="status">
            Every repository across {ownerOptions.length || OWNERS.length} accounts, its deployment
            evidence and your next action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className={ctl} href="/portfolio-atlas" title="Compare all three GitHub accounts">
            Portfolio Atlas <ExternalLink size={12} />
          </a>
          <button type="button" className={ctl} onClick={onAdd}>
            <Plus size={14} /> Add repository
          </button>
          <button
            type="button"
            className={ctlPrimary}
            disabled={busy}
            onClick={() => void refresh(true)}
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />{" "}
            {busy ? "Refreshing…" : "Refresh all"}
          </button>
        </div>
      </header>

      {/* source health: one line, not a panel */}
      <div
        className="flex flex-wrap items-center gap-1.5 text-[11px]"
        aria-label="Data source status"
      >
        {OWNERS.map((o) => {
          const r = owners[o];
          return (
            <span
              key={o}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1"
              title={
                r?.state === "error" ? "Live fetch failed; showing last verified data" : undefined
              }
            >
              <span className={"h-1.5 w-1.5 rounded-full " + ownerDot(r?.state)} />
              <span className="font-semibold">{o}</span>
              <span className="tabular-nums text-muted-foreground">
                {r?.state === "live"
                  ? r.repositories.length
                  : r?.state === "error"
                    ? "retained"
                    : "…"}
              </span>
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1">
          <Lock size={10} className="text-muted-foreground" />{" "}
          <span className="font-semibold">Authenticated</span>
          <span className="text-muted-foreground">{ownedSummary}</span>
        </span>
        <button
          type="button"
          onClick={() => setSection("cloudflare")}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 hover:border-primary/40"
          title="Open the Cloudflare console"
        >
          <Cloud size={10} className="text-orange-500" />{" "}
          <span className="font-semibold">Cloudflare</span>
          <span className="text-muted-foreground">{cfSummary}</span>
        </button>
        {rateLimited > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <TriangleAlert size={12} /> GitHub public API rate-limited until{" "}
            {new Date(rateLimited).toLocaleTimeString()} — showing last verified data
          </span>
        )}
      </div>

      {!cfKnown && !cf.loading && (
        <p className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <CircleAlert size={14} className="mt-px shrink-0" />
          <span>
            Cloudflare isn’t connected here, so deployment shows recorded app links only — missing
            evidence is never reported as “undeployed”.{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setSection("cloudflare")}
            >
              Open Cloudflare setup →
            </button>
          </span>
        </p>
      )}

      {/* ───── health tiles (also filters) ───── */}
      <TileRow label="Repository health. Select a tile to filter the list.">
        <HealthTile
          label="Needs action"
          value={counts.attention}
          hint="High priority, or a next action set"
          tone="warn"
          {...tile("attention")}
        />
        <HealthTile
          label="Build failures"
          value={cfComplete ? counts.failing : "—"}
          hint={cfComplete ? "Cloudflare production builds" : "Needs complete Cloudflare data"}
          tone="danger"
          disabled={!cfComplete}
          {...tile("failing")}
        />
        <HealthTile
          label="Open issues / PRs"
          value={counts.issues}
          hint="Repos with at least one open"
          tone="info"
          {...tile("issues")}
        />
        <HealthTile
          label="No app link"
          value={triage.missingApp.length}
          hint="Unresolved — not “undeployed”"
          tone="warn"
          active={prefs.facets.deployment === "missing-app" && effectivePrefs.quick === "all"}
          onClick={() =>
            update({
              quick: "all",
              facets: {
                ...prefs.facets,
                deployment: prefs.facets.deployment === "missing-app" ? "all" : "missing-app",
              },
            })
          }
        />
        <HealthTile
          label="Pushed · 7 days"
          value={counts.recent}
          hint="Recently active"
          tone="good"
          {...tile("recent")}
        />
        <HealthTile
          label="Stale · 180d+"
          value={counts.stale}
          hint="Candidates to archive"
          {...tile("stale")}
        />
      </TileRow>

      {/* ───── toolbar ───── */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Repository tools"
      >
        <label className="relative min-w-0 basis-full sm:min-w-[13rem] sm:basis-auto flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"
          />
          <span className="sr-only">Search repositories</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search repositories…"
            className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-2 hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
            /
          </kbd>
        </label>

        <select
          aria-label="Filter GitHub account"
          value={prefs.owner}
          onChange={(e) => update({ owner: e.target.value })}
          className={selectCls}
        >
          <option value="all">All accounts ({all.length})</option>
          {ownerOptions.map(([name, n]) => (
            <option key={name} value={name}>
              {name} ({n})
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5">
          <ArrowDownUp size={14} className="text-muted-foreground" />
          <span className="sr-only">Sort repositories</span>
          <select
            aria-label="Sort repositories"
            value={prefs.sort}
            onChange={(e) => update({ sort: e.target.value as RepoPrefs["sort"] })}
            className={selectCls}
          >
            <option value="pushed">Latest push</option>
            <option value="priority">My priority</option>
            <option value="issues">Open issues</option>
            <option value="stars">Stars</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <ChevronsUpDown size={14} className="text-muted-foreground" />
          <span className="sr-only">Group repositories</span>
          <select
            aria-label="Group repositories"
            value={prefs.groupBy}
            onChange={(e) => update({ groupBy: e.target.value as RepoGroupBy })}
            className={selectCls}
          >
            <option value="none">No grouping</option>
            <option value="owner">Group: account</option>
            <option value="priority">Group: priority</option>
            <option value="language">Group: language</option>
            <option value="deployment">Group: deployment</option>
          </select>
        </label>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={ctl}
              aria-label={"Filters, " + chips.length + " active"}
            >
              <SlidersHorizontal size={14} /> Filters
              {chips.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {chips.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[min(26rem,calc(100vw-2rem))] space-y-4 rounded-2xl p-4"
          >
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick view
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_VIEWS.filter(
                  (c) =>
                    (c.id === "all" || counts[c.id] > 0 || effectivePrefs.quick === c.id) &&
                    (cfKnown || c.id !== "cloudflare") &&
                    (cfComplete || (c.id !== "undeployed" && c.id !== "failing")),
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={effectivePrefs.quick === c.id}
                    onClick={() => update({ quick: c.id })}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      effectivePrefs.quick === c.id
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.label} <span className="tabular-nums opacity-70">{counts[c.id]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  [
                    "Language",
                    "Filter repository language",
                    prefs.facets.language,
                    (v: string) => setFacet({ language: v }),
                    [["all", "Any language"], ...languages.map((l) => [l, l])],
                  ],
                  [
                    "Visibility",
                    "Filter repository visibility",
                    prefs.facets.visibility,
                    (v: string) => setFacet({ visibility: v as RepositoryFacets["visibility"] }),
                    [
                      ["all", "Public + private"],
                      ["public", "Public"],
                      ["private", "Private"],
                    ],
                  ],
                  [
                    "Deployment",
                    "Filter deployment linkage",
                    prefs.facets.deployment,
                    (v: string) => setFacet({ deployment: v as RepositoryFacets["deployment"] }),
                    [
                      ["all", "Any linkage"],
                      ["cloudflare", "Linked to Cloudflare"],
                      ["app", "Recorded app URL"],
                      ["missing-app", "Missing app URL"],
                      ["no-cloudflare", "No Cloudflare match"],
                    ],
                  ],
                  [
                    "Activity",
                    "Filter last push activity",
                    prefs.facets.activity,
                    (v: string) => setFacet({ activity: v as RepositoryFacets["activity"] }),
                    [
                      ["all", "Any activity"],
                      ["7d", "Pushed in 7 days"],
                      ["30d", "Pushed in 30 days"],
                      ["180d", "Pushed in 180 days"],
                      ["stale", "Not pushed 180+ days"],
                      ["unknown", "Push date unavailable"],
                    ],
                  ],
                  [
                    "Link evidence",
                    "Filter app link evidence",
                    prefs.facets.evidence,
                    (v: string) => setFacet({ evidence: v as RepositoryFacets["evidence"] }),
                    [
                      ["all", "Any evidence"],
                      ["provider", "Provider-attested"],
                      ["recorded", "Recorded, not verified"],
                      ["missing", "No evidence"],
                    ],
                  ],
                ] as const
              ).map(([label, aria, value, onChange, options]) => (
                <label key={label} className="text-[11px] font-semibold text-muted-foreground">
                  {label}
                  <select
                    aria-label={aria}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={selectCls + " mt-1 w-full"}
                  >
                    {options.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="border-t border-border/70 pt-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Saved views
              </p>
              <SavedFilterViews
                storageKey="mc.github.saved-views.v1"
                state={{ prefs, query }}
                onApply={(view: { prefs: unknown; query?: string }) => {
                  update(normalizeRepoPrefs(view.prefs));
                  setQuery(view.query ?? "");
                }}
              />
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              onClick={resetAll}
            >
              Reset all filters
            </button>
          </PopoverContent>
        </Popover>

        <DensityToggle value={prefs.density} onChange={(density) => update({ density })} />
        <button
          type="button"
          className={ctl + " !px-2.5"}
          onClick={() => exportCsv(selectedRows.length ? selectedRows : ordered)}
          disabled={!ordered.length}
          title="Export selected rows, or the filtered list, as CSV"
          aria-label="Export CSV"
        >
          <Download size={14} />
        </button>
        <button
          type="button"
          className={ctl + " !hidden !px-2.5 sm:!inline-flex"}
          onClick={() => setHelpOpen(true)}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard size={14} />
        </button>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <span>
          Showing <strong className="text-foreground tabular-nums">{ordered.length}</strong> of{" "}
          {ownerScoped.length} repositories
          {current.total ? " · " + current.from + "–" + current.to + " on this page" : ""}
        </span>
        <ActiveFilters chips={chips} onClear={clearChip} onReset={resetAll} />
      </div>

      {/* ───── list ───── */}
      {ordered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">
            {busy ? "Loading repositories…" : "No repositories match these filters."}
          </p>
          {!busy && chips.length > 0 && (
            <button type="button" className={ctl + " mt-3"} onClick={resetAll}>
              <X size={13} /> Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
          <div className="hidden grid-cols-[1.25rem_minmax(0,2.4fr)_4.5rem_minmax(0,1.5fr)_6.75rem_9.75rem] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <input
              type="checkbox"
              aria-label="Select all repositories on this page"
              checked={allVisibleSelected}
              onChange={() =>
                setSelected((old) => {
                  const next = new Set(old);
                  if (allVisibleSelected) current.items.forEach((r) => next.delete(r.key));
                  else current.items.forEach((r) => next.add(r.key));
                  return next;
                })
              }
              className="h-4 w-4 accent-primary"
            />
            <span>Repository</span>
            <span>Pushed</span>
            <span>Deployment</span>
            <span>Priority</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-border/60">
            {current.items.map((row, i) => {
              const group = repoGroup(row, prefs.groupBy);
              const prev = i > 0 ? repoGroup(current.items[i - 1], prefs.groupBy).key : null;
              const state = repoDeployState(row);
              const deploy = DEPLOY_UI[state];
              const repoPath = row.key.split("/")[1];
              const isCursor = kb.cursorKey === row.key;
              const first = row.cloudflare[0];
              return (
                <Fragment key={row.key}>
                  {prefs.groupBy !== "none" && group.key !== prev && (
                    <GroupHeader label={group.label} count={groupCounts.get(group.key) || 0} />
                  )}
                  <li
                    data-row-key={row.key}
                    data-cursor={isCursor || undefined}
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest(
                          'a,button,input,select,label,[role="menuitem"]',
                        )
                      )
                        return;
                      openRow(row);
                    }}
                    className={`mc-mobile-ops-row grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 px-4 text-xs [contain-intrinsic-size:auto_64px] [content-visibility:auto] hover:bg-muted/35 md:grid-cols-[1.25rem_minmax(0,2.4fr)_4.5rem_minmax(0,1.5fr)_6.75rem_9.75rem] md:items-center ${
                      compact ? "py-1.5" : "py-3"
                    } ${selected.has(row.key) ? "bg-primary/5" : ""} ${isCursor ? "relative z-[1] ring-2 ring-inset ring-primary/55" : ""}`}
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
                          onClick={(e) => {
                            // Plain click opens the details drawer; Ctrl/Cmd/Shift/middle-click still follow the link.
                            if (
                              e.button === 0 &&
                              !e.metaKey &&
                              !e.ctrlKey &&
                              !e.shiftKey &&
                              !e.altKey
                            ) {
                              e.preventDefault();
                              openRow(row);
                            }
                          }}
                          className="min-w-0 truncate text-left text-sm font-semibold hover:text-primary"
                          title="Open details (Ctrl/Cmd-click opens GitHub)"
                        >
                          <span className="font-normal text-muted-foreground">{row.owner}/</span>
                          {row.plan.name || repoPath}
                        </a>
                        {row.visibility === "private" && (
                          <Lock
                            size={11}
                            className="shrink-0 text-amber-500"
                            aria-label="Private"
                          />
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
                        {compact && row.openIssues ? (
                          <span
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sky-500/10 px-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300"
                            title={row.openIssues + " open issues and pull requests"}
                          >
                            <GitPullRequest size={10} /> {row.openIssues}
                          </span>
                        ) : null}
                      </div>
                      {!compact && (
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
                      )}
                      {!compact && row.plan.pendingSummary?.trim() && (
                        <p
                          className="mt-0.5 truncate text-[11px] font-medium text-primary"
                          title={row.plan.pendingSummary}
                        >
                          → {row.plan.pendingSummary}
                        </p>
                      )}
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
                      {deploy ? (
                        <>
                          <Pill
                            tone={deploy.tone}
                            icon={deploy.icon}
                            spin={deploy.spin}
                            title={
                              REPO_DEPLOY_LABEL[state] +
                              " — API metadata or a recorded link, not an uptime check"
                            }
                          >
                            {REPO_DEPLOY_LABEL[state]}
                          </Pill>
                          {!compact && (row.appUrl || first) && (
                            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                              {first && state !== "linked"
                                ? first.name + (first.publicUrl ? " · " : "")
                                : ""}
                              {row.appUrl
                                ? hostOf(row.appUrl)
                                : first?.publicUrl
                                  ? hostOf(first.publicUrl)
                                  : ""}
                            </span>
                          )}
                        </>
                      ) : (
                        <span
                          className="text-[11px] text-muted-foreground"
                          title={
                            cfComplete
                              ? "No Cloudflare Page or Worker uses this repo, and no app link is saved"
                              : "Cloudflare data not loaded yet"
                          }
                        >
                          {cf.loading && !cfKnown
                            ? "Checking Cloudflare…"
                            : cfComplete
                              ? "Not on Cloudflare"
                              : "Unknown"}
                        </span>
                      )}
                    </div>
                    <div className="col-start-2 md:col-span-1 md:col-start-auto">
                      <select
                        aria-label={"Priority for " + row.key}
                        value={row.plan.priority || ""}
                        onChange={(e) => {
                          if (e.target.value) void setPriority([row], e.target.value as Priority);
                        }}
                        className={`w-full max-w-[9.5rem] rounded-lg border px-1.5 py-1 text-[11px] font-semibold capitalize md:max-w-none ${PRIORITY_CLS[row.plan.priority || ""]}`}
                      >
                        <option value="" disabled>
                          Set priority
                        </option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-0.5 md:col-span-1">
                      <a
                        className={iconBtn}
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={"Code for " + row.key}
                        title="Open on GitHub"
                      >
                        <Code2 size={15} />
                      </a>
                      <button
                        type="button"
                        className={ctl + " !h-8 !px-2.5"}
                        onClick={() => openRow(row)}
                      >
                        Details
                      </button>
                      {githubDeleteTarget(row) && (
                        <button
                          type="button"
                          className={
                            iconBtn +
                            " text-destructive hover:bg-destructive/10 hover:text-destructive"
                          }
                          aria-label={"Delete " + row.key}
                          title={"Delete " + row.key + " permanently"}
                          onClick={() => setDeleteRow(row)}
                        >
                          <Trash2 size={15} />
                        </button>
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
                          <DropdownMenuItem onSelect={() => openRow(row)}>
                            <CircleDot size={14} /> Open details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onEdit(row.plan)}>
                            <Pencil size={14} /> Edit plan & links
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={row.url} target="_blank" rel="noopener noreferrer">
                              <Github size={14} /> Open on GitHub
                            </a>
                          </DropdownMenuItem>
                          {row.appUrl && (
                            <DropdownMenuItem asChild>
                              <a href={row.appUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={14} /> Open app · {hostOf(row.appUrl)}
                              </a>
                            </DropdownMenuItem>
                          )}
                          {first && (
                            <DropdownMenuItem
                              onSelect={() => focusCloudflare("cloudflare", first.key)}
                            >
                              <Cloud size={14} /> Manage in Cloudflare console
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => copyText(repoCloneCommand(row), "Clone command")}
                          >
                            <Copy size={14} /> Copy git clone
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => copyText(row.url, "Repository URL")}>
                            <Copy size={14} /> Copy URL
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}
      <PortfolioPager
        id="GitHub repositories"
        {...current}
        onPage={setPage}
        onSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <BulkBar
        count={bulkCount}
        total={ordered.length}
        onSelectAll={() => setSelected(new Set(ordered.map((r) => r.key)))}
        onClear={() => setSelected(new Set())}
      >
        <select
          aria-label="Set priority for selected repositories"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as Priority;
            e.target.value = "";
            if (v) void setPriority(selectedRows, v);
          }}
          className={selectCls}
        >
          <option value="" disabled>
            Set priority…
          </option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          aria-label="Set status for selected repositories"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as GitHubRepo["status"];
            e.target.value = "";
            if (v) void setStatus(selectedRows, v);
          }}
          className={selectCls}
        >
          <option value="" disabled>
            Set status…
          </option>
          <option value="active">Active</option>
          <option value="stable">Stable</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={ctl}>
              <Copy size={13} /> Copy
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 [&_[role=menuitem]]:gap-2">
            <DropdownMenuItem
              onSelect={() =>
                copyText(selectedRows.map(repoCloneCommand).join("\n"), "Clone commands")
              }
            >
              git clone commands
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                copyText(selectedRows.map((r) => r.url).join("\n"), "Repository URLs")
              }
            >
              Repository URLs
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                copyText(selectedRows.map((r) => r.key).join("\n"), "Repository names")
              }
            >
              owner/name list
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                copyText(
                  markdownList(selectedRows.map((r) => ({ title: r.key, url: r.url }))),
                  "Markdown list",
                )
              }
            >
              Markdown link list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={ctl}>
              <ExternalLink size={13} /> Open
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 [&_[role=menuitem]]:gap-2">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              Up to {BULK_OPEN_LIMIT} tabs at a time
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() =>
                openAll(
                  selectedRows.map((r) => r.url),
                  "repositories",
                )
              }
            >
              Repositories
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                openAll(
                  selectedRows.map((r) => r.url + "/pulls"),
                  "pull-request pages",
                )
              }
            >
              Pull requests
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                openAll(
                  selectedRows.map((r) => r.url + "/actions"),
                  "Actions pages",
                )
              }
            >
              Actions
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                openAll(
                  selectedRows.map((r) => r.appUrl),
                  "app URLs",
                )
              }
            >
              Apps (recorded URLs)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button type="button" className={ctl} onClick={() => exportCsv(selectedRows)}>
          <Download size={13} /> CSV
        </button>
      </BulkBar>

      {/* ───── provenance ───── */}
      <details className="rounded-xl border border-border/60 bg-card/50 p-3 text-xs">
        <summary className="cursor-pointer font-semibold">
          Recent pushes & deployments · {recentActivity.length} observed
        </summary>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {recentActivity.map((a) => (
            <a
              key={a.key}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 rounded-lg border border-border/40 p-2 hover:border-primary/40"
            >
              <span className="block truncate text-xs font-medium text-primary">{a.name}</span>
              <span className="block text-[11px] text-muted-foreground">
                {a.source} · {a.action} · {relativeTime(a.at)}
              </span>
            </a>
          ))}
          {!recentActivity.length && (
            <p className="text-muted-foreground">
              No timestamped GitHub pushes or Cloudflare deployments were returned.
            </p>
          )}
        </div>
      </details>
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <AlertTriangle size={12} className="mt-px shrink-0" />
        Counts reflect the records collected right now. GitHub’s open-issues count includes pull
        requests; Cloudflare build state is deployment metadata, not an uptime check.
        Repository-to-Cloudflare links use provider-reported Git sources or unique exact URLs
        already in your app inventory — never name guessing. Priorities and next actions are your
        saved plans. Stats for all accounts: {stats.total} repositories · {stats.appLinks} app URLs
        · {stats.cloudflareSourceLinks} with Git-source proof.
      </p>

      <RepoDrawer
        row={drawerRow}
        position={{ index: drawerIndex < 0 ? 0 : drawerIndex, total: Math.max(ordered.length, 1) }}
        onClose={() => setDrawerKey(null)}
        onStep={stepDrawer}
        onSavePlan={(row, patch) => savePlan([row], patch, "plan saved")}
        onFullEdit={(plan) => {
          setDrawerKey(null);
          onEdit(plan);
        }}
        onOpenCloudflare={(key) => {
          setDrawerKey(null);
          focusCloudflare("cloudflare", key);
        }}
        cloudflareComplete={cfComplete}
        onDeleted={handleDeleted}
        onUnsettled={refreshOwned}
      />
      <DeleteResourceDialog
        target={deleteRow ? githubDeleteTarget(deleteRow) : null}
        onOpenChange={(open) => !open && setDeleteRow(null)}
        onDeleted={(_, outcome) => deleteRow && handleDeleted(deleteRow, outcome.message)}
        onUnsettled={refreshOwned}
      />
      <ShortcutHelp
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Repository shortcuts"
        shortcuts={SHORTCUTS}
      />
    </section>
  );
}
