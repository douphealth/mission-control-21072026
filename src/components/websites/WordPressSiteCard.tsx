import { useState } from "react";
import {
  ArrowRight,
  Gauge,
  Loader2,
  LockKeyhole,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { Website } from "@/lib/db";
import { domainOf, ensureUrl } from "@/lib/portfolioInsights";
import {
  criticalHealthCount,
  pluginUpdateCount,
  scoreWpSite,
  type WpConnection,
  type WpSiteSnapshot,
} from "@/lib/wpScores";
import { cn } from "@/lib/utils";
import { PRIORITY_TONE, STATUS_CONFIG } from "@/components/websites/portfolioConfig";
import { Chip, MiniStat, ScoreRing } from "@/components/websites/portfolioParts";

export interface WordPressSiteCardProps {
  site: Website;
  snapshot: WpSiteSnapshot;
  connection: WpConnection;
  openTasks: number;
  nextTaskTitle: string | null;
  selected: boolean;
  onSelect: () => void;
  onCheck: () => void;
}

const CONNECTION: Record<
  WpConnection,
  { label: string; tone: "accent" | "amber" | "rose" | "muted" }
> = {
  verified: { label: "REST verified", tone: "accent" },
  pending: { label: "Saved · verifying", tone: "amber" },
  "auth-error": { label: "Auth failed", tone: "rose" },
  "public-only": { label: "Public checks only", tone: "muted" },
};

export default function WordPressSiteCard({
  site,
  snapshot,
  connection,
  openTasks,
  nextTaskTitle,
  selected,
  onSelect,
  onCheck,
}: WordPressSiteCardProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const domain = domainOf(site.url);
  const scores = scoreWpSite(snapshot);
  const health = snapshot.health;
  const updates = pluginUpdateCount(snapshot.plugins);
  const critical = criticalHealthCount(snapshot.siteHealth);
  const conn = CONNECTION[connection];
  const status = STATUS_CONFIG[site.status] ?? STATUS_CONFIG.active;
  const checking = !!snapshot.loading;
  const online = health ? health.reachable : null;
  const favicon = site.favicon || `${ensureUrl(site.url).replace(/\/$/, "")}/favicon.ico`;
  const apps = site.appUrls ?? [];

  return (
    <article
      className={cn("pf-card pf-wp-card", selected && "pf-card--selected")}
      onClick={onSelect}
      aria-label={`${site.name} WordPress card`}
    >
      <div className="pf-card-strip" aria-hidden />
      <div className="pf-card-body">
        <header className="flex items-start gap-3">
          <div className="pf-favicon" aria-hidden>
            {!faviconFailed ? (
              <img src={favicon} alt="" loading="lazy" onError={() => setFaviconFailed(true)} />
            ) : (
              <span className="pf-favicon-fallback">{site.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="pf-name">{site.name}</h3>
            <div className="pf-domain">{domain}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip tone={conn.tone}>
                {connection === "verified" ? (
                  <ShieldCheck size={10} aria-hidden />
                ) : (
                  <LockKeyhole size={10} aria-hidden />
                )}
                {conn.label}
              </Chip>
              {site.priority && (
                <Chip tone={PRIORITY_TONE[site.priority] ?? "muted"}>{site.priority}</Chip>
              )}
              <Chip tone={status.tone}>{status.label}</Chip>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={cn(
                "pf-status-dot",
                checking
                  ? "pf-status-dot--busy"
                  : online === true
                    ? "pf-status-dot--ok"
                    : online === false
                      ? "pf-status-dot--bad"
                      : "pf-status-dot--idle",
              )}
              title={
                checking
                  ? "Checking…"
                  : online === true
                    ? "Online"
                    : online === false
                      ? "Offline"
                      : "Not checked yet"
              }
              aria-label={
                checking
                  ? "Checking"
                  : online === true
                    ? "Online"
                    : online === false
                      ? "Offline"
                      : "Not checked yet"
              }
            />
            <span className="pf-note text-right">
              {checking
                ? "Checking…"
                : online === true
                  ? "Online"
                  : online === false
                    ? "Offline"
                    : "Not checked"}
            </span>
          </div>
        </header>

        {/* Scores */}
        <div className="grid grid-cols-3 gap-2" style={{ justifyItems: "center" }}>
          <div className="flex flex-col items-center gap-1.5">
            <ScoreRing value={scores.health} label="Health" />
            <span className="pf-mini-l">Health</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ScoreRing value={scores.seo} label="SEO" />
            <span className="pf-mini-l">SEO</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ScoreRing value={scores.security} label="Security" />
            <span className="pf-mini-l">Security</span>
          </div>
        </div>

        {/* Facts */}
        <div className="pf-mini-grid">
          <MiniStat
            label="WordPress"
            value={!health ? "—" : health.isWordPress ? health.wpVersion || "Yes" : "Not detected"}
          />
          <MiniStat label="Protocol" value={health ? health.protocol.toUpperCase() : "—"} />
          <MiniStat label="Response" value={health?.responseMs ? `${health.responseMs}ms` : "—"} />
          <MiniStat
            label="Sitemap"
            value={snapshot.seo ? (snapshot.seo.hasSitemap ? "Yes" : "No") : "—"}
          />
          <MiniStat
            label="Plugin updates"
            value={snapshot.plugins ? updates : "—"}
            tone={updates > 0 ? "text-[hsl(var(--pf-amber))]" : undefined}
          />
          <MiniStat
            label="Critical issues"
            value={snapshot.siteHealth ? critical : "—"}
            tone={critical > 0 ? "text-[hsl(var(--pf-rose))]" : undefined}
          />
          <MiniStat label="Open tasks" value={openTasks} />
          <MiniStat label="Apps" value={apps.length} />
        </div>

        {snapshot.counts && (
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="muted">{snapshot.counts.posts} posts</Chip>
            <Chip tone="muted">{snapshot.counts.pages} pages</Chip>
            <Chip tone="muted">{snapshot.counts.comments} comments</Chip>
          </div>
        )}

        {snapshot.authError && (
          <p className="pf-note" style={{ color: "hsl(var(--pf-rose))" }}>
            {snapshot.authError}
          </p>
        )}

        {nextTaskTitle && (
          <div className="pf-next">
            <div className="pf-next-icon" aria-hidden>
              <Zap size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="pf-section-h mb-1 text-[9px]">Next move</div>
              <div className="pf-next-title">{nextTaskTitle}</div>
            </div>
          </div>
        )}

        <footer className="pf-card-foot" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="pf-btn pf-btn--primary" onClick={onSelect}>
            <Gauge size={13} aria-hidden /> {selected ? "Viewing details" : "Open details"}{" "}
            <ArrowRight size={12} aria-hidden />
          </button>
          <button
            type="button"
            className="pf-btn"
            onClick={onCheck}
            disabled={checking}
            aria-label={`Run checks for ${site.name}`}
          >
            {checking ? (
              <Loader2 size={13} className="animate-spin" aria-hidden />
            ) : (
              <RefreshCw size={13} aria-hidden />
            )}
            Check
          </button>
          {site.wpAdminUrl && (
            <a
              href={ensureUrl(site.wpAdminUrl)}
              target="_blank"
              rel="noreferrer"
              className="pf-btn"
              title="Open WP admin"
            >
              <LockKeyhole size={13} aria-hidden /> Admin
            </a>
          )}
          {snapshot.plugins && (
            <span className="pf-note ml-auto inline-flex items-center gap-1">
              <Puzzle size={11} aria-hidden /> {snapshot.plugins.length} plugins
            </span>
          )}
        </footer>

        <div className="pf-note">
          {snapshot.lastChecked
            ? `Last checked ${new Date(snapshot.lastChecked).toLocaleString()}`
            : "Run a check to collect live evidence."}
        </div>
      </div>
    </article>
  );
}
