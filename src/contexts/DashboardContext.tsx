import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db, migrateFromLocalStorage } from '@/lib/db';
import type {
  Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment,
  Idea, CredentialVault, CustomModule, HabitTracker, UserSettings, WidgetLayout,
} from '@/lib/db';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDataStore } from '@/stores/dataStore';
import { deduplicateAll } from '@/lib/dedup';
import { isSupabaseConnected, replaceLocalWithSupabaseSnapshot, startRealtimeSync } from '@/lib/supabase';
import { restoreLatestNonEmptyVersion } from '@/lib/versions';
import { initializeEmptyWorkspace } from '@/lib/onboarding';

export type { Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment, Idea, CredentialVault, CustomModule, HabitTracker, UserSettings, WidgetLayout };

interface DashboardContextValue {
  isLoading: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

function enforceExplicitCloudOptIn() {
  try {
    const hasExplicitUrl = Boolean(localStorage.getItem('mc-supabase-url'));
    const hasExplicitKey = Boolean(localStorage.getItem('mc-supabase-anon-key'));
    const hasDecision = localStorage.getItem('mc-supabase-disconnected') !== null;
    if (!hasDecision && !(hasExplicitUrl && hasExplicitKey)) {
      localStorage.setItem('mc-supabase-disconnected', '1');
    }
  } catch {
    // IndexedDB remains available in privacy-restricted browsers.
  }
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const setIsLoadingStore = useDataStore(state => state.setIsLoading);
  const setDashboardLayout = useDataStore(state => state.setDashboardLayout);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      try {
        enforceExplicitCloudOptIn();
        await migrateFromLocalStorage();

        const shouldHydrateFromCloud = isSupabaseConnected();
        if (shouldHydrateFromCloud) {
          const cloudSnapshot = await replaceLocalWithSupabaseSnapshot();
          if (!cloudSnapshot.success || !cloudSnapshot.populated) {
            const restored = await restoreLatestNonEmptyVersion();
            if (!restored.restored) await initializeEmptyWorkspace();
          }
        } else {
          await initializeEmptyWorkspace();
        }

        await deduplicateAll();
        await loadSettings();

        if (shouldHydrateFromCloud) startRealtimeSync();

        const settings = await db.settings.get('default');
        if (settings?.dashboardLayout) setDashboardLayout(settings.dashboardLayout);
      } catch (error) {
        console.error('Mission Control bootstrap failed:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingStore(false);
      }
    })();
  }, [loadSettings, setDashboardLayout, setIsLoadingStore]);

  const value = useMemo<DashboardContextValue>(() => ({ isLoading }), [isLoading]);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within DashboardProvider');
  return context;
}

export function useDashboardOptional() {
  return useContext(DashboardContext);
}
