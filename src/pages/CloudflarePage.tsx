import { useCredentials } from "@/hooks/useTableData";
import { useCallback, useEffect, useState } from "react";
import { Cloud, Globe, Zap, ExternalLink, Copy, RefreshCw, Lock, Activity } from "lucide-react";
import { toast } from "sonner";
import { getCloudflareZones, type CloudflareZoneRow } from "@/lib/integrations.functions";
import { TruthBadge, ConnectorEmpty, ConnectorError } from "@/components/TruthUI";
import type { TruthMeta } from "@/lib/truth";

const cfTools = [
  {
    label: "Cloudflare Dashboard",
    url: "https://dash.cloudflare.com",
    icon: "☁️",
    desc: "Main account & zone management",
  },
  {
    label: "DNS Management",
    url: "https://dash.cloudflare.com/?to=/:account/:zone/dns/records",
    icon: "🌐",
    desc: "Manage DNS records",
  },
  {
    label: "SSL/TLS Settings",
    url: "https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls",
    icon: "🔒",
    desc: "HTTPS & certificate config",
  },
  {
    label: "Firewall Rules",
    url: "https://dash.cloudflare.com/?to=/:account/:zone/security/waf",
    icon: "🛡️",
    desc: "Firewall & security rules",
  },
  {
    label: "Page Rules",
    url: "https://dash.cloudflare.com/?to=/:account/:zone/rules/page-rules",
    icon: "📋",
    desc: "URL redirects & caching",
  },
  {
    label: "Analytics",
    url: "https://dash.cloudflare.com/?to=/:account/:zone/analytics",
    icon: "📊",
    desc: "Traffic & bandwidth stats",
  },
  {
    label: "Workers",
    url: "https://dash.cloudflare.com/?to=/:account/workers",
    icon: "⚡",
    desc: "Edge computing & serverless",
  },
  {
    label: "Pages",
    url: "https://dash.cloudflare.com/?to=/:account/pages",
    icon: "🚀",
    desc: "Static site deployments",
  },
  {
    label: "R2 Storage",
    url: "https://dash.cloudflare.com/?to=/:account/r2",
    icon: "📦",
    desc: "Object storage, S3-compatible",
  },
  {
    label: "Turnstile",
    url: "https://dash.cloudflare.com/?to=/:account/turnstile",
    icon: "🤖",
    desc: "CAPTCHA alternative",
  },
  {
    label: "Status Page",
    url: "https://www.cloudflarestatus.com",
    icon: "💚",
    desc: "Cloudflare system status",
  },
  {
    label: "API Docs",
    url: "https://developers.cloudflare.com/api",
    icon: "📖",
    desc: "Cloudflare API reference",
  },
];

const dotFor = (status: string) =>
  status === "active"
    ? "bg-emerald-500"
    : status === "pending"
      ? "bg-amber-500"
      : status === "paused"
        ? "bg-zinc-400"
        : "bg-red-500";

export default function CloudflarePage() {
  const credentials = useCredentials();
  const [zones, setZones] = useState<CloudflareZoneRow[]>([]);
  const [meta, setMeta] = useState<TruthMeta>({
    truthState: "unavailable",
    source: "Cloudflare API",
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getCloudflareZones();
      setZones(r.zones);
      setMeta({
        truthState: r.truthState,
        source: r.source,
        fetchedAt: r.fetchedAt,
        error: r.error,
      });
    } catch (e: any) {
      setZones([]);
      setMeta({
        truthState: "error",
        source: "Cloudflare API",
        fetchedAt: new Date().toISOString(),
        error: String(e?.message ?? e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cfCreds = credentials.filter(
    (c) =>
      c.service.toLowerCase().includes("cloudflare") ||
      c.label.toLowerCase().includes("cloudflare"),
  );

  const copyNs = (ns: string) => {
    navigator.clipboard.writeText(ns);
    toast.success("Nameservers copied");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Cloud size={20} className="text-orange-500" /> Cloudflare
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              DNS, security and CDN — read live from your account
            </p>
            <TruthBadge meta={meta} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className="btn-secondary text-sm">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <a
            href="https://www.cloudflarestatus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/15"
          >
            <Activity size={12} /> System Status
          </a>
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Open Dashboard <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {meta.truthState === "live" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Active Zones",
              value: zones.filter((z) => z.status === "active").length,
              icon: Globe,
              color: "text-blue-500 bg-blue-500/10",
            },
            {
              label: "Paid Zones",
              value: zones.filter((z) => !/free/i.test(z.plan)).length,
              icon: Zap,
              color: "text-amber-500 bg-amber-500/10",
            },
            {
              label: "Saved Credentials",
              value: cfCreds.length,
              icon: Lock,
              color: "text-violet-500 bg-violet-500/10",
            },
            {
              label: "Total Zones",
              value: zones.length,
              icon: Cloud,
              color: "text-emerald-500 bg-emerald-500/10",
            },
          ].map((stat) => (
            <div key={stat.label} className="card-glass flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
              >
                <stat.icon size={17} />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Globe size={15} className="text-primary" /> DNS Zones
          </h2>

          {loading && (
            <div className="card-glass p-6 text-center text-sm text-muted-foreground">
              Loading zones from Cloudflare…
            </div>
          )}

          {!loading && meta.truthState === "not_connected" && (
            <ConnectorEmpty
              title="Cloudflare is not connected"
              description="Add a Cloudflare API token with Zone:Read permission to this project and your real zones will appear here. Until then this page shows nothing — no sample domains."
              docsUrl="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/"
              onRetry={() => void load()}
            />
          )}

          {!loading && meta.truthState === "error" && (
            <ConnectorError message={meta.error ?? "Unknown error"} onRetry={() => void load()} />
          )}

          {!loading && meta.truthState === "live" && zones.length === 0 && (
            <div className="card-glass p-6 text-center text-sm text-muted-foreground">
              Connected — this Cloudflare account has no zones.
            </div>
          )}

          <div className="space-y-2">
            {zones.map((zone) => (
              <div key={zone.id} className="card-elevated group flex items-center gap-4 p-4">
                <span className={`inline-block h-2 w-2 rounded-full ${dotFor(zone.status)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{zone.name}</span>
                    <span className="badge badge-muted">{zone.plan}</span>
                    <span
                      className={`badge capitalize ${zone.status === "active" ? "badge-success" : "badge-warning"}`}
                    >
                      {zone.status}
                    </span>
                  </div>
                  {zone.nameservers.length > 0 && (
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      ns: {zone.nameservers.join(" / ")}
                      <button
                        className="ml-2 transition-colors hover:text-foreground"
                        onClick={() => copyNs(zone.nameservers.join("\n"))}
                      >
                        <Copy size={9} />
                      </button>
                    </div>
                  )}
                </div>
                <a
                  href={`https://dash.cloudflare.com/?to=/:account/${zone.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground/40 transition-colors hover:text-primary"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Lock size={15} className="text-primary" /> Saved Accounts
          </h2>
          {cfCreds.length > 0 ? (
            cfCreds.map((cred) => (
              <div key={cred.id} className="card-glass space-y-1.5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground">{cred.label}</div>
                  <TruthBadge state="manual" />
                </div>
                <div className="truncate text-xs text-muted-foreground">{cred.username}</div>
                {cred.url && (
                  <a
                    href={cred.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    Open <ExternalLink size={9} />
                  </a>
                )}
              </div>
            ))
          ) : (
            <div className="card-glass p-4 text-center text-sm text-muted-foreground">
              <Lock size={20} className="mx-auto mb-2 opacity-40" />
              <div>No Cloudflare credentials saved</div>
              <div className="mt-1 text-xs">
                Add them in <strong>Credential Vault</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Zap size={15} className="text-primary" /> Quick Access
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {cfTools.map((tool) => (
            <a
              key={tool.label}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-glass group block p-3.5 transition-all hover:border-primary/20"
            >
              <div className="mb-2 text-xl">{tool.icon}</div>
              <div className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                {tool.label}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                {tool.desc}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
