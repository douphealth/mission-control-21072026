import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Cloud,
  Copy,
  ExternalLink,
  GitBranch,
  Globe,
  LoaderCircle,
  Rocket,
  RotateCcw,
  Server,
  Undo2,
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
import { ConnectorError } from "@/components/TruthUI";
import DeleteForeverPanel from "@/components/console/DeleteForeverPanel";
import { deleteCloudflareProject } from "@/lib/providerDelete.functions";
import {
  getCloudflareDeploymentHistory,
  type CloudflareDeploymentRow,
  type DeploymentHistoryItem,
} from "@/lib/cloudflareInventory.functions";
import type { DeployHealth } from "@/lib/cloudflareInventory.server";
import { commitUrl, healthOf, hostOf, relativeTime } from "@/lib/cloudflareWorkspace";
import { cfDashboardLinks, cfRepoKey } from "@/lib/cloudflareConsole";
import { Pill, ctl, ctlPrimary, iconBtn, type Tone } from "@/components/console/ConsoleUI";

export type CfAction = "deploy" | "retry" | "rollback";

export const HEALTH_PILL: Record<
  DeployHealth,
  { label: string; tone: Tone; icon: typeof CircleCheck; spin?: boolean }
> = {
  live: { label: "Deployed", tone: "good", icon: CircleCheck },
  failing: { label: "Build failed", tone: "danger", icon: CircleX },
  building: { label: "Building", tone: "info", icon: LoaderCircle, spin: true },
  none: { label: "No deployment", tone: "neutral", icon: CircleDashed },
  unknown: { label: "Unverified", tone: "neutral", icon: CircleDot },
};

export function HealthPill({ row }: { row: CloudflareDeploymentRow }) {
  const health = healthOf(row);
  const ui = HEALTH_PILL[health];
  const title =
    health === "failing" && row.latestProduction
      ? "Latest production build " +
        row.latestProduction.status +
        "; an older deployment may still serve traffic"
      : "Cloudflare status: " + row.status + " (API metadata, not an uptime check)";
  return (
    <Pill tone={ui.tone} icon={ui.icon} spin={ui.spin} title={title}>
      {ui.label}
    </Pill>
  );
}

const copy = (text: string, what: string) =>
  void navigator.clipboard.writeText(text).then(
    () => toast.success(what + " copied"),
    () => toast.error("Clipboard access unavailable"),
  );

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{children}</dd>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/* Production history for one project, fetched when the Deployments tab shows. */
function HistoryTab({
  row,
  active,
  deployEnabled,
  busy,
  onAction,
  reloadToken,
}: {
  row: CloudflareDeploymentRow;
  active: boolean;
  deployEnabled: boolean;
  busy: string | null;
  onAction: (row: CloudflareDeploymentRow, action: CfAction, deploymentId?: string) => void;
  reloadToken: number;
}) {
  const [items, setItems] = useState<DeploymentHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(
    async (next: number) => {
      const mine = ++request.current;
      setLoading(true);
      setError(null);
      if (next === 1) {
        setItems([]);
        setPage(0);
      }
      try {
        const result = await getCloudflareDeploymentHistory({
          data: { accountId: row.accountId, kind: row.kind, name: row.name, page: next },
        });
        if (mine !== request.current) return;
        setItems((old) => (next === 1 ? result.rows : [...old, ...result.rows]));
        setPage(next);
        setLoadedFor(row.key);
      } catch {
        if (mine === request.current)
          setError(
            "Could not fetch authorized deployment history. Confirm token scope and try again.",
          );
      } finally {
        if (mine === request.current) setLoading(false);
      }
    },
    [row.accountId, row.kind, row.name, row.key],
  );

  // Switching project or finishing an action invalidates what we hold.
  useEffect(() => {
    request.current++;
    setItems([]);
    setPage(0);
    setError(null);
    setLoading(false);
    setLoadedFor(null);
  }, [row.key, reloadToken]);
  // Fetch only while the tab is visible, once per project.
  useEffect(() => {
    if (active && loadedFor !== row.key && !loading && !error) void load(1);
  }, [active, loadedFor, row.key, loading, error, load]);

  return (
    <div className="space-y-2">
      {!deployEnabled && row.kind === "pages" && (
        <p className="rounded-xl border border-border/70 bg-muted/40 p-3 text-[11px] text-muted-foreground">
          Retry / rollback / deploy are off for this account. Add a{" "}
          <code className="rounded bg-muted px-1">deploy</code> token with Cloudflare Pages: Edit to
          enable them.
        </p>
      )}
      {loading && items.length === 0 && (
        <p className="flex items-center gap-2 text-xs" role="status">
          <LoaderCircle size={13} className="animate-spin" /> Fetching deployment history…
        </p>
      )}
      {error && <ConnectorError message={error} onRetry={() => void load(page || 1)} />}
      {!loading && !error && loadedFor === row.key && items.length === 0 && (
        <p className="text-xs text-muted-foreground">No production deployments returned.</p>
      )}
      {items.map((item, index) => {
        const current = item.id === row.deploymentId;
        const ok = /^success$/i.test(item.status);
        const failed = /^(failure|failed|canceled)$/i.test(item.status);
        const link = commitUrl(row, item.commit);
        return (
          <div
            key={item.id + ":" + index}
            className={`rounded-xl border px-3 py-2 text-xs ${current ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold">
                {ok ? (
                  <CircleCheck size={13} className="text-emerald-500" />
                ) : failed ? (
                  <CircleX size={13} className="text-red-500" />
                ) : (
                  <CircleDot size={13} className="text-muted-foreground" />
                )}
                {item.status}
                {current && (
                  <span className="rounded bg-emerald-500/15 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                    serving
                  </span>
                )}
              </span>
              <span
                className="text-muted-foreground"
                title={item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
              >
                {relativeTime(item.createdAt)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
              {item.branch && <span>{item.branch}</span>}
              {item.commit &&
                (link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono hover:text-primary"
                  >
                    {item.commit.slice(0, 7)}
                  </a>
                ) : (
                  <span className="font-mono">{item.commit.slice(0, 7)}</span>
                ))}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary"
                >
                  Preview <ExternalLink size={10} />
                </a>
              )}
              {row.kind === "pages" && deployEnabled && (
                <span className="ml-auto flex gap-1.5">
                  {failed && (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      className={ctl + " !h-7 !px-2 !text-[11px]"}
                      onClick={() => onAction(row, "retry", item.id)}
                    >
                      <RotateCcw size={11} /> Retry
                    </button>
                  )}
                  {ok && !current && (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      className={ctl + " !h-7 !px-2 !text-[11px]"}
                      onClick={() => onAction(row, "rollback", item.id)}
                    >
                      <Undo2 size={11} /> Roll back here
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {items.length > 0 && items.length % 25 === 0 && page < 100 && (
        <button
          type="button"
          className={ctl + " w-full justify-center"}
          disabled={loading}
          onClick={() => void load(page + 1)}
        >
          {loading ? "Loading…" : "Older deployments"}
        </button>
      )}
    </div>
  );
}

export default function CloudflareDrawer({
  row,
  accountName,
  position,
  onClose,
  onStep,
  deployEnabled,
  busy,
  onAction,
  reloadToken,
  onOpenRepo,
  onDeleted,
}: {
  row: CloudflareDeploymentRow | null;
  accountName: (id: string) => string;
  position: { index: number; total: number };
  onClose: () => void;
  onStep: (delta: number) => void;
  deployEnabled: boolean;
  busy: string | null;
  onAction: (row: CloudflareDeploymentRow, action: CfAction, deploymentId?: string) => void;
  reloadToken: number;
  onOpenRepo: (repoKey: string) => void;
  onDeleted: (row: CloudflareDeploymentRow, message: string) => void;
}) {
  const [tab, setTab] = useState("overview");
  const key = row?.key;
  useEffect(() => {
    setTab("overview");
  }, [key]);
  if (!row) return <Sheet open={false} onOpenChange={() => {}} />;

  const health = healthOf(row);
  const repoKey = cfRepoKey(row);
  const sha = commitUrl(row);
  const canDeploy = deployEnabled && (row.sourceType === "github" || row.sourceType === "gitlab");
  const endpoints = [
    row.publicUrl && { label: "Primary URL", url: row.publicUrl },
    row.pagesDevUrl &&
      row.pagesDevUrl !== row.publicUrl && { label: "pages.dev", url: row.pagesDevUrl },
    row.workersDevUrl &&
      row.workersDevUrl !== row.publicUrl && { label: "workers.dev", url: row.workersDevUrl },
    ...row.domains
      .filter((d) => hostOf(row.publicUrl) !== d)
      .map((d) => ({ label: "Custom domain", url: "https://" + d })),
  ].filter((e): e is { label: string; url: string } => Boolean(e));

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
              aria-label="Previous project (k)"
              title="Previous (k)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => onStep(1)}
              disabled={position.index >= position.total - 1}
              aria-label="Next project (j)"
              title="Next (j)"
            >
              <ChevronRight size={16} />
            </button>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {position.index + 1} of {position.total} in current view
            </span>
          </div>
          <SheetTitle className="flex items-center gap-2 break-all text-left text-lg leading-tight">
            {row.kind === "pages" ? (
              <Cloud size={17} className="shrink-0 text-orange-500" />
            ) : (
              <Server size={17} className="shrink-0 text-sky-500" />
            )}
            {row.name}
          </SheetTitle>
          <SheetDescription className="text-left">
            {accountName(row.accountId)} ·{" "}
            {row.kind === "pages"
              ? row.sourceType === "direct_upload"
                ? "Pages · direct upload"
                : "Pages project"
              : "Worker"}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5">
            <HealthPill row={row} />
            {row.sourceType === "direct_upload" && <Pill>Direct upload</Pill>}
            {row.domains.length > 0 && <Pill tone="info">Custom domain</Pill>}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {row.publicUrl && (
              <a className={ctl} href={row.publicUrl} target="_blank" rel="noopener noreferrer">
                <Globe size={13} /> Open site
              </a>
            )}
            <a className={ctl} href={row.projectUrl} target="_blank" rel="noopener noreferrer">
              <Cloud size={13} /> Cloudflare
            </a>
            {row.repoUrl && (
              <a className={ctl} href={row.repoUrl} target="_blank" rel="noopener noreferrer">
                <GitBranch size={13} /> Repo
              </a>
            )}
            {canDeploy && (
              <button
                type="button"
                className={ctlPrimary}
                disabled={Boolean(busy)}
                onClick={() => onAction(row, "deploy")}
              >
                <Rocket size={13} /> Deploy latest
              </button>
            )}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-3 grid h-10 grid-cols-3 rounded-xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deployments">Deployments</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-3">
            <TabsContent value="overview" className="mt-0 space-y-3">
              <dl className="grid grid-cols-2 gap-2">
                <Fact label="Serving since">
                  <span
                    title={
                      row.deployedAt
                        ? new Date(row.deployedAt).toLocaleString()
                        : "No deployment reported"
                    }
                  >
                    {relativeTime(row.deployedAt)}
                  </span>
                </Fact>
                <Fact label="Status">{row.status || "Unknown"}</Fact>
                <Fact label="Source">
                  {row.sourceType === "github"
                    ? "GitHub"
                    : row.sourceType === "gitlab"
                      ? "GitLab"
                      : row.sourceType === "direct_upload"
                        ? "Direct upload"
                        : "Not verified"}
                </Fact>
                <Fact label="Branch @ commit">
                  {row.branch || "—"}
                  {sha ? (
                    <>
                      {" @ "}
                      <a
                        href={sha}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline"
                      >
                        {row.commit?.slice(0, 7)}
                      </a>
                    </>
                  ) : null}
                </Fact>
              </dl>

              {health === "failing" && row.latestProduction && (
                <p className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-800 dark:text-red-200">
                  The newest production build ({row.latestProduction.status}
                  {row.latestProduction.createdAt
                    ? ", " + relativeTime(row.latestProduction.createdAt)
                    : ""}
                  {row.latestProduction.commit
                    ? ", commit " + row.latestProduction.commit.slice(0, 7)
                    : ""}
                  ) failed. An earlier deployment may still be serving traffic — see the Deployments
                  tab.
                </p>
              )}

              <Card title="Endpoints">
                {endpoints.length ? (
                  <ul className="space-y-1.5">
                    {endpoints.map((e) => (
                      <li key={e.url} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {e.label}
                          </span>
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate font-medium text-primary hover:underline"
                          >
                            {hostOf(e.url)}
                          </a>
                        </span>
                        <button
                          type="button"
                          className={iconBtn}
                          onClick={() => copy(e.url, e.label)}
                          aria-label={"Copy " + e.label}
                        >
                          <Copy size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {row.kind === "worker"
                      ? "No verified public URL — check routes and workers.dev settings."
                      : "Not published."}
                  </p>
                )}
                {row.routes.length > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Routes: {row.routes.slice(0, 6).join(", ")}
                    {row.routes.length > 6 ? " +" + (row.routes.length - 6) : ""}
                  </p>
                )}
              </Card>

              <Card title="Source repository">
                {row.repoUrl ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 text-sm">
                      <a
                        href={row.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.repoUrl.replace("https://github.com/", "")}
                      </a>
                      <span className="block text-[11px] text-muted-foreground">
                        {row.repoEvidence === "worker-build"
                          ? "Reported by Cloudflare Workers Builds — not proof of the serving commit"
                          : "Reported by Cloudflare as this project’s Git source"}
                      </span>
                    </span>
                    {repoKey && (
                      <button type="button" className={ctl} onClick={() => onOpenRepo(repoKey)}>
                        Manage repo here
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {row.sourceType === "direct_upload"
                      ? "Direct upload (wrangler) — Cloudflare holds no Git source for this project."
                      : "Git source not reported by the available Cloudflare API scopes."}
                  </p>
                )}
              </Card>
              <DeleteForeverPanel
                what={row.kind === "pages" ? "Pages project" : "Worker"}
                confirmText={row.name}
                consequences={[
                  row.kind === "pages"
                    ? "All deployments and the pages.dev address are removed."
                    : "The Worker's code, routes and workers.dev address are removed.",
                  row.domains.length
                    ? "Its custom domains (" + row.domains.join(", ") + ") stop serving it."
                    : "Anything linking to its address will stop working.",
                  "Account: " + accountName(row.accountId) + ". The GitHub repository is not touched.",
                ]}
                onDelete={() =>
                  deleteCloudflareProject({
                    data: { accountId: row.accountId, kind: row.kind, name: row.name, confirm: row.name },
                  })
                }
                onDeleted={(outcome) => onDeleted(row, outcome.message)}
              />
            </TabsContent>

            <TabsContent value="deployments" className="mt-0">
              <p className="mb-2 text-xs text-muted-foreground">
                Production deployments · Cloudflare API
              </p>
              <HistoryTab
                row={row}
                active={tab === "deployments"}
                deployEnabled={deployEnabled}
                busy={busy}
                onAction={onAction}
                reloadToken={reloadToken}
              />
            </TabsContent>

            <TabsContent value="links" className="mt-0 space-y-3">
              <Card title="Cloudflare dashboard">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {cfDashboardLinks(row).map((l) => (
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
              {row.repoUrl && (
                <Card title="GitHub">
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {[
                      { label: "Repository", url: row.repoUrl },
                      { label: "Actions", url: row.repoUrl + "/actions" },
                      {
                        label: "Commits",
                        url: row.repoUrl + "/commits/" + encodeURIComponent(row.branch || ""),
                      },
                      {
                        label: "Edit in github.dev",
                        url: "https://github.dev/" + row.repoUrl.replace("https://github.com/", ""),
                      },
                    ].map((l) => (
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
              )}
              <Card title="Copy">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={ctl}
                    onClick={() => copy(row.name, "Project name")}
                  >
                    <Copy size={12} /> Name
                  </button>
                  {row.publicUrl && (
                    <button
                      type="button"
                      className={ctl}
                      onClick={() => copy(row.publicUrl!, "Live URL")}
                    >
                      <Copy size={12} /> Live URL
                    </button>
                  )}
                  {row.pagesDevUrl && (
                    <button
                      type="button"
                      className={ctl}
                      onClick={() => copy(row.pagesDevUrl!, "pages.dev URL")}
                    >
                      <Copy size={12} /> pages.dev URL
                    </button>
                  )}
                  <button
                    type="button"
                    className={ctl}
                    onClick={() => copy(row.projectUrl, "Dashboard URL")}
                  >
                    <Copy size={12} /> Dashboard URL
                  </button>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
