// ─── V10 ShortcutsOverlay — press ? for the keyboard map ─────────────────────
// Pure UI: a static list of the shortcuts that already exist in the app.
// Registered globally from DashboardHome so it works on the daily surface.

import { useEffect } from "react";
import { Command, Focus, Inbox, Keyboard, Search, X } from "lucide-react";

const GROUPS: { title: string; items: { keys: string; label: string; icon: typeof Search }[] }[] = [
  {
    title: "Capture",
    items: [
      { keys: "N", label: "Focus the capture bar", icon: Inbox },
      { keys: "⌘K / Ctrl K", label: "Command palette — search, jump, act", icon: Search },
      { keys: "⌘N / Ctrl N", label: "Quick add menu", icon: Command },
      { keys: "Esc", label: "Clear or close", icon: X },
    ],
  },
  {
    title: "Work",
    items: [{ keys: "Focus button", label: "Start a focus session on any task", icon: Focus }],
  },
];

export default function ShortcutsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="v10-card w-full max-w-md rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-[var(--shadow-lg)] backdrop-blur-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Keyboard size={16} />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-extrabold tracking-tight text-foreground">
                Shortcuts
              </h2>
              <p className="text-[10.5px] text-muted-foreground">
                The fast paths — everything is one keystroke away
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="zen-label text-[9.5px] font-bold uppercase tracking-[0.16em]">
                {g.title}
              </p>
              <ul className="mt-1.5 space-y-1">
                {g.items.map((it) => (
                  <li
                    key={it.keys}
                    className="flex items-center gap-3 rounded-2xl px-2.5 py-2 transition hover:bg-secondary/50"
                  >
                    <it.icon size={13} className="shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex-1 text-[12.5px] font-medium text-foreground">
                      {it.label}
                    </span>
                    <kbd className="rounded-lg border border-border/60 bg-secondary/70 px-2 py-1 font-mono text-[10px] font-bold text-foreground">
                      {it.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
