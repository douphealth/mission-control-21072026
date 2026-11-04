import { create } from "zustand";
import { useNavigationStore } from "@/stores/navigationStore";

/**
 * One-shot hand-off between the GitHub and Cloudflare consoles: "open this
 * repository / project in the other console". The target console consumes the
 * request once it has data, so nothing is persisted and nothing replays.
 */
export type ConsoleName = "github" | "cloudflare";
type Request = { console: ConsoleName; key: string; at: number };
/** A request nobody picked up (e.g. the target console never loaded) must not fire later. */
export const FOCUS_REQUEST_TTL_MS = 120_000;

interface ConsoleFocusState {
  request: Request | null;
  /** Switch workspace and ask that console to open `key` in its detail drawer. */
  open: (console: ConsoleName, key: string) => void;
  /** Return the pending request for `console` and clear it (null if none / not for it). */
  consume: (console: ConsoleName, now?: number) => string | null;
}

export const useConsoleFocus = create<ConsoleFocusState>((set, get) => ({
  request: null,
  open: (console, key) => {
    set({ request: { console, key, at: Date.now() } });
    useNavigationStore.getState().setActiveSection(console);
  },
  consume: (console, now = Date.now()) => {
    const request = get().request;
    if (!request || request.console !== console) return null;
    set({ request: null });
    return now - request.at <= FOCUS_REQUEST_TTL_MS ? request.key : null;
  },
}));
