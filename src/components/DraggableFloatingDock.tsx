import { GripVertical } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface Position {
  x: number;
  y: number;
}

interface DraggableFloatingDockProps {
  storageKey: string;
  defaultClassName: string;
  children: ReactNode;
  label?: string;
}

const VIEWPORT_MARGIN = 10;
const KEYBOARD_STEP = 18;
// Application controls belong below modal backdrops (40) and sheets (50).
const DOCK_Z_INDEX = 35;

/** Compact, keyboard-accessible, edge-snapping floating controls. */
export default function DraggableFloatingDock({
  storageKey,
  defaultClassName,
  children,
  label = "Move floating controls",
}: DraggableFloatingDockProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  // While the page scrolls the dock steps aside, so it never covers what is being read.
  // It returns as soon as scrolling stops. CSS decides whether that applies (phones only).
  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => {
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), 650);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.clearTimeout(timer);
    };
  }, []);

  const clamp = useCallback((x: number, y: number): Position => {
    const rect = rootRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 120;
    const height = rect?.height ?? 64;
    return {
      x: Math.max(VIEWPORT_MARGIN, Math.min(window.innerWidth - width - VIEWPORT_MARGIN, x)),
      y: Math.max(VIEWPORT_MARGIN, Math.min(window.innerHeight - height - VIEWPORT_MARGIN, y)),
    };
  }, []);

  const snapToNearestEdge = useCallback((value: Position): Position => {
    const rect = rootRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 120;
    const clamped = clamp(value.x, value.y);
    const center = clamped.x + width / 2;
    return {
      x: center <= window.innerWidth / 2 ? VIEWPORT_MARGIN : Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
      y: clamped.y,
    };
  }, [clamp]);

  const persist = useCallback((value: Position | null) => {
    try {
      if (value) localStorage.setItem(storageKey, JSON.stringify(value));
      else localStorage.removeItem(storageKey);
    } catch { /* Position is nonessential in restricted browser modes. */ }
  }, [storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
        setPosition(snapToNearestEdge({ x: parsed.x, y: parsed.y }));
      }
    } catch { /* Ignore stale positioning. */ }
  }, [storageKey, snapToNearestEdge]);

  useEffect(() => {
    const onResize = () => {
      setPosition(current => {
        if (!current) return current;
        const next = snapToNearestEdge(current);
        persist(next);
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [persist, snapToNearestEdge]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { pointerId: e.pointerId, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setPosition({ x: rect.left, y: rect.top });
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    setPosition(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
  }, [clamp]);

  const finishDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    setPosition(current => {
      if (!current) return current;
      const next = snapToNearestEdge(current);
      persist(next);
      return next;
    });
  }, [persist, snapToNearestEdge]);

  const reset = useCallback(() => {
    drag.current = null;
    setDragging(false);
    setPosition(null);
    persist(null);
  }, [persist]);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Home") { e.preventDefault(); reset(); return; }
    const delta = e.key === "ArrowLeft" ? [-KEYBOARD_STEP, 0]
      : e.key === "ArrowRight" ? [KEYBOARD_STEP, 0]
      : e.key === "ArrowUp" ? [0, -KEYBOARD_STEP]
      : e.key === "ArrowDown" ? [0, KEYBOARD_STEP] : null;
    if (!delta) return;
    e.preventDefault();
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const current = position ?? { x: rect.left, y: rect.top };
    const next = clamp(current.x + delta[0], current.y + delta[1]);
    setPosition(next);
    persist(next);
  }, [clamp, persist, position, reset]);

  return (
    <div
      ref={rootRef}
      className={position ? "fixed" : defaultClassName}
      style={{ zIndex: DOCK_Z_INDEX, ...(position ? { left: position.x, top: position.y } : {}) }}
      data-floating-dock
      data-scrolling={scrolling ? "true" : undefined}
    >
      <div className={`relative inline-flex items-center gap-1 rounded-[22px] border border-border/45 bg-background/88 p-1.5 shadow-[0_14px_45px_-18px_hsl(var(--foreground)/0.45)] backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-150 ${dragging ? "scale-[1.02] border-primary/50 shadow-[0_18px_55px_-18px_hsl(var(--primary)/0.55)]" : "hover:border-border/70"}`}>
        <button
          type="button"
          aria-label={label}
          title="Drag to move · release to snap to edge · double-click to reset"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onDoubleClick={reset}
          onKeyDown={onKeyDown}
          className={`flex h-10 w-5 shrink-0 touch-none items-center justify-center rounded-xl text-muted-foreground/60 transition hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${dragging ? "cursor-grabbing bg-primary/10 text-primary" : "cursor-grab"}`}
        >
          <GripVertical size={13} strokeWidth={2.2} />
        </button>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
