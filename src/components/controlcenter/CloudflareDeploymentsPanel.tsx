import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDownUp, Cloud, ExternalLink, GitBranch, History, LayoutGrid, List, RefreshCw, Search, Server, ShieldCheck, X } from "lucide-react";
import {
  getCloudflareDeploymentHistory,
  type CloudflareDeploymentRow,
  type CloudflareInventory,
  type DeploymentHistoryItem,
} from "@/lib/cloudflareInventory.functions";
import { PUBLIC_PORTFOLIO_REPOS } from "@/lib/portfolioAtlas";
import { ConnectorEmpty, ConnectorError, TruthBadge } from "@/components/TruthUI";
import { freshness, type TruthState } from "@/lib/truth";
import { cloudflareTruthState, type CloudflareConnectionStatus } from "@/lib/cloudflareControlState";

type Filter = "all" | "pages" | "worker";
type SortBy = "name" | "recent" | "account" | "status";
type Layout = "cards" | "compact";
const shorten = (id: string) => id.slice(-6);
const date = (value: string | null) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString() : "Unverified";
function stateFor(value: CloudflareInventory | null): TruthState {
  if (!value) return "unavailable";
  if (value.truthState === "partial" || value.truthState === "error") return "error";
  return value.truthState;
}
const exactRepoNames = new Map<string, string[]>();
for (const repo of PUBLIC_PORTFOLIO_REPOS) {
  const key = repo.name.toLowerCase();
  exactRepoNames.set(key, [...(exactRepoNames.get(key) || []), repo.url]);
}
function repoRelationship(row: CloudflareDeploymentRow) {
  if (row.repoUrl) return { url: row.repoUrl, verified: true };
  const matches = exactRepoNames.get(row.name.toLowerCase()) || [];
  return matches.length === 1 ? { url: matches[0], verified: false } : null;
}

export default function CloudflareDeploymentsPanel({
  inventory, status, loading, failure, onRefresh,
}: {
  inventory: CloudflareInventory | null;
  status: CloudflareConnectionStatus | null;
  loading: boolean;
  failure: string | null;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [account, setAccount] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [layout, setLayout] = useState<Layout>("compact");
  const [onlyUnverified, setOnlyUnverified] = useState(false);
  const [visible, setVisible] = useState(48);
  const [selected, setSelected] = useState<CloudflareDeploymentRow | null>(null);
  const [history, setHistory] = useState<DeploymentHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const requestNumber = useRef(0);
  useEffect(() => {
    // Invalidate history requests whenever the backing inventory changes.
    requestNumber.current++;
    setSelected(null);
    setHistory([]);
    setHistoryPage(0);
  }, [inventory]);

  const rows = useMemo(() => (inventory?.rows || []).filter(row => {
    if (filter !== "all" && row.kind !== filter) return false;
    if (account !== "all" && row.accountId !== account) return false;
    if (onlyUnverified && row.statusSource !== "unavailable" && row.repoUrl) return false;
    const needle = query.trim().toLowerCase();
    return !needle || [row.name, row.kind, row.status, row.repoUrl || "", row.accountId, ...row.domains, ...row.routes]
      .join(" ").toLowerCase().includes(needle);
  }).sort((a, b) => {
    if (sortBy === "account") return a.accountId.localeCompare(b.accountId) || a.name.localeCompare(b.name);
    if (sortBy === "status") return a.status.localeCompare(b.status) || a.name.localeCompare(b.name);
    if (sortBy === "recent") {
      const bTime = b.deployedAt ? Date.parse(b.deployedAt) || 0 : 0;
      const aTime = a.deployedAt ? Date.parse(a.deployedAt) || 0 : 0;
      return bTime - aTime || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  }), [inventory, filter, account, query, onlyUnverified, sortBy]);
  const totalPages = inventory?.rows.filter(row => row.kind === "pages").length || 0;
  const totalWorkers = inventory?.rows.filter(row => row.kind === "worker").length || 0;
  const mapped = inventory?.rows.filter(row => Boolean(row.repoUrl)).length || 0;
  const accountName = (id: string) => inventory?.accountDetails.find(a => a.accountId === id)?.label || "Account …" + shorten(id);
  const partialWorkers = Boolean(inventory?.accountDetails.some(a =>
    a.errors.some(e => /worker/i.test(e))));
  const clearFilters = () => {
    setFilter("all"); setAccount("all"); setQuery(""); setSortBy("name");
    setOnlyUnverified(false); setVisible(48);
  };
  const exportCsv = () => {
    if (!rows.length) return;
    const fields = ["account", "kind", "name", "status", "deployed_at", "branch", "commit", "repo", "domains", "routes", "dashboard"];
    const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
    const data = rows.map(r => [
      accountName(r.accountId), r.kind, r.name, r.status,
      r.deployedAt || "", r.branch || "", r.commit || "", r.repoUrl || "",
      r.domains.join("; "), r.routes.join("; "), r.projectUrl,
    ].map(quote).join(","));
    const csv = [fields.join(","), ...data].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "mission-control-cloudflare-inventory.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const requestHistory = async (row: CloudflareDeploymentRow, page = 1) => {
    const requestId = ++requestNumber.current;
    setSelected(row);
    setHistoryLoading(true);
    setHistoryError(null);
    if (page === 1) { setHistory([]); setHistoryPage(0); }
    try {
      const result = await getCloudflareDeploymentHistory({
        data: { accountId: row.accountId, kind: row.kind, name: row.name, page },
      });
      if (requestId !== requestNumber.current) return;
      setHistory(old => page === 1 ? result.rows : [...old, ...result.rows]);
      setHistoryPage(page);
    } catch {
      if (requestId === requestNumber.current)
        setHistoryError("Could not fetch authorized deployment history. Confirm token scope and try again.");
    } finally {
      if (requestId === requestNumber.current) setHistoryLoading(false);
    }
  };

  return (
    <section aria-label="Cloudflare unified deployment management" className="space-y-4">
      <div className="card-glass flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Cloud size={19} /> Unified Pages & Workers</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Cloudflare API-sourced inventory across configured accounts. Deployment state does not prove endpoint uptime.
            Management links open Cloudflare; no production changes are initiated here.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <TruthBadge meta={{ truthState: status ? cloudflareTruthState(status) : stateFor(inventory), source: "Cloudflare API", fetchedAt: inventory?.fetchedAt }} />
            {inventory?.fetchedAt && <span className="text-xs text-muted-foreground">Fetched {freshness(inventory.fetchedAt) || inventory.fetchedAt}</span>}
          </div>
        </div>
        <button className="btn-secondary text-xs" type="button" disabled={loading} onClick={() => onRefresh()}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh deployments
        </button>
      </div>
      {loading && <p role="status" className="card-glass p-4 text-sm text-muted-foreground">Loading authenticated Cloudflare infrastructure…</p>}
      {failure && <ConnectorError message={failure} onRetry={() => onRefresh()} />}
      {!loading && (status === "not_connected" || status === "access_not_configured" || status === "login_required") && (
        <ConnectorEmpty
          title={status === "login_required" ? "Cloudflare Access sign-in required" : "Cloudflare server setup incomplete"}
          description="Protect the Pages hostname with Cloudflare Access and configure the Access audience, account IDs, and read-only API tokens in the deployed server runtime. This app does not accept browser-side tokens."
          docsUrl="https://developers.cloudflare.com/api/"
          onRetry={() => onRefresh()}
        />
      )}
      {!loading && inventory?.errors.length ? (
        <details className="rounded-2xl border border-amber-500/35 bg-amber-500/5 p-4 text-sm" open>
          <summary className="cursor-pointer font-semibold text-foreground">
            <AlertTriangle size={15} className="mr-2 inline text-amber-500" />
            {inventory.errors.length} Cloudflare coverage warning(s) — inspect affected endpoints
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">Verified resources remain usable. Unavailable routes or services are not treated as zero. Credentials never appear here.</p>
          <ul className="mt-2 space-y-1 text-xs">
            {inventory.errors.map((error, index) => <li key={index} className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">{error}</li>)}
          </ul>
        </details>
      ) : null}
      {inventory && inventory.truthState !== "not_connected" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Accounts", count: inventory.accounts.length, icon: ShieldCheck },
              { label: "Pages projects", count: totalPages, icon: Cloud },
              { label: partialWorkers ? "Workers (unverified)" : "Workers", count: partialWorkers && totalWorkers === 0 ? "—" : partialWorkers ? totalWorkers + "+" : totalWorkers, icon: Server },
              { label: "Confirmed GitHub sources", count: mapped, icon: GitBranch },
            ].map(stat => <div key={stat.label} className="card-glass rounded-2xl p-4">
              <stat.icon size={16} className="text-primary" />
              <p className="mt-2 text-2xl font-bold tabular-nums">{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>)}
          </div>
          {partialWorkers && <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Worker API access is incomplete. The visible Worker count is a lower bound, not a verified total.
            Pages and Workers are separate Cloudflare products; missing Workers must not be inferred from the Pages count.
          </p>}
          <div className="grid gap-3 md:grid-cols-2">{inventory.accountDetails.map(a =>
            <div key={a.accountId} className="rounded-2xl border border-border bg-card/70 p-4 text-xs shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="break-words text-sm font-semibold">{a.label}</h3>
                <span className={a.truthState === "live" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                  {a.truthState.toUpperCase()}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/30 px-3 py-3 text-center">
                <span><strong className="block text-lg tabular-nums">{a.pagesCount}</strong>Pages</span>
                <span><strong className="block text-lg tabular-nums">{a.errors.some(e => /worker/i.test(e)) && a.workersCount === 0 ? "—" : a.workersCount}{a.errors.some(e => /worker/i.test(e)) && a.workersCount > 0 ? "+" : ""}</strong>Workers {a.errors.some(e => /worker/i.test(e)) ? "(unverified)" : ""}</span>
                <span><strong className="block text-lg tabular-nums">{a.zonesCount}</strong>Zones</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">{a.errors.length ? a.errors.length + " unresolved API check(s)" : "All reported inventory checks passed"}</span>
                <a href={"https://dash.cloudflare.com/" + a.accountId + "/workers-and-pages"}
                   target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                  Manage account <ExternalLink size={12}/>
                </a>
              </div>
            </div>)}</div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_13rem]">
            <label className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
              <span className="sr-only">Search deployments</span>
              <input aria-label="Search deployments" type="search" value={query}
                onChange={e => { setQuery(e.target.value); setVisible(48); }}
                placeholder="Search name, domain, repository or route"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm" />
            </label>
            <select aria-label="Filter deployments by type" value={filter}
              onChange={e => { setFilter(e.target.value as Filter); setVisible(48); }}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              <option value="all">Pages + Workers</option><option value="pages">Pages only</option>
              <option value="worker">Workers only</option>
            </select>
            <select aria-label="Filter Cloudflare account" value={account}
              onChange={e => { setAccount(e.target.value); setVisible(48); }}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              <option value="all">All Cloudflare accounts</option>
              {inventory.accounts.map(id => <option value={id} key={id}>{accountName(id)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowDownUp size={13}/>
              <span className="sr-only">Sort projects</span>
              <select aria-label="Sort Cloudflare projects" value={sortBy}
                onChange={e => { setSortBy(e.target.value as SortBy); setVisible(48); }}
                className="rounded-lg bg-background px-2 py-1.5 text-foreground">
                <option value="name">Name A–Z</option>
                <option value="recent">Recently deployed</option>
                <option value="account">Account</option>
                <option value="status">Deployment status</option>
              </select>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs">
              <input type="checkbox" checked={onlyUnverified} onChange={e => {setOnlyUnverified(e.target.checked);setVisible(48);}} />
              Needs verification
            </label>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setLayout("compact")} aria-label="Compact project view"
                aria-pressed={layout === "compact"} className={`rounded-lg p-2 ${layout === "compact" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                <List size={16}/>
              </button>
              <button type="button" onClick={() => setLayout("cards")} aria-label="Card project view"
                aria-pressed={layout === "cards"} className={`rounded-lg p-2 ${layout === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                <LayoutGrid size={16}/>
              </button>
              <button type="button" onClick={exportCsv} disabled={!rows.length} className="btn-secondary text-xs">
                Export CSV
              </button>
              <button type="button" onClick={clearFilters} className="btn-secondary text-xs"><X size={12}/> Reset</button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {rows.length} matching resources · showing {Math.min(rows.length, visible)} · API inventory, not a deployment or health test
          </p>
          {rows.length === 0 && <p className="card-glass p-6 text-sm text-muted-foreground">No resources returned for these filters. Check sync errors before assuming the account is empty.</p>}
          <div className={layout === "compact" ? "grid gap-2" : "grid gap-3 lg:grid-cols-2"}>
            {rows.slice(0, visible).map(row => {
              const repo = repoRelationship(row);
              return <article key={row.key} className={layout === "compact" ? "card-elevated min-w-0 rounded-xl px-4 py-3" : "card-elevated min-w-0 rounded-xl p-4"}>
                <div className="flex items-center justify-between gap-2">
                  <span className="badge badge-muted">{row.kind === "pages" ? "Pages project" : "Worker script"}</span>
                  <span className="text-[11px] text-muted-foreground">{accountName(row.accountId)}</span>
                </div>
                <h3 className={layout === "compact" ? "mt-1 break-all text-sm font-semibold" : "mt-2 break-all text-base font-semibold"}>{row.name}</h3>
                <dl className={layout === "compact" ? "mt-2 hidden grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs sm:grid" : "mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"}>
                  <dt className="text-muted-foreground">Deployment</dt><dd className="break-words">{row.status} {row.statusSource === "unavailable" ? "(not independently confirmed)" : "(API metadata)"}</dd>
                  <dt className="text-muted-foreground">Deployed</dt><dd>{date(row.deployedAt)}</dd>
                  <dt className="text-muted-foreground">Branch</dt><dd className="break-all">{row.branch || "Not provided by Cloudflare"}</dd>
                  <dt className="text-muted-foreground">Commit</dt><dd className="break-all font-mono">{row.commit?.slice(0, 12) || "Not provided by Cloudflare"}</dd>
                  <dt className="text-muted-foreground">Domains</dt><dd className="break-words">{row.domains.join(", ") || "No custom domain reported"}</dd>
                  {row.routes.length > 0 && <><dt className="text-muted-foreground">Routes</dt><dd className="break-words">{row.routes.join(", ")}</dd></>}
                  <dt className="text-muted-foreground">GitHub</dt>
                  <dd>{row.repoUrl ? "Cloudflare source mapping" : repo ? "Name match only — unverified" : "No source link available"}</dd>
                </dl>
                <div className={layout === "compact" ? "mt-2 flex flex-wrap items-center gap-3 border-t border-border pt-2 text-xs font-semibold" : "mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs font-semibold"}>
                  <a href={row.projectUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary">Manage in Cloudflare <ExternalLink size={12} /></a>
                  {row.publicUrl && <a href={row.publicUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary">Site <ExternalLink size={12} /></a>}
                  {repo && <a href={repo.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary">
                    GitHub {repo.verified ? "source" : "(possible)"} <ExternalLink size={12} />
                  </a>}
                  <button type="button" onClick={() => void requestHistory(row)} className="inline-flex items-center gap-1 text-primary">
                    <History size={13} /> History
                  </button>
                </div>
              </article>;
            })}
          </div>
          {visible < rows.length && <div className="text-center">
            <button className="btn-secondary text-sm" type="button" onClick={() => setVisible(v => v + 48)}>
              Show more ({rows.length - visible} remaining)
            </button>
          </div>}
        </>
      )}
      {selected && (
        <div className="card-glass space-y-3 p-4" aria-label="Deployment history">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="break-all font-semibold">Deployment history — {selected.name}</h3>
            <button type="button" className="btn-secondary text-xs" onClick={() => { requestNumber.current++; setSelected(null); setHistory([]); setHistoryLoading(false); }}>Close</button>
          </div>
          <p className="text-xs text-muted-foreground">Historical records from Cloudflare API, sorted as returned by Cloudflare. No rollback or redeploy is performed.</p>
          {historyLoading && <p className="text-xs" role="status">Fetching deployment history…</p>}
          {historyError && <ConnectorError message={historyError} onRetry={() => void requestHistory(selected, historyPage || 1)} />}
          {!historyLoading && !historyError && history.length === 0 && <p className="text-xs text-muted-foreground">No deployment history returned.</p>}
          <div className="space-y-2">
            {history.map((row, idx) => <div key={row.id + ":" + idx} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
              <span><strong>{row.status}</strong> · {date(row.createdAt)} · {row.branch || "branch unknown"} · {row.commit?.slice(0, 12) || row.id.slice(0, 12)}</span>
              {row.url && <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-primary">Deployment <ExternalLink size={11} className="inline" /></a>}
            </div>)}
          </div>
          {history.length > 0 && history.length % 25 === 0 && historyPage < 100 &&
            <button className="btn-secondary text-xs" type="button" disabled={historyLoading}
              onClick={() => void requestHistory(selected, historyPage + 1)}>Older deployments</button>}
        </div>
      )}
    </section>
  );
}
