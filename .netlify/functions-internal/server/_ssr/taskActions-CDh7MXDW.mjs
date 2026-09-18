import { t as db } from "./db-DLy-AV_e.mjs";
import { D as useDataStore } from "./useTableData-BUruD6H7.mjs";
import { l as todayISO, n as addDaysLocal } from "./overdue-CpArWbx3.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as deleteGCalEvent } from "./googleCalendar-B8JefTzG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/taskActions-CDh7MXDW.js
async function dropCalendarMirror(task) {
	if (!task?.gcalEventId) return;
	try {
		await deleteGCalEvent(task.gcalEventId);
	} catch (e) {
		console.warn("Calendar mirror not removed", e);
	}
}
/** Move to Trash with an Undo toast. The calendar mirror is removed immediately. */
async function softDeleteTasks(ids, label) {
	if (!ids.length) return;
	const { updateItem } = useDataStore.getState();
	const deletedAt = (/* @__PURE__ */ new Date()).toISOString();
	const tasks = await db.tasks.where("id").anyOf(ids).toArray();
	for (const t of tasks) await dropCalendarMirror(t);
	for (const id of ids) await updateItem("tasks", id, { deletedAt });
	toast.success(label ?? (ids.length === 1 ? "Moved to Trash" : `${ids.length} moved to Trash`), {
		description: `Recoverable for 30 days`,
		action: {
			label: "Undo",
			onClick: () => void restoreTasks(ids)
		}
	});
}
async function restoreTasks(ids) {
	const { updateItem } = useDataStore.getState();
	for (const id of ids) await updateItem("tasks", id, {
		deletedAt: void 0,
		touchedAt: todayISO()
	});
	toast.success(ids.length === 1 ? "Restored" : `${ids.length} restored`);
}
/** Permanent removal — only from the Trash view, after a confirmation. */
async function purgeTasks(ids) {
	const { deleteItem } = useDataStore.getState();
	for (const id of ids) await deleteItem("tasks", id);
}
function newBlockId() {
	return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
async function setBlocks(task, blocks) {
	const { updateItem } = useDataStore.getState();
	const first = [...blocks].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
	await updateItem("tasks", task.id, {
		blocks,
		scheduledAt: first?.date ?? task.scheduledAt,
		startTime: first?.start,
		endTime: first?.end,
		inbox: false
	});
}
async function addBlock(task, block) {
	await setBlocks(task, [...task.blocks ?? [], {
		...block,
		id: newBlockId()
	}]);
}
async function moveBlock(task, blockId, patch) {
	await setBlocks(task, (task.blocks ?? []).map((b) => b.id === blockId ? {
		...b,
		...patch
	} : b));
}
async function removeBlock(task, blockId) {
	await setBlocks(task, (task.blocks ?? []).filter((b) => b.id !== blockId));
}
/** Completing a block never completes the task — the user decides that. */
async function completeBlock(task, blockId) {
	const { updateItem } = useDataStore.getState();
	await updateItem("tasks", task.id, {
		blocks: (task.blocks ?? []).map((b) => b.id === blockId ? {
			...b,
			done: true
		} : b),
		status: task.status === "todo" ? "in-progress" : task.status
	});
}
/** Split remaining estimate in two: today's block stays, the rest goes to tomorrow. */
async function splitBlockToTomorrow(task, blockId, today = todayISO()) {
	const b = (task.blocks ?? []).find((x) => x.id === blockId);
	if (!b) return;
	const { hhmmToMin, minToHHMM } = await import("./planning-CdLbbCHg.mjs").then((n) => n.u).then((n) => n.u);
	const total = hhmmToMin(b.end) - hhmmToMin(b.start);
	if (total < 30) return;
	const half = Math.floor(total / 2 / 5) * 5;
	const kept = {
		...b,
		end: minToHHMM(hhmmToMin(b.start) + half)
	};
	const moved = {
		id: newBlockId(),
		date: addDaysLocal(today, 1),
		start: b.start,
		end: minToHHMM(hhmmToMin(b.start) + (total - half))
	};
	await setBlocks(task, [...(task.blocks ?? []).map((x) => x.id === blockId ? kept : x), moved]);
}
async function sendToInbox(task) {
	const { updateItem } = useDataStore.getState();
	await updateItem("tasks", task.id, {
		inbox: true,
		committedOn: void 0,
		scheduledAt: void 0,
		notBefore: void 0,
		startTime: void 0,
		endTime: void 0,
		blocks: (task.blocks ?? []).filter((b) => b.done)
	});
}
async function rescheduleToTomorrow(task, today = todayISO()) {
	const { updateItem } = useDataStore.getState();
	const tomorrow = addDaysLocal(today, 1);
	await updateItem("tasks", task.id, {
		committedOn: void 0,
		scheduledAt: tomorrow,
		notBefore: tomorrow,
		inbox: false,
		blocks: (task.blocks ?? []).map((b) => b.date === today && !b.done ? {
			...b,
			date: tomorrow
		} : b)
	});
}
async function reduceScope(task, estimateMin) {
	const { updateItem } = useDataStore.getState();
	await updateItem("tasks", task.id, { estimateMin });
}
//#endregion
export { reduceScope as a, restoreTasks as c, splitBlockToTomorrow as d, purgeTasks as i, sendToInbox as l, completeBlock as n, removeBlock as o, moveBlock as r, rescheduleToTomorrow as s, addBlock as t, softDeleteTasks as u };
