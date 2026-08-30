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
const DIRTY_RECORDS_KEY = 'mc-cloud-dirty-records-v2';
const LEGACY_DIRTY_RECORDS_KEY = 'mc-cloud-dirty-records-v1';
const TABLE = 'mc_records';

type DirtyOperation = 'put' | 'delete';
type DirtyRecord = { operation: DirtyOperation; changedAt: string };
type DirtyRecordMap = Record<string, DirtyRecord>;

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
    feedSources: db.feedSources,
    streamItems: db.streamItems,
    watchTerms: db.watchTerms,
    audienceAccounts: db.audienceAccounts,
    audienceReadings: db.audienceReadings,
    reminders: db.reminders,
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

function recordKey(collection: string, recordId: string) {
    return `${collection}::${recordId}`;
}

function dirtyStorageKey(scope = userId ?? 'pending') {
    return `${DIRTY_RECORDS_KEY}:${scope}`;
}

function readDirtyRecords(): DirtyRecordMap {
    try {
        const parsed = JSON.parse(localStorage.getItem(dirtyStorageKey()) ?? '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function writeDirtyRecords(records: DirtyRecordMap) {
    try {
        const key = dirtyStorageKey();
        if (Object.keys(records).length) localStorage.setItem(key, JSON.stringify(records));
        else localStorage.removeItem(key);
    } catch { }
}

function claimPendingDirtyRecords() {
    if (!userId) return;
    try {
        const targetKey = dirtyStorageKey(userId);
        const current = JSON.parse(localStorage.getItem(targetKey) ?? '{}') as DirtyRecordMap;
        const pending = JSON.parse(localStorage.getItem(dirtyStorageKey('pending')) ?? '{}') as DirtyRecordMap;
        const legacy = JSON.parse(localStorage.getItem(LEGACY_DIRTY_RECORDS_KEY) ?? '{}') as DirtyRecordMap;
        const merged = { ...current, ...legacy, ...pending };
        if (Object.keys(merged).length) localStorage.setItem(targetKey, JSON.stringify(merged));
        localStorage.removeItem(dirtyStorageKey('pending'));
        localStorage.removeItem(LEGACY_DIRTY_RECORDS_KEY);
    } catch { }
}

/** Persisted before the debounced request so a reload can never lose the edit. */
export function markCloudRecordDirty(collection: string, recordId: string, operation: DirtyOperation = 'put') {
    if (!COLLECTIONS[collection] || !recordId) return;
    const records = readDirtyRecords();
    records[recordKey(collection, recordId)] = { operation, changedAt: new Date().toISOString() };
    writeDirtyRecords(records);
}

export function markCloudRecordsDirty(collection: string, recordIds: string[], operation: DirtyOperation = 'put') {
    if (!COLLECTIONS[collection] || !recordIds.length) return;
    const records = readDirtyRecords();
    const changedAt = new Date().toISOString();
    for (const recordId of recordIds) {
        if (recordId) records[recordKey(collection, recordId)] = { operation, changedAt };
    }
    writeDirtyRecords(records);
}

function clearSyncedDirtyRecords(captured: DirtyRecordMap) {
    const current = readDirtyRecords();
    for (const [key, value] of Object.entries(captured)) {
        if (current[key]?.changedAt === value.changedAt && current[key]?.operation === value.operation) {
            delete current[key];
        }
    }
    writeDirtyRecords(current);
}

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

async function waitForSession(ms = 8000): Promise<boolean> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return true;
        await new Promise((r) => setTimeout(r, 400));
    }
    return false;
}

export async function signInToCloud() {
    try {
        setStatus('connecting');

        // Already signed in? Skip the popup entirely.
        const existing = await supabase.auth.getSession();
        if (existing.data.session) { await startCloudSync(true); return; }

        let res: any = null;
        let popupError: any = null;
        try {
            res = await lovable.auth.signInWithOAuth('google', {
                redirect_uri: window.location.origin,
            });
        } catch (e) {
            popupError = e;
        }

        // Full-page redirect flow — the browser is navigating away.
        if (res?.redirected) return;

        // The popup may report "cancelled" even when the session landed
        // (window closed right after the token was delivered) — verify first.
        if (popupError || res?.error) {
            if (await waitForSession(2500)) { await startCloudSync(true); return; }
            const msg = String(popupError?.message ?? res?.error?.message ?? res?.error ?? '');
            if (/cancel|closed|popup/i.test(msg)) {
                throw new Error('Google sign-in window was closed before finishing. Allow pop-ups for this site and try again.');
            }
            throw new Error(msg || 'Sign-in failed');
        }

        if (!(await waitForSession())) {
            throw new Error('Google sign-in did not complete. Allow pop-ups for this site, then retry.');
        }

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
    feedSources: ['name'],
    streamItems: ['title'],
    watchTerms: ['term'],
    audienceAccounts: ['platform'],
    reminders: ['title'],
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

export async function pullFromCloud(): Promise<{ ok: boolean; restored: number; remoteRows: number; error?: string }> {
    if (!userId) return { ok: false, restored: 0, remoteRows: 0, error: 'Not signed in' };
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

        const dirty = readDirtyRecords();
        let restored = 0;
        let skipped = 0;
        for (const [collection, table] of Object.entries(COLLECTIONS)) {
            const mine = rows.filter((r) => r.collection === collection);
            const alive: any[] = [];
            for (const r of mine.filter((x) => !x.deleted)) {
                // A local edit that has not reached the cloud is authoritative.
                // This journal survives reloads, unlike the old in-memory debounce.
                if (dirty[recordKey(collection, r.record_id)]) continue;
                if (isValidRecord(collection, r.data, r.record_id)) alive.push(r.data);
                else skipped++;
            }
            const dead = mine
                .filter((r) => r.deleted && !dirty[recordKey(collection, r.record_id)])
                .map((r) => r.record_id);
            if (alive.length) { await table.bulkPut(alive); restored += alive.length; }
            if (dead.length) { await table.bulkDelete(dead); }
        }
        if (skipped) console.warn(`☁️ Skipped ${skipped} corrupt cloud record(s) during restore`);

        hydrated = true;
        try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch { }
        setStatus('synced');
        return { ok: true, restored, remoteRows: rows.length };
    } catch (e: any) {
        setStatus('error', e?.message ?? 'Restore failed');
        return { ok: false, restored: 0, remoteRows: 0, error: e?.message };
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
        const capturedDirty = readDirtyRecords();
        const dirtyEntries = Object.entries(capturedDirty);
        if (!dirtyEntries.length) {
            setStatus('synced');
            return;
        }

        // Upload only records changed on this device. Uploading a full local
        // snapshot here lets an older device overwrite newer cloud records.
        const rows: Array<{
            user_id: string;
            collection: string;
            record_id: string;
            data: any;
            deleted: boolean;
            updated_at: string;
        }> = [];
        for (const [key, change] of dirtyEntries) {
            const separator = key.indexOf('::');
            if (separator < 1) continue;
            const collection = key.slice(0, separator);
            const recordId = key.slice(separator + 2);
            const table = COLLECTIONS[collection];
            if (!table || !recordId) continue;
            const local = change.operation === 'put' ? await table.get(recordId) : null;
            rows.push({
                user_id: uid,
                collection,
                record_id: recordId,
                data: local ?? {},
                deleted: change.operation === 'delete' || !local,
                updated_at: change.changedAt,
            });
        }

        const { data: remoteVersions, error: versionsError } = await supabase
            .from(TABLE)
            .select('collection, record_id, updated_at');
        if (versionsError) throw versionsError;
        const remoteUpdatedAt = new Map(
            (remoteVersions ?? []).map((row) => [recordKey(row.collection, row.record_id), row.updated_at]),
        );
        const newestRows = rows.filter((row) => {
            const remote = remoteUpdatedAt.get(recordKey(row.collection, row.record_id));
            return !remote || new Date(row.updated_at).getTime() >= new Date(remote).getTime();
        });

        for (const batch of chunk(newestRows, 300)) {
            const { error } = await supabase
                .from(TABLE)
                .upsert(batch, { onConflict: 'user_id,collection,record_id' });
            if (error) throw error;
        }

        try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch { }
        clearSyncedDirtyRecords(capturedDirty);
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

/** Flush pending edits now. Local writes remain safe when offline and retry later. */
export async function flushCloudChanges(): Promise<void> {
    if (!userId) return;
    if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
    }
    await pushNow();
}

export async function forceCloudSync(): Promise<void> {
    if (!userId) return;
    // Only pending local edits are pushed; unchanged stale rows never overwrite
    // a newer device. Dirty records are also protected during the following pull.
    await flushCloudChanges();
    await pullFromCloud();
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

    claimPendingDirtyRecords();

    // Flush journaled local edits first. If the request fails, pullFromCloud
    // preserves those dirty records and cannot roll them back.
    const hadPendingChanges = Object.keys(readDirtyRecords()).length > 0;
    if (hadPendingChanges) await pushNow();
    const pulled = await pullFromCloud();
    // On an entirely new account, preserve existing local data as the initial
    // cloud baseline. Existing accounts always treat cloud as authoritative.
    if (!hadPendingChanges && pulled.ok && pulled.remoteRows === 0) {
        const snapshot = await localSnapshot();
        for (const item of snapshot) markCloudRecordDirty(item.collection, item.record_id);
        await pushNow();
    }
    bindRealtime();

    if (!force) {
        supabase.auth.onAuthStateChange((event, session) => {
            const next = session?.user?.id ?? null;
            if (next === userId) return;
            userId = next;
            hydrated = false;
            realtimeBound = false;
            if (!userId) { setStatus('signed-out'); return; }
            claimPendingDirtyRecords();
            void (async () => {
                const hasPending = Object.keys(readDirtyRecords()).length > 0;
                if (hasPending) await pushNow();
                await pullFromCloud();
                bindRealtime();
            })();
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
