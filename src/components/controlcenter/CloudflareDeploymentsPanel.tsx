import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronsUpDown,
  Cloud,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  Keyboard,
  LoaderCircle,
  Rocket,
  Search,
  Server,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { portfolioPage, type PortfolioPageSize } from "@/lib/portfolioPaging";
import PortfolioPager from "@/components/controlcenter/PortfolioPager";
import { cloudflareTriage } from "@/lib/portfolioTriage";
import SavedFilterViews from "@/components/controlcenter/SavedFilterViews";
import { recentOperatorActivity } from "@/lib/operatorActivity";
import type {
  CloudflareDeploymentRow,
  CloudflareInventory,
} from "@/lib/cloudflareInventory.functions";
import { runCloudflarePagesAction } from "@/lib/cloudflareActions.functions";
import { ConnectorError } from "@/components/TruthUI";
import { freshness } from "@/lib/truth";
import {
  cloudflareCoverage,
  cloudflareInventoryStats,
  matchesCloudflareFacets,
  type CloudflareFacets,
} from "@/lib/cloudflareFacets";
import type { CloudflareConnectionStatus } from "@/lib/cloudflareControlState";
import {
  commitUrl,
  compareRows,
  healthOf,
  hostOf,
  inventoryCsv,
  matchesQuick,
  quickCounts,
  relativeTime,
  searchText,
  type QuickFilter,
  type SortKey,
} from "@/lib/cloudflareWorkspace";
import {
  CF_PREFS_DEFAULT,
  cfFilterChips,
  cfGroup,
  cfRepoKey,
  clearCfFilter,
  normalizeCfPrefs,
  type CfGroupBy,
  type CfPrefs,
} from "@/lib/cloudflareConsole";
import {
  BULK_OPEN_LIMIT,
  flattenGroups,
  groupRows,
  limitOpen,
  markdownList,
  safeUrls,
} from "@/lib/consoleKit";
import { useConsoleFocus } from "@/stores/consoleFocusStore";
import {
  ActiveFilters,
  BulkBar,
  DensityToggle,
  GroupHeader,
  HealthTile,
  ShortcutHelp,
  TileRow,
  ctl,
  iconBtn,
  selectCls,
  useListKeyboard,
  type Shortcut,
} from "@/components/console/ConsoleUI";
import CloudflareDrawer, {
  HealthPill,
  type CfAction,
} from "@/components/controlcenter/CloudflareDrawer";
import CloudflareCoverage, {
  CloudflareAccountStrip,
  pagesGap,
  workerGap,
} from "@/components/controlcenter/CloudflareCoverage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { logAudit } from "@/lib/audit";

const PREFS_KEY = "mc.cloudflare.workspace.v2";
function readPrefs(): CfPrefs {
  try {
    return normalizeCfPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"));
  } catch {
    return CF_PREFS_DEFAULT;
  }
}
function writePrefs(prefs: CfPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* per-viewer convenience only */
  }
}

const QUICK_VIEWS: Array<{ id: QuickFilter; label: string }> = [
  { id: "all", label: "All resources" },
  { id: "failing", label: "Build failed" },
  { id: "building", label: "Building" },
  { id: "none", label: "No deployment" },
  { id: "recent", label: "Deployed ≤ 7 days" },
  { id: "stale", label: "Stale over 90 days" },
  { id: "custom", label: "Custom domain" },
  { id: "pagesdev", label: "pages.dev only" },
  { id: "git", label: "Git-connected" },
  { id: "direct", label: "Direct upload" },
  { id: "workers", label: "Workers" },
];
const SHORTCUTS: Shortcut[] = [
  { keys: ["/"], label: "Search projects" },
  { keys: ["j", "↓"], label: "Next project" },
  { keys: ["k", "↑"], label: "Previous project" },
  { keys: ["Enter", "o"], label: "Open details drawer" },
  { keys: ["x"], label: "Select / unselect project" },
  { keys: ["r"], label: "Refresh from Cloudflare" },
  { keys: ["Esc"], label: "Close drawer, then clear selection" },
  { keys: ["?"], label: "Show this help" },
];

const copy = (text: string, what: string) =>
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

export default function CloudflareDeploymentsPanel({
  inventory,
  status,
  loading,
  failure,
  onRefresh,
}: {
  inventory: CloudflareInventory | null;
  status: CloudflareConnectionStatus | null;
  loading: boolean;
  failure: string | null;
  onRefresh: () => void;
}) {
  const [prefs, setPrefs] = useState<CfPrefs>(CF_PREFS_DEFAULT);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PortfolioPageSize>(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirmDialog();
  const openRepoInGitHub = useConsoleFocus((s) => s.open);
  const focusRequest = useConsoleFocus((s) => s.request);

  useEffect(() => {
    setPrefs(readPrefs());
  }, []);
  const update = (patch: Partial<CfPrefs>) => {
    setPage(1);
    setPrefs((old) => {
      const next = { ...old, ...patch };
      writePrefs(next);
      return next;
    });
  };
  const setFacet = (patch: Partial<CloudflareFacets>) =>
    update({ facets: { ...prefs.facets, ...patch } });

  /* ───────────── data model ───────────── */
  const details = useMemo(
    () => new Map((inventory?.accountDetails || []).map((a) => [a.accountId, a])),
    [inventory],
  );
  const accountName = useCallback(
    (id: string) => details.get(id)?.label || "Account …" + id.slice(-6),
    [details],
  );
  const deployEnabled = (row: CloudflareDeploymentRow) =>
    row.kind === "pages" && Boolean(details.get(row.accountId)?.deployEnabled);
  const accountId =
    prefs.account !== "all" && inventory?.accounts.includes(prefs.account) ? prefs.account : "all";
  const effectivePrefs = accountId === prefs.account ? prefs : { ...prefs, account: accountId };
  const scoped = useMemo(
    () => (inventory?.rows || []).filter((r) => accountId === "all" || r.accountId === accountId),
    [inventory, accountId],
  );
  const counts = useMemo(() => quickCounts(scoped), [scoped]);
  const triage = useMemo(
    () => cloudflareTriage(scoped, inventory?.truthState || "not_connected"),
    [scoped, inventory?.truthState],
  );
  const stats = useMemo(() => cloudflareInventoryStats(inventory?.rows || []), [inventory]);
  const coverage = useMemo(() => (inventory ? cloudflareCoverage(inventory) : null), [inventory]);
  const recentDeployments = useMemo(
    () => recentOperatorActivity([], inventory?.rows || [], 6),
    [inventory],
  );
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scoped
      .filter(
        (r) =>
          matchesQuick(r, prefs.quick) &&
          matchesCloudflareFacets(r, prefs.facets) &&
          (!needle || searchText(r, accountName(r.accountId)).includes(needle)),
      )
      .sort((a, b) => compareRows(a, b, prefs.sort, accountName));
  }, [scoped, prefs.quick, prefs.sort, prefs.facets, query, accountName]);
  const groups = useMemo(
    () =>
      prefs.groupBy === "none"
        ? null
        : groupRows(rows, (r) => cfGroup(r, prefs.groupBy, accountName)),
    [rows, prefs.groupBy, accountName],
  );
  const ordered = useMemo(() => (groups ? flattenGroups(groups) : rows), [groups, rows]);
  const groupCounts = useMemo(
    () => new Map((groups || []).map((g) => [g.key, g.rows.length])),
    [groups],
  );
  const current = portfolioPage(ordered, page, pageSize);
  const chips = cfFilterChips(effectivePrefs, query, accountName);
  const anyWorkerGap = Boolean(inventory?.accountDetails.some(workerGap));
  const anyPagesGap = Boolean(inventory?.accountDetails.some(pagesGap));
  const totalPages = inventory?.rows.filter((r) => r.kind === "pages").length || 0;
  const totalWorkers = inventory?.rows.filter((r) => r.kind === "worker").length || 0;

  const hasGap = anyWorkerGap || anyPagesGap;
  useEffect(() => {
    if (hasGap) setCoverageOpen(true);
  }, [hasGap]);

  const resetAll = () => {
    setQuery("");
    update({ ...CF_PREFS_DEFAULT, density: prefs.density, groupBy: prefs.groupBy });
  };
  const clearChip = (id: string) => {
    const next = clearCfFilter(effectivePrefs, id);
    if (next.clearQuery) setQuery("");
    else update(next.prefs);
  };

  /* ───────────── selection ───────────── */
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
  const exportCsv = (data: CloudflareDeploymentRow[]) => {
    if (!data.length) return;
    const url = URL.createObjectURL(
      new Blob([inventoryCsv(data, accountName)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cloudflare-inventory-" + new Date().toISOString().slice(0, 10) + ".csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ───────────── actions (always confirmed, always audited) ───────────── */
  const runAction = (row: CloudflareDeploymentRow, action: CfAction, deploymentId?: string) => {
    const short = deploymentId?.slice(0, 8);
    const text = {
      deploy: {
        title: "Deploy " + row.name + " to production?",
        description:
          "Cloudflare builds the HEAD of " +
          (row.branch || "the production branch") +
          (row.repoUrl ? " from " + row.repoUrl.replace("https://github.com/", "") : "") +
          " and publishes it. The current deployment keeps serving until the new build succeeds.",
        label: "Deploy latest",
      },
      retry: {
        title: "Retry deployment " + short + "?",
        description: "Cloudflare re-runs this deployment for " + row.name + ".",
        label: "Retry",
      },
      rollback: {
        title: "Roll " + row.name + " back to " + short + "?",
        description:
          "Production immediately serves this earlier successful deployment. You can roll forward again from history.",
        label: "Roll back",
      },
    }[action];
    confirm.confirm({
      title: text.title,
      description: text.description,
      confirmLabel: text.label,
      onConfirm: () => {
        void (async () => {
          setBusy(row.key + ":" + action + ":" + (deploymentId || ""));
          try {
            const result = await runCloudflarePagesAction({
              data: {
                accountId: row.accountId,
                name: row.name,
                action,
                ...(deploymentId ? { deploymentId } : {}),
              },
            });
            void logAudit({
              action: "sync",
              collection: "cloudflare-pages",
              recordId: row.accountId.slice(-6) + ":" + row.name,
              label: "Cloudflare " + action + " · " + row.name,
              detail: result.ok
                ? "Accepted" +
                  (result.deploymentId ? " · deployment " + result.deploymentId : "") +
                  (deploymentId ? " · target " + deploymentId : "")
                : "Rejected · " + result.message,
            });
            if (!result.ok) {
              toast.error(result.message);
              return;
            }
            toast.success(
              text.label + " accepted by Cloudflare" + (result.status ? " · " + result.status : ""),
            );
            setReloadToken((n) => n + 1);
            onRefresh();
          } catch {
            toast.error("Cloudflare action failed. Sign in again via Cloudflare Access and retry.");
          } finally {
            setBusy(null);
          }
        })();
      },
    });
  };

  /* ───────────── drawer + keyboard ───────────── */
  const drawerRow = useMemo(
    () => (drawerKey ? (inventory?.rows.find((r) => r.key === drawerKey) ?? null) : null),
    [inventory, drawerKey],
  );
  const drawerIndex = drawerKey ? ordered.findIndex((r) => r.key === drawerKey) : -1;
  const pageOf = (index: number) => Math.floor(index / pageSize) + 1;
  const kb = useListKeyboard<CloudflareDeploymentRow>({
    items: ordered,
    enabled: !helpOpen,
    keyOf: (r) => r.key,
    onOpen: (r) => setDrawerKey(r.key),
    onToggleSelect: (r) => toggle(r.key),
    onSearch: () => searchRef.current?.focus(),
    onHelp: () => setHelpOpen(true),
    onRefresh,
    onEscape: () => {
      if (selected.size && !drawerKey) {
        setSelected(new Set());
        return true;
      }
    },
    onMove: (index) => {
      setPage(pageOf(index));
      setDrawerKey((open) => (open ? (ordered[index]?.key ?? open) : open));
    },
  });
  const openRow = (row: CloudflareDeploymentRow) => {
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
  // "Manage in Cloudflare console" hand-off from the GitHub console.
  useEffect(() => {
    if (focusRequest?.console !== "cloudflare" || !inventory) return;
    const key = useConsoleFocus.getState().consume("cloudflare");
    if (!key) return;
    if (inventory.rows.some((r) => r.key === key)) setDrawerKey(key);
    else
      toast.info(
        "That project is not in the current Cloudflare inventory — refresh and try again.",
      );
  }, [focusRequest, inventory]);

  /* ───────────── render ───────────── */
  const compact = prefs.density === "compact";
  const tile = (id: QuickFilter) => ({
    active: effectivePrefs.quick === id && prefs.facets.endpoint === "all",
    onClick: () =>
      update({
        quick: effectivePrefs.quick === id ? "all" : id,
        facets: { ...prefs.facets, endpoint: "all" },
      }),
  });
  const usable = Boolean(inventory) && inventory!.truthState !== "not_connected";

  return (
    <section aria-label="Cloudflare Pages and Workers console" className="space-y-3.5">
      {loading && !inventory && (
        <p role="status" className="card-glass p-4 text-sm text-muted-foreground">
          Loading every Cloudflare project across your accounts…
        </p>
      )}
      {failure && <ConnectorError message={failure} onRetry={() => onRefresh()} />}
      {!loading &&
        !failure &&
        (status === "not_connected" ||
          status === "access_not_configured" ||
          status === "login_required") && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Projects will list here once the Cloudflare connection above is set up. Nothing is shown
            until real data is available — never sample projects.
          </p>
        )}

      {usable && inventory && (
        <>
          <p className="text-xs text-muted-foreground" role="status">
            <strong className="text-foreground tabular-nums">{totalPages}</strong> Pages ·{" "}
            <strong className="text-foreground tabular-nums">
              {anyWorkerGap ? (totalWorkers ? totalWorkers + "+" : "—") : totalWorkers}
            </strong>{" "}
            Workers · {inventory.zones.length} zones
            {inventory.fetchedAt
              ? " · fetched " + (freshness(inventory.fetchedAt) || "")
              : ""} ·{" "}
            {coverage?.complete ? "complete authorized coverage" : "partial or restricted coverage"}{" "}
            · {stats.directUploads} direct uploads. Build status is Cloudflare metadata, not an
            uptime test.
          </p>

          {(anyWorkerGap || anyPagesGap) && (
            <p className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              <AlertTriangle size={14} className="shrink-0 text-amber-500" />
              {anyPagesGap
                ? "Pages listing is incomplete on at least one account."
                : "Workers are hidden on at least one account, so Worker counts are minimums."}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setCoverageOpen(true)}
              >
                Show fix steps
              </button>
            </p>
          )}

          <CloudflareAccountStrip
            inventory={inventory}
            selected={accountId}
            onSelect={(id) => update({ account: id })}
          />

          <TileRow label="Cloudflare health. Select a tile to filter the list.">
            <HealthTile
              label="Build failed"
              value={counts.failing}
              hint="Serving deployment may still be healthy"
              tone="danger"
              {...tile("failing")}
            />
            <HealthTile
              label="Building / queued"
              value={counts.building}
              hint="Inspect delayed production builds"
              tone="info"
              {...tile("building")}
            />
            <HealthTile
              label="No deployment"
              value={counts.none}
              hint="Project exists, nothing deployed"
              tone="warn"
              {...tile("none")}
            />
            <HealthTile
              label="No public URL"
              value={triage.unknownURL.length}
              hint="Check routes and disabled endpoints"
              tone="warn"
              active={prefs.facets.endpoint === "missing" && effectivePrefs.quick === "all"}
              onClick={() =>
                update({
                  quick: "all",
                  facets: {
                    ...prefs.facets,
                    endpoint: prefs.facets.endpoint === "missing" ? "all" : "missing",
                  },
                })
              }
            />
            <HealthTile
              label="Deployed · 7 days"
              value={counts.recent}
              hint="Recently shipped"
              tone="good"
              {...tile("recent")}
            />
            <HealthTile
              label="Stale · 90d+"
              value={counts.stale}
              hint="Candidates to retire"
              {...tile("stale")}
            />
          </TileRow>

          <div
            className="flex flex-wrap items-center gap-2"
            role="toolbar"
            aria-label="Cloudflare tools"
          >
            <label className="relative min-w-[13rem] flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"
              />
              <span className="sr-only">Search Cloudflare projects</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search projects…"
                className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-2 hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
                /
              </kbd>
            </label>

            {inventory.accountDetails.length > 1 && (
              <select
                aria-label="Filter Cloudflare account"
                value={accountId}
                onChange={(e) => update({ account: e.target.value })}
                className={selectCls}
              >
                <option value="all">All accounts ({inventory.rows.length})</option>
                {inventory.accountDetails.map((a) => (
                  <option value={a.accountId} key={a.accountId}>
                    {a.label} ({inventory.rows.filter((r) => r.accountId === a.accountId).length})
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-1.5">
              <ArrowDownUp size={14} className="text-muted-foreground" />
              <span className="sr-only">Sort Cloudflare projects</span>
              <select
                aria-label="Sort Cloudflare projects"
                value={prefs.sort}
                onChange={(e) => update({ sort: e.target.value as SortKey })}
                className={selectCls}
              >
                <option value="name">Name A–Z</option>
                <option value="deployed">Recently deployed</option>
                <option value="health">Problems first</option>
                <option value="domain">Live domain</option>
                <option value="account">Account</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <ChevronsUpDown size={14} className="text-muted-foreground" />
              <span className="sr-only">Group Cloudflare projects</span>
              <select
                aria-label="Group Cloudflare projects"
                value={prefs.groupBy}
                onChange={(e) => update({ groupBy: e.target.value as CfGroupBy })}
                className={selectCls}
              >
                <option value="none">No grouping</option>
                <option value="account">Group: account</option>
                <option value="kind">Group: Pages / Workers</option>
                <option value="health">Group: status</option>
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
                      (c) => c.id === "all" || counts[c.id] > 0 || effectivePrefs.quick === c.id,
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
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Resource
                    <select
                      aria-label="Filter Cloudflare resource kind"
                      className={selectCls + " mt-1 w-full"}
                      value={prefs.facets.kind}
                      onChange={(e) =>
                        setFacet({ kind: e.target.value as CloudflareFacets["kind"] })
                      }
                    >
                      <option value="all">Pages + Workers</option>
                      <option value="pages">Pages only</option>
                      <option value="worker">Workers only</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Deployment source
                    <select
                      aria-label="Filter source integration"
                      className={selectCls + " mt-1 w-full"}
                      value={prefs.facets.source}
                      onChange={(e) =>
                        setFacet({ source: e.target.value as CloudflareFacets["source"] })
                      }
                    >
                      <option value="all">Any source</option>
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                      <option value="direct_upload">Direct upload</option>
                      <option value="unverified">Unverified Git source</option>
                    </select>
                  </label>
                  <label className="col-span-2 text-[11px] font-semibold text-muted-foreground">
                    Endpoint
                    <select
                      aria-label="Filter Cloudflare endpoint"
                      className={selectCls + " mt-1 w-full"}
                      value={prefs.facets.endpoint}
                      onChange={(e) =>
                        setFacet({ endpoint: e.target.value as CloudflareFacets["endpoint"] })
                      }
                    >
                      <option value="all">Any endpoint</option>
                      <option value="public">Public URL reported</option>
                      <option value="missing">No verified public URL</option>
                      <option value="custom">Custom domain</option>
                      <option value="pagesdev">pages.dev endpoint</option>
                      <option value="workersdev">workers.dev endpoint</option>
                      <option value="routes">Worker route pattern</option>
                    </select>
                  </label>
                </div>
                <div className="border-t border-border/70 pt-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Saved views
                  </p>
                  <SavedFilterViews
                    storageKey="mc.cloudflare.saved-views.v1"
                    state={{ prefs, query }}
                    onApply={(view: { prefs: unknown; query?: string }) => {
                      update(normalizeCfPrefs(view.prefs));
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
              {scoped.length} resources
              {accountId !== "all" ? " in " + accountName(accountId) : ""}
              {current.total ? " · " + current.from + "–" + current.to + " on this page" : ""}
            </span>
            <ActiveFilters chips={chips} onClear={clearChip} onReset={resetAll} />
          </div>

          {ordered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-semibold">No resources match.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clear filters, or check coverage warnings before assuming an account is empty.
              </p>
              {chips.length > 0 && (
                <button type="button" className={ctl + " mt-3"} onClick={resetAll}>
                  <X size={13} /> Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
              <div className="hidden grid-cols-[1.25rem_minmax(0,2fr)_7.25rem_5rem_minmax(0,1.6fr)_minmax(0,1.5fr)_6.5rem] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
                <input
                  type="checkbox"
                  aria-label="Select all projects on this page"
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
                <span>Project</span>
                <span>Status</span>
                <span>Deployed</span>
                <span>Live URL</span>
                <span>Source</span>
                <span className="text-right">Actions</span>
              </div>
              <ul className="divide-y divide-border/60">
                {current.items.map((row, i) => {
                  const group = cfGroup(row, prefs.groupBy, accountName);
                  const prev =
                    i > 0 ? cfGroup(current.items[i - 1], prefs.groupBy, accountName).key : null;
                  const health = healthOf(row);
                  const sha = commitUrl(row);
                  const isCursor = kb.cursorKey === row.key;
                  const extraDomains = row.domains.length > 1 ? row.domains.length - 1 : 0;
                  const isBusy = busy?.startsWith(row.key + ":");
                  const canDeploy =
                    deployEnabled(row) &&
                    (row.sourceType === "github" || row.sourceType === "gitlab");
                  const repoKey = cfRepoKey(row);
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
                        className={`grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 px-4 text-xs [contain-intrinsic-size:auto_64px] [content-visibility:auto] hover:bg-muted/35 md:grid-cols-[1.25rem_minmax(0,2fr)_7.25rem_5rem_minmax(0,1.6fr)_minmax(0,1.5fr)_6.5rem] md:items-center ${
                          compact ? "py-1.5" : "py-3"
                        } ${selected.has(row.key) ? "bg-primary/5" : ""} ${isCursor ? "relative z-[1] ring-2 ring-inset ring-primary/55" : ""}`}
                      >
                        <input
                          type="checkbox"
                          aria-label={"Select " + row.name}
                          checked={selected.has(row.key)}
                          onChange={() => toggle(row.key)}
                          className="mt-1 h-4 w-4 accent-primary md:mt-0"
                        />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {row.kind === "pages" ? (
                              <Cloud size={13} className="shrink-0 text-orange-500" />
                            ) : (
                              <Server size={13} className="shrink-0 text-sky-500" />
                            )}
                            <button
                              type="button"
                              onClick={() => openRow(row)}
                              className="min-w-0 truncate text-left text-sm font-semibold hover:text-primary"
                              title={"Open details · " + row.name}
                            >
                              {row.name}
                            </button>
                          </div>
                          {!compact && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {accountName(row.accountId)} ·{" "}
                              {row.kind === "pages"
                                ? row.sourceType === "direct_upload"
                                  ? "Pages · direct upload"
                                  : "Pages"
                                : "Worker"}
                              {row.kind === "worker" && row.routes.length
                                ? " · " + row.routes.length + " route(s)"
                                : ""}
                            </p>
                          )}
                        </div>
                        <div
                          className="justify-self-end text-muted-foreground md:hidden"
                          title={
                            row.deployedAt
                              ? new Date(row.deployedAt).toLocaleString()
                              : "No deployment reported"
                          }
                        >
                          {relativeTime(row.deployedAt)}
                        </div>
                        <div className="col-start-2 md:col-start-auto">
                          <HealthPill row={row} />
                        </div>
                        <div
                          className="hidden text-muted-foreground md:block"
                          title={
                            row.deployedAt
                              ? new Date(row.deployedAt).toLocaleString()
                              : "No deployment reported"
                          }
                        >
                          {relativeTime(row.deployedAt)}
                          {health === "failing" && row.latestProduction?.createdAt && (
                            <span className="block text-[10px] text-red-600 dark:text-red-400">
                              failed {relativeTime(row.latestProduction.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 col-start-2 min-w-0 md:col-span-1 md:col-start-auto">
                          {row.publicUrl ? (
                            <a
                              href={row.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Globe size={12} className="shrink-0" />
                              <span className="truncate">{hostOf(row.publicUrl)}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground/70">
                              {row.kind === "worker" ? "URL not verified" : "Not published"}
                            </span>
                          )}
                          {extraDomains > 0 && (
                            <span
                              className="ml-1 text-[10px] text-muted-foreground"
                              title={row.domains.slice(1).join(", ")}
                            >
                              +{extraDomains}
                            </span>
                          )}
                          {!compact && row.domains.length > 0 && row.pagesDevUrl && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {hostOf(row.pagesDevUrl)}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 col-start-2 min-w-0 text-muted-foreground md:col-span-1 md:col-start-auto">
                          {row.repoUrl ? (
                            <>
                              <a
                                href={row.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-full items-center gap-1 hover:text-primary"
                              >
                                <GitBranch size={12} className="shrink-0" />
                                <span className="truncate">
                                  {row.repoUrl.replace("https://github.com/", "")}
                                </span>
                              </a>
                              {!compact && (
                                <span className="block truncate text-[10px]">
                                  {row.branch || "branch ?"}
                                  {sha ? (
                                    <>
                                      {" @ "}
                                      <a
                                        href={sha}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono hover:text-primary"
                                      >
                                        {row.commit?.slice(0, 7)}
                                      </a>
                                    </>
                                  ) : null}
                                </span>
                              )}
                            </>
                          ) : row.sourceType === "gitlab" ? (
                            "GitLab source"
                          ) : row.kind === "pages" ? (
                            row.sourceType === "direct_upload" ? (
                              "Direct upload (wrangler)"
                            ) : (
                              "Source not reported"
                            )
                          ) : (
                            <span title="Worker source is not reported by the available Cloudflare API scopes">
                              {row.routes.length
                                ? "Route: " + row.routes[0]
                                : "Git source not verified"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-0.5 md:col-span-1">
                          <button
                            type="button"
                            className={ctl + " !h-8 !px-2.5"}
                            onClick={() => openRow(row)}
                          >
                            Details
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={iconBtn}
                                aria-label={"More actions for " + row.name}
                                disabled={isBusy}
                              >
                                {isBusy ? (
                                  <LoaderCircle size={15} className="animate-spin" />
                                ) : (
                                  <Ellipsis size={15} />
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-60 [&_[role=menuitem]]:gap-2"
                            >
                              <DropdownMenuLabel className="truncate text-xs">
                                {row.name}
                              </DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => openRow(row)}>
                                <Cloud size={14} /> Open details
                              </DropdownMenuItem>
                              {canDeploy && (
                                <DropdownMenuItem onSelect={() => runAction(row, "deploy")}>
                                  <Rocket size={14} /> Deploy latest to production
                                </DropdownMenuItem>
                              )}
                              {row.kind === "pages" && !deployEnabled(row) && (
                                <DropdownMenuItem disabled>
                                  <Rocket size={14} /> Deploy (add deploy token)
                                </DropdownMenuItem>
                              )}
                              {row.publicUrl && (
                                <DropdownMenuItem asChild>
                                  <a href={row.publicUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink size={14} /> Open live site
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <a href={row.projectUrl} target="_blank" rel="noopener noreferrer">
                                  <Cloud size={14} /> Open in Cloudflare
                                </a>
                              </DropdownMenuItem>
                              {repoKey && (
                                <DropdownMenuItem
                                  onSelect={() => openRepoInGitHub("github", repoKey)}
                                >
                                  <GitBranch size={14} /> Manage repo in GitHub console
                                </DropdownMenuItem>
                              )}
                              {row.repoUrl && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={
                                      row.repoUrl +
                                      "/commits/" +
                                      encodeURIComponent(row.branch || "")
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <GitCommitHorizontal size={14} /> Recent commits
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {row.publicUrl && (
                                <DropdownMenuItem onSelect={() => copy(row.publicUrl!, "Live URL")}>
                                  <Copy size={14} /> Copy live URL
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => copy(row.name, "Project name")}>
                                <Copy size={14} /> Copy project name
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
            id="Cloudflare resources"
            {...current}
            onPage={setPage}
            onSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />

          <BulkBar
            count={selectedRows.length}
            total={ordered.length}
            onSelectAll={() => setSelected(new Set(ordered.map((r) => r.key)))}
            onClear={() => setSelected(new Set())}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={ctl}>
                  <Copy size={13} /> Copy
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 [&_[role=menuitem]]:gap-2">
                <DropdownMenuItem
                  onSelect={() =>
                    copy(safeUrls(selectedRows.map((r) => r.publicUrl)).join("\n"), "Live URLs")
                  }
                >
                  Live URLs
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => copy(selectedRows.map((r) => r.name).join("\n"), "Project names")}
                >
                  Project names
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    copy(
                      markdownList(
                        selectedRows.map((r) => ({
                          title: r.name,
                          url: r.publicUrl || r.projectUrl,
                        })),
                      ),
                      "Markdown list",
                    )
                  }
                >
                  Markdown link list
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    copy(selectedRows.map((r) => r.projectUrl).join("\n"), "Dashboard URLs")
                  }
                >
                  Dashboard URLs
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
                      selectedRows.map((r) => r.publicUrl),
                      "live sites",
                    )
                  }
                >
                  Live sites
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    openAll(
                      selectedRows.map((r) => r.projectUrl),
                      "Cloudflare dashboards",
                    )
                  }
                >
                  Cloudflare dashboards
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    openAll(
                      selectedRows.map((r) => (r.repoUrl ? r.repoUrl + "/actions" : null)),
                      "GitHub Actions pages",
                    )
                  }
                >
                  GitHub Actions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" className={ctl} onClick={() => exportCsv(selectedRows)}>
              <Download size={13} /> CSV
            </button>
          </BulkBar>

          <CloudflareCoverage
            inventory={inventory}
            selectedAccount={accountId}
            onSelectAccount={(id) => update({ account: id })}
            open={coverageOpen}
            onOpenChange={setCoverageOpen}
          />

          <details className="rounded-xl border border-border/60 bg-card/50 p-3 text-xs">
            <summary className="cursor-pointer font-semibold">
              Recent Cloudflare deployments · {recentDeployments.length} observed
            </summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {recentDeployments.map((a) => (
                <a
                  key={a.key}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 rounded-lg border border-border/40 p-2 hover:border-primary/40"
                >
                  <span className="block truncate text-xs font-medium text-primary">{a.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {a.action} · {relativeTime(a.at)}
                  </span>
                </a>
              ))}
              {!recentDeployments.length && (
                <p className="text-muted-foreground">No timestamped deployment records returned.</p>
              )}
            </div>
          </details>
        </>
      )}

      <CloudflareDrawer
        row={drawerRow}
        accountName={accountName}
        position={{ index: drawerIndex < 0 ? 0 : drawerIndex, total: Math.max(ordered.length, 1) }}
        onClose={() => setDrawerKey(null)}
        onStep={stepDrawer}
        deployEnabled={drawerRow ? deployEnabled(drawerRow) : false}
        busy={busy}
        onAction={runAction}
        reloadToken={reloadToken}
        onOpenRepo={(repoKey) => {
          setDrawerKey(null);
          openRepoInGitHub("github", repoKey);
        }}
      />
      <ShortcutHelp
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Cloudflare shortcuts"
        shortcuts={SHORTCUTS}
      />
      <ConfirmDialog {...confirm.dialogProps} variant="default" />
    </section>
  );
}
