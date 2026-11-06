import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, Loader2 } from "lucide-react";
import { checkRankings } from "@/lib/growthData.functions";
import { cleanKeywords, MAX_KEYWORDS, type RankCheck } from "@/lib/rankCheck";
import { readOwnerPasscode } from "@/lib/ownerPasscode";

const LOCATIONS = [{ code: 2840, label: "United States" }, { code: 2826, label: "United Kingdom" }, { code: 2300, label: "Greece" }, { code: 2124, label: "Canada" }, { code: 2036, label: "Australia" }];

function posClass(p: number | null) {
  if (p === null) return "text-muted-foreground";
  if (p <= 3) return "text-success";
  if (p <= 10) return "text-primary";
  if (p <= 20) return "text-warning";
  return "text-muted-foreground";
}

export default function RankCheckPanel({ sites }: { sites: string[] }) {
  const run = useServerFn(checkRankings);
  const [domain, setDomain] = useState(sites[0] ?? "");
  const [raw, setRaw] = useState("");
  const [location, setLocation] = useState(2840);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<RankCheck | null>(null);
  const kws = cleanKeywords(raw);

  async function go() {
    if (!readOwnerPasscode()) { setErr("Unlock the dashboard first."); return; }
    setBusy(true); setErr(null);
    try { setRes(await run({ data: { domain, keywords: kws, location } })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="card-glass space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold"><Crosshair size={15} className="text-primary" />Live Google rank check</div>
          <p className="text-[11px] text-muted-foreground">Powered by DataForSEO. Runs only when you press Check — about $0.002 per keyword, repeat checks within 6 hours are free.</p>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_160px]">
        <input list="rank-sites" className="rounded-lg border border-border bg-background px-3 py-2 text-xs" placeholder="yoursite.com" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Website" />
        <datalist id="rank-sites">{sites.map((s) => <option key={s} value={s} />)}</datalist>
        <select className="rounded-lg border border-border bg-background px-2 py-2 text-xs" value={location} onChange={(e) => setLocation(Number(e.target.value))} aria-label="Country">
          {LOCATIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <textarea className="min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" placeholder={`Up to ${MAX_KEYWORDS} keywords, one per line or comma-separated`} value={raw} onChange={(e) => setRaw(e.target.value)} aria-label="Keywords" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{kws.length}/{MAX_KEYWORDS} keywords · est. ${(kws.length * 0.002).toFixed(3)}</span>
        <button type="button" className="btn-primary" disabled={busy || !kws.length || domain.trim().length < 3} onClick={go}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}Check rankings
        </button>
      </div>
      {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs">{err}</div>}
      {res && (
        <div className="overflow-x-auto">
          <div className="mb-1 text-[11px] text-muted-foreground">{res.domain} · {new Date(res.checkedAt).toLocaleString()} · {res.cached ? "from cache (free)" : `cost $${res.costUsd.toFixed(4)}`}</div>
          <table className="w-full min-w-[620px] text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-1.5">Keyword</th><th>Position</th><th>Your page</th><th>#1 result</th><th>Search features</th></tr>
            </thead>
            <tbody>
              {[...res.rows].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)).map((r) => (
                <tr key={r.keyword} className="border-t border-border/60">
                  <td className="py-1.5 font-semibold">{r.keyword}</td>
                  <td className={`font-bold tabular-nums ${posClass(r.position)}`}>{r.position ?? "Not in top 100"}</td>
                  <td className="max-w-[220px] truncate">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-primary">{r.url.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}</td>
                  <td className="text-muted-foreground">{r.topDomain ?? "—"}</td>
                  <td className="text-muted-foreground">{r.serpFeatures.slice(0, 4).join(", ").replace(/_/g, " ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
