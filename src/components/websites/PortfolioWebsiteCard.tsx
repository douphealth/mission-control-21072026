import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  Github,
  Globe2,
  KeyRound,
  LockKeyhole,
  Rocket,
  Server,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import type { Task, Website } from "@/lib/db";
import { getRecordSyncState } from "@/lib/cloudSync";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-500",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  medium: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
};

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

function ensureUrl(url: string) {
  return /^https?:\/\//.test(url) ? url : "https://" + url;
}

function TaskMini({ task }: { task: Task }) {
  const tone =
    task.priority === "critical"
      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
      : task.priority === "high"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
        : "bg-primary/8 text-primary border-primary/15";
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border/35 bg-background/45 px-3 py-2.5">
      <div className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border", tone)}>
        <Zap size={11} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[11px] font-bold leading-4 text-foreground">{task.title}</div>
        <div className="mt-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          <span>{task.priority}</span><span>•</span><span>{task.status.replace("-", " ")}</span>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioWebsiteCard({
  site,
  tasks,
  selected,
  bulkMode,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onCopy,
}: {
  site: Website;
  tasks: Task[];
  selected: boolean;
  bulkMode: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopy: (value: string) => void;
}) {
  const [accessOpen, setAccessOpen] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const domain = domainOf(site.url);

  const siteTasks = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (task.deletedAt || task.status === "done") return false;
          const project = (task.linkedProject || "").toLowerCase();
          const tags = (task.tags || []).join(" ").toLowerCase();
          return project.includes(domain) || tags.includes(domain.split(".")[0]);
        })
        .sort(
          (a, b) =>
            (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
            a.title.localeCompare(b.title),
        ),
    [tasks, domain],
  );

  const blocked = siteTasks.filter((task) => task.status === "blocked").length;
  const inProgress = siteTasks.filter((task) => task.status === "in-progress").length;
  const syncState = getRecordSyncState("websites", site.id);
  const favicon = site.favicon || ensureUrl(site.url).replace(/\/$/, "") + "/favicon.ico";
  const hasAccess = Boolean(site.wpUsername || site.wpPassword || site.hostingUsername || site.hostingPassword);

  return (
    <article
      onClick={bulkMode ? onToggleSelect : undefined}
      className={cn(
        "group relative overflow-hidden rounded-[26px] border bg-card/88 shadow-[0_22px_70px_-45px_hsl(var(--foreground)/0.55)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_90px_-48px_hsl(var(--primary)/0.55)]",
        selected ? "border-primary/55 ring-2 ring-primary/15" : "border-border/45",
        bulkMode && "cursor-pointer",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-cyan-400 to-violet-500" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border/50 bg-background/70 shadow-sm">
            {!faviconFailed ? (
              <img src={favicon} alt="" className="h-8 w-8 rounded-lg object-contain" onError={() => setFaviconFailed(true)} />
            ) : (
              <span className="text-base font-black text-primary">{site.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[16px] font-extrabold tracking-[-0.02em] text-foreground">{site.name}</h3>
              {site.priority && (
                <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]", PRIORITY_STYLE[site.priority] || PRIORITY_STYLE.medium)}>
                  {site.priority}
                </span>
              )}
              {typeof site.importance === "number" && (
                <span className="rounded-full border border-border/50 bg-background/55 px-2 py-0.5 text-[9px] font-black text-muted-foreground">
                  {site.importance}/100
                </span>
              )}
            </div>
            <a href={ensureUrl(site.url)} target="_blank" rel="noreferrer" className="mt-1 block truncate font-mono text-[11px] font-semibold text-muted-foreground transition hover:text-primary">
              {domain}
            </a>
          </div>

          <div className="flex items-center gap-1">
            <span
              title={syncState}
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                syncState === "saved" && "bg-emerald-500",
                syncState === "pending" && "bg-amber-500",
                syncState === "failed" && "bg-rose-500",
                syncState === "local-only" && "bg-slate-400",
              )}
            />
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 text-[9px] font-bold text-emerald-500">{site.status}</span>
          </div>
        </div>

        {site.niche && <p className="mt-4 line-clamp-2 text-[12px] font-medium leading-5 text-muted-foreground">{site.niche}</p>}

        <div className="mt-4 rounded-2xl border border-primary/12 bg-gradient-to-br from-primary/[0.075] via-background/40 to-accent/[0.06] p-3.5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-primary"><Target size={12} /> Main goal</div>
          <p className="mt-2 line-clamp-3 text-[12px] font-semibold leading-5 text-foreground/90">
            {site.primaryGoal || site.notes || "Define the single highest-value outcome for this property."}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label="Open work" value={siteTasks.length} />
          <Metric label="In progress" value={inProgress} tone="text-amber-500" />
          <Metric label="Blocked" value={blocked} tone="text-rose-500" />
        </div>

        {siteTasks[0] && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/75">
              <TrendingUp size={11} /> Highest-leverage next action
            </div>
            <TaskMini task={siteTasks[0]} />
          </div>
        )}

        {(site.appUrls?.length || site.githubRepos?.length || site.revenueModel) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {site.revenueModel && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/18 bg-emerald-500/8 px-2 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                <Rocket size={10} /> {site.revenueModel}
              </span>
            )}
            {(site.appUrls || []).slice(0, 2).map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-lg border border-violet-500/18 bg-violet-500/8 px-2 py-1 text-[9px] font-bold text-violet-600 transition hover:bg-violet-500/14 dark:text-violet-400">
                <Zap size={10} /> <span className="max-w-[155px] truncate">{domainOf(url)}</span>
              </a>
            ))}
            {(site.githubRepos || []).slice(0, 1).map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border/45 bg-background/55 px-2 py-1 text-[9px] font-bold text-muted-foreground transition hover:text-foreground">
                <Github size={10} /> repo
              </a>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/35 pt-4">
          <a href={ensureUrl(site.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[10px] font-extrabold text-primary-foreground shadow-[0_10px_28px_-18px_hsl(var(--primary))] transition hover:opacity-90">
            <Globe2 size={12} /> Open site <ArrowUpRight size={11} />
          </a>
          {site.wpAdminUrl && (
            <a href={ensureUrl(site.wpAdminUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/55 px-3 py-2 text-[10px] font-bold text-foreground transition hover:border-primary/25 hover:text-primary">
              <LockKeyhole size={12} /> WP Admin
            </a>
          )}
          {site.hostingLoginUrl && (
            <a href={ensureUrl(site.hostingLoginUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/55 px-3 py-2 text-[10px] font-bold text-foreground transition hover:border-primary/25 hover:text-primary">
              <Server size={12} /> Hosting
            </a>
          )}
          {hasAccess && (
            <button type="button" onClick={() => setAccessOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/55 px-3 py-2 text-[10px] font-bold text-foreground transition hover:border-primary/25 hover:text-primary">
              <KeyRound size={12} /> Access
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={onDuplicate} title="Duplicate" className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"><Copy size={13} /></button>
            <button type="button" onClick={onEdit} title="Edit" className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-primary"><Edit3 size={13} /></button>
            <button type="button" onClick={onDelete} title="Delete" className="rounded-lg p-2 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"><Trash2 size={13} /></button>
          </div>
        </div>

        {accessOpen && hasAccess && (
          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.045] p-3">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400"><ShieldCheck size={12} /> Stored access</div>
            <div className="space-y-1.5">
              {site.wpUsername && <SecretRow label="WP user" display={site.wpUsername} onCopy={() => onCopy(site.wpUsername)} />}
              {site.wpPassword && <SecretRow label="WP password" display="•••••••••• · copy" onCopy={() => onCopy(site.wpPassword)} />}
              {site.hostingUsername && <SecretRow label="Host user" display={site.hostingUsername} onCopy={() => onCopy(site.hostingUsername)} />}
              {site.hostingPassword && <SecretRow label="Host password" display="•••••••••• · copy" onCopy={() => onCopy(site.hostingPassword)} />}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[9px] font-semibold text-muted-foreground/60">
          <span className="inline-flex items-center gap-1"><Clock3 size={10} /> Updated {site.lastUpdated || "—"}</span>
          {site.wpAdminUrl ? (
            <span className="inline-flex items-center gap-1 text-sky-500"><CheckCircle2 size={10} /> WordPress</span>
          ) : (
            <span className="inline-flex items-center gap-1"><Wrench size={10} /> Web property</span>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/35 bg-background/45 p-2.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-black tabular-nums", tone)}>{value}</div>
    </div>
  );
}

function SecretRow({ label, display, onCopy }: { label: string; display: string; onCopy: () => void }) {
  return (
    <button type="button" onClick={onCopy} className="flex w-full items-center justify-between rounded-lg bg-background/55 px-2.5 py-2 text-left">
      <span className="text-[9px] font-bold uppercase text-muted-foreground">{label}</span>
      <span className="max-w-[65%] truncate font-mono text-[10px] text-foreground">{display}</span>
    </button>
  );
}
