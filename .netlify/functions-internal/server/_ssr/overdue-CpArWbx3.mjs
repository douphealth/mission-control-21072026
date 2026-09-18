import { n as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/overdue-CpArWbx3.js
var overdue_CpArWbx3_exports = /* @__PURE__ */ __exportAll({
	a: () => daysOverdue,
	c: () => overdue_exports,
	i: () => buildDigestText,
	l: () => todayISO,
	n: () => addDaysLocal,
	o: () => fmtLocal,
	r: () => buildBriefing,
	s: () => mailDigest,
	t: () => PRIORITY_RANK
});
var overdue_exports = /* @__PURE__ */ __exportAll$1({
	PRIORITY_RANK: () => PRIORITY_RANK,
	addDaysLocal: () => addDaysLocal,
	buildBriefing: () => buildBriefing,
	buildDigestSubject: () => buildDigestSubject,
	buildDigestText: () => buildDigestText,
	daysOverdue: () => daysOverdue,
	fmtLocal: () => fmtLocal,
	mailDigest: () => mailDigest,
	todayISO: () => todayISO
});
var PRIORITY_RANK = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3
};
/** Format a Date as YYYY-MM-DD in *local* time (never via toISOString). */
function fmtLocal(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Add days to a YYYY-MM-DD string, staying in local time. */
function addDaysLocal(iso, days) {
	const d = /* @__PURE__ */ new Date(`${iso}T00:00:00`);
	d.setDate(d.getDate() + days);
	return fmtLocal(d);
}
function todayISO() {
	return fmtLocal(/* @__PURE__ */ new Date());
}
function daysOverdue(task, today = todayISO()) {
	if (!task.dueDate) return 0;
	const due = (/* @__PURE__ */ new Date(`${task.dueDate}T00:00:00`)).getTime();
	const now = (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime();
	return Math.max(0, Math.round((now - due) / 864e5));
}
function sortTasks(tasks) {
	return [...tasks].sort((a, b) => {
		const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
		if (p !== 0) return p;
		return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
	});
}
function buildBriefing(tasks, today = todayISO()) {
	const tomorrow = addDaysLocal(today, 1);
	const open = tasks.filter((t) => t.status !== "done");
	const overdue = sortTasks(open.filter((t) => t.dueDate && t.dueDate < today));
	const dueToday = sortTasks(open.filter((t) => t.dueDate === today));
	return {
		overdue,
		dueToday,
		dueTomorrow: sortTasks(open.filter((t) => t.dueDate === tomorrow)),
		completedToday: tasks.filter((t) => t.status === "done" && (t.completedAt || "").slice(0, 10) === today).length,
		total: overdue.length + dueToday.length
	};
}
function line(task, today) {
	const d = daysOverdue(task, today);
	const age = d > 0 ? ` — ${d} day${d === 1 ? "" : "s"} overdue` : "";
	const time = task.startTime ? ` at ${task.startTime}` : "";
	return `• [${task.priority.toUpperCase()}] ${task.title} (due ${task.dueDate}${time})${age}`;
}
/** Plain-text digest — used for the mail body and clipboard copy. */
function buildDigestText(b, today = todayISO()) {
	const parts = [
		`MISSION CONTROL — DAILY TASK DIGEST`,
		today,
		"",
		`Overdue: ${b.overdue.length}   Due today: ${b.dueToday.length}   Due tomorrow: ${b.dueTomorrow.length}   Completed today: ${b.completedToday}`,
		""
	];
	if (b.overdue.length) {
		parts.push(`OVERDUE (${b.overdue.length})`, "─────────────────────────");
		parts.push(...b.overdue.map((t) => line(t, today)), "");
	}
	if (b.dueToday.length) {
		parts.push(`DUE TODAY (${b.dueToday.length})`, "─────────────────────────");
		parts.push(...b.dueToday.map((t) => line(t, today)), "");
	}
	if (b.dueTomorrow.length) {
		parts.push(`DUE TOMORROW (${b.dueTomorrow.length})`, "─────────────────────────");
		parts.push(...b.dueTomorrow.map((t) => line(t, today)), "");
	}
	if (!b.overdue.length && !b.dueToday.length) parts.push("Nothing overdue and nothing due today. You are clear. ✅", "");
	parts.push("— Sent from Mission Control");
	return parts.join("\n");
}
function buildDigestSubject(b, today = todayISO()) {
	if (b.overdue.length) return `⚠️ ${b.overdue.length} overdue task${b.overdue.length === 1 ? "" : "s"} — Mission Control ${today}`;
	if (b.dueToday.length) return `${b.dueToday.length} task${b.dueToday.length === 1 ? "" : "s"} due today — Mission Control ${today}`;
	return `All clear — Mission Control ${today}`;
}
/** Opens the user's mail client with a fully formatted digest. */
function mailDigest(b, to, today = todayISO()) {
	const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(buildDigestSubject(b, today))}&body=${encodeURIComponent(buildDigestText(b, today))}`;
	window.location.href = href;
}
//#endregion
export { daysOverdue as a, overdue_CpArWbx3_exports as c, buildDigestText as i, todayISO as l, addDaysLocal as n, fmtLocal as o, buildBriefing as r, mailDigest as s, PRIORITY_RANK as t };
