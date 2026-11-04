import { useCredentials } from "@/hooks/useTableData";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Boxes,
  Cloud,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  RefreshCw,
  Rocket,
  Search,
  ServerCog,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCloudflareControl } from "@/lib/cloudflareControlClient";
import { cloudflareTruthState, cloudflareSetupRequired } from "@/lib/cloudflareControlState";
import { TruthBadge, ConnectorEmpty, ConnectorError } from "@/components/TruthUI";
import type { TruthMeta } from "@/lib/truth";
import { db } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import CloudflareDeploymentsPanel from "@/components/controlcenter/CloudflareDeploymentsPanel";
import CloudflareEstatePanel from "@/components/controlcenter/CloudflareEstatePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthTile, TileRow, ctl, ctlPrimary } from "@/components/console/ConsoleUI";

type Shortcut = { label: string; url: string; icon: typeof Cloud; desc: string };
/** Account-level destinations. Zone-level ones live on each zone row. */
const ACCOUNT_SHORTCUTS: Shortcut[] = [
  {
    label: "Cloudflare dashboard",
    url: "https://dash.cloudflare.com",
    icon: Cloud,
    desc: "Account & zone management",
  },
  {
    label: "Workers & Pages",
    url: "https://dash.cloudflare.com/?to=/:account/workers-and-pages",
    icon: Rocket,
    desc: "Every Worker and Pages project",
  },
  {
    label: "Workers",
    url: "https://dash.cloudflare.com/?to=/:account/workers",
    icon: Zap,
    desc: "Edge compute & serverless",
  },
  {
    label: "R2 storage",
    url: "https://dash.cloudflare.com/?to=/:account/r2",
    icon: Boxes,
    desc: "S3-compatible object storage",
  },
  {
    label: "Turnstile",
    url: "https://dash.cloudflare.com/?to=/:account/turnstile",
    icon: ShieldCheck,
    desc: "Bot protection without CAPTCHAs",
  },
  {
    label: "API tokens",
    url: "https://dash.cloudflare.com/profile/api-tokens",
    icon: Lock,
    desc: "Create or edit read/deploy tokens",
  },
  {
    label: "System status",
    url: "https://www.cloudflarestatus.com",
    icon: Activity,
    desc: "Cloudflare incident history",
  },
  {
    label: "API reference",
    url: "https://developers.cloudflare.com/api",
    icon: BookOpen,
    desc: "Endpoints and permissions",
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

const TAB_KEY = "mc.cloudflare.tab.v1";
const TABS = ["projects", "infrastructure", "zones", "shortcuts"] as const;
type Tab = (typeof TABS)[number];
function readTab(): Tab {
  try {
    const value = localStorage.getItem(TAB_KEY);
    return TABS.includes(value as Tab) ? (value as Tab) : "projects";
  } catch {
    return "projects";
  }
}

export default function CloudflarePage() {
  const credentials = useCredentials();
  // One shared, deduplicated snapshot powers zones, deployments and the GitHub console.
  const { snapshot: control, loading, failure, load } = useCloudflareControl();
  const inventory = control?.inventory ?? null;
  const zones = inventory?.zones ?? [];
  const [tab, setTab] = useState<Tab>("projects");
  const [zoneQuery, setZoneQuery] = useState("");
  useEffect(() => setTab(readTab()), []);
  const changeTab = (value: string) => {
    const next = TABS.includes(value as Tab) ? (value as Tab) : "projects";
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      /* per-viewer convenience only */
    }
  };

  const meta: TruthMeta = {
    truthState: failure ? "unavailable" : cloudflareTruthState(control?.status ?? null),
    source: "Cloudflare API",
    fetchedAt: control?.fetchedAt,
    error: failure ?? control?.message ?? undefined,
  };
  const connected = meta.truthState === "live" || meta.truthState === "partial";

  useEffect(() => {
    if (!control) return;
    void (async () => {
      try {
        const previous = await db.syncHealth.get("cloudflare");
        await db.syncHealth.put({
          id: "cloudflare",
          label: "Cloudflare",
          status:
            control.status === "live"
              ? "ok"
              : control.status === "partial"
                ? "partial"
                : control.status === "error"
                  ? "error"
                  : "not-configured",
          lastAttemptAt: control.fetchedAt,
          lastSuccessAt:
            control.status === "live" || control.status === "partial"
              ? control.fetchedAt
              : previous?.lastSuccessAt,
          error: control.message ?? undefined,
          detail: "Authenticated Cloudflare Pages, Workers and DNS snapshot.",
        });
        markCloudRecordDirty("syncHealth", "cloudflare");
        queueCloudPush();
      } catch {
        console.warn("Cloudflare health state could not be stored locally.");
      }
    })();
  }, [control]);

  // Never send unresolved :account/:zone placeholders to Cloudflare. With more
  // than one possible target, go to its account selector instead of guessing.
  const resolveAccountUrl = (url: string) => {
    if (!url.includes("/:account")) return url;
    const account = inventory?.accounts.length === 1 ? inventory.accounts[0] : null;
    return account ? url.replace("/:account", "/" + account) : "https://dash.cloudflare.com";
  };
  const zoneLinks = (zone: (typeof zones)[number]) => {
    const base =
      "https://dash.cloudflare.com/?to=/" + zone.accountId + "/" + encodeURIComponent(zone.name);
    return [
      { label: "DNS records", url: zone.dnsUrl },
      { label: "Analytics", url: base + "/analytics" },
      { label: "SSL/TLS", url: base + "/ssl-tls" },
      { label: "Security", url: base + "/security/waf" },
      { label: "Rules", url: base + "/rules" },
    ];
  };

  const cfCreds = credentials.filter(
    (c) =>
      c.service.toLowerCase().includes("cloudflare") ||
      c.label.toLowerCase().includes("cloudflare"),
  );
  const filteredZones = useMemo(() => {
    const needle = zoneQuery.trim().toLowerCase();
    return zones.filter(
      (z) => !needle || [z.name, z.status, z.plan].join(" ").toLowerCase().includes(needle),
    );
  }, [zones, zoneQuery]);

  const copyNs = (ns: string) => {
    void navigator.clipboard.writeText(ns).then(
      () => toast.success("Nameservers copied"),
      () => toast.error("Clipboard access unavailable"),
    );
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <ServerCog size={12} /> Tools / Edge & hosting
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            <Cloud size={26} className="shrink-0 text-orange-500" /> Cloudflare
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TruthBadge meta={meta} />
            <p className="text-xs text-muted-foreground">
              Pages, Workers, infrastructure and DNS across every configured account.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            className={ctl}
            href="https://www.cloudflarestatus.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Activity size={13} className="text-emerald-500" /> System status
          </a>
          <a
            className={ctl}
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dashboard <ExternalLink size={12} />
          </a>
          <button
            type="button"
            className={ctlPrimary}
            disabled={loading}
            onClick={() => void load(true)}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />{" "}
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {!loading && cloudflareSetupRequired(control?.status ?? null) && (
        <section className="card-glass space-y-2 border border-amber-500/30 p-4" role="status">
          <h2 className="text-sm font-semibold">Cloudflare connection setup required</h2>
          <p className="text-xs text-muted-foreground">{control?.message}</p>
          <p className="text-xs text-muted-foreground">
            Connect the Cloudflare Access application and install the read-only account tokens as
            encrypted secrets in the actual production Pages runtime. Browser Credential Vault
            entries do not authorize this server integration.
          </p>
          <a
            href="https://one.dash.cloudflare.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            Cloudflare Zero Trust / Access <ExternalLink size={12} />
          </a>
        </section>
      )}

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="grid h-11 w-full grid-cols-4 rounded-xl sm:inline-grid sm:w-auto">
          <TabsTrigger value="projects" className="gap-1.5">
            <Rocket size={13} /> <span>Projects</span>
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="gap-1.5">
            <ServerCog size={13} /> <span className="hidden sm:inline">Infrastructure</span>
            <span className="sm:hidden">Infra</span>
          </TabsTrigger>
          <TabsTrigger value="zones" className="gap-1.5">
            <Globe size={13} /> <span>Zones{zones.length ? " · " + zones.length : ""}</span>
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-1.5">
            <Zap size={13} /> <span className="hidden sm:inline">Shortcuts</span>
            <span className="sm:hidden">Links</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <CloudflareDeploymentsPanel
            inventory={inventory}
            status={control?.status ?? null}
            loading={loading}
            failure={failure ?? (control?.status === "error" ? control.message : null)}
            onRefresh={() => void load(true)}
          />
        </TabsContent>

        <TabsContent value="infrastructure" className="mt-4">
          <CloudflareEstatePanel inventory={inventory} enabled={Boolean(inventory && connected)} />
        </TabsContent>

        <TabsContent value="zones" className="mt-4 space-y-3.5">
          {connected && (
            <TileRow label="Zone summary">
              <HealthTile
                label="Total zones"
                value={zones.length}
                hint="Across authorized accounts"
              />
              <HealthTile
                label="Active"
                value={zones.filter((z) => z.status === "active").length}
                hint="Serving through Cloudflare"
                tone="good"
              />
              <HealthTile
                label="Pending / paused"
                value={zones.filter((z) => z.status !== "active").length}
                hint="Needs nameserver or plan attention"
                tone="warn"
              />
              <HealthTile
                label="Paid plans"
                value={zones.filter((z) => !/free/i.test(z.plan)).length}
                hint="Anything not on Free"
              />
              <HealthTile
                label="Saved credentials"
                value={cfCreds.length}
                hint="Browser vault entries (not API access)"
              />
            </TileRow>
          )}

          {loading && !zones.length && (
            <div className="card-glass p-6 text-center text-sm text-muted-foreground">
              Loading zones from Cloudflare…
            </div>
          )}
          {!loading && control?.status === "not_connected" && (
            <ConnectorEmpty
              title="Cloudflare is not connected"
              description="Add a Cloudflare API token with Zone:Read permission to this project and your real zones will appear here. Until then this page shows nothing — no sample domains."
              docsUrl="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/"
              onRetry={() => void load(true)}
            />
          )}
          {!loading && (meta.truthState === "error" || Boolean(failure)) && (
            <ConnectorError
              message={meta.error ?? "Unknown error"}
              onRetry={() => void load(true)}
            />
          )}
          {!loading && connected && zones.length === 0 && (
            <div className="card-glass p-6 text-center text-sm text-muted-foreground">
              No zones returned from configured Cloudflare accounts.
            </div>
          )}

          {zones.length > 0 && (
            <>
              <label className="relative block max-w-md">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"
                />
                <span className="sr-only">Search zones</span>
                <input
                  type="search"
                  value={zoneQuery}
                  onChange={(e) => setZoneQuery(e.target.value)}
                  placeholder="Search zones by domain, status or plan…"
                  className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card/70">
                {filteredZones.map((zone) => (
                  <li
                    key={zone.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  >
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotFor(zone.status)}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 basis-56">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={zone.dashboardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold hover:text-primary"
                        >
                          {zone.name}
                        </a>
                        <span className="badge badge-muted">{zone.plan}</span>
                        <span
                          className={`badge capitalize ${zone.status === "active" ? "badge-success" : "badge-warning"}`}
                        >
                          {zone.status}
                        </span>
                      </div>
                      {zone.nameservers.length > 0 && (
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => copyNs(zone.nameservers.join("\n"))}
                          title="Copy nameservers"
                        >
                          ns: {zone.nameservers.join(" / ")} <Copy size={9} />
                        </button>
                      )}
                    </div>
                    <nav aria-label={"Links for " + zone.name} className="flex flex-wrap gap-1">
                      {zoneLinks(zone).map((l) => (
                        <a
                          key={l.label}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                        >
                          {l.label}
                        </a>
                      ))}
                    </nav>
                  </li>
                ))}
                {filteredZones.length === 0 && (
                  <li className="p-6 text-center text-sm text-muted-foreground">
                    No zones match “{zoneQuery}”.
                  </li>
                )}
              </ul>
            </>
          )}

          <section
            aria-label="Saved Cloudflare accounts"
            className="rounded-2xl border border-border/70 bg-card/60 p-4"
          >
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Lock size={14} className="text-primary" /> Saved browser credentials
            </h2>
            {cfCreds.length > 0 ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {cfCreds.map((cred) => (
                  <li key={cred.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{cred.label}</span>
                      <TruthBadge state="manual" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{cred.username}</p>
                    {cred.url && (
                      <a
                        href={cred.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Open <ExternalLink size={9} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                No Cloudflare entries in the browser vault. API access uses secure server secrets,
                not this vault.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="shortcuts" className="mt-4">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ACCOUNT_SHORTCUTS.map((s) => {
              const url = resolveAccountUrl(s.url);
              const needsPick = s.url.includes(":account") && url === "https://dash.cloudflare.com";
              return (
                <li key={s.label}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full items-start gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 transition hover:border-primary/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold group-hover:text-primary">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {needsPick ? "Pick the account in the Cloudflare dashboard" : s.desc}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Zone-specific pages (DNS, Analytics, SSL/TLS, Security) are on each row of the Zones
            tab, so links always open the right domain.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
