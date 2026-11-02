import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, GitBranch, History, RotateCcw, RotateCw, Terminal } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getPagesDeploymentLogs,
  getPagesDeployments,
  runPagesDeploymentAction,
} from "@/lib/estate/estate.functions";
import type { CfDeployment } from "@/lib/estate/types";
import { sourceRepoState, type LinkedEstate } from "@/lib/estate/model";
import { useEstateSnapshotPassive } from "@/hooks/useEstate";
import { useNavigationStore } from "@/stores/navigationStore";
import {
  ago,
  DeployStatusPill,
  ExtLink,
  fullDate,
  PagesHealthPill,
  Pill,
  SkeletonRows,
  TypedConfirm,
} from "@/components/estate/bits";

export type LinkedPages = LinkedEstate["pages"][number];

export default function PagesDrawer({
  project,
  onClose,
  onChanged,
}: {
  project: LinkedPages | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Sheet open={Boolean(project)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        {project && <PagesDetail key={project.key} project={project} onChanged={onChanged} />}
      </SheetContent>
    </Sheet>
  );
}

function PagesDetail({ project: p, onChanged }: { project: LinkedPages; onChanged: () => void }) {
  const ghAccounts = useEstateSnapshotPassive()?.github.accounts ?? [];
  const qc = useQueryClient();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);
  const [logsFor, setLogsFor] = useState<CfDeployment | null>(
    p.latestDeployment?.status === "failure" ? p.latestDeployment : null,
  );
  const [pending, setPending] = useState<{
    action: "retry" | "rollback";
    deployment: CfDeployment;
  } | null>(null);
  const deployments = useQuery({
    queryKey: ["cf-pages-deployments", p.key],
    queryFn: () => getPagesDeployments({ data: { accountId: p.accountId, project: p.name } }),
    staleTime: 30_000,
  });
  const list = deployments.data?.ok ? deployments.data.data : [];

  const run = async (typed: string) => {
    if (!pending) return;
    const res = await runPagesDeploymentAction({
      data: {
        accountId: p.accountId,
        project: p.name,
        deploymentId: pending.deployment.id,
        action: pending.action,
        confirmName: typed,
      },
    }).catch(() => ({ ok: false as const, gate: "error" as const, message: "Request failed" }));
    if (res.ok) {
      toast.success(
        pending.action === "retry"
          ? "Retry started for " + p.name
          : p.name + " rolled back to " + pending.deployment.shortId,
      );
      await qc.invalidateQueries({ queryKey: ["cf-pages-deployments", p.key] });
      onChanged();
    } else {
      toast.error(res.message);
      throw new Error(res.message);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader className="space-y-2 border-b border-border/60 bg-card/60 p-5 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="info">Pages</Pill>
          <Pill tone="violet">{p.accountLabel}</Pill>
          <PagesHealthPill health={p.health} />
          {p.source.type === "github" ? (
            <Pill>
              Git: {p.source.owner}/{p.source.repo}
            </Pill>
          ) : (
            <Pill>Direct upload</Pill>
          )}
        </div>
        <SheetTitle className="font-mono text-lg">{p.name}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <ExtLink href={p.url}>{p.url?.replace(/^https:\/\//, "")}</ExtLink>
            {p.domains
              .filter((d) => !d.endsWith(".pages.dev"))
              .map((d) => (
                <ExtLink key={d} href={"https://" + d}>
                  {d}
                </ExtLink>
              ))}
            <ExtLink href={p.dashboardUrl}>Cloudflare dashboard</ExtLink>
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 p-5">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Production branch", p.productionBranch ?? "—"],
            ["Build command", p.buildCommand ?? "—"],
            ["Output", p.outputDir ?? "—"],
            ["Created", p.createdOn ? fullDate(p.createdOn).split(",")[0] : "—"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="min-w-0 rounded-xl border border-border/60 bg-background/50 px-2.5 py-2"
            >
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {k}
              </dt>
              <dd className="truncate font-mono text-xs text-foreground" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs">
          <GitBranch size={13} className="text-muted-foreground" />
          {p.linkedRepo ? (
            <>
              <span className="text-muted-foreground">Source repository</span>
              <button
                type="button"
                className="font-mono font-semibold text-primary hover:underline"
                onClick={() => {
                  setFocusEntity({ type: "repo", id: p.linkedRepo!, label: p.linkedRepo! });
                  setActiveSection("github");
                }}
              >
                {p.linkedRepo}
              </button>
              {p.linkMatch === "name" && (
                <span className="text-muted-foreground">(matched by name)</span>
              )}
            </>
          ) : p.source.owner ? (
            <SourceNote
              repo={p.source.owner + "/" + (p.source.repo ?? "")}
              state={sourceRepoState(p, ghAccounts)}
            />
          ) : (
            <span className="text-muted-foreground">
              Direct upload project. No Git source is connected.
            </span>
          )}
        </div>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <History size={13} /> Deployments
          </h3>
          {deployments.isLoading && <SkeletonRows rows={4} />}
          {deployments.data && !deployments.data.ok && (
            <p className="text-xs text-muted-foreground">{deployments.data.message}</p>
          )}
          {deployments.data?.ok && !list.length && (
            <p className="text-xs text-muted-foreground">No deployments yet.</p>
          )}
          {list.length > 0 && (
            <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
              {list.map((d) => {
                const canRollback =
                  d.environment === "production" &&
                  d.status === "success" &&
                  !d.isCurrentProduction;
                const canRetry = d.status === "failure" || d.status === "canceled";
                return (
                  <li
                    key={d.id}
                    className={"px-3 py-2 " + (logsFor?.id === d.id ? "bg-primary/5" : "")}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <DeployStatusPill status={d.status} stage={d.stage} />
                      <Pill tone={d.environment === "production" ? "violet" : "muted"}>
                        {d.environment}
                      </Pill>
                      {d.isCurrentProduction && <Pill tone="good">Live</Pill>}
                      <span className="font-mono text-muted-foreground">{d.shortId}</span>
                      {d.branch && <span className="text-muted-foreground">{d.branch}</span>}
                      <span className="ml-auto text-muted-foreground" title={fullDate(d.createdOn)}>
                        {ago(d.createdOn)}
                      </span>
                    </div>
                    {d.commitMessage && (
                      <div className="mt-0.5 truncate text-xs text-foreground">
                        {d.commitMessage}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        className="btn-secondary px-2 py-1 text-[11px]"
                        onClick={() => setLogsFor(logsFor?.id === d.id ? null : d)}
                      >
                        <Terminal size={11} /> {logsFor?.id === d.id ? "Hide log" : "Build log"}
                      </button>
                      {canRetry && (
                        <button
                          type="button"
                          className="btn-secondary px-2 py-1 text-[11px]"
                          onClick={() => setPending({ action: "retry", deployment: d })}
                        >
                          <RotateCw size={11} /> Retry
                        </button>
                      )}
                      {canRollback && (
                        <button
                          type="button"
                          className="btn-secondary px-2 py-1 text-[11px]"
                          onClick={() => setPending({ action: "rollback", deployment: d })}
                        >
                          <RotateCcw size={11} /> Roll back to this
                        </button>
                      )}
                      <ExtLink href={d.url} className="ml-auto text-[11px]">
                        Preview
                      </ExtLink>
                    </div>
                    {logsFor?.id === d.id && (
                      <BuildLog accountId={p.accountId} project={p.name} deploymentId={d.id} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <TypedConfirm
        open={Boolean(pending)}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.action === "retry" ? "Retry this deployment?" : "Roll back production?"}
        description={
          pending?.action === "retry" ? (
            <p>
              Cloudflare will rebuild deployment{" "}
              <span className="font-mono">{pending?.deployment.shortId}</span> of {p.name}. If it
              targets production and succeeds, it goes live.
            </p>
          ) : (
            <p>
              Production for {p.name} will immediately serve deployment{" "}
              <span className="font-mono">{pending?.deployment.shortId}</span> (
              {pending?.deployment.commitMessage ?? "no message"}). Visitors see the change straight
              away.
            </p>
          )
        }
        confirmText={p.name}
        actionLabel={pending?.action === "retry" ? "Retry deployment" : "Roll back"}
        onConfirm={run}
      />
    </div>
  );
}

function BuildLog({
  accountId,
  project,
  deploymentId,
}: {
  accountId: string;
  project: string;
  deploymentId: string;
}) {
  const q = useQuery({
    queryKey: ["cf-pages-log", accountId, project, deploymentId],
    queryFn: () => getPagesDeploymentLogs({ data: { accountId, project, deploymentId } }),
    staleTime: 60_000,
  });
  if (q.isLoading) return <div className="mt-2 h-24 animate-pulse rounded-lg bg-muted/50" />;
  if (!q.data?.ok)
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        {q.data?.message ?? "Build log unavailable."}
      </p>
    );
  const { lines, total } = q.data.data;
  const errorAt = lines.findIndex((l) => /error|failed|✘/i.test(l.line));
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border/60 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1 text-[10px] text-zinc-400">
        <FileText size={11} /> {total} lines
        {lines.length < total ? " · showing last " + lines.length : ""}
        {errorAt >= 0 && (
          <span className="ml-auto text-red-400">first error at line {errorAt + 1}</span>
        )}
      </div>
      <pre className="max-h-80 overflow-auto p-2 font-mono text-[11px] leading-relaxed text-zinc-200">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              /error|failed|✘/i.test(l.line)
                ? "text-red-400"
                : /warn/i.test(l.line)
                  ? "text-amber-300"
                  : undefined
            }
          >
            {l.line}
          </div>
        ))}
      </pre>
    </div>
  );
}

function SourceNote({ repo, state }: { repo: string; state: ReturnType<typeof sourceRepoState> }) {
  if (state === "missing")
    return (
      <span className="text-amber-700 dark:text-amber-300">
        Builds from {repo}, which is not in its owner&apos;s indexed repositories. It was probably
        deleted or renamed, so new pushes will not deploy.
      </span>
    );
  if (state === "not_indexed")
    return (
      <span className="text-muted-foreground">
        Builds from {repo}. That GitHub account is not connected here, so the repository could not
        be checked.
      </span>
    );
  return (
    <span className="text-muted-foreground">
      Builds from {repo}, owned by a GitHub account outside the four managed accounts.
    </span>
  );
}
