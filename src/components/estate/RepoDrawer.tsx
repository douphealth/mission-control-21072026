import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Cloud,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Lock,
  Pencil,
  Pin,
  PinOff,
  Play,
  Save,
  Tag,
  Workflow,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRepoLiveDetail } from "@/lib/estate/estate.functions";
import type { RepoPlanStatus, RepoPriority, RepoRow } from "@/lib/estate/model";
import type { GitHubRepo } from "@/lib/db";
import { useNavigationStore } from "@/stores/navigationStore";
import {
  ActivityPill,
  ago,
  CiPill,
  ExtLink,
  fullDate,
  HealthMeter,
  PagesHealthPill,
  Pill,
  PriorityPill,
  SkeletonRows,
} from "@/components/estate/bits";

type Save = (rows: RepoRow[], patch: Partial<GitHubRepo>) => Promise<boolean>;

export default function RepoDrawer({
  row,
  onClose,
  save,
  onEditRecord,
}: {
  row: RepoRow | null;
  onClose: () => void;
  save: Save;
  onEditRecord?: (row: RepoRow) => void;
}) {
  return (
    <Sheet open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        {row && <RepoDetail key={row.key} row={row} save={save} onEditRecord={onEditRecord} />}
      </SheetContent>
    </Sheet>
  );
}

function RepoDetail({
  row,
  save,
  onEditRecord,
}: {
  row: RepoRow;
  save: Save;
  onEditRecord?: (row: RepoRow) => void;
}) {
  const a = row.annotation;
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);
  const [draft, setDraft] = useState({
    priority: a.priority ?? "",
    status: a.status ?? "",
    tags: a.tags.join(", "),
    notes: a.notes,
    nextAction: a.nextAction,
  });
  useEffect(() => {
    setDraft({
      priority: a.priority ?? "",
      status: a.status ?? "",
      tags: a.tags.join(", "),
      notes: a.notes,
      nextAction: a.nextAction,
    });
  }, [a.priority, a.status, a.tags, a.notes, a.nextAction]);
  const dirty =
    draft.priority !== (a.priority ?? "") ||
    draft.status !== (a.status ?? "") ||
    draft.tags !== a.tags.join(", ") ||
    draft.notes !== a.notes ||
    draft.nextAction !== a.nextAction;

  const persist = async () => {
    const patch: Partial<GitHubRepo> = {
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
      notes: draft.notes.slice(0, 4000),
      pendingSummary: draft.nextAction.slice(0, 2000),
    };
    if (draft.priority) patch.priority = draft.priority as RepoPriority;
    if (draft.status) patch.status = draft.status as RepoPlanStatus;
    await save([row], patch);
  };

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader className="space-y-2 border-b border-border/60 bg-card/60 p-5 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="violet">{row.account}</Pill>
          {row.isPrivate ? (
            <Pill>
              <Lock size={10} />
              Private
            </Pill>
          ) : (
            <Pill>Public</Pill>
          )}
          {row.isArchived && (
            <Pill tone="warn">
              <Archive size={10} />
              Archived
            </Pill>
          )}
          {row.isFork && <Pill>Fork</Pill>}
          <PriorityPill priority={a.priority} />
          {a.category && <Pill tone="info">{a.category}</Pill>}
        </div>
        <SheetTitle className="break-all font-mono text-lg">{row.fullName}</SheetTitle>
        <SheetDescription className="text-sm">
          {row.description ?? "No description on GitHub."}
        </SheetDescription>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <CiPill state={row.ciState} />
          <ActivityPill band={row.activity} />
          <HealthMeter score={row.health.score} />
          <ExtLink href={row.url}>GitHub</ExtLink>
          <ExtLink href={row.homepage}>{row.homepage?.replace(/^https?:\/\//, "")}</ExtLink>
          <ExtLink href={row.url + "/actions"}>Actions</ExtLink>
        </div>
      </SheetHeader>

      <div className="space-y-5 p-5">
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            ["Open PRs", row.openPrs],
            ["Issues", row.openIssues],
            ["Commits", row.commitCount.toLocaleString()],
            ["Stars", row.stars],
            [
              "Size",
              row.diskKb > 1024 ? (row.diskKb / 1024).toFixed(1) + " MB" : row.diskKb + " KB",
            ],
            ["License", row.license ?? "—"],
          ].map(([k, v]) => (
            <div
              key={k as string}
              className="rounded-xl border border-border/60 bg-background/50 px-2.5 py-2"
            >
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {k}
              </dt>
              <dd className="truncate text-sm font-bold tabular-nums text-foreground">{v}</dd>
            </div>
          ))}
        </dl>

        {row.lastCommit && (
          <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/40 p-3 text-xs">
            <GitCommit size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">
                {row.lastCommit.message || "(no message)"}
              </div>
              <div className="text-muted-foreground">
                {row.lastCommit.author ?? "unknown"} · {ago(row.lastCommit.date)} on{" "}
                {row.defaultBranch ?? "default branch"} ·{" "}
                <span className="font-mono">{row.lastCommit.sha.slice(0, 7)}</span>
                {row.latestRelease && <> · release {row.latestRelease.tag}</>}
              </div>
            </div>
          </div>
        )}

        {row.health.flags.length > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              <AlertTriangle size={13} /> Health {row.health.score}/100
            </div>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {row.health.flags.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        )}

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Cloud size={13} /> Cloudflare deployments
          </h3>
          {row.links.length ? (
            <ul className="space-y-1.5">
              {row.links.map((l) => (
                <li
                  key={l.key}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs"
                >
                  <Pill tone={l.kind === "pages" ? "info" : "violet"}>
                    {l.kind === "pages" ? "Pages" : "Worker"}
                  </Pill>
                  <button
                    type="button"
                    className="font-semibold text-foreground hover:text-primary hover:underline"
                    onClick={() => {
                      setFocusEntity({
                        type: l.kind === "pages" ? "cf-pages" : "cf-worker",
                        id: l.key,
                        label: l.name,
                      });
                      setActiveSection("cloudflare");
                    }}
                  >
                    {l.name}
                  </button>
                  {l.health && <PagesHealthPill health={l.health} />}
                  <span className="text-muted-foreground">{l.accountLabel}</span>
                  <span className="text-muted-foreground">
                    · matched by {l.match === "source" ? "Git source" : "name"}
                  </span>
                  <ExtLink href={l.url} className="ml-auto">
                    {l.url?.replace(/^https:\/\//, "")}
                  </ExtLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No Cloudflare Pages project or Worker is linked to this repository.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-background/40 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Planning
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => void save([row], { pinned: !a.pinned })}
              >
                {a.pinned ? <PinOff size={12} /> : <Pin size={12} />} {a.pinned ? "Unpin" : "Pin"}
              </button>
              {onEditRecord && (
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => onEditRecord(row)}
                >
                  <Pencil size={12} /> Full record
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Priority
              <select
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              >
                <option value="">Not set</option>
                {["critical", "high", "medium", "low"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold text-muted-foreground">
              Status
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              >
                <option value="">Not set</option>
                {["active", "stable", "paused", "archived"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-[11px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Tag size={11} /> Tags (comma separated)
              </span>
              <input
                value={draft.tags}
                onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                placeholder="client, seo, revenue"
              />
            </label>
            <label className="col-span-2 text-[11px] font-semibold text-muted-foreground">
              Next action
              <textarea
                value={draft.nextAction}
                onChange={(e) => setDraft((d) => ({ ...d, nextAction: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="col-span-2 text-[11px] font-semibold text-muted-foreground">
              Notes
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Saved on this device and synced with your Mission Control cloud backup.</span>
            <button
              type="button"
              className="btn-primary text-xs disabled:opacity-40"
              disabled={!dirty}
              onClick={() => void persist()}
            >
              <Save size={12} /> Save
            </button>
          </div>
        </section>

        <LiveActivity row={row} />
      </div>
    </div>
  );
}

function LiveActivity({ row }: { row: RepoRow }) {
  const q = useQuery({
    queryKey: ["repo-live", row.key],
    queryFn: () =>
      getRepoLiveDetail({ data: { owner: row.owner, name: row.name, account: row.account } }),
    staleTime: 60_000,
  });
  const res = q.data;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Live from GitHub
        </h3>
        {res?.ok && (
          <span className="text-[11px] text-muted-foreground">
            fetched {ago(res.data.fetchedAt)}
          </span>
        )}
      </div>
      {q.isLoading && <SkeletonRows rows={4} />}
      {q.isError && <p className="text-xs text-red-600">Live detail request failed.</p>}
      {res && !res.ok && (
        <p className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
          {res.message}
        </p>
      )}
      {res?.ok && (
        <Tabs defaultValue="commits">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="commits">
              <GitCommit size={12} className="mr-1" />
              Commits {res.data.commits.length}
            </TabsTrigger>
            <TabsTrigger value="prs">
              <GitPullRequest size={12} className="mr-1" />
              PRs {res.data.pullRequests.length}
            </TabsTrigger>
            <TabsTrigger value="issues">Issues {res.data.issues.length}</TabsTrigger>
            <TabsTrigger value="runs">
              <Workflow size={12} className="mr-1" />
              Runs {res.data.workflowRuns.length}
            </TabsTrigger>
            <TabsTrigger value="more">
              <GitBranch size={12} className="mr-1" />
              Branches & releases
            </TabsTrigger>
          </TabsList>
          <TabsContent value="commits">
            <LiveList
              empty="No commits returned."
              items={res.data.commits.map((c) => ({
                key: c.sha,
                href: c.url,
                title: c.message || "(no message)",
                meta: (c.author ?? "unknown") + " · " + ago(c.date) + " · " + c.sha.slice(0, 7),
              }))}
            />
          </TabsContent>
          <TabsContent value="prs">
            <LiveList
              empty="No open pull requests."
              items={res.data.pullRequests.map((p) => ({
                key: String(p.number),
                href: p.url,
                title: "#" + p.number + " " + p.title,
                meta:
                  (p.draft ? "draft · " : "") +
                  (p.author ?? "unknown") +
                  " · opened " +
                  ago(p.createdAt),
              }))}
            />
          </TabsContent>
          <TabsContent value="issues">
            <LiveList
              empty="No open issues."
              items={res.data.issues.map((i) => ({
                key: String(i.number),
                href: i.url,
                title: "#" + i.number + " " + i.title,
                meta: [i.author ?? "unknown", "opened " + ago(i.createdAt), ...i.labels].join(
                  " · ",
                ),
              }))}
            />
          </TabsContent>
          <TabsContent value="runs">
            <LiveList
              empty="No workflow runs (Actions may be disabled)."
              items={res.data.workflowRuns.map((r) => ({
                key: String(r.id),
                href: r.url,
                title: (r.name ?? "workflow") + " · " + (r.conclusion ?? r.status ?? "unknown"),
                meta: [r.branch, r.event, ago(r.createdAt)].filter(Boolean).join(" · "),
                tone:
                  r.conclusion === "failure"
                    ? "bad"
                    : r.conclusion === "success"
                      ? "good"
                      : undefined,
              }))}
            />
          </TabsContent>
          <TabsContent value="more">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-bold text-muted-foreground">
                  Branches ({res.data.branches.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {res.data.branches.slice(0, 60).map((b) => (
                    <Pill key={b.name} tone={b.name === row.defaultBranch ? "info" : "muted"}>
                      {b.protected && <Lock size={9} />} {b.name}
                    </Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold text-muted-foreground">
                  Releases ({res.data.releases.length})
                </div>
                <LiveList
                  empty="No releases."
                  items={res.data.releases.map((r) => ({
                    key: r.tag,
                    href: r.url,
                    title: r.tag + (r.name && r.name !== r.tag ? " · " + r.name : ""),
                    meta: fullDate(r.publishedAt),
                  }))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
      {res?.ok && res.data.unavailable.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Not available with this token: {res.data.unavailable.join(", ")}.
        </p>
      )}
    </section>
  );
}

function LiveList({
  items,
  empty,
}: {
  items: { key: string; href: string | null; title: string; meta: string; tone?: "good" | "bad" }[];
  empty: string;
}) {
  if (!items.length) return <p className="py-3 text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
      {items.map((i) => (
        <li key={i.key} className="px-3 py-2">
          <a
            href={i.href ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground group-hover:text-primary">
              {i.tone && (
                <Play
                  size={9}
                  className={
                    i.tone === "bad"
                      ? "fill-red-500 text-red-500"
                      : "fill-emerald-500 text-emerald-500"
                  }
                />
              )}
              <span className="truncate">{i.title}</span>
            </div>
            <div className="truncate text-[11px] text-muted-foreground">{i.meta}</div>
          </a>
        </li>
      ))}
    </ul>
  );
}
