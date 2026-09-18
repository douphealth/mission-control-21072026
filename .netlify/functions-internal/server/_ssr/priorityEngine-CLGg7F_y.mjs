//#region node_modules/.nitro/vite/services/ssr/assets/priorityEngine-CLGg7F_y.js
/** How much the user's own priority label matters. Half the ceiling by design:
*  deadline reality must be able to outrank a label. */
var PRIORITY_POINTS = {
	critical: 60,
	high: 42,
	medium: 24,
	low: 10
};
/** Lateness pressure per overdue day, capped at 30 days (a 300-day-old task
*  is not 10× more urgent than a 30-day-old one — it is rot, handled by review). */
var OVERDUE_PER_DAY = 3.2;
/** Untouched decay per day. Deliberately gentle: staleness resurfaces work,
*  it never outweighs a real deadline. */
var STALE_PER_DAY = .6;
/** Kind biases — certain kinds block more value than others. */
var KIND_BONUS = {
	decision: 12,
	payment: 8,
	task: 0,
	reminder: 0
};
Math.max(...Object.values(PRIORITY_POINTS)) + OVERDUE_PER_DAY * 30 + 22 + 14 + STALE_PER_DAY * 30 + KIND_BONUS.decision;
function daysBetween(fromIso, toIso) {
	return Math.round(((/* @__PURE__ */ new Date(`${toIso}T00:00:00`)).getTime() - (/* @__PURE__ */ new Date(`${fromIso}T00:00:00`)).getTime()) / 864e5);
}
/** The one scoring function. Deterministic, pure, unit-testable. */
function scoreItem(input) {
	const dims = [];
	const base = PRIORITY_POINTS[input.priority];
	if (base > 0) dims.push({
		name: "priority",
		points: base,
		reason: `${input.priority} priority`
	});
	if (input.overdueDays > 0) {
		const capped = Math.min(input.overdueDays, 30);
		dims.push({
			name: "lateness",
			points: capped * OVERDUE_PER_DAY,
			reason: input.overdueDays === 1 ? "overdue since yesterday" : `${input.overdueDays} days overdue`
		});
	}
	if (input.due === input.today) dims.push({
		name: "dueToday",
		points: 22,
		reason: "due today"
	});
	else if (input.due && input.due > input.today) {
		const daysOut = daysBetween(input.today, input.due);
		if (daysOut <= 14) {
			const pts = Math.round((14 - daysOut) / 14 * 14);
			if (pts > 0) dims.push({
				name: "approaching",
				points: pts,
				reason: daysOut === 1 ? "due tomorrow" : `due in ${daysOut} days`
			});
		}
	}
	if (input.scheduled && input.scheduled <= input.today) {
		const missedDays = daysBetween(input.scheduled, input.today);
		dims.push({
			name: "planned",
			points: 0,
			reason: missedDays > 0 ? missedDays === 1 ? "planned for yesterday" : `planned ${missedDays} days ago` : "planned for today"
		});
	}
	if (input.staleDays > 0) {
		const capped = Math.min(input.staleDays, 30);
		dims.push({
			name: "decay",
			points: capped * STALE_PER_DAY,
			reason: `untouched for ${input.staleDays} days`
		});
	}
	const kindPts = KIND_BONUS[input.kind] ?? 0;
	if (kindPts > 0) dims.push({
		name: "kind",
		points: kindPts,
		reason: input.kind === "decision" ? "blocks other work until decided" : "money has a hard deadline"
	});
	if (input.pinned) dims.push({
		name: "pinned",
		points: 500,
		reason: "you committed to this today"
	});
	const score = dims.reduce((s, d) => s + d.points, 0);
	return {
		score: Math.round(score * 10) / 10,
		dimensions: dims
	};
}
/** Human "why now" lines for the UI — derived from the same dimensions so
*  the explanation can never drift from the score. Order is semantic, not
*  by points: deadlines lead, then plans/commitments, then labels. */
var REASON_RANK = {
	lateness: 0,
	dueToday: 1,
	approaching: 2,
	planned: 3,
	pinned: 4,
	priority: 5,
	kind: 6,
	decay: 7
};
function reasonsOf(result) {
	const out = [...result.dimensions].sort((a, b) => (REASON_RANK[a.name] ?? 9) - (REASON_RANK[b.name] ?? 9)).map((d) => d.reason);
	return out.length > 0 ? out.slice(0, 3) : ["top of your queue right now"];
}
//#endregion
export { scoreItem as n, reasonsOf as t };
