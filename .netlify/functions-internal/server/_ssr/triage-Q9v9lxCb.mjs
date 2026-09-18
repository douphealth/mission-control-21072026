import { a as daysOverdue, l as todayISO, n as addDaysLocal, t as PRIORITY_RANK } from "./overdue-CpArWbx3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/triage-Q9v9lxCb.js
function isArchived(t) {
	return t.archived === true;
}
function isOpen(t) {
	return t.status !== "done" && !isArchived(t) && !t.deletedAt;
}
function lastTouched(t) {
	return t.touchedAt || t.completedAt || t.createdAt || t.dueDate || todayISO();
}
function daysSinceTouch(t, today = todayISO()) {
	const then = (/* @__PURE__ */ new Date(`${(lastTouched(t) || today).slice(0, 10)}T00:00:00`)).getTime();
	const now = (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime();
	return Math.max(0, Math.round((now - then) / 864e5));
}
/** Untouched for STALE_DAYS+ → needs a decision, not another day of guilt. */
function isStale(t, today = todayISO()) {
	return isOpen(t) && daysSinceTouch(t, today) >= 14;
}
/** Overdue for ROT_DAYS+ → almost certainly never getting done as written. */
function isRotten(t, today = todayISO()) {
	return isOpen(t) && daysOverdue(t, today) >= 30;
}
var QUADRANTS = [
	{
		id: "do",
		label: "Do now",
		hint: "Urgent + Important",
		accent: "text-red-500 bg-red-500/10 border-red-500/20"
	},
	{
		id: "schedule",
		label: "Schedule",
		hint: "Important, not urgent",
		accent: "text-blue-500 bg-blue-500/10 border-blue-500/20"
	},
	{
		id: "delegate",
		label: "Delegate / batch",
		hint: "Urgent, not important",
		accent: "text-amber-500 bg-amber-500/10 border-amber-500/20"
	},
	{
		id: "later",
		label: "Drop or defer",
		hint: "Neither",
		accent: "text-muted-foreground bg-secondary/60 border-border/30"
	}
];
function isUrgent(t, today = todayISO()) {
	if (!t.dueDate) return false;
	return ((/* @__PURE__ */ new Date(`${t.dueDate}T00:00:00`)).getTime() - (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime()) / 864e5 <= 2;
}
function isImportant(t) {
	if (t.important === true) return true;
	return t.priority === "critical" || t.priority === "high";
}
function quadrantOf(t, today = todayISO()) {
	const u = isUrgent(t, today);
	const i = isImportant(t);
	if (u && i) return "do";
	if (!u && i) return "schedule";
	if (u && !i) return "delegate";
	return "later";
}
function sortByPriority(tasks) {
	return [...tasks].sort((a, b) => {
		const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
		if (p !== 0) return p;
		return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
	});
}
function addDaysISO(days, from = todayISO()) {
	return addDaysLocal(from, days);
}
function buildReviewQueues(tasks, today = todayISO()) {
	const open = tasks.filter(isOpen);
	const rotten = sortByPriority(open.filter((t) => isRotten(t, today)));
	const rottenIds = new Set(rotten.map((t) => t.id));
	const stale = sortByPriority(open.filter((t) => isStale(t, today) && !rottenIds.has(t.id)));
	const overdue = sortByPriority(open.filter((t) => t.dueDate && t.dueDate < today));
	const matrix = {
		do: [],
		schedule: [],
		delegate: [],
		later: []
	};
	open.forEach((t) => matrix[quadrantOf(t, today)].push(t));
	Object.keys(matrix).forEach((k) => {
		matrix[k] = sortByPriority(matrix[k]);
	});
	return {
		rotten,
		stale,
		overdue,
		matrix,
		openCount: open.length,
		archivedCount: tasks.filter(isArchived).length
	};
}
//#endregion
export { isArchived as a, sortByPriority as c, daysSinceTouch as i, addDaysISO as n, isOpen as o, buildReviewQueues as r, isRotten as s, QUADRANTS as t };
