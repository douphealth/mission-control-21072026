import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label?: string;
  count?: number;
}

/** Multi-select filter chip with counts. Empty selection means "any". */
export function FacetMenu({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const active = selected.length > 0;
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition",
            active
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
          {active && (
            <span className="rounded bg-primary/15 px-1 tabular-nums">{selected.length}</span>
          )}
          <ChevronDown size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        <div className="max-h-72 overflow-y-auto">
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {on && <Check size={10} />}
                </span>
                <span className="flex-1 truncate capitalize text-foreground">
                  {o.label ?? o.value}
                </span>
                {o.count !== undefined && (
                  <span className="tabular-nums text-muted-foreground">{o.count}</span>
                )}
              </button>
            );
          })}
          {!options.length && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Nothing to filter yet.</p>
          )}
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full rounded-md border-t border-border/60 px-2 py-1.5 text-left text-xs font-semibold text-primary hover:bg-muted"
          >
            Clear {label.toLowerCase()}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Single-choice segmented chip used for tri-state and one-of filters. */
export function ChoiceMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const current = options.find((o) => o.value === value);
  const isDefault = options[0]?.value === value;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition",
            !isDefault
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
          {!isDefault && <span className="font-bold">: {current?.label}</span>}
          <ChevronDown size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
          >
            <span className="w-3.5">
              {o.value === value && <Check size={12} className="text-primary" />}
            </span>
            <span className="text-foreground">{o.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
