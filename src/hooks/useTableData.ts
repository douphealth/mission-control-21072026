// ─── Per-table live-query hooks ───────────────────────────────────────────────
// Replaces consuming `useDashboard()` for data. Each hook subscribes ONLY to
// its own Dexie table — components no longer re-render when unrelated tables
// mutate. CRUD actions come from the Zustand `dataStore` (stable references).

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type {
  Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment,
  Idea, CredentialVault, CustomModule, HabitTracker,
} from '@/lib/db';
import { useDataStore } from '@/stores/dataStore';

const EMPTY: readonly any[] = Object.freeze([]);

export const useWebsites      = () => (useLiveQuery(() => db.websites.toArray(), []) ?? (EMPTY as Website[]));
export const useTasks         = () => (useLiveQuery(() => db.tasks.toArray(), []) ?? (EMPTY as Task[]));
export const useRepos         = () => (useLiveQuery(() => db.repos.toArray(), []) ?? (EMPTY as GitHubRepo[]));
export const useBuildProjects = () => (useLiveQuery(() => db.buildProjects.toArray(), []) ?? (EMPTY as BuildProject[]));
export const useLinks         = () => (useLiveQuery(() => db.links.toArray(), []) ?? (EMPTY as LinkItem[]));
export const useNotes         = () => (useLiveQuery(() => db.notes.toArray(), []) ?? (EMPTY as Note[]));
export const usePayments      = () => (useLiveQuery(() => db.payments.toArray(), []) ?? (EMPTY as Payment[]));
export const useIdeas         = () => (useLiveQuery(() => db.ideas.toArray(), []) ?? (EMPTY as Idea[]));
export const useCredentials   = () => (useLiveQuery(() => db.credentials.toArray(), []) ?? (EMPTY as CredentialVault[]));
export const useCustomModules = () => (useLiveQuery(() => db.customModules.toArray(), []) ?? (EMPTY as CustomModule[]));
export const useHabits        = () => (useLiveQuery(() => db.habits.toArray(), []) ?? (EMPTY as HabitTracker[]));

// ─── Stable action selectors (Zustand actions never change identity) ──────────
export const useAddItem       = () => useDataStore(s => s.addItem);
export const useUpdateItem    = () => useDataStore(s => s.updateItem);
export const useDeleteItem    = () => useDataStore(s => s.deleteItem);
export const useDuplicateItem = () => useDataStore(s => s.duplicateItem);
export const useBulkAddItems  = () => useDataStore(s => s.bulkAddItems);
export const useUpdateData    = () => useDataStore(s => s.updateData);
export const useExportAllData = () => useDataStore(s => s.exportAllData);
export const useImportAllData = () => useDataStore(s => s.importAllData);

// Re-export genId so consumers don't need to touch DashboardContext
export { genId } from '@/lib/db';
