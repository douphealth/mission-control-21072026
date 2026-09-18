import { t as db } from "./db-DLy-AV_e.mjs";
import { l as getSupabase, p as isSupabaseConnected, r as deduplicateAll } from "./supabase-D3pMiuZg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/versions-CwXqq8sp.js
var SNAPSHOTS_TABLE = "mc_snapshots";
var LOCAL_FALLBACK_KEY = "mc-snapshots-local-v1";
var DEVICE_KEY = "mc-device-label";
var AUTO_KEEP = 30;
var AUTO_DEBOUNCE_MS = 6e4;
var AUTO_INTERVAL_MS = 9e5;
function getDeviceLabel() {
	try {
		const existing = localStorage.getItem(DEVICE_KEY);
		if (existing) return existing;
		const ua = navigator.userAgent;
		let kind = "Device";
		if (/iPhone|iPad|iPod/i.test(ua)) kind = "iOS";
		else if (/Android/i.test(ua)) kind = "Android";
		else if (/Mac/i.test(ua)) kind = "Mac";
		else if (/Windows/i.test(ua)) kind = "Windows";
		else if (/Linux/i.test(ua)) kind = "Linux";
		const label = `${kind} · ${Math.random().toString(36).slice(2, 6)}`;
		localStorage.setItem(DEVICE_KEY, label);
		return label;
	} catch {
		return "Device";
	}
}
function setDeviceLabel(label) {
	try {
		localStorage.setItem(DEVICE_KEY, label.trim() || "Device");
	} catch {}
}
var TABLES = [
	"websites",
	"tasks",
	"repos",
	"buildProjects",
	"links",
	"notes",
	"payments",
	"ideas",
	"credentials",
	"customModules",
	"habits"
];
async function captureLocal() {
	const payload = {};
	const counts = {};
	for (const t of TABLES) {
		const arr = await db[t].toArray();
		payload[t] = arr;
		counts[t] = arr.length;
	}
	return {
		payload,
		settings: await db.settings.get("default"),
		counts
	};
}
function readLocal() {
	try {
		return JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || "[]");
	} catch {
		return [];
	}
}
function writeLocal(list) {
	try {
		localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(list));
	} catch {}
}
var cloudAvailable = null;
async function checkCloud() {
	if (!isSupabaseConnected()) return false;
	if (cloudAvailable !== null) return cloudAvailable;
	const client = getSupabase();
	if (!client) return false;
	const { error } = await client.from(SNAPSHOTS_TABLE).select("id").limit(1);
	cloudAvailable = !error || error.code !== "42P01" && error.code !== "PGRST205";
	return cloudAvailable;
}
async function listVersions() {
	if (await checkCloud()) {
		const { data, error } = await getSupabase().from(SNAPSHOTS_TABLE).select("id, data").order("id", { ascending: false }).limit(200);
		if (!error && data) return data.map((r) => r.data).filter(Boolean).map(stripPayload).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}
	return readLocal().map(stripPayload).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function stripPayload(s) {
	const { payload: _p, settings: _s, ...meta } = s;
	return meta;
}
async function saveVersion(opts = {}) {
	const { payload, settings, counts } = await captureLocal();
	const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
	const createdAt = (/* @__PURE__ */ new Date()).toISOString();
	const id = `snap_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
	const json = JSON.stringify(payload);
	const snap = {
		id,
		name: opts.name?.trim() || defaultName(opts.type ?? "manual", totalItems),
		type: opts.type ?? "manual",
		createdAt,
		device: getDeviceLabel(),
		counts,
		sizeBytes: json.length,
		payload,
		settings
	};
	if (await checkCloud()) {
		const { error } = await getSupabase().from(SNAPSHOTS_TABLE).insert([{
			id: snap.id,
			data: snap
		}]);
		if (error) throw new Error(error.message);
	} else {
		const list = readLocal();
		list.unshift(snap);
		writeLocal(list);
	}
	await pruneAuto();
	return stripPayload(snap);
}
function defaultName(type, total) {
	const stamp = (/* @__PURE__ */ new Date()).toLocaleString();
	if (type === "auto") return `Auto · ${stamp}`;
	if (type === "safety") return `Safety · before restore · ${stamp}`;
	return `Manual · ${stamp} · ${total} items`;
}
async function pruneAuto() {
	const autos = (await listVersions()).filter((s) => s.type === "auto");
	if (autos.length <= AUTO_KEEP) return;
	const toDelete = autos.slice(AUTO_KEEP);
	for (const v of toDelete) await deleteVersion(v.id);
}
async function fetchFullSnapshot(id) {
	if (await checkCloud()) {
		const { data, error } = await getSupabase().from(SNAPSHOTS_TABLE).select("data").eq("id", id).single();
		if (error) throw new Error(error.message);
		return data?.data ?? null;
	}
	return readLocal().find((s) => s.id === id) ?? null;
}
async function deleteVersion(id) {
	if (await checkCloud()) await getSupabase().from(SNAPSHOTS_TABLE).delete().eq("id", id);
	else writeLocal(readLocal().filter((s) => s.id !== id));
}
async function renameVersion(id, name) {
	const snap = await fetchFullSnapshot(id);
	if (!snap) return;
	snap.name = name.trim() || snap.name;
	if (await checkCloud()) await getSupabase().from(SNAPSHOTS_TABLE).update({ data: snap }).eq("id", id);
	else writeLocal(readLocal().map((s) => s.id === id ? snap : s));
}
async function restoreVersion(id, opts = {}) {
	const snap = await fetchFullSnapshot(id);
	if (!snap) throw new Error("Version not found");
	if (opts.safety !== false) try {
		await saveVersion({ type: "safety" });
	} catch (e) {
		console.warn("Safety snapshot failed", e);
	}
	let restored = 0;
	for (const t of TABLES) {
		const rows = snap.payload[t] || [];
		await db[t].clear();
		if (rows.length) await db[t].bulkPut(rows);
		restored += rows.length;
	}
	if (snap.settings) await db.settings.put({
		...snap.settings,
		id: "default"
	});
	await deduplicateAll();
	return { restored };
}
async function restoreLatestNonEmptyVersion() {
	const candidate = (await listVersions()).find((version) => Object.values(version.counts || {}).some((count) => Number(count) > 0));
	if (!candidate) return { restored: 0 };
	return {
		restored: (await restoreVersion(candidate.id, { safety: false })).restored,
		versionId: candidate.id
	};
}
function downloadVersionFile(meta) {
	return fetchFullSnapshot(meta.id).then((snap) => {
		if (!snap) return;
		const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `${snap.name.replace(/[^a-z0-9]+/gi, "-")}.mcversion.json`;
		a.click();
	});
}
async function importVersionFile(file) {
	const text = await file.text();
	const snap = JSON.parse(text);
	if (!snap.payload) throw new Error("Not a valid version file");
	snap.id = `snap_imported_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
	snap.createdAt = (/* @__PURE__ */ new Date()).toISOString();
	snap.type = "manual";
	snap.name = snap.name ? `Imported · ${snap.name}` : `Imported · ${snap.createdAt}`;
	if (await checkCloud()) await getSupabase().from(SNAPSHOTS_TABLE).insert([{
		id: snap.id,
		data: snap
	}]);
	else {
		const list = readLocal();
		list.unshift(snap);
		writeLocal(list);
	}
	return stripPayload(snap);
}
var dirty = false;
var debounceTimer = null;
var intervalTimer = null;
function markDirty() {
	dirty = true;
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		if (!dirty) return;
		dirty = false;
		saveVersion({ type: "auto" }).catch((e) => console.warn("Auto snapshot failed", e));
	}, AUTO_DEBOUNCE_MS);
}
var visHandler = null;
function startTick() {
	if (intervalTimer) return;
	intervalTimer = setInterval(() => {
		if (!dirty) return;
		dirty = false;
		saveVersion({ type: "auto" }).catch((e) => console.warn("Auto snapshot failed", e));
	}, AUTO_INTERVAL_MS);
}
function stopTick() {
	if (intervalTimer) {
		clearInterval(intervalTimer);
		intervalTimer = null;
	}
}
function startAutoSnapshots() {
	if (typeof document === "undefined" || !document.hidden) startTick();
	if (!visHandler && typeof document !== "undefined") {
		visHandler = () => {
			if (document.hidden) stopTick();
			else startTick();
		};
		document.addEventListener("visibilitychange", visHandler);
	}
}
function stopAutoSnapshots() {
	stopTick();
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	if (visHandler && typeof document !== "undefined") {
		document.removeEventListener("visibilitychange", visHandler);
		visHandler = null;
	}
}
var SNAPSHOTS_SCHEMA_SQL = `
-- Optional: snapshot/version history for Mission Control
CREATE TABLE IF NOT EXISTS mc_snapshots (data jsonb, id text PRIMARY KEY);
ALTER TABLE mc_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_mc" ON mc_snapshots;
CREATE POLICY "allow_all_mc" ON mc_snapshots FOR ALL USING (true) WITH CHECK (true);
`;
//#endregion
export { importVersionFile as a, renameVersion as c, saveVersion as d, setDeviceLabel as f, getDeviceLabel as i, restoreLatestNonEmptyVersion as l, stopAutoSnapshots as m, deleteVersion as n, listVersions as o, startAutoSnapshots as p, downloadVersionFile as r, markDirty as s, SNAPSHOTS_SCHEMA_SQL as t, restoreVersion as u };
