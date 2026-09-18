import { t as Dexie } from "../_libs/dexie.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/db-DLy-AV_e.js
var MissionControlDB = class extends Dexie {
	websites;
	seoProfiles;
	seoSnapshots;
	seoQueryObservations;
	seoIssues;
	seoActions;
	seoChanges;
	seoVisibilityChecks;
	tasks;
	repos;
	buildProjects;
	links;
	notes;
	payments;
	ideas;
	credentials;
	settings;
	customModules;
	habits;
	feedSources;
	streamItems;
	watchTerms;
	audienceAccounts;
	audienceReadings;
	reminders;
	decisions;
	auditLog;
	syncHealth;
	validations;
	constructor() {
		super("MissionControlDB");
		this.version(1).stores({
			websites: "id, name, status, category, dateAdded",
			tasks: "id, title, priority, status, dueDate, category, createdAt",
			repos: "id, name, status, language, lastUpdated",
			buildProjects: "id, name, platform, status, startedDate",
			links: "id, title, category, status, pinned, dateAdded",
			notes: "id, title, pinned, createdAt, updatedAt",
			payments: "id, type, status, category, dueDate, createdAt",
			ideas: "id, priority, status, votes, createdAt",
			credentials: "id, service, category, createdAt",
			settings: "id",
			customModules: "id, name, order, visible",
			habits: "id, name, frequency, createdAt"
		});
		this.version(2).stores({ tasks: "id, title, priority, status, dueDate, category, createdAt, gcalEventId" });
		this.version(3).stores({
			seoProfiles: "id, websiteId, priority, syncStatus, updatedAt",
			seoSnapshots: "id, websiteId, date, source, [websiteId+date]",
			seoQueryObservations: "id, websiteId, date, source, query, url, [websiteId+date]",
			seoIssues: "id, websiteId, status, severity, category, observedAt",
			seoActions: "id, websiteId, status, priority, dueDate, updatedAt",
			seoChanges: "id, websiteId, occurredAt, status",
			seoVisibilityChecks: "id, websiteId, checkedAt, engine, mentioned, cited"
		});
		this.version(4).stores({ tasks: "id, title, priority, status, dueDate, category, createdAt, gcalEventId, touchedAt" });
		this.version(5).stores({
			feedSources: "id, name, url, enabled, createdAt",
			streamItems: "id, kind, status, publishedAt, discoveredAt, score, url, sourceId, [kind+status]",
			watchTerms: "id, term, type, enabled, createdAt",
			audienceAccounts: "id, platform, handle, createdAt",
			audienceReadings: "id, accountId, capturedAt, [accountId+capturedAt]",
			reminders: "id, status, remindAt, createdAt"
		});
		this.version(6).stores({
			decisions: "id, status, source, severity, websiteId, groupKey, createdAt, updatedAt",
			auditLog: "id, at, action, collection, recordId",
			syncHealth: "id, status, lastSuccessAt"
		});
		this.version(7).stores({ validations: "id, status, entityId, actionId, reviewAt, startedAt, updatedAt" });
	}
};
var db = new MissionControlDB();
async function migrateFromLocalStorage() {
	try {
		const raw = localStorage.getItem("mission-control-data");
		if (!raw) return false;
		const data = JSON.parse(raw);
		if (await db.settings.get("default")) return false;
		if (data.websites?.length) await db.websites.bulkPut(data.websites);
		if (data.tasks?.length) await db.tasks.bulkPut(data.tasks);
		if (data.repos?.length) await db.repos.bulkPut(data.repos);
		if (data.buildProjects?.length) await db.buildProjects.bulkPut(data.buildProjects);
		if (data.links?.length) await db.links.bulkPut(data.links);
		if (data.notes?.length) await db.notes.bulkPut(data.notes);
		if (data.payments?.length) await db.payments.bulkPut(data.payments);
		if (data.ideas?.length) await db.ideas.bulkPut(data.ideas);
		if (data.credentials?.length) await db.credentials.bulkPut(data.credentials);
		await db.settings.put({
			id: "default",
			userName: data.userName || "Alex",
			userRole: data.userRole || "Digital Creator & Developer",
			theme: localStorage.getItem("mc-theme") || "dark",
			sidebarCollapsed: false,
			dashboardLayout: []
		});
		console.log("✅ Migrated from localStorage to IndexedDB");
		return true;
	} catch (e) {
		console.error("Migration failed:", e);
		return false;
	}
}
var idCounter = 0;
function genId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
	const bytes = /* @__PURE__ */ new Uint8Array(12);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
	else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
	const rand = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	idCounter = (idCounter + 1) % 65535;
	return `${Date.now().toString(36)}-${rand}-${idCounter.toString(36)}`;
}
//#endregion
export { genId as n, migrateFromLocalStorage as r, db as t };
