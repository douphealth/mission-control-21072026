import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Body portal avoids transformed dashboard ancestors clipping fixed editors. */
export default function TaskDialogFrame({ open = true, title, onClose, action, children }: {
  open?: boolean; title: string; onClose: () => void; action: ReactNode; children: ReactNode;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<CSSProperties>({ top: 0, height: '100dvh' });
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const update = () => setViewport({ top: vv?.offsetTop ?? 0, height: vv?.height ?? window.innerHeight });
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus({ preventScroll: true });
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div data-task-dialog-frame className="fixed inset-x-0 z-[300] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4" style={viewport}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
        className="flex h-full max-h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-card text-card-foreground shadow-2xl outline-none sm:h-auto sm:rounded-2xl"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
          if (event.key !== 'Tab') return;
          const targets = [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]') ?? [])].filter(el => el.getClientRects().length);
          const first = targets[0], last = targets.at(-1);
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 id={id} className="min-w-0 text-base font-bold">{title}</h2>
          <div className="flex shrink-0 items-center gap-2">{action}<button type="button" onClick={onClose} aria-label="Close task editor" className="grid h-11 w-11 place-items-center rounded-xl bg-secondary"><X size={18} /></button></div>
        </header>
        <div data-task-dialog-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{children}</div>
      </div>
    </div>, document.body,
  );
}
