// Settings store — theme, user prefs, persisted in Dexie
// Separated from data stores to prevent re-renders

import { create } from "zustand";
import { db } from "@/lib/db";
import type { UserSettings } from "@/lib/db";

export type ThemeName = "light" | "dark" | "sage" | "system";

interface SettingsState {
  userName: string;
  userRole: string;
  theme: ThemeName;
  isLoading: boolean;

  // Actions
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;
  updateSettings: (changes: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  userName: "Alex",
  userRole: "Digital Creator & Developer",
  theme: "dark",
  isLoading: true,

  setTheme: (t) => {
    set({ theme: t });
    db.settings.update("default", { theme: t });
    applyTheme(t);
  },

  toggleTheme: () => {
    const order: ThemeName[] = ["dark", "sage", "light"];
    const idx = order.indexOf(get().theme === "system" ? "dark" : get().theme);
    const next = order[(idx + 1) % order.length];
    get().setTheme(next);
  },

  updateSettings: async (changes) => {
    await db.settings.update("default", changes);
    if (changes.userName) set({ userName: changes.userName });
    if (changes.userRole) set({ userRole: changes.userRole });
    if (changes.theme) {
      set({ theme: changes.theme });
      applyTheme(changes.theme);
    }
  },

  loadSettings: async () => {
    const settings = await db.settings.get("default");
    if (settings) {
      set({
        userName: settings.userName || "Alex",
        userRole: settings.userRole || "Digital Creator & Developer",
        theme: settings.theme || "sage",
        isLoading: false,
      });
      applyTheme(settings.theme || "sage");
    } else {
      set({ isLoading: false });
      // New users get the SOTA Sage editorial skin by default.
      applyTheme("sage");
    }
  },
}));

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  if (theme === "sage") {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "sage");
    return;
  }
  root.removeAttribute("data-theme");
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}
