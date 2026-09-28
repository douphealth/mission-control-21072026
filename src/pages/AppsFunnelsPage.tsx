import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Github,
  Globe,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";

const priorityRank: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function AppsFunnelsPage() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<"all" | "critical" | "high" | "medium" | "low">("all");

  const apps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...APP_FUNNEL_CATALOG]
      .filter((app) => priority === "all" || app.priority === priority)
      .filter((app) => {
        if (!q) return true;
        return [
          app.name,
          app.productName,
          app.parentWebsite,
          app.landingPage,
          app.githubRepo,
          app.deployedUrl,
          app.description,
          app.nextSteps,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort(
        (a, b) =>
          (priorityRank[a.priority || "medium"] ?? 2) -
            (priorityRank[b.priority || "medium"] ?? 2) ||
          (b.importance || 0) - (a.importance || 0) ||
          a.name.localeCompare(b.name),
      );
  }, [priority, search]);

  const stats = useMemo(
    () => ({
      total: APP_FUNNEL_CATALOG.length,
      deployed: APP_FUNNEL_CATALOG.filter((app) => app.status === "deployed").length,
      critical: APP_FUNNEL_CATALOG.filter((app) => app.priority === "critical").length,
      growthApps: APP_FUNNEL_CATALOG.filter((app) => app.portfolioGroup === "growth-app").length,
    }),
    [],
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles size={11} /> Revenue assets
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Apps & Funnels
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Production apps mapped to their GitHub repo, live deployment, parent website, and funnel entry point.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Apps", value: stats.total },
            { label: "Deployed", value: stats.deployed },
            { label: "Critical", value: stats.critical },
            { label: "Growth", value: stats.growthApps },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/40 bg-card/70 px-3 py-2.5 text-center shadow-sm backdrop-blur">
              <div className="text-lg font-extrabold tabular-nums text-foreground">{stat.value}</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 lg:max-w-md">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps, repos, sites, funnels..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["all", "critical", "high", "medium", "low"] as const).map((item) => {
            const count =
              item === "all"
                ? APP_FUNNEL_CATALOG.length
                : APP_FUNNEL_CATALOG.filter((app) => app.priority === item).length;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setPriority(item)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  priority === item
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/30 bg-card/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item} <span className="ml-1 opacity-65">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {apps.map((app) => (
          <article key={app.githubRepo} className="card-elevated group p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Target size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-extrabold text-foreground">
                    {app.productName || app.name}
                  </h2>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                      app.priority === "critical"
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : app.priority === "high"
                          ? "border-warning/20 bg-warning/10 text-warning"
                          : "border-border/40 bg-secondary text-muted-foreground"
                    }`}
                  >
                    {app.priority}
                  </span>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success">
                    {app.status}
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {app.description}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/70 px-2.5 py-1.5 text-right">
                <div className="text-sm font-extrabold tabular-nums text-foreground">{app.importance}</div>
                <div className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">importance</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <a
                href={app.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border/35 bg-secondary/35 px-3 py-2.5 text-xs font-semibold text-foreground transition hover:border-primary/25 hover:bg-primary/5"
              >
                <Github size={14} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{app.githubRepo.replace("https://github.com/", "")}</span>
                <ArrowUpRight size={12} className="shrink-0 text-muted-foreground" />
              </a>

              {app.deployedUrl ? (
                <a
                  href={app.deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-border/35 bg-secondary/35 px-3 py-2.5 text-xs font-semibold text-foreground transition hover:border-success/25 hover:bg-success/5"
                >
                  <Globe size={14} className="shrink-0 text-success" />
                  <span className="min-w-0 flex-1 truncate">{app.deployedUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                </a>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/40 px-3 py-2.5 text-xs text-muted-foreground">
                  <Globe size={14} /> Production URL pending
                </div>
              )}
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {app.parentWebsite && (
                <a
                  href={app.parentWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 rounded-xl bg-card/50 px-3 py-2 text-[11px] text-muted-foreground transition hover:text-foreground"
                >
                  <ShieldCheck size={13} className="shrink-0" />
                  <span className="truncate">{app.parentWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                </a>
              )}
              {app.landingPage && (
                <a
                  href={app.landingPage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 rounded-xl bg-card/50 px-3 py-2 text-[11px] text-muted-foreground transition hover:text-foreground"
                >
                  <Link2 size={13} className="shrink-0" />
                  <span className="truncate">{app.landingPage.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                </a>
              )}
            </div>

            {app.alternateUrls && app.alternateUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {app.alternateUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-secondary/60 px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-warning/10 bg-warning/5 p-3">
              <div className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-warning">
                Next highest-value action
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{app.nextSteps}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
