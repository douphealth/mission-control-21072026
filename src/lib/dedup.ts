// ─── Deduplication Engine ───────────────────────────────────────────────────────
// Content-based fingerprinting to prevent duplicate entries across all tables.
// Each entity type has specific "identity" fields that define what makes it unique.
// Two items are considered duplicates if their fingerprints match, regardless of
// differing IDs (which are randomly generated).

import { db } from '@/lib/db';
import type {
    Website, Task, GitHubRepo, BuildProject, LinkItem, Note,
    Payment, Idea, CredentialVault, CustomModule, HabitTracker,
} from '@/lib/db';

// ─── Normalization ──────────────────────────────────────────────────────────────

function norm(s: string | undefined | null): string {
    return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normUrl(url: string | undefined | null): string {
    let u = norm(url);
    u = u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    return u;
}

// ─── Fingerprint Functions ──────────────────────────────────────────────────────
// Each returns a string that uniquely identifies the "content" of an item.
// If two items have the same fingerprint, they are duplicates.

function fpWebsite(item: Partial<Website>): string {
    return `w|${normUrl(item.url)}|${norm(item.name)}`;
}

function hasMeaningfulFingerprint(tableName: string, item: any): boolean {
    switch (tableName) {
        case 'websites':
            return Boolean(normUrl(item?.url) || norm(item?.name));
        case 'links':
            return Boolean(normUrl(item?.url) || norm(item?.title));
        case 'repos':
            return Boolean(normUrl(item?.url) || norm(item?.name));
        case 'credentials':
            return Boolean(norm(item?.label) || norm(item?.service) || normUrl(item?.url));
        default:
            return true;
    }
}

function fpTask(item: Partial<Task>): string {
    // Include dueDate in fingerprint — two tasks with the same title on the same date are duplicates
    return `t|${norm(item.title)}|${norm(item.dueDate)}|${norm(item.category)}|${norm(item.linkedProject)}`;
}

function fpRepo(item: Partial<GitHubRepo>): string {
    return `r|${normUrl(item.url)}|${norm(item.name)}`;
}

function fpBuild(item: Partial<BuildProject>): string {
    return `bp|${norm(item.name)}|${normUrl(item.projectUrl)}`;
}

function fpLink(item: Partial<LinkItem>): string {
    return `l|${normUrl(item.url)}|${norm(item.title)}`;
}

function fpNote(item: Partial<Note>): string {
    return `n|${norm(item.title)}|${norm(item.content)?.slice(0, 100)}`;
}

function fpPayment(item: Partial<Payment>): string {
    return `p|${norm(item.title)}|${item.amount ?? 0}|${norm(item.type)}|${norm(item.from)}|${norm(item.to)}`;
}

function fpIdea(item: Partial<Idea>): string {
    return `i|${norm(item.title)}|${norm(item.category)}`;
}

function fpCredential(item: Partial<CredentialVault>): string {
    return `c|${norm(item.label)}|${norm(item.service)}|${normUrl(item.url)}`;
}

function fpCustomModule(item: Partial<CustomModule>): string {
    return `cm|${norm(item.name)}`;
}

function fpHabit(item: Partial<HabitTracker>): string {
    return `h|${norm(item.name)}|${norm(item.frequency)}`;
}

// ─── Table-to-fingerprint mapping ───────────────────────────────────────────────

type FingerprintFn = (item: any) => string;

const FINGERPRINT_MAP: Record<string, FingerprintFn> = {
    websites: fpWebsite,
    tasks: fpTask,
    repos: fpRepo,
    buildProjects: fpBuild,
    links: fpLink,
    notes: fpNote,
    payments: fpPayment,
    ideas: fpIdea,
    credentials: fpCredential,
    customModules: fpCustomModule,
    habits: fpHabit,
};

/**
 * Get the fingerprint function for a given table name.
 */
export function getFingerprint(table: string): FingerprintFn | null {
    return FINGERPRINT_MAP[table] ?? null;
}

/**
 * Build a Set of fingerprints from existing items in a Dexie table.
 */
export async function getExistingFingerprints(tableName: string): Promise<Set<string>> {
    const fp = FINGERPRINT_MAP[tableName];
    if (!fp) return new Set();

    const tableRef = getTableRef(tableName);
    if (!tableRef) return new Set();

    const items = await tableRef.toArray();
    return new Set(items.map((item: any) => fp(item)));
}

/**
 * Filter out items that already exist in the given table — but instead of
 * throwing the duplicate away, fold any extra information it carries into the
 * record that's already stored. Returns only the genuinely new items.
 */
export async function deduplicateItems<T>(tableName: string, items: T[]): Promise<T[]> {
    const fp = FINGERPRINT_MAP[tableName];
    if (!fp) return items; // No fingerprint function = no dedup, pass everything through

    const tableRef = getTableRef(tableName);
    const stored: any[] = tableRef ? await tableRef.toArray() : [];
    const byKey = new Map<string, any>();
    for (const row of stored) {
        const k = identityKey(tableName, row);
        if (k && !byKey.has(k)) byKey.set(k, row);
    }

    const enriched = new Map<string, any>();
    const unique: T[] = [];

    for (const item of items) {
        if (!hasMeaningfulFingerprint(tableName, item)) {
            unique.push(item);
            continue;
        }
        const key = identityKey(tableName, item);
        if (!key) { unique.push(item); continue; }

        const existing = byKey.get(key);
        if (existing) {
            const { merged, changed } = mergeRecords(existing, item as any);
            if (changed) { byKey.set(key, merged); enriched.set(merged.id, merged); }
            continue;
        }
        byKey.set(key, item);
        unique.push(item);
    }

    if (tableRef && enriched.size > 0) {
        await tableRef.bulkPut([...enriched.values()]);
        console.log(`🧠 Dedup: enriched ${enriched.size} existing "${tableName}" record(s) with imported details`);
    }

    return unique;
}

/**
 * Check if a single item already exists in the given table (by content fingerprint).
 */
export async function isDuplicate(tableName: string, item: any): Promise<boolean> {
    const fp = FINGERPRINT_MAP[tableName];
    if (!fp) return false;
    if (!hasMeaningfulFingerprint(tableName, item)) return false;

    const existing = await getExistingFingerprints(tableName);
    return existing.has(fp(item));
}

// ─── Table reference resolver (mirrors dataStore) ───────────────────────────────

function getTableRef(tableName: string) {
    const tables: Record<string, any> = {
        websites: db.websites,
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
    return tables[tableName];
}

// ─── Identity keys (looser than fingerprints) ───────────────────────────────────
// Fingerprints require *every* identity field to match, so "acme.com" imported
// twice with different names stayed as two rows. Identity keys match on the one
// thing that really identifies the record, so near-duplicates get merged.

function identityKey(tableName: string, item: any): string | null {
    switch (tableName) {
        case 'websites':
        case 'links':
        case 'repos': {
            const host = normUrl(item?.url).split('/')[0];
            return host ? `${tableName}|${host}` : (norm(item?.name || item?.title) ? `${tableName}|${norm(item?.name || item?.title)}` : null);
        }
        case 'credentials': {
            const host = normUrl(item?.url).split('/')[0];
            const svc = norm(item?.service);
            const user = norm((item as any)?.username);
            if (host || svc) return `credentials|${host}|${svc}|${user}`;
            return norm(item?.label) ? `credentials|${norm(item.label)}` : null;
        }
        case 'buildProjects':
            return norm(item?.name) ? `buildProjects|${norm(item.name)}` : null;
        default: {
            const fp = FINGERPRINT_MAP[tableName];
            return fp ? fp(item) : null;
        }
    }
}

const SKIP_MERGE_FIELDS = new Set(['id', 'createdAt']);

function isEmptyValue(v: any): boolean {
    return v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.length === 0) ||
        (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
}

/**
 * Enrich `base` with anything `extra` knows and `base` doesn't.
 * Never destroys existing data: empty fields get filled, arrays get unioned,
 * longer text wins only when the base value is blank.
 */
export function mergeRecords<T extends Record<string, any>>(base: T, extra: T): { merged: T; changed: boolean } {
    const merged: any = { ...base };
    let changed = false;

    for (const [k, v] of Object.entries(extra)) {
        if (SKIP_MERGE_FIELDS.has(k) || isEmptyValue(v)) continue;
        const cur = merged[k];

        if (Array.isArray(cur) || Array.isArray(v)) {
            const a = Array.isArray(cur) ? cur : [];
            const b = Array.isArray(v) ? v : [];
            const seen = new Set<string>();
            const union = [...a, ...b].filter(x => {
                const key = typeof x === 'object' ? JSON.stringify(x) : String(x);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            if (union.length !== a.length) { merged[k] = union; changed = true; }
            continue;
        }

        if (isEmptyValue(cur)) { merged[k] = v; changed = true; continue; }

        // Prefer the richer note/description text.
        if (typeof cur === 'string' && typeof v === 'string' &&
            (k === 'notes' || k === 'description') && v.length > cur.length && !cur.includes(v)) {
            merged[k] = cur && !v.includes(cur) ? `${cur}\n${v}` : v;
            changed = true;
        }
    }

    return { merged, changed };
}

/**
 * Smart-dedup an entire table: near-duplicates are MERGED into the first
 * occurrence (so any extra info the duplicate carried is preserved) and then
 * removed. Returns the number of duplicate rows folded away.
 */
export async function deduplicateTable(tableName: string): Promise<number> {
    const tableRef = getTableRef(tableName);
    if (!tableRef) return 0;

    const items = await tableRef.toArray();
    const keepers = new Map<string, any>();
    const toDelete: string[] = [];
    const toUpdate = new Map<string, any>();

    for (const item of items) {
        const key = identityKey(tableName, item);
        if (!key) continue;
        const existing = keepers.get(key);
        if (!existing) { keepers.set(key, item); continue; }

        const { merged, changed } = mergeRecords(existing, item);
        if (changed) { keepers.set(key, merged); toUpdate.set(merged.id, merged); }
        toDelete.push(item.id);
    }

    if (toUpdate.size > 0) await tableRef.bulkPut([...toUpdate.values()]);
    if (toDelete.length > 0) {
        await tableRef.bulkDelete(toDelete);
        console.log(`🧹 Dedup: merged ${toDelete.length} duplicate(s) into existing "${tableName}" records`);
    }

    return toDelete.length;
}

/**
 * Smart-dedup ALL tables. Returns total duplicates merged away.
 */
export async function deduplicateAll(): Promise<number> {
    const tables = Object.keys(FINGERPRINT_MAP);
    let total = 0;
    for (const table of tables) {
        total += await deduplicateTable(table);
    }
    if (total > 0) {
        console.log(`🧹 Total dedup: merged ${total} duplicate(s) across all tables`);
    }
    return total;
}
