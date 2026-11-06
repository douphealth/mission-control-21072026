import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarClock, Lock, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getSocialPerformance } from "@/lib/growthData.functions";
import { audienceSeries, growth, totalAudience, unifiedBrands, type SocialPerformance } from "@/lib/socialPerformance";
import { readOwnerPasscode } from "@/lib/ownerPasscode";
import OwnerUnlock from "@/components/OwnerUnlock";
import { Delta, Kpi, Segmented, Spark, chartTooltip, nf } from "./GrowthUI";

type Days = 7 | 28 | 90;
const NET_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", threads: "Threads", pinterest: "Pinterest", twitter: "X", linkedin: "LinkedIn", google: "Google Business" };
const label = (n: string) => NET_LABEL[n] ?? NET_LABEL[n.split("_")[0]] ?? n;

export default function SocialPerformanceDashboard() {
  const load = useServerFn(getSocialPerformance);
  const [days, setDays] = useState<Days>(28);
  const [network, setNetwork] = useState("all");
  const [data, setData] = useState<SocialPerformance | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState<"brands" | "analytics" | "accounts">("brands");

  const run = useCallback(async () => {
    if (!readOwnerPasscode()) { setUnlocked(false); return; }
    setUnlocked(true); setBusy(true); setErr(null);
    try { setData(await load({ data: { days } })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, [days, load]);
  useEffect(() => { void run(); }, [run]);

  const brands = useMemo(() => (data?.brands ?? []).map((b) => ({ ...b, channels: b.channels.filter((c) => network === "all" || c.network === network) })), [data, network]);
  const networks = useMemo(() => [...new Set((data?.brands ?? []).flatMap((b) => b.channels.map((c) => c.network)))], [data]);
  const tot = totalAudience(brands);
  const series = useMemo(() => audienceSeries(brands), [brands]);
  const channelCount = brands.reduce((s, b) => s + b.channels.length, 0);
  const pub = data?.publerAccounts ?? [];
  const all = useMemo(() => (data ? unifiedBrands(data) : []), [data]);
  const queued = pub.reduce((s, a) => s + a.scheduled, 0);
  const idle = pub.filter((a) => !a.locked && a.scheduled === 0).length;
  const igReach = brands.flatMap((b) => b.channels).filter((c) => c.network === "instagram").reduce((s, c) => s + c.reach.reduce((x, p) => x + p.value, 0), 0);

  const header = (
    <div>
      <h2 className="text-lg font-bold tracking-tight">Social performance</h2>
      <p className="text-xs text-muted-foreground">Live follower growth from Metricool and your full Publer account roster and post queue.</p>
    </div>
  );
  if (!unlocked) return <section className="space-y-3">{header}<OwnerUnlock onUnlocked={run} /></section>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {header}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={view} onChange={setView} options={[{ value: "brands", label: `Brands (${all.length})` }, { value: "analytics", label: "Growth" }, { value: "accounts", label: `Accounts (${pub.length})` }]} />
          <Segmented value={days} onChange={setDays} options={[{ value: 7, label: "7d" }, { value: 28, label: "28d" }, { value: 90, label: "90d" }]} />
          <select className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" value={network} onChange={(e) => setNetwork(e.target.value)} aria-label="Network">
            <option value="all">All networks</option>
            {networks.map((n) => <option key={n} value={n}>{label(n)}</option>)}
          </select>
          <button type="button" className="btn-secondary" onClick={run} disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Refresh</button>
        </div>
      </div>

      {(err || data?.errors.length) ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />{err ?? data?.errors.join(" · ")}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total followers" value={nf.format(tot.latest)} hint={`${channelCount} tracked channels`} delta={<span className={`text-xs font-semibold tabular-nums ${tot.change >= 0 ? "text-success" : "text-destructive"}`}>{tot.change >= 0 ? "+" : ""}{nf.format(tot.change)}</span>} />
        <Kpi label="Instagram reach" value={nf.format(igReach)} accent="info" hint={`sum over ${days} days`} />
        <Kpi label="Posts queued" value={String(queued)} accent="success" hint="scheduled in Publer" />
        <Kpi label="Accounts with empty queue" value={String(idle)} accent="warning" hint={`of ${pub.length} Publer accounts`} />
      </div>

      {view === "brands" ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {all.map((u) => {
            const chans = u.brand?.channels ?? [];
            const fol = chans.reduce((s, c) => s + (growth(c.followers).latest ?? 0), 0);
            const q = u.accounts.reduce((s, a) => s + a.scheduled, 0);
            const empty = u.accounts.filter((a) => !a.locked && !a.scheduled).length;
            const locked = u.accounts.filter((a) => a.locked).length;
            const nets = [...new Set([...chans.map((c) => c.network), ...u.accounts.map((a) => a.provider)])];
            return (
              <div key={u.key} className="card-glass space-y-3 p-4">
                <div className="flex items-center gap-2">
                  {u.brand?.picture ?? u.accounts[0]?.picture ? <img src={(u.brand?.picture ?? u.accounts[0]?.picture)!} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-muted" />}
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{u.label}</div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <span className={`rounded px-1.5 text-[10px] ${u.brand ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{u.brand ? "Metricool" : "No Metricool"}</span>
                      <span className={`rounded px-1.5 text-[10px] ${u.accounts.length ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}>{u.accounts.length ? `Publer · ${u.accounts.length}` : "No Publer"}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/30 p-2"><div className="text-sm font-bold tabular-nums">{u.brand ? nf.format(fol) : "—"}</div><div className="text-[10px] text-muted-foreground">followers</div></div>
                  <div className="rounded-lg bg-muted/30 p-2"><div className="text-sm font-bold tabular-nums text-success">{q}</div><div className="text-[10px] text-muted-foreground">queued</div></div>
                  <div className="rounded-lg bg-muted/30 p-2"><div className={`text-sm font-bold tabular-nums ${empty ? "text-warning" : ""}`}>{empty}</div><div className="text-[10px] text-muted-foreground">empty queues</div></div>
                </div>
                <div className="flex flex-wrap gap-1">{nets.map((n) => <span key={n} className="rounded-full border border-border px-2 py-0.5 text-[10px]">{label(n)}</span>)}</div>
                {locked > 0 && <div className="text-[11px] text-destructive">{locked} Publer account{locked > 1 ? "s need" : " needs"} reconnecting</div>}
                {!u.brand && <div className="text-[11px] text-muted-foreground">Add this brand in Metricool to see follower growth.</div>}
              </div>
            );
          })}
          {!all.length && <div className="text-xs text-muted-foreground">{busy ? "Loading…" : "No brands found."}</div>}
        </div>
      ) : view === "analytics" ? (
        <>
          <div className="card-glass p-4">
            <div className="mb-2 text-xs font-semibold">Combined audience · daily</div>
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ left: -10, right: 6, top: 6 }}>
                  <defs><linearGradient id="sA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={24} />
                  <YAxis domain={["dataMin", "dataMax"]} width={56} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => Math.round(v).toLocaleString()} />
                  <Tooltip {...chartTooltip} />
                  <Area type="monotone" dataKey="value" name="Followers" stroke="hsl(var(--primary))" fill="url(#sA)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {brands.filter((b) => b.channels.length).map((b) => (
              <div key={b.id} className="card-glass p-4">
                <div className="mb-3 flex items-center gap-2">
                  {b.picture ? <img src={b.picture} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted" />}
                  <div className="min-w-0"><div className="truncate text-sm font-bold">{b.label}</div>{b.url && <a href={b.url} target="_blank" rel="noreferrer" className="truncate text-[11px] text-muted-foreground hover:text-primary">{b.url.replace(/^https?:\/\//, "")}</a>}</div>
                </div>
                <div className="space-y-2">
                  {b.channels.map((c) => {
                    const g = growth(c.followers);
                    return (
                      <div key={c.network} className="grid grid-cols-[92px_1fr_auto] items-center gap-3 rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <div className="min-w-0"><div className="text-xs font-semibold">{label(c.network)}</div><div className="truncate text-[10px] text-muted-foreground">{c.error ?? c.handle ?? ""}</div></div>
                        <Spark values={c.followers.map((p) => p.value)} className={g.change && g.change < 0 ? "text-destructive" : "text-primary"} />
                        <div className="text-right"><div className="text-sm font-bold tabular-nums">{g.latest === null ? "—" : nf.format(g.latest)}</div><Delta pct={g.pct} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {!brands.length && <div className="text-xs text-muted-foreground">{busy ? "Loading…" : "No Metricool brands found."}</div>}
          </div>
        </>
      ) : (
        <div className="card-glass overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-2">Account</th><th>Network</th><th>Workspace</th><th>Queue</th><th>Next post</th><th className="pr-4">Last synced</th></tr>
            </thead>
            <tbody>
              {[...pub].sort((a, b) => a.workspace.localeCompare(b.workspace) || a.provider.localeCompare(b.provider)).map((a) => (
                <tr key={a.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-2"><span className="flex items-center gap-2">
                    {a.picture ? <img src={a.picture} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="h-6 w-6 rounded-full bg-muted" />}
                    <span className="font-semibold">{a.name}</span>{a.locked && <Lock size={11} className="text-destructive" aria-label="Locked" />}
                  </span></td>
                  <td>{label(a.provider)}</td>
                  <td className="text-muted-foreground">{a.workspace}</td>
                  <td>{a.scheduled ? <span className="font-semibold text-success">{a.scheduled} queued</span> : <span className="text-warning">empty</span>}</td>
                  <td className="tabular-nums">{a.nextPost ? <span className="inline-flex items-center gap-1"><CalendarClock size={12} />{new Date(a.nextPost).toLocaleString()}</span> : "—"}</td>
                  <td className="pr-4 text-muted-foreground tabular-nums">{a.lastSync ? new Date(a.lastSync).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {!pub.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">{busy ? "Loading…" : "No Publer accounts found."}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
