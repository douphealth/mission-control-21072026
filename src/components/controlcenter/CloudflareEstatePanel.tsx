import { useEffect, useMemo, useState } from "react";
import { Database, ExternalLink, HardDrive, RefreshCw, Search, Server, Workflow } from "lucide-react";
import { getCloudflareEstate, getCloudflareWorkerDetails,
  type CloudflareEstate, type CloudflareAsset, type CloudflareWorkerDetails } from "@/lib/cloudflareEstate.functions";
import type { CloudflareDeploymentRow, CloudflareInventory } from "@/lib/cloudflareInventory.server";

const serviceLabel = { d1: "D1 databases", kv: "KV namespaces", r2: "R2 buckets", queues: "Queues" } as const;
const serviceIcons = { d1: Database, kv: HardDrive, r2: HardDrive, queues: Workflow } as const;
export default function CloudflareEstatePanel({ inventory, enabled }: {
  inventory: CloudflareInventory | null; enabled: boolean;
}) {
  const [estate, setEstate] = useState<CloudflareEstate | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [account, setAccount] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [worker, setWorker] = useState<CloudflareWorkerDetails | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState("");
  const load = async () => {
    setLoading(true); setFailure(null);
    try { setEstate(await getCloudflareEstate()); }
    catch { setFailure("Cloudflare resource inventory unavailable. Check Access and server-side token scopes."); setEstate(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (enabled) void load(); else setEstate(null); }, [enabled]);
  const workers = useMemo(() => (inventory?.rows || []).filter(row => row.kind === "worker"), [inventory]);
  const all = useMemo(() => [
    ...(estate?.assets || []).map(a => ({
      key: a.key, kind: a.kind as string, name: a.name, accountId: a.accountId,
      link: a.dashboardUrl, detail: [a.jurisdiction ? "Jurisdiction: " + a.jurisdiction : "", ...a.details].filter(Boolean),
      worker: null as CloudflareDeploymentRow | null,
    })),
    ...workers.map(row => ({
      key: row.key, kind: "worker", name: row.name, accountId: row.accountId,
      link: row.projectUrl, detail: [...row.domains, ...row.routes], worker: row,
    })),
  ], [estate, workers]);
  const filtered = all.filter(r => (kind === "all" || r.kind === kind) &&
    (account === "all" || r.accountId === account) &&
    [r.name, r.kind, ...r.detail].join(" ").toLowerCase().includes(query.toLowerCase().trim()));
  const names = new Map(inventory?.accountDetails.map(a => [a.accountId, a.label]) || []);
  const inspect = async (row: CloudflareDeploymentRow) => {
    setSelectedWorker(row.name); setWorker(null); setWorkerError(null); setWorkerLoading(true);
    try { setWorker(await getCloudflareWorkerDetails({ data: { accountId: row.accountId, name: row.name } })); }
    catch { setWorkerError("Could not retrieve Worker metadata. Confirm account API read permissions."); }
    finally { setWorkerLoading(false); }
  };
  return <section aria-label="Cloudflare infrastructure estate" className="space-y-4">
    <div className="card-glass flex flex-wrap items-center justify-between gap-3 p-4">
      <div><h2 className="text-lg font-bold">Infrastructure estate</h2>
        <p className="mt-1 text-xs text-muted-foreground">All available Workers, D1, KV, R2 and Queues across authorized accounts. No secrets or storage contents are read.</p>
        <p className="mt-1 text-xs text-muted-foreground">This is API inventory, not verified uptime. Inaccessible services are never counted as zero.</p></div>
      <button className="btn-secondary text-xs" type="button" disabled={!enabled || loading} onClick={() => void load()}>
        <RefreshCw size={13} className={loading ? "animate-spin" : ""}/> Refresh resources</button>
    </div>
    {failure && <p className="rounded-xl border border-destructive/40 p-3 text-sm" role="alert">{failure}</p>}
    {loading && <p role="status" className="text-sm text-muted-foreground">Checking account resources…</p>}
    {estate && <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {(["worker", "d1", "kv", "r2", "queues"] as const).map(type => {
          const count = type === "worker" ? workers.length : estate.assets.filter(a => a.kind === type).length;
          const checks = estate.checks.filter(c => c.service === type);
          const complete = type === "worker" ? inventory?.accountDetails.every(a => a.truthState === "live") :
            checks.length > 0 && checks.every(c => c.state === "live");
          const Icon = type === "worker" ? Server : serviceIcons[type];
          return <div key={type} className="card-glass p-3">
            <Icon size={15} className="text-primary"/>
            <p className="mt-2 text-xl font-semibold tabular-nums">{count}{!complete ? "+" : ""}</p>
            <p className="text-xs">{type === "worker" ? "Workers" : serviceLabel[type]}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{complete ? "API inventory complete" : "Coverage partial / unverified"}</p>
          </div>;
        })}
      </div>
      {estate.checks.some(c => c.state !== "live") && <details className="rounded-xl border border-amber-500/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold">API coverage warnings — {estate.checks.filter(c => c.state !== "live").length} endpoint(s)</summary>
        <div className="mt-2 space-y-1 text-xs">{estate.checks.filter(c => c.state !== "live").map(c =>
          <p key={c.key}>{c.accountLabel} · {c.service.toUpperCase()} · {c.scope}: {c.error || c.state}</p>)}</div>
      </details>}
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="relative"><Search size={14} className="absolute left-3 top-3 text-muted-foreground"/>
          <input className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm" value={query}
            onChange={e => setQuery(e.target.value)} placeholder="Search all Cloudflare resources" aria-label="Search Cloudflare assets"/></label>
        <select className="rounded-xl border border-border bg-background p-2 text-sm" value={kind} onChange={e => setKind(e.target.value)} aria-label="Cloudflare resource type">
          <option value="all">All resource types</option><option value="worker">Workers</option>
          {Object.entries(serviceLabel).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>
        <select className="rounded-xl border border-border bg-background p-2 text-sm" value={account} onChange={e => setAccount(e.target.value)} aria-label="Cloudflare account">
          <option value="all">All accounts</option>{(inventory?.accounts || estate.accounts).map(id => <option key={id} value={id}>{names.get(id) || "Account …" + id.slice(-6)}</option>)}</select>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} matching resources · Updated {new Date(estate.fetchedAt).toLocaleString()}</p>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{filtered.map(r =>
        <article key={r.key} className="card-elevated min-w-0 rounded-xl p-3">
          <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span>{r.kind.toUpperCase()}</span><span>{names.get(r.accountId) || "Account …" + r.accountId.slice(-6)}</span></div>
          <p className="mt-2 break-all font-semibold">{r.name}</p>
          {r.detail.length > 0 && <p className="mt-1 break-words text-xs text-muted-foreground">{r.detail.join(" · ")}</p>}
          <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-2 text-xs">
            <a href={r.link} rel="noopener noreferrer" target="_blank" className="inline-flex items-center gap-1 text-primary">Cloudflare <ExternalLink size={12}/></a>
            {r.worker && <button type="button" className="text-primary" onClick={() => void inspect(r.worker!)}>Inspect bindings & triggers</button>}
          </div>
        </article>)}</div>
      {filtered.length === 0 && <p className="text-xs text-muted-foreground">No matching resources in available API results. Review coverage before treating an account as empty.</p>}
    </>}
    {(workerLoading || worker || workerError) && <div className="card-glass space-y-3 p-4" aria-label="Worker topology">
      <div className="flex justify-between gap-3"><h3 className="font-semibold">Worker configuration — {selectedWorker}</h3>
        <button type="button" className="btn-secondary text-xs" onClick={() => {setWorker(null);setWorkerError(null);setWorkerLoading(false);}}>Close</button></div>
      {workerLoading && <p className="text-sm">Loading permitted Worker metadata…</p>}
      {workerError && <p role="alert" className="text-sm text-amber-500">{workerError}</p>}
      {worker && <><p className="text-xs text-muted-foreground">Only binding names, types and resource references are shown. Secret and plaintext values are never returned.</p>
        <p className="text-xs">workers.dev: {worker.workersDevUrl || "Not verified as enabled"}</p>
        <p className="text-xs">Observability: {worker.observability === null ? "Unknown" : worker.observability ? "Enabled" : "Disabled"} · Logs: {worker.logs === null ? "Unknown" : worker.logs ? "Enabled" : "Disabled"}</p>
        <div><h4 className="text-sm font-semibold">Bindings ({worker.bindings.length})</h4>
          {worker.bindings.map(b => <p key={b.name} className="break-words text-xs">{b.name} · {b.type}{b.target ? " · " + b.target : ""}</p>)}</div>
        <div><h4 className="text-sm font-semibold">Cron schedules ({worker.crons.length})</h4>
          {worker.crons.map(c => <p key={c} className="text-xs">{c}</p>)}</div>
        {worker.checks.filter(c => c.state === "error").map(c => <p key={c.section} className="text-xs text-amber-500">{c.section}: {c.error}</p>)}
      </>}
    </div>}
  </section>;
}
