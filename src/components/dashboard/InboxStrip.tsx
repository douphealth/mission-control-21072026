// Inbox: captured, undecided. Each item gets a one-tap decision.
import { useState } from "react";
import { Inbox, Pin, CalendarClock, Trash2, ChevronDown } from "lucide-react";
import type { Task } from "@/lib/db";
import { useUpdateItem } from "@/hooks/useTableData";
import { softDeleteTasks } from "@/lib/taskActions";
import { addDaysLocal } from "@/lib/overdue";

export default function InboxStrip({ tasks, today }: { tasks: Task[]; today: string }) {
  const updateItem = useUpdateItem();
  const [open, setOpen] = useState(false);
  if (!tasks.length) return null;
  const shown = open ? tasks : tasks.slice(0, 3);

  const pin = (t: Task) =>
    updateItem<Task>("tasks", t.id, { committedOn: today, inbox: false } as Partial<Task>);
  const later = (t: Task) => {
    const d = addDaysLocal(today, 1);
    return updateItem<Task>("tasks", t.id, {
      scheduledAt: d,
      notBefore: d,
      inbox: false,
    } as Partial<Task>);
  };

  return (
    <section
      className="enterprise-card rounded-[24px] p-3.5 sm:p-4"
      aria-labelledby="inbox-heading"
    >
      <div className="flex items-center justify-between">
        <h2
          id="inbox-heading"
          className="flex items-center gap-2 text-[12.5px] font-bold text-foreground"
        >
          <Inbox size={14} className="text-muted-foreground" /> Inbox
          <span className="rounded-full bg-secondary px-1.5 text-[10px] font-bold text-muted-foreground">
            {tasks.length}
          </span>
        </h2>
        {tasks.length > 3 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            {open ? "Less" : `All ${tasks.length}`}
            <ChevronDown size={12} className={open ? "rotate-180" : ""} />
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {shown.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-secondary/50"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{t.title}</span>
            <button
              onClick={() => pin(t)}
              title="Do today"
              aria-label={`Do “${t.title}” today`}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <Pin size={13} />
            </button>
            <button
              onClick={() => later(t)}
              title="Tomorrow"
              aria-label={`Plan “${t.title}” for tomorrow`}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <CalendarClock size={13} />
            </button>
            <button
              onClick={() => softDeleteTasks([t.id])}
              title="Delete (recoverable)"
              aria-label={`Delete “${t.title}”`}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
