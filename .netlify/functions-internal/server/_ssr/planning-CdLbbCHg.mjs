import { n as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/planning-CdLbbCHg.js
var planning_CdLbbCHg_exports = /* @__PURE__ */ __exportAll({
	a: () => fmtMinutes,
	c: () => minToHHMM,
	d: () => suggestOutcomes,
	i: () => fixedEventsFor,
	l: () => parseDuration,
	n: () => computeCapacity,
	o: () => hhmmToMin,
	r: () => estimateOf,
	s: () => isPlannedToday,
	t: () => blockMinutes,
	u: () => planning_exports
});
var planning_exports = /* @__PURE__ */ __exportAll$1({
	DEFAULT_ESTIMATE_MIN: () => 30,
	blockMinutes: () => blockMinutes,
	blocksOf: () => blocksOf,
	computeCapacity: () => computeCapacity,
	estimateOf: () => estimateOf,
	fixedEventsFor: () => fixedEventsFor,
	fmtMinutes: () => fmtMinutes,
	hhmmToMin: () => hhmmToMin,
	isPlannedToday: () => isPlannedToday,
	minToHHMM: () => minToHHMM,
	parseDuration: () => parseDuration,
	remainingMinutes: () => remainingMinutes,
	suggestOutcomes: () => suggestOutcomes
});
function hhmmToMin(hhmm) {
	const [h, m] = hhmm.split(":").map(Number);
	return (h || 0) * 60 + (m || 0);
}
function minToHHMM(min) {
	const m = Math.max(0, Math.min(1440, Math.round(min)));
	return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function fmtMinutes(min) {
	const m = Math.round(min);
	if (m < 60) return `${m} min`;
	const h = Math.floor(m / 60);
	const r = m % 60;
	return r ? `${h}h ${r}m` : `${h}h`;
}
/** Effective blocks: explicit blocks, else a legacy single block derived from
*  scheduledAt/startTime/endTime. Reads never write. */
function blocksOf(t) {
	if (t.blocks && t.blocks.length) return t.blocks;
	const day = t.scheduledAt || (t.startTime ? t.dueDate : void 0);
	if (!day || !t.startTime) return [];
	const start = t.startTime;
	const end = t.endTime || minToHHMM(hhmmToMin(start) + (t.estimateMin ?? 30));
	return [{
		id: `legacy:${t.id}`,
		date: day,
		start,
		end
	}];
}
function blockMinutes(b) {
	return Math.max(0, hhmmToMin(b.end) - hhmmToMin(b.start));
}
function estimateOf(t) {
	if (t.estimateMin && t.estimateMin > 0) return t.estimateMin;
	const blocks = blocksOf(t);
	if (blocks.length) return blocks.reduce((s, b) => s + blockMinutes(b), 0);
	return 30;
}
/** Minutes of work still planned for a task (open blocks or the estimate). */
function remainingMinutes(t, today) {
	const todays = blocksOf(t).filter((b) => b.date === today && !b.done);
	if (todays.length) return todays.reduce((s, b) => s + blockMinutes(b), 0);
	return estimateOf(t);
}
function isPlannedToday(t, today) {
	return t.committedOn === today || t.scheduledAt === today || blocksOf(t).some((b) => b.date === today && !b.done);
}
/** Google Calendar events for one local day, as fixed commitments. */
function fixedEventsFor(events, today) {
	const out = [];
	for (const ev of events) {
		if (ev.status === "cancelled") continue;
		if (ev.start.date) {
			if (ev.start.date <= today && (ev.end.date ?? ev.start.date) > today) out.push({
				id: ev.id,
				title: ev.summary || "(busy)",
				start: "00:00",
				end: "23:59",
				allDay: true,
				htmlLink: ev.htmlLink
			});
			continue;
		}
		if (!ev.start.dateTime) continue;
		const s = new Date(ev.start.dateTime);
		const e = new Date(ev.end.dateTime ?? ev.start.dateTime);
		if (`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}` !== today) continue;
		out.push({
			id: ev.id,
			title: ev.summary || "(busy)",
			start: minToHHMM(s.getHours() * 60 + s.getMinutes()),
			end: minToHHMM(e.getHours() * 60 + e.getMinutes()),
			allDay: false,
			htmlLink: ev.htmlLink
		});
	}
	return out.sort((a, b) => a.start.localeCompare(b.start));
}
function computeCapacity(input) {
	const start = Math.max(hhmmToMin(input.workdayStart), hhmmToMin(input.nowHHMM));
	const end = hhmmToMin(input.workdayEnd);
	const window = Math.max(0, end - start);
	let fixedMin = 0;
	for (const f of input.fixed) {
		if (f.allDay) continue;
		const s = Math.max(start, hhmmToMin(f.start));
		const e = Math.min(end, hhmmToMin(f.end));
		if (e > s) fixedMin += e - s;
	}
	const items = input.tasks.filter((t) => t.status !== "done" && !t.archived && !t.deletedAt && isPlannedToday(t, input.today)).map((t) => ({
		task: t,
		minutes: remainingMinutes(t, input.today),
		hasEstimate: !!t.estimateMin || blocksOf(t).length > 0
	}));
	const plannedMin = items.reduce((s, i) => s + i.minutes, 0);
	const availableMin = Math.max(0, window - fixedMin);
	return {
		availableMin,
		plannedMin,
		overMin: Math.max(0, plannedMin - availableMin),
		fixedMin,
		ratio: availableMin > 0 ? Math.min(3, plannedMin / availableMin) : plannedMin > 0 ? 3 : 0,
		items
	};
}
/** Deterministic, explainable plan suggestion: fill available time by score. */
function suggestOutcomes(candidates, availableMin, max = 3) {
	const out = [];
	let used = 0;
	for (const c of [...candidates].sort((a, b) => b.score - a.score)) {
		if (out.length >= max) break;
		const m = estimateOf(c.task);
		if (out.length > 0 && used + m > availableMin) continue;
		used += m;
		out.push({
			task: c.task,
			minutes: m,
			reason: c.reasons[0] ?? "highest in your queue"
		});
	}
	return out;
}
/** Parses "45 min", "45m", "1h", "1.5h", "1h30", "2 hours" → minutes. */
function parseDuration(text) {
	const m = text.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h)(?:\s*(\d{1,2})\s*(?:min(?:ute)?s?|m))?(?=\s|$|,)|(?:^|\s)(\d{1,3})\s*(min(?:ute)?s?|m)(?=\s|$|,)/i);
	if (!m) return null;
	if (m[1]) {
		const h = parseFloat(m[1].replace(",", "."));
		const extra = m[3] ? parseInt(m[3], 10) : 0;
		return {
			minutes: Math.round(h * 60 + extra),
			match: m[0].trim()
		};
	}
	return {
		minutes: parseInt(m[4], 10),
		match: m[0].trim()
	};
}
//#endregion
export { fmtMinutes as a, minToHHMM as c, suggestOutcomes as d, fixedEventsFor as i, parseDuration as l, computeCapacity as n, hhmmToMin as o, estimateOf as r, isPlannedToday as s, blockMinutes as t, planning_CdLbbCHg_exports as u };
