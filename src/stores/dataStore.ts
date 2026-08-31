// ─── Domain Data Store ─────────────────────────────────────────────────────────
// Replaces the monolithic DashboardContext's data state with a Zustand store.
// Each domain's data is fetched via Dexie live queries; CRUD ops are grouped
// into domain-specific actions for fine-grained re-render control.

import { create } from 'zustand';
import { db, genId } from '@/lib/db';
import type {
    Website, Task, GitHubRepo, BuildProject, LinkItem, Note,
    Payment, Idea, CredentialVault, CustomModule, HabitTracker,
    UserSettings, WidgetLayout,
} from '@/lib/db';
import { isSupabaseConnected, pushToSupabase } from '@/lib/supabase';
import { flushCloudChanges, markCloudRecordDirty, markCloudRecordsDirty, queueCloudPush } from '@/lib/cloudSync';

import { isDuplicate, deduplicateItems, findDuplicateId } from '@/lib/dedup';
import { markDirty as markVersionsDirty } from '@/lib/versions';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface DataState {
    // ─── Loading ──────────────────────────────────────────────────────────────
    isLoading: boolean;
    setIsLoading: (v: boolean) => void;

    // ─── Dashboard layout ──────────────────────────────────────────────────────
    dashboardLayout: WidgetLayout[];
    setDashboardLayout: (layout: WidgetLayout[]) => void;
    saveDashboardLayout: (layout: WidgetLayout[]) => Promise<void>;

    // ─── Generic CRUD ──────────────────────────────────────────────────────────
    addItem: <T extends { id: string }>(table: string, item: Omit<T, 'id'>) => Promise<string>;
    updateItem: <T extends { id: string }>(table: string, id: string, changes: Partial<T>) => Promise<void>;
    deleteItem: (table: string, id: string) => Promise<void>;
    duplicateItem: (table: string, id: string, overrides?: Record<string, any>) => Promise<string>;
    bulkAddItems: <T extends { id: string }>(table: string, items: Omit<T, 'id'>[]) => Promise<void>;

    // ─── Settings ─────────────────────────────────────────────────────────────
    updateSettings: (changes: Partial<UserSettings>) => Promise<void>;

    // ─── Export/Import ────────────────────────────────────────────────────────
    exportAllData: () => Promise<string>;
    importAllData: (json: string) => Promise<void>;

    // ─── Backward compat ──────────────────────────────────────────────────────
    updateData: (partial: Record<string, any>) => Promise<void>;

    // ─── Push debounce ────────────────────────────────────────────────────────
    _schedulePush: () => void;
}

// ─── Table resolver ─────────────────────────────────────────────────────────────

function getTable(tableName: string) {
    const tables: Record<string, any> = {
        websites: db.websites,
        seoProfiles: db.seoProfiles,
        seoSnapshots: db.seoSnapshots,
        seoQueryObservations: db.seoQueryObservations,
        seoIssues: db.seoIssues,
        seoActions: db.seoActions,
        seoChanges: db.seoChanges,
        seoVisibilityChecks: db.seoVisibilityChecks,
        tasks: db.tasks,
        repos: db.repos,
        buildProjects: db.buildProjects,
        links: db.links,
        notes: db.notes,
        payments: db.payments,
        ideas: db.ideas,
        credentials: db.credentials,
        customModules: db.customModules,
        habits: db.habits,
        feedSources: db.feedSources,
        streamItems: db.streamItems,
        watchTerms: db.watchTerms,
        audienceAccounts: db.audienceAccounts,
        audienceReadings: db.audienceReadings,
        reminders: db.reminders,
        decisions: db.decisions,
        auditLog: db.auditLog,
        syncHealth: db.syncHealth,
    };
    return tables[tableName];
}

// ─── Supabase push debounce ─────────────────────────────────────────────────────

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let saveStatusCallbacks: ((status: 'saving' | 'saved' | 'error') => void)[] = [];

export function onSaveStatus(cb: (status: 'saving' | 'saved' | 'error') => void) {
    saveStatusCallbacks.push(cb);
    return () => { saveStatusCallbacks = saveStatusCallbacks.filter(c => c !== cb); };
}

function notifySaveStatus(status: 'saving' | 'saved' | 'error') {
    saveStatusCallbacks.forEach(cb => cb(status));
}

function schedulePush() {
    // Always mark local save as done immediately (IndexedDB write already happened)
    notifySaveStatus('saving');
    try { markVersionsDirty(); } catch {}
    // Account-scoped cloud backup (survives cleared browser data / new devices)
    try { queueCloudPush(); } catch {}
    if (!isSupabaseConnected()) {
        // No legacy cloud target — still "saved" locally (+ cloud backup above)
        notifySaveStatus('saved');
        return;
    }

    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
        pushToSupabase().then(r => {
            if (r.success) {
                console.log(`☁️ Auto-pushed ${r.synced} items`);
                notifySaveStatus('saved');
            } else {
                console.warn('☁️ Auto-push failed:', r.error);
                notifySaveStatus('error');
                // Retry once after 5s
                setTimeout(() => {
                    pushToSupabase().then(r2 => {
                        notifySaveStatus(r2.success ? 'saved' : 'error');
                    });
                }, 5000);
            }
        });
    }, 1000); // Reduced from 2s to 1s for faster cross-device sync
}

// ─── Store ───────────────────────────────────────────────────────────────────────

export const useDataStore = create<DataState>((set, _get) => ({
    isLoading: true,
    setIsLoading: (v) => set({ isLoading: v }),

    dashboardLayout: [],
    setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
    saveDashboardLayout: async (layout) => {
        await db.settings.update('default', { dashboardLayout: layout });
        set({ dashboardLayout: layout });
    },

    // ─── Generic CRUD ──────────────────────────────────────────────────────────
    addItem: async <T extends { id: string }>(table: string, item: Omit<T, 'id'>): Promise<string> => {
        const id = genId();
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        // ─── Duplicate check ───────────────────────────────────────────────
        // Never return an empty id: callers use it to navigate/select. If the
        // record already exists we hand back the *existing* row's id.
        if (await isDuplicate(table, item)) {
            const existingId = await findDuplicateId(table, item);
            console.warn(`⚠️ Duplicate detected in "${table}", reusing existing record:`, existingId);
            if (existingId) return existingId;
        }
        await tableRef.put({ ...item, id });
        markCloudRecordDirty(table, id);
        schedulePush();
        await flushCloudChanges();
        return id;
    },

    updateItem: async <T extends { id: string }>(table: string, id: string, changes: Partial<T>): Promise<void> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        // Tasks track when they were last actively touched — powers the review loop
        const patch: Record<string, any> =
            table === 'tasks' && !(changes as any).touchedAt
                ? { ...changes, touchedAt: new Date().toISOString().split('T')[0] }
                : (changes as any);
        await tableRef.update(id, patch);
        markCloudRecordDirty(table, id);
        schedulePush();
        await flushCloudChanges();
    },

    deleteItem: async (table: string, id: string): Promise<void> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        await tableRef.delete(id);
        markCloudRecordDirty(table, id, 'delete');
        schedulePush();
        await flushCloudChanges();
    },

    duplicateItem: async (table: string, id: string, overrides: Record<string, any> = {}): Promise<string> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        const original = await tableRef.get(id);
        if (!original) throw new Error(`Item not found: ${id}`);
        const newId = genId();
        const { id: _oldId, ...rest } = original;
        const now = new Date().toISOString().split('T')[0];
        const clone = { ...rest, id: newId, ...overrides };
        // Add " (Copy)" to name/title/label fields
        if (clone.title && !overrides.title) clone.title = `${clone.title} (Copy)`;
        else if (clone.name && !overrides.name) clone.name = `${clone.name} (Copy)`;
        else if (clone.label && !overrides.label) clone.label = `${clone.label} (Copy)`;
        // Reset dates
        if (clone.createdAt && !overrides.createdAt) clone.createdAt = now;
        if (clone.dateAdded && !overrides.dateAdded) clone.dateAdded = now;
        if (clone.lastUpdated && !overrides.lastUpdated) clone.lastUpdated = now;
        if (clone.updatedAt && !overrides.updatedAt) clone.updatedAt = now;
        await tableRef.put(clone);
        markCloudRecordDirty(table, newId);
        schedulePush();
        await flushCloudChanges();
        return newId;
    },

    bulkAddItems: async <T extends { id: string }>(table: string, items: Omit<T, 'id'>[]): Promise<void> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        // ─── Deduplicate before inserting ───────────────────────────────────
        const unique = await deduplicateItems(table, items);
        if (unique.length === 0) {
            console.warn(`⚠️ All ${items.length} items in "${table}" are duplicates, skipping bulk add`);
            return;
        }
        if (unique.length < items.length) {
            console.log(`🧹 Dedup: filtered out ${items.length - unique.length} duplicate(s) from "${table}" bulk add`);
        }
        const withIds = unique.map(item => ({ ...item, id: genId() }));
        await tableRef.bulkPut(withIds);
        markCloudRecordsDirty(table, withIds.map(item => item.id));
        schedulePush();
        await flushCloudChanges();
    },

    // ─── Settings ─────────────────────────────────────────────────────────────
    updateSettings: async (changes) => {
        await db.settings.update('default', changes);
        // Sync individual Zustand stores
        const { useSettingsStore } = await import('@/stores/settingsStore');
        if (changes.userName || changes.userRole || changes.theme) {
            await useSettingsStore.getState().updateSettings(changes);
        }
        const { useNavigationStore } = await import('@/stores/navigationStore');
        if (changes.sidebarCollapsed !== undefined) {
            useNavigationStore.getState().setSidebarCollapsed(changes.sidebarCollapsed);
        }
        schedulePush();
    },

    // ─── Export ────────────────────────────────────────────────────────────────
    exportAllData: async (): Promise<string> => {
        const [websites, seoProfiles, seoSnapshots, seoQueryObservations, seoIssues, seoActions, seoChanges, seoVisibilityChecks, tasks, repos, buildProjects, links, notes, payments, ideas, credentials, customModules, habits, settings] = await Promise.all([
            db.websites.toArray(),
            db.seoProfiles.toArray(),
            db.seoSnapshots.toArray(),
            db.seoQueryObservations.toArray(),
            db.seoIssues.toArray(),
            db.seoActions.toArray(),
            db.seoChanges.toArray(),
            db.seoVisibilityChecks.toArray(),
            db.tasks.toArray(),
            db.repos.toArray(),
            db.buildProjects.toArray(),
            db.links.toArray(),
            db.notes.toArray(),
            db.payments.toArray(),
            db.ideas.toArray(),
            db.credentials.toArray(),
            db.customModules.toArray(),
            db.habits.toArray(),
            db.settings.get('default'),
        ]);
        const data = {
            websites, seoProfiles, seoSnapshots, seoQueryObservations, seoIssues, seoActions, seoChanges, seoVisibilityChecks,
            tasks, repos, buildProjects, links, notes, payments, ideas,
            credentials, customModules, habits, settings,
            _meta: {
                exportedAt: new Date().toISOString(),
                version: '9.1',
                counts: {
                    websites: websites.length,
                    seoProfiles: seoProfiles.length, seoSnapshots: seoSnapshots.length,
                    seoQueryObservations: seoQueryObservations.length,
                    seoIssues: seoIssues.length, seoActions: seoActions.length,
                    seoChanges: seoChanges.length, seoVisibilityChecks: seoVisibilityChecks.length,
                    tasks: tasks.length, repos: repos.length,
                    buildProjects: buildProjects.length, links: links.length, notes: notes.length,
                    payments: payments.length, ideas: ideas.length, credentials: credentials.length,
                    customModules: customModules.length, habits: habits.length,
                },
                totalItems: websites.length + seoProfiles.length + seoSnapshots.length + seoQueryObservations.length + seoIssues.length +
                    seoActions.length + seoChanges.length + seoVisibilityChecks.length + tasks.length + repos.length + buildProjects.length +
                    links.length + notes.length + payments.length + ideas.length +
                    credentials.length + customModules.length + habits.length,
            },
            // Legacy compat fields
            exportedAt: new Date().toISOString(),
            version: '9.1',
        };
        return JSON.stringify(data, null, 2);
    },

    // ─── Import ────────────────────────────────────────────────────────────────
    importAllData: async (json: string): Promise<void> => {
        const data = JSON.parse(json);
        // Validate it's a Mission Control backup
        if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
        const tableMap: Record<string, any> = {
            websites: db.websites,
            seoProfiles: db.seoProfiles,
            seoSnapshots: db.seoSnapshots,
            seoQueryObservations: db.seoQueryObservations,
            seoIssues: db.seoIssues,
            seoActions: db.seoActions,
            seoChanges: db.seoChanges,
            seoVisibilityChecks: db.seoVisibilityChecks,
            tasks: db.tasks,
            repos: db.repos,
            buildProjects: db.buildProjects,
            links: db.links,
            notes: db.notes,
            payments: db.payments,
            ideas: db.ideas,
            credentials: db.credentials,
            customModules: db.customModules,
            habits: db.habits,
        };
        // ── Validate EVERYTHING before touching a single row ──────────────
        // A corrupt backup must never be able to wipe existing data.
        const staged: [string, any, any[]][] = [];
        const problems: string[] = [];
        for (const [key, table] of Object.entries(tableMap)) {
            const rows = data[key];
            if (rows === undefined || rows === null) continue;
            if (!Array.isArray(rows)) { problems.push(`"${key}" is not a list`); continue; }
            const bad = rows.findIndex((r: any) => !r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id);
            if (bad !== -1) { problems.push(`"${key}" row #${bad + 1} is missing a valid id`); continue; }
            staged.push([key, table, rows]);
        }
        if (problems.length) {
            throw new Error(`Backup rejected — nothing was changed. Problems: ${problems.join('; ')}`);
        }
        if (!staged.length) {
            throw new Error('Backup rejected — no recognisable Mission Control data found.');
        }

        // Single transaction: any failure rolls the whole import back.
        await db.transaction('rw', Object.values(tableMap), async () => {
            for (const [, table, rows] of staged) {
                await table.clear();
                if (rows.length > 0) await table.bulkPut(rows);
            }
        });
        if (data.settings) await db.settings.put({ ...data.settings, id: 'default' });
        for (const [key, , rows] of staged) {
            markCloudRecordsDirty(key, rows.map((row: any) => row.id));
        }
        // Reload settings
        const { useSettingsStore } = await import('@/stores/settingsStore');
        await useSettingsStore.getState().loadSettings();
        schedulePush();
    },

    // ─── Backward compat ──────────────────────────────────────────────────────
    updateData: async (partial: Record<string, any>): Promise<void> => {
        const tableMap: Record<string, any> = {
            websites: db.websites,
            seoProfiles: db.seoProfiles,
            seoSnapshots: db.seoSnapshots,
            seoQueryObservations: db.seoQueryObservations,
            seoIssues: db.seoIssues,
            seoActions: db.seoActions,
            seoChanges: db.seoChanges,
            seoVisibilityChecks: db.seoVisibilityChecks,
            tasks: db.tasks,
            repos: db.repos,
            buildProjects: db.buildProjects,
            links: db.links,
            notes: db.notes,
            payments: db.payments,
            ideas: db.ideas,
            credentials: db.credentials,
            customModules: db.customModules,
            habits: db.habits,
        };
        for (const [key, value] of Object.entries(partial)) {
            if (key === 'userName' || key === 'userRole') {
                await db.settings.update('default', { [key]: value });
                const { useSettingsStore } = await import('@/stores/settingsStore');
                await useSettingsStore.getState().updateSettings({ [key]: value } as any);
            } else if (tableMap[key] && Array.isArray(value)) {
                const previousIds = (await tableMap[key].toArray()).map((row: any) => row.id as string);
                await tableMap[key].clear();
                if (value.length > 0) await tableMap[key].bulkPut(value);
                const nextIds = value.map((row: any) => row.id as string).filter(Boolean);
                markCloudRecordsDirty(key, nextIds);
                const nextIdSet = new Set(nextIds);
                markCloudRecordsDirty(key, previousIds.filter((id: string) => !nextIdSet.has(id)), 'delete');
            }
        }
        schedulePush();
    },

    _schedulePush: schedulePush,
}));
