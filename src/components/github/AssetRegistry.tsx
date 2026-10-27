import { useCallback,useEffect,useMemo,useState } from "react";
import { Download,ExternalLink,RefreshCw,Search,ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useBuildProjects,useRepos } from "@/hooks/useTableData";
import { OWNERS,fetchOwnerRepos,cachedOwners,retainOwnerResult,type OwnerResult } from "@/lib/liveGitHub";
import { buildAssetRegistry,exportRegistryCsv } from "@/lib/assetRegistry";
import { getCloudflareControl } from "@/lib/cloudflareControl.functions";
import type { CloudflareDeploymentRow } from "@/lib/cloudflareInventory.server";

const card="rounded-2xl border border-border/60 bg-card/85 p-4";
const link=(href:string,label:string)=>href?<a className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline" href={href} target="_blank" rel="noopener noreferrer" title={href}>{label}<ExternalLink size={11}/></a>:<span className="text-muted-foreground">Not linked</span>;
export default function AssetRegistry(){
  const saved=useRepos(),apps=useBuildProjects();
  const [owners,setOwners]=useState<Record<string,OwnerResult>>(cachedOwners);
  const [cloud,setCloud]=useState<CloudflareDeploymentRow[]>([]);
  const [cfState,setCfState]=useState("Not checked");
  const [busy,setBusy]=useState(false);
  const [checked,setChecked]=useState("");
  const [query,setQuery]=useState("");
  const [account,setAccount]=useState("all");
  const [filter,setFilter]=useState("all");
  const [order,setOrder]=useState("name");
  const [limit,setLimit]=useState(40);
  const [expanded,setExpanded]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    setBusy(true);
    try{
      const [ownerResults,cfResult]=await Promise.all([
        Promise.all(OWNERS.map(o=>fetchOwnerRepos(o))),
        getCloudflareControl().then(result=>({ok:true as const,result}),()=>({ok:false as const})),
      ]);
      setOwners(previous=>{
        const updated={...previous};
        for(const next of ownerResults)updated[next.owner]=retainOwnerResult(next);
        return updated;
      });
      if(cfResult.ok){
        setCfState(cfResult.result.status+(cfResult.result.message?": "+cfResult.result.message:""));
        if(cfResult.result.inventory)setCloud(cfResult.result.inventory.rows);
      }else setCfState("Connector unavailable; retaining prior Cloudflare snapshot");
      setChecked(new Date().toISOString());
    }finally{setBusy(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const live=useMemo(()=>OWNERS.flatMap(o=>owners[o]?.repositories||[]),[owners]);
  const registry=useMemo(()=>buildAssetRegistry(apps,saved,live,cloud),[apps,saved,live,cloud]);
  const rows=useMemo(()=>{
    const q=query.toLowerCase().trim();
    const selected=registry.filter(r=>(account==="all"||r.account.toLowerCase()===account.toLowerCase())&&
      (filter==="all"||filter==="missing"&&(!r.productionUrl||!r.repoUrl||!r.cloudflareUrl)||
        filter==="apps"&&Boolean(r.productionUrl)||filter==="cloudflare"&&Boolean(r.cloudflareUrl)||
        filter==="attention"&&Boolean(r.nextAction))&&
      (!q||[r.app,r.productionUrl,r.repoUrl,r.cloudflareUrl,r.account,r.nextAction,r.parentWebsite].join(" ").toLowerCase().includes(q)));
    selected.sort((a,b)=>order==="priority"?
      ({critical:0,high:1,medium:2,low:3}[a.priority as "critical"|"high"|"medium"|"low"]??2)-({critical:0,high:1,medium:2,low:3}[b.priority as "critical"|"high"|"medium"|"low"]??2):
      order==="account"?a.account.localeCompare(b.account)||a.app.localeCompare(b.app):a.app.localeCompare(b.app));
    return selected;
  },[registry,account,filter,query,order]);
  const csv=()=>{const blob=new Blob([exportRegistryCsv(rows)],{type:"text/csv;charset=utf-8"});const blobUrl=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=blobUrl;a.download="mission-control-assets.csv";a.click();setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
    toast.success("Registry exported");};
  return <section className="space-y-3" aria-label="Apps and infrastructure registry">
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Apps & Infrastructure Registry</h2>
        <p className="mt-1 text-xs text-muted-foreground">One row per matched app/repo/resource · known mappings first · no guessed deployment ownership</p></div>
        <div className="flex gap-2"><button type="button" className="btn-secondary inline-flex gap-1 text-xs" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={13} className={busy?"animate-spin":""}/>Refresh</button>
          <button type="button" className="btn-secondary inline-flex gap-1 text-xs" onClick={csv}><Download size={13}/>CSV</button></div></div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{registry.length} assets</span><span>{registry.filter(r=>r.productionUrl).length} linked app URLs</span><span>{registry.filter(r=>r.repoUrl).length} GitHub repos</span><span>{registry.filter(r=>r.cloudflareUrl).length} Cloudflare links</span></div>
      <div className="mt-2 text-xs text-muted-foreground" role="status">GitHub: {OWNERS.map(o=>o+" "+(owners[o]?.state||"not checked")).join(" · ")} · Cloudflare: {cfState}{checked?" · Checked "+new Date(checked).toLocaleTimeString():""}</div>
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_9rem]">
      <label className="relative"><span className="sr-only">Search assets</span><Search size={14} className="absolute left-3 top-3 text-muted-foreground"/><input className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm" value={query} onChange={e=>{setQuery(e.target.value);setLimit(40)}} placeholder="Search apps, URLs, repos, projects…"/></label>
      <select className="rounded-xl border border-border bg-card px-2 text-sm" aria-label="Filter GitHub account" value={account} onChange={e=>setAccount(e.target.value)}><option value="all">All GitHub accounts</option>{OWNERS.map(o=><option key={o} value={o}>{o}</option>)}</select>
      <select className="rounded-xl border border-border bg-card px-2 text-sm" aria-label="Filter assets" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All assets</option><option value="apps">With live URL</option><option value="cloudflare">With Cloudflare</option><option value="missing">Missing links</option><option value="attention">Next action recorded</option></select>
      <select className="rounded-xl border border-border bg-card px-2 text-sm" aria-label="Sort assets" value={order} onChange={e=>setOrder(e.target.value)}><option value="name">App A–Z</option><option value="priority">Priority</option><option value="account">Account</option></select>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/85">
      <table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b border-border/50 bg-secondary/50"><tr><th className="p-3">App / Asset</th><th className="p-3">All URL / Production</th><th className="p-3">GitHub Repo</th><th className="p-3">Cloudflare Pages / Workers</th><th className="p-3">Manage</th></tr></thead>
        <tbody>{rows.slice(0,limit).map(r=><tr key={r.id} className="border-b border-border/30 align-top hover:bg-secondary/30">
          <td className="max-w-[220px] p-3"><strong>{r.app}</strong><p className="mt-1 text-[10px] text-muted-foreground">{r.account||"No repository"} · {r.priority}</p></td>
          <td className="max-w-[250px] p-3">{link(r.productionUrl,r.productionUrl?new URL(r.productionUrl).host:"")}</td>
          <td className="max-w-[250px] p-3">{link(r.repoUrl,r.repoUrl?r.repoUrl.replace("https://github.com/",""):"")}</td>
          <td className="max-w-[260px] p-3">{link(r.cloudflareUrl,r.cloudflareUrl?"Open "+(r.deployedKind==="worker"?"Worker":"Cloudflare project"):"")}</td>
          <td className="p-3"><button type="button" className="inline-flex items-center gap-1 text-primary" onClick={()=>setExpanded(expanded===r.id?null:r.id)}>Details <ChevronDown size={12}/></button>
          {expanded===r.id&&<div className="mt-2 w-52 space-y-2 text-xs"><p>Link evidence: {r.linkSource}</p><p>Parent: {r.parentWebsite||"Not recorded"}</p><p>Next: {r.nextAction||"Not recorded"}</p>
            {r.liveRepo&&<p>GitHub last push: {r.liveRepo.pushedAt||"Unknown"}</p>}
            {r.repoUrl&&<div className="flex flex-wrap gap-2">{link(r.repoUrl+"/actions","CI")}{link(r.repoUrl+"/pulls","PRs")}{link(r.repoUrl+"/issues","Issues")}</div>}</div>}</td>
        </tr>)}</tbody></table>
      {!rows.length&&<p className="p-6 text-sm text-muted-foreground">No assets match these filters.</p>}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Showing {Math.min(rows.length,limit)} of {rows.length} · Cloudflare links are not uptime proofs</span>{limit<rows.length&&<button className="btn-secondary" onClick={()=>setLimit(v=>v+40)}>Load 40 more</button>}</div>
  </section>;
}
