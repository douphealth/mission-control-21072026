import { n as genId, t as db } from "./db-DLy-AV_e.mjs";
import { f as isDuplicate, g as pushToSupabase, i as deduplicateItems, o as findDuplicateId, p as isSupabaseConnected } from "./supabase-D3pMiuZg.mjs";
import { t as supabase } from "./client-BeRllpCV.mjs";
import { s as markDirty } from "./versions-CwXqq8sp.mjs";
import { t as useLiveQuery } from "../_libs/dexie-react-hooks.mjs";
import { n as create } from "../_libs/zustand.mjs";
import { t as createLovableAuth } from "../_libs/lovable.dev__cloud-auth-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useTableData-BUruD6H7.js
var lovableAuth = createLovableAuth();
var lovable = { auth: { signInWithOAuth: async (provider, opts) => {
	const result = await lovableAuth.signInWithOAuth(provider, {
		...opts,
		extraParams: { ...opts?.extraParams }
	});
	if (result.redirected) return result;
	if (result.error) return result;
	try {
		await supabase.auth.setSession(result.tokens);
	} catch (e) {
		return { error: e instanceof Error ? e : new Error(String(e)) };
	}
	return result;
} } };
var LAST_SYNC_KEY = "mc-cloud-last-sync";
var DIRTY_RECORDS_KEY = "mc-cloud-dirty-records-v2";
var LEGACY_DIRTY_RECORDS_KEY = "mc-cloud-dirty-records-v1";
var TABLE = "mc_records";
var COLLECTIONS = {
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
	settings: db.settings
};
var userId = null;
var status = "signed-out";
var lastError = null;
var pushTimer$1 = null;
var retryAttempt = 0;
var RETRY_BASE_MS = 2e3;
var MAX_RETRY_MS = 6e4;
var MAX_RETRY_ATTEMPTS = 6;
var pushing = false;
var pushAgain = false;
var realtimeBound = false;
var started = false;
function cloudErrorMessage(error, fallback) {
	const message = error instanceof Error ? error.message : String(error ?? "");
	if (/Missing Supabase environment variable|Connect Supabase/i.test(message)) return "Mission Control Cloud is temporarily unavailable. Your changes are safe on this device and will retry automatically.";
	return message || fallback;
}
var listeners = /* @__PURE__ */ new Set();
function recordKey(collection, recordId) {
	return `${collection}::${recordId}`;
}
function dirtyStorageKey(scope = userId ?? "pending") {
	return `${DIRTY_RECORDS_KEY}:${scope}`;
}
function readDirtyRecords() {
	try {
		const parsed = JSON.parse(localStorage.getItem(dirtyStorageKey()) ?? "{}");
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
function writeDirtyRecords(records) {
	try {
		const key = dirtyStorageKey();
		if (Object.keys(records).length) localStorage.setItem(key, JSON.stringify(records));
		else localStorage.removeItem(key);
	} catch {}
	dirtyListeners.forEach((cb) => cb());
}
var dirtyListeners = /* @__PURE__ */ new Set();
function onDirtyRecordsChange(cb) {
	dirtyListeners.add(cb);
	return () => {
		dirtyListeners.delete(cb);
	};
}
function getRecordSyncState(collection, recordId) {
	if (!COLLECTIONS[collection]) return "saved";
	if (!userId) return "local-only";
	if (!readDirtyRecords()[recordKey(collection, recordId)]) return "saved";
	return status === "error" || retryAttempt >= MAX_RETRY_ATTEMPTS ? "failed" : "pending";
}
/** Manual retry after a failed push — resets the backoff and pushes now. */
async function retryCloudPush() {
	retryAttempt = 0;
	await flushCloudChanges();
}
function claimPendingDirtyRecords() {
	if (!userId) return;
	try {
		const targetKey = dirtyStorageKey(userId);
		const current = JSON.parse(localStorage.getItem(targetKey) ?? "{}");
		const pending = JSON.parse(localStorage.getItem(dirtyStorageKey("pending")) ?? "{}");
		const legacy = JSON.parse(localStorage.getItem(LEGACY_DIRTY_RECORDS_KEY) ?? "{}");
		const merged = {
			...current,
			...legacy,
			...pending
		};
		if (Object.keys(merged).length) localStorage.setItem(targetKey, JSON.stringify(merged));
		localStorage.removeItem(dirtyStorageKey("pending"));
		localStorage.removeItem(LEGACY_DIRTY_RECORDS_KEY);
	} catch {}
}
/** Persisted before the debounced request so a reload can never lose the edit. */
function markCloudRecordDirty(collection, recordId, operation = "put") {
	if (!COLLECTIONS[collection] || !recordId) return;
	const records = readDirtyRecords();
	records[recordKey(collection, recordId)] = {
		operation,
		changedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	writeDirtyRecords(records);
}
function markCloudRecordsDirty(collection, recordIds, operation = "put") {
	if (!COLLECTIONS[collection] || !recordIds.length) return;
	const records = readDirtyRecords();
	const changedAt = (/* @__PURE__ */ new Date()).toISOString();
	for (const recordId of recordIds) if (recordId) records[recordKey(collection, recordId)] = {
		operation,
		changedAt
	};
	writeDirtyRecords(records);
}
function clearSyncedDirtyRecords(captured) {
	const current = readDirtyRecords();
	for (const [key, value] of Object.entries(captured)) if (current[key]?.changedAt === value.changedAt && current[key]?.operation === value.operation) delete current[key];
	writeDirtyRecords(current);
}
function setStatus(next, err = null) {
	status = next;
	lastError = err;
	listeners.forEach((cb) => cb(status, lastError));
	dirtyListeners.forEach((cb) => cb());
	(async () => {
		try {
			const { reportSync } = await import("./reliability-C67EvvSL.mjs").then((n) => n.a).then((n) => n.a);
			const pending = Object.keys(readDirtyRecords()).length;
			await reportSync("cloud", {
				status: next === "synced" ? "ok" : next === "syncing" ? "syncing" : next === "error" ? "error" : next === "offline" ? "stale" : "not-configured",
				error: err ?? void 0,
				pending,
				label: "Cloud backup"
			});
		} catch {}
	})();
}
function getLastCloudSync() {
	try {
		return localStorage.getItem(LAST_SYNC_KEY);
	} catch {
		return null;
	}
}
function onCloudStatus(cb) {
	listeners.add(cb);
	cb(status, lastError);
	return () => {
		listeners.delete(cb);
	};
}
/** Publicly probe whether the Supabase project's Google OAuth provider is
* actually usable (enabled AND has a secret). `GET /auth/v1/settings` tells
* us `external.google`; `GET /auth/v1/authorize?provider=google` returns
* 400 "missing OAuth secret" when the secret is absent. Caches for 10 min. */
var googleProviderCache = null;
async function isGoogleProviderReady() {
	if (googleProviderCache && Date.now() - googleProviderCache.at < 6e5) return googleProviderCache.ready;
	try {
		const { data } = await supabase.auth.getSession();
		if (data.session) return true;
		const supabaseUrl = ((await import("./supabase-D3pMiuZg.mjs").then((n) => n.y).then((n) => n.m)).getSupabaseConfig?.())?.url || "";
		if (!supabaseUrl) return false;
		const res = await fetch(`${supabaseUrl}/auth/v1/authorize?provider=google`, {
			method: "GET",
			redirect: "manual"
		});
		const ready = res.type === "opaqueredirect" || res.status === 302 || res.status === 200;
		googleProviderCache = {
			ready,
			at: Date.now()
		};
		return ready;
	} catch {
		return true;
	}
}
async function waitForSession(ms = 8e3) {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		const { data } = await supabase.auth.getSession();
		if (data.session) return true;
		await new Promise((r) => setTimeout(r, 400));
	}
	return false;
}
async function signInToCloud() {
	try {
		setStatus("connecting");
		if ((await supabase.auth.getSession()).data.session) {
			await startCloudSync(true);
			return;
		}
		if (!await isGoogleProviderReady()) throw new Error("GOOGLE_OAUTH_UNCONFIGURED");
		let res = null;
		let popupError = null;
		try {
			res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
		} catch (e) {
			popupError = e;
		}
		if (res?.redirected) return;
		if (popupError || res?.error) {
			if (await waitForSession(2500)) {
				await startCloudSync(true);
				return;
			}
			const msg = String(popupError?.message ?? res?.error?.message ?? res?.error ?? "");
			if (/missing OAuth secret|Unsupported provider|secret/i.test(msg)) throw new Error("GOOGLE_OAUTH_UNCONFIGURED");
			if (/cancel|closed|popup/i.test(msg)) throw new Error("Google sign-in window was closed before finishing. Allow pop-ups for this site and try again.");
			throw new Error(msg || "Sign-in failed");
		}
		if (!await waitForSession()) throw new Error("Google sign-in did not complete. Allow pop-ups for this site, then retry.");
		await startCloudSync(true);
	} catch (e) {
		setStatus("error", cloudErrorMessage(e, "Sign-in failed"));
	}
}
/** Email code sign-in — works with zero server-side OAuth configuration.
*  Sends a 6-digit code; onAutoSession fires when the code is verified. */
async function requestEmailCode(email) {
	try {
		setStatus("connecting");
		const { error } = await supabase.auth.signInWithOtp({
			email: email.trim(),
			options: {
				shouldCreateUser: true,
				emailRedirectTo: window.location.origin
			}
		});
		if (error) {
			setStatus("error", error.message);
			return {
				ok: false,
				error: error.message
			};
		}
		return { ok: true };
	} catch (e) {
		const msg = String(e?.message ?? e);
		setStatus("error", msg);
		return {
			ok: false,
			error: msg
		};
	}
}
/** Verify the 6-digit code from the email. */
async function verifyEmailCode(email, code) {
	try {
		const { error } = await supabase.auth.verifyOtp({
			email: email.trim(),
			token: code.trim(),
			type: "email"
		});
		if (error) return {
			ok: false,
			error: error.message
		};
		await startCloudSync(true);
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			error: String(e?.message ?? e)
		};
	}
}
/**
* Magic-link exchange — for users whose email contains a "Log In" LINK
* instead of a 6-digit code (Supabase "Email OTP" toggle off).
*
* The platform-locked Site URL points at lovable.app, so links often land on
* a different origin than the one where the user requested the code. The
* fix works entirely in the browser:
*   1. Client boots with detectSessionInUrl — links consumed automatically
*      on the origin they land on.
*   2. If the link landed on ANOTHER origin, the user copies the link from
*      the email and pastes it here; we extract the token and exchange it
*      directly against the auth server (implicit flow — no PKCE verifier
*      needed, so it works cross-origin).
*/
/**
* Verify a pasted email link, with a self-healing ladder:
*  1. Unwrap mail-client tracking wrappers (Gmail "?u=", Apple Mail redirects)
*  2. Try every token type Supabase uses (magiclink, signup, invite, recovery, email_change)
*  3. If the token is expired/used, auto-send a fresh link to the same email —
*     a dead paste instantly becomes a new email in the user's inbox.
*/
async function verifyMagicLink(linkUrl, email) {
	try {
		let url;
		try {
			url = new URL(linkUrl.trim());
		} catch {
			return {
				ok: false,
				error: "That doesn't look like a link. Paste the full Log In link from the email."
			};
		}
		const unwrapped = unwrapMailLink(url.href);
		if (unwrapped) url = new URL(unwrapped);
		const fromParams = (u) => {
			const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.search;
			const params = new URLSearchParams(hash);
			return {
				token: params.get("token_hash") ?? params.get("token") ?? new URLSearchParams(u.search).get("token_hash"),
				type: (params.get("type") ?? "magiclink").toLowerCase()
			};
		};
		const { token, type } = fromParams(url);
		if (!token) return {
			ok: false,
			error: "No sign-in token found in that link. Paste the full link from the email."
		};
		const types = [
			type,
			"magiclink",
			"signup",
			"invite",
			"recovery",
			"email_change"
		].filter((t, idx, arr) => arr.indexOf(t) === idx);
		let lastError = "";
		for (const t of types) {
			const { error } = await supabase.auth.verifyOtp({
				type: t,
				token_hash: token
			});
			if (!error) {
				await startCloudSync(true);
				return { ok: true };
			}
			lastError = error.message;
			if (/expired|invalid|used|already|token/i.test(error.message)) break;
		}
		if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			if ((await requestEmailCode(email)).ok) return {
				ok: false,
				resent: true,
				email,
				error: `That link was already used or expired — a fresh one is on its way to ${email}. Check your inbox and paste the new link.`
			};
		}
		return {
			ok: false,
			error: lastError || "Email link is invalid or has expired"
		};
	} catch (e) {
		return {
			ok: false,
			error: String(e?.message ?? e)
		};
	}
}
/** Peel mail-client tracking wrappers down to the embedded destination URL. */
function unwrapMailLink(href) {
	try {
		const u = new URL(href);
		const inner = u.searchParams.get("u");
		if (inner && inner.startsWith("http")) return decodeURIComponent(inner);
		for (const k of [
			"url",
			"redirect",
			"dest",
			"target",
			"continue"
		]) {
			const v = u.searchParams.get(k);
			if (v && v.startsWith("http")) return decodeURIComponent(v);
		}
		return null;
	} catch {
		return null;
	}
}
async function localSnapshot() {
	const out = [];
	for (const [collection, table] of Object.entries(COLLECTIONS)) {
		const rows = await table.toArray();
		for (const row of rows) {
			if (!row?.id) continue;
			out.push({
				collection,
				record_id: String(row.id),
				data: row
			});
		}
	}
	return out;
}
function chunk(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}
var REQUIRED_FIELDS = {
	tasks: ["title"],
	websites: ["name"],
	notes: ["title"],
	links: ["title"],
	repos: ["name"],
	buildProjects: ["name"],
	ideas: ["title"],
	credentials: ["label"],
	customModules: ["name"],
	habits: ["name"],
	feedSources: ["name"],
	streamItems: ["title"],
	watchTerms: ["term"],
	audienceAccounts: ["platform"],
	reminders: ["title"]
};
function isValidRecord(collection, data, recordId) {
	if (!data || typeof data !== "object" || Array.isArray(data)) return false;
	if (typeof data.id !== "string" || !data.id) return false;
	if (recordId && data.id !== recordId) return false;
	for (const field of REQUIRED_FIELDS[collection] ?? []) if (typeof data[field] !== "string") return false;
	return true;
}
async function pullFromCloud() {
	if (!userId) return {
		ok: false,
		restored: 0,
		remoteRows: 0,
		error: "Not signed in"
	};
	try {
		setStatus("syncing");
		const rows = [];
		const pageSize = 1e3;
		for (let page = 0;; page++) {
			const { data, error } = await supabase.from(TABLE).select("collection, record_id, data, deleted, updated_at").range(page * pageSize, page * pageSize + pageSize - 1);
			if (error) throw error;
			rows.push(...data ?? []);
			if (!data || data.length < pageSize) break;
		}
		const dirty = readDirtyRecords();
		let restored = 0;
		let skipped = 0;
		for (const [collection, table] of Object.entries(COLLECTIONS)) {
			const mine = rows.filter((r) => r.collection === collection);
			const alive = [];
			for (const r of mine.filter((x) => !x.deleted)) {
				if (dirty[recordKey(collection, r.record_id)]) continue;
				if (isValidRecord(collection, r.data, r.record_id)) alive.push(r.data);
				else skipped++;
			}
			const dead = mine.filter((r) => r.deleted && !dirty[recordKey(collection, r.record_id)]).map((r) => r.record_id);
			if (alive.length) {
				await table.bulkPut(alive);
				restored += alive.length;
			}
			if (dead.length) await table.bulkDelete(dead);
		}
		if (skipped) console.warn(`☁️ Skipped ${skipped} corrupt cloud record(s) during restore`);
		try {
			localStorage.setItem(LAST_SYNC_KEY, (/* @__PURE__ */ new Date()).toISOString());
		} catch {}
		setStatus("synced");
		return {
			ok: true,
			restored,
			remoteRows: rows.length
		};
	} catch (e) {
		const message = cloudErrorMessage(e, "Restore failed");
		setStatus("error", message);
		return {
			ok: false,
			restored: 0,
			remoteRows: 0,
			error: message
		};
	}
}
async function pushNow() {
	if (!userId) return;
	if (pushing) {
		pushAgain = true;
		return;
	}
	const uid = userId;
	pushing = true;
	let pullAfterConflict = false;
	try {
		setStatus("syncing");
		const capturedDirty = readDirtyRecords();
		const dirtyEntries = Object.entries(capturedDirty);
		if (!dirtyEntries.length) {
			setStatus("synced");
			return;
		}
		const rows = [];
		for (const [key, change] of dirtyEntries) {
			const separator = key.indexOf("::");
			if (separator < 1) continue;
			const collection = key.slice(0, separator);
			const recordId = key.slice(separator + 2);
			const table = COLLECTIONS[collection];
			if (!table || !recordId) continue;
			const local = change.operation === "put" ? await table.get(recordId) : null;
			rows.push({
				user_id: uid,
				collection,
				record_id: recordId,
				data: local ?? {},
				deleted: change.operation === "delete" || !local,
				updated_at: change.changedAt
			});
		}
		const { data: remoteVersions, error: versionsError } = await supabase.from(TABLE).select("collection, record_id, updated_at");
		if (versionsError) throw versionsError;
		const remoteUpdatedAt = new Map((remoteVersions ?? []).map((row) => [recordKey(row.collection, row.record_id), row.updated_at]));
		const newestRows = rows.filter((row) => {
			const remote = remoteUpdatedAt.get(recordKey(row.collection, row.record_id));
			return !remote || new Date(row.updated_at).getTime() >= new Date(remote).getTime();
		});
		pullAfterConflict = newestRows.length !== rows.length;
		for (const batch of chunk(newestRows, 300)) {
			const { error } = await supabase.from(TABLE).upsert(batch, { onConflict: "user_id,collection,record_id" });
			if (error) throw error;
		}
		try {
			localStorage.setItem(LAST_SYNC_KEY, (/* @__PURE__ */ new Date()).toISOString());
		} catch {}
		clearSyncedDirtyRecords(capturedDirty);
		retryAttempt = 0;
		setStatus("synced");
	} catch (e) {
		setStatus(navigator.onLine ? "error" : "offline", cloudErrorMessage(e, "Backup failed"));
		scheduleRetry();
	} finally {
		pushing = false;
		if (pushAgain) {
			pushAgain = false;
			pushNow();
		} else if (pullAfterConflict) pullFromCloud();
	}
}
/**
* Bounded exponential retry. A failed push never loses the edit: the journal
* stays on disk and the next attempt (or a reload) picks it up again.
*/
function scheduleRetry() {
	if (!userId) return;
	if (retryAttempt >= MAX_RETRY_ATTEMPTS) return;
	const delay = Math.min(RETRY_BASE_MS * 2 ** retryAttempt, MAX_RETRY_MS);
	retryAttempt += 1;
	if (pushTimer$1) clearTimeout(pushTimer$1);
	pushTimer$1 = setTimeout(() => {
		pushNow();
	}, delay);
}
/**
* Debounced backup — the default path after every local mutation. The Dexie
* write already happened, so the UI is saved; the network call is batched so
* a burst of rapid edits produces one request, not one per keystroke.
*/
function queueCloudPush(delay = 1200) {
	if (!userId) return;
	retryAttempt = 0;
	if (pushTimer$1) clearTimeout(pushTimer$1);
	pushTimer$1 = setTimeout(() => {
		pushNow();
	}, delay);
}
/** Flush pending edits now. Local writes remain safe when offline and retry later. */
async function flushCloudChanges() {
	if (!userId) return;
	if (pushTimer$1) {
		clearTimeout(pushTimer$1);
		pushTimer$1 = null;
	}
	await pushNow();
}
async function forceCloudSync() {
	if (!userId) return;
	await flushCloudChanges();
	await pullFromCloud();
}
function bindRealtime() {
	if (realtimeBound || !userId) return;
	realtimeBound = true;
	supabase.channel("mc-records-sync").on("postgres_changes", {
		event: "*",
		schema: "public",
		table: TABLE,
		filter: `user_id=eq.${userId}`
	}, () => {
		if (!pushing) pullFromCloud();
	}).subscribe();
}
/**
* Boot the cloud layer. Returns whether local data was restored from cloud.
* Safe to call multiple times.
*/
async function startCloudSync(force = false) {
	if (started && !force) return {
		signedIn: !!userId,
		restored: 0
	};
	started = true;
	const { data } = await supabase.auth.getSession();
	userId = data.session?.user?.id ?? null;
	if (!userId) {
		setStatus("signed-out");
		return {
			signedIn: false,
			restored: 0
		};
	}
	claimPendingDirtyRecords();
	const hadPendingChanges = Object.keys(readDirtyRecords()).length > 0;
	if (hadPendingChanges) await pushNow();
	const pulled = await pullFromCloud();
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
			realtimeBound = false;
			if (!userId) {
				setStatus("signed-out");
				return;
			}
			claimPendingDirtyRecords();
			(async () => {
				if (Object.keys(readDirtyRecords()).length > 0) await pushNow();
				await pullFromCloud();
				bindRealtime();
			})();
		});
		window.addEventListener("online", () => {
			if (userId) forceCloudSync();
		});
		window.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && userId) pullFromCloud();
		});
		window.addEventListener("pagehide", () => {
			if (userId) pushNow();
		});
	}
	return {
		signedIn: true,
		restored: pulled.restored
	};
}
var REDACTED = "[redacted]";
/** Field names whose *values* are always treated as secret material. */
var SECRET_KEY_RE = /(^|[^a-z])(pass|passwd|password|pwd|secret|token|apikey|api_key|api-key|accesskey|access_key|privatekey|private_key|clientsecret|client_secret|credential|credentials|bearer|refresh_token|sessionkey|session_key|ssh|certificate|cert_key|otp|pin|seedphrase|seed_phrase|mnemonic)($|[^a-z])/i;
/** Keys that merely *reference* a secret are safe to keep. */
var SAFE_KEY_RE = /(secretref|secret_ref|passwordref|password_ref|tokenref|token_ref|hasPassword|passwordSet)/i;
function isSecretKey(key) {
	if (!key) return false;
	if (SAFE_KEY_RE.test(key)) return false;
	const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase();
	return SECRET_KEY_RE.test(`_${normalized}_`);
}
/** Obvious secret-shaped values, independent of their field name. */
var VALUE_PATTERNS = [
	/\bsk-[A-Za-z0-9_-]{16,}\b/g,
	/\bghp_[A-Za-z0-9]{20,}\b/g,
	/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
	/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
	/\bAKIA[0-9A-Z]{16}\b/g,
	/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
	/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
];
function redactSecretValue(value) {
	let out = value;
	for (const re of VALUE_PATTERNS) out = out.replace(re, REDACTED);
	return out;
}
/**
* Redacts `key: value` / `key = value` pairs line by line, plus any
* secret-shaped token anywhere in the text. Used before sending free text to
* an AI provider, and before writing text into an export.
*/
function redactSecretText(text) {
	if (!text) return text;
	return text.split(/\r?\n/).map((line) => {
		const m = line.match(/^(\s*[^:=\t]{0,60}?)\s*([:=])\s*(.+)$/);
		if (m && isSecretKey(m[1].trim())) return `${m[1]}${m[2]} ${REDACTED}`;
		return redactSecretValue(line);
	}).join("\n");
}
/**
* Deep-redacts an object graph. Returns a structural copy — the input is never
* mutated, so callers can safely pass live records.
*/
function redactSecrets(input, depth = 0) {
	if (depth > 8 || input == null) return input;
	if (typeof input === "string") return redactSecretValue(input);
	if (typeof input !== "object") return input;
	if (Array.isArray(input)) return input.map((v) => redactSecrets(v, depth + 1));
	if (input instanceof Date) return input;
	const out = {};
	for (const [key, value] of Object.entries(input)) {
		if (isSecretKey(key)) {
			out[key] = value == null || value === "" ? value : REDACTED;
			continue;
		}
		out[key] = redactSecrets(value, depth + 1);
	}
	return out;
}
/** Ciphertext / vault payload markers that must never ride along in a backup. */
var CIPHERTEXT_KEY = /(encrypted|ciphertext|cipher|vault|keymaterial|encryptionkey|^salt$|^iv$|connectionstring|conn_string|dsn|dburl|database_url)/i;
var CIPHERTEXT_VALUE = /^(wcapi:|mcenc:)/;
/** Credentials embedded in a URI, e.g. postgres://user:pass@host/db */
var URI_CREDENTIAL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/gi;
/** Container keys that name a collection, not a credential value. */
var CONTAINER_KEYS = /* @__PURE__ */ new Set([
	"credentials",
	"credentialVault",
	"vaults"
]);
function isBackupUnsafeKey(key, value) {
	if (CONTAINER_KEYS.has(key) && (Array.isArray(value) || value === null)) return false;
	if (/^secretRef$|SecretRef$/.test(key)) return false;
	return isSecretKey(key) || CIPHERTEXT_KEY.test(key);
}
/**
* Backup/export policy: secret-bearing fields are DROPPED, not redacted.
* A restored backup must never write `[redacted]` over a live credential, and
* an exported file must never contain plaintext secrets or vault ciphertext.
*/
function stripSecretsForExport(input, depth = 0) {
	if (depth > 10 || input == null) return input;
	if (typeof input === "string") {
		if (CIPHERTEXT_VALUE.test(input) || URI_CREDENTIAL.test(input)) return REDACTED;
		return redactSecretValue(input);
	}
	if (typeof input !== "object") return input;
	if (input instanceof Date) return input;
	if (Array.isArray(input)) return input.map((v) => stripSecretsForExport(v, depth + 1));
	const out = {};
	for (const [key, value] of Object.entries(input)) {
		if (isBackupUnsafeKey(key, value)) continue;
		out[key] = stripSecretsForExport(value, depth + 1);
	}
	return out;
}
var MAX_ENTRIES = 2e3;
function deviceLabel() {
	if (typeof navigator === "undefined") return "server";
	const ua = navigator.userAgent;
	if (/iPhone|iPad|Android/i.test(ua)) return "mobile";
	return "desktop";
}
async function logAudit(entry) {
	try {
		const { before, ...rest } = entry;
		await db.auditLog.put({
			id: genId(),
			at: (/* @__PURE__ */ new Date()).toISOString(),
			device: deviceLabel(),
			...rest,
			before: before === void 0 ? void 0 : redactSecrets(before)
		});
		const count = await db.auditLog.count();
		if (count > MAX_ENTRIES) {
			const stale = await db.auditLog.orderBy("at").limit(count - MAX_ENTRIES).toArray();
			await db.auditLog.bulkDelete(stale.map((e) => e.id));
		}
	} catch {}
}
/**
* An audit snapshot is stored redacted, so it must never write `[redacted]`
* over a live credential. Secret-bearing fields are dropped from the restore
* payload and the current record's values are kept for them.
*/
function stripRedactedFields(snapshot, current, depth = 0) {
	if (depth > 8 || snapshot == null || typeof snapshot !== "object") return snapshot;
	if (Array.isArray(snapshot)) return snapshot;
	const out = {};
	for (const [key, value] of Object.entries(snapshot)) {
		if (isSecretKey(key) || value === "[redacted]") {
			if (current && current[key] !== void 0) out[key] = current[key];
			continue;
		}
		out[key] = value && typeof value === "object" && !Array.isArray(value) ? stripRedactedFields(value, current?.[key], depth + 1) : value;
	}
	return out;
}
/** Restore a deleted / modified record from its audit snapshot. */
async function restoreFromAudit(entry) {
	if (!entry.before) return false;
	const table = db[entry.collection];
	if (!table?.put) return false;
	const current = await table.get(entry.recordId).catch(() => void 0);
	await table.put(stripRedactedFields(entry.before, current));
	await logAudit({
		action: "update",
		collection: entry.collection,
		recordId: entry.recordId,
		label: `Restored: ${entry.label}`
	});
	return true;
}
function describeAudit(entry) {
	return `${{
		create: "Created",
		update: "Updated",
		delete: "Deleted",
		decision: "Decision",
		sync: "Sync",
		import: "Imported"
	}[entry.action] ?? entry.action} · ${entry.label}`;
}
var AUDIT_SKIP = /* @__PURE__ */ new Set([
	"auditLog",
	"syncHealth",
	"audienceReadings",
	"streamItems"
]);
function labelOf(item) {
	return item?.title || item?.name || item?.label || item?.service || item?.term || item?.id || "record";
}
function getTable(tableName) {
	return {
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
		syncHealth: db.syncHealth
	}[tableName];
}
var pushTimer = null;
var saveStatusCallbacks = [];
function onSaveStatus(cb) {
	saveStatusCallbacks.push(cb);
	return () => {
		saveStatusCallbacks = saveStatusCallbacks.filter((c) => c !== cb);
	};
}
function notifySaveStatus(status) {
	saveStatusCallbacks.forEach((cb) => cb(status));
}
function schedulePush() {
	notifySaveStatus("saving");
	try {
		markDirty();
	} catch {}
	try {
		queueCloudPush();
	} catch {}
	if (!isSupabaseConnected()) {
		notifySaveStatus("saved");
		return;
	}
	if (pushTimer) clearTimeout(pushTimer);
	pushTimer = setTimeout(() => {
		pushToSupabase().then((r) => {
			if (r.success) {
				console.log(`☁️ Auto-pushed ${r.synced} items`);
				notifySaveStatus("saved");
			} else {
				console.warn("☁️ Auto-push failed:", r.error);
				notifySaveStatus("error");
				setTimeout(() => {
					pushToSupabase().then((r2) => {
						notifySaveStatus(r2.success ? "saved" : "error");
					});
				}, 5e3);
			}
		});
	}, 1e3);
}
var useDataStore = create((set, _get) => ({
	isLoading: true,
	setIsLoading: (v) => set({ isLoading: v }),
	dashboardLayout: [],
	setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
	saveDashboardLayout: async (layout) => {
		await db.settings.update("default", { dashboardLayout: layout });
		set({ dashboardLayout: layout });
	},
	addItem: async (table, item) => {
		const id = genId();
		const tableRef = getTable(table);
		if (!tableRef) throw new Error(`Unknown table: ${table}`);
		if (await isDuplicate(table, item)) {
			const existingId = await findDuplicateId(table, item);
			console.warn(`⚠️ Duplicate detected in "${table}", reusing existing record:`, existingId);
			if (existingId) return existingId;
		}
		await tableRef.put({
			...item,
			id
		});
		if (!AUDIT_SKIP.has(table)) logAudit({
			action: "create",
			collection: table,
			recordId: id,
			label: `${labelOf(item)} (${table})`
		});
		markCloudRecordDirty(table, id);
		schedulePush();
		return id;
	},
	updateItem: async (table, id, changes) => {
		const tableRef = getTable(table);
		if (!tableRef) throw new Error(`Unknown table: ${table}`);
		const patch = table === "tasks" && !changes.touchedAt ? {
			...changes,
			touchedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		} : changes;
		const previous = AUDIT_SKIP.has(table) ? null : await tableRef.get(id);
		await tableRef.update(id, patch);
		if (previous) logAudit({
			action: "update",
			collection: table,
			recordId: id,
			label: `${labelOf(previous)} (${table})`,
			detail: Object.keys(patch).slice(0, 6).join(", "),
			before: previous
		});
		markCloudRecordDirty(table, id);
		schedulePush();
	},
	deleteItem: async (table, id) => {
		const tableRef = getTable(table);
		if (!tableRef) throw new Error(`Unknown table: ${table}`);
		const removed = AUDIT_SKIP.has(table) ? null : await tableRef.get(id);
		await tableRef.delete(id);
		if (removed) logAudit({
			action: "delete",
			collection: table,
			recordId: id,
			label: `${labelOf(removed)} (${table})`,
			before: removed
		});
		markCloudRecordDirty(table, id, "delete");
		schedulePush();
	},
	duplicateItem: async (table, id, overrides = {}) => {
		const tableRef = getTable(table);
		if (!tableRef) throw new Error(`Unknown table: ${table}`);
		const original = await tableRef.get(id);
		if (!original) throw new Error(`Item not found: ${id}`);
		const newId = genId();
		const { id: _oldId, ...rest } = original;
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		const clone = {
			...rest,
			id: newId,
			...overrides
		};
		if (clone.title && !overrides.title) clone.title = `${clone.title} (Copy)`;
		else if (clone.name && !overrides.name) clone.name = `${clone.name} (Copy)`;
		else if (clone.label && !overrides.label) clone.label = `${clone.label} (Copy)`;
		if (clone.createdAt && !overrides.createdAt) clone.createdAt = now;
		if (clone.dateAdded && !overrides.dateAdded) clone.dateAdded = now;
		if (clone.lastUpdated && !overrides.lastUpdated) clone.lastUpdated = now;
		if (clone.updatedAt && !overrides.updatedAt) clone.updatedAt = now;
		await tableRef.put(clone);
		markCloudRecordDirty(table, newId);
		schedulePush();
		return newId;
	},
	bulkAddItems: async (table, items) => {
		const tableRef = getTable(table);
		if (!tableRef) throw new Error(`Unknown table: ${table}`);
		const unique = await deduplicateItems(table, items);
		if (unique.length === 0) {
			console.warn(`⚠️ All ${items.length} items in "${table}" are duplicates, skipping bulk add`);
			return;
		}
		if (unique.length < items.length) console.log(`🧹 Dedup: filtered out ${items.length - unique.length} duplicate(s) from "${table}" bulk add`);
		const withIds = unique.map((item) => ({
			...item,
			id: genId()
		}));
		await tableRef.bulkPut(withIds);
		markCloudRecordsDirty(table, withIds.map((item) => item.id));
		schedulePush();
	},
	bulkPatch: async (table, ids, changes) => {
		const tableRef = getTable(table);
		if (!tableRef) throw new Error(`Unknown table: ${table}`);
		if (ids.length === 0) return;
		await db.transaction("rw", tableRef, async () => {
			for (const id of ids) await tableRef.update(id, changes);
		});
		if (!AUDIT_SKIP.has(table)) for (const id of ids) logAudit({
			action: "update",
			collection: table,
			recordId: id,
			label: `${id} (${table})`,
			detail: Object.keys(changes).slice(0, 6).join(", ")
		});
		markCloudRecordsDirty(table, ids);
		schedulePush();
	},
	bulkDelete: async (table, ids) => {
		const tableRef = getTable(table);
		if (!tableRef) throw new Error(`Unknown table: ${table}`);
		if (ids.length === 0) return;
		const removed = AUDIT_SKIP.has(table) ? [] : await tableRef.bulkGet(ids);
		await tableRef.bulkDelete(ids);
		for (const item of removed) if (item) logAudit({
			action: "delete",
			collection: table,
			recordId: item.id,
			label: `${labelOf(item)} (${table})`,
			before: item
		});
		for (const id of ids) markCloudRecordDirty(table, id, "delete");
		schedulePush();
	},
	updateSettings: async (changes) => {
		await db.settings.update("default", changes);
		const { useSettingsStore } = await import("./settingsStore-ixRXml95.mjs");
		if (changes.userName || changes.userRole || changes.theme) await useSettingsStore.getState().updateSettings(changes);
		const { useNavigationStore } = await import("./navigationStore-C1qIXqRU.mjs");
		if (changes.sidebarCollapsed !== void 0) useNavigationStore.getState().setSidebarCollapsed(changes.sidebarCollapsed);
		schedulePush();
	},
	exportAllData: async () => {
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
			db.settings.get("default")
		]);
		const data = stripSecretsForExport({
			websites,
			seoProfiles,
			seoSnapshots,
			seoQueryObservations,
			seoIssues,
			seoActions,
			seoChanges,
			seoVisibilityChecks,
			tasks,
			repos,
			buildProjects,
			links,
			notes,
			payments,
			ideas,
			credentials,
			customModules,
			habits,
			settings,
			_meta: {
				exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
				version: "9.1",
				counts: {
					websites: websites.length,
					seoProfiles: seoProfiles.length,
					seoSnapshots: seoSnapshots.length,
					seoQueryObservations: seoQueryObservations.length,
					seoIssues: seoIssues.length,
					seoActions: seoActions.length,
					seoChanges: seoChanges.length,
					seoVisibilityChecks: seoVisibilityChecks.length,
					tasks: tasks.length,
					repos: repos.length,
					buildProjects: buildProjects.length,
					links: links.length,
					notes: notes.length,
					payments: payments.length,
					ideas: ideas.length,
					credentials: credentials.length,
					customModules: customModules.length,
					habits: habits.length
				},
				totalItems: websites.length + seoProfiles.length + seoSnapshots.length + seoQueryObservations.length + seoIssues.length + seoActions.length + seoChanges.length + seoVisibilityChecks.length + tasks.length + repos.length + buildProjects.length + links.length + notes.length + payments.length + ideas.length + credentials.length + customModules.length + habits.length
			},
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			version: "9.1",
			secretPolicy: "secrets-excluded"
		});
		return JSON.stringify(data, null, 2);
	},
	importAllData: async (json) => {
		const data = JSON.parse(json);
		if (!data || typeof data !== "object") throw new Error("Invalid backup file");
		const tableMap = {
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
			habits: db.habits
		};
		const staged = [];
		const problems = [];
		for (const [key, table] of Object.entries(tableMap)) {
			const rows = data[key];
			if (rows === void 0 || rows === null) continue;
			if (!Array.isArray(rows)) {
				problems.push(`"${key}" is not a list`);
				continue;
			}
			const bad = rows.findIndex((r) => !r || typeof r !== "object" || typeof r.id !== "string" || !r.id);
			if (bad !== -1) {
				problems.push(`"${key}" row #${bad + 1} is missing a valid id`);
				continue;
			}
			staged.push([
				key,
				table,
				rows
			]);
		}
		if (problems.length) throw new Error(`Backup rejected — nothing was changed. Problems: ${problems.join("; ")}`);
		if (!staged.length) throw new Error("Backup rejected — no recognisable Mission Control data found.");
		await db.transaction("rw", Object.values(tableMap), async () => {
			for (const [, table, rows] of staged) {
				await table.clear();
				if (rows.length > 0) await table.bulkPut(rows);
			}
		});
		if (data.settings) await db.settings.put({
			...data.settings,
			id: "default"
		});
		for (const [key, , rows] of staged) markCloudRecordsDirty(key, rows.map((row) => row.id));
		const { useSettingsStore } = await import("./settingsStore-ixRXml95.mjs");
		await useSettingsStore.getState().loadSettings();
		schedulePush();
	},
	updateData: async (partial) => {
		const tableMap = {
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
			habits: db.habits
		};
		for (const [key, value] of Object.entries(partial)) if (key === "userName" || key === "userRole") {
			await db.settings.update("default", { [key]: value });
			const { useSettingsStore } = await import("./settingsStore-ixRXml95.mjs");
			await useSettingsStore.getState().updateSettings({ [key]: value });
		} else if (tableMap[key] && Array.isArray(value)) {
			const previousIds = (await tableMap[key].toArray()).map((row) => row.id);
			await tableMap[key].clear();
			if (value.length > 0) await tableMap[key].bulkPut(value);
			const nextIds = value.map((row) => row.id).filter(Boolean);
			markCloudRecordsDirty(key, nextIds);
			const nextIdSet = new Set(nextIds);
			markCloudRecordsDirty(key, previousIds.filter((id) => !nextIdSet.has(id)), "delete");
		}
		schedulePush();
	},
	_schedulePush: schedulePush
}));
var EMPTY = Object.freeze([]);
var useWebsites = () => useLiveQuery(() => db.websites.toArray(), []) ?? EMPTY;
var useSEOProfiles = () => useLiveQuery(() => db.seoProfiles.toArray(), []) ?? EMPTY;
var useSEOSnapshots = () => useLiveQuery(() => db.seoSnapshots.toArray(), []) ?? EMPTY;
var useSEOIssues = () => useLiveQuery(() => db.seoIssues.toArray(), []) ?? EMPTY;
var useSEOActions = () => useLiveQuery(() => db.seoActions.toArray(), []) ?? EMPTY;
var useSEOChanges = () => useLiveQuery(() => db.seoChanges.toArray(), []) ?? EMPTY;
var useSEOVisibilityChecks = () => useLiveQuery(() => db.seoVisibilityChecks.toArray(), []) ?? EMPTY;
/** Live tasks, excluding soft-deleted ones (see `useTrashedTasks`). */
var useTasks = () => useLiveQuery(() => db.tasks.filter((t) => !t.deletedAt).toArray(), []) ?? EMPTY;
/** Tasks in the Trash — restorable for 30 days. */
var useTrashedTasks = () => useLiveQuery(() => db.tasks.filter((t) => !!t.deletedAt).toArray(), []) ?? EMPTY;
var useRepos = () => useLiveQuery(() => db.repos.toArray(), []) ?? EMPTY;
var useBuildProjects = () => useLiveQuery(() => db.buildProjects.toArray(), []) ?? EMPTY;
var useLinks = () => useLiveQuery(() => db.links.toArray(), []) ?? EMPTY;
var useNotes = () => useLiveQuery(() => db.notes.toArray(), []) ?? EMPTY;
var usePayments = () => useLiveQuery(() => db.payments.toArray(), []) ?? EMPTY;
var useIdeas = () => useLiveQuery(() => db.ideas.toArray(), []) ?? EMPTY;
var useCredentials = () => useLiveQuery(() => db.credentials.toArray(), []) ?? EMPTY;
var useCustomModules = () => useLiveQuery(() => db.customModules.toArray(), []) ?? EMPTY;
var useHabits = () => useLiveQuery(() => db.habits.toArray(), []) ?? EMPTY;
var useFeedSources = () => useLiveQuery(() => db.feedSources.toArray(), []) ?? EMPTY;
var useStreamItems = () => useLiveQuery(() => db.streamItems.toArray(), []) ?? EMPTY;
var useWatchTerms = () => useLiveQuery(() => db.watchTerms.toArray(), []) ?? EMPTY;
var useAudienceAccounts = () => useLiveQuery(() => db.audienceAccounts.toArray(), []) ?? EMPTY;
var useAudienceReadings = () => useLiveQuery(() => db.audienceReadings.toArray(), []) ?? EMPTY;
var useReminders = () => useLiveQuery(() => db.reminders.toArray(), []) ?? EMPTY;
var useDecisions = () => useLiveQuery(() => db.decisions.toArray(), []) ?? EMPTY;
var useAuditLog = (limit = 120) => useLiveQuery(() => db.auditLog.orderBy("at").reverse().limit(limit).toArray(), [limit]) ?? EMPTY;
var useSyncHealth = () => useLiveQuery(() => db.syncHealth.toArray(), []) ?? EMPTY;
var useValidations = () => useLiveQuery(() => db.validations.toArray(), []) ?? EMPTY;
var useAddItem = () => useDataStore((s) => s.addItem);
var useUpdateItem = () => useDataStore((s) => s.updateItem);
var useDeleteItem = () => useDataStore((s) => s.deleteItem);
var useDuplicateItem = () => useDataStore((s) => s.duplicateItem);
var useBulkAddItems = () => useDataStore((s) => s.bulkAddItems);
var useBulkPatch = () => useDataStore((s) => s.bulkPatch);
var useBulkDeleteItems = () => useDataStore((s) => s.bulkDelete);
/** @deprecated whole-collection write — use addItem/updateItem/deleteItem/bulkPatch. */
var useUpdateData = () => useDataStore((s) => s.updateData);
var useExportAllData = () => useDataStore((s) => s.exportAllData);
var useImportAllData = () => useDataStore((s) => s.importAllData);
//#endregion
export { useValidations as $, useDuplicateItem as A, useRepos as B, useBulkDeleteItems as C, useDataStore as D, useCustomModules as E, useImportAllData as F, useSEOSnapshots as G, useSEOChanges as H, useLinks as I, useSyncHealth as J, useSEOVisibilityChecks as K, useNotes as L, useFeedSources as M, useHabits as N, useDecisions as O, useIdeas as P, useUpdateItem as Q, usePayments as R, useBulkAddItems as S, useCredentials as T, useSEOIssues as U, useSEOActions as V, useSEOProfiles as W, useTrashedTasks as X, useTasks as Y, useUpdateData as Z, useAddItem as _, logAudit as a, useAuditLog as b, onDirtyRecordsChange as c, redactSecretText as d, useWatchTerms as et, requestEmailCode as f, startCloudSync as g, signInToCloud as h, getRecordSyncState as i, useExportAllData as j, useDeleteItem as k, onSaveStatus as l, retryCloudPush as m, forceCloudSync as n, verifyEmailCode as nt, markCloudRecordDirty as o, restoreFromAudit as p, useStreamItems as q, getLastCloudSync as r, verifyMagicLink as rt, onCloudStatus as s, describeAudit as t, useWebsites as tt, queueCloudPush as u, useAudienceAccounts as v, useBulkPatch as w, useBuildProjects as x, useAudienceReadings as y, useReminders as z };
