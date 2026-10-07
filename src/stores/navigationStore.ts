import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { resilientWebStorage } from '@/lib/resilientStorage';
import { sanitizeNavigation } from '@/lib/navigationPreferences';
export { sanitizeNavigation } from '@/lib/navigationPreferences';

interface NavigationState {
  activeSection: string;
  setActiveSection: (section: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  recentSections: string[];
  pushRecent: (section: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  importModalOpen: boolean;
  setImportModalOpen: (open: boolean) => void;
  focusTaskId: string | null;
  setFocusTaskId: (id: string | null) => void;
  focusEntity: { type: string; id: string; label?: string } | null;
  setFocusEntity: (e: { type: string; id: string; label?: string } | null) => void;
}
const validSection = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
export const useNavigationStore = create<NavigationState>()(
  persist(
    set => ({
      activeSection: 'dashboard',
      setActiveSection: section => {
        if (!validSection(section)) return;
        set(state => ({ activeSection: section, recentSections: [section, ...state.recentSections.filter(s => s !== section)].slice(0, 8) }));
      },
      sidebarOpen: false,
      setSidebarOpen: open => set({ sidebarOpen: open }),
      sidebarCollapsed: false,
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      recentSections: [],
      pushRecent: section => { if (validSection(section)) set(state => ({ recentSections: [section, ...state.recentSections.filter(s => s !== section)].slice(0, 8) })); },
      commandPaletteOpen: false,
      setCommandPaletteOpen: open => set({ commandPaletteOpen: open }),
      importModalOpen: false,
      setImportModalOpen: open => set({ importModalOpen: open }),
      focusTaskId: null,
      setFocusTaskId: id => set({ focusTaskId: id }),
      focusEntity: null,
      setFocusEntity: focusEntity => set({ focusEntity }),
    }),
    {
      name: 'mc-navigation-v1',
      storage: createJSONStorage(() => resilientWebStorage),
      version: 2,
      migrate: persisted => sanitizeNavigation(persisted),
      merge: (persisted, current) => ({ ...current, ...sanitizeNavigation(persisted) }),
      partialize: state => ({ activeSection: state.activeSection, recentSections: state.recentSections, sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
