import { useEffect, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { useSyncHealth } from "@/hooks/useTableData";
import { intelligenceCapabilities } from "@/lib/controlCenter.functions";
import { relTime } from "./ui";
type Capabilities = Awaited<ReturnType<typeof intelligenceCapabilities>>;
let cached: { value: Capabilities; at: number } | null = null, pending: Promise<Capabilities> | null = null;
function getCapabilities(refresh = false) {
  if (!refresh && cached && Date.now() - cached.at < 120_000) return Promise.resolve(cached.value);
  if (!pending) pending = intelligenceCapabilities().then(value => { cached = { value, at: Date.now() }; return value; }).finally(() => { pending = null; });
  return pending;
}
export default function CollectorStatusPanel({ kind }: { kind: "feeds" | "mentions" | "audience" | "all" }) {
  const health = useSyncHealth(); const [capabilities, setCapabilities] = useState<Capabilities | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function refresh() { setBusy(true); setError(""); try { setCapabilities(await getCapabilities(true)); } catch { setError("Provider configuration is unavailable. No status is assumed healthy."); } finally { setBusy(false); } }
  useEffect(() => { let live = true; void getCapabilities().then(value => { if (live) setCapabilities(value); }).catch(() => { if (live) setError("Provider configuration could not be read."); }); return () => { live = false; }; }, []);
  const ids = kind === "all" ? ["feeds", "mentions", "audience"] : [kind];
  return <details className="rounded-2xl border border-border bg-card p-4" data-testid={`collector-status-${kind}`}><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><Info size={16} />Data sources, freshness &amp; connection status</summary><div className="mt-4 space-y-3">
    <div className="grid gap-2 sm:grid-cols-3">{ids.map(id => { const item = health.find(entry => entry.id === id); return <div className="rounded-xl bg-secondary/60 p-3 text-xs" key={id}><strong className="capitalize">{id === "feeds" ? "Trends" : id}</strong><span className="ml-2">{item?.status || "Not checked"}</span><p className="mt-2 leading-relaxed">{item?.detail || "Add enabled sources, terms or profiles, then refresh."}</p><p className="mt-2 text-muted-foreground">Last attempt: {item?.lastAttemptAt ? relTime(item.lastAttemptAt) : "Never"}<br />Last complete success: {item?.lastSuccessAt ? relTime(item.lastSuccessAt) : "Not confirmed"}</p>{item?.error && <p className="mt-2 break-words text-amber-700 dark:text-amber-300">{item.error}</p>}</div>; })}</div>
    {error && <p role="status" className="text-sm text-muted-foreground">{error}</p>}
    {capabilities && <><p className="text-xs leading-relaxed text-muted-foreground">News uses public Google News and Bing feeds where reachable. Publishers may block access. An empty search differs from a failed search; identity matching does not guarantee complete web coverage.</p>{(kind === "audience" || kind === "all") && <div className="rounded-xl border border-border p-3 text-xs leading-relaxed"><strong>Official audience integrations configured: </strong>{capabilities.audience.officialPlatforms.join(", ")}. Configuration alone does not prove permissions or profile access.<p className="mt-2">{capabilities.audience.publicPage}</p>{!!capabilities.audience.configurationRequired.length && <details className="mt-3"><summary className="cursor-pointer font-semibold">Missing optional integrations and environment variable names</summary><p className="mt-2">{capabilities.audience.configurationRequired.join("; ")}</p><p className="mt-2">Set credentials only in deployment secrets, never in this panel or the public repository.</p></details>}</div>}<p className="text-xs">Paid intelligence calls: <strong>{capabilities.paidEnabled ? "Explicitly enabled on server" : "Disabled by default"}</strong>. DataForSEO and paid ranking require explicit server opt-in. Configuration inspected {relTime(capabilities.inspectedAt)}.</p></>}
    <button type="button" disabled={busy} onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold"><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Check configuration</button>
  </div></details>;
}
