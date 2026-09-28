import { GripVertical } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

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

/**
 * Moveable floating-control wrapper.
 * Drag the grip to reposition; double-click/tap the grip to reset.
 * Position is persisted per control without touching Mission Control data.
 */
export default function DraggableFloatingDock({
  storageKey,
  defaultClassName,
  children,
  label = "Move floating controls",
}: DraggableFloatingDockProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const drag = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
        setPosition({ x: parsed.x, y: parsed.y });
      }
    } catch {
      // Ignore stale/invalid local positioning.
    }
  }, [storageKey]);

  const clamp = useCallback((x: number, y: number) => {
    const margin = 8;
    const width = 220;
    const height = 110;
    return {
      x: Math.max(margin, Math.min(window.innerWidth - width - margin, x)),
      y: Math.max(margin, Math.min(window.innerHeight - height - margin, y)),
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const root = e.currentTarget.parentElement;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    drag.current = { pointerId: e.pointerId, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPosition({ x: rect.left, y: rect.top });
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!drag.current || drag.current.pointerId !== e.pointerId) return;
      setPosition(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
    },
    [clamp],
  );

  const finishDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!drag.current || drag.current.pointerId !== e.pointerId) return;
      drag.current = null;
      setPosition((current) => {
        if (current) localStorage.setItem(storageKey, JSON.stringify(current));
        return current;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setPosition(null);
  }, [storageKey]);

  return (
    <div
      className={position ? "fixed z-[90]" : defaultClassName}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      <button
        type="button"
        aria-label={label}
        title="Drag to move · double-click to reset"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDoubleClick={reset}
        className="absolute -left-3 -top-3 z-[2] grid h-8 w-8 touch-none place-items-center rounded-full border border-border/50 bg-card/95 text-muted-foreground shadow-lg backdrop-blur hover:text-foreground"
      >
        <GripVertical size={15} />
      </button>
      {children}
    </div>
  );
}
