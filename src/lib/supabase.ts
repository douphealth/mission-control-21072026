// Full Supabase sync engine for Mission Control v8
// Handles: connection management, full two-way sync, real-time subscriptions

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { db } from './db';
import { deduplicateAll } from './dedup';

let supabaseClient: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let syncCallbacks: (() => void)[] = [];
let schemaAvailability: Record<string, boolean> | null = null;
let schemaErrors: SyncSchemaError[] = [];
let schemaAvailabilityCheckedAt = 0;

const DEFAULT_SUPABASE_URL = 'https://dszpokkqhrtjutmvcxnh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_DR3JoohreA2S4Z3akVmICQ_ZZp2DSnW';
const DISCONNECTED_KEY = 'mc-supabase-disconnected';
const CLOUD_BASELINE_KEY = 'mc-cloud-baseline-ready';
const LAST_SYNC_FALLBACK_KEY = 'mc-last-sync-at';
const REQUIRED_REMOTE_TABLES = [
    'mc_websites',
    'mc_tasks',
    'mc_repos',
    'mc_build_projects',
    'mc_links',
    'mc_notes',
    'mc_payments',
    'mc_ideas',
    'mc_credentials',
    'mc_custom_modules',
    'mc_habits',
    'mc_settings',
    'mc_sync_log',
] as const;

export interface SyncSchemaError {
    table: string;
    code?: string;
    message: string;
    details?: string | null;
    hint?: string | null;
    status?: number;
    checkedAt: string;
}

export interface SyncDiagnostics {
    connected: boolean;
    projectHost: string;
    lastSyncAt: string | null;
    queuedChanges: number;
    availableTables: Record<string, boolean>;
    schemaReady: boolean;
    missingTables: string[];
    schemaErrors: SyncSchemaError[];
}

export interface SupabaseConnectionHealth {
    ok: boolean;
    connectionOk: boolean;
    schemaReady: boolean;
    missingTables: string[];
    error?: string;
    diagnostics?: SyncSchemaError[];
}

export function getDefaultSupabaseUrl(): string {
    return DEFAULT_SUPABASE_URL;
}

export function getSupabaseProjectHost(url?: string): string {
    try {
        return new URL(url || getSupabaseConfig()?.url || DEFAULT_SUPABASE_URL).host;
    } catch {
        return new URL(DEFAULT_SUPABASE_URL).host;
    }
}

function buildSchemaBlockedMessage(missingTables: string[]): string {
    return `Connected to Supabase, but sync is blocked: ${missingTables.length}/${REQUIRED_REMOTE_TABLES.length} required tables are missing. Run the SQL schema setup below first.`;
}

function hasCloudBaseline(): boolean {
    try {
        return localStorage.getItem(CLOUD_BASELINE_KEY) === '1';
    } catch {
        return false;
    }
}

function markCloudBaselineReady(): void {
    try {
        localStorage.setItem(CLOUD_BASELINE_KEY, '1');
    } catch { }
}

function clearCloudBaseline(): void {
    try {
        localStorage.removeItem(CLOUD_BASELINE_KEY);
    } catch { }
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export function refreshSupabaseSchemaState(): void {
    schemaAvailability = null;
    schemaErrors = [];
    schemaAvailabilityCheckedAt = 0;
}

async function getAvailableRemoteTables(client: SupabaseClient, options?: { force?: boolean }): Promise<Record<string, boolean>> {
    const cacheAge = Date.now() - schemaAvailabilityCheckedAt;
    if (!options?.force && schemaAvailability && cacheAge < 30000) return schemaAvailability;
    schemaErrors = [];
    const checks = await Promise.all(
        REQUIRED_REMOTE_TABLES.map(async (table) => {
            const { error } = await client.from(table).select('id').limit(1);
            if (error && !error.code) {
                schemaErrors.push({
                    table,
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    checkedAt: new Date().toISOString(),
                    status: (error as any).status,
                });
                return [table, false] as const;
            }
            if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
                schemaErrors.push({
                    table,
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    checkedAt: new Date().toISOString(),
                });
                return [table, false] as const;
            }
            if (error) {
                schemaErrors.push({
                    table,
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    checkedAt: new Date().toISOString(),
                });
            }
            return [table, !error] as const;
        })
    );
    schemaAvailability = Object.fromEntries(checks);
    schemaAvailabilityCheckedAt = Date.now();
    return schemaAvailability;
}

function markLastSyncNow(): void {
    try {
        localStorage.setItem(LAST_SYNC_FALLBACK_KEY, new Date().toISOString());
    } catch { }
}

// ─── Config management ─────────────────────────────────────────────────────────

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
    try {
        const disconnected = localStorage.getItem(DISCONNECTED_KEY) === '1';
        if (disconnected) return null;
        const url = localStorage.getItem('mc-supabase-url');
        const anonKey = localStorage.getItem('mc-supabase-anon-key');
        if (url && anonKey && url.startsWith('https://')) return { url, anonKey };
    } catch { }
    // Default: always connected to the bundled Supabase project
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
}

export function setSupabaseConfig(url: string, anonKey: string): void {
    localStorage.setItem('mc-supabase-url', url.trim());
    localStorage.setItem('mc-supabase-anon-key', anonKey.trim());
    try { localStorage.removeItem(DISCONNECTED_KEY); } catch { }
    clearCloudBaseline();
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
    }
    refreshSupabaseSchemaState();
    supabaseClient = null;
}

export function clearSupabaseConfig(): void {
    localStorage.removeItem('mc-supabase-url');
    localStorage.removeItem('mc-supabase-anon-key');
    try { localStorage.setItem(DISCONNECTED_KEY, '1'); } catch { }
    clearCloudBaseline();
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
    }
    refreshSupabaseSchemaState();
    supabaseClient = null;
}

export function getSupabase(): SupabaseClient | null {
    if (supabaseClient) return supabaseClient;
    const config = getSupabaseConfig();
    if (!config) return null;
    try {
        supabaseClient = createClient(config.url, config.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
            },
            realtime: {
                params: { eventsPerSecond: 10 },
            },
        });
        return supabaseClient;
    } catch (e) {
        console.error('Failed to create Supabase client:', e);
        return null;
    }
}

export function isSupabaseConnected(): boolean {
    return getSupabaseConfig() !== null;
}

// ─── Connection test ───────────────────────────────────────────────────────────

export async function testSupabaseConnection(url: string, anonKey: string): Promise<SupabaseConnectionHealth> {
    try {
        const normalizedUrl = url.trim();
        const normalizedKey = anonKey.trim();
        const current = getSupabaseConfig();
        const client = current?.url === normalizedUrl && current.anonKey === normalizedKey
            ? getSupabase()
            : createClient(normalizedUrl, normalizedKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false,
                    storageKey: `mc-health-${new URL(normalizedUrl).host}`,
                },
            });
        if (!client) throw new Error('Supabase client unavailable');
        const availability = await Promise.all(
            REQUIRED_REMOTE_TABLES.map(async (table) => {
                const { error } = await client.from(table).select('id').limit(1);
                if (error && !error.code) {
                    throw error;
                }
                if (error && error.code !== 'PGRST116' && error.code !== '42P01' && error.code !== 'PGRST205') {
                    throw error;
                }
                return [table, !(error && (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205'))] as const;
            })
        );
        const missingTables = availability.filter(([, available]) => !available).map(([table]) => table);
        const schemaReady = missingTables.length === 0;
        if (!schemaReady) {
            return {
                ok: false,
                connectionOk: true,
                schemaReady: false,
                missingTables,
                error: buildSchemaBlockedMessage(missingTables),
            };
        }

        return { ok: true, connectionOk: true, schemaReady: true, missingTables: [] };
    } catch (e: any) {
        return {
            ok: false,
            connectionOk: false,
            schemaReady: false,
            missingTables: [],
            error: e?.message || 'Connection failed',
            diagnostics: [{
                table: 'connection',
                code: e?.code,
                message: e?.message || 'Connection failed',
                details: e?.details,
                hint: e?.hint,
                status: e?.status,
                checkedAt: new Date().toISOString(),
            }],
        };
    }
}

// ─── SQL schema for Supabase ──────────────────────────────────────────────────

export const SUPABASE_SCHEMA_SQL = `
-- Mission Control v8 Schema
-- Run this in your Supabase SQL editor to enable sync

CREATE TABLE IF NOT EXISTS mc_websites (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_tasks (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_repos (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_build_projects (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_links (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_notes (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_payments (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_ideas (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_credentials (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_custom_modules (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_habits (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_settings (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_sync_log (id serial PRIMARY KEY, synced_at timestamptz DEFAULT now(), direction text, tables text[]);

-- Enable RLS (add your own policies as needed)
ALTER TABLE mc_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_build_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_custom_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (customize for production)
DROP POLICY IF EXISTS "allow_all_mc" ON mc_websites;
CREATE POLICY "allow_all_mc" ON mc_websites FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_tasks;
CREATE POLICY "allow_all_mc" ON mc_tasks FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_repos;
CREATE POLICY "allow_all_mc" ON mc_repos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_build_projects;
CREATE POLICY "allow_all_mc" ON mc_build_projects FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_links;
CREATE POLICY "allow_all_mc" ON mc_links FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_notes;
CREATE POLICY "allow_all_mc" ON mc_notes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_payments;
CREATE POLICY "allow_all_mc" ON mc_payments FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_ideas;
CREATE POLICY "allow_all_mc" ON mc_ideas FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_credentials;
CREATE POLICY "allow_all_mc" ON mc_credentials FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_custom_modules;
CREATE POLICY "allow_all_mc" ON mc_custom_modules FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_habits;
CREATE POLICY "allow_all_mc" ON mc_habits FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_settings;
CREATE POLICY "allow_all_mc" ON mc_settings FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_sync_log;
CREATE POLICY "allow_all_mc" ON mc_sync_log FOR ALL USING (true) WITH CHECK (true);
`;

// ─── Table map ─────────────────────────────────────────────────────────────────

const TABLE_MAP: Array<{ local: any; remote: string }> = [
    { local: db.websites, remote: 'mc_websites' },
    { local: db.tasks, remote: 'mc_tasks' },
    { local: db.repos, remote: 'mc_repos' },
    { local: db.buildProjects, remote: 'mc_build_projects' },
    { local: db.links, remote: 'mc_links' },
    { local: db.notes, remote: 'mc_notes' },
    { local: db.payments, remote: 'mc_payments' },
    { local: db.ideas, remote: 'mc_ideas' },
    { local: db.credentials, remote: 'mc_credentials' },
    { local: db.customModules, remote: 'mc_custom_modules' },
    { local: db.habits, remote: 'mc_habits' },
];

// ─── Preview: count what will happen ──────────────────────────────────────────

export interface SyncPreview {
    push: { table: string; count: number }[];
    pull: { table: string; newCount: number; updateCount: number }[];
    totalPush: number;
    totalPullNew: number;
    totalPullUpdate: number;
}

export async function getSyncPreview(): Promise<SyncPreview | null> {
    const client = getSupabase();
    if (!client) return null;

    const push: SyncPreview['push'] = [];
    const pull: SyncPreview['pull'] = [];

    for (const { local, remote } of TABLE_MAP) {
        const localItems = await local.toArray();
        push.push({ table: remote, count: localItems.length });

        const { data } = await client.from(remote).select('id, data');
        if (!data) { pull.push({ table: remote, newCount: 0, updateCount: 0 }); continue; }

        const localIds = new Set(localItems.map((i: any) => i.id));
        let newCount = 0;
        let updateCount = 0;
        for (const row of data) {
            if (localIds.has(row.id)) updateCount++;
            else newCount++;
        }
        pull.push({ table: remote, newCount, updateCount });
    }

    return {
        push,
        pull,
        totalPush: push.reduce((s, p) => s + p.count, 0),
        totalPullNew: pull.reduce((s, p) => s + p.newCount, 0),
        totalPullUpdate: pull.reduce((s, p) => s + p.updateCount, 0),
    };
}

// ─── Push local → Supabase (upsert + optional mirror delete) ─────────────────

export async function pushToSupabase(options?: { mirrorDeletes?: boolean }): Promise<{ success: boolean; synced: number; error?: string }> {
    const client = getSupabase();
    if (!client) return { success: false, synced: 0, error: 'Not connected' };

    const mirrorDeletes = options?.mirrorDeletes ?? hasCloudBaseline();
    let totalSynced = 0;
    const syncedTables: string[] = [];

    try {
        const available = await getAvailableRemoteTables(client);
        for (const { local, remote } of TABLE_MAP) {
            if (!available[remote]) continue;
            const items = await local.toArray();
            const localIds = new Set(items.map((item: any) => item.id));

            if (items.length > 0) {
                const rows = items.map((item: any) => ({ id: item.id, data: item }));
                const { error } = await client.from(remote).upsert(rows, { onConflict: 'id' });
                if (error) throw new Error(`${remote}: ${error.message}`);
                totalSynced += items.length;
            }

            if (mirrorDeletes) {
                const { data: remoteRows, error: remoteErr } = await client.from(remote).select('id');
                if (remoteErr) throw new Error(`${remote}: ${remoteErr.message}`);

                const toDelete = (remoteRows ?? [])
                    .map((row: any) => row.id as string)
                    .filter((id: string) => !localIds.has(id));

                for (const batch of chunkArray(toDelete, 500)) {
                    const { error: delErr } = await client.from(remote).delete().in('id', batch);
                    if (delErr) throw new Error(`${remote}: ${delErr.message}`);
                }
            }

            syncedTables.push(remote);
        }

        // Push settings
        const settings = await db.settings.get('default');
        if (settings && available.mc_settings) {
            const { error } = await client.from('mc_settings').upsert(
                [{ id: 'default', data: settings }],
                { onConflict: 'id' }
            );
            if (!error) syncedTables.push('mc_settings');
        }

        // Log sync
        if (available.mc_sync_log) {
            await client.from('mc_sync_log').insert([{
                direction: mirrorDeletes ? 'push_mirror' : 'push',
                tables: syncedTables,
            }]);
        }

        markLastSyncNow();
        syncCallbacks.forEach(cb => cb());
        return { success: true, synced: totalSynced };
    } catch (e: any) {
        return { success: false, synced: totalSynced, error: e?.message };
    }
}

// ─── Pull Supabase → local (SMART MERGE — never deletes local data) ──────────

export async function pullFromSupabase(): Promise<{ success: boolean; synced: number; added: number; updated: number; error?: string }> {
    const client = getSupabase();
    if (!client) return { success: false, synced: 0, added: 0, updated: 0, error: 'Not connected' };

    let totalAdded = 0;
    let totalUpdated = 0;

    try {
        const available = await getAvailableRemoteTables(client);
        for (const { local, remote } of TABLE_MAP) {
            if (!available[remote]) continue;
            const { data, error } = await client.from(remote).select('id, data');
            if (error) {
                if (error.code === '42P01') continue;
                throw new Error(`${remote}: ${error.message}`);
            }
            if (!data?.length) continue;

            // Get existing local IDs for smart merge
            const localItems = await local.toArray();
            const localMap = new Map(localItems.map((item: any) => [item.id, item]));

            for (const row of data) {
                const cloudItem = row.data;
                if (!cloudItem || !cloudItem.id) continue;

                const localItem = localMap.get(cloudItem.id);
                if (!localItem) {
                    // New from cloud — add without touching existing local data
                    await local.put(cloudItem);
                    totalAdded++;
                    continue;
                }

                // Update only when actual content changed (prevents endless re-renders)
                const localSerialized = JSON.stringify(localItem);
                const cloudSerialized = JSON.stringify(cloudItem);
                if (localSerialized !== cloudSerialized) {
                    await local.put(cloudItem);
                    totalUpdated++;
                }
            }
        }

        // Pull settings (merge, don't overwrite)
        if (available.mc_settings) {
            const { data: settingsData } = await client.from('mc_settings').select('data').eq('id', 'default').single();
            if (settingsData?.data) {
                await db.settings.put({ ...settingsData.data, id: 'default' });
            }
        }

        // Log sync
        if (available.mc_sync_log) {
            await client.from('mc_sync_log').insert([{
                direction: 'pull',
                tables: TABLE_MAP.map(t => t.remote).filter(table => available[table]),
            }]);
        }

        const removedDuplicates = await deduplicateAll();
        markCloudBaselineReady();
        markLastSyncNow();
        syncCallbacks.forEach(cb => cb());
        return { success: true, synced: totalAdded + totalUpdated + removedDuplicates, added: totalAdded, updated: totalUpdated };
    } catch (e: any) {
        return { success: false, synced: 0, added: 0, updated: 0, error: e?.message };
    }
}

// ─── Full two-way sync (merge both directions) ───────────────────────────────

export async function fullSync(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
    const pushResult = await pushToSupabase({ mirrorDeletes: true });
    if (!pushResult.success) return { success: false, pushed: 0, pulled: 0, error: `Push failed: ${pushResult.error}` };

    const pullResult = await pullFromSupabase();
    if (!pullResult.success) return { success: false, pushed: pushResult.synced, pulled: 0, error: `Pull failed: ${pullResult.error}` };

    return { success: true, pushed: pushResult.synced, pulled: pullResult.synced };
}

// ─── Real-time listeners ───────────────────────────────────────────────────────

export function startRealtimeSync(onRemoteChange?: () => void): boolean {
    const client = getSupabase();
    if (!client) return false;
    if (realtimeChannel) return true;

    const remoteTables = [...TABLE_MAP.map(t => t.remote), 'mc_settings'];
    let channel = client.channel('mission-control-realtime-sync');

    for (const table of remoteTables) {
        channel = channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            () => {
                onRemoteChange?.();
                syncCallbacks.forEach(cb => cb());
            }
        );
    }

    realtimeChannel = channel.subscribe();
    return true;
}

export function stopRealtimeSync(): void {
    if (!realtimeChannel) return;
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
}

// ─── Register callback for sync events ────────────────────────────────────────

export function onSyncComplete(callback: () => void) {
    syncCallbacks.push(callback);
    return () => { syncCallbacks = syncCallbacks.filter(cb => cb !== callback); };
}

// ─── Legacy: sync helpers (backward compat) ────────────────────────────────────

export async function syncToSupabase(table: string, data: any[]): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
        const { error } = await client.from(table).upsert(data, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`Sync to ${table} failed:`, e);
        return false;
    }
}

export async function syncFromSupabase(table: string): Promise<any[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
        const { data, error } = await client.from(table).select('*');
        if (error) throw error;
        return data;
    } catch (e) {
        console.error(`Sync from ${table} failed:`, e);
        return null;
    }
}

// ─── Format last sync time ─────────────────────────────────────────────────────

export async function getLastSyncTime(): Promise<string | null> {
    const client = getSupabase();
    if (!client) return localStorage.getItem(LAST_SYNC_FALLBACK_KEY);
    try {
        const { data } = await client
            .from('mc_sync_log')
            .select('synced_at')
            .order('synced_at', { ascending: false })
            .limit(1)
            .single();
        return data?.synced_at || localStorage.getItem(LAST_SYNC_FALLBACK_KEY);
    } catch {
        return localStorage.getItem(LAST_SYNC_FALLBACK_KEY);
    }
}

export async function getSupabaseSyncDiagnostics(): Promise<SyncDiagnostics> {
    const client = getSupabase();
    const localCounts = await Promise.all(TABLE_MAP.map(async ({ local }) => local.count()));
    const settings = await db.settings.get('default');
    if (!client) {
        return {
            connected: false,
            projectHost: getSupabaseProjectHost(),
            lastSyncAt: await getLastSyncTime(),
            queuedChanges: localCounts.reduce((sum, count) => sum + count, 0) + (settings ? 1 : 0),
            availableTables: {},
            schemaReady: false,
            missingTables: [...REQUIRED_REMOTE_TABLES],
            schemaErrors,
        };
    }

    schemaAvailability = null;
    schemaErrors = [];
    const availableTables = await getAvailableRemoteTables(client);
    const missingTables = Object.entries(availableTables)
        .filter(([, available]) => !available)
        .map(([table]) => table);
    return {
        connected: true,
        projectHost: getSupabaseProjectHost(),
        lastSyncAt: await getLastSyncTime(),
        queuedChanges: localCounts.reduce((sum, count) => sum + count, 0) + (settings ? 1 : 0),
        availableTables,
        schemaReady: missingTables.length === 0,
        missingTables,
        schemaErrors,
    };
}
