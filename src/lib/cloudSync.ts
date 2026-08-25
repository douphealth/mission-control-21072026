// ─── Account-scoped cloud backup & sync ──────────────────────────────────────
// Why this exists: all app data lived only in the browser's IndexedDB, so
// clearing site data, switching browsers/devices, or iOS storage eviction made
// everything "disappear". This module mirrors every local record into the
// user's private cloud row store (`mc_records`) and restores it on any device.
//
// Model: one row per (collection, record_id) with a JSON payload + tombstones.
// Push is debounced, pull happens on boot + realtime + tab focus.

import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { db } from '@/lib/db';

export type CloudStatus =
    | 'signed-out'
    | 'connecting'
    | 'syncing'
    | 'synced'
    | 'offline'
    | 'error';

const LAST_SYNC_KEY = 'mc-cloud-last-sync';
const TABLE = 'mc_records';

const COLLECTIONS: Record<string, any> = {
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
    settings: db.settings,
};

let userId: string | null = null;
let hydrated = false;              // a full pull completed this session
let status: CloudStatus = 'signed-out';
let lastError: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let pushAgain = false;
let realtimeBound = false;
let started = false;

const listeners = new Set<(s: CloudStatus, err: string | null) => void>();

function setStatus(next: CloudStatus, err: string | null = null) {
    status = next;
    lastError = err;
    listeners.forEach((cb) => cb(status, lastError));
}

export function getCloudStatus(): CloudStatus { return status; }
export function getCloudError(): string | null { return lastError; }
export function getCloudUserId(): string | null { return userId; }
export function getLastCloudSync(): string | null {
    try { return localStorage.getItem(LAST_SYNC_KEY); } catch { return null; }
}

export function onCloudStatus(cb: (s: CloudStatus, err: string | null) => void) {
    listeners.add(cb);
    cb(status, lastError);
    return () => { listeners.delete(cb); };
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function signInToCloud() {
    try {
        setStatus('connecting');
        const res: any = await lovable.auth.signInWithOAuth('google', {
            redirect_uri: window.location.origin,
        });
        if (res?.error) throw res.error;
        await startCloudSync(true);
    } catch (e: any) {
        setStatus('error', e?.message ?? 'Sign-in failed');
    }
}

export async function signOutOfCloud() {
    try { await supabase.auth.signOut(); } catch { }
    userId = null;
    hydrated = false;
    setStatus('signed-out');
}

// ─── Serialization ───────────────────────────────────────────────────────────

async function localSnapshot(): Promise<Array<{ collection: string; record_id: string; data: any }>> {
    const out: Array<{ collection: string; record_id: string; data: any }> = [];
    for (const [collection, table] of Object.entries(COLLECTIONS)) {
        const rows = await table.toArray();
        for (const row of rows) {
            if (!row?.id) continue;
            out.push({ collection, record_id: String(row.id), data: row });
        }
    }
    return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// ─── Validation ──────────────────────────────────────────────────────────────
// A corrupt cloud row must never be written into the local database.

const REQUIRED_FIELDS: Record<string, string[]> = {
    tasks: ['title'],
    websites: ['name'],
    notes: ['title'],
    links: ['title'],
    repos: ['name'],
    buildProjects: ['name'],
    ideas: ['title'],
    credentials: ['label'],
    customModules: ['name'],
    habits: ['name'],
};

function isValidRecord(collection: string, data: any, recordId: string): boolean {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    if (typeof data.id !== 'string' || !data.id) return false;
    if (recordId && data.id !== recordId) return false;
    for (const field of REQUIRED_FIELDS[collection] ?? []) {
        if (typeof data[field] !== 'string') return false;
    }
    return true;
}

// ─── Pull: cloud → local ─────────────────────────────────────────────────────

export async function pullFromCloud(): Promise<{ ok: boolean; restored: number; error?: string }> {
    if (!userId) return { ok: false, restored: 0, error: 'Not signed in' };
    try {
        setStatus('syncing');
        const rows: any[] = [];
        const pageSize = 1000;
        for (let page = 0; ; page++) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('collection, record_id, data, deleted, updated_at')
                .range(page * pageSize, page * pageSize + pageSize - 1);
            if (error) throw error;
            rows.push(...(data ?? []));
            if (!data || data.length < pageSize) break;
        }

        let restored = 0;
        let skipped = 0;
        for (const [collection, table] of Object.entries(COLLECTIONS)) {
            const mine = rows.filter((r) => r.collection === collection);
            const alive: any[] = [];
            for (const r of mine.filter((x) => !x.deleted)) {
                if (isValidRecord(collection, r.data, r.record_id)) alive.push(r.data);
                else skipped++;
            }
            const dead = mine.filter((r) => r.deleted).map((r) => r.record_id);
            if (alive.length) { await table.bulkPut(alive); restored += alive.length; }
            if (dead.length) { await table.bulkDelete(dead); }
        }
        if (skipped) console.warn(`☁️ Skipped ${skipped} corrupt cloud record(s) during restore`);

        hydrated = true;
        try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch { }
        setStatus('synced');
        return { ok: true, restored };
    } catch (e: any) {
        setStatus('error', e?.message ?? 'Restore failed');
        return { ok: false, restored: 0, error: e?.message };
    }
}

// ─── Push: local → cloud ─────────────────────────────────────────────────────

async function pushNow(): Promise<void> {
    if (!userId) return;
    if (pushing) { pushAgain = true; return; }
    const uid: string = userId;
    pushing = true;
    try {
        setStatus('syncing');
        const snapshot = await localSnapshot();
        const rows = snapshot.map((r) => ({
            user_id: uid,
            collection: r.collection,
            record_id: r.record_id,
            data: r.data,
            deleted: false,
            updated_at: new Date().toISOString(),
        }));

        for (const batch of chunk(rows, 300)) {
            const { error } = await supabase
                .from(TABLE)
                .upsert(batch, { onConflict: 'user_id,collection,record_id' });
            if (error) throw error;
        }

        // Tombstone anything the cloud still has but the device deleted.
        // Only safe once this session has hydrated from the cloud.
        if (hydrated) {
            const alive = new Set(snapshot.map((r) => `${r.collection}::${r.record_id}`));
            const { data: remote, error: remoteErr } = await supabase
                .from(TABLE)
                .select('collection, record_id')
                .eq('deleted', false);
            if (remoteErr) throw remoteErr;
            const stale = (remote ?? []).filter(
                (r: any) => !alive.has(`${r.collection}::${r.record_id}`),
            );
            for (const batch of chunk(stale, 300)) {
                const { error } = await supabase.from(TABLE).upsert(
                    batch.map((r: any) => ({
                        user_id: uid,
                        collection: r.collection,
                        record_id: r.record_id,
                        data: {},
                        deleted: true,
                        updated_at: new Date().toISOString(),
                    })),
                    { onConflict: 'user_id,collection,record_id' },
                );
                if (error) throw error;
            }
        }

        try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch { }
        setStatus('synced');
    } catch (e: any) {
        setStatus(navigator.onLine ? 'error' : 'offline', e?.message ?? 'Backup failed');
    } finally {
        pushing = false;
        if (pushAgain) { pushAgain = false; void pushNow(); }
    }
}

/** Debounced backup — called after every local mutation. */
export function queueCloudPush(delay = 1200) {
    if (!userId) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { void pushNow(); }, delay);
}

export async function forceCloudSync(): Promise<void> {
    if (!userId) return;
    await pullFromCloud();
    await pushNow();
}

// ─── Realtime + lifecycle ────────────────────────────────────────────────────

function bindRealtime() {
    if (realtimeBound || !userId) return;
    realtimeBound = true;
    supabase
        .channel('mc-records-sync')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` },
            () => { /* debounce a pull to pick up other devices */
                if (!pushing) void pullFromCloud();
            },
        )
        .subscribe();
}

/**
 * Boot the cloud layer. Returns whether local data was restored from cloud.
 * Safe to call multiple times.
 */
export async function startCloudSync(force = false): Promise<{ signedIn: boolean; restored: number }> {
    if (started && !force) return { signedIn: !!userId, restored: 0 };
    started = true;

    const { data } = await supabase.auth.getSession();
    userId = data.session?.user?.id ?? null;

    if (!userId) {
        setStatus('signed-out');
        return { signedIn: false, restored: 0 };
    }

    const pulled = await pullFromCloud();
    await pushNow();
    bindRealtime();

    if (!force) {
        supabase.auth.onAuthStateChange((event, session) => {
            const next = session?.user?.id ?? null;
            if (next === userId) return;
            userId = next;
            hydrated = false;
            realtimeBound = false;
            if (!userId) { setStatus('signed-out'); return; }
            void (async () => { await pullFromCloud(); await pushNow(); bindRealtime(); })();
        });

        window.addEventListener('online', () => { if (userId) void forceCloudSync(); });
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && userId) void pullFromCloud();
        });
        // Best-effort flush before the tab closes.
        window.addEventListener('pagehide', () => { if (userId) void pushNow(); });
    }

    return { signedIn: true, restored: pulled.restored };
}
