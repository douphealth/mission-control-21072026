// All / Personal / Work — a visibility filter over one planning system.
// It hides, it never protects: permissions are a separate concept.
import { usePlanStore, type AreaFilter } from "@/stores/planStore";

const OPTIONS: { id: AreaFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "personal", label: "Personal" },
  { id: "work", label: "Work" },
];

export default function AreaSwitch({ className = "" }: { className?: string }) {
  const { area, setArea } = usePlanStore();
  return (
    <div
      role="radiogroup"
      aria-label="Show tasks from"
      title="A view filter only — hidden items are not private"
      className={`inline-flex rounded-xl border border-border/60 bg-secondary/50 p-0.5 ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={area === o.id}
          onClick={() => setArea(o.id)}
          className={`rounded-[10px] px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            area === o.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
