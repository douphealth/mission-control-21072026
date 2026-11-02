import { useEffect } from "react";
import { ExternalLink, Lock } from "lucide-react";
import { TruthBadge } from "@/components/TruthUI";
import CloudflareCommandCenter from "@/components/estate/CloudflareCommandCenter";
import { useCredentials } from "@/hooks/useTableData";
import { useEstate } from "@/hooks/useEstate";
import { db } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import type { EstateSnapshot } from "@/lib/estate/types";

const cfTools = [
  {
    label: "Cloudflare dashboard",
    url: "https://dash.cloudflare.com",
    desc: "Accounts, zones and billing",
  },
  {
    label: "Zero Trust / Access",
    url: "https://one.dash.cloudflare.com",
    desc: "Who can open Mission Control",
  },
  {
    label: "API tokens",
    url: "https://dash.cloudflare.com/profile/api-tokens",
    desc: "Rotate the server tokens",
  },
  { label: "System status", url: "https://www.cloudflarestatus.com", desc: "Cloudflare incidents" },
  {
    label: "API reference",
    url: "https://developers.cloudflare.com/api",
    desc: "Endpoints and scopes",
  },
];

/** Record the Cloudflare connector state for the Integrations health view. */
function useRecordCloudflareHealth(snapshot: EstateSnapshot | null, live: boolean) {
  const fetchedAt = snapshot?.fetchedAt;
  const truth = snapshot?.cloudflare.truthState;
  const firstError = snapshot?.cloudflare.accounts.find((a) => a.errors.length)?.errors[0];
  useEffect(() => {
    if (!live || !fetchedAt || !truth) return;
    void (async () => {
      const previous = await db.syncHealth.get("cloudflare");
      await db.syncHealth.put({
        id: "cloudflare",
        label: "Cloudflare",
        status:
          truth === "live" || truth === "partial"
            ? "ok"
            : truth === "not_connected"
              ? "not-configured"
              : "error",
        lastAttemptAt: fetchedAt,
        lastSuccessAt:
          truth === "live" || truth === "partial" ? fetchedAt : previous?.lastSuccessAt,
        error: firstError,
        detail: "Authenticated Cloudflare Pages, Workers and DNS snapshot.",
      });
      markCloudRecordDirty("syncHealth", "cloudflare");
      queueCloudPush();
    })().catch(() => console.warn("Cloudflare health state could not be stored locally."));
  }, [live, fetchedAt, truth, firstError]);
}

export default function CloudflarePage() {
  const credentials = useCredentials();
  const estate = useEstate();
  useRecordCloudflareHealth(estate.snapshot, estate.freshness === "live");
  const cfCreds = credentials.filter(
    (c) =>
      c.service.toLowerCase().includes("cloudflare") ||
      c.label.toLowerCase().includes("cloudflare"),
  );

  return (
    <div className="space-y-6">
      <CloudflareCommandCenter />

      <details className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Quick links and saved logins
        </summary>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-2">
            {cfTools.map((t) => (
              <a
                key={t.url}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border/60 bg-background/50 p-3 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-foreground group-hover:text-primary">
                  {t.label} <ExternalLink size={11} />
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{t.desc}</div>
              </a>
            ))}
          </div>
          <div className="space-y-2">
            {cfCreds.length ? (
              cfCreds.map((cred) => (
                <div
                  key={cred.id}
                  className="rounded-xl border border-border/60 bg-background/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">{cred.label}</div>
                    <TruthBadge state="manual" />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{cred.username}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/50 p-4 text-center text-xs text-muted-foreground">
                <Lock size={18} className="mx-auto mb-1.5 opacity-40" />
                No Cloudflare logins saved in the vault. The live data above uses server-side
                tokens, not this vault.
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
