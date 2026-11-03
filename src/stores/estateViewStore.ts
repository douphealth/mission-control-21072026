import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { resilientWebStorage } from "@/lib/resilientStorage";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  type RepoFilters,
  type RepoSort,
  type SavedView,
} from "@/lib/estate/model";

/** View preferences for the GitHub and Cloudflare sections (device-local). */
interface EstateViewState {
  filters: RepoFilters;
  sort: RepoSort;
  layout: "table" | "cards";
  activeViewId: string | null;
  savedViews: SavedView[];
  cfTab: "attention" | "pages" | "workers" | "zones" | "storage" | "accounts";
  setFilters: (patch: Partial<RepoFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: RepoSort) => void;
  setLayout: (layout: "table" | "cards") => void;
  applyView: (view: SavedView) => void;
  saveView: (name: string) => void;
  deleteView: (id: string) => void;
  setCfTab: (tab: EstateViewState["cfTab"]) => void;
}

export const useEstateViewStore = create<EstateViewState>()(
  persist(
    (set, get) => ({
      filters: DEFAULT_FILTERS,
      sort: DEFAULT_SORT,
      layout: "table",
      activeViewId: "all",
      savedViews: [],
      cfTab: "attention",
      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch }, activeViewId: null })),
      resetFilters: () =>
        set({ filters: DEFAULT_FILTERS, sort: DEFAULT_SORT, activeViewId: "all" }),
      setSort: (sort) => set({ sort }),
      setLayout: (layout) => set({ layout }),
      applyView: (view) =>
        set({
          filters: { ...DEFAULT_FILTERS, ...view.filters },
          sort: view.sort,
          activeViewId: view.id,
        }),
      saveView: (name) => {
        const clean = name.trim().slice(0, 40);
        if (!clean) return;
        const id = "view-" + Date.now().toString(36);
        const { filters, sort, savedViews } = get();
        set({
          savedViews: [...savedViews, { id, name: clean, filters, sort }].slice(-20),
          activeViewId: id,
        });
      },
      deleteView: (id) =>
        set((s) => ({
          savedViews: s.savedViews.filter((v) => v.id !== id),
          activeViewId: s.activeViewId === id ? null : s.activeViewId,
        })),
      setCfTab: (cfTab) => set({ cfTab }),
    }),
    {
      name: "mc-estate-view",
      version: 1,
      storage: createJSONStorage(() => resilientWebStorage),
      // Search text is transient; everything else is a preference.
      partialize: (s) => ({
        filters: { ...s.filters, q: "" },
        sort: s.sort,
        layout: s.layout,
        activeViewId: s.activeViewId,
        savedViews: s.savedViews,
        cfTab: s.cfTab,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<EstateViewState>;
        return {
          ...current,
          ...p,
          filters: { ...DEFAULT_FILTERS, ...(p.filters ?? {}) },
          sort: p.sort ?? DEFAULT_SORT,
          savedViews: Array.isArray(p.savedViews) ? p.savedViews : [],
        };
      },
    },
  ),
);
