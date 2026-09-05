import { useCredentials } from "@/hooks/useTableData";
import { useCallback, useEffect, useState } from "react";
import {
  Rocket,
  ExternalLink,
  GitBranch,
  CheckCircle2,
  Clock,
  Globe,
  RefreshCw,
  Activity,
  Zap,
  Lock,
  Code2,
} from "lucide-react";
import { getVercelProjects, type VercelProjectRow } from "@/lib/integrations.functions";
import { TruthBadge, ConnectorEmpty, ConnectorError } from "@/components/TruthUI";
import { freshness, type TruthMeta } from "@/lib/truth";

const vercelTools = [
  {
    label: "Dashboard",
    url: "https://vercel.com/dashboard",
    icon: "🚀",
    desc: "Manage all deployments",
  },
  {
    label: "Deployments",
    url: "https://vercel.com/dashboard",
    icon: "📦",
    desc: "Deployment history & logs",
  },
  {
    label: "Domains",
    url: "https://vercel.com/dashboard/domains",
    icon: "🌐",
    desc: "Custom domain management",
  },
  {
    label: "Storage",
    url: "https://vercel.com/dashboard/stores",
    icon: "🗄️",
    desc: "KV, Blob, Postgres, Edge Config",
  },
  {
    label: "Analytics",
    url: "https://vercel.com/analytics",
    icon: "📊",
    desc: "Real-user web analytics",
  },
  {
    label: "Vercel AI SDK",
    url: "https://sdk.vercel.ai",
    icon: "🤖",
    desc: "Build AI apps with Vercel",
  },
  {
    label: "API Reference",
    url: "https://vercel.com/docs/rest-api",
    icon: "📖",
    desc: "REST API documentation",
  },
  {
    label: "Status",
    url: "https://www.vercel-status.com",
    icon: "💚",
    desc: "Platform health & incidents",
  },
];

function DeployBadge({ state }: { state: string }) {
  const map: Record<string, { cls: string; label: string; pulse?: boolean }> = {
    ready: { cls: "badge-success", label: "✅ Ready" },
    building: { cls: "badge-warning", label: "⟳ Building", pulse: true },
    error: { cls: "badge-destructive", label: "✗ Error" },
    queued: { cls: "badge-muted", label: "⏳ Queued" },
    canceled: { cls: "badge-muted", label: "⊘ Canceled" },
  };
  const m = map[state] ?? { cls: "badge-muted", label: state || "unknown" };
  return <span className={`badge ${m.cls} ${m.pulse ? "animate-pulse" : ""}`}>{m.label}</span>;
}

export default function VercelPage() {
  const credentials = useCredentials();
  const [projects, setProjects] = useState<VercelProjectRow[]>([]);
  const [meta, setMeta] = useState<TruthMeta>({ truthState: "unavailable", source: "Vercel API" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getVercelProjects();
      setProjects(r.projects);
      setMeta({
        truthState: r.truthState,
        source: r.source,
        fetchedAt: r.fetchedAt,
        error: r.error,
      });
    } catch (e: any) {
      setProjects([]);
      setMeta({
        truthState: "error",
        source: "Vercel API",
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

  const vercelCreds = credentials.filter(
    (c) => c.service.toLowerCase().includes("vercel") || c.label.toLowerCase().includes("vercel"),
  );
  const readyCount = projects.filter((p) => p.state === "ready").length;
  const buildingCount = projects.filter((p) => p.state === "building").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Rocket size={20} className="text-foreground" /> Vercel Deployments
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Live project and deployment state from your Vercel account
            </p>
            <TruthBadge meta={meta} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className="btn-secondary text-sm">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <a
            href="https://www.vercel-status.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/15"
          >
            <Activity size={12} /> Status
          </a>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Open Vercel <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {meta.truthState === "live" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Projects",
              value: projects.length,
              icon: Rocket,
              color: "text-foreground bg-secondary",
            },
            {
              label: "Ready",
              value: readyCount,
              icon: CheckCircle2,
              color: "text-emerald-500 bg-emerald-500/10",
            },
            {
              label: "Building",
              value: buildingCount,
              icon: RefreshCw,
              color: "text-amber-500 bg-amber-500/10",
            },
            {
              label: "Saved Creds",
              value: vercelCreds.length,
              icon: Lock,
              color: "text-violet-500 bg-violet-500/10",
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

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Code2 size={15} className="text-primary" /> Projects
        </h2>

        {loading && (
          <div className="card-glass p-6 text-center text-sm text-muted-foreground">
            Loading projects from Vercel…
          </div>
        )}

        {!loading && meta.truthState === "not_connected" && (
          <ConnectorEmpty
            title="Vercel is not connected"
            description="Add a Vercel API token to this project and your real projects, branches and deployment states will appear here. No sample deployments are shown."
            docsUrl="https://vercel.com/docs/rest-api#authentication"
            onRetry={() => void load()}
          />
        )}

        {!loading && meta.truthState === "error" && (
          <ConnectorError message={meta.error ?? "Unknown error"} onRetry={() => void load()} />
        )}

        {!loading && meta.truthState === "live" && projects.length === 0 && (
          <div className="card-glass p-6 text-center text-sm text-muted-foreground">
            Connected — this Vercel account has no projects.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {projects.map((proj) => (
            <div key={proj.id} className="card-elevated space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{proj.name}</span>
                    <DeployBadge state={proj.state} />
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    {proj.framework && (
                      <span className="badge-muted capitalize">{proj.framework}</span>
                    )}
                    {proj.branch && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <GitBranch size={9} /> {proj.branch}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Visit live deployment"
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                    >
                      <Globe size={13} />
                    </a>
                  )}
                  <a
                    href={proj.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Vercel"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock size={10} />{" "}
                {proj.lastDeployedAt
                  ? `Last deployed ${freshness(proj.lastDeployedAt)}`
                  : "No deployment recorded"}
              </div>
              {proj.liveUrl && (
                <a
                  href={proj.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-[11px] text-primary/80 hover:text-primary hover:underline"
                >
                  {proj.liveUrl}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Zap size={15} className="text-primary" /> Quick Access
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {vercelTools.map((tool) => (
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
