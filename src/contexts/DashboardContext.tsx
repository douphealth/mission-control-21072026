// ─── Thin app-bootstrap provider ─────────────────────────────────────────────
// This used to be the "God Context" with 11 live queries + every CRUD action
// exposed to every consumer. All data access has been migrated to per-table
// hooks in `src/hooks/useTableData.ts` and Zustand stores in `src/stores/*`.
//
// This file now only handles one-time app bootstrap: DB migration, cloud
// hydration, default seeding, dedup, settings hydration, and realtime sync.
// It exposes `isLoading` through context for the layout's loading splash and
// nothing else. No subscriptions = no cross-table re-render storms.

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { db, migrateFromLocalStorage } from "@/lib/db";
import type {
  Website,
  Task,
  GitHubRepo,
  BuildProject,
  LinkItem,
  Note,
  Payment,
  Idea,
  CredentialVault,
  CustomModule,
  HabitTracker,
  UserSettings,
  WidgetLayout,
} from "@/lib/db";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDataStore } from "@/stores/dataStore";
import { startCloudSync } from "@/lib/cloudSync";
import { ensurePortfolioBootstrap } from "@/lib/portfolioBootstrap";
import { ensureWorkspaceBootstrap } from "@/lib/workspaceBootstrap";

// Re-export types for backward compat with old imports
export type {
  Website,
  Task,
  GitHubRepo,
  BuildProject,
  LinkItem,
  Note,
  Payment,
  Idea,
  CredentialVault,
  CustomModule,
  HabitTracker,
  UserSettings,
  WidgetLayout,
};

interface DashboardContextValue {
  isLoading: boolean;
  loadingSlow: boolean;
  bootError: string | null;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ─── Default data seeder ────────────────────────────────────────────────────────

// ─── Bootstrap (no demo data) ────────────────────────────────────────────────
// Mission Control must never invent operational records. An empty account stays
// empty; only the settings row is created so the UI has a place to write to.

export async function ensureSettingsRow() {
  const existing = await db.settings.get("default");
  if (existing) return;
  await db.settings.put({
    id: "default",
    userName: "",
    userRole: "",
    theme: "dark",
    sidebarCollapsed: false,
    dashboardLayout: [],
  });
}

// ─── Provider (bootstrap-only) ───────────────────────────────────────────────

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const setIsLoadingStore = useDataStore((s) => s.setIsLoading);
  const setDashboardLayout = useDataStore((s) => s.setDashboardLayout);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Keep local storage readiness separate from cloud access and portfolio maintenance.
    // Neither a slow Google API nor an old snapshot should hold the mobile app hostage.
    const slowTimer = window.setTimeout(() => setLoadingSlow(true), 10_000);
    let localReady = false;
    void (async () => {
      try {
        await migrateFromLocalStorage();
        await ensureSettingsRow();
        await loadSettings();
        const settings = await db.settings.get("default");
        if (settings?.dashboardLayout) setDashboardLayout(settings.dashboardLayout);
        localReady = true;
      } catch (error) {
        console.error("Local database startup failed:", error);
        setBootError(error instanceof Error ? `${error.name}: ${error.message}` : "Device storage could not be opened.");
      } finally {
        window.clearTimeout(slowTimer);
        setIsLoading(false);
        setIsLoadingStore(false);
      }
    })().then(() => {
      // Only launch background work when the local DB has actually opened.
      // A failed local initialization must never be mistaken for an empty account.
      if (!localReady) return;
      // Run after the initial paint; neither cloud hydration nor catalog seeding
      // blocks the user from opening tasks and family schedules.
      window.setTimeout(() => {
        void import("@/lib/googleDirectAuth")
          .then(module => module.ensureGoogleClientId())
          .catch(error => console.warn("Google connection setup unavailable", error));

        const cloud = startCloudSync().catch(error => {
          console.warn("Cloud initialization deferred; local records kept", error);
        });
        // Prefer restoring cloud records before seeding reference catalogs.
        // A timeout ensures optional starter data eventually appears if Google hangs.
        void Promise.race([cloud, new Promise(resolve => window.setTimeout(resolve, 8_000))])
          .then(async () => {
            await ensurePortfolioBootstrap();
            await ensureWorkspaceBootstrap();
          })
          .catch(error => console.warn("Optional catalog bootstrap unavailable", error));
      }, 75);
    });
  }, [loadSettings, setIsLoadingStore, setDashboardLayout]);

  const value = React.useMemo<DashboardContextValue>(
    () => ({ isLoading, loadingSlow, bootError }),
    [isLoading, loadingSlow, bootError],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function useDashboardOptional() {
  return useContext(DashboardContext);
}
