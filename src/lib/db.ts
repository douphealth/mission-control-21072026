// Enterprise-grade IndexedDB persistence layer using Dexie.js
// Replaces localStorage for all data — supports larger datasets, offline-first, and proper indexing.

import Dexie, { type Table } from 'dexie';

// ─── Core Entity Types ─────────────────────────────────────────────────────────

export interface Website {
    id: string;
    name: string;
    url: string;
    wpAdminUrl: string;
    wpUsername: string;
    wpPassword: string;
    hostingProvider: string;
    hostingLoginUrl: string;
    hostingUsername: string;
    hostingPassword: string;
    category: string;
    status: 'active' | 'maintenance' | 'down' | 'archived';
    notes: string;
    plugins: string[];
    dateAdded: string;
    lastUpdated: string;
    favicon?: string;
    tags?: string[];
}

// ─── Evidence-backed SEO control-plane entities ───────────────────────────────
// These records intentionally contain optional metrics. An empty value means
// "not observed", never zero. This keeps the dashboard from presenting demo or
// inferred data as a real Search Console, analytics, crawl, or AI-visibility
// result.

export type SEODataSource = 'gsc' | 'bing' | 'ga4' | 'crawl' | 'pagespeed' | 'manual';
export type SEOProfileStatus = 'not-configured' | 'connected' | 'stale' | 'error';
export type SEOPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SEOProfile {
    id: string;
    websiteId: string;
    priority: SEOPriority;
    gscProperty?: string;
    bingSiteUrl?: string;
    ga4Property?: string;
    primaryCountry?: string;
    targetLanguages?: string[];
    trackedQueries?: string[];
    syncStatus: SEOProfileStatus;
    lastSyncedAt?: string;
    syncError?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SEOSnapshot {
    id: string;
    websiteId: string;
    date: string;
    source: SEODataSource;
    periodDays?: number;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    avgPosition?: number;
    sessions?: number;
    conversions?: number;
    indexedPages?: number;
    indexCoverage?: number;
    schemaValidPages?: number;
    canonicalIssues?: number;
    coreWebVitalsPassRate?: number;
    aiQueriesTracked?: number;
    aiMentions?: number;
    aiCitations?: number;
    sourceRef?: string;
    notes?: string;
    importedAt: string;
}

export type SEOQueryIntent = 'informational' | 'commercial' | 'transactional' | 'navigational' | 'local' | 'unknown';

export interface SEOQueryObservation {
    id: string;
    websiteId: string;
    date: string;
    source: SEODataSource;
    query: string;
    url?: string;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    avgPosition?: number;
    intent?: SEOQueryIntent;
    pageType?: string;
    serpFeatures?: string[];
    aeoReady?: boolean;
    geoRelevant?: boolean;
    sourceRef?: string;
    notes?: string;
    importedAt: string;
}

export type SEOIssueCategory =
    | 'indexing' | 'canonical' | 'sitemap' | 'schema' | 'performance'
    | 'content' | 'internal-links' | 'serp' | 'aeo' | 'geo'
    | 'ai-visibility' | 'other';
export type SEOIssueStatus = 'open' | 'in-progress' | 'resolved' | 'ignored';

export interface SEOIssue {
    id: string;
    websiteId: string;
    title: string;
    category: SEOIssueCategory;
    severity: SEOPriority;
    status: SEOIssueStatus;
    url?: string;
    observedAt: string;
    source: SEODataSource;
    evidence?: string;
    expectedMechanism?: string;
    rollback?: string;
    validation?: string;
    lastValidatedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export type SEOActionStatus = 'backlog' | 'ready' | 'in-progress' | 'blocked' | 'done' | 'cancelled';

export interface SEOAction {
    id: string;
    websiteId: string;
    title: string;
    priority: SEOPriority;
    status: SEOActionStatus;
    rationale: string;
    expectedMechanism: string;
    rollback: string;
    validation: string;
    issueId?: string;
    source: 'manual' | 'issue' | 'system';
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export type SEOChangeObject = 'page' | 'site' | 'schema' | 'meta' | 'route' | 'internal-link' | 'indexing' | 'other';
export type SEOChangeStatus = 'observed' | 'validated' | 'reverted';

export interface SEOChange {
    id: string;
    websiteId: string;
    occurredAt: string;
    source: SEODataSource;
    objectType: SEOChangeObject;
    url?: string;
    field: string;
    before: string;
    after: string;
    impact?: string;
    evidence?: string;
    status: SEOChangeStatus;
    createdAt: string;
}

export type SEOVisibilityEngine = 'google-ai-overview' | 'bing-copilot' | 'chatgpt' | 'perplexity' | 'gemini' | 'manual';

export interface SEOVisibilityCheck {
    id: string;
    websiteId: string;
    checkedAt: string;
    engine: SEOVisibilityEngine;
    query: string;
    mentioned: boolean;
    cited: boolean;
    citedUrl?: string;
    evidence?: string;
    sourceRef?: string;
    status: 'observed' | 'verified';
    createdAt: string;
}

export interface Subtask {
    id: string;
    title: string;
    done: boolean;
    dueDate?: string;   // optional date for subtask
    dueTime?: string;   // optional HH:MM for subtask
}

export interface Task {
    id: string;
    title: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'todo' | 'in-progress' | 'blocked' | 'done';
    startDate?: string;  // start of date range (YYYY-MM-DD)
    dueDate: string;     // end date / due date (YYYY-MM-DD)
    category: string;
    description: string;
    linkedProject: string;
    subtasks: Subtask[];
    createdAt: string;
    completedAt?: string;
    tags?: string[];
    recurring?: boolean;
    recurringInterval?: 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
    recurringCustomDays?: number;       // custom interval in days
    recurringEndType?: 'never' | 'date' | 'count';  // when recurrence stops
    recurringEndDate?: string;          // YYYY-MM-DD — if endType is 'date'
    recurringEndCount?: number;         // N occurrences — if endType is 'count'
    recurringCompletedCount?: number;   // how many times completed so far
    startTime?: string;   // HH:MM — calendar time support
    endTime?: string;     // HH:MM — calendar time support
    allDay?: boolean;     // defaults to true if not set
    gcalEventId?: string; // Google Calendar event ID if pushed
    reminder?: 'none' | 'at-time' | '5min' | '15min' | '30min' | '1hr' | '2hr' | '1day';
    reminderFired?: boolean; // prevents re-firing
    /** Multiple reminders — each entry is a preset key or 'custom:MINUTES' */
    reminders?: string[];
    /** Tracks which reminders have fired (by index or key) */
    remindersFired?: string[];
    /** Review loop — last time this task was actively touched (YYYY-MM-DD) */
    touchedAt?: string;
    /** Parked out of the active list without deleting */
    archived?: boolean;
    archivedAt?: string;
    /** Manual Eisenhower override */
    important?: boolean;
}

export interface GitHubRepo {
    id: string;
    name: string;
    url: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    status: 'active' | 'stable' | 'archived' | 'paused';
    demoUrl: string;
    progress: number;
    topics: string[];
    lastUpdated: string;
    /** URL of the dev platform where code was built (bolt.new, lovable, replit, aistudio, etc.) */
    devPlatformUrl?: string;
    /** URL of the deployment gateway (Cloudways, Vercel, Netlify, Railway, etc.) */
    deploymentUrl?: string;
    /** Database connection info */
    dbType?: 'supabase' | 'firebase' | 'planetscale' | 'neon' | 'railway' | 'mongodb' | 'postgres' | 'mysql' | 'other';
    dbUrl?: string;          // Database URL / connection string
    dbDashboardUrl?: string; // Dashboard link (e.g., Supabase dashboard URL)
    dbName?: string;         // Database name or project name
    dbNotes?: string;        // Additional DB notes
}

export interface BuildProject {
    id: string;
    name: string;
    platform: 'bolt' | 'lovable' | 'replit' | 'vercel' | 'other';
    projectUrl: string;
    deployedUrl: string;
    description: string;
    techStack: string[];
    status: 'ideation' | 'building' | 'testing' | 'deployed';
    startedDate: string;
    lastWorkedOn: string;
    nextSteps: string;
    githubRepo: string;
}

export interface LinkItem {
    id: string;
    title: string;
    url: string;
    category: string;
    status: 'active' | 'archived';
    description: string;
    dateAdded: string;
    pinned: boolean;
    favicon?: string;
    tags?: string[];
}

export interface Note {
    id: string;
    title: string;
    content: string;
    color: string;
    pinned: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Payment {
    id: string;
    title: string;
    amount: number;
    currency: string;
    type: 'income' | 'expense' | 'invoice' | 'subscription';
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    category: string;
    from: string;
    to: string;
    dueDate: string;
    paidDate: string;
    recurring: boolean;
    recurringInterval: string;
    linkedProject: string;
    notes: string;
    createdAt: string;
}

export interface Idea {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    status: 'spark' | 'exploring' | 'validated' | 'building' | 'parked';
    tags: string[];
    linkedProject: string;
    votes: number;
    createdAt: string;
    updatedAt: string;
}

export interface CredentialVault {
    id: string;
    label: string;
    service: string;
    url: string;
    username: string;
    password: string; // encrypted
    apiKey: string;   // encrypted
    notes: string;
    category: string;
    createdAt: string;
    tags?: string[];
}

export interface WidgetLayout {
    id: string;
    widgetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    visible: boolean;
}

export interface UserSettings {
    id: string;
    userName: string;
    userRole: string;
    theme: 'light' | 'dark' | 'system';
    sidebarCollapsed: boolean;
    dashboardLayout: WidgetLayout[];
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    encryptionKey?: string;
    lastSync?: string;
}

export interface CustomModule {
    id: string;
    name: string;
    icon: string;
    description: string;
    fields: { key: string; label: string; type: 'text' | 'url' | 'number' | 'date' | 'select' | 'tags' | 'textarea' | 'boolean'; options?: string[] }[];
    data: Record<string, any>[];
    createdAt: string;
    order: number;
    visible: boolean;
    color?: string;
}

export interface HabitTracker {
    id: string;
    name: string;
    icon: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    completions: string[]; // ISO date strings
    streak: number;
    createdAt: string;
    color?: string;
}

// ─── Control Center (industry news, mentions, audience, reminders) ────────────

export interface FeedSource {
    id: string;
    name: string;
    url: string;              // homepage or feed url
    feedUrl?: string;         // resolved feed
    topics?: string[];        // optional topic phrases
    enabled: boolean;
    lastCheckedAt?: string;
    lastError?: string;
    createdAt: string;
}

export type StreamKind = 'industry' | 'mention' | 'newsletter';
export type StreamStatus = 'active' | 'archived';

export interface StreamItem {
    id: string;
    kind: StreamKind;
    title: string;
    url: string;
    source: string;           // source name / domain
    sourceId?: string;        // feedSources.id or watch term id
    summary?: string;
    aiSummary?: string;
    publishedAt: string;      // ISO
    discoveredAt: string;     // ISO
    score: number;            // 0-100 importance
    status: StreamStatus;
    matchedTerm?: string;
    read?: boolean;
}

export type WatchTermType = 'name' | 'brand' | 'handle' | 'domain';

export interface WatchTerm {
    id: string;
    term: string;
    type: WatchTermType;
    anchors?: string[];       // identity anchors that must co-occur
    negatives?: string[];     // false-positive contexts
    enabled: boolean;
    lastCheckedAt?: string;
    createdAt: string;
}

export type AudiencePlatform = 'youtube' | 'x' | 'instagram' | 'facebook' | 'linkedin' | 'threads' | 'tiktok';

export interface AudienceAccount {
    id: string;
    platform: AudiencePlatform;
    handle: string;
    url: string;
    label?: string;
    createdAt: string;
    lastCheckedAt?: string;
    lastStatus?: 'ok' | 'unavailable' | 'limited';
}

export interface AudienceReading {
    id: string;
    accountId: string;
    capturedAt: string;       // ISO
    followers: number | null; // null = unavailable (never a false zero)
    posts?: number | null;
    status: 'ok' | 'unavailable' | 'limited';
}

export interface Reminder {
    id: string;
    title: string;
    notes?: string;
    remindAt: string;         // ISO datetime
    recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
    status: 'pending' | 'done' | 'snoozed';
    sourceUrl?: string;
    createdAt: string;
}

// ─── Decision Center ─────────────────────────────────────────────────────────
// Every finding (SEO issue, mention, trend, sync failure, stale task) becomes a
// decision record. A decision always ends: acted, ignored (with a reason), or
// explicitly deferred. Nothing is allowed to rot silently.

export type DecisionStatus = 'open' | 'acted' | 'ignored' | 'later';
export type DecisionSource =
    | 'seo' | 'mention' | 'audience' | 'sync' | 'task' | 'payment' | 'site' | 'manual';

export interface Decision {
    id: string;
    title: string;
    context: string;
    source: DecisionSource;
    sourceRef?: string;        // id of the originating finding
    websiteId?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendation?: string;
    options?: string[];
    status: DecisionStatus;
    /** Grouping key — identical findings collapse into one decision with a count. */
    groupKey: string;
    occurrences: number;
    /** How many times this came back after being resolved. */
    regressions?: number;
    /** Days of silence after resolution before the finding may resurface. */
    cooldownDays?: number;
    /** ISO datetime until which this decision stays suppressed. */
    cooldownUntil?: string;
    resolutionNote?: string;
    linkedTaskId?: string;
    deferUntil?: string;       // YYYY-MM-DD when status = later
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
}

// ─── Audit history ───────────────────────────────────────────────────────────

export interface AuditEntry {
    id: string;
    at: string;                // ISO datetime
    action: 'create' | 'update' | 'delete' | 'decision' | 'sync' | 'import';
    collection: string;
    recordId: string;
    label: string;
    detail?: string;
    /** Snapshot of the record before the change — enables restore. */
    before?: any;
    device?: string;
}

// ─── Reliability indicators ──────────────────────────────────────────────────

export type SyncSourceId =
    | 'cloud' | 'google-calendar' | 'wordpress' | 'gsc' | 'ga4' | 'bing' | 'feeds' | 'audience';

export interface SyncHealth {
    id: SyncSourceId | string;
    label: string;
    status: 'ok' | 'stale' | 'error' | 'not-configured' | 'syncing';
    lastSuccessAt?: string;
    lastAttemptAt?: string;
    pending?: number;
    error?: string;
    detail?: string;
}


// ─── Database Class ─────────────────────────────────────────────────────────────


class MissionControlDB extends Dexie {
    websites!: Table<Website>;
    seoProfiles!: Table<SEOProfile>;
    seoSnapshots!: Table<SEOSnapshot>;
    seoQueryObservations!: Table<SEOQueryObservation>;
    seoIssues!: Table<SEOIssue>;
    seoActions!: Table<SEOAction>;
    seoChanges!: Table<SEOChange>;
    seoVisibilityChecks!: Table<SEOVisibilityCheck>;
    tasks!: Table<Task>;
    repos!: Table<GitHubRepo>;
    buildProjects!: Table<BuildProject>;
    links!: Table<LinkItem>;
    notes!: Table<Note>;
    payments!: Table<Payment>;
    ideas!: Table<Idea>;
    credentials!: Table<CredentialVault>;
    settings!: Table<UserSettings>;
    customModules!: Table<CustomModule>;
    habits!: Table<HabitTracker>;
    feedSources!: Table<FeedSource>;
    streamItems!: Table<StreamItem>;
    watchTerms!: Table<WatchTerm>;
    audienceAccounts!: Table<AudienceAccount>;
    audienceReadings!: Table<AudienceReading>;
    reminders!: Table<Reminder>;
    decisions!: Table<Decision>;
    auditLog!: Table<AuditEntry>;
    syncHealth!: Table<SyncHealth>;



    constructor() {
        super('MissionControlDB');

        this.version(1).stores({
            websites: 'id, name, status, category, dateAdded',
            tasks: 'id, title, priority, status, dueDate, category, createdAt',
            repos: 'id, name, status, language, lastUpdated',
            buildProjects: 'id, name, platform, status, startedDate',
            links: 'id, title, category, status, pinned, dateAdded',
            notes: 'id, title, pinned, createdAt, updatedAt',
            payments: 'id, type, status, category, dueDate, createdAt',
            ideas: 'id, priority, status, votes, createdAt',
            credentials: 'id, service, category, createdAt',
            settings: 'id',
            customModules: 'id, name, order, visible',
            habits: 'id, name, frequency, createdAt',
        });

        this.version(2).stores({
            tasks: 'id, title, priority, status, dueDate, category, createdAt, gcalEventId',
        });

        this.version(3).stores({
            seoProfiles: 'id, websiteId, priority, syncStatus, updatedAt',
            seoSnapshots: 'id, websiteId, date, source, [websiteId+date]',
            seoQueryObservations: 'id, websiteId, date, source, query, url, [websiteId+date]',
            seoIssues: 'id, websiteId, status, severity, category, observedAt',
            seoActions: 'id, websiteId, status, priority, dueDate, updatedAt',
            seoChanges: 'id, websiteId, occurredAt, status',
            seoVisibilityChecks: 'id, websiteId, checkedAt, engine, mentioned, cited',
        });

        // Review loop reads tasks by staleness and archive state — index both.
        this.version(4).stores({
            tasks: 'id, title, priority, status, dueDate, category, createdAt, gcalEventId, touchedAt',
        });

        // Control Center: industry news, brand mentions, audience, reminders.
        this.version(5).stores({
            feedSources: 'id, name, url, enabled, createdAt',
            streamItems: 'id, kind, status, publishedAt, discoveredAt, score, url, sourceId, [kind+status]',
            watchTerms: 'id, term, type, enabled, createdAt',
            audienceAccounts: 'id, platform, handle, createdAt',
            audienceReadings: 'id, accountId, capturedAt, [accountId+capturedAt]',
            reminders: 'id, status, remindAt, createdAt',
        });

        // Cockpit: Decision Center, audit history, reliability indicators.
        this.version(6).stores({
            decisions: 'id, status, source, severity, websiteId, groupKey, createdAt, updatedAt',
            auditLog: 'id, at, action, collection, recordId',
            syncHealth: 'id, status, lastSuccessAt',
        });
    }

}


export const db = new MissionControlDB();

// ─── Migration from localStorage ─────────────────────────────────────────────

export async function migrateFromLocalStorage(): Promise<boolean> {
    try {
        const raw = localStorage.getItem('mission-control-data');
        if (!raw) return false;

        const data = JSON.parse(raw);
        const existing = await db.settings.get('default');
        if (existing) return false; // Already migrated

        // Migrate all entities
        if (data.websites?.length) await db.websites.bulkPut(data.websites);
        if (data.tasks?.length) await db.tasks.bulkPut(data.tasks);
        if (data.repos?.length) await db.repos.bulkPut(data.repos);
        if (data.buildProjects?.length) await db.buildProjects.bulkPut(data.buildProjects);
        if (data.links?.length) await db.links.bulkPut(data.links);
        if (data.notes?.length) await db.notes.bulkPut(data.notes);
        if (data.payments?.length) await db.payments.bulkPut(data.payments);
        if (data.ideas?.length) await db.ideas.bulkPut(data.ideas);
        if (data.credentials?.length) await db.credentials.bulkPut(data.credentials);

        // Migrate settings
        await db.settings.put({
            id: 'default',
            userName: data.userName || 'Alex',
            userRole: data.userRole || 'Digital Creator & Developer',
            theme: (localStorage.getItem('mc-theme') as any) || 'dark',
            sidebarCollapsed: false,
            dashboardLayout: [],
        });

        console.log('✅ Migrated from localStorage to IndexedDB');
        return true;
    } catch (e) {
        console.error('Migration failed:', e);
        return false;
    }
}

// ─── ID Generator ─────────────────────────────────────────────────────────────

let idCounter = 0;

export function genId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Collision-safe fallback: 12 bytes of CSPRNG + time + monotonic counter.
    const bytes = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    const rand = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    idCounter = (idCounter + 1) % 0xffff;
    return `${Date.now().toString(36)}-${rand}-${idCounter.toString(36)}`;
}
