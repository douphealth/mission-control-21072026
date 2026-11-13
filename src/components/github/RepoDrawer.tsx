import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Cloud,
  Code2,
  Copy,
  ExternalLink,
  GitFork,
  GitPullRequest,
  Globe,
  Lock,
  LoaderCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  Star,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getRepositoryDiagnostics,
  type RepositoryDiagnostics,
} from "@/lib/repositoryDiagnostics.functions";
import type { RepoOpsRow } from "@/lib/repoOps";
import type { GitHubRepo } from "@/lib/db";
import {
  REPO_DEPLOY_LABEL,
  repoCloneCommand,
  repoDeployState,
  repoLinkGroups,
  repoSshCloneCommand,
  type RepoDeployState,
} from "@/lib/repoConsole";
import { healthOf, hostOf, relativeTime } from "@/lib/cloudflareWorkspace";
import { REPO_PORTFOLIO_META } from "@/lib/repoPortfolioMeta";
import { REPO_RELATIONSHIPS } from "@/lib/repoRelationships";
import { Pill, ctl, ctlPrimary, iconBtn, type Tone } from "@/components/console/ConsoleUI";
import DeleteForeverPanel from "@/components/console/DeleteForeverPanel";
import { deleteGitHubRepo } from "@/lib/providerDelete.functions";

const OWNERS = ["douphealth", "Papalexios", "papalexios001-wq", "papalexios01"] as const;
const DEPLOY_TONE: Record<RepoDeployState, Tone> = {
  failing: "danger",
  building: "info",
  deployed: "good",
  idle: "neutral",
  linked: "neutral",
  none: "neutral",
};
const SOURCE_LABEL: Record<RepoOpsRow["source"], string> = {
  authenticated: "Authenticated GitHub inventory",
  "github-api": "Public GitHub API",
  snapshot: "Dated catalog snapshot (refresh for live data)",
};

/** Owner/repo exactly as GitHub spells them, from the repository URL. */
function githubPath(url: string): { owner: string; repo: string } | null {
  try {
    const [owner, repo] = new URL(url).pathname.split("/").filter(Boolean);
    return owner && repo ? { owner, repo: repo.replace(/\.git$/i, "") } : null;
  } catch {
    return null;
  }
}

const copyText = (text: string, what: string) =>
  void navigator.clipboard.writeText(text).then(
    () => toast.success(what + " copied"),
    () => toast.error("Clipboard access unavailable"),
  );

/* Diagnostics are per-repository, on request, and cached briefly so stepping
   through a list does not re-spend GitHub API budget. */
type Diag = { at: number; result: RepositoryDiagnostics | null; error: string | null };
const diagCache = new Map<string, Diag>();
const DIAG_TTL = 5 * 60_000;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className="mt-0.5 truncate text-sm font-semibold"
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </dd>
    </div>
  );
}

function Card({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ───────────────────────── activity tab ───────────────────────── */

function ActivityTab({ row, active }: { row: RepoOpsRow; active: boolean }) {
  const [state, setState] = useState<Diag | null>(diagCache.get(row.key) ?? null);
  const [loading, setLoading] = useState(false);
  const token = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      const cached = diagCache.get(row.key);
      if (!force && cached && Date.now() - cached.at < DIAG_TTL) {
        setState(cached);
        return;
      }
      const owner = OWNERS.find((o) => o.toLowerCase() === row.owner.toLowerCase());
      const repo = row.key.split("/")[1];
      if (!owner || !repo) {
        setState({
          at: Date.now(),
          result: null,
          error: "Diagnostics are only available for your four managed GitHub accounts.",
        });
        return;
      }
      const mine = ++token.current;
      setLoading(true);
      let next: Diag;
      try {
        const result = await getRepositoryDiagnostics({ data: { owner, repo } });
        next = { at: Date.now(), result, error: null };
      } catch {
        next = {
          at: Date.now(),
          result: null,
          error:
            "GitHub diagnostics unavailable. Sign in via Cloudflare Access and configure an account-specific read token.",
        };
      }
      if (mine !== token.current) return; // user moved to another repository
      diagCache.set(row.key, next);
      setState(next);
      setLoading(false);
    },
    [row.key, row.owner],
  );

  // Fetch only when the Activity tab is actually showing — never in the background.
  useEffect(() => {
    token.current++;
    setLoading(false);
    setState(diagCache.get(row.key) ?? null);
  }, [row.key]);
  useEffect(() => {
    if (active && !state) void load(false);
  }, [active, state, load]);

  const d = state?.result;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {d
            ? d.state +
              " · " +
              new Date(d.fetchedAt).toLocaleString() +
              " · branch " +
              (d.defaultBranch || "unavailable")
            : "GitHub REST API · loaded on request for this repository only"}
        </span>
        <button type="button" className={ctl} onClick={() => void load(true)} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />{" "}
          {loading ? "Loading" : "Refresh"}
        </button>
      </div>
      {loading && !d && (
        <p role="status" className="flex items-center gap-2 text-sm">
          <LoaderCircle size={14} className="animate-spin" /> Retrieving the latest workflow run,
          pull requests and deployments…
        </p>
      )}
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200"
        >
          {state.error}
        </p>
      )}
      {d?.errors.map((e, i) => (
        <p
          key={i}
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200"
        >
          {e}
        </p>
      ))}
      {d && (
        <>
          <Card title="Latest workflow run">
            {d.latestCI ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill
                    tone={
                      d.latestCI.conclusion === "success"
                        ? "good"
                        : d.latestCI.conclusion &&
                            d.latestCI.conclusion !== "neutral" &&
                            d.latestCI.conclusion !== "skipped"
                          ? "danger"
                          : "info"
                    }
                  >
                    {d.latestCI.conclusion || d.latestCI.status}
                  </Pill>
                  <span className="font-semibold">{d.latestCI.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {d.latestCI.event || "unknown event"} · commit{" "}
                  {d.latestCI.sha?.slice(0, 7) || "not reported"}
                  {d.latestCI.createdAt ? " · " + relativeTime(d.latestCI.createdAt) : ""}
                </p>
                <a
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  href={d.latestCI.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open run on GitHub <ExternalLink size={11} />
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No workflow run was returned for this repository.
              </p>
            )}
          </Card>
          <Card title="Newest open pull requests">
            {d.recentOpenPRs.length ? (
              <ul className="space-y-2 text-sm">
                {d.recentOpenPRs.map((p) => (
                  <li key={p.number} className="flex items-start justify-between gap-3">
                    <a
                      className="min-w-0 font-medium text-primary hover:underline"
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-muted-foreground">#{p.number}</span> {p.title}
                    </a>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(p.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No open pull requests were returned.</p>
            )}
            {d.openPRsTruncated && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Showing the three newest — this is not the total open PR count.
              </p>
            )}
          </Card>
          <Card title="GitHub deployment records">
            {d.deployments.length ? (
              <ul className="space-y-1.5 text-sm">
                {d.deployments.map((p, i) => (
                  <li key={p.url + i} className="flex flex-wrap items-center gap-x-2 text-xs">
                    <a
                      className="font-semibold text-primary hover:underline"
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {p.environment}
                    </a>
                    <span className="text-muted-foreground">
                      {p.ref || "ref unavailable"} ·{" "}
                      {p.createdAt ? relativeTime(p.createdAt) : "date unavailable"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                None returned. Cloudflare direct uploads do not appear here.
              </p>
            )}
          </Card>
          <p className="text-[11px] text-muted-foreground">
            Workflow and deployment records describe automation, not whether a public URL is
            responding.
          </p>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── plan tab ───────────────────────── */

function PlanTab({
  row,
  onSave,
  onFullEdit,
}: {
  row: RepoOpsRow;
  onSave: (patch: Partial<GitHubRepo>) => Promise<void>;
  onFullEdit: () => void;
}) {
  const [priority, setPriority] = useState(row.plan.priority || "");
  const [status, setStatus] = useState(row.plan.status);
  const [next, setNext] = useState(row.plan.pendingSummary || "");
  const [done, setDone] = useState(row.plan.doneSummary || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setPriority(row.plan.priority || "");
    setStatus(row.plan.status);
    setNext(row.plan.pendingSummary || "");
    setDone(row.plan.doneSummary || "");
  }, [row.key, row.plan.priority, row.plan.status, row.plan.pendingSummary, row.plan.doneSummary]);
  const dirty =
    priority !== (row.plan.priority || "") ||
    status !== row.plan.status ||
    next !== (row.plan.pendingSummary || "") ||
    done !== (row.plan.doneSummary || "");
  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        ...(priority ? { priority: priority as GitHubRepo["priority"] } : {}),
        status,
        pendingSummary: next.trim(),
        doneSummary: done.trim(),
      });
    } finally {
      setSaving(false);
    }
  };
  const field =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) void save();
      }}
    >
      {!row.saved && (
        <p className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
          No saved plan yet. Saving creates a planning record for this repository on this device;
          nothing is changed on GitHub.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold">
          Priority
          <select
            className={field}
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
          >
            <option value="">Not set</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="text-xs font-semibold">
          Status
          <select
            className={field}
            value={status}
            onChange={(e) => setStatus(e.target.value as GitHubRepo["status"])}
          >
            <option value="active">Active</option>
            <option value="stable">Stable</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <label className="block text-xs font-semibold">
        Next action
        <textarea
          className={field}
          rows={3}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="The single most valuable thing to do here next"
        />
      </label>
      <label className="block text-xs font-semibold">
        Already done / current state
        <textarea
          className={field}
          rows={3}
          value={done}
          onChange={(e) => setDone(e.target.value)}
          placeholder="What is verified and working"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className={ctlPrimary} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save plan"}
        </button>
        <button type="button" className={ctl} onClick={onFullEdit}>
          All fields · URLs, database, topics
        </button>
        {dirty && <span className="text-[11px] text-muted-foreground">Unsaved changes</span>}
      </div>
    </form>
  );
}

/* ───────────────────────── main drawer ───────────────────────── */

export default function RepoDrawer({
  row,
  position,
  onClose,
  onStep,
  onSavePlan,
  onFullEdit,
  onOpenCloudflare,
  cloudflareComplete,
  onDeleted,
}: {
  row: RepoOpsRow | null;
  position: { index: number; total: number };
  onClose: () => void;
  onStep: (delta: number) => void;
  onSavePlan: (row: RepoOpsRow, patch: Partial<GitHubRepo>) => Promise<void>;
  onFullEdit: (plan: GitHubRepo) => void;
  onOpenCloudflare: (key: string) => void;
  cloudflareComplete: boolean;
  onDeleted: (row: RepoOpsRow, message: string) => void;
}) {
  const [tab, setTab] = useState("overview");
  const key = row?.key;
  // A new repository starts on Overview so stepping through a list stays predictable.
  useEffect(() => {
    setTab("overview");
  }, [key]);

  if (!row) return <Sheet open={false} onOpenChange={() => {}} />;
  const state = repoDeployState(row);
  const meta = row.owner.toLowerCase() === "douphealth" ? REPO_PORTFOLIO_META[row.name] : undefined;
  const relationships =
    row.owner.toLowerCase() === "douphealth" ? REPO_RELATIONSHIPS[row.name] || [] : [];
  const repoPath = row.key.split("/")[1];
  // Only repositories in a connected account can be deleted (its own server key).
  const ghPath = githubPath(row.url) || { owner: row.owner, repo: repoPath || "" };
  const canDelete =
    OWNERS.some((o) => o.toLowerCase() === ghPath.owner.toLowerCase()) && Boolean(ghPath.repo);
  const quick = [
    { label: "Code", url: row.url, icon: Code2 },
    { label: "PRs", url: row.url + "/pulls", icon: GitPullRequest },
    { label: "Issues", url: row.url + "/issues", icon: CircleDot },
    { label: "Actions", url: row.url + "/actions", icon: Play },
  ];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="space-y-2 border-b border-border/70 px-5 pb-3 pt-5 pr-12">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={iconBtn}
              onClick={() => onStep(-1)}
              disabled={position.index <= 0}
              aria-label="Previous repository (k)"
              title="Previous (k)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => onStep(1)}
              disabled={position.index >= position.total - 1}
              aria-label="Next repository (j)"
              title="Next (j)"
            >
              <ChevronRight size={16} />
            </button>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {position.index + 1} of {position.total} in current view
            </span>
          </div>
          <SheetTitle className="break-all text-left text-lg leading-tight">
            <span className="font-normal text-muted-foreground">{row.owner}/</span>
            {repoPath}
          </SheetTitle>
          <SheetDescription className="text-left">
            {row.description || "No description on GitHub."}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5">
            {row.visibility === "private" ? (
              <Pill tone="warn" icon={Lock}>
                Private
              </Pill>
            ) : (
              <Pill>Public</Pill>
            )}
            {row.archived && <Pill icon={Archive}>Archived</Pill>}
            {row.fork && <Pill icon={GitFork}>Fork</Pill>}
            {row.language && <Pill>{row.language}</Pill>}
            {row.stars ? <Pill icon={Star}>{row.stars}</Pill> : null}
            <Pill tone={DEPLOY_TONE[state]}>{REPO_DEPLOY_LABEL[state]}</Pill>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quick.map((q) => (
              <a
                key={q.label}
                className={ctl}
                href={q.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <q.icon size={13} /> {q.label}
              </a>
            ))}
            {row.appUrl && (
              <a className={ctl} href={row.appUrl} target="_blank" rel="noopener noreferrer">
                <Globe size={13} /> Open app
              </a>
            )}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-3 grid h-10 grid-cols-4 rounded-xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1">
              <Activity size={12} /> Activity
            </TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-3">
            <TabsContent value="overview" className="mt-0 space-y-3">
              <dl className="grid grid-cols-2 gap-2">
                <Fact label="Last push">
                  <span
                    title={row.pushedAt ? new Date(row.pushedAt).toLocaleString() : "Not verified"}
                  >
                    {relativeTime(row.pushedAt)}
                  </span>
                </Fact>
                <Fact label="Default branch">{row.defaultBranch || "Unknown"}</Fact>
                <Fact label="Open issues + PRs">
                  {row.openIssues === null ? "Unknown" : String(row.openIssues)}
                </Fact>
                <Fact label="Stars">{row.stars === null ? "Unknown" : String(row.stars)}</Fact>
              </dl>
              <p className="text-[11px] text-muted-foreground">
                Data: {SOURCE_LABEL[row.source]}. GitHub counts pull requests inside “open issues”.
              </p>

              <Card title="Deployment">
                {row.cloudflare.length > 0 ? (
                  <ul className="space-y-2">
                    {row.cloudflare.map((c) => {
                      const health = healthOf(c);
                      return (
                        <li
                          key={c.key}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-semibold">
                              <Cloud size={13} className="text-orange-500" /> {c.name}
                              <Pill
                                tone={
                                  health === "failing"
                                    ? "danger"
                                    : health === "building"
                                      ? "info"
                                      : health === "live"
                                        ? "good"
                                        : "neutral"
                                }
                              >
                                {health === "live"
                                  ? "Deployed"
                                  : health === "failing"
                                    ? "Build failed"
                                    : health === "building"
                                      ? "Building"
                                      : health === "none"
                                        ? "No deployment"
                                        : "Unverified"}
                              </Pill>
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {c.publicUrl ? hostOf(c.publicUrl) : "No verified public URL"}
                              {c.deployedAt ? " · deployed " + relativeTime(c.deployedAt) : ""}
                            </span>
                          </span>
                          <span className="flex gap-1.5">
                            <button
                              type="button"
                              className={ctl}
                              onClick={() => onOpenCloudflare(c.key)}
                            >
                              Manage here
                            </button>
                            <a
                              className={iconBtn}
                              href={c.projectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={"Open " + c.name + " in Cloudflare"}
                              title="Open in Cloudflare dashboard"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {cloudflareComplete
                      ? "No Cloudflare project reports this repository as its Git source. It may still be deployed elsewhere."
                      : "Cloudflare inventory is unavailable or incomplete, so deployment is unknown — not “undeployed”."}
                  </p>
                )}
                {row.appUrl ? (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                    <span className="min-w-0">
                      <a
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        href={row.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe size={12} /> {hostOf(row.appUrl)}
                      </a>
                      <span className="block text-muted-foreground">
                        {row.appEvidence?.providerAttested ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck size={11} /> {row.appEvidence.label}
                          </span>
                        ) : (
                          (row.appEvidence?.label || "Recorded URL") + " — not verified live"
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={ctl}
                      onClick={() => copyText(row.appUrl!, "App URL")}
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                    onClick={() => onFullEdit(row.plan)}
                  >
                    + Record a known app URL
                  </button>
                )}
              </Card>

              {(meta || relationships.length > 0) && (
                <Card title="Portfolio record">
                  {meta && (
                    <div className="space-y-1.5 text-xs">
                      <p>
                        <strong>{meta.portfolioState}</strong> · {meta.category}
                      </p>
                      {meta.parentWebsites.length > 0 && (
                        <p className="text-muted-foreground">
                          Parent site: {meta.parentWebsites.join(", ")}
                        </p>
                      )}
                      <p className="rounded-lg bg-muted/40 p-2">{meta.nextAction}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Evidence: {meta.evidence} · verified {meta.verifiedAsOf}
                      </p>
                    </div>
                  )}
                  {relationships.map((r) => (
                    <div
                      key={r.appId}
                      className="mt-2 rounded-lg border border-border/60 p-2 text-xs"
                    >
                      <p className="font-semibold">
                        {r.appName}{" "}
                        <span className="font-normal text-muted-foreground">
                          → {r.parentWebsite}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        {r.connectionType} · {r.hosting} · {r.evidenceStatus}
                      </p>
                    </div>
                  ))}
                </Card>
              )}
              {canDelete && (
                <DeleteForeverPanel
                  what="repository"
                  confirmText={ghPath.owner + "/" + ghPath.repo}
                  consequences={[
                    "All code, history, issues, pull requests and settings are removed from GitHub.",
                    "Cloudflare projects built from it keep their current version but can no longer rebuild.",
                    "Your saved plan for it stays in this app, hidden from the list.",
                  ]}
                  onDelete={() =>
                    deleteGitHubRepo({
                      data: {
                        owner: ghPath.owner,
                        repo: ghPath.repo,
                        confirm: ghPath.owner + "/" + ghPath.repo,
                      },
                    })
                  }
                  onDeleted={(outcome) => onDeleted(row, outcome.message)}
                />
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <ActivityTab row={row} active={tab === "activity"} />
            </TabsContent>

            <TabsContent value="plan" className="mt-0">
              <PlanTab
                row={row}
                onSave={(patch) => onSavePlan(row, patch)}
                onFullEdit={() => onFullEdit(row.plan)}
              />
            </TabsContent>

            <TabsContent value="links" className="mt-0 space-y-3">
              {repoLinkGroups(row).map((group) => (
                <Card key={group.title} title={group.title}>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {group.links.map((l) => (
                      <li key={l.url}>
                        <a
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="truncate">{l.label}</span>
                          <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
              <Card title="Clone">
                <div className="space-y-2">
                  {[
                    { label: "HTTPS", text: repoCloneCommand(row) },
                    { label: "SSH", text: repoSshCloneCommand(row) },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <Terminal size={13} className="shrink-0 text-muted-foreground" />
                      <code
                        className="min-w-0 flex-1 truncate rounded-lg bg-muted/60 px-2 py-1.5 text-[11px]"
                        title={c.text}
                      >
                        {c.text}
                      </code>
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={() => copyText(c.text, c.label + " clone command")}
                        aria-label={"Copy " + c.label + " clone command"}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
