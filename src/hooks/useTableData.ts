// ─── Per-table live-query hooks ───────────────────────────────────────────────
// Replaces consuming `useDashboard()` for data. Each hook subscribes ONLY to
// its own Dexie table — components no longer re-render when unrelated tables
// mutate. CRUD actions come from the Zustand `dataStore` (stable references).

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type {
  Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment,
  Idea, CredentialVault, CustomModule, HabitTracker,
  SEOProfile, SEOSnapshot, SEOQueryObservation, SEOIssue, SEOAction, SEOChange, SEOVisibilityCheck,
} from '@/lib/db';
import { useDataStore } from '@/stores/dataStore';

const EMPTY: readonly any[] = Object.freeze([]);

export const useWebsites      = () => (useLiveQuery(() => db.websites.toArray(), []) ?? (EMPTY as Website[]));
export const useSEOProfiles  = () => (useLiveQuery(() => db.seoProfiles.toArray(), []) ?? (EMPTY as SEOProfile[]));
export const useSEOSnapshots = () => (useLiveQuery(() => db.seoSnapshots.toArray(), []) ?? (EMPTY as SEOSnapshot[]));
export const useSEOQueryObservations = () => (useLiveQuery(() => db.seoQueryObservations.toArray(), []) ?? (EMPTY as SEOQueryObservation[]));
export const useSEOIssues    = () => (useLiveQuery(() => db.seoIssues.toArray(), []) ?? (EMPTY as SEOIssue[]));
export const useSEOActions   = () => (useLiveQuery(() => db.seoActions.toArray(), []) ?? (EMPTY as SEOAction[]));
export const useSEOChanges   = () => (useLiveQuery(() => db.seoChanges.toArray(), []) ?? (EMPTY as SEOChange[]));
export const useSEOVisibilityChecks = () => (useLiveQuery(() => db.seoVisibilityChecks.toArray(), []) ?? (EMPTY as SEOVisibilityCheck[]));
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

// ─── Indexed / paginated query hooks (use these for >500-row tables) ──────────
export const useTasksByStatus = (status: Task['status']) =>
  useLiveQuery(() => db.tasks.where('status').equals(status).toArray(), [status]) ?? (EMPTY as Task[]);

export const useTasksByDateRange = (fromISO: string, toISO: string) =>
  useLiveQuery(
    () => db.tasks.where('dueDate').between(fromISO, toISO, true, true).toArray(),
    [fromISO, toISO],
  ) ?? (EMPTY as Task[]);

export const useTasksCount = () => useLiveQuery(() => db.tasks.count(), []) ?? 0;

export const useTasksPage = (offset: number, limit: number) =>
  useLiveQuery(
    () => db.tasks.orderBy('createdAt').reverse().offset(offset).limit(limit).toArray(),
    [offset, limit],
  ) ?? (EMPTY as Task[]);

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
