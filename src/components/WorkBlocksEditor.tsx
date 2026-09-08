// Work blocks: when you intend to work. Add, move, split, complete — the
// deadline is never touched from here.
import { Plus, Trash2, CheckCircle2, Scissors } from "lucide-react";
import type { Task } from "@/lib/db";
import { blockMinutes, fmtMinutes, hhmmToMin, minToHHMM, DEFAULT_ESTIMATE_MIN } from "@/lib/planning";
import { addBlock, moveBlock, removeBlock, completeBlock, splitBlockToTomorrow } from "@/lib/taskActions";
import { todayISO } from "@/lib/overdue";
import { usePlanStore } from "@/stores/planStore";

const inputCls =
  "rounded-lg border border-border/50 bg-secondary/40 px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-primary/60";

export default function WorkBlocksEditor({ task }: { task: Task }) {
  const today = todayISO();
  const bump = usePlanStore((s) => s.bump);
  const blocks = [...(task.blocks ?? [])].sort((a, b) =>
    `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`),
  );
  const planned = blocks.filter((b) => !b.done).reduce((s, b) => s + blockMinutes(b), 0);
  const est = task.estimateMin ?? DEFAULT_ESTIMATE_MIN;

  const add = () => {
    const last = blocks[blocks.length - 1];
    const start = last ? last.end : "09:00";
    const remaining = Math.max(15, est - planned);
    void addBlock(task, {
      date: last?.date ?? today,
      start,
      end: minToHHMM(hhmmToMin(start) + Math.min(remaining, 120)),
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground">
          Work blocks{" "}
          <span className="font-normal">
            · {fmtMinutes(planned)} planned of {fmtMinutes(est)}
          </span>
        </span>
        <button
          onClick={add}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10.5px] font-bold text-primary hover:bg-primary/15"
        >
          <Plus size={11} /> Block
        </button>
      </div>
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
          No time reserved yet. Blocks are when you'll work; the deadline is separate.
        </p>
      )}
      <ul className="space-y-1">
        {blocks.map((b) => (
          <li
            key={b.id}
            className={`flex flex-wrap items-center gap-1.5 rounded-xl border border-border/40 bg-background/50 px-2 py-1.5 ${b.done ? "opacity-60" : ""}`}
          >
            <input
              type="date"
              value={b.date}
              disabled={b.done}
              onChange={(e) => {
                bump("blockMoves");
                void moveBlock(task, b.id, { date: e.target.value });
              }}
              className={inputCls}
              aria-label="Block date"
            />
            <input
              type="time"
              value={b.start}
              disabled={b.done}
              onChange={(e) => {
                const len = blockMinutes(b);
                bump("blockMoves");
                void moveBlock(task, b.id, { start: e.target.value, end: minToHHMM(hhmmToMin(e.target.value) + len) });
              }}
              className={inputCls}
              aria-label="Block start"
            />
            <span className="text-[10px] text-muted-foreground">–</span>
            <input
              type="time"
              value={b.end}
              disabled={b.done}
              onChange={(e) => void moveBlock(task, b.id, { end: e.target.value })}
              className={inputCls}
              aria-label="Block end"
            />
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{fmtMinutes(blockMinutes(b))}</span>
            {!b.done && (
              <>
                <button onClick={() => void completeBlock(task, b.id)} title="Block done (task stays open)" aria-label="Mark block done" className="rounded-md p-1 text-muted-foreground hover:text-emerald-500">
                  <CheckCircle2 size={13} />
                </button>
                {blockMinutes(b) >= 30 && (
                  <button onClick={() => void splitBlockToTomorrow(task, b.id, today)} title="Split: half now, half tomorrow" aria-label="Split block" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                    <Scissors size={13} />
                  </button>
                )}
              </>
            )}
            <button onClick={() => void removeBlock(task, b.id)} title="Remove block" aria-label="Remove block" className="rounded-md p-1 text-muted-foreground hover:text-destructive">
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
