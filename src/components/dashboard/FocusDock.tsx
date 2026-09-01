// ─── FocusDock — Focus merged into Home ──────────────────────────────────────
// The Pomodoro timer stops being a separate destination. The Home hero's
// "Focus" action docks a compact session right on the page. Full-screen
// FocusPage remains for deep sessions (same engine, same hand-off).

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Pause, Play, RotateCcw, Timer, X } from "lucide-react";
import { toast } from "sonner";
import type { WorkItem } from "@/lib/workQueue";
import { useUpdateItem } from "@/hooks/useTableData";
import { todayISO } from "@/lib/overdue";

const FOCUS_MINUTES = 25;
const TOTAL = FOCUS_MINUTES * 60;

export default function FocusDock({
  item,
  onDone,
  onClose,
}: {
  item: WorkItem;
  onDone?: () => void;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(TOTAL);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const updateItem = useUpdateItem();
  const today = todayISO();

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    } else if (running && remaining === 0) {
      setRunning(false);
      // A finished dock session: keep the dock open so the user decides.
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining]);

  const complete = async () => {
    if (item.kind === "task") {
      await updateItem("tasks", item.refId, {
        status: "done",
        completedAt: new Date().toISOString(),
        touchedAt: today,
      } as never);
      toast.success(`"${item.title}" done — session closed`);
    } else {
      toast.info("Only tasks complete from the dock — open the item for other kinds");
      return;
    }
    onDone?.();
    onClose();
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = ((TOTAL - remaining) / TOTAL) * 100;
  const c = 2 * Math.PI * 15;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl sm:p-5">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="44" height="44" viewBox="0 0 36 36" className="-rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" className="stroke-white/15" />
            <circle
              cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" strokeLinecap="round"
              stroke="#6ee7b7"
              strokeDasharray={c}
              strokeDashoffset={c - (Math.min(100, pct) / 100) * c}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular-nums text-white">
            {mm}:{ss}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            <Timer size={10} /> Focus session
          </div>
          <div className="mt-1 truncate text-[14px] font-bold text-white">{item.title}</div>
          <div className="mt-0.5 text-[11px] text-white/60">
            {running ? "Running — one thing, no tabs" : remaining === 0 ? "Session complete" : "Paused"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition active:scale-95"
            title={running ? "Pause" : "Resume"}
          >
            {running ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <button
            onClick={() => setRemaining(TOTAL)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition active:scale-95"
            title="Reset"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={complete}
            className="flex h-10 items-center gap-1.5 rounded-2xl bg-white px-3 text-[12px] font-bold text-slate-900 transition active:scale-95"
            title="Complete the task"
          >
            <CheckCircle2 size={14} /> Done
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white/50 transition hover:text-white"
            title="Close dock"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
