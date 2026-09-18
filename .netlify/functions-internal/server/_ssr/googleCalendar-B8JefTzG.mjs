import { D as ensureGoogleToken, O as fetchGoogleEmail, j as validGoogleToken, k as getGoogleClientId } from "./routes-qm6I9RAb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/googleCalendar-B8JefTzG.js
/** Google Calendar — direct browser → Google API via Google Identity Services.
* Works on ANY deployment (pages.dev, custom domains, localhost). The user's
* own OAuth Client ID is configured once (Settings → Google Connection, or
* VITE_GOOGLE_CLIENT_ID at build time); tokens are issued in-browser. */
var CONFIG_STORAGE_KEY = "mc_gcal_config";
var GCAL_COLORS = {
	"1": "#7986CB",
	"2": "#33B679",
	"3": "#8E24AA",
	"4": "#E67C73",
	"5": "#F6BF26",
	"6": "#F4511E",
	"7": "#039BE5",
	"8": "#616161",
	"9": "#3F51B5",
	"10": "#0B8043",
	"11": "#D50000"
};
function getGCalColor(colorId) {
	return colorId && GCAL_COLORS[colorId] ? GCAL_COLORS[colorId] : "#039BE5";
}
var DEFAULT_CONFIG = {
	enabledCalendarIds: [],
	autoSync: true,
	syncIntervalMinutes: 5,
	lastSync: null,
	connectedEmail: null
};
function getGCalConfig() {
	try {
		const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
		if (!raw) return { ...DEFAULT_CONFIG };
		const parsed = JSON.parse(raw);
		return {
			...DEFAULT_CONFIG,
			...parsed
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}
function setGCalConfig(partial) {
	const updated = {
		...getGCalConfig(),
		...partial
	};
	localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
	return updated;
}
function clearGCalConfig() {
	localStorage.removeItem(CONFIG_STORAGE_KEY);
}
function isGCalConnected() {
	if (validGoogleToken() !== null) return true;
	const config = getGCalConfig();
	return Boolean(config.connectedEmail || config.lastSync);
}
var GCalAuthError = class extends Error {
	constructor(message) {
		super(message || "Google Calendar is not connected. Open Settings → Google Connection and connect your account.");
		this.name = "GCalAuthError";
	}
};
async function ensureToken(interactive = false) {
	const token = validGoogleToken();
	if (token) return token;
	try {
		return await ensureGoogleToken({ interactive });
	} catch (e) {
		if (e?.message?.includes("popup")) throw new GCalAuthError(e.message);
		throw new GCalAuthError(e?.message || "Google sign-in failed");
	}
}
async function gcalApi(path, init = {}) {
	const token = await ensureToken();
	const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
		...init,
		headers: {
			...init.headers || {},
			Authorization: `Bearer ${token.access_token}`,
			"Content-Type": "application/json"
		}
	});
	if (res.status === 401) {
		localStorage.removeItem("mc_google_access_token_v1");
		throw new GCalAuthError("Google Calendar session expired — please reconnect.");
	}
	if (res.status === 204) return void 0;
	const text = await res.text();
	if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${text.slice(0, 600)}`);
	if (!text) return void 0;
	return JSON.parse(text);
}
async function listCalendars() {
	const calendars = [];
	let pageToken;
	do {
		const qs = new URLSearchParams({
			maxResults: "250",
			showHidden: "true"
		});
		if (pageToken) qs.set("pageToken", pageToken);
		const data = await gcalApi(`/users/me/calendarList?${qs.toString()}`);
		calendars.push(...(data.items || []).map((cal) => ({
			id: cal.id,
			summary: cal.summary || cal.id,
			backgroundColor: cal.backgroundColor,
			foregroundColor: cal.foregroundColor,
			primary: cal.primary || false,
			selected: cal.selected !== false
		})));
		pageToken = data.nextPageToken;
	} while (pageToken);
	return calendars;
}
async function fetchCalendarEvents(calendarId, timeMin, timeMax, maxResults = 250) {
	const events = [];
	let pageToken;
	do {
		const qs = new URLSearchParams({
			timeMin,
			timeMax,
			maxResults: String(maxResults),
			singleEvents: "true",
			orderBy: "startTime"
		});
		if (pageToken) qs.set("pageToken", pageToken);
		const data = await gcalApi(`/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`);
		events.push(...(data.items || []).map((event) => ({
			...event,
			calendarId
		})));
		pageToken = data.nextPageToken;
	} while (pageToken);
	return events;
}
async function fetchAllEvents(timeMin, timeMax) {
	let calendarIds = getGCalConfig().enabledCalendarIds;
	if (!calendarIds || calendarIds.length === 0) calendarIds = (await listCalendars()).map((c) => c.id);
	const results = await Promise.allSettled(calendarIds.map((id) => fetchCalendarEvents(id, timeMin, timeMax)));
	const events = [];
	const failures = [];
	for (const result of results) if (result.status === "fulfilled") events.push(...result.value);
	else failures.push(result.reason?.message || "Calendar read failed");
	if (events.length === 0 && failures.length > 0) throw new Error(failures[0]);
	setGCalConfig({ lastSync: (/* @__PURE__ */ new Date()).toISOString() });
	return events;
}
function taskIdToGCalId(taskId) {
	return `mc${taskId.replace(/[^a-fA-F0-9]/g, "").toLowerCase()}`.slice(0, 1024);
}
async function createGCalEvent(calendarId, event, deterministicId) {
	const cal = encodeURIComponent(calendarId);
	if (deterministicId) try {
		return await gcalApi(`/calendars/${cal}/events`, {
			method: "POST",
			body: JSON.stringify({
				...event,
				id: deterministicId
			})
		});
	} catch (e) {
		if (!/\(409\)/.test(e?.message || "")) throw e;
		return gcalApi(`/calendars/${cal}/events/${encodeURIComponent(deterministicId)}`, {
			method: "PUT",
			body: JSON.stringify(event)
		});
	}
	return gcalApi(`/calendars/${cal}/events`, {
		method: "POST",
		body: JSON.stringify(event)
	});
}
async function deleteGCalEvent(eventId, calendarId = "primary") {
	if (!eventId) return false;
	try {
		await gcalApi(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
		return true;
	} catch (e) {
		if (/\b(?:404|410)\b/.test(e?.message || "")) return true;
		return false;
	}
}
async function connectGCal() {
	if (!getGoogleClientId()) throw new GCalAuthError("Google isn't connected yet. Open Settings → Google Connection, paste your Google OAuth Client ID, then press Connect.");
	const token = await ensureToken(true);
	const calendars = await listCalendars();
	const primary = calendars.find((cal) => cal.primary && /@/.test(cal.id));
	const writable = calendars.find((cal) => cal.id === "primary" || /@/.test(cal.id));
	const email = primary?.id || writable?.id;
	const profileEmail = await fetchGoogleEmail(token.access_token);
	if (profileEmail || email) setGCalConfig({ connectedEmail: profileEmail || email || null });
	return {
		email: profileEmail || email,
		redirected: false
	};
}
function disconnectGCal() {
	clearGCalConfig();
}
function localTodayISO() {
	const d = /* @__PURE__ */ new Date();
	return (/* @__PURE__ */ new Date(d.getTime() - d.getTimezoneOffset() * 6e4)).toISOString().slice(0, 10);
}
function nextDateISO(date) {
	const d = /* @__PURE__ */ new Date(`${date}T00:00:00`);
	d.setDate(d.getDate() + 1);
	return d.toISOString().slice(0, 10);
}
/** Builds the calendar title for a task, flagging overdue / completed state. */
function gcalTaskSummary(task) {
	const today = localTodayISO();
	if (task.status === "done") return `✅ ${task.title}`;
	if (task.dueDate && task.dueDate < today) return `⚠️ OVERDUE ${Math.max(1, Math.round(((/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime() - (/* @__PURE__ */ new Date(`${task.dueDate}T00:00:00`)).getTime()) / 864e5))}d · ${task.title}`;
	return `📋 ${task.title}`;
}
/** Personal items can be mirrored as an opaque "Busy" slot: availability
*  without exposing the title or notes. Off = mirrored like any other task. */
function shouldProjectAsBusy(task) {
	if ((task.area ?? "work") !== "personal") return false;
	try {
		const raw = localStorage.getItem("mc-plan-v1");
		return raw ? JSON.parse(raw)?.state?.personalAsBusy !== false : true;
	} catch {
		return true;
	}
}
async function pushTasksToGCal(tasks) {
	const { toRRule } = await import("./recurrence-CgknE5Dl.mjs");
	const results = /* @__PURE__ */ new Map();
	const today = localTodayISO();
	for (const task of tasks) {
		if (task.gcalEventId && !task.gcalEventId.startsWith("mc")) continue;
		if (task.deletedAt) continue;
		try {
			const nextBlock = [...task.blocks ?? []].filter((b) => !b.done).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
			const eventDate = nextBlock?.date || task.startDate || task.dueDate || today;
			const startTime = nextBlock?.start ?? task.startTime;
			const endTime = nextBlock?.end ?? task.endTime;
			const isAllDay = !nextBlock && task.allDay !== false && !task.startTime;
			const isOverdue = task.status !== "done" && !!task.dueDate && task.dueDate < today;
			const eventBody = shouldProjectAsBusy(task) ? {
				summary: "Busy",
				description: "",
				transparency: "opaque",
				visibility: "private",
				colorId: "8"
			} : {
				summary: gcalTaskSummary(task),
				description: task.description || "",
				colorId: isOverdue ? "11" : task.status === "done" ? "10" : "9"
			};
			if (isAllDay) {
				eventBody.start = { date: eventDate };
				eventBody.end = { date: nextDateISO(eventDate) };
			} else {
				const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
				eventBody.start = {
					dateTime: `${eventDate}T${startTime || "09:00"}:00`,
					timeZone: tz
				};
				eventBody.end = {
					dateTime: `${eventDate}T${endTime || "10:00"}:00`,
					timeZone: tz
				};
			}
			if (task.recurring && task.recurringInterval) {
				const rrule = toRRule(task);
				if (rrule) eventBody.recurrence = [rrule];
			}
			const created = await createGCalEvent("primary", eventBody, taskIdToGCalId(task.id));
			if (created?.id) results.set(task.id, created.id);
		} catch (e) {
			console.error(`Failed to push task "${task.title}" to Google Calendar:`, e);
		}
	}
	return results;
}
var cachedEvents = [];
var cacheTimestamp = 0;
var CACHE_TTL = 6e4;
async function syncGCalEvents(timeMin, timeMax, forceRefresh = false) {
	if (!forceRefresh && cachedEvents.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) return cachedEvents;
	cachedEvents = await fetchAllEvents(timeMin, timeMax);
	cacheTimestamp = Date.now();
	return cachedEvents;
}
function gCalEventToCalEvent(gev, calColor) {
	const isAllDay = !!gev.start.date;
	let date;
	let endDate;
	let startTime;
	let endTime;
	if (isAllDay) {
		const startDate = gev.start.date;
		if (!startDate) throw new Error("Google Calendar event is missing a start date");
		date = startDate;
		if (gev.end.date && gev.end.date !== gev.start.date) {
			const endD = new Date(gev.end.date);
			endD.setDate(endD.getDate() - 1);
			const ed = endD.toISOString().split("T")[0];
			endDate = ed !== date ? ed : void 0;
		}
	} else {
		const startDateTime = gev.start.dateTime;
		const endDateTime = gev.end.dateTime;
		if (!startDateTime || !endDateTime) throw new Error("Google Calendar event is missing start or end time");
		const startDt = new Date(startDateTime);
		const endDt = new Date(endDateTime);
		date = startDt.toISOString().split("T")[0];
		startTime = startDt.toTimeString().slice(0, 5);
		endTime = endDt.toTimeString().slice(0, 5);
		const endDateStr = endDt.toISOString().split("T")[0];
		endDate = endDateStr !== date ? endDateStr : void 0;
	}
	return {
		id: `gcal-${gev.id}`,
		title: gev.summary || "(No title)",
		date,
		endDate,
		startTime,
		endTime,
		color: calColor || getGCalColor(gev.colorId),
		category: "Google Calendar",
		description: gev.description,
		isTask: false,
		isGoogleEvent: true,
		allDay: isAllDay,
		htmlLink: gev.htmlLink,
		googleEventId: gev.id
	};
}
//#endregion
export { getGCalConfig as a, pushTasksToGCal as c, taskIdToGCalId as d, gCalEventToCalEvent as i, setGCalConfig as l, deleteGCalEvent as n, isGCalConnected as o, disconnectGCal as r, listCalendars as s, connectGCal as t, syncGCalEvents as u };
