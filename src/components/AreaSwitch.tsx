// Global view mode — All / Home / Business.
// This is a visibility filter, not an authorization boundary.
import { BriefcaseBusiness, House, Layers3 } from "lucide-react";
import { usePlanStore, type AreaFilter } from "@/stores/planStore";

const OPTIONS: {
  id: AreaFilter;
  label: string;
  compact: string;
  icon: typeof Layers3;
}[] = [
  { id: "all", label: "All", compact: "All", icon: Layers3 },
  { id: "personal", label: "Home", compact: "Home", icon: House },
  { id: "work", label: "Business", compact: "Work", icon: BriefcaseBusiness },
];

export default function AreaSwitch({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { area, setArea } = usePlanStore();

  return (
    <div
      role="radiogroup"
      aria-label="Workspace view"
      title="View filter only — Home and Business are not privacy boundaries"
      className={\`mc34-mode-switch inline-flex items-center rounded-2xl border border-border/60 bg-secondary/45 p-1 \${className}\`}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={area === option.id}
            onClick={() => setArea(option.id)}
            className={\`mc34-mode-option inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-3 \${
              area === option.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/55 hover:text-foreground"
            }\`}
          >
            <Icon size={13} strokeWidth={2} />
            <span>{compact ? option.compact : option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
