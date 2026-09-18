import { n as __exportAll } from "../_runtime.mjs";
import { t as db } from "./db-DLy-AV_e.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/supabase-D3pMiuZg.js
var supabase_D3pMiuZg_exports = /* @__PURE__ */ __exportAll({
	_: () => deduplicateItems,
	a: () => getSupabase,
	b: () => isDuplicate,
	c: () => isSupabaseConnected,
	d: () => pushToSupabase,
	f: () => refreshSupabaseSchemaState,
	g: () => deduplicateAll,
	h: () => testSupabaseConnection,
	i: () => getLastSyncTime,
	l: () => onSyncComplete,
	m: () => supabase_exports,
	n: () => clearSupabaseConfig,
	o: () => getSupabaseConfig,
	p: () => setSupabaseConfig,
	r: () => fullSync,
	s: () => getSupabaseSyncDiagnostics,
	t: () => SUPABASE_SCHEMA_SQL,
	u: () => pullFromSupabase,
	v: () => deduplicateTable,
	y: () => findDuplicateId
});
function norm(s) {
	return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function normUrl(url) {
	let u = norm(url);
	u = u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
	return u;
}
function fpWebsite(item) {
	return `w|${normUrl(item.url)}|${norm(item.name)}`;
}
function hasMeaningfulFingerprint(tableName, item) {
	switch (tableName) {
		case "websites": return Boolean(normUrl(item?.url) || norm(item?.name));
		case "links": return Boolean(normUrl(item?.url) || norm(item?.title));
		case "repos": return Boolean(normUrl(item?.url) || norm(item?.name));
		case "credentials": return Boolean(norm(item?.label) || norm(item?.service) || normUrl(item?.url));
		default: return true;
	}
}
function fpTask(item) {
	return `t|${norm(item.title)}|${norm(item.dueDate)}|${norm(item.category)}|${norm(item.linkedProject)}`;
}
function fpRepo(item) {
	return `r|${normUrl(item.url)}|${norm(item.name)}`;
}
function fpBuild(item) {
	return `bp|${norm(item.name)}|${normUrl(item.projectUrl)}`;
}
function fpLink(item) {
	return `l|${normUrl(item.url)}|${norm(item.title)}`;
}
function fpNote(item) {
	return `n|${norm(item.title)}|${norm(item.content)?.slice(0, 100)}`;
}
function fpPayment(item) {
	return `p|${norm(item.title)}|${item.amount ?? 0}|${norm(item.type)}|${norm(item.from)}|${norm(item.to)}`;
}
function fpIdea(item) {
	return `i|${norm(item.title)}|${norm(item.category)}`;
}
function fpCredential(item) {
	return `c|${norm(item.label)}|${norm(item.service)}|${normUrl(item.url)}`;
}
function fpCustomModule(item) {
	return `cm|${norm(item.name)}`;
}
function fpHabit(item) {
	return `h|${norm(item.name)}|${norm(item.frequency)}`;
}
var FINGERPRINT_MAP = {
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
	habits: fpHabit
};
/**
* Build a Set of fingerprints from existing items in a Dexie table.
*/
async function getExistingFingerprints(tableName) {
	const fp = FINGERPRINT_MAP[tableName];
	if (!fp) return /* @__PURE__ */ new Set();
	const tableRef = getTableRef(tableName);
	if (!tableRef) return /* @__PURE__ */ new Set();
	const items = await tableRef.toArray();
	return new Set(items.map((item) => fp(item)));
}
/**
* Filter out items that already exist in the given table — but instead of
* throwing the duplicate away, fold any extra information it carries into the
* record that's already stored. Returns only the genuinely new items.
*/
async function deduplicateItems(tableName, items) {
	if (!FINGERPRINT_MAP[tableName]) return items;
	const tableRef = getTableRef(tableName);
	const stored = tableRef ? await tableRef.toArray() : [];
	const byKey = /* @__PURE__ */ new Map();
	for (const row of stored) {
		const k = identityKey(tableName, row);
		if (k && !byKey.has(k)) byKey.set(k, row);
	}
	const enriched = /* @__PURE__ */ new Map();
	const unique = [];
	for (const item of items) {
		if (!hasMeaningfulFingerprint(tableName, item)) {
			unique.push(item);
			continue;
		}
		const key = identityKey(tableName, item);
		if (!key) {
			unique.push(item);
			continue;
		}
		const existing = byKey.get(key);
		if (existing) {
			const { merged, changed } = mergeRecords(existing, item);
			if (changed) {
				byKey.set(key, merged);
				enriched.set(merged.id, merged);
			}
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
async function isDuplicate(tableName, item) {
	const fp = FINGERPRINT_MAP[tableName];
	if (!fp) return false;
	if (!hasMeaningfulFingerprint(tableName, item)) return false;
	return (await getExistingFingerprints(tableName)).has(fp(item));
}
function getTableRef(tableName) {
	return {
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
		habits: db.habits
	}[tableName];
}
function identityKey(tableName, item) {
	switch (tableName) {
		case "websites":
		case "links":
		case "repos": {
			const host = normUrl(item?.url).split("/")[0];
			return host ? `${tableName}|${host}` : norm(item?.name || item?.title) ? `${tableName}|${norm(item?.name || item?.title)}` : null;
		}
		case "credentials": {
			const host = normUrl(item?.url).split("/")[0];
			const svc = norm(item?.service);
			const user = norm(item?.username);
			if (host || svc) return `credentials|${host}|${svc}|${user}`;
			return norm(item?.label) ? `credentials|${norm(item.label)}` : null;
		}
		case "buildProjects": return norm(item?.name) ? `buildProjects|${norm(item.name)}` : null;
		default: {
			const fp = FINGERPRINT_MAP[tableName];
			return fp ? fp(item) : null;
		}
	}
}
var SKIP_MERGE_FIELDS = /* @__PURE__ */ new Set(["id", "createdAt"]);
function isEmptyValue(v) {
	return v === void 0 || v === null || v === "" || Array.isArray(v) && v.length === 0 || typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0;
}
/**
* Enrich `base` with anything `extra` knows and `base` doesn't.
* Never destroys existing data: empty fields get filled, arrays get unioned,
* longer text wins only when the base value is blank.
*/
function mergeRecords(base, extra) {
	const merged = { ...base };
	let changed = false;
	for (const [k, v] of Object.entries(extra)) {
		if (SKIP_MERGE_FIELDS.has(k) || isEmptyValue(v)) continue;
		const cur = merged[k];
		if (Array.isArray(cur) || Array.isArray(v)) {
			const a = Array.isArray(cur) ? cur : [];
			const b = Array.isArray(v) ? v : [];
			const seen = /* @__PURE__ */ new Set();
			const union = [...a, ...b].filter((x) => {
				const key = typeof x === "object" ? JSON.stringify(x) : String(x);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
			if (union.length !== a.length) {
				merged[k] = union;
				changed = true;
			}
			continue;
		}
		if (isEmptyValue(cur)) {
			merged[k] = v;
			changed = true;
			continue;
		}
		if (typeof cur === "string" && typeof v === "string" && (k === "notes" || k === "description") && v.length > cur.length && !cur.includes(v)) {
			merged[k] = cur && !v.includes(cur) ? `${cur}\n${v}` : v;
			changed = true;
		}
	}
	return {
		merged,
		changed
	};
}
/**
* Smart-dedup an entire table: near-duplicates are MERGED into the first
* occurrence (so any extra info the duplicate carried is preserved) and then
* removed. Returns the number of duplicate rows folded away.
*/
async function deduplicateTable(tableName) {
	const tableRef = getTableRef(tableName);
	if (!tableRef) return 0;
	const items = await tableRef.toArray();
	const keepers = /* @__PURE__ */ new Map();
	const toDelete = [];
	const toUpdate = /* @__PURE__ */ new Map();
	for (const item of items) {
		const key = identityKey(tableName, item);
		if (!key) continue;
		const existing = keepers.get(key);
		if (!existing) {
			keepers.set(key, item);
			continue;
		}
		const { merged, changed } = mergeRecords(existing, item);
		if (changed) {
			keepers.set(key, merged);
			toUpdate.set(merged.id, merged);
		}
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
async function deduplicateAll() {
	const tables = Object.keys(FINGERPRINT_MAP);
	let total = 0;
	for (const table of tables) total += await deduplicateTable(table);
	if (total > 0) console.log(`🧹 Total dedup: merged ${total} duplicate(s) across all tables`);
	return total;
}
/**
* Find the id of an existing record that is a content duplicate of `item`.
* Used so callers never receive an empty id when an add is folded into an
* existing record.
*/
async function findDuplicateId(tableName, item) {
	const fp = FINGERPRINT_MAP[tableName];
	if (!fp) return null;
	if (!hasMeaningfulFingerprint(tableName, item)) return null;
	const tableRef = getTableRef(tableName);
	if (!tableRef) return null;
	const target = fp(item);
	return (await tableRef.toArray()).find((r) => fp(r) === target)?.id ?? null;
}
var supabase_exports = /* @__PURE__ */ __exportAll$1({
	SUPABASE_SCHEMA_SQL: () => SUPABASE_SCHEMA_SQL,
	clearSupabaseConfig: () => clearSupabaseConfig,
	fullSync: () => fullSync,
	getLastSyncTime: () => getLastSyncTime,
	getSupabase: () => getSupabase,
	getSupabaseConfig: () => getSupabaseConfig,
	getSupabaseProjectHost: () => getSupabaseProjectHost,
	getSupabaseSyncDiagnostics: () => getSupabaseSyncDiagnostics,
	isSupabaseConnected: () => isSupabaseConnected,
	onSyncComplete: () => onSyncComplete,
	pullFromSupabase: () => pullFromSupabase,
	pushToSupabase: () => pushToSupabase,
	refreshSupabaseSchemaState: () => refreshSupabaseSchemaState,
	setSupabaseConfig: () => setSupabaseConfig,
	testSupabaseConnection: () => testSupabaseConnection
});
var supabaseClient = null;
var realtimeChannel = null;
var syncCallbacks = [];
var schemaAvailability = null;
var schemaErrors = [];
var schemaAvailabilityCheckedAt = 0;
var DEFAULT_SUPABASE_URL = "https://qmhuzbumfqjgpbeqdcjp.supabase.co";
var DISCONNECTED_KEY = "mc-supabase-disconnected";
var CLOUD_BASELINE_KEY = "mc-cloud-baseline-ready";
var LAST_SYNC_FALLBACK_KEY = "mc-last-sync-at";
var REQUIRED_REMOTE_TABLES = [
	"mc_websites",
	"mc_tasks",
	"mc_repos",
	"mc_build_projects",
	"mc_links",
	"mc_notes",
	"mc_payments",
	"mc_ideas",
	"mc_credentials",
	"mc_custom_modules",
	"mc_habits",
	"mc_settings",
	"mc_sync_log"
];
function getSupabaseProjectHost(url) {
	try {
		return new URL(url || getSupabaseConfig()?.url || DEFAULT_SUPABASE_URL).host;
	} catch {
		return new URL(DEFAULT_SUPABASE_URL).host;
	}
}
function buildSchemaBlockedMessage(missingTables) {
	return `Connected to Supabase, but sync is blocked: ${missingTables.length}/${REQUIRED_REMOTE_TABLES.length} required tables are missing. Run the SQL schema setup below first.`;
}
function hasCloudBaseline() {
	try {
		return localStorage.getItem(CLOUD_BASELINE_KEY) === "1";
	} catch {
		return false;
	}
}
function markCloudBaselineReady() {
	try {
		localStorage.setItem(CLOUD_BASELINE_KEY, "1");
	} catch {}
}
function clearCloudBaseline() {
	try {
		localStorage.removeItem(CLOUD_BASELINE_KEY);
	} catch {}
}
function chunkArray(items, size) {
	const chunks = [];
	for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
	return chunks;
}
function refreshSupabaseSchemaState() {
	schemaAvailability = null;
	schemaErrors = [];
	schemaAvailabilityCheckedAt = 0;
}
async function getAvailableRemoteTables(client, options) {
	const cacheAge = Date.now() - schemaAvailabilityCheckedAt;
	if (!options?.force && schemaAvailability && cacheAge < 3e4) return schemaAvailability;
	schemaErrors = [];
	const checks = await Promise.all(REQUIRED_REMOTE_TABLES.map(async (table) => {
		const { error } = await client.from(table).select("id").limit(1);
		if (error && !error.code) {
			schemaErrors.push({
				table,
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint,
				checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
				status: error.status
			});
			return [table, false];
		}
		if (error && (error.code === "42P01" || error.code === "PGRST205")) {
			schemaErrors.push({
				table,
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint,
				checkedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			return [table, false];
		}
		if (error) schemaErrors.push({
			table,
			code: error.code,
			message: error.message,
			details: error.details,
			hint: error.hint,
			checkedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		return [table, !error];
	}));
	schemaAvailability = Object.fromEntries(checks);
	schemaAvailabilityCheckedAt = Date.now();
	return schemaAvailability;
}
function markLastSyncNow() {
	try {
		localStorage.setItem(LAST_SYNC_FALLBACK_KEY, (/* @__PURE__ */ new Date()).toISOString());
	} catch {}
}
var DEAD_PROJECT_HOSTS = /* @__PURE__ */ new Set(["dszpokkqhrtjutmvcxnh.supabase.co"]);
function getSupabaseConfig() {
	try {
		if (localStorage.getItem(DISCONNECTED_KEY) === "1") return null;
		const url = localStorage.getItem("mc-supabase-url");
		const anonKey = localStorage.getItem("mc-supabase-anon-key");
		if (url && anonKey && url.startsWith("https://")) {
			try {
				if (DEAD_PROJECT_HOSTS.has(new URL(url).host)) {
					localStorage.removeItem("mc-supabase-url");
					localStorage.removeItem("mc-supabase-anon-key");
					return null;
				}
			} catch {}
			return {
				url,
				anonKey
			};
		}
	} catch {}
	return null;
}
function setSupabaseConfig(url, anonKey) {
	localStorage.setItem("mc-supabase-url", url.trim());
	localStorage.setItem("mc-supabase-anon-key", anonKey.trim());
	try {
		localStorage.removeItem(DISCONNECTED_KEY);
	} catch {}
	clearCloudBaseline();
	if (realtimeChannel) {
		realtimeChannel.unsubscribe();
		realtimeChannel = null;
	}
	refreshSupabaseSchemaState();
	supabaseClient = null;
}
function clearSupabaseConfig() {
	localStorage.removeItem("mc-supabase-url");
	localStorage.removeItem("mc-supabase-anon-key");
	try {
		localStorage.setItem(DISCONNECTED_KEY, "1");
	} catch {}
	clearCloudBaseline();
	if (realtimeChannel) {
		realtimeChannel.unsubscribe();
		realtimeChannel = null;
	}
	refreshSupabaseSchemaState();
	supabaseClient = null;
}
function getSupabase() {
	if (supabaseClient) return supabaseClient;
	const config = getSupabaseConfig();
	if (!config) return null;
	try {
		supabaseClient = createClient(config.url, config.anonKey, {
			auth: {
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: true
			},
			realtime: { params: { eventsPerSecond: 10 } }
		});
		return supabaseClient;
	} catch (e) {
		console.error("Failed to create Supabase client:", e);
		return null;
	}
}
function isSupabaseConnected() {
	return getSupabaseConfig() !== null;
}
async function testSupabaseConnection(url, anonKey) {
	try {
		const normalizedUrl = url.trim();
		const normalizedKey = anonKey.trim();
		const current = getSupabaseConfig();
		const client = current?.url === normalizedUrl && current.anonKey === normalizedKey ? getSupabase() : createClient(normalizedUrl, normalizedKey, { auth: {
			autoRefreshToken: false,
			persistSession: false,
			detectSessionInUrl: false,
			storageKey: `mc-health-${new URL(normalizedUrl).host}`
		} });
		if (!client) throw new Error("Supabase client unavailable");
		const missingTables = (await Promise.all(REQUIRED_REMOTE_TABLES.map(async (table) => {
			const { error } = await client.from(table).select("id").limit(1);
			if (error && !error.code) throw error;
			if (error && error.code !== "PGRST116" && error.code !== "42P01" && error.code !== "PGRST205") throw error;
			return [table, !(error && (error.code === "PGRST116" || error.code === "42P01" || error.code === "PGRST205"))];
		}))).filter(([, available]) => !available).map(([table]) => table);
		if (!(missingTables.length === 0)) return {
			ok: false,
			connectionOk: true,
			schemaReady: false,
			missingTables,
			error: buildSchemaBlockedMessage(missingTables)
		};
		return {
			ok: true,
			connectionOk: true,
			schemaReady: true,
			missingTables: []
		};
	} catch (e) {
		return {
			ok: false,
			connectionOk: false,
			schemaReady: false,
			missingTables: [],
			error: e?.message || "Connection failed",
			diagnostics: [{
				table: "connection",
				code: e?.code,
				message: e?.message || "Connection failed",
				details: e?.details,
				hint: e?.hint,
				status: e?.status,
				checkedAt: (/* @__PURE__ */ new Date()).toISOString()
			}]
		};
	}
}
var SUPABASE_SCHEMA_SQL = `
-- Mission Control Schema (RLS owner-scoped)
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

-- Row Level Security: only the signed-in owner of a row may read/write it.
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

-- Owner-scoped policies (replace any legacy world-open policies).
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'mc_websites','mc_tasks','mc_repos','mc_build_projects','mc_links','mc_notes',
    'mc_payments','mc_ideas','mc_credentials','mc_custom_modules','mc_habits','mc_settings'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'allow_all_mc', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'mc_owner_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      'mc_owner_all', t
    );
  END LOOP;
END $$;

-- Legacy sync log stays world-writable ONLY for signed-in users (insert-only).
ALTER TABLE mc_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_mc" ON mc_sync_log;
CREATE POLICY "mc_owner_log" ON mc_sync_log FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
`;
var TABLE_MAP = [
	{
		local: db.websites,
		remote: "mc_websites"
	},
	{
		local: db.tasks,
		remote: "mc_tasks"
	},
	{
		local: db.repos,
		remote: "mc_repos"
	},
	{
		local: db.buildProjects,
		remote: "mc_build_projects"
	},
	{
		local: db.links,
		remote: "mc_links"
	},
	{
		local: db.notes,
		remote: "mc_notes"
	},
	{
		local: db.payments,
		remote: "mc_payments"
	},
	{
		local: db.ideas,
		remote: "mc_ideas"
	},
	{
		local: db.credentials,
		remote: "mc_credentials"
	},
	{
		local: db.customModules,
		remote: "mc_custom_modules"
	},
	{
		local: db.habits,
		remote: "mc_habits"
	}
];
async function pushToSupabase(options) {
	const client = getSupabase();
	if (!client) return {
		success: false,
		synced: 0,
		error: "Not connected"
	};
	const mirrorDeletes = options?.mirrorDeletes ?? hasCloudBaseline();
	let totalSynced = 0;
	const syncedTables = [];
	try {
		const available = await getAvailableRemoteTables(client);
		for (const { local, remote } of TABLE_MAP) {
			if (!available[remote]) continue;
			const items = await local.toArray();
			const localIds = new Set(items.map((item) => item.id));
			if (items.length > 0) {
				const rows = items.map((item) => ({
					id: item.id,
					data: item
				}));
				const { error } = await client.from(remote).upsert(rows, { onConflict: "id" });
				if (error) throw new Error(`${remote}: ${error.message}`);
				totalSynced += items.length;
			}
			if (mirrorDeletes) {
				const { data: remoteRows, error: remoteErr } = await client.from(remote).select("id");
				if (remoteErr) throw new Error(`${remote}: ${remoteErr.message}`);
				const toDelete = (remoteRows ?? []).map((row) => row.id).filter((id) => !localIds.has(id));
				for (const batch of chunkArray(toDelete, 500)) {
					const { error: delErr } = await client.from(remote).delete().in("id", batch);
					if (delErr) throw new Error(`${remote}: ${delErr.message}`);
				}
			}
			syncedTables.push(remote);
		}
		const settings = await db.settings.get("default");
		if (settings && available.mc_settings) {
			const { error } = await client.from("mc_settings").upsert([{
				id: "default",
				data: settings
			}], { onConflict: "id" });
			if (!error) syncedTables.push("mc_settings");
		}
		if (available.mc_sync_log) await client.from("mc_sync_log").insert([{
			direction: mirrorDeletes ? "push_mirror" : "push",
			tables: syncedTables
		}]);
		markLastSyncNow();
		syncCallbacks.forEach((cb) => cb());
		return {
			success: true,
			synced: totalSynced
		};
	} catch (e) {
		return {
			success: false,
			synced: totalSynced,
			error: e?.message
		};
	}
}
async function pullFromSupabase() {
	const client = getSupabase();
	if (!client) return {
		success: false,
		synced: 0,
		added: 0,
		updated: 0,
		error: "Not connected"
	};
	let totalAdded = 0;
	let totalUpdated = 0;
	try {
		const available = await getAvailableRemoteTables(client);
		for (const { local, remote } of TABLE_MAP) {
			if (!available[remote]) continue;
			const { data, error } = await client.from(remote).select("id, data");
			if (error) {
				if (error.code === "42P01") continue;
				throw new Error(`${remote}: ${error.message}`);
			}
			if (!data?.length) continue;
			const localItems = await local.toArray();
			const localMap = new Map(localItems.map((item) => [item.id, item]));
			for (const row of data) {
				const cloudItem = row.data;
				if (!cloudItem || !cloudItem.id) continue;
				const localItem = localMap.get(cloudItem.id);
				if (!localItem) {
					await local.put(cloudItem);
					totalAdded++;
					continue;
				}
				if (JSON.stringify(localItem) !== JSON.stringify(cloudItem)) {
					await local.put(cloudItem);
					totalUpdated++;
				}
			}
		}
		if (available.mc_settings) {
			const { data: settingsData } = await client.from("mc_settings").select("data").eq("id", "default").single();
			if (settingsData?.data) await db.settings.put({
				...settingsData.data,
				id: "default"
			});
		}
		if (available.mc_sync_log) await client.from("mc_sync_log").insert([{
			direction: "pull",
			tables: TABLE_MAP.map((t) => t.remote).filter((table) => available[table])
		}]);
		const removedDuplicates = await deduplicateAll();
		markCloudBaselineReady();
		markLastSyncNow();
		syncCallbacks.forEach((cb) => cb());
		return {
			success: true,
			synced: totalAdded + totalUpdated + removedDuplicates,
			added: totalAdded,
			updated: totalUpdated
		};
	} catch (e) {
		return {
			success: false,
			synced: 0,
			added: 0,
			updated: 0,
			error: e?.message
		};
	}
}
async function fullSync() {
	const pushResult = await pushToSupabase({ mirrorDeletes: true });
	if (!pushResult.success) return {
		success: false,
		pushed: 0,
		pulled: 0,
		error: `Push failed: ${pushResult.error}`
	};
	const pullResult = await pullFromSupabase();
	if (!pullResult.success) return {
		success: false,
		pushed: pushResult.synced,
		pulled: 0,
		error: `Pull failed: ${pullResult.error}`
	};
	return {
		success: true,
		pushed: pushResult.synced,
		pulled: pullResult.synced
	};
}
function onSyncComplete(callback) {
	syncCallbacks.push(callback);
	return () => {
		syncCallbacks = syncCallbacks.filter((cb) => cb !== callback);
	};
}
async function getLastSyncTime() {
	const client = getSupabase();
	if (!client) return localStorage.getItem(LAST_SYNC_FALLBACK_KEY);
	try {
		const { data } = await client.from("mc_sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1).single();
		return data?.synced_at || localStorage.getItem(LAST_SYNC_FALLBACK_KEY);
	} catch {
		return localStorage.getItem(LAST_SYNC_FALLBACK_KEY);
	}
}
async function getSupabaseSyncDiagnostics() {
	const client = getSupabase();
	const localCounts = await Promise.all(TABLE_MAP.map(async ({ local }) => local.count()));
	const settings = await db.settings.get("default");
	if (!client) return {
		connected: false,
		projectHost: getSupabaseProjectHost(),
		lastSyncAt: await getLastSyncTime(),
		queuedChanges: localCounts.reduce((sum, count) => sum + count, 0) + (settings ? 1 : 0),
		availableTables: {},
		schemaReady: false,
		missingTables: [...REQUIRED_REMOTE_TABLES],
		schemaErrors
	};
	schemaAvailability = null;
	schemaErrors = [];
	const availableTables = await getAvailableRemoteTables(client);
	const missingTables = Object.entries(availableTables).filter(([, available]) => !available).map(([table]) => table);
	return {
		connected: true,
		projectHost: getSupabaseProjectHost(),
		lastSyncAt: await getLastSyncTime(),
		queuedChanges: localCounts.reduce((sum, count) => sum + count, 0) + (settings ? 1 : 0),
		availableTables,
		schemaReady: missingTables.length === 0,
		missingTables,
		schemaErrors
	};
}
//#endregion
export { refreshSupabaseSchemaState as _, deduplicateTable as a, testSupabaseConnection as b, getLastSyncTime as c, getSupabaseSyncDiagnostics as d, isDuplicate as f, pushToSupabase as g, pullFromSupabase as h, deduplicateItems as i, getSupabase as l, onSyncComplete as m, clearSupabaseConfig as n, findDuplicateId as o, isSupabaseConnected as p, deduplicateAll as r, fullSync as s, SUPABASE_SCHEMA_SQL as t, getSupabaseConfig as u, setSupabaseConfig as v, supabase_D3pMiuZg_exports as y };
