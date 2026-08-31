// ─── Thin app-bootstrap provider ─────────────────────────────────────────────
// This used to be the "God Context" with 11 live queries + every CRUD action
// exposed to every consumer. All data access has been migrated to per-table
// hooks in `src/hooks/useTableData.ts` and Zustand stores in `src/stores/*`.
//
// This file now only handles one-time app bootstrap: DB migration, cloud
// hydration, default seeding, dedup, settings hydration, and realtime sync.
// It exposes `isLoading` through context for the layout's loading splash and
// nothing else. No subscriptions = no cross-table re-render storms.

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { db, genId, migrateFromLocalStorage } from '@/lib/db';
import type {
  Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment,
  Idea, CredentialVault, CustomModule, HabitTracker, UserSettings, WidgetLayout,
} from '@/lib/db';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDataStore } from '@/stores/dataStore';
import { deduplicateAll } from '@/lib/dedup';
import { startCloudSync } from '@/lib/cloudSync';

import { restoreLatestNonEmptyVersion } from '@/lib/versions';

// Re-export types for backward compat with old imports
export type { Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment, Idea, CredentialVault, CustomModule, HabitTracker, UserSettings, WidgetLayout };

interface DashboardContextValue {
  isLoading: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ─── Default data seeder ────────────────────────────────────────────────────────

// ─── Bootstrap (no demo data) ────────────────────────────────────────────────
// Mission Control must never invent operational records. An empty account stays
// empty; only the settings row is created so the UI has a place to write to.

export async function ensureSettingsRow() {
  const existing = await db.settings.get('default');
  if (existing) return;
  await db.settings.put({
    id: 'default',
    userName: '',
    userRole: '',
    theme: 'dark',
    sidebarCollapsed: false,
    dashboardLayout: [],
  });
}

// ─── Provider (bootstrap-only) ───────────────────────────────────────────────

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const setIsLoadingStore = useDataStore(s => s.setIsLoading);
  const setDashboardLayout = useDataStore(s => s.setDashboardLayout);
  const [isLoading, setIsLoading] = useState(true);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        await migrateFromLocalStorage();

        // ── Account-scoped cloud restore (primary persistence) ──────────────
        let cloudRestored = 0;
        try {
          const cloud = await startCloudSync();
          cloudRestored = cloud.restored;
        } catch (e) {
          console.warn('Cloud sync unavailable:', e);
        }

        // The account-scoped mc_records store is the single cloud authority.
        // Never hydrate again from the legacy mc_* snapshot tables: that second
        // restore was replacing freshly edited tasks with an older full snapshot.
        if (cloudRestored === 0) {
          const [t, w, r, b] = await Promise.all([
            db.tasks.count(), db.websites.count(), db.repos.count(), db.buildProjects.count(),
          ]);
          if (t + w + r + b === 0) {
            // Only real prior user data may repopulate an empty device.
            await restoreLatestNonEmptyVersion();
          }
        }


        await deduplicateAll();
        await loadSettings();

        const settings = await db.settings.get('default');
        if (settings?.dashboardLayout) setDashboardLayout(settings.dashboardLayout);
      } catch (e) {
        console.error('DB init error:', e);
      } finally {
        setIsLoading(false);
        setIsLoadingStore(false);
      }
    })();
  }, [loadSettings, setIsLoadingStore, setDashboardLayout]);

  // Stable context value — only changes when bootstrap finishes
  const value = React.useMemo<DashboardContextValue>(() => ({ isLoading }), [isLoading]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

export function useDashboardOptional() {
  return useContext(DashboardContext);
}
