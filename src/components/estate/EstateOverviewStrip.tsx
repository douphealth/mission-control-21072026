import {
  AlertOctagon,
  ArrowUpRight,
  Cloud,
  FolderGit2,
  GitPullRequest,
  Loader2,
  Rocket,
} from "lucide-react";
import { useEstate, useLinkedEstate, useRepoAnnotations } from "@/hooks/useEstate";
import { useNavigationStore } from "@/stores/navigationStore";
import { ago } from "@/components/estate/bits";

/**
 * Engineering estate at a glance for Today: repos, CI, PRs, failing deploys
 * and the top items needing a decision. Shares the estate query with the
 * GitHub and Cloudflare sections, so it costs nothing extra once warm.
 */
export default function EstateOverviewStrip() {
  const estate = useEstate();
  const { map } = useRepoAnnotations();
  const derived = useLinkedEstate(estate.snapshot, map);
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);

  if (!derived) {
    if (estate.loading)
      return (
        <div
          className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground"
          aria-label="Engineering estate"
        >
          <Loader2 size={12} className="animate-spin" /> Loading GitHub and Cloudflare…
        </div>
      );
    if (estate.gate && estate.gate !== "ok")
      return (
        <p className="px-1 text-[11px] text-muted-foreground" aria-label="Engineering estate">
          Engineering estate: {estate.message ?? "unavailable"}
        </p>
      );
    return null;
  }

  const s = derived.summary;
  const top = derived.attention.filter((a) => a.severity !== "info").slice(0, 3);
  const go = (section: string, focus?: { type: string; id: string }) => {
    if (focus) setFocusEntity(focus);
    setActiveSection(section);
  };

  return (
    <div className="space-y-2" aria-label="Engineering estate">
      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span className="font-bold uppercase tracking-[0.12em]">Engineering estate</span>
        <span>
          {estate.freshness === "cached" ? "saved snapshot · " : ""}
          {ago(estate.snapshot?.fetchedAt)}
          {estate.refreshing && <Loader2 size={10} className="ml-1 inline animate-spin" />}
        </span>
      </div>
      <div
        className="mc-kpi-grid mc36-kpi-strip"
        role="navigation"
        aria-label="Engineering estate at a glance"
      >
        <button
          type="button"
          onClick={() => go("github")}
          className="mc-kpi-card"
          data-tone={s.ciFailing ? "bad" : undefined}
        >
          <span className="mc-kpi-icon">
            <FolderGit2 size={15} />
          </span>
          <span className="mc-kpi-value">{s.repos}</span>
          <span className="mc-kpi-copy">
            <strong>Repositories</strong>
            <small>
              {s.ciFailing ? s.ciFailing + " with CI failing" : s.pushed7d + " pushed this week"}
            </small>
          </span>
          <ArrowUpRight size={13} className="mc-kpi-arrow" />
        </button>
        <button type="button" onClick={() => go("github")} className="mc-kpi-card" data-tone="info">
          <span className="mc-kpi-icon">
            <GitPullRequest size={15} />
          </span>
          <span className="mc-kpi-value">{s.openPrs}</span>
          <span className="mc-kpi-copy">
            <strong>Open PRs</strong>
            <small>{s.openIssues} open issues</small>
          </span>
          <ArrowUpRight size={13} className="mc-kpi-arrow" />
        </button>
        <button
          type="button"
          onClick={() => go("cloudflare")}
          className="mc-kpi-card"
          data-tone={s.failingDeploys ? "bad" : "good"}
        >
          <span className="mc-kpi-icon">
            <Rocket size={15} />
          </span>
          <span className="mc-kpi-value">{s.failingDeploys ? s.failingDeploys : s.pages}</span>
          <span className="mc-kpi-copy">
            <strong>{s.failingDeploys ? "Deploys failing" : "Pages healthy"}</strong>
            <small>
              {s.pages} Pages · {s.workers} Workers
            </small>
          </span>
          <ArrowUpRight size={13} className="mc-kpi-arrow" />
        </button>
        <button
          type="button"
          onClick={() => go("cloudflare")}
          className="mc-kpi-card"
          data-tone="violet"
        >
          <span className="mc-kpi-icon">
            <Cloud size={15} />
          </span>
          <span className="mc-kpi-value">{s.zones}</span>
          <span className="mc-kpi-copy">
            <strong>Zones</strong>
            <small>{estate.snapshot?.cloudflare.accounts.length ?? 0} Cloudflare accounts</small>
          </span>
          <ArrowUpRight size={13} className="mc-kpi-arrow" />
        </button>
      </div>
      {top.length > 0 && (
        <ul className="space-y-1">
          {top.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() =>
                  a.target.type === "repo"
                    ? go("github", { type: "repo", id: a.target.key })
                    : a.target.type === "pages"
                      ? go("cloudflare", { type: "cf-pages", id: a.target.key })
                      : go(a.kind === "account" && a.id.startsWith("gh-") ? "github" : "cloudflare")
                }
                className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-3 py-1.5 text-left text-xs transition hover:border-primary/40"
              >
                <AlertOctagon
                  size={13}
                  className={
                    a.severity === "critical" ? "shrink-0 text-red-500" : "shrink-0 text-amber-500"
                  }
                />
                <span className="truncate font-semibold text-foreground">{a.title}</span>
                <span className="hidden truncate text-muted-foreground sm:inline">{a.detail}</span>
                {a.at && (
                  <span className="ml-auto shrink-0 text-muted-foreground">{ago(a.at)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
