import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  Github,
  Globe2,
  LockKeyhole,
  Server,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import type { Task, Website } from "@/lib/db";
import { getRecordSyncState } from "@/lib/cloudSync";
import {
  domainOf,
  ensureUrl,
  siteKind,
  summarizeTasks,
  type Completeness,
  type SourceEvidence,
} from "@/lib/portfolioInsights";
import { cn } from "@/lib/utils";
import {
  PRIORITY_TONE,
  SOURCE_LABEL,
  STATUS_CONFIG,
  categoryVisual,
} from "@/components/websites/portfolioConfig";
import { Chip, MiniStat, Meter, SecretRow } from "@/components/websites/portfolioParts";

export interface PortfolioWebsiteCardProps {
  site: Website;
  tasks: Task[];
  evidence: SourceEvidence[];
  completeness: Completeness;
  selected: boolean;
  bulkMode: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopy: (value: string) => void;
  onConnectEvidence: () => void;
}

const SYNC_DOT: Record<string, string> = {
  saved: "pf-status-dot--ok",
  pending: "pf-status-dot--busy",
  failed: "pf-status-dot--bad",
  "local-only": "pf-status-dot--idle",
};

const SYNC_LABEL: Record<string, string> = {
  saved: "Saved to your account",
  pending: "Saving…",
  failed: "Cloud save failed — saved on this device",
  "local-only": "Saved on this device",
};

function Favicon({ site }: { site: Website }) {
  const [failed, setFailed] = useState(false);
  const { gradient } = categoryVisual(site.category);
  const src = site.favicon || `${ensureUrl(site.url).replace(/\/$/, "")}/favicon.ico`;
  if (failed) {
    return (
      <div className={cn("pf-favicon", "bg-gradient-to-br", gradient)} aria-hidden>
        <span className="pf-favicon-fallback text-white">
          {site.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <div className="pf-favicon" aria-hidden>
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

export default function PortfolioWebsiteCard({
  site,
  tasks,
  evidence,
  completeness,
  selected,
  bulkMode,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onCopy,
  onConnectEvidence,
}: PortfolioWebsiteCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const domain = domainOf(site.url);
  const kind = siteKind(site);
  const summary = summarizeTasks(tasks);
  const syncState = getRecordSyncState("websites", site.id);
  const status = STATUS_CONFIG[site.status] ?? STATUS_CONFIG.active;
  const apps = site.appUrls ?? [];
  const repos = site.githubRepos ?? [];
  const tags = site.tags ?? [];
  const hasAccess = Boolean(
    site.wpUsername || site.wpPassword || site.hostingUsername || site.hostingPassword,
  );
  const importance =
    typeof site.importance === "number" ? Math.max(0, Math.min(100, site.importance)) : null;

  return (
    <article
      className={cn("pf-card", selected && "pf-card--selected", bulkMode && "pf-card--bulk")}
      onClick={bulkMode ? onToggleSelect : undefined}
      aria-label={`${site.name} portfolio card`}
    >
      <div className="pf-card-strip" aria-hidden />

      <div className="pf-card-body">
        {/* Header */}
        <header className="flex items-start gap-3">
          {bulkMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Select ${site.name}`}
              className="mt-3 h-4 w-4 shrink-0 accent-[hsl(var(--pf-accent))]"
            />
          )}
          <Favicon site={site} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="pf-name max-w-full">{site.name}</h3>
            </div>
            <a
              href={ensureUrl(site.url)}
              target="_blank"
              rel="noreferrer"
              className="pf-domain"
              onClick={(event) => event.stopPropagation()}
            >
              {domain}
            </a>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {site.priority && (
                <Chip tone={PRIORITY_TONE[site.priority] ?? "muted"}>{site.priority}</Chip>
              )}
              <Chip tone={status.tone}>
                <span
                  className={cn(
                    "pf-status-dot",
                    site.status === "active"
                      ? "pf-status-dot--ok"
                      : site.status === "down"
                        ? "pf-status-dot--bad"
                        : "pf-status-dot--idle",
                  )}
                />
                {status.label}
              </Chip>
              <Chip tone={kind === "wordpress" ? "sky" : "violet"}>
                {kind === "wordpress" ? "WordPress" : "Web property"}
              </Chip>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={cn("pf-status-dot", SYNC_DOT[syncState] ?? "pf-status-dot--idle")}
              title={SYNC_LABEL[syncState] ?? "Saved on this device"}
              aria-label={SYNC_LABEL[syncState] ?? "Saved on this device"}
            />
            {importance !== null && (
              <div className="text-right" title="Relative business importance">
                <div className="pf-num text-[15px] font-extrabold leading-none">{importance}</div>
                <div className="pf-mini-l mt-1">importance</div>
              </div>
            )}
          </div>
        </header>

        {site.niche && (
          <p
            className="pf-note -mt-1 line-clamp-2 text-[12.5px] font-medium leading-5"
            style={{ color: "hsl(var(--pf-muted))" }}
          >
            {site.niche}
          </p>
        )}

        {/* Goal */}
        <div className="pf-goal">
          <div className="pf-section-h">
            <Sparkles size={12} aria-hidden /> Main goal
          </div>
          <p className={cn(!site.primaryGoal && "italic opacity-70")}>
            {site.primaryGoal || "No goal set yet. Add one so this site has a clear target."}
          </p>
        </div>

        {/* Task + data strip */}
        <div className="pf-mini-grid">
          <MiniStat label="Open tasks" value={summary.open} />
          <MiniStat
            label="In progress"
            value={summary.inProgress}
            tone={summary.inProgress ? "text-[hsl(var(--pf-amber))]" : undefined}
          />
          <MiniStat
            label="Blocked"
            value={summary.blocked}
            tone={summary.blocked ? "text-[hsl(var(--pf-rose))]" : undefined}
          />
          <MiniStat label="Apps" value={apps.length} />
        </div>

        {/* Next action */}
        {summary.next ? (
          <div className="pf-next">
            <div className="pf-next-icon" aria-hidden>
              <Zap size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="pf-section-h mb-1 text-[9px]">Next move</div>
              <div className="pf-next-title">{summary.next.title}</div>
              <div className="pf-note mt-1">
                {summary.next.priority} · {summary.next.status.replace("-", " ")}
                {summary.next.estimateMin ? ` · ~${summary.next.estimateMin} min` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="pf-next">
            <div className="pf-next-icon" aria-hidden>
              <Zap size={14} />
            </div>
            <div className="pf-note self-center">No open tasks for this site yet.</div>
          </div>
        )}

        {/* Evidence */}
        <div>
          <div className="pf-section-h mb-2 text-[9px]">Search evidence</div>
          {evidence.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {evidence.map((item) => (
                <Chip key={`${item.source}-${item.date}`} tone="sky">
                  <span>
                    {SOURCE_LABEL[item.source]}
                    {typeof item.clicks === "number"
                      ? ` · ${item.clicks.toLocaleString()} clicks`
                      : ""}
                    {item.periodDays ? ` · ${item.periodDays}d` : ""}
                  </span>
                </Chip>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onConnectEvidence();
              }}
              className="pf-note inline-flex items-center gap-1 underline-offset-2 hover:underline"
              style={{ color: "hsl(var(--pf-accent))" }}
            >
              No Search Console or Bing data yet. Connect evidence{" "}
              <ArrowUpRight size={11} aria-hidden />
            </button>
          )}
        </div>

        {/* Profile completeness */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="pf-section-h text-[9px]">
              Profile {completeness.percent}% complete
            </span>
            <span className="pf-note">
              {completeness.done}/{completeness.total}
            </span>
          </div>
          <Meter percent={completeness.percent} warn={completeness.percent < 60} />
          {completeness.missing.length > 0 && (
            <p className="pf-note mt-1.5">
              Missing: {completeness.missing.slice(0, 4).join(", ")}
              {completeness.missing.length > 4 ? "…" : ""}
            </p>
          )}
        </div>

        {/* Details (expanded) */}
        {detailsOpen && (
          <div className="pf-details" onClick={(event) => event.stopPropagation()}>
            <div>
              <div className="pf-section-h mb-2 text-[9px]">Revenue & hosting</div>
              <div className="flex flex-wrap gap-1.5">
                <Chip tone="accent">{site.revenueModel || "Revenue model not recorded"}</Chip>
                <Chip tone="muted">
                  <Server size={10} aria-hidden /> {site.hostingProvider || "Hosting not recorded"}
                </Chip>
              </div>
            </div>

            {apps.length > 0 && (
              <div>
                <div className="pf-section-h mb-2 text-[9px]">Connected apps ({apps.length})</div>
                <div className="pf-link-list">
                  {apps.map((url) => (
                    <a
                      key={url}
                      href={ensureUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="pf-link-row"
                    >
                      <Zap size={12} aria-hidden />
                      <span>{domainOf(url)}</span>
                      <ExternalLink size={11} className="ml-auto shrink-0 opacity-60" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {repos.length > 0 && (
              <div>
                <div className="pf-section-h mb-2 text-[9px]">Code repos ({repos.length})</div>
                <div className="pf-link-list">
                  {repos.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="pf-link-row"
                    >
                      <Github size={12} aria-hidden />
                      <span>{url.replace(/^https?:\/\/github\.com\//, "")}</span>
                      <ExternalLink size={11} className="ml-auto shrink-0 opacity-60" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {hasAccess && (
              <div>
                <div className="pf-section-h mb-2 text-[9px]">
                  Stored access · this browser only
                </div>
                <div className="grid gap-1.5">
                  {site.wpUsername && (
                    <SecretRow
                      label="WP user"
                      value={site.wpUsername}
                      onCopy={() => onCopy(site.wpUsername)}
                    />
                  )}
                  {site.wpPassword && (
                    <SecretRow
                      label="WP password"
                      value={site.wpPassword}
                      secret
                      onCopy={() => onCopy(site.wpPassword)}
                    />
                  )}
                  {site.hostingUsername && (
                    <SecretRow
                      label="Host user"
                      value={site.hostingUsername}
                      onCopy={() => onCopy(site.hostingUsername)}
                    />
                  )}
                  {site.hostingPassword && (
                    <SecretRow
                      label="Host password"
                      value={site.hostingPassword}
                      secret
                      onCopy={() => onCopy(site.hostingPassword)}
                    />
                  )}
                </div>
              </div>
            )}

            {site.plugins.length > 0 && (
              <div>
                <div className="pf-section-h mb-2 text-[9px]">Plugins ({site.plugins.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {site.plugins.map((plugin) => (
                    <Chip key={plugin} tone="muted">
                      {plugin}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="pf-note rounded-md border px-1.5 py-0.5"
                    style={{ borderColor: "hsl(var(--pf-line))" }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {site.notes && (
              <div>
                <div className="pf-section-h mb-1.5 text-[9px]">Notes</div>
                <p
                  className="pf-note text-[12px] leading-5"
                  style={{ color: "hsl(var(--pf-ink) / 0.85)" }}
                >
                  {site.notes}
                </p>
              </div>
            )}

            <div className="pf-note flex flex-wrap gap-x-4 gap-y-1">
              <span>Added {site.dateAdded || "—"}</span>
              <span>Updated {site.lastUpdated || "—"}</span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <footer className="pf-card-foot" onClick={(event) => event.stopPropagation()}>
          <a
            href={ensureUrl(site.url)}
            target="_blank"
            rel="noreferrer"
            className="pf-btn pf-btn--primary"
          >
            <Globe2 size={13} aria-hidden /> Open site
          </a>
          {site.wpAdminUrl && (
            <a
              href={ensureUrl(site.wpAdminUrl)}
              target="_blank"
              rel="noreferrer"
              className="pf-btn"
            >
              <LockKeyhole size={13} aria-hidden /> WP admin
            </a>
          )}
          {site.hostingLoginUrl && (
            <a
              href={ensureUrl(site.hostingLoginUrl)}
              target="_blank"
              rel="noreferrer"
              className="pf-btn"
            >
              <Server size={13} aria-hidden /> Hosting
            </a>
          )}
          <button
            type="button"
            className="pf-btn"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
          >
            Details
            <ChevronDown
              size={13}
              aria-hidden
              className={cn("transition-transform", detailsOpen && "rotate-180")}
            />
          </button>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              className="pf-icon-btn"
              onClick={onDuplicate}
              title="Duplicate"
              aria-label={`Duplicate ${site.name}`}
            >
              <Copy size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="pf-icon-btn"
              onClick={onEdit}
              title="Edit"
              aria-label={`Edit ${site.name}`}
            >
              <Edit3 size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="pf-icon-btn pf-icon-btn--danger"
              onClick={onDelete}
              title="Delete"
              aria-label={`Delete ${site.name}`}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </footer>

        <div className="pf-note flex items-center gap-1.5">
          <Clock3 size={10} aria-hidden /> Updated {site.lastUpdated || "—"}
        </div>
      </div>
    </article>
  );
}
