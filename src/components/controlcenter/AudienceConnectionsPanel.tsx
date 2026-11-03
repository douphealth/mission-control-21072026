import { CheckCircle2, KeyRound, RefreshCw, Radio } from "lucide-react";
import { useIntelligenceCapabilities } from "@/hooks/useIntelligenceCapabilities";
import { relTime } from "./ui";

export default function AudienceConnectionsPanel() {
  const { capabilities, error, busy, refresh } = useIntelligenceCapabilities();
  const ready = capabilities?.status === "ok";
  const connections = ready ? capabilities.connections : [];
  const publicCount = connections.filter(connection => connection.state === "public-api").length;
  const configuredCount = connections.filter(connection => connection.state === "configured").length;
  const missingCount = connections.filter(connection => connection.state === "missing").length;
  return <section className="cc-panel rounded-2xl border border-border bg-card p-4 sm:p-5" aria-labelledby="audience-connections-heading" data-testid="audience-connections">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="audience-connections-heading" className="text-sm font-semibold text-foreground">Audience connections</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {ready ? `${publicCount} public APIs · ${configuredCount} official integrations configured · ${missingCount} need setup.` : busy ? "Checking which measurement methods this deployment can use." : "Connection status is currently unavailable."}
          {ready && " Configuration does not confirm token permissions or a successful measurement."}
        </p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium disabled:opacity-50">
        <RefreshCw size={15} className={busy ? "animate-spin" : ""} />{busy ? "Checking…" : "Check connections"}
      </button>
    </div>
    {(error || capabilities?.error) && <div role="status" className="mt-3 rounded-xl border border-warning/25 bg-warning/5 p-3 text-sm leading-relaxed text-warning">
      {error || capabilities?.error} Connection states remain unknown until this check succeeds.
    </div>}
    {ready && <>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {connections.map(connection => {
          const Icon = connection.state === "public-api" ? Radio : connection.state === "configured" ? CheckCircle2 : KeyRound;
          return <details key={connection.platform} className="rounded-xl border border-border bg-background p-3">
            <summary className="flex min-h-8 cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-medium">
              <span className="inline-flex items-center gap-2"><Icon size={15} aria-hidden="true" />{connection.label}</span>
              <span className={`rounded-full px-2 py-1 text-xs ${connection.state === "missing" ? "bg-warning/8 text-warning" : "bg-secondary text-muted-foreground"}`}>
                {connection.state === "public-api" ? "Public API" : connection.state === "configured" ? "Configured" : "Setup needed"}
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{connection.fallback}</p>
            {connection.state !== "public-api" && <div className="mt-3 rounded-lg bg-secondary/60 p-2.5 text-xs leading-relaxed">
              <strong>{connection.state === "configured" ? "Configured integration:" : "Required server configuration:"}</strong>
              <p className="mt-1 break-words font-mono">{connection.setup}</p>
              <p className="mt-2 text-muted-foreground">Store the required values as server-side deployment secrets, redeploy, then check connections and refresh the profile.</p>
            </div>}
          </details>;
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Checked {relTime(capabilities.inspectedAt)}. Google sign-in, ChatGPT app connections and saved vault entries do not supply these provider credentials. This check returns configuration status only; it does not call paid providers or reveal secret values.</p>
    </>}
  </section>;
}
