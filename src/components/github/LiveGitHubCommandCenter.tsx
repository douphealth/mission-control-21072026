import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Search, GitPullRequest, CircleDot, Workflow, Clock3, Pencil, CheckCircle2, AlertTriangle } from "lucide-react";
import type { GitHubRepo } from "@/lib/db";
import { OWNERS, fetchOwnerRepos, cachedOwners, retainOwnerResult, joinGitHubPlans, repoNeedsAttention, type OwnerResult } from "@/lib/liveGitHub";
import { getGitHubRepoOwner } from "@/lib/unifiedGitHubCatalog";

type Filter = "all" | "attention" | "recent" | "archived" | "snapshot";
const MIN_REFRESH_MS = 10 * 60 * 1000;
const MAX_ROWS = 30;
const outer = "rounded-2xl border border-border/60 bg-card/85 p-4 shadow-sm";

export default function LiveGitHubCommandCenter({ repos, onEdit }: {
  repos: GitHubRepo[]; onEdit: (repo: GitHubRepo) => void;
}) {
  const [results, setResults] = useState<Record<string, OwnerResult>>(cachedOwners);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("pushed");
  const [visible, setVisible] = useState(MAX_ROWS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const inFlight = useRef(false);
  const lastAttempt = useRef(0);
  const retryAfter = useRef(0);
  const refresh = useCallback(async (force = false) => {
    if (inFlight.current || (!force && Date.now() - lastAttempt.current < MIN_REFRESH_MS)
      || Date.now() < retryAfter.current) return;
    inFlight.current = true; lastAttempt.current = Date.now(); setBusy(true);
    try {
      const next = await Promise.all(OWNERS.map(o => fetchOwnerRepos(o)));
      const errors = next.map(item => item.retryAt ? Date.parse(item.retryAt) : 0).filter(t => t > Date.now());
      retryAfter.current = errors.length ? Math.max(...errors) : 0;
      setResults(previous => {
        const merged = { ...previous };
        for (const item of next) merged[item.owner] = retainOwnerResult(item);
        return merged;
      });
    } finally { inFlight.current = false; setBusy(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    }, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible" && navigator.onLine) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  const live = useMemo(() => OWNERS.flatMap(o => results[o]?.repositories || []), [results]);
  const rows = useMemo(() => joinGitHubPlans(repos, live), [repos, live]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const ranked = rows.filter(r => {
      if (owner !== "all" && getGitHubRepoOwner(r.repo.url).toLowerCase() !== owner.toLowerCase()) return false;
      if (filter === "attention" && !repoNeedsAttention(r)) return false;
      if (filter === "recent" && (!r.live?.pushedAt || Date.now() - Date.parse(r.live.pushedAt) > 30 * 86400000)) return false;
      if (filter === "archived" && !r.live?.archived && r.repo.status !== "archived") return false;
      if (filter === "snapshot" && r.source !== "saved snapshot") return false;
      const text = [r.repo.name, r.repo.url, r.repo.description, r.repo.pendingSummary,
        r.live?.description, r.live?.language, r.owner].join(" ").toLowerCase();
      return !q || text.includes(q);
    });
    ranked.sort((a,b) => sort === "name" ? a.key.localeCompare(b.key) :
      sort === "priority" ? ({critical:0,high:1,medium:2,low:3}[a.repo.priority || "medium"] -
        {critical:0,high:1,medium:2,low:3}[b.repo.priority || "medium"]) :
      (Date.parse(b.live?.pushedAt || "") || 0) - (Date.parse(a.live?.pushedAt || "") || 0));
    return ranked;
  }, [rows, search, owner, filter, sort]);
  const validCount = OWNERS.filter(o => results[o]?.state === "live").length;
  const staleCount = OWNERS.filter(o => results[o]?.state === "error").length;
  return <section className="space-y-4" aria-label="Unified GitHub repository command center">
    <div className={outer}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">GitHub repository operations</p>
          <h2 className="mt-1 text-xl font-bold">All repositories, one workspace</h2>
          <p className="mt-1 text-xs text-muted-foreground">Live GitHub metadata + saved Mission Control plans · auto-refresh every 10 minutes while open</p>
        </div>
        <button type="button" disabled={busy} onClick={() => void refresh(true)} className="btn-secondary inline-flex items-center gap-2 text-xs">
          <RefreshCw size={14} className={busy ? "animate-spin" : ""}/>{busy ? "Refreshing…" : "Refresh all accounts"}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([["Repositories",rows.length],["Fresh accounts",validCount + "/3"],
          ["Need attention",rows.filter(repoNeedsAttention).length],["Observed recently pushed",live.filter(r=>r.pushedAt && Date.now()-Date.parse(r.pushedAt)<30*86400000).length]] as const)
          .map(([label,value]) => <div key={label} className="rounded-xl bg-secondary/40 px-3 py-3">
            <p className="text-xl font-bold tabular-nums">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p>
          </div>)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">{OWNERS.map(o => {
        const r = results[o];
        return <div key={o} className="rounded-xl border border-border/40 px-3 py-2 text-xs">
          <p className="font-semibold">{o}</p>
          <p className="mt-1 text-muted-foreground">{r?.state === "live" ? "Verified live" :
            r?.state === "error" ? "Request failed; retaining prior verified rows" : "Not yet verified"} · {r?.repositories.length || 0} observed</p>
          {r?.fetchedAt && <p className="text-muted-foreground">As of {new Date(r.fetchedAt).toLocaleString()}</p>}
          {r?.error && <p className="mt-1 text-amber-600 dark:text-amber-400">{r.error}</p>}
        </div>;
      })}</div>
      {staleCount > 0 && <p role="alert" className="mt-3 text-xs text-amber-600 dark:text-amber-400">
        Partial coverage: {staleCount} account request(s) failed. Last verified data is retained, not marked current.
      </p>}
      {retryAfter.current > Date.now() && <p className="mt-2 text-xs text-muted-foreground">GitHub rate-limit backoff active until {new Date(retryAfter.current).toLocaleString()}.</p>}
    </div>
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_11rem_10rem]">
      <label className="relative"><Search size={15} className="absolute left-3 top-3 text-muted-foreground"/><span className="sr-only">Find repository</span>
        <input value={search} onChange={e=>{setSearch(e.target.value);setVisible(MAX_ROWS);}}
          placeholder="Search repos, plans or technologies…" className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm"/></label>
      <select aria-label="Filter account" value={owner} onChange={e=>{setOwner(e.target.value);setVisible(MAX_ROWS);}}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
        <option value="all">All accounts</option>{OWNERS.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <select aria-label="Filter repository state" value={filter} onChange={e=>{setFilter(e.target.value as Filter);setVisible(MAX_ROWS);}}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
        <option value="all">All projects</option><option value="attention">Need attention</option>
        <option value="recent">Pushed in 30 days</option><option value="archived">Archived</option>
        <option value="snapshot">Saved only / unverified</option>
      </select>
      <select aria-label="Sort repositories" value={sort} onChange={e=>setSort(e.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
        <option value="pushed">Latest push</option><option value="priority">My priority</option><option value="name">Name A–Z</option>
      </select>
    </div>
    <p className="text-xs text-muted-foreground" aria-live="polite">{filtered.length} matching repositories · {Math.min(visible,filtered.length)} displayed</p>
    <div className="grid gap-3 lg:grid-cols-2">{filtered.slice(0,visible).map(item => {
      const r=item.repo, live=item.live, url=r.url;
      return <article key={item.key} className={outer}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0">
          <p className="text-[11px] text-primary">{item.owner} · {item.source === "live" ? "GitHub API" : "Saved snapshot"}</p>
          <h3 className="break-words text-base font-bold">{live?.name || r.name}</h3>
        </div><span className="rounded-lg bg-secondary px-2 py-1 text-[10px]">
          {live?.archived ? "Archived" : (r.priority || "Unprioritized") + " priority"}
        </span></div>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{live?.description || r.description || "Description not supplied"}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-lg bg-secondary px-2 py-1">{live?.language || r.language || "Unknown language"}</span>
          <span>{live ? live.stars+" stars" : "Stars unverified"}</span><span>{live ? live.openIssues+" open issues/PRs" : "Issues unverified"}</span>
          <span>{r.progress}% planned progress</span>
        </div>
        {r.pendingSummary && <p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs"><strong>Next:</strong> {r.pendingSummary}</p>}
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock3 size={12}/>{live?.pushedAt ? "Last push "+new Date(live.pushedAt).toLocaleString() : "Last push not verified"}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border/40 pt-3 text-xs font-semibold">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary">Code <ExternalLink size={11} className="inline"/></a>
          <a href={url+"/pulls"} target="_blank" rel="noopener noreferrer" className="text-primary"><GitPullRequest size={11} className="inline"/> PRs</a>
          <a href={url+"/issues"} target="_blank" rel="noopener noreferrer" className="text-primary"><CircleDot size={11} className="inline"/> Issues</a>
          <a href={url+"/actions"} target="_blank" rel="noopener noreferrer" className="text-primary"><Workflow size={11} className="inline"/> CI</a>
          <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={()=>onEdit(r)}><Pencil size={11}/>Plan</button>
          <button type="button" className="text-primary" onClick={()=>setExpanded(expanded===item.key?null:item.key)}>Details</button>
        </div>
        {expanded === item.key && <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border/40 pt-3 text-xs">
          <div><dt className="text-muted-foreground">Default branch</dt><dd>{live?.defaultBranch || r.defaultBranch || "Unknown"}</dd></div>
          <div><dt className="text-muted-foreground">Local status</dt><dd>{r.status}</dd></div>
          <div><dt className="text-muted-foreground">Last GitHub update</dt><dd>{live?.updatedAt ? new Date(live.updatedAt).toLocaleString():"Unverified"}</dd></div>
          <div><dt className="text-muted-foreground">Forks</dt><dd>{live ? live.forks : "Unverified"}</dd></div>
          {r.doneSummary && <div className="col-span-2"><dt className="text-muted-foreground">Completed work</dt><dd>{r.doneSummary}</dd></div>}
          {r.demoUrl && <div className="col-span-2"><dt className="text-muted-foreground">Recorded app</dt><dd><a href={r.demoUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary">{r.demoUrl}</a></dd></div>}
        </dl>}
      </article>;
    })}</div>
    {!filtered.length && <p className={outer}>{busy ? "Retrieving repositories…" : "No repositories match these filters, or inventory is not yet available."}</p>}
    {visible < filtered.length && <button type="button" className="btn-secondary text-sm" onClick={()=>setVisible(v=>v+MAX_ROWS)}>
      Show more ({filtered.length-visible} remaining)</button>}
    <p className="text-xs text-muted-foreground"><CheckCircle2 size={12} className="inline"/> Repository status and delivery progress are manually maintained. Live API observations do not prove deployment or uptime. <AlertTriangle size={12} className="inline"/> Private repos require protected server-side authorization.</p>
  </section>;
}
