import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ExternalLink, RefreshCw, Search, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getSearchPerformance } from "@/lib/growthData.functions";
import { mergeDaily, pctChange, quickWins, sumTotals, type Engine, type SearchPerformance, type SiteSearch } from "@/lib/searchPerformance";
import { readOwnerPasscode } from "@/lib/ownerPasscode";
import OwnerUnlock from "@/components/OwnerUnlock";
import RankCheckPanel from "./RankCheckPanel";
import { Delta, Kpi, Segmented, Spark, chartTooltip, nf, pf } from "./GrowthUI";

type Days = 7 | 28 | 90;

export default function SearchPerformanceDashboard() {
  const load = useServerFn(getSearchPerformance);
  const [days, setDays] = useState<Days>(28);
  const [engine, setEngine] = useState<Engine>("all");
  const [focus, setFocus] = useState<string>("all");
  const [tab, setTab] = useState<"queries" | "pages">("queries");
  const [filter, setFilter] = useState("");
  const [data, setData] = useState<SearchPerformance | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const run = useCallback(async () => {
    if (!readOwnerPasscode()) { setUnlocked(false); return; }
    setUnlocked(true); setBusy(true); setErr(null);
    try { setData(await load({ data: { days } })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, [days, load]);
  useEffect(() => { void run(); }, [run]);

  const sites = useMemo(() => (data?.sites ?? []).filter((s) => focus === "all" || s.host === focus), [data, focus]);
  const cur = sumTotals(sites, engine, "current");
  const prev = sumTotals(sites, engine, "previous");
  const series = useMemo(() => mergeDaily(sites, engine), [sites, engine]);
  const wins = useMemo(() => quickWins(sites), [sites]);
  const rows = useMemo(() => {
    const out: { key: string; host: string; engine: string; clicks: number; impressions: number; ctr: number; position: number | null }[] = [];
    for (const s of sites) for (const [name, d] of [["Google", s.google], ["Bing", s.bing]] as const) {
      if (!d || (engine !== "all" && engine !== name.toLowerCase())) continue;
      for (const r of tab === "queries" ? d.topQueries : d.topPages) out.push({ ...r, host: s.host, engine: name });
    }
    const f = filter.toLowerCase();
    return out.filter((r) => !f || r.key.toLowerCase().includes(f)).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 60);
  }, [sites, engine, tab, filter]);

  if (!unlocked) return <section className="space-y-3"><Header /><OwnerUnlock onUnlocked={run} /></section>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Header sub={data ? `${data.range.start} → ${data.range.end} · vs previous ${days} days · Google data lags ~2 days` : "Loading live search data…"} />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={engine} onChange={setEngine} options={[{ value: "all", label: "All engines" }, { value: "google", label: "Google" }, { value: "bing", label: "Bing" }]} />
          <Segmented value={days} onChange={setDays} options={[{ value: 7, label: "7d" }, { value: 28, label: "28d" }, { value: 90, label: "90d" }]} />
          <select className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" value={focus} onChange={(e) => setFocus(e.target.value)} aria-label="Site">
            <option value="all">All sites ({data?.sites.length ?? 0})</option>
            {data?.sites.map((s) => <option key={s.host} value={s.host}>{s.host}</option>)}
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
        <Kpi label="Clicks" value={nf.format(cur.clicks)} delta={<Delta pct={pctChange(cur.clicks, prev.clicks)} />} hint={`${nf.format(prev.clicks)} previous period`} />
        <Kpi label="Impressions" value={nf.format(cur.impressions)} accent="info" delta={<Delta pct={pctChange(cur.impressions, prev.impressions)} />} hint={`${nf.format(prev.impressions)} previous period`} />
        <Kpi label="Click-through rate" value={pf(cur.ctr)} accent="success" delta={<Delta pct={pctChange(cur.ctr, prev.ctr)} />} hint={`was ${pf(prev.ctr)}`} />
        <Kpi label="Avg. Google position" value={cur.position ? cur.position.toFixed(1) : "—"} accent="warning"
          delta={cur.position && prev.position ? <Delta pct={pctChange(cur.position, prev.position)} invert /> : undefined} hint="lower is better" />
      </div>

      <div className="card-glass p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold">Daily clicks</span>
          <span className="flex gap-3 text-muted-foreground"><Legend cls="bg-primary" label="Google" /><Legend cls="bg-info" label="Bing" /></span>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => nf.format(v)} />
              <Tooltip {...chartTooltip} />
              {engine !== "bing" && <Area type="monotone" dataKey="google" name="Google clicks" stroke="hsl(var(--primary))" fill="url(#gG)" strokeWidth={2} />}
              {engine !== "google" && <Area type="monotone" dataKey="bing" name="Bing clicks" stroke="hsl(var(--info))" fill="url(#gB)" strokeWidth={2} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-glass overflow-x-auto p-0">
        <div className="border-b border-border px-4 py-3 text-xs font-semibold">Every site · {days} days</div>
        <table className="w-full min-w-[760px] text-xs">
          <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-2">Site</th><th>Google clicks</th><th>Trend</th><th>Impr.</th><th>Pos.</th><th>Bing clicks</th><th>Bing indexed</th><th>Bing crawl errors</th></tr>
          </thead>
          <tbody>
            {(data?.sites ?? []).map((s) => <SiteRow key={s.host} s={s} active={focus === s.host} onPick={() => setFocus(focus === s.host ? "all" : s.host)} />)}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="card-glass min-w-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <Segmented value={tab} onChange={setTab} options={[{ value: "queries", label: "Top searches" }, { value: "pages", label: "Top pages (Google)" }]} />
            <label className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
              <Search size={13} className="text-muted-foreground" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="w-40 bg-transparent outline-none" />
            </label>
          </div>
          <div className="max-h-[440px] overflow-auto">
            <table className="w-full whitespace-nowrap text-xs">
              <thead className="sticky top-0 bg-card text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-2">{tab === "queries" ? "Search" : "Page"}</th><th>Site</th><th>Engine</th><th className="text-right">Clicks</th><th className="text-right">Impr.</th><th className="text-right">CTR</th><th className="pr-4 text-right">Pos.</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="max-w-[320px] truncate px-4 py-1.5 font-medium" title={r.key}>
                      {tab === "pages" ? <a href={r.key} target="_blank" rel="noreferrer" className="hover:text-primary">{r.key.replace(/^https?:\/\/[^/]+/, "") || "/"}</a> : r.key}
                    </td>
                    <td className="text-muted-foreground">{r.host}</td>
                    <td><span className={r.engine === "Google" ? "text-primary" : "text-info"}>{r.engine}</span></td>
                    <td className="text-right tabular-nums">{nf.format(r.clicks)}</td>
                    <td className="text-right tabular-nums">{nf.format(r.impressions)}</td>
                    <td className="text-right tabular-nums">{pf(r.ctr)}</td>
                    <td className="pr-4 text-right tabular-nums">{r.position ? r.position.toFixed(1) : "—"}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">{busy ? "Loading…" : "No rows for this filter."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-glass p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold"><Sparkles size={14} className="text-warning" />Quick wins</div>
          <p className="mb-3 text-[11px] text-muted-foreground">Google searches where you rank 4–20 with real demand. A content refresh can push these onto page one.</p>
          <ul className="space-y-2">
            {wins.map((w, i) => (
              <li key={i} className="rounded-lg border border-border/60 p-2">
                <div className="truncate text-xs font-semibold" title={w.key}>{w.key}</div>
                <div className="mt-0.5 flex justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">{w.host}</span>
                  <span className="tabular-nums">pos {w.position?.toFixed(1)} · {nf.format(w.impressions)} impr.</span>
                </div>
              </li>
            ))}
            {!wins.length && <li className="text-xs text-muted-foreground">{busy ? "Loading…" : "No quick wins in this range."}</li>}
          </ul>
        </div>
      </div>
      <RankCheckPanel key={data?.sites.length ?? 0} sites={(data?.sites ?? []).map((s) => s.host)} />
    </section>
  );
}

function Header({ sub }: { sub?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight">Search performance</h2>
      <p className="text-xs text-muted-foreground">{sub ?? "Live Google Search Console + Bing Webmaster data for every site."}</p>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${cls}`} />{label}</span>;
}

function SiteRow({ s, active, onPick }: { s: SiteSearch; active: boolean; onPick: () => void }) {
  const g = s.google, b = s.bing;
  const errs = s.crawl ? s.crawl.errors4xx + s.crawl.errors5xx : null;
  return (
    <tr onClick={onPick} className={`cursor-pointer border-t border-border/60 hover:bg-muted/30 ${active ? "bg-primary/10" : ""}`}>
      <td className="px-4 py-2 font-semibold">
        <span className="inline-flex items-center gap-1">{s.host}
          <a href={`https://${s.host}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary"><ExternalLink size={11} /></a>
        </span>
        {s.errors.length > 0 && <div className="text-[10px] font-normal text-warning">{s.errors.join(" · ")}</div>}
      </td>
      <td className="tabular-nums">{g ? <span className="inline-flex items-center gap-1.5">{nf.format(g.current.clicks)}<Delta pct={pctChange(g.current.clicks, g.previous.clicks)} /></span> : "—"}</td>
      <td className="w-28 pr-3"><Spark values={(g?.daily ?? []).map((p) => p.clicks)} /></td>
      <td className="tabular-nums">{g ? nf.format(g.current.impressions) : "—"}</td>
      <td className="tabular-nums">{g?.current.position ? g.current.position.toFixed(1) : "—"}</td>
      <td className="tabular-nums">{b ? <span className="inline-flex items-center gap-1.5">{nf.format(b.current.clicks)}<Delta pct={pctChange(b.current.clicks, b.previous.clicks)} /></span> : "—"}</td>
      <td className="tabular-nums">{s.crawl ? nf.format(s.crawl.inIndex) : "—"}</td>
      <td className={`tabular-nums ${errs ? "font-semibold text-destructive" : ""}`}>{errs ?? "—"}</td>
    </tr>
  );
}
