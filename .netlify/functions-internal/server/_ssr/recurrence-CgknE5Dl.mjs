//#region node_modules/.nitro/vite/services/ssr/assets/recurrence-CgknE5Dl.js
/**
* Generate all occurrences of a recurring task within a date range.
* Returns an array of dates (YYYY-MM-DD) when the task should appear.
*/
function expandRecurringTask(task, rangeStart, rangeEnd, maxOccurrences = 365) {
	if (!task.recurring || !task.recurringInterval || !task.dueDate) return [];
	const instances = [];
	const rStart = /* @__PURE__ */ new Date(rangeStart + "T00:00:00");
	const rEnd = /* @__PURE__ */ new Date(rangeEnd + "T00:00:00");
	const baseDate = /* @__PURE__ */ new Date((task.startDate || task.dueDate) + "T00:00:00");
	const endByDate = task.recurringEndType === "date" && task.recurringEndDate ? /* @__PURE__ */ new Date(task.recurringEndDate + "T00:00:00") : null;
	const endByCount = task.recurringEndType === "count" && task.recurringEndCount ? task.recurringEndCount : null;
	let occurrenceCount = 0;
	let steps = 0;
	const current = new Date(baseDate);
	const baseDayOfMonth = baseDate.getDate();
	const hardLimit = Math.min(maxOccurrences, 1e3);
	const stepLimit = hardLimit * 8;
	while (occurrenceCount < hardLimit && steps < stepLimit) {
		steps++;
		const d = new Date(current);
		if (endByDate && d > endByDate) break;
		if (endByCount && occurrenceCount >= endByCount) break;
		if (d > rEnd) break;
		const isWeekday = d.getDay() >= 1 && d.getDay() <= 5;
		if (task.recurringInterval !== "weekdays" || isWeekday) {
			if (d >= rStart) instances.push({
				date: fmtDate(d),
				occurrenceIndex: occurrenceCount
			});
			occurrenceCount++;
		}
		switch (task.recurringInterval) {
			case "daily":
			case "weekdays":
				current.setDate(current.getDate() + 1);
				break;
			case "weekly":
				current.setDate(current.getDate() + 7);
				break;
			case "biweekly":
				current.setDate(current.getDate() + 14);
				break;
			case "monthly":
				advanceMonths(current, 1, baseDayOfMonth);
				break;
			case "yearly":
				advanceYears(current, 1, baseDayOfMonth, baseDate.getMonth());
				break;
			case "custom":
				current.setDate(current.getDate() + (task.recurringCustomDays || 1));
				break;
			default: current.setDate(current.getDate() + 1);
		}
	}
	return instances;
}
/** Add months without day drift: Jan 31 → Feb 28 → Mar 31 (clamped, not shifted). */
function advanceMonths(d, months, anchorDay) {
	const targetMonth = d.getMonth() + months;
	const year = d.getFullYear() + Math.floor(targetMonth / 12);
	const month = (targetMonth % 12 + 12) % 12;
	const lastDay = new Date(year, month + 1, 0).getDate();
	d.setFullYear(year, month, Math.min(anchorDay, lastDay));
}
/** Add years, clamping Feb 29 → Feb 28 on non-leap years (never Mar 1). */
function advanceYears(d, years, anchorDay, anchorMonth) {
	const year = d.getFullYear() + years;
	const lastDay = new Date(year, anchorMonth + 1, 0).getDate();
	d.setFullYear(year, anchorMonth, Math.min(anchorDay, lastDay));
}
function fmtDate(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/**
* Convert a recurring interval to an RFC 5545 RRULE string for Google Calendar.
*/
function toRRule(task) {
	if (!task.recurring || !task.recurringInterval) return null;
	let freq;
	let interval = 1;
	switch (task.recurringInterval) {
		case "daily":
			freq = "DAILY";
			break;
		case "weekdays":
			freq = "WEEKLY";
			return `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR${rruleEnd(task)}`;
		case "weekly":
			freq = "WEEKLY";
			break;
		case "biweekly":
			freq = "WEEKLY";
			interval = 2;
			break;
		case "monthly":
			freq = "MONTHLY";
			break;
		case "yearly":
			freq = "YEARLY";
			break;
		case "custom":
			freq = "DAILY";
			interval = task.recurringCustomDays || 1;
			break;
		default: return null;
	}
	const parts = [`RRULE:FREQ=${freq}`];
	if (interval > 1) parts.push(`INTERVAL=${interval}`);
	parts.push(rruleEnd(task).replace(/^;/, ""));
	return parts.filter(Boolean).join(";");
}
function rruleEnd(task) {
	if (task.recurringEndType === "date" && task.recurringEndDate) return `;UNTIL=${task.recurringEndDate.replace(/-/g, "")}T235959Z`;
	if (task.recurringEndType === "count" && task.recurringEndCount) return `;COUNT=${task.recurringEndCount}`;
	return "";
}
//#endregion
export { expandRecurringTask, toRRule };
