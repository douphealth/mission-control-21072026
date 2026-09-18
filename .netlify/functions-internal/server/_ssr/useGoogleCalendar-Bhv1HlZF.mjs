import { i as __toESM } from "../_runtime.mjs";
import { t as db } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { D as useDataStore } from "./useTableData-BUruD6H7.mjs";
import { a as getGCalConfig, c as pushTasksToGCal, d as taskIdToGCalId, i as gCalEventToCalEvent, l as setGCalConfig, o as isGCalConnected, r as disconnectGCal, s as listCalendars, t as connectGCal, u as syncGCalEvents } from "./googleCalendar-B8JefTzG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useGoogleCalendar-Bhv1HlZF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* React hook for per-user Google Calendar integration.
*/
function useGoogleCalendar(opts) {
	const autoFetch = opts?.autoFetch ?? true;
	const intervalRef = (0, import_react.useRef)(null);
	const syncLockRef = (0, import_react.useRef)(false);
	const storeUpdateItem = useDataStore((s) => s.updateItem);
	const [state, setState] = (0, import_react.useState)(() => {
		const cfg = getGCalConfig();
		return {
			connected: isGCalConnected(),
			connecting: false,
			syncing: false,
			email: cfg.connectedEmail,
			calendars: [],
			enabledCalendarIds: cfg.enabledCalendarIds,
			events: [],
			rawEvents: [],
			lastSync: cfg.lastSync,
			autoSync: cfg.autoSync,
			error: null
		};
	});
	const syncStateFromConfig = (0, import_react.useCallback)(() => {
		const cfg = getGCalConfig();
		setState((s) => ({
			...s,
			connected: isGCalConnected(),
			email: cfg.connectedEmail,
			enabledCalendarIds: cfg.enabledCalendarIds,
			lastSync: cfg.lastSync,
			autoSync: cfg.autoSync
		}));
	}, []);
	const getTimeRange = (0, import_react.useCallback)(() => {
		const now = /* @__PURE__ */ new Date();
		return {
			min: opts?.timeMin || new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
			max: opts?.timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()
		};
	}, [opts?.timeMin, opts?.timeMax]);
	const fetchCalendars = (0, import_react.useCallback)(async () => {
		try {
			const cals = await listCalendars();
			setState((s) => ({
				...s,
				calendars: cals,
				connected: true,
				error: null
			}));
			if (getGCalConfig().enabledCalendarIds.length === 0) {
				const ids = cals.map((c) => c.id);
				if (ids.length > 0) {
					setGCalConfig({ enabledCalendarIds: ids });
					setState((s) => ({
						...s,
						enabledCalendarIds: ids
					}));
				}
			}
			const primary = cals.find((c) => c.primary);
			if (primary && /@/.test(primary.id)) {
				setGCalConfig({ connectedEmail: primary.id });
				setState((s) => ({
					...s,
					email: primary.id
				}));
			}
		} catch (e) {
			console.error("Failed to fetch calendars:", e);
			setState((s) => ({
				...s,
				calendars: [],
				events: [],
				rawEvents: [],
				connected: false,
				error: e?.message || "Failed to fetch calendars"
			}));
			throw e;
		}
	}, []);
	const syncEvents = (0, import_react.useCallback)(async (force = false) => {
		if (syncLockRef.current) return;
		syncLockRef.current = true;
		setState((s) => ({
			...s,
			syncing: true,
			error: null
		}));
		try {
			const allTasks = await db.tasks.toArray();
			const tasksToPush = allTasks.filter((t) => !t.gcalEventId || t.gcalEventId.startsWith("mc"));
			if (tasksToPush.length > 0) {
				const pushed = await pushTasksToGCal(tasksToPush);
				for (const [taskId, gcalId] of pushed) if (allTasks.find((t) => t.id === taskId)?.gcalEventId !== gcalId) await storeUpdateItem("tasks", taskId, { gcalEventId: gcalId });
				if (pushed.size > 0) console.log(`📤 Synced ${pushed.size} tasks to Google Calendar`);
			}
			const { min, max } = getTimeRange();
			const rawEvents = await syncGCalEvents(min, max, force);
			const updatedTasks = await db.tasks.toArray();
			const pushedGCalIds = new Set(updatedTasks.map((t) => t.gcalEventId).filter(Boolean));
			for (const t of updatedTasks) pushedGCalIds.add(taskIdToGCalId(t.id));
			const localTaskFingerprints = new Set(updatedTasks.map((t) => `${(t.title || "").trim().toLowerCase()}|${t.dueDate || ""}`));
			const externalEvents = rawEvents.filter((ev) => {
				const rawSummary = ev.summary || "";
				const isTaskSummary = /^(📋|✅|⚠️\s*OVERDUE\s*\d+d\s*·)\s*/.test(rawSummary);
				const normalizedSummary = rawSummary.replace(/^(📋|✅|⚠️\s*OVERDUE\s*\d+d\s*·)\s*/, "").trim().toLowerCase();
				const evDate = ev.start.date || (ev.start.dateTime ? new Date(ev.start.dateTime).toISOString().split("T")[0] : "");
				if (isTaskSummary) {
					if (/^mc[a-v0-9]+$/i.test(ev.id)) return false;
					if (!updatedTasks.some((t) => (t.title || "").trim().toLowerCase() === normalizedSummary && t.dueDate === evDate)) return false;
				}
				if (pushedGCalIds.has(ev.id)) return false;
				const fp = `${normalizedSummary}|${evDate}`;
				if (localTaskFingerprints.has(fp)) {
					const matchingTask = updatedTasks.find((t) => (t.title || "").trim().toLowerCase() === normalizedSummary && t.dueDate === evDate && !t.gcalEventId);
					if (matchingTask) {
						storeUpdateItem("tasks", matchingTask.id, { gcalEventId: ev.id }).catch(() => {});
						pushedGCalIds.add(ev.id);
					}
					return false;
				}
				return true;
			});
			const calMap = /* @__PURE__ */ new Map();
			state.calendars.forEach((c) => {
				if (c.backgroundColor) calMap.set(c.id, c.backgroundColor);
			});
			const events = externalEvents.map((ev) => gCalEventToCalEvent(ev, ev.calendarId ? calMap.get(ev.calendarId) : void 0));
			setState((s) => ({
				...s,
				events,
				rawEvents,
				connected: true,
				syncing: false,
				lastSync: (/* @__PURE__ */ new Date()).toISOString()
			}));
		} catch (e) {
			setState((s) => ({
				...s,
				connected: false,
				syncing: false,
				events: [],
				rawEvents: [],
				error: e.message
			}));
			throw e;
		} finally {
			syncLockRef.current = false;
		}
	}, [
		getTimeRange,
		state.calendars,
		storeUpdateItem
	]);
	const connect = (0, import_react.useCallback)(async (_clientId) => {
		setState((s) => ({
			...s,
			connecting: true,
			error: null
		}));
		try {
			const auth = await connectGCal();
			if (auth.redirected) {
				setState((s) => ({
					...s,
					connecting: false
				}));
				return { success: true };
			}
			await fetchCalendars();
			await syncEvents(true);
			syncStateFromConfig();
			return {
				success: true,
				email: auth.email || getGCalConfig().connectedEmail || void 0
			};
		} catch (e) {
			setState((s) => ({
				...s,
				connected: false,
				connecting: false,
				error: e?.message || "Google Calendar sync failed"
			}));
			return {
				success: false,
				error: e?.message || "Google Calendar sync failed"
			};
		} finally {
			setState((s) => ({
				...s,
				connecting: false
			}));
		}
	}, [
		fetchCalendars,
		syncEvents,
		syncStateFromConfig
	]);
	const disconnect = (0, import_react.useCallback)(() => {
		disconnectGCal();
		setGCalConfig({
			enabledCalendarIds: [],
			lastSync: null,
			connectedEmail: null
		});
		setState((s) => ({
			...s,
			calendars: [],
			enabledCalendarIds: [],
			events: [],
			rawEvents: [],
			lastSync: null,
			email: null,
			error: null
		}));
	}, []);
	const toggleCalendar = (0, import_react.useCallback)((calId) => {
		const current = getGCalConfig().enabledCalendarIds;
		const next = current.includes(calId) ? current.filter((id) => id !== calId) : [...current, calId];
		setGCalConfig({ enabledCalendarIds: next });
		setState((s) => ({
			...s,
			enabledCalendarIds: next
		}));
		setTimeout(() => syncEvents(true), 200);
	}, [syncEvents]);
	const setAutoSync = (0, import_react.useCallback)((enabled) => {
		setGCalConfig({ autoSync: enabled });
		setState((s) => ({
			...s,
			autoSync: enabled
		}));
	}, []);
	const setClientId = (0, import_react.useCallback)((_id) => {}, []);
	(0, import_react.useEffect)(() => {
		syncStateFromConfig();
		if (autoFetch && isGCalConnected()) fetchCalendars().then(() => syncEvents()).catch(() => {});
	}, []);
	(0, import_react.useEffect)(() => {
		if (state.connected && state.autoSync) {
			const ms = (getGCalConfig().syncIntervalMinutes || 5) * 60 * 1e3;
			intervalRef.current = setInterval(() => {
				syncEvents(true);
			}, ms);
		}
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [
		state.connected,
		state.autoSync,
		syncEvents
	]);
	return {
		...state,
		clientId: "",
		connect,
		disconnect,
		syncEvents,
		fetchCalendars,
		toggleCalendar,
		setAutoSync,
		setClientId
	};
}
//#endregion
export { useGoogleCalendar as t };
