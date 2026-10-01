// Settings store — theme, user prefs, persisted in Dexie
// Separated from data stores to prevent re-renders

import { create } from "zustand";
import { db } from "@/lib/db";
import type { UserSettings } from "@/lib/db";
import {
  nextDayNightTheme,
  resolveTheme,
  themeColor,
  type ResolvedTheme,
} from "@/lib/theme";

export type ThemeName = "light" | "dark" | "sage" | "system";

interface SettingsState {
  userName: string;
  userRole: string;
  theme: ThemeName;
  resolvedTheme: ResolvedTheme;
  floatingCaptureDockVisible: boolean;
  isLoading: boolean;

  // Actions
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;
  toggleDayNight: () => void;
  setFloatingCaptureDockVisible: (visible: boolean) => void;
  toggleFloatingCaptureDock: () => void;
  updateSettings: (changes: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  userName: "Alex",
  userRole: "Digital Creator & Developer",
  theme: "dark",
  resolvedTheme: "dark",
  floatingCaptureDockVisible: true,
  isLoading: true,

  setTheme: (t) => {
    const resolvedTheme = applyTheme(t);
    set({ theme: t, resolvedTheme });
    void db.settings.update("default", { theme: t });
  },

  toggleTheme: () => {
    const order: ThemeName[] = ["dark", "sage", "light"];
    const current = get().theme === "system" ? get().resolvedTheme : get().theme;
    const idx = order.indexOf(current === "system" ? "dark" : current);
    const next = order[(idx + 1) % order.length];
    get().setTheme(next);
  },

  toggleDayNight: () => {
    get().setTheme(nextDayNightTheme(get().resolvedTheme));
  },

  setFloatingCaptureDockVisible: (visible) => {
    set({ floatingCaptureDockVisible: visible });
    void db.settings.update("default", { floatingCaptureDockVisible: visible });
  },

  toggleFloatingCaptureDock: () => {
    get().setFloatingCaptureDockVisible(!get().floatingCaptureDockVisible);
  },

  updateSettings: async (changes) => {
    await db.settings.update("default", changes);
    if (changes.userName) set({ userName: changes.userName });
    if (changes.userRole) set({ userRole: changes.userRole });
    if (changes.theme) {
      set({ theme: changes.theme });
      applyTheme(changes.theme);
    }
    if (typeof changes.floatingCaptureDockVisible === "boolean") {
      set({ floatingCaptureDockVisible: changes.floatingCaptureDockVisible });
    }
  },

  loadSettings: async () => {
    const settings = await db.settings.get("default");
    if (settings) {
      const theme = (settings.theme || "sage") as ThemeName;
      const resolvedTheme = applyTheme(theme);
      set({
        userName: settings.userName || "Alex",
        userRole: settings.userRole || "Digital Creator & Developer",
        theme,
        resolvedTheme,
        floatingCaptureDockVisible: settings.floatingCaptureDockVisible !== false,
        isLoading: false,
      });
    } else {
      const resolvedTheme = applyTheme("sage");
      set({ isLoading: false, theme: "sage", resolvedTheme });
    }
  },
}));

function applyTheme(theme: ThemeName): ResolvedTheme {
  if (typeof document === "undefined") {
    return resolveTheme(theme, false);
  }

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(theme, prefersDark);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  if (resolved === "sage") root.setAttribute("data-theme", "sage");
  else root.removeAttribute("data-theme");

  root.style.colorScheme = resolved === "dark" ? "dark" : "light";

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeColor(resolved));

  return resolved;
}

if (typeof window !== "undefined") {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncSystemTheme = () => {
    const state = useSettingsStore.getState();
    if (state.theme !== "system") return;
    const resolvedTheme = applyTheme("system");
    useSettingsStore.setState({ resolvedTheme });
  };
  media.addEventListener?.("change", syncSystemTheme);
}
