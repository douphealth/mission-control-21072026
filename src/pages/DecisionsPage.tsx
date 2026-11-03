import { useMemo, useRef, useState } from "react";
import {
  Scale,
  RefreshCcw,
  Check,
  X,
  Clock,
  History,
  Search,
  ArrowRight,
  ExternalLink,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDecisions,
  useSEOIssues,
  useStreamItems,
  useTasks,
  useSyncHealth,
  useAuditLog,
  usePayments,
  useUpdateItem,
} from "@/hooks/useTableData";
import {
  generateDecisions,
  actOnDecision,
  ignoreDecision,
  deferDecision,
  reopenDueDecisions,
  upsertDecision,
  SEVERITY_STYLE,
} from "@/lib/decisions";
import { describeAudit, restoreFromAudit } from "@/lib/audit";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { relTime } from "@/components/controlcenter/ui";
import { useNavigationStore } from "@/stores/navigationStore";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import type { Decision } from "@/lib/db";

const FILTERS = ["open", "acted", "later", "ignored"] as const;
const LABELS = { open: "Open", acted: "Task linked", later: "Deferred", ignored: "Dismissed" };
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const SOURCES: Record<Decision["source"], { label: string; section: string }> = {
  seo: { label: "SEO", section: "seo" },
  mention: { label: "Mentions", section: "mentions" },
  audience: { label: "Audience", section: "audience" },
  sync: { label: "Synchronization", section: "settings" },
  task: { label: "Tasks", section: "tasks" },
  payment: { label: "Finance", section: "payments" },
  site: { label: "Websites", section: "websites" },
  manual: { label: "Manual finding", section: "decisions" },
};
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-50";
const input = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

export default function DecisionsPage() {
  const decisions = useDecisions();
  const seoIssues = useSEOIssues();
  const streamItems = useStreamItems();
  const tasks = useTasks();
  const health = useSyncHealth();
  const payments = usePayments();
  const audit = useAuditLog(40);
  const updateItem = useUpdateItem();
  const navigate = useNavigationStore((state) => state.setActiveSection);
  const focusTask = useNavigationStore((state) => state.setFocusTaskId);
  const cd = useConfirmDialog();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [dismiss, setDismiss] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    context: "",
    recommendation: "",
    severity: "medium" as Decision["severity"],
  });
  const lock = useRef(false);
  const list = useMemo(
    () =>
      decisions
        .filter(
          (d) =>
            d.status === filter &&
            (source === "all" || d.source === source) &&
            `${d.title} ${d.context} ${d.recommendation || ""}`
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase()),
        )
        .sort(
          (a, b) =>
            SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
            b.updatedAt.localeCompare(a.updatedAt),
        ),
    [decisions, filter, source, query],
  );

  async function operation(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      const message =
        failure instanceof Error
          ? failure.message
          : "The change could not be saved. Please try again.";
      setError(message);
      toast.error("Action failed", { description: message });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function scan() {
    void operation(async () => {
      const reopened = await reopenDueDecisions();
      const created = await generateDecisions({
        seoIssues,
        mentions: streamItems,
        tasks,
        health,
        payments,
      });
      setLastScan(new Date().toISOString());
      toast.success(`${created} new findings · ${reopened} due for review`, {
        description:
          "Checked saved source records. Refresh the source workspaces for new external observations.",
      });
    });
  }
  function openTask(id: string) {
    focusTask(id);
    navigate("tasks");
  }
  function act(finding: Decision) {
    void operation(async () => {
      const taskId = await actOnDecision(finding);
      toast.success("Task linked to finding", {
        description:
          "Creating a task records the next action; it does not verify that the issue is fixed.",
        action: { label: "Open task", onClick: () => openTask(taskId) },
      });
    });
  }
  const openCount = decisions.filter((d) => d.status === "open").length;
  const urgentCount = decisions.filter(
    (d) => d.status === "open" && ["critical", "high"].includes(d.severity),
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Scale}
        eyebrow="Operate / Evidence into action"
        title="Findings"
        subtitle="Review observations, record a decision, and link the next task. A created task is follow-up work; it is not proof that an issue is resolved."
        stats={[
          { label: "Open", value: openCount },
          { label: "High priority", value: urgentCount, tone: "amber" },
          { label: "Deferred", value: decisions.filter((d) => d.status === "later").length },
        ]}
        actions={
          <>
            <button
              className={button}
              disabled={busy}
              onClick={() => {
                setAdding(true);
                setError("");
              }}
            >
              <Plus size={16} />
              Add finding
            </button>
            <button
              className={`${button} bg-primary text-primary-foreground`}
              disabled={busy}
              onClick={scan}
            >
              <RefreshCcw size={15} className={busy ? "animate-spin" : ""} />
              Review saved evidence
            </button>
          </>
        }
      />
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Evidence coverage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {seoIssues.length} saved SEO issues ·{" "}
              {streamItems.filter((item) => item.kind === "mention").length} mention records ·{" "}
              {tasks.length} tasks · {payments.length} finance records · {health.length} source
              statuses
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {lastScan
              ? `Local review ${relTime(lastScan)}`
              : "External sources are refreshed in their own workspaces"}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Findings keep the original observation context. Only active, identity-matched, recent
          mentions become new findings. An empty list means there are no matching saved findings; it
          does not certify that every system is healthy.
        </p>
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`${button} ${filter === value ? "border-primary/30 bg-primary/10 text-primary" : ""}`}
            >
              {LABELS[value]}
              <span className="text-xs">{decisions.filter((d) => d.status === value).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border px-3">
            <Search size={16} />
            <input
              aria-label="Search findings"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search findings and evidence"
            />
          </label>
          <select
            aria-label="Finding source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={`${input} sm:w-52`}
          >
            <option value="all">All sources</option>
            {Object.entries(SOURCES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      </section>
      {error && !dismiss && !adding && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 space-y-3" aria-label="Findings list">
          {!list.length && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Scale className="mx-auto text-primary" size={28} />
              <h2 className="mt-3 font-semibold">
                No matching {LABELS[filter].toLowerCase()} findings
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                Review saved evidence to turn recorded issues into decisions, or add a specific
                finding with its supporting context.
              </p>
              <button disabled={busy} onClick={scan} className={`${button} mt-4`}>
                <RefreshCcw size={15} />
                Review saved evidence
              </button>
            </div>
          )}
          {list.map((finding) => {
            const meta = SOURCES[finding.source] || SOURCES.manual;
            const mention =
              finding.source === "mention"
                ? streamItems.find((item) => item.id === finding.sourceRef)
                : undefined;
            const sourceUrl =
              mention?.url && /^https?:\/\//i.test(mention.url) ? mention.url : undefined;
            return (
              <article
                key={finding.id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      {meta.label} · observed {relTime(finding.createdAt)}
                    </p>
                    <h2 className="break-words text-base font-semibold leading-snug">
                      {finding.title}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg border px-2 py-1 text-xs capitalize ${SEVERITY_STYLE[finding.severity]}`}
                  >
                    {finding.severity}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {finding.context}
                </p>
                {finding.recommendation && (
                  <div className="mt-3 rounded-xl bg-secondary/60 p-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Suggested next action
                    </div>
                    <p className="mt-1 text-sm leading-relaxed">{finding.recommendation}</p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    Updated {relTime(finding.updatedAt)}
                  </span>
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 text-primary"
                    >
                      Open evidence
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    finding.source !== "manual" && (
                      <button
                        className="inline-flex min-h-8 items-center gap-1 text-primary"
                        onClick={() => {
                          if (finding.source === "task" && finding.sourceRef)
                            focusTask(finding.sourceRef);
                          navigate(meta.section);
                        }}
                      >
                        Open {meta.label}
                        <ArrowRight size={12} />
                      </button>
                    )
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {finding.status === "open" ? (
                    <>
                      <button
                        disabled={busy}
                        className={`${button} bg-primary text-primary-foreground`}
                        onClick={() => act(finding)}
                      >
                        <Check size={15} />
                        Create follow-up task
                      </button>
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void operation(async () => {
                            await deferDecision(finding, 7);
                            toast.success("Deferred for seven days");
                          })
                        }
                      >
                        <Clock size={15} />
                        Review in 7 days
                      </button>
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() => {
                          setDismiss(finding);
                          setReason("");
                          setError("");
                        }}
                      >
                        <X size={15} />
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                        {finding.status === "later"
                          ? `Review on ${finding.deferUntil || "the next evidence review"}`
                          : finding.resolutionNote ||
                            (finding.status === "acted"
                              ? "Follow-up task linked. Verify the result before treating the issue as fixed."
                              : "Dismissed")}
                      </p>
                      {finding.linkedTaskId && (
                        <button className={button} onClick={() => openTask(finding.linkedTaskId!)}>
                          Open task
                          <ArrowRight size={14} />
                        </button>
                      )}
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void operation(async () => {
                            await updateItem<Decision>("decisions", finding.id, {
                              status: "open",
                              deferUntil: undefined,
                              cooldownUntil: undefined,
                              resolvedAt: undefined,
                            });
                            toast.success("Finding reopened");
                          })
                        }
                      >
                        Reopen
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
        <aside className="h-fit rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History size={16} className="text-primary" />
            Recent workspace changes
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Local audit history · latest {audit.length} entries
          </p>
          <div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto">
            {!audit.length && (
              <p className="text-sm text-muted-foreground">
                Changes appear here after records are updated.
              </p>
            )}
            {audit.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border p-3">
                <p className="break-words text-xs font-medium leading-relaxed">
                  {describeAudit(entry)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{relTime(entry.at)}</span>
                  {entry.before && (entry.action === "delete" || entry.action === "update") && (
                    <button
                      disabled={busy}
                      className="min-h-8 text-xs font-semibold text-primary"
                      onClick={() =>
                        cd.confirm({
                          title: "Restore this saved version?",
                          description:
                            "The current record will be replaced with this recorded version. Later edits to that record may be overwritten.",
                          confirmLabel: "Restore version",
                          onConfirm: () =>
                            void operation(async () => {
                              if (!(await restoreFromAudit(entry)))
                                throw new Error("This version could not be restored.");
                              markCloudRecordDirty(entry.collection, entry.recordId);
                              queueCloudPush();
                              toast.success("Saved version restored");
                            }),
                        })
                      }
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <Dialog
        open={!!dismiss}
        onOpenChange={(open) => {
          if (!open && !lock.current) setDismiss(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Dismiss finding</DialogTitle>
          <DialogDescription>
            Keep the reason with this finding so it can be understood during a future review.
          </DialogDescription>
          <textarea
            aria-label="Reason for dismissal"
            className={`${input} min-h-28`}
            disabled={busy}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why does this finding need no further action?"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button className={button} disabled={busy} onClick={() => setDismiss(null)}>
              Cancel
            </button>
            <button
              className={`${button} bg-primary text-primary-foreground`}
              disabled={busy || !reason.trim()}
              onClick={() =>
                void operation(async () => {
                  if (dismiss) await ignoreDecision(dismiss, reason.trim());
                  setDismiss(null);
                  toast.success("Finding dismissed with reason");
                })
              }
            >
              Save decision
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={adding}
        onOpenChange={(open) => {
          if (!lock.current) setAdding(open);
        }}
      >
        <DialogContent>
          <DialogTitle>Add a finding</DialogTitle>
          <DialogDescription>
            Describe an observation and the evidence supporting it. Manual findings are labeled as
            manual.
          </DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void operation(async () => {
                if (!draft.title.trim() || !draft.context.trim())
                  throw new Error("Add a title and supporting context.");
                await upsertDecision({
                  ...draft,
                  title: draft.title.trim(),
                  context: draft.context.trim(),
                  source: "manual",
                });
                setAdding(false);
                setDraft({ title: "", context: "", recommendation: "", severity: "medium" });
                toast.success("Finding saved");
              });
            }}
          >
            <label className="block space-y-1 text-sm">
              Title
              <input
                required
                className={input}
                disabled={busy}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              Evidence and context
              <textarea
                required
                className={`${input} min-h-24`}
                disabled={busy}
                value={draft.context}
                onChange={(event) => setDraft({ ...draft, context: event.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              Next action
              <input
                className={input}
                disabled={busy}
                value={draft.recommendation}
                onChange={(event) => setDraft({ ...draft, recommendation: event.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              Priority
              <select
                className={input}
                disabled={busy}
                value={draft.severity}
                onChange={(event) =>
                  setDraft({ ...draft, severity: event.target.value as Decision["severity"] })
                }
              >
                {["low", "medium", "high", "critical"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                type="submit"
                className={`${button} bg-primary text-primary-foreground`}
              >
                {busy ? "Saving…" : "Save finding"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
