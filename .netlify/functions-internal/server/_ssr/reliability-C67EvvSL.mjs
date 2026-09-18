import { n as __exportAll } from "../_runtime.mjs";
import { t as db } from "./db-DLy-AV_e.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reliability-C67EvvSL.js
var reliability_C67EvvSL_exports = /* @__PURE__ */ __exportAll({
	a: () => reliability_exports,
	i: () => effectiveStatus,
	n: () => SYNC_SOURCES,
	r: () => ageLabel,
	t: () => STATUS_STYLE
});
var reliability_exports = /* @__PURE__ */ __exportAll$1({
	STATUS_STYLE: () => STATUS_STYLE,
	SYNC_SOURCES: () => SYNC_SOURCES,
	ageLabel: () => ageLabel,
	effectiveStatus: () => effectiveStatus,
	reportSync: () => reportSync
});
var SYNC_SOURCES = [
	{
		id: "cloud",
		label: "Cloud backup",
		hint: "Cross-device sync of every record"
	},
	{
		id: "google-calendar",
		label: "Google Calendar",
		hint: "Tasks pushed as calendar events"
	},
	{
		id: "wordpress",
		label: "WordPress sites",
		hint: "Core, plugin and update status"
	},
	{
		id: "gsc",
		label: "Search Console",
		hint: "Clicks, impressions, indexing"
	},
	{
		id: "ga4",
		label: "Analytics (GA4)",
		hint: "Sessions and conversions"
	},
	{
		id: "bing",
		label: "Bing / Microsoft",
		hint: "Bing Webmaster data"
	},
	{
		id: "feeds",
		label: "Industry feeds",
		hint: "News and mention collection"
	},
	{
		id: "audience",
		label: "Audience metrics",
		hint: "Public follower readings"
	}
];
var STALE_HOURS = 26;
async function reportSync(id, patch) {
	try {
		const existing = await db.syncHealth.get(id);
		const label = patch.label ?? existing?.label ?? SYNC_SOURCES.find((s) => s.id === id)?.label ?? id;
		await db.syncHealth.put({
			id,
			label,
			status: patch.status ?? existing?.status ?? "not-configured",
			lastSuccessAt: patch.status === "ok" ? (/* @__PURE__ */ new Date()).toISOString() : patch.lastSuccessAt ?? existing?.lastSuccessAt,
			lastAttemptAt: (/* @__PURE__ */ new Date()).toISOString(),
			pending: patch.pending ?? existing?.pending,
			error: patch.status === "ok" ? void 0 : patch.error ?? existing?.error,
			detail: patch.detail ?? existing?.detail
		});
	} catch {}
}
function ageLabel(iso) {
	if (!iso) return "never";
	const ms = Date.now() - new Date(iso).getTime();
	if (Number.isNaN(ms)) return "unknown";
	const min = Math.floor(ms / 6e4);
	if (min < 1) return "just now";
	if (min < 60) return `${min}m ago`;
	const hrs = Math.floor(min / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}
function effectiveStatus(row) {
	if (!row) return "not-configured";
	if (row.status === "ok" && row.lastSuccessAt) {
		if ((Date.now() - new Date(row.lastSuccessAt).getTime()) / 36e5 > STALE_HOURS) return "stale";
	}
	return row.status;
}
var STATUS_STYLE = {
	ok: {
		label: "Synced",
		cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
		dot: "bg-emerald-500"
	},
	syncing: {
		label: "Syncing",
		cls: "text-sky-600 bg-sky-500/10 border-sky-500/20",
		dot: "bg-sky-500 animate-pulse"
	},
	stale: {
		label: "Stale",
		cls: "text-amber-600 bg-amber-500/10 border-amber-500/20",
		dot: "bg-amber-500"
	},
	error: {
		label: "Failing",
		cls: "text-red-600 bg-red-500/10 border-red-500/20",
		dot: "bg-red-500"
	},
	"not-configured": {
		label: "Not connected",
		cls: "text-muted-foreground bg-secondary/60 border-border/40",
		dot: "bg-muted-foreground/50"
	}
};
//#endregion
export { reliability_C67EvvSL_exports as a, effectiveStatus as i, SYNC_SOURCES as n, ageLabel as r, STATUS_STYLE as t };
