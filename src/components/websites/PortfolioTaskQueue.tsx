import { useState } from "react";
import { Check, ListChecks, Play } from "lucide-react";
import type { Task } from "@/lib/db";
import { sortPortfolioQueue, type QueueEntry } from "@/lib/portfolioInsights";
import { PRIORITY_TONE } from "@/components/websites/portfolioConfig";
import { Chip } from "@/components/websites/portfolioParts";

export type PortfolioQueueItem = QueueEntry;

const STATUS_LABEL: Record<Task["status"], string> = {
  todo: "To do",
  "in-progress": "In progress",
  blocked: "Blocked",
  done: "Done",
};

export default function PortfolioTaskQueue({
  items,
  onStart,
  onDone,
}: {
  items: PortfolioQueueItem[];
  onStart: (task: Task) => void;
  onDone: (task: Task) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const ordered = sortPortfolioQueue(items);
  const visible = showAll ? ordered : ordered.slice(0, 8);

  return (
    <section className="pf-panel" aria-labelledby="pf-queue-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="pf-queue-title" className="pf-section-h">
            <ListChecks size={14} aria-hidden /> Portfolio task queue
          </h2>
          <p className="pf-note mt-1">
            {ordered.length} open {ordered.length === 1 ? "task" : "tasks"} across your websites,
            unblocked and highest priority first.
          </p>
        </div>
        {ordered.length > 8 && (
          <button type="button" className="pf-btn" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Show top 8" : `Show all ${ordered.length}`}
          </button>
        )}
      </div>

      {ordered.length === 0 ? (
        <div
          className="pf-note rounded-2xl border border-dashed p-6 text-center"
          style={{ borderColor: "hsl(var(--pf-line))" }}
        >
          Nothing open. Every linked task is done.
        </div>
      ) : (
        <div className="pf-queue">
          {visible.map(({ task, siteName }) => (
            <div key={task.id} className="pf-task">
              <button
                type="button"
                className="pf-check"
                onClick={() => onDone(task)}
                aria-label={`Mark "${task.title}" done`}
                title="Mark done"
              >
                <Check size={13} aria-hidden />
              </button>
              <div className="min-w-0">
                <div className="pf-task-title">{task.title}</div>
                <div className="pf-task-meta">
                  <Chip tone={PRIORITY_TONE[task.priority] ?? "muted"}>{task.priority}</Chip>
                  <Chip
                    tone={
                      task.status === "blocked"
                        ? "rose"
                        : task.status === "in-progress"
                          ? "amber"
                          : "muted"
                    }
                  >
                    {STATUS_LABEL[task.status]}
                  </Chip>
                  <span>{siteName ?? "Portfolio"}</span>
                  {task.estimateMin ? <span>· ~{task.estimateMin} min</span> : null}
                </div>
              </div>
              <div className="pf-task-actions">
                {task.status !== "in-progress" && (
                  <button type="button" className="pf-btn" onClick={() => onStart(task)}>
                    <Play size={12} aria-hidden /> Start
                  </button>
                )}
                <button
                  type="button"
                  className="pf-btn pf-btn--primary"
                  onClick={() => onDone(task)}
                >
                  <Check size={12} aria-hidden /> Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
