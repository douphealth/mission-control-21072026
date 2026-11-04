import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Cloud,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  History,
  LoaderCircle,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCloudflareDeploymentHistory,
  type CloudflareDeploymentRow,
  type CloudflareInventory,
  type DeploymentHistoryItem,
} from "@/lib/cloudflareInventory.functions";
import { runCloudflarePagesAction } from "@/lib/cloudflareActions.functions";
import type { CloudflareAccountSummary, DeployHealth } from "@/lib/cloudflareInventory.server";
import { ConnectorEmpty, ConnectorError, TruthBadge } from "@/components/TruthUI";
import { freshness } from "@/lib/truth";
import {
  cloudflareTruthState,
  type CloudflareConnectionStatus,
} from "@/lib/cloudflareControlState";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { logAudit } from "@/lib/audit";
import { PUBLIC_PORTFOLIO_REPOS } from "@/lib/portfolioAtlas";

/** Unique exact-name match against the public repo snapshot — a hint, never proof. */
const reposByName = new Map<string, string[]>();
for (const repo of PUBLIC_PORTFOLIO_REPOS) {
  const key = repo.name.toLowerCase();
  reposByName.set(key, [...(reposByName.get(key) || []), repo.url]);
}
const possibleRepo = (row: CloudflareDeploymentRow) => {
  const matches = row.repoUrl ? [] : reposByName.get(row.name.toLowerCase()) || [];
  return matches.length === 1 ? matches[0] : null;
};

const PREFS_KEY = "mc.cloudflare.workspace.v2";
const TOKEN_SOURCE_LABEL: Record<
  NonNullable<CloudflareAccountSummary["workersTokenSource"]>,
  string
> = {
  workers: 'this account\'s "workers" token',
  pages: 'this account\'s "pages" token',
  default: 'this account\'s "default" token',
  account: "this account's token in CLOUDFLARE_ACCOUNT_TOKENS_JSON",
  global: "the shared CLOUDFLARE_API_TOKEN",
  none: "not reported",
};
/** Cloudflare's documented per-account Pages soft limit (raised only on request). */
const PAGES_PROJECT_SOFT_LIMIT = 100;
type Prefs = { quick: QuickFilter; account: string; sort: SortKey };
const DEFAULT_PREFS: Prefs = { quick: "all", account: "all", sort: "name" };
function readPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...raw };
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

const CHIPS: Array<{ id: QuickFilter; label: string; tone?: "danger" | "warn" }> = [
  { id: "all", label: "All" },
  { id: "failing", label: "Build failed", tone: "danger" },
  { id: "building", label: "Building" },
  { id: "none", label: "No deployment", tone: "warn" },
  { id: "recent", label: "Deployed ≤7d" },
  { id: "stale", label: "Stale >90d", tone: "warn" },
  { id: "custom", label: "Custom domain" },
  { id: "pagesdev", label: "pages.dev only" },
  { id: "git", label: "Git-connected" },
  { id: "direct", label: "Direct upload" },
  { id: "workers", label: "Workers" },
];

const HEALTH_UI: Record<DeployHealth, { label: string; cls: string; icon: typeof CircleCheck }> = {
  live: {
    label: "Live",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CircleCheck,
  },
  failing: {
    label: "Build failed",
    cls: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    icon: CircleX,
  },
  building: {
    label: "Building",
    cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: LoaderCircle,
  },
  none: {
    label: "No deploy",
    cls: "border-border bg-muted/40 text-muted-foreground",
    icon: CircleDashed,
  },
  unknown: {
    label: "Unverified",
    cls: "border-border bg-muted/40 text-muted-foreground",
    icon: CircleDot,
  },
};

function HealthPill({ row }: { row: CloudflareDeploymentRow }) {
  const health = healthOf(row);
  const ui = HEALTH_UI[health];
  const label = row.kind === "worker" && health === "live" ? "Deployed" : ui.label;
  const title =
    health === "failing" && row.latestProduction
      ? "Latest production build " +
        row.latestProduction.status +
        "; an older deployment may still serve traffic"
      : "Cloudflare status: " + row.status + " (API metadata, not an uptime check)";
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ui.cls}`}
    >
      <ui.icon size={12} className={health === "building" ? "animate-spin" : ""} /> {label}
    </span>
  );
}

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40";
const copy = (text: string, what: string) =>
  void navigator.clipboard.writeText(text).then(
    () => toast.success(what + " copied"),
    () => toast.error("Clipboard access unavailable"),
  );

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
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CloudflareDeploymentRow | null>(null);
  const [history, setHistory] = useState<DeploymentHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const requestNumber = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirmDialog();

  useEffect(() => {
    setPrefs(readPrefs());
  }, []);
  const update = (patch: Partial<Prefs>) =>
    setPrefs((old) => {
      const next = { ...old, ...patch };
      writePrefs(next);
      return next;
    });
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
  useEffect(() => {
    // Invalidate history requests whenever the backing inventory changes.
    requestNumber.current++;
    setSelected((old) => (old && inventory?.rows.find((r) => r.key === old.key)) || null);
  }, [inventory]);

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
  const scoped = useMemo(
    () => (inventory?.rows || []).filter((r) => accountId === "all" || r.accountId === accountId),
    [inventory, accountId],
  );
  const counts = useMemo(() => quickCounts(scoped), [scoped]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scoped
      .filter(
        (r) =>
          matchesQuick(r, prefs.quick) &&
          (!needle || searchText(r, accountName(r.accountId)).includes(needle)),
      )
      .sort((a, b) => compareRows(a, b, prefs.sort, accountName));
  }, [scoped, prefs.quick, prefs.sort, query, accountName]);
  const totalPages = inventory?.rows.filter((r) => r.kind === "pages").length || 0;
  const totalWorkers = inventory?.rows.filter((r) => r.kind === "worker").length || 0;
  const workerGap = (a: CloudflareAccountSummary) => a.errors.some((e) => /worker/i.test(e));
  const pagesGap = (a: CloudflareAccountSummary) => a.errors.some((e) => /pages/i.test(e));
  const anyWorkerGap = Boolean(inventory?.accountDetails.some(workerGap));
  const anyPagesGap = Boolean(inventory?.accountDetails.some(pagesGap));

  const exportCsv = () => {
    if (!rows.length) return;
    const url = URL.createObjectURL(
      new Blob([inventoryCsv(rows, accountName)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cloudflare-inventory-" + new Date().toISOString().slice(0, 10) + ".csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copyUrls = () => {
    const urls = rows.map((r) => r.publicUrl).filter((u): u is string => Boolean(u));
    if (urls.length) copy(urls.join("\n"), urls.length + " live URLs");
  };

  const requestHistory = async (row: CloudflareDeploymentRow, page = 1) => {
    const requestId = ++requestNumber.current;
    setSelected(row);
    setHistoryLoading(true);
    setHistoryError(null);
    if (page === 1) {
      setHistory([]);
      setHistoryPage(0);
    }
    try {
      const result = await getCloudflareDeploymentHistory({
        data: { accountId: row.accountId, kind: row.kind, name: row.name, page },
      });
      if (requestId !== requestNumber.current) return;
      setHistory((old) => (page === 1 ? result.rows : [...old, ...result.rows]));
      setHistoryPage(page);
    } catch {
      if (requestId === requestNumber.current)
        setHistoryError(
          "Could not fetch authorized deployment history. Confirm token scope and try again.",
        );
    } finally {
      if (requestId === requestNumber.current) setHistoryLoading(false);
    }
  };

  const runAction = (
    row: CloudflareDeploymentRow,
    action: "deploy" | "retry" | "rollback",
    deploymentId?: string,
  ) => {
    const short = deploymentId?.slice(0, 8);
    const copyText = {
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
      title: copyText.title,
      description: copyText.description,
      confirmLabel: copyText.label,
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
              copyText.label +
                " accepted by Cloudflare" +
                (result.status ? " · " + result.status : ""),
            );
            if (selected?.key === row.key) void requestHistory(row);
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
  const resetFilters = () => {
    setQuery("");
    update(DEFAULT_PREFS);
  };

  return (
    <section aria-label="Cloudflare Pages and Workers command center" className="space-y-4">
      <div className="card-glass flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Cloud size={19} /> Pages & Workers command center
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Every Pages project and Worker across your Cloudflare accounts, listed with exhaustive
            API pagination. Deployment state is Cloudflare metadata, not an uptime check.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TruthBadge
              meta={{
                truthState: cloudflareTruthState(status ?? inventory?.truthState ?? null),
                source: "Cloudflare API",
                fetchedAt: inventory?.fetchedAt,
              }}
            />
            {inventory && (
              <span className="text-xs text-muted-foreground">
                {totalPages} Pages ·{" "}
                {anyWorkerGap ? (totalWorkers ? totalWorkers + "+" : "—") : totalWorkers} Workers ·{" "}
                {inventory.zones.length} zones
                {inventory.fetchedAt ? " · fetched " + (freshness(inventory.fetchedAt) || "") : ""}
              </span>
            )}
          </div>
        </div>
        <button
          className="btn-secondary text-xs"
          type="button"
          disabled={loading}
          onClick={() => onRefresh()}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && !inventory && (
        <p role="status" className="card-glass p-4 text-sm text-muted-foreground">
          Loading every Cloudflare project across your accounts…
        </p>
      )}
      {failure && <ConnectorError message={failure} onRetry={() => onRefresh()} />}
      {!loading &&
        (status === "not_connected" ||
          status === "access_not_configured" ||
          status === "login_required") && (
          <ConnectorEmpty
            title={
              status === "login_required"
                ? "Cloudflare Access sign-in required"
                : "Cloudflare server setup incomplete"
            }
            description="Protect the Pages hostname with Cloudflare Access and configure the Access audience, account IDs, and read-only API tokens in the deployed server runtime. This app does not accept browser-side tokens."
            docsUrl="https://developers.cloudflare.com/api/"
            onRetry={() => onRefresh()}
          />
        )}

      {inventory && inventory.truthState !== "not_connected" && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {inventory.accountDetails.map((a) => {
              const underReported =
                typeof a.pagesReportedTotal === "number" && a.pagesReportedTotal < a.pagesCount;
              return (
                <div
                  key={a.accountId}
                  className="rounded-2xl border border-border bg-card/70 p-4 text-xs shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        update({ account: accountId === a.accountId ? "all" : a.accountId })
                      }
                      className={`break-words text-left text-sm font-semibold hover:text-primary ${accountId === a.accountId ? "text-primary" : ""}`}
                      title="Filter the table to this account"
                    >
                      {a.label}
                    </button>
                    <TruthBadge
                      state={
                        a.truthState === "partial"
                          ? "partial"
                          : a.truthState === "live"
                            ? "live"
                            : a.truthState === "not_connected"
                              ? "not_connected"
                              : "error"
                      }
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                    <span>
                      <strong className="block text-lg tabular-nums">
                        {pagesGap(a) && !a.pagesCount ? "—" : a.pagesCount}
                      </strong>
                      Pages
                    </span>
                    <span>
                      <strong className="block text-lg tabular-nums">
                        {workerGap(a)
                          ? a.workersCount
                            ? a.workersCount + "+"
                            : "—"
                          : a.workersCount}
                      </strong>
                      Workers{workerGap(a) ? " (unverified)" : ""}
                    </span>
                    <span>
                      <strong className="block text-lg tabular-nums">{a.zonesCount}</strong>Zones
                    </span>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-muted-foreground">
                    {pagesGap(a) ? (
                      <>
                        <AlertTriangle size={13} className="mt-px shrink-0 text-amber-500" /> Pages
                        list incomplete — see warnings.
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={13} className="mt-px shrink-0 text-emerald-500" />
                        All {a.pagesCount} Pages projects listed
                        {a.pagesApiRequests ? " (" + a.pagesApiRequests + " API pages)" : ""}.
                        {underReported
                          ? " Cloudflare metadata reported only " +
                            a.pagesReportedTotal +
                            "; full pagination verified the rest."
                          : ""}
                        {a.pagesCount >= PAGES_PROJECT_SOFT_LIMIT
                          ? " This account is at Cloudflare's 100-project Pages limit, so newer apps here are Workers."
                          : ""}
                      </>
                    )}
                  </p>
                  {workerGap(a) && (
                    <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
                      <p className="font-semibold">
                        Workers are hidden — Cloudflare&apos;s &ldquo;Workers &amp; Pages&rdquo;
                        total includes them, so it will be higher than {a.pagesCount}.
                      </p>
                      <p className="mt-1">
                        Cloudflare refuses this account&apos;s token on the Workers API (HTTP 403).
                        Token used here:{" "}
                        <strong>{TOKEN_SOURCE_LABEL[a.workersTokenSource || "none"]}</strong>.
                      </p>
                      {(() => {
                        const peer = inventory.accountDetails.find(
                          (o) =>
                            o.accountId !== a.accountId &&
                            !workerGap(o) &&
                            o.workersTokenSource === "global" &&
                            a.workersTokenSource === "global",
                        );
                        return peer ? (
                          <p className="mt-1">
                            The same token <strong>can</strong> read Workers on {peer.label}, so it
                            is not covering this account. Either add this account under the
                            token&apos;s
                            <em> Account Resources</em> (the token&apos;s creator must have Workers
                            access here), or add a separate{" "}
                            <code className="rounded bg-muted px-1">workers</code> token for this
                            account.
                          </p>
                        ) : null;
                      })()}
                      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                        <li>
                          Sign in to Cloudflare as a user who can see this account&apos;s Workers
                          (its owner), then open API tokens.
                        </li>
                        <li>
                          Edit that token, or create a custom token, with{" "}
                          <strong>Account › Workers Scripts › Read</strong> and{" "}
                          <strong>Zone › Workers Routes › Read</strong>, with this account selected
                          under Account Resources.
                        </li>
                        <li>
                          Editing keeps the token value: just press Refresh. A new token goes in{" "}
                          <code className="rounded bg-muted px-1">
                            CLOUDFLARE_ACCOUNT_TOKENS_JSON
                          </code>{" "}
                          as{" "}
                          <code className="rounded bg-muted px-1">
                            {'"' + a.accountId.slice(0, 6) + "…" + '": { "workers": "…" }'}
                          </code>
                          , then redeploy.
                        </li>
                      </ol>
                      <a
                        href="https://dash.cloudflare.com/profile/api-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 font-semibold text-primary"
                      >
                        Open Cloudflare API tokens <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="text-muted-foreground"
                      title="Add a per-account `deploy` token (Cloudflare Pages: Edit) to CLOUDFLARE_ACCOUNT_TOKENS_JSON to enable"
                    >
                      Deploy actions:{" "}
                      {a.deployEnabled ? (
                        <strong className="text-emerald-600 dark:text-emerald-400">enabled</strong>
                      ) : (
                        "off (read-only)"
                      )}
                    </span>
                    <a
                      href={"https://dash.cloudflare.com/" + a.accountId + "/workers-and-pages"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary"
                    >
                      Workers & Pages <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {inventory.errors.length > 0 && (
            <details
              className="rounded-2xl border border-amber-500/35 bg-amber-500/5 p-3 text-sm"
              open={anyPagesGap}
            >
              <summary className="cursor-pointer text-xs font-semibold text-foreground">
                <AlertTriangle size={14} className="mr-1.5 inline text-amber-500" />
                {inventory.errors.length} coverage warning(s)
                {anyPagesGap ? "" : " — Pages inventory is complete; these affect Workers/DNS only"}
              </summary>
              <ul className="mt-2 space-y-1 text-xs">
                {inventory.errors.map((error, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-border/60 bg-background/50 px-3 py-2"
                  >
                    {error}
                  </li>
                ))}
              </ul>
              {anyWorkerGap && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Fix: create an account-scoped token with <em>Workers Scripts: Read</em> (and{" "}
                  <em>Zone › Workers Routes: Read</em>) and add it as the
                  <code className="mx-1 rounded bg-muted px-1">workers</code>key for that account in
                  CLOUDFLARE_ACCOUNT_TOKENS_JSON. Unavailable data is never shown as zero.
                </p>
              )}
            </details>
          )}

          <div
            className="flex gap-1.5 overflow-x-auto pb-1"
            role="toolbar"
            aria-label="Quick filters"
          >
            {CHIPS.filter((c) => c.id === "all" || counts[c.id] > 0 || prefs.quick === c.id).map(
              (chip) => {
                const active = prefs.quick === chip.id;
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
                    <span className={`ml-1 tabular-nums ${active ? "" : tone}`}>
                      {counts[chip.id]}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_13rem_12rem_auto]">
            <label className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"
              />
              <span className="sr-only">Search Cloudflare projects</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, domain, repo, branch, commit…  ( / )"
                className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm"
              />
            </label>
            <select
              aria-label="Filter Cloudflare account"
              value={accountId}
              onChange={(e) => update({ account: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All accounts ({inventory.rows.length})</option>
              {inventory.accountDetails.map((a) => (
                <option value={a.accountId} key={a.accountId}>
                  {a.label} ({inventory.rows.filter((r) => r.accountId === a.accountId).length})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm">
              <ArrowDownUp size={14} className="text-muted-foreground" />
              <span className="sr-only">Sort</span>
              <select
                aria-label="Sort Cloudflare projects"
                value={prefs.sort}
                onChange={(e) => update({ sort: e.target.value as SortKey })}
                className="w-full bg-transparent py-2"
              >
                <option value="name">Name A–Z</option>
                <option value="deployed">Recently deployed</option>
                <option value="health">Problems first</option>
                <option value="domain">Live domain</option>
                <option value="account">Account</option>
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={copyUrls}
                disabled={!rows.some((r) => r.publicUrl)}
                className="btn-secondary text-xs"
                title="Copy live URLs of the filtered list"
              >
                <Copy size={13} /> URLs
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={!rows.length}
                className="btn-secondary text-xs"
              >
                <Download size={13} /> CSV
              </button>
              <button type="button" onClick={resetFilters} className="btn-secondary text-xs">
                <X size={13} /> Reset
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground" aria-live="polite">
            Showing <strong className="text-foreground">{rows.length}</strong> of {scoped.length}{" "}
            resources
            {accountId !== "all" ? " in " + accountName(accountId) : ""} · all results rendered, no
            paging
          </p>

          {rows.length === 0 ? (
            <p className="card-glass p-6 text-sm text-muted-foreground">
              No resources match. Clear filters, or check coverage warnings before assuming an
              account is empty.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
              <div className="hidden grid-cols-[minmax(0,2fr)_7.5rem_6.5rem_minmax(0,1.6fr)_minmax(0,1.5fr)_8.5rem] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
                <span>Project</span>
                <span>Status</span>
                <span>Deployed</span>
                <span>Live URL</span>
                <span>Source</span>
                <span className="text-right">Manage</span>
              </div>
              <ul className="divide-y divide-border/60">
                {rows.map((row) => {
                  const health = healthOf(row);
                  const sha = commitUrl(row);
                  const failedSha = row.latestProduction
                    ? commitUrl(row, row.latestProduction.commit)
                    : null;
                  const extraDomains = row.domains.length > 1 ? row.domains.length - 1 : 0;
                  const isBusy = busy?.startsWith(row.key + ":");
                  const canDeploy =
                    deployEnabled(row) &&
                    (row.sourceType === "github" || row.sourceType === "gitlab");
                  return (
                    <li
                      key={row.key}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-4 py-2.5 text-xs [contain-intrinsic-size:auto_64px] [content-visibility:auto] hover:bg-muted/30 md:grid-cols-[minmax(0,2fr)_7.5rem_6.5rem_minmax(0,1.6fr)_minmax(0,1.5fr)_8.5rem] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {row.kind === "pages" ? (
                            <Cloud size={13} className="shrink-0 text-orange-500" />
                          ) : (
                            <Server size={13} className="shrink-0 text-sky-500" />
                          )}
                          <a
                            href={row.projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Cloudflare dashboard"
                            className="truncate text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {row.name}
                          </a>
                          <button
                            type="button"
                            className="shrink-0 text-muted-foreground/50 hover:text-foreground"
                            aria-label={"Copy name " + row.name}
                            onClick={() => copy(row.name, "Project name")}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
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
                      </div>
                      <div className="justify-self-end md:justify-self-start">
                        <HealthPill row={row} />
                      </div>
                      <div
                        className="text-muted-foreground"
                        title={
                          row.deployedAt
                            ? new Date(row.deployedAt).toLocaleString()
                            : "No deployment reported"
                        }
                      >
                        <span className="md:hidden">Deployed </span>
                        {relativeTime(row.deployedAt)}
                        {health === "failing" && row.latestProduction?.createdAt && (
                          <span className="block text-[10px] text-red-600 dark:text-red-400">
                            failed {relativeTime(row.latestProduction.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 min-w-0 md:col-span-1">
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
                          <span className="text-muted-foreground">
                            {row.kind === "worker" ? "URL not verified (check routing)" : "Not published"}
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
                        {row.workersDevUrl && row.workersDevUrl !== row.publicUrl && (
                          <a href={row.workersDevUrl} target="_blank" rel="noopener noreferrer"
                            className="block truncate text-[10px] text-muted-foreground hover:text-primary"
                            title="workers.dev endpoint, confirmed enabled by Cloudflare">
                            {hostOf(row.workersDevUrl)}
                          </a>
                        )}
                        {row.domains.length > 0 && row.pagesDevUrl && (
                          <a
                            href={row.pagesDevUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-[10px] text-muted-foreground hover:text-primary"
                          >
                            {hostOf(row.pagesDevUrl)}
                          </a>
                        )}
                      </div>
                      <div className="col-span-2 min-w-0 text-muted-foreground md:col-span-1">
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
                            <span className="block truncate text-[10px]">
                              {row.branch || "branch ?"}
                              {sha ? (
                                <>
                                  {" "}
                                  @{" "}
                                  <a
                                    href={sha}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono hover:text-primary"
                                  >
                                    {row.commit?.slice(0, 7)}
                                  </a>
                                </>
                              ) : (
                                ""
                              )}
                              {failedSha && health === "failing" ? (
                                <>
                                  {" "}
                                  ·{" "}
                                  <a
                                    href={failedSha}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-red-600 hover:underline dark:text-red-400"
                                  >
                                    failed {row.latestProduction?.commit?.slice(0, 7)}
                                  </a>
                                </>
                              ) : (
                                ""
                              )}
                            </span>
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
                            {row.routes.length ? "Route: " + row.routes[0] : "Git source not verified"}
                          </span>
                        )}
                        {row.repoEvidence === "worker-build" && row.repoUrl && (
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400"
                            title="Repository reported by Cloudflare Workers Builds, not proof of the currently serving commit">
                            Source: Cloudflare Workers Builds
                          </span>
                        )}
                        {possibleRepo(row) && (
                          <a
                            href={possibleRepo(row)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Same name as a public repo — unverified link"
                            className="block truncate text-[10px] hover:text-primary"
                          >
                            possible repo: {possibleRepo(row)!.replace("https://github.com/", "")}
                          </a>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-0.5 md:col-span-1">
                        {row.publicUrl && (
                          <a
                            className={iconBtn}
                            href={row.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={"Open live site " + row.name}
                            title="Open live site"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <a
                          className={iconBtn}
                          href={row.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={"Manage " + row.name + " in Cloudflare"}
                          title="Manage in Cloudflare"
                        >
                          <Cloud size={15} />
                        </a>
                        <button
                          type="button"
                          className={iconBtn}
                          onClick={() => void requestHistory(row)}
                          aria-label={"Deployment history for " + row.name}
                          title="Deployment history"
                        >
                          <History size={15} />
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
                            className="w-56 [&_[role=menuitem]]:gap-2"
                          >
                            <DropdownMenuLabel className="truncate text-xs">
                              {row.name}
                            </DropdownMenuLabel>
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
                              <DropdownMenuItem onSelect={() => copy(row.publicUrl!, "Live URL")}>
                                <Copy size={14} /> Copy live URL
                              </DropdownMenuItem>
                            )}
                            {row.pagesDevUrl && (
                              <DropdownMenuItem
                                onSelect={() => copy(row.pagesDevUrl!, "pages.dev URL")}
                              >
                                <Copy size={14} /> Copy pages.dev URL
                              </DropdownMenuItem>
                            )}
                            {row.repoUrl && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <a
                                    href={row.repoUrl + "/actions"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <GitBranch size={14} /> GitHub Actions
                                  </a>
                                </DropdownMenuItem>
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
                                <DropdownMenuItem asChild>
                                  <a
                                    href={
                                      "https://github.dev/" +
                                      row.repoUrl.replace("https://github.com/", "")
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <GitBranch size={14} /> Edit in github.dev
                                  </a>
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a
                                href={
                                  "https://dash.cloudflare.com/" +
                                  row.accountId +
                                  "/workers-and-pages"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Cloud size={14} /> Account Workers & Pages
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            requestNumber.current++;
            setSelected(null);
            setHistory([]);
            setHistoryLoading(false);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="break-all pr-6">{selected.name}</SheetTitle>
                <SheetDescription>
                  {accountName(selected.accountId)} · production deployment history from the
                  Cloudflare API
                </SheetDescription>
              </SheetHeader>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <HealthPill row={selected} />
                {selected.publicUrl && (
                  <a
                    className="btn-secondary text-xs"
                    href={selected.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe size={12} /> {hostOf(selected.publicUrl)}
                  </a>
                )}
                <a
                  className="btn-secondary text-xs"
                  href={selected.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Cloud size={12} /> Cloudflare
                </a>
                {selected.repoUrl && (
                  <a
                    className="btn-secondary text-xs"
                    href={selected.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitBranch size={12} /> Repo
                  </a>
                )}
                {deployEnabled(selected) &&
                  (selected.sourceType === "github" || selected.sourceType === "gitlab") && (
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={Boolean(busy)}
                      onClick={() => runAction(selected, "deploy")}
                    >
                      <Rocket size={12} /> Deploy latest
                    </button>
                  )}
              </div>
              {!deployEnabled(selected) && selected.kind === "pages" && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Retry / rollback / deploy are off for this account. Add a{" "}
                  <code className="rounded bg-muted px-1">deploy</code> token with Cloudflare Pages:
                  Edit to enable them.
                </p>
              )}
              <div className="mt-4 space-y-2">
                {historyLoading && history.length === 0 && (
                  <p className="text-xs" role="status">
                    Fetching deployment history…
                  </p>
                )}
                {historyError && (
                  <ConnectorError
                    message={historyError}
                    onRetry={() => void requestHistory(selected, historyPage || 1)}
                  />
                )}
                {!historyLoading && !historyError && history.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No production deployments returned.
                  </p>
                )}
                {history.map((item, index) => {
                  const current = item.id === selected.deploymentId;
                  const ok = /^success$/i.test(item.status);
                  const failed = /^(failure|failed|canceled)$/i.test(item.status);
                  const link = commitUrl(selected, item.commit);
                  return (
                    <div
                      key={item.id + ":" + index}
                      className={`rounded-xl border px-3 py-2 text-xs ${current ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {ok ? (
                            <CircleCheck size={13} className="text-emerald-500" />
                          ) : failed ? (
                            <CircleX size={13} className="text-red-500" />
                          ) : (
                            <CircleDot size={13} className="text-muted-foreground" />
                          )}
                          {item.status}
                          {current && (
                            <span className="rounded bg-emerald-500/15 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                              serving
                            </span>
                          )}
                        </span>
                        <span
                          className="text-muted-foreground"
                          title={item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                        >
                          {relativeTime(item.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                        {item.branch && <span>{item.branch}</span>}
                        {item.commit &&
                          (link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono hover:text-primary"
                            >
                              {item.commit.slice(0, 7)}
                            </a>
                          ) : (
                            <span className="font-mono">{item.commit.slice(0, 7)}</span>
                          ))}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary"
                          >
                            Preview <ExternalLink size={10} />
                          </a>
                        )}
                        {selected.kind === "pages" && deployEnabled(selected) && (
                          <span className="ml-auto flex gap-1.5">
                            {failed && (
                              <button
                                type="button"
                                disabled={Boolean(busy)}
                                className="btn-secondary px-2 py-1 text-[11px]"
                                onClick={() => runAction(selected, "retry", item.id)}
                              >
                                <RotateCcw size={11} /> Retry
                              </button>
                            )}
                            {ok && !current && (
                              <button
                                type="button"
                                disabled={Boolean(busy)}
                                className="btn-secondary px-2 py-1 text-[11px]"
                                onClick={() => runAction(selected, "rollback", item.id)}
                              >
                                <Undo2 size={11} /> Roll back here
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {history.length > 0 && history.length % 25 === 0 && historyPage < 100 && (
                  <button
                    className="btn-secondary w-full text-xs"
                    type="button"
                    disabled={historyLoading}
                    onClick={() => void requestHistory(selected, historyPage + 1)}
                  >
                    {historyLoading ? "Loading…" : "Older deployments"}
                  </button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog {...confirm.dialogProps} variant="default" />
    </section>
  );
}
