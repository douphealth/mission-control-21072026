import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Search, GitPullRequest, CircleDot, Workflow, Clock3 } from "lucide-react";
import { OWNERS, fetchOwnerRepos, type LiveRepo, type OwnerResult } from "@/lib/liveGitHub";

const MIN_REFRESH_MS=10*60*1000;
export default function LiveGitHubCommandCenter(){
  const [results,setResults]=useState<Record<string,OwnerResult>>({});
  const [checkedAt,setCheckedAt]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [query,setQuery]=useState("");
  const [owner,setOwner]=useState("all");
  const [sort,setSort]=useState("pushed");
  const [visible,setVisible]=useState(30);
  const [expanded,setExpanded]=useState<string|null>(null);
  const lastAttempt=useRef(0);
  const inFlight=useRef(false);
  const refresh=useCallback(async(force=false)=>{
    if(inFlight.current||(!force&&Date.now()-lastAttempt.current<MIN_REFRESH_MS))return;
    inFlight.current=true;lastAttempt.current=Date.now();setBusy(true);
    try {
      const data=await Promise.all(OWNERS.map(o=>fetchOwnerRepos(o)));
      // Failed accounts keep their last verified results, labeled with an error;
      // they are never silently treated as empty or successfully refreshed.
      setResults(previous=>{
        const updated={...previous};
        for(const item of data)updated[item.owner]=item.state==="live"?item:{
          ...item,repositories:previous[item.owner]?.repositories||[],
        };
        return updated;
      });
      setCheckedAt(new Date().toISOString());
    }finally{inFlight.current=false;setBusy(false);}
  },[]);
  useEffect(()=>{
    void refresh();
    const timer=setInterval(()=>{if(document.visibilityState==="visible"&&navigator.onLine)void refresh();},60_000);
    const onVisible=()=>{if(document.visibilityState==="visible"&&navigator.onLine)void refresh();};
    document.addEventListener("visibilitychange",onVisible);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);};
  },[refresh]);
  const all=useMemo(()=>OWNERS.flatMap(o=>results[o]?.repositories||[]),[results]);
  const filtered=useMemo(()=>{
    const term=query.toLowerCase().trim();
    const rows=all.filter(r=>(owner==="all"||r.owner===owner)&&(!term||[r.name,r.description,r.language,r.owner,r.url].some(x=>x?.toLowerCase().includes(term))));
    rows.sort((a,b)=>sort==="name"?a.key.localeCompare(b.key):sort==="stars"?b.stars-a.stars:
      (Date.parse(b.pushedAt||"")||0)-(Date.parse(a.pushedAt||"")||0));
    return rows;
  },[all,owner,query,sort]);
  const success=OWNERS.filter(o=>results[o]?.state==="live").length;
  const failures=OWNERS.filter(o=>results[o]?.state==="error");
  const card="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-sm";
  return <section className="space-y-4" aria-label="Live public GitHub repository command center">
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">GitHub API · Public repositories</p>
          <h2 className="mt-1 text-xl font-bold">Live repository operations</h2>
          <p className="mt-1 text-xs text-muted-foreground">All three accounts · automatically checks again every 10 minutes while open · preserved snapshots if requests fail</p>
        </div>
        <button type="button" disabled={busy} onClick={()=>void refresh(true)} className="btn-secondary inline-flex items-center gap-2 text-xs">
          <RefreshCw size={14} className={busy?"animate-spin":""}/>{busy?"Checking accounts…":"Refresh all accounts"}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Verified repositories",all.length],["Accounts updated",success+"/3"],
          ["Archived repos",all.filter(r=>r.archived).length],["Open issues (GitHub)",all.reduce((s,r)=>s+r.openIssues,0)]]
          .map(([label,value])=><div key={label} className="rounded-xl border border-border/40 bg-secondary/30 p-3"><p className="text-lg font-bold tabular-nums">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">{OWNERS.map(o=>{
        const r=results[o];return <div key={o} className="rounded-xl border border-border/40 px-3 py-2 text-xs">
          <p className="font-semibold">{o}</p><p className="mt-1 text-muted-foreground">{r?.state==="live"?"Fresh API result":r?.state==="error"?"Refresh failed; previous result retained":"Not fetched"} · {r?.repositories.length||0} public repos</p>
          {r?.error&&<p role="status" className="mt-1 text-amber-600 dark:text-amber-400">{r.error}</p>}
        </div>})}</div>
      <p className="mt-3 text-xs text-muted-foreground" role="status">
        {checkedAt?`Last attempted ${new Date(checkedAt).toLocaleString()} · ${success}/3 accounts verified this run`:"Live refresh not completed"}
        {failures.length?" · Partial coverage — counts exclude accounts that have never loaded":""}
      </p>
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_10rem]">
      <label className="relative"><Search size={15} className="absolute left-3 top-3 text-muted-foreground"/><span className="sr-only">Find repository</span><input value={query} onChange={e=>{setQuery(e.target.value);setVisible(30);}} placeholder="Find a repo, technology, description…" className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm"/></label>
      <select aria-label="GitHub account" value={owner} onChange={e=>{setOwner(e.target.value);setVisible(30);}} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="all">All accounts</option>{OWNERS.map(o=><option key={o} value={o}>{o}</option>)}</select>
      <select aria-label="Sort repositories" value={sort} onChange={e=>setSort(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="pushed">Recently pushed</option><option value="name">Repository name</option><option value="stars">Most starred</option></select>
    </div>
    <p className="text-xs text-muted-foreground">{filtered.length} matching public repositories · showing {Math.min(visible,filtered.length)}</p>
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{filtered.slice(0,visible).map((r:LiveRepo)=><article className={card} key={r.key}>
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[11px] text-primary">{r.owner}</p><h3 className="break-all font-bold">{r.name}</h3></div><span className="rounded-lg bg-secondary px-2 py-1 text-[10px]">{r.archived?"Archived":r.fork?"Fork":"Public"}</span></div>
      <p className="mt-2 line-clamp-2 min-h-10 text-xs text-muted-foreground">{r.description||"No repository description provided."}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-lg bg-secondary px-2 py-1">{r.language||"Unknown language"}</span><span>{r.stars} stars</span><span>{r.forks} forks</span><span>{r.openIssues} open issues/PRs</span></div>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 size={12}/>Last pushed: {r.pushedAt?new Date(r.pushedAt).toLocaleDateString():"Not reported"}</p>
      <div className="mt-3 flex flex-wrap gap-3 border-t border-border/40 pt-3 text-xs font-semibold">
        <a className="text-primary" href={r.url} target="_blank" rel="noopener noreferrer">Code <ExternalLink size={11} className="inline"/></a>
        <a className="text-primary" href={r.url+"/pulls"} target="_blank" rel="noopener noreferrer"><GitPullRequest size={11} className="inline"/> PRs</a>
        <a className="text-primary" href={r.url+"/issues"} target="_blank" rel="noopener noreferrer"><CircleDot size={11} className="inline"/> Issues</a>
        <a className="text-primary" href={r.url+"/actions"} target="_blank" rel="noopener noreferrer"><Workflow size={11} className="inline"/> CI</a>
        <button type="button" className="text-primary" onClick={()=>setExpanded(expanded===r.key?null:r.key)}>Details</button>
      </div>
      {expanded===r.key&&<dl className="mt-3 space-y-1 border-t border-border/40 pt-3 text-xs"><dt className="text-muted-foreground">Default branch</dt><dd>{r.defaultBranch||"Unknown"}</dd><dt className="text-muted-foreground">Last API update</dt><dd>{r.updatedAt?new Date(r.updatedAt).toLocaleString():"Not reported"}</dd>{r.homepage?.startsWith("https://")&&<><dt className="text-muted-foreground">Reported homepage (uptime unverified)</dt><dd><a className="break-all text-primary" href={r.homepage} target="_blank" rel="noopener noreferrer">{r.homepage}</a></dd></>}</dl>}
    </article>)}</div>
    {!filtered.length&&<p className={card}>{busy?"Loading GitHub repositories…":"No repositories match the current selection, or live inventory is unavailable."}</p>}
    {visible<filtered.length&&<button className="btn-secondary text-sm" onClick={()=>setVisible(v=>v+30)}>Load more ({filtered.length-visible} remaining)</button>}
    <p className="text-xs text-muted-foreground">Public API counts can include open pull requests in GitHub's open_issues_count. Private repositories require separate authenticated server-side access. This view does not assume live applications or healthy deployments.</p>
  </section>;
}
