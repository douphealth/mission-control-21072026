// ─── QuickCaptureBar — the universal front door ───────────────────────────────
// One input on Home (and in the palette). Type anything; the router decides.
// Live preview shows where it lands before you hit Enter. Never blocks flow.

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CornerDownLeft, Lightbulb, Link2, ListChecks, StickyNote, Bell } from "lucide-react";
import { toast } from "sonner";
import { parseCapture, toRecord, type CaptureTarget } from "@/lib/quickCapture";
import { useAddItem } from "@/hooks/useTableData";

const TARGET_META: Record<CaptureTarget, { icon: typeof ListChecks; label: string; tone: string }> = {
  tasks: { icon: ListChecks, label: "Task", tone: "text-primary" },
  reminders: { icon: Bell, label: "Reminder", tone: "text-info" },
  notes: { icon: StickyNote, label: "Note", tone: "text-amber-500" },
  ideas: { icon: Lightbulb, label: "Idea", tone: "text-violet-500" },
  links: { icon: Link2, label: "Link", tone: "text-emerald-500" },
};

export default function QuickCaptureBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const addItem = useAddItem();

  const preview = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);
  const meta = preview ? TARGET_META[preview.target] : null;

  const save = async () => {
    if (!preview || saving) return;
    setSaving(true);
    try {
      await addItem(preview.target, toRecord(preview) as never);
      toast.success(`${TARGET_META[preview.target].label} captured`, {
        description: preview.title.slice(0, 60),
      });
      setText("");
    } catch (e) {
      toast.error("Capture failed", { description: String((e as Error).message ?? e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="enterprise-card rounded-[24px] p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CornerDownLeft size={15} />
        </span>
        <input
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          placeholder="Capture anything… '>' task · '#' note · '!' idea · '@' reminder · paste a link"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {preview && meta && (
          <span className={`hidden items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:inline-flex ${meta.tone}`}>
            <meta.icon size={11} /> {meta.label}
            {preview.priority && <span className="text-muted-foreground">· {preview.priority}</span>}
            {preview.due && <span className="text-muted-foreground">· plan {preview.due.slice(5)}</span>}
          </span>
        )}
        <button
          onClick={save}
          disabled={!preview || saving}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-3.5 text-[12px] font-bold text-primary-foreground transition disabled:opacity-40 enabled:hover:shadow-[var(--shadow-primary)] enabled:active:scale-95"
        >
          {saving ? "…" : (<><CheckCircle2 size={13} /> Capture</>)}
        </button>
      </div>
      {preview && (
        <div className="mt-2 flex items-center gap-1.5 px-12 text-[10.5px] text-muted-foreground/70">
          <ArrowRight size={10} />
          <span className="truncate">
            Lands as <strong className="text-foreground/80">{TARGET_META[preview.target].label.toLowerCase()}</strong>
            {preview.due ? ` · planned ${preview.due}` : ""}
            {preview.time ? ` ${preview.time}` : ""}
          </span>
        </div>
      )}
    </section>
  );
}
