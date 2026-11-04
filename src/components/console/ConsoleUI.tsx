import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Keyboard, LayoutList, Rows3, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clampIndex,
  isTypingTarget,
  moveIndex,
  type ConsoleDensity,
  type FilterChip,
} from "@/lib/consoleKit";

/* ───────────────────────── shared class strings ───────────────────────── */

export const ctl =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const ctlPrimary =
  "inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const iconBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const selectCls =
  "h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/* ───────────────────────── health tiles ───────────────────────── */

export type Tone = "neutral" | "danger" | "warn" | "good" | "info";
const TONE: Record<Tone, { value: string; bar: string }> = {
  neutral: { value: "text-foreground", bar: "bg-border" },
  danger: { value: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
  warn: { value: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  good: { value: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  info: { value: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500" },
};

/** A KPI that is also a filter: clicking it applies the matching view. */
export function HealthTile({
  label,
  value,
  hint,
  tone = "neutral",
  active,
  disabled,
  onClick,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: ComponentType<{ size?: number; className?: string }>;
}) {
  const quiet = value === 0 || value === "0";
  const t = TONE[quiet && tone !== "neutral" ? "neutral" : tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`group relative min-w-[9.25rem] flex-1 snap-start overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
        active
          ? "border-primary/60 bg-primary/10 shadow-sm"
          : "border-border/70 bg-card/80 hover:border-primary/35 hover:bg-card"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${quiet ? "bg-border" : t.bar}`}
      />
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon size={13} className="shrink-0 text-muted-foreground/70" />}
      </span>
      <span className={`mt-1 block text-2xl font-extrabold tabular-nums leading-none ${t.value}`}>
        {value}
      </span>
      {hint && (
        <span
          className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground"
          title={hint}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

export function TileRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible"
    >
      {children}
    </div>
  );
}

/* ───────────────────────── status pill ───────────────────────── */

const PILL: Record<Tone, string> = {
  neutral: "border-border bg-muted/50 text-muted-foreground",
  danger: "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300",
  warn: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  good: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  info: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};
export function Pill({
  tone = "neutral",
  children,
  title,
  icon: Icon,
  spin,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  spin?: boolean;
}) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PILL[tone]}`}
    >
      {Icon && <Icon size={11} className={spin ? "animate-spin" : ""} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ───────────────────────── active filter chips ───────────────────────── */

export function ActiveFilters({
  chips,
  onClear,
  onReset,
}: {
  chips: readonly FilterChip[];
  onClear: (id: string) => void;
  onReset: () => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-1 text-[11px] font-semibold text-primary"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onClear(chip.id)}
            aria-label={"Remove filter " + chip.label}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── density + help toggles ───────────────────────── */

export function DensityToggle({
  value,
  onChange,
}: {
  value: ConsoleDensity;
  onChange: (value: ConsoleDensity) => void;
}) {
  const next: ConsoleDensity = value === "compact" ? "comfortable" : "compact";
  return (
    <button
      type="button"
      className={ctl + " !px-2.5"}
      onClick={() => onChange(next)}
      aria-label={value === "compact" ? "Switch to comfortable rows" : "Switch to compact rows"}
      title={value === "compact" ? "Comfortable rows" : "Compact rows — fit more on screen"}
    >
      {value === "compact" ? <Rows3 size={14} /> : <LayoutList size={14} />}
    </button>
  );
}

export type Shortcut = { keys: string[]; label: string };
export function ShortcutHelp({
  open,
  onOpenChange,
  title,
  shortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  shortcuts: readonly Shortcut[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={16} /> {title}
          </DialogTitle>
          <DialogDescription>
            Shortcuts are ignored while you are typing in a field.
          </DialogDescription>
        </DialogHeader>
        <dl className="mt-1 divide-y divide-border/60 text-sm">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-6 rounded-md border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── bulk bar ───────────────────────── */

/** Floats above the list while rows are selected. */
export function BulkBar({
  count,
  total,
  onSelectAll,
  onClear,
  children,
}: {
  count: number;
  /** Rows matching the current filters across all pages. */
  total: number;
  onSelectAll?: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  if (!count) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky bottom-20 z-20 mx-auto flex w-full max-w-full flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-card/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:bottom-4"
    >
      <strong className="tabular-nums">{count} selected</strong>
      <button
        type="button"
        className="font-semibold text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        Clear
      </button>
      {onSelectAll && count < total && (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={onSelectAll}
        >
          Select all {total} matching
        </button>
      )}
      <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
      {children}
    </div>
  );
}

/* ───────────────────────── keyboard navigation ───────────────────────── */

/**
 * j/k or ↑/↓ move a cursor, Enter opens, x selects, / focuses search,
 * ? shows help. Ignored while typing and while a confirmation is open.
 */
export function useListKeyboard<T>({
  items,
  enabled = true,
  keyOf,
  onOpen,
  onToggleSelect,
  onSearch,
  onHelp,
  onRefresh,
  onEscape,
  onMove,
}: {
  items: readonly T[];
  enabled?: boolean;
  keyOf: (item: T) => string;
  onOpen: (item: T) => void;
  onToggleSelect: (item: T) => void;
  onSearch: () => void;
  onHelp: () => void;
  onRefresh?: () => void;
  onEscape?: () => boolean | void;
  /** Called with the new index whenever the keyboard moves the cursor. */
  onMove?: (index: number) => void;
}) {
  const [cursor, setCursorState] = useState(-1);
  // The ref is the source of truth so rapid or repeated key presses never read a stale index.
  const cursorRef = useRef(-1);
  const setCursor = useCallback((next: number) => {
    cursorRef.current = next;
    setCursorState(next);
  }, []);
  const latest = useRef({
    items,
    onOpen,
    onToggleSelect,
    onSearch,
    onHelp,
    onRefresh,
    onEscape,
    onMove,
    enabled,
  });
  latest.current = {
    items,
    onOpen,
    onToggleSelect,
    onSearch,
    onHelp,
    onRefresh,
    onEscape,
    onMove,
    enabled,
  };

  useEffect(() => {
    setCursor(clampIndex(cursorRef.current, items.length));
  }, [items.length, setCursor]);

  const move = useCallback(
    (delta: number) => {
      const next = moveIndex(cursorRef.current, delta, latest.current.items.length);
      setCursor(next);
      if (next >= 0) latest.current.onMove?.(next);
      return next;
    },
    [setCursor],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const s = latest.current;
      // Skip keys another layer (e.g. a drawer closing on Escape) already handled.
      if (event.defaultPrevented) return;
      if (!s.enabled || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('[role="alertdialog"]')) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      const item = s.items[cursorRef.current];
      switch (event.key) {
        case "j":
        case "ArrowDown":
          // Let arrows keep scrolling when nothing is being navigated.
          if (event.key === "ArrowDown" && cursorRef.current < 0) return;
          event.preventDefault();
          move(1);
          break;
        case "k":
        case "ArrowUp":
          if (event.key === "ArrowUp" && cursorRef.current < 0) return;
          event.preventDefault();
          move(-1);
          break;
        case "Enter":
        case "o":
          if (!item || tag === "A" || tag === "BUTTON") return;
          event.preventDefault();
          s.onOpen(item);
          break;
        case "x":
          if (!item) return;
          event.preventDefault();
          s.onToggleSelect(item);
          break;
        case "/":
          event.preventDefault();
          s.onSearch();
          break;
        case "?":
          event.preventDefault();
          s.onHelp();
          break;
        case "r":
          if (s.onRefresh) {
            event.preventDefault();
            s.onRefresh();
          }
          break;
        case "Escape":
          if (s.onEscape?.()) event.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  // Keep the cursor row visible.
  const key = cursor >= 0 && items[cursor] ? keyOf(items[cursor]) : null;
  useEffect(() => {
    if (!key) return;
    const el = document.querySelector<HTMLElement>('[data-row-key="' + CSS.escape(key) + '"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [key]);

  return { cursor, setCursor, cursorKey: key, move };
}

/* ───────────────────────── group header ───────────────────────── */

export function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <li
      role="presentation"
      className="sticky top-0 z-[1] flex items-center justify-between border-b border-border/70 bg-muted/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur"
    >
      <span>{label}</span>
      <span className="tabular-nums">{count}</span>
    </li>
  );
}
