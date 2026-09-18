import { i as __toESM } from "../_runtime.mjs";
import { r as migrateFromLocalStorage, t as db } from "./db-DLy-AV_e.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { i as deduplicateItems, r as deduplicateAll } from "./supabase-D3pMiuZg.mjs";
import { l as restoreLatestNonEmptyVersion, m as stopAutoSnapshots, p as startAutoSnapshots } from "./versions-CwXqq8sp.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { D as useDataStore, E as useCustomModules, O as useDecisions, P as useIdeas, Q as useUpdateItem, R as usePayments, S as useBulkAddItems, Y as useTasks, _ as useAddItem, d as redactSecretText, f as requestEmailCode, g as startCloudSync, h as signInToCloud, j as useExportAllData, l as onSaveStatus, n as forceCloudSync, nt as verifyEmailCode, o as markCloudRecordDirty, r as getLastCloudSync, rt as verifyMagicLink, s as onCloudStatus, u as queueCloudPush } from "./useTableData-BUruD6H7.mjs";
import { P as isRedirect, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./server-BEODbGZS.mjs";
import { a as daysOverdue, i as buildDigestText, l as todayISO, n as addDaysLocal, o as fmtLocal, r as buildBriefing, s as mailDigest } from "./overdue-CpArWbx3.mjs";
import { a as fmtMinutes, c as minToHHMM, l as parseDuration, o as hhmmToMin } from "./planning-CdLbbCHg.mjs";
import { $t as FileText, B as Scale, Cn as CircleCheck, D as Sparkles, Dn as ChevronDown, Dt as Leaf, En as ChevronLeft, Et as Lightbulb, Fn as CalendarClock, Ft as Image$1, G as RefreshCw, Ht as Globe, In as Bug, It as House, K as RefreshCcw, L as Search, Lt as History, M as ShieldCheck, Mn as Calendar, Mt as KeyRound, N as Settings, On as Check, Pn as CalendarDays, Pt as Inbox, Qt as FileUp, Rn as Bell, S as StickyNote, St as ListChecks, T as SquareCheckBig, Tn as ChevronRight, U as Rocket, Ut as Github, Vt as Grip, X as Plus, Xt as Flame, Yn as Archive, Zt as Flag, _n as Clock, a as Users, bn as Circle, cn as Database, ct as Moon, d as TriangleAlert, g as Timer, gn as CloudOff, gt as LogIn, h as Trash2, hn as Cloud, ht as LogOut, it as PanelsTopLeft, jn as Camera, ln as CornerDownLeft, mt as Mail, n as X, on as Download, ot as Newspaper, pt as Menu, q as Radar, r as WifiOff, rn as ExternalLink, sn as DollarSign, t as Zap, un as Copy, wn as CircleAlert, wt as Link2, x as Sun, xt as ListTodo, yn as Clipboard, yt as LoaderCircle, zn as AtSign, zt as Hammer } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { t as require_papaparse } from "../_libs/papaparse.mjs";
import { a as stringType, i as objectType, r as numberType, t as arrayType } from "../_libs/zod.mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as z } from "../_libs/next-themes.mjs";
import { n as Provider, t as Content2 } from "../_libs/@radix-ui/react-tooltip+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/quickCapture-r8EOEPPM.js
var PREFIX = {
	">": "tasks",
	"#": "notes",
	"!": "ideas",
	"@": "reminders"
};
var URL_RE = /https?:\/\/\S+/i;
var PRIORITY_WORDS = [
	[/\b(urgent|asap|critical|now!!?)\b/i, "critical"],
	[/\b(important|high|priority)\b/i, "high"],
	[/\b(someday|maybe|eventually|low)\b/i, "low"]
];
var DAY_WORDS = [
	[/\btoday\b/i, 0],
	[/\btonight\b/i, 0],
	[/\btomorrow\b/i, 1],
	[/\bday after tomorrow\b/i, 2],
	[/\bnext week\b/i, 7],
	[/\bnext month\b/i, 30]
];
var TIME_RE = /\b(?:at\s+)?(\d{1,2}):(\d{2})\b/;
var WEEKDAY_RE = /\b(?:on\s+)?(mon|tues?|wed|thur?s?|fri|sat|sun)(?:day)?\b/i;
var WEEKDAYS = [
	"sun",
	"mon",
	"tue",
	"wed",
	"thu",
	"fri",
	"sat"
];
function nextWeekday(word, today) {
	const idx = WEEKDAYS.indexOf(word.slice(0, 3).toLowerCase());
	if (idx < 0) return void 0;
	let delta = (idx - (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getDay() + 7) % 7;
	if (delta === 0) delta = 7;
	return addDaysLocal(today, delta);
}
/** The one router. Pure — no I/O, no React, fully unit-testable. */
function parseCapture(raw, today = todayISO()) {
	let text = raw.trim();
	let target;
	const first = text[0];
	if (first && PREFIX[first]) {
		target = PREFIX[first];
		text = text.slice(1).trim();
	}
	const urlMatch = text.match(URL_RE);
	let priority;
	for (const [re, p] of PRIORITY_WORDS) if (re.test(text)) {
		priority = p;
		break;
	}
	const dur = parseDuration(text);
	if (dur) text = text.replace(dur.match, " ").replace(/\s+/g, " ").trim();
	let due;
	let dateText;
	for (const [re, delta] of DAY_WORDS) {
		const m = text.match(re);
		if (m) {
			due = addDaysLocal(today, delta);
			dateText = m[0];
			break;
		}
	}
	if (!due) {
		const inDays = text.match(/\bin\s+(\d{1,3})\s+days?\b/i);
		if (inDays) {
			due = addDaysLocal(today, Math.min(365, parseInt(inDays[1], 10)));
			dateText = inDays[0];
		}
	}
	if (!due) {
		const wd = text.match(WEEKDAY_RE);
		if (wd) {
			due = nextWeekday(wd[1], today);
			dateText = wd[0].trim();
		}
	}
	let dateRole;
	if (due && dateText) {
		const esc = dateText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		dateRole = new RegExp(`\\b(by|due|deadline|before|until)\\s+${esc}`, "i").test(text) ? "deadline" : "scheduled";
	}
	let time;
	const tm = text.match(TIME_RE);
	if (tm) {
		const h = parseInt(tm[1], 10);
		const m = parseInt(tm[2], 10);
		if (h >= 0 && h <= 23 && m >= 0 && m <= 59) time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
	}
	const tags = [];
	text = text.replace(/(?:^|\s)#([\p{L}\p{N}_-]{2,})/gu, (_m, t) => {
		tags.push(t.toLowerCase());
		return " ";
	}).replace(/\s+/g, " ").trim();
	let area;
	if (tags.includes("work")) area = "work";
	if (tags.includes("personal")) area = "personal";
	const trailingArea = text.match(/[,\s]+(work|personal)\s*$/i);
	if (trailingArea) {
		area = trailingArea[1].toLowerCase();
		text = text.slice(0, trailingArea.index).trim();
	}
	const title = text.replace(/\b(by|due|deadline|before|until|on)\s+(?=(today|tonight|tomorrow|next week|next month|mon|tue|wed|thu|fri|sat|sun))/gi, " ").replace(/\b(today|tonight|tomorrow|day after tomorrow|next week|next month)\b/gi, " ").replace(/\bin\s+\d{1,3}\s+days?\b/gi, " ").replace(WEEKDAY_RE, " ").replace(TIME_RE, " ").replace(/\b(urgent|asap|critical|important|priority|someday|maybe|eventually)\b/gi, " ").replace(/[,\s]+$/g, "").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim() || (urlMatch ? urlMatch[0] : raw.trim());
	if (!target) {
		if (urlMatch && text.replace(URL_RE, "").trim().length === 0) target = "links";
		else if (/\?$/.test(raw.trim())) target = "ideas";
		else target = "tasks";
	}
	const out = {
		target,
		title
	};
	if (priority) out.priority = priority;
	if (due) {
		out.due = due;
		out.dateRole = dateRole;
		out.dateText = dateText;
	}
	if (time) out.time = time;
	if (dur) out.durationMin = dur.minutes;
	if (area) out.area = area;
	if (urlMatch) out.url = urlMatch[0];
	if (tags.length) out.tags = tags.filter((t) => t !== "work" && t !== "personal");
	if (out.tags && !out.tags.length) delete out.tags;
	if (target === "reminders" && !time) out.time = "09:00";
	return out;
}
/** Field payload for the data store, ready to insert. */
function toRecord(p, today = todayISO()) {
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	switch (p.target) {
		case "tasks": {
			const isDeadline = p.dateRole === "deadline";
			const scheduled = p.due && !isDeadline ? p.due : void 0;
			const blocks = scheduled && p.time ? [{
				id: `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
				date: scheduled,
				start: p.time,
				end: minToHHMM(hhmmToMin(p.time) + (p.durationMin ?? 30))
			}] : void 0;
			return {
				title: p.title,
				priority: p.priority ?? "medium",
				status: "todo",
				dueDate: isDeadline ? p.due : "",
				scheduledAt: scheduled,
				notBefore: scheduled && scheduled > today ? scheduled : void 0,
				reviewAt: p.due,
				startTime: p.time,
				estimateMin: p.durationMin,
				blocks,
				area: p.area,
				inbox: !p.due,
				category: "",
				description: p.tags?.join(", ") ?? "",
				linkedProject: "",
				subtasks: [],
				createdAt: nowIso,
				touchedAt: today,
				tags: p.tags
			};
		}
		case "reminders": return {
			title: p.title,
			notes: "",
			remindAt: `${p.due ?? today}T${p.time ?? "09:00"}:00`,
			status: "pending",
			createdAt: nowIso
		};
		case "notes": return {
			title: p.title,
			content: p.tags?.join("\n") ?? "",
			color: "",
			pinned: false,
			tags: p.tags ?? [],
			createdAt: nowIso,
			updatedAt: nowIso
		};
		case "ideas": return {
			title: p.title,
			description: "",
			status: "exploring",
			tags: p.tags ?? [],
			createdAt: nowIso
		};
		case "links": return {
			title: p.title,
			url: p.url ?? p.title,
			category: p.tags?.[0] ?? "",
			status: "active",
			description: "",
			dateAdded: fmtLocal(/* @__PURE__ */ new Date()),
			pinned: false,
			tags: p.tags
		};
	}
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/googleDirectAuth-D3wjhc7c.js
var CLIENT_ID_KEY = "mc_google_oauth_client_id";
var TOKEN_KEY = "mc_google_access_token_v1";
var GCAL_SCOPE = "https://www.googleapis.com/auth/calendar";
var GTASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
var GOOGLE_SCOPES = [
	"openid",
	"email",
	"profile",
	GCAL_SCOPE,
	GTASKS_SCOPE
].join(" ");
/** Where the GIS script is loaded from. */
var GIS_SRC = "https://accounts.google.com/gsi/client";
var gisPromise = null;
function loadGis() {
	if (typeof window === "undefined") return Promise.reject(/* @__PURE__ */ new Error("Browser only"));
	if (window.google?.accounts?.oauth2) return Promise.resolve();
	if (gisPromise) return gisPromise;
	gisPromise = new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.src = GIS_SRC;
		s.async = true;
		s.defer = true;
		s.onload = () => resolve();
		s.onerror = () => {
			gisPromise = null;
			reject(/* @__PURE__ */ new Error("Could not load Google sign-in. Check your connection and try again."));
		};
		document.head.appendChild(s);
	});
	return gisPromise;
}
/** The configured Google OAuth Client ID (user-pasted or build-time). */
function getGoogleClientId() {
	if (typeof window === "undefined") return "";
	try {
		return localStorage.getItem(CLIENT_ID_KEY) || "";
	} catch {
		return "";
	}
}
function setGoogleClientId(id) {
	if (typeof window === "undefined") return;
	const clean = id.trim();
	if (clean) localStorage.setItem(CLIENT_ID_KEY, clean);
	else localStorage.removeItem(CLIENT_ID_KEY);
	localStorage.removeItem(TOKEN_KEY);
}
function hasGoogleClientId() {
	return /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(getGoogleClientId());
}
function getGoogleOrigin() {
	if (typeof window === "undefined") return "";
	return window.location.origin;
}
function readGoogleToken() {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(TOKEN_KEY);
		if (!raw) return null;
		const t = JSON.parse(raw);
		if (t.expires_at - 3e4 < Date.now()) return null;
		return t;
	} catch {
		return null;
	}
}
function clearGoogleToken() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(TOKEN_KEY);
	const w = window;
	if (w.google?.accounts?.oauth2 && getGoogleClientId()) try {
		w.google.accounts.oauth2.revoke(getGoogleClientId(), () => {});
	} catch {}
}
function saveToken(t) {
	localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}
/**
* Open the Google consent/account picker via GIS token client.
* Returns the fresh access token. Google remembers consent, so for the
* user this is a one-tap account pick on every subsequent sign-in.
*/
async function requestGoogleToken(opts) {
	const clientId = getGoogleClientId();
	if (!clientId) throw new Error("No Google Client ID configured. Open Settings → Google Connection and paste your OAuth Client ID.");
	if (!/\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error("That does not look like a Google OAuth Client ID — it should end in .apps.googleusercontent.com.");
	await loadGis();
	const w = window;
	if (!w.google?.accounts?.oauth2) throw new Error("Google sign-in is unavailable in this browser.");
	return new Promise((resolve, reject) => {
		let settled = false;
		w.google.accounts.oauth2.initTokenClient({
			client_id: clientId,
			scope: opts?.scope || GOOGLE_SCOPES,
			prompt: opts?.prompt || "",
			callback: (resp) => {
				settled = true;
				if (resp?.error) {
					reject(new Error(formatAuthError(resp.error, resp.error_description)));
					return;
				}
				if (!resp?.access_token) {
					reject(/* @__PURE__ */ new Error("Google did not return an access token."));
					return;
				}
				const token = {
					access_token: resp.access_token,
					expires_at: Date.now() + (Number(resp.expires_in) || 3600) * 1e3 - 1e4,
					scope: resp.scope || opts?.scope || GOOGLE_SCOPES,
					email: void 0
				};
				saveToken(token);
				resolve(token);
			},
			error_callback: (err) => {
				if (settled) return;
				settled = true;
				const type = err?.type || "";
				if (type === "popup_closed" || type === "popup_failed_to_open") reject(/* @__PURE__ */ new Error("Google sign-in was cancelled or the popup was blocked. Allow popups and try again."));
				else reject(new Error(formatAuthError(type, err?.message)));
			}
		}).requestAccessToken({ prompt: opts?.prompt || "" });
	});
}
function formatAuthError(code, desc) {
	const raw = `${code}${desc ? `: ${desc}` : ""}`.toLowerCase();
	if (raw.includes("access_denied")) return "Google access was denied. Approve the permission prompt and try again.";
	if (raw.includes("origin_mismatch") || raw.includes("invalid_origin")) return `Google rejected this app origin (${getGoogleOrigin()}). Add it under "Authorized JavaScript origins" in your Google OAuth client, then try again.`;
	if (raw.includes("popup")) return "Google sign-in popup was blocked. Allow popups for this site and try again.";
	if (raw.includes("idpiframe") || raw.includes("third_party")) return "Google blocked sign-in in this frame. Open the app in its own tab and try again.";
	return `Google sign-in failed${desc ? ` — ${desc}` : ` (${code})`}`;
}
/** A still-valid token, or null. */
function validGoogleToken() {
	return readGoogleToken();
}
/** Force a fresh token. Non-interactive callers (API fetches) must pass
* interactive:false so a background sync never pops the consent window. */
async function ensureGoogleToken(opts) {
	const existing = readGoogleToken();
	if (existing) return existing;
	if (opts?.interactive === false) throw new Error("Not connected to Google");
	return requestGoogleToken(opts);
}
/** Best-effort email for the connected account (from Google's userinfo). */
async function fetchGoogleEmail(token) {
	try {
		const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token}` } });
		if (!res.ok) return null;
		return (await res.json()).email || null;
	} catch {
		return null;
	}
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/planStore-Dxow4yBr.js
var zeroMetrics = {
	captures: 0,
	captureMsTotal: 0,
	morningPlans: 0,
	morningPlanMsTotal: 0,
	dayCloses: 0,
	blockMoves: 0,
	syncFailures: 0
};
var usePlanStore = create()(persist((set) => ({
	workdayStart: "09:00",
	workdayEnd: "18:00",
	area: "all",
	personalAsBusy: true,
	lastMorningPlan: null,
	lastDayClose: null,
	metrics: zeroMetrics,
	setWorkday: (workdayStart, workdayEnd) => set({
		workdayStart,
		workdayEnd
	}),
	setArea: (area) => set({ area }),
	setPersonalAsBusy: (personalAsBusy) => set({ personalAsBusy }),
	markMorningPlan: (day, ms = 0) => set((s) => ({
		lastMorningPlan: day,
		metrics: {
			...s.metrics,
			morningPlans: s.metrics.morningPlans + 1,
			morningPlanMsTotal: s.metrics.morningPlanMsTotal + ms
		}
	})),
	markDayClose: (day) => set((s) => ({
		lastDayClose: day,
		metrics: {
			...s.metrics,
			dayCloses: s.metrics.dayCloses + 1
		}
	})),
	bump: (key, by = 1) => set((s) => ({ metrics: {
		...s.metrics,
		[key]: (s.metrics[key] ?? 0) + by
	} }))
}), { name: "mc-plan-v1" }));
/** Visibility filter — never a permission. Tasks without an area count as work. */
function inArea(task, area) {
	if (area === "all") return true;
	return (task.area ?? "work") === area;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/routes-qm6I9RAb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_papaparse = /* @__PURE__ */ __toESM(require_papaparse());
/**
* Robust parser for messy, tab/column-separated credential dumps like the
* user's WordPress hosting export (one column per website, multiple labelled
* sections stacked vertically: WordPress Access / CyberPanel / FTP /
* Cloudflare / RackNerd / Backup Email / Cloudflare API token / Virusdie).
*
* Returns categorised, per-site credential entries plus the website records
* themselves. Emits high fidelity even when cells are empty and rows are
* ragged.
*/
var TLDS = /* @__PURE__ */ new Set([
	"com",
	"net",
	"org",
	"io",
	"co",
	"dev",
	"app",
	"info",
	"biz",
	"me",
	"shop",
	"store",
	"ai",
	"tech",
	"blog",
	"site",
	"online",
	"xyz",
	"us",
	"uk",
	"eu"
]);
var IGNORED_HOSTS = /* @__PURE__ */ new Set([
	"gmail.com",
	"googlemail.com",
	"yahoo.com",
	"hotmail.com",
	"outlook.com",
	"virusdie.com",
	"new.virusdie.com",
	"racknerd.com",
	"nerdvm.racknerd.com",
	"cloudflare.com",
	"wordpress.com",
	"wordpress.org",
	"google.com"
]);
function isSiteDomain(d) {
	const parts = d.split(".");
	if (parts.length < 2) return false;
	const tld = parts[parts.length - 1].toLowerCase();
	return TLDS.has(tld);
}
function normalizeUrl(u) {
	const s = u.trim().replace(/[,;]$/, "");
	if (!s) return "";
	if (/^https?:\/\//i.test(s)) return s;
	return "https://" + s;
}
function domainToName(d) {
	const host = d.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
	return (host.split(".").slice(0, -1).join(".") || host).split(/[-_.]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function isEmail(s) {
	return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s.trim());
}
function isUrlLike(s) {
	return /^https?:\/\//i.test(s) || /\/wp-admin|\/wp-login|\/login/i.test(s) || /\.[a-z]{2,}\//i.test(s);
}
function isIpMaybePort(s) {
	return /^\d{1,3}(?:\.\d{1,3}){3}(?::\d{2,5})?$/.test(s.trim());
}
function stripLabel(s) {
	return s.replace(/^\s*(username|user|login|email|password|pass|pwd|port|host|ip|url|note|notes|2fa)\s*[:=]\s*/i, "").trim();
}
function detectCredentialsDump(text) {
	const wpCount = (text.match(/WordPress\s+Access/gi) || []).length;
	const cpCount = (text.match(/CyberPanel/gi) || []).length;
	const ftpCount = (text.match(/\bFTP:/gi) || []).length;
	const cfCount = (text.match(/\bCloudflare:/gi) || []).length;
	const adminUrls = (text.match(/\/wp-admin/gi) || []).length;
	return wpCount >= 2 || cpCount >= 2 || ftpCount >= 2 || cfCount >= 2 || adminUrls >= 2;
}
/** Split a line into columns. Tabs are strongest; fall back to 2+ spaces. */
function splitCols(line) {
	if (line.includes("	")) return line.split("	").map((s) => s.trim());
	return line.split(/ {2,}/).map((s) => s.trim());
}
function classifyHeader(row) {
	const joined = row.filter(Boolean).join(" | ").toLowerCase();
	if (!joined) return null;
	if (/wordpress\s+access/.test(joined)) return "wp";
	if (/^cyberpanel:?\s*(\|\s*cyberpanel:?)*$/.test(joined) || /cyberpanel/.test(joined) && row.filter(Boolean).every((c) => /cyberpanel/i.test(c))) return "cyberpanel";
	if (/^ftp:?\s*(\|\s*ftp:?)*$/.test(joined) || row.filter(Boolean).every((c) => /^ftp:?$/i.test(c))) return "ftp";
	if (row.filter(Boolean).every((c) => /^cloudflare:?$/i.test(c))) return "cloudflare";
	if (/login\s*-\s*racknerd/.test(joined) || row.filter(Boolean).every((c) => /racknerd/i.test(c))) return "racknerd";
	if (/email account for backups/.test(joined)) return "backup-email";
	if (/cloudflare api token/.test(joined)) return "cf-api";
	if (/website antivirus|virusdie/.test(joined)) return "virusdie";
	return null;
}
/**
* Column-aware section parser. Returns per-column arrays of trimmed
* non-empty values in the order they appeared (labels stripped).
*/
function collectSectionValues(bodyRows, numCols) {
	const perCol = Array.from({ length: numCols }, () => []);
	for (const row of bodyRows) for (let c = 0; c < numCols; c++) {
		const raw = (row[c] ?? "").trim();
		if (!raw) continue;
		if (classifyHeader([raw])) continue;
		perCol[c].push(stripLabel(raw));
	}
	return perCol;
}
function parseCredentialsDump(text) {
	if (!detectCredentialsDump(text)) return null;
	const rows = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, "")).filter((l) => l.length > 0).map(splitCols);
	let headerIdx = -1;
	let domainCols = [];
	for (let i = 0; i < rows.length; i++) {
		const domains = rows[i].map((c) => {
			const cleaned = c.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
			if (!cleaned) return null;
			if (!isSiteDomain(cleaned)) return null;
			if (IGNORED_HOSTS.has(cleaned)) return null;
			return cleaned;
		});
		if (domains.filter(Boolean).length >= 2) {
			headerIdx = i;
			domainCols = domains;
			break;
		}
	}
	if (headerIdx === -1) return null;
	const numCols = domainCols.length;
	const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
	const sections = [];
	let current = null;
	for (let i = headerIdx + 1; i < rows.length; i++) {
		const row = rows[i].slice(0, numCols);
		while (row.length < numCols) row.push("");
		const kind = classifyHeader(row);
		if (kind) {
			current = {
				kind,
				body: []
			};
			sections.push(current);
		} else if (current) current.body.push(row);
	}
	const sites = domainCols.map((d) => ({
		domain: d ?? "",
		wp: [],
		cyberpanel: [],
		ftp: [],
		cloudflare: [],
		racknerd: [],
		backupEmail: [],
		cfApi: [],
		virusdie: []
	}));
	for (const sec of sections) {
		const perCol = collectSectionValues(sec.body, numCols);
		for (let c = 0; c < numCols; c++) {
			const vals = perCol[c];
			if (!vals.length) continue;
			const bucket = sec.kind;
			if (bucket === "wp") sites[c].wp.push(...vals);
			else if (bucket === "cyberpanel") sites[c].cyberpanel.push(...vals);
			else if (bucket === "ftp") sites[c].ftp.push(...vals);
			else if (bucket === "cloudflare") sites[c].cloudflare.push(...vals);
			else if (bucket === "racknerd") sites[c].racknerd.push(...vals);
			else if (bucket === "backup-email") sites[c].backupEmail.push(...vals);
			else if (bucket === "cf-api") sites[c].cfApi.push(...vals);
			else if (bucket === "virusdie") sites[c].virusdie.push(...vals);
		}
	}
	const websites = [];
	const credentials = [];
	for (const site of sites) {
		if (!site.domain) continue;
		const siteUrl = normalizeUrl(site.domain);
		const name = domainToName(site.domain);
		const wp = [...site.wp];
		const adminUrl = wp.find((v) => isUrlLike(v) || v.toLowerCase().startsWith(site.domain));
		if (adminUrl) wp.splice(wp.indexOf(adminUrl), 1);
		const emails = wp.filter(isEmail);
		for (const e of emails) wp.splice(wp.indexOf(e), 1);
		const wpUsername = wp[0] || "";
		const wpPassword = wp[1] || "";
		const wpEmail = emails[0] || "";
		const wpUsername2 = wp[2] || "";
		const wpPassword2 = wp[3] || "";
		const wpEmail2 = emails[1] || "";
		const notesLines = [];
		if (wpUsername2 || wpPassword2 || wpEmail2) notesLines.push(`Secondary WP user: ${wpUsername2} / ${wpPassword2}${wpEmail2 ? " (" + wpEmail2 + ")" : ""}`);
		if (site.virusdie.length) notesLines.push("Virusdie protected");
		websites.push({
			id: crypto.randomUUID(),
			name,
			url: siteUrl,
			wpAdminUrl: adminUrl ? normalizeUrl(adminUrl) : normalizeUrl(site.domain + "/wp-admin"),
			wpUsername,
			wpPassword,
			hostingProvider: site.cyberpanel.length ? "CyberPanel" : site.racknerd.length ? "RackNerd" : "",
			hostingLoginUrl: site.cyberpanel[0] ? normalizeUrl(site.cyberpanel[0]) : "",
			hostingUsername: site.cyberpanel[1] || "",
			hostingPassword: site.cyberpanel[2] || "",
			category: "WordPress",
			status: "active",
			notes: notesLines.join("\n"),
			plugins: [],
			dateAdded: today,
			lastUpdated: today
		});
		const pushCred = (c) => credentials.push({
			id: crypto.randomUUID(),
			category: "Infrastructure",
			createdAt: today,
			apiKey: "",
			...c
		});
		if (wpUsername || wpPassword) pushCred({
			label: `WordPress — ${name}`,
			service: "WordPress",
			url: adminUrl ? normalizeUrl(adminUrl) : normalizeUrl(site.domain + "/wp-admin"),
			username: wpUsername,
			password: wpPassword,
			notes: wpEmail ? `Email: ${wpEmail}` : "",
			tags: [site.domain, "wordpress"]
		});
		if (wpUsername2 || wpPassword2) pushCred({
			label: `WordPress (secondary) — ${name}`,
			service: "WordPress",
			url: adminUrl ? normalizeUrl(adminUrl) : normalizeUrl(site.domain + "/wp-admin"),
			username: wpUsername2,
			password: wpPassword2,
			notes: wpEmail2 ? `Email: ${wpEmail2}` : "",
			tags: [
				site.domain,
				"wordpress",
				"secondary"
			]
		});
		if (site.cyberpanel.length) {
			const [host, user, pass, ...rest] = site.cyberpanel;
			pushCred({
				label: `CyberPanel — ${name}`,
				service: "CyberPanel",
				url: host ? isIpMaybePort(host) ? `https://${host}` : normalizeUrl(host) : "",
				username: user || "admin",
				password: pass || "",
				notes: rest.join(" | "),
				tags: [
					site.domain,
					"cyberpanel",
					"hosting"
				]
			});
		}
		if (site.ftp.length) {
			const [host, user, pass, ...rest] = site.ftp;
			const portLine = rest.find((v) => /^\d{2,5}$/.test(v) || /port/i.test(v)) || "22";
			pushCred({
				label: `FTP — ${name}`,
				service: "FTP",
				url: host || "",
				username: user || "root",
				password: pass || "",
				notes: `Port: ${portLine.replace(/[^\d]/g, "") || "22"}`,
				tags: [
					site.domain,
					"ftp",
					"hosting"
				]
			});
		}
		if (site.cloudflare.length) {
			const [user, pass] = site.cloudflare;
			pushCred({
				label: `Cloudflare — ${name}`,
				service: "Cloudflare",
				url: "https://dash.cloudflare.com",
				username: user || "",
				password: pass || "",
				notes: "",
				tags: [
					site.domain,
					"cloudflare",
					"dns"
				]
			});
		}
		if (site.racknerd.length) {
			const rn = site.racknerd;
			const email = rn.find(isEmail) || "";
			const url = rn.find((v) => /racknerd/i.test(v) && isUrlLike(v)) || "https://nerdvm.racknerd.com/";
			const [password = "", twoFa = "", vmUser = "", vmPass = ""] = rn.filter((v) => v !== email && v !== url && !/^Control Panel/i.test(v));
			pushCred({
				label: `RackNerd — ${name}`,
				service: "RackNerd",
				url: normalizeUrl(url),
				username: email,
				password,
				notes: [
					twoFa && `2FA backup: ${twoFa}`,
					vmUser && `VM user: ${vmUser}`,
					vmPass && `VM pass: ${vmPass}`
				].filter(Boolean).join("\n"),
				tags: [
					site.domain,
					"racknerd",
					"vps"
				]
			});
		}
		if (site.backupEmail.length) {
			const be = site.backupEmail;
			const email = be.find(isEmail) || "";
			const password = be.find((v) => v && v !== email) || "";
			if (email || password) pushCred({
				label: `Backup Email — ${name}`,
				service: "Email",
				url: "",
				username: email,
				password,
				notes: "Backup mailbox associated with the site",
				tags: [
					site.domain,
					"email",
					"backup"
				]
			});
		}
		if (site.cfApi.length) {
			const cf = site.cfApi;
			const tokenName = cf.find((v) => /^[a-z0-9-]+$/i.test(v) && v.length < 60) || "";
			const token = cf.find((v) => /^[A-Za-z0-9_-]{25,}$/.test(v)) || "";
			if (token) pushCred({
				label: `Cloudflare API — ${name}`,
				service: "Cloudflare API",
				url: "https://dash.cloudflare.com/profile/api-tokens",
				username: tokenName,
				password: "",
				apiKey: token,
				notes: "Cloudflare API token",
				tags: [
					site.domain,
					"cloudflare",
					"api"
				]
			});
		}
		if (site.virusdie.length) pushCred({
			label: `Virusdie — ${name}`,
			service: "Virusdie",
			url: "https://new.virusdie.com/websites",
			username: "",
			password: "",
			notes: "Website antivirus protection",
			tags: [
				site.domain,
				"security",
				"antivirus"
			],
			category: "Security"
		});
	}
	const categories = [];
	if (websites.length) categories.push({
		target: "websites",
		meta: TARGET_META$1.websites,
		confidence: "high",
		items: websites,
		fieldMap: {},
		score: 100
	});
	if (credentials.length) categories.push({
		target: "credentials",
		meta: TARGET_META$1.credentials,
		confidence: "high",
		items: credentials,
		fieldMap: {},
		score: 95
	});
	return categories.length ? categories : null;
}
/**
* Smart Import Engine v15.0 — Ultra-autonomous, content-aware, multi-category,
* NLP-enhanced detection with natural language parsing.
*
* v15 NEW:
* - MULTI-CATEGORY SPLIT: Mixed data auto-splits into separate categories
* - NLP DATE PARSING: "tomorrow", "next Monday", "March 5th", "in 3 days"
* - NLP PRIORITY/STATUS: Extracts priority & status from natural language
* - MARKDOWN TABLE SUPPORT: Parses |col|col| markdown tables
* - HTML TABLE SUPPORT: Parses <table> HTML
* - SMART VALUE INFERENCE: Infers types from content patterns
* - EMAIL/CONTACT EXTRACTION: Detects emails, phone numbers
* - MULTI-BLOCK MIXED DATA: Each block can be a different category
* - FUZZY FIELD MATCHING: Levenshtein-based field name matching
* - EXPRESS IMPORT: High-confidence data can skip review
*/
var TARGET_META$1 = {
	websites: {
		label: "Websites",
		emoji: "🌐",
		requiredFields: ["name", "url"],
		optionalFields: [
			"wpAdminUrl",
			"wpUsername",
			"wpPassword",
			"hostingProvider",
			"hostingLoginUrl",
			"hostingUsername",
			"hostingPassword",
			"category",
			"status",
			"notes",
			"plugins",
			"tags"
		],
		aliases: {
			name: [
				"site",
				"website",
				"domain",
				"siteName",
				"site_name",
				"website_name",
				"domain_name",
				"hostname",
				"host",
				"site name",
				"website name",
				"project",
				"label",
				"site title",
				"website title"
			],
			url: [
				"link",
				"href",
				"siteUrl",
				"site_url",
				"website_url",
				"address",
				"domain",
				"homepage",
				"web",
				"webpage",
				"page",
				"site url",
				"website url",
				"live url",
				"liveurl",
				"production url",
				"prod url",
				"website link",
				"site link",
				"main url"
			],
			wpAdminUrl: [
				"wp_admin",
				"wordpress_admin",
				"admin_url",
				"wp_url",
				"wp_admin_url",
				"wp admin",
				"wordpress admin",
				"admin url",
				"admin panel",
				"wp login",
				"wplogin",
				"admin login",
				"backend",
				"backend url",
				"dashboard url",
				"cms url",
				"cms",
				"wp admin url",
				"admin",
				"wordpress url",
				"wp-admin",
				"wordpress login"
			],
			wpUsername: [
				"wp_user",
				"wordpress_user",
				"admin_user",
				"wp_login",
				"wp user",
				"wordpress user",
				"admin user",
				"wp username",
				"admin username",
				"cms user",
				"cms username",
				"backend user",
				"backend username",
				"wp login user",
				"username",
				"user",
				"login",
				"user name"
			],
			wpPassword: [
				"wp_pass",
				"wordpress_pass",
				"admin_pass",
				"wp_pwd",
				"wp pass",
				"wordpress pass",
				"admin pass",
				"wp password",
				"admin password",
				"cms pass",
				"cms password",
				"backend pass",
				"backend password",
				"wp login pass",
				"password",
				"pass",
				"pwd"
			],
			hostingProvider: [
				"hosting",
				"host",
				"provider",
				"hosting_provider",
				"hoster",
				"hosting provider",
				"server",
				"host provider",
				"web host",
				"webhost",
				"hosting company"
			],
			hostingLoginUrl: [
				"hosting_url",
				"hosting_login",
				"host_url",
				"hosting url",
				"hosting login",
				"host url",
				"hosting login url",
				"hosting panel",
				"cpanel url",
				"cpanel",
				"plesk",
				"server url",
				"hosting dashboard"
			],
			hostingUsername: [
				"hosting_user",
				"host_user",
				"hosting user",
				"hosting username",
				"host user",
				"host username",
				"server user",
				"server username",
				"cpanel user",
				"cpanel username",
				"hosting login user",
				"hosting account user"
			],
			hostingPassword: [
				"hosting_pass",
				"host_pass",
				"hosting_pwd",
				"hosting pass",
				"hosting password",
				"host pass",
				"host password",
				"server pass",
				"server password",
				"cpanel pass",
				"cpanel password",
				"hosting login pass",
				"hosting account password"
			],
			category: [
				"type",
				"group",
				"cat",
				"kind",
				"sector",
				"niche"
			],
			status: [
				"state",
				"active",
				"live"
			],
			notes: [
				"note",
				"comment",
				"comments",
				"description",
				"desc",
				"info",
				"details"
			],
			plugins: [
				"plugin",
				"extensions",
				"addons",
				"modules"
			],
			tags: [
				"tag",
				"labels",
				"keywords"
			]
		},
		contentSignals: [
			/wp-admin/i,
			/wordpress/i,
			/hosting/i,
			/\.com|\.org|\.io|\.net|\.dev|\.co|\.app|\.me|\.info|\.biz/i,
			/siteground|cloudways|bluehost|godaddy/i,
			/https?:\/\/[^\s]+/i
		]
	},
	links: {
		label: "Links",
		emoji: "🔗",
		requiredFields: ["title", "url"],
		optionalFields: [
			"category",
			"description",
			"status",
			"pinned",
			"tags"
		],
		aliases: {
			title: [
				"name",
				"label",
				"text",
				"link_name",
				"bookmark",
				"link_title"
			],
			url: [
				"link",
				"href",
				"address",
				"uri",
				"source"
			],
			category: [
				"type",
				"group",
				"folder",
				"cat"
			],
			description: [
				"desc",
				"note",
				"notes",
				"comment"
			],
			status: ["state"],
			pinned: [
				"pin",
				"favorite",
				"starred",
				"fav"
			],
			tags: [
				"tag",
				"labels",
				"keywords"
			]
		},
		contentSignals: [/bookmark/i]
	},
	tasks: {
		label: "Tasks",
		emoji: "✅",
		requiredFields: ["title"],
		optionalFields: [
			"priority",
			"status",
			"dueDate",
			"category",
			"description",
			"linkedProject",
			"tags"
		],
		aliases: {
			title: [
				"name",
				"task",
				"todo",
				"item",
				"subject",
				"task_name",
				"action",
				"action_item"
			],
			priority: [
				"prio",
				"importance",
				"urgency",
				"level"
			],
			status: [
				"state",
				"done",
				"completed",
				"progress",
				"checked"
			],
			dueDate: [
				"due",
				"deadline",
				"due_date",
				"duedate",
				"date",
				"target_date",
				"end_date"
			],
			category: [
				"type",
				"group",
				"cat",
				"project",
				"list",
				"board"
			],
			description: [
				"desc",
				"note",
				"notes",
				"details",
				"body",
				"content"
			],
			linkedProject: [
				"project",
				"linked_project",
				"projectName"
			],
			tags: ["tag", "labels"]
		},
		contentSignals: [
			/todo|to-do|to do/i,
			/in.?progress|done|blocked|pending/i,
			/high|medium|low|critical|urgent/i,
			/deadline|due/i
		]
	},
	repos: {
		label: "GitHub Repos",
		emoji: "🐙",
		requiredFields: ["name"],
		optionalFields: [
			"url",
			"description",
			"language",
			"stars",
			"forks",
			"status",
			"demoUrl",
			"progress",
			"topics",
			"devPlatformUrl",
			"deploymentUrl"
		],
		aliases: {
			name: [
				"repo",
				"repository",
				"repo_name",
				"project",
				"full_name",
				"repo name",
				"repository name",
				"project name"
			],
			url: [
				"link",
				"href",
				"github_url",
				"repo_url",
				"html_url",
				"clone_url",
				"ssh_url",
				"github url",
				"github link",
				"github_link",
				"repo link",
				"repo_link",
				"repository url",
				"repository link",
				"git url",
				"git link",
				"source url",
				"source link",
				"code url",
				"code link"
			],
			description: [
				"desc",
				"about",
				"summary"
			],
			language: [
				"lang",
				"tech",
				"primary_language",
				"programming language"
			],
			stars: [
				"star",
				"stargazers",
				"stargazers_count"
			],
			forks: ["fork", "forks_count"],
			status: [
				"state",
				"archived",
				"visibility"
			],
			demoUrl: [
				"demo",
				"demo_url",
				"homepage",
				"live_url",
				"demo url",
				"live url",
				"preview url",
				"preview"
			],
			progress: ["completion", "percent"],
			topics: [
				"tags",
				"labels",
				"keywords",
				"topic"
			],
			devPlatformUrl: [
				"dev_platform",
				"dev_platform_url",
				"platform_url",
				"platform",
				"dev_url",
				"builder_url",
				"builder",
				"ide_url",
				"ide",
				"aistudio",
				"ai_studio",
				"bolt_url",
				"lovable_url",
				"replit_url",
				"coding_platform",
				"development_url",
				"dev platform",
				"development platform",
				"code platform",
				"dev platform url",
				"lovable app",
				"lovable_app",
				"lovable project",
				"lovable_project",
				"lovable link",
				"lovable url"
			],
			deploymentUrl: [
				"deployment",
				"deployment_url",
				"deploy_url",
				"gateway",
				"gateway_url",
				"hosting_url",
				"published_url",
				"published",
				"live",
				"live_url",
				"production_url",
				"production",
				"cloudways",
				"vercel",
				"netlify",
				"railway",
				"render",
				"fly",
				"pages",
				"cloudflare_pages",
				"deployed",
				"deploy gateway",
				"deployment gateway",
				"deployment gateway url",
				"cloudflare page",
				"cloudflare_page",
				"cloudflare url",
				"cloudflare_url",
				"cf page",
				"cf pages",
				"pages url",
				"pages_url",
				"deployed url",
				"deployed_url"
			]
		},
		contentSignals: [
			/github\.com/i,
			/gitlab\.com/i,
			/bitbucket/i,
			/repository|repo/i,
			/stars?|forks?/i,
			/lovable\.dev\/projects/i,
			/\.pages\.dev/i
		]
	},
	buildProjects: {
		label: "Build Projects",
		emoji: "🛠️",
		requiredFields: ["name"],
		optionalFields: [
			"platform",
			"projectUrl",
			"deployedUrl",
			"description",
			"techStack",
			"status",
			"nextSteps",
			"githubRepo"
		],
		aliases: {
			name: [
				"project",
				"title",
				"project_name",
				"app_name"
			],
			platform: [
				"tool",
				"builder",
				"framework"
			],
			projectUrl: [
				"project_url",
				"build_url",
				"url"
			],
			deployedUrl: [
				"deployed_url",
				"live_url",
				"demo",
				"production_url"
			],
			description: [
				"desc",
				"about",
				"summary"
			],
			techStack: [
				"tech_stack",
				"technologies",
				"stack",
				"tech"
			],
			status: ["state", "phase"],
			nextSteps: [
				"next_steps",
				"todo",
				"next"
			],
			githubRepo: [
				"github_repo",
				"repo",
				"github",
				"repository"
			]
		},
		contentSignals: [
			/lovable|bolt|vercel|netlify|railway/i,
			/deployed|building|testing/i,
			/react|next\.?js|vue|angular|svelte/i
		]
	},
	credentials: {
		label: "Credentials",
		emoji: "🔐",
		requiredFields: ["label", "service"],
		optionalFields: [
			"url",
			"username",
			"password",
			"apiKey",
			"notes",
			"category",
			"tags"
		],
		aliases: {
			label: [
				"name",
				"title",
				"credential_name",
				"account",
				"account_name"
			],
			service: [
				"provider",
				"platform",
				"app",
				"site",
				"website"
			],
			url: [
				"link",
				"login_url",
				"site_url",
				"address"
			],
			username: [
				"user",
				"login",
				"email",
				"user_name",
				"account_name",
				"login_email"
			],
			password: [
				"pass",
				"pwd",
				"secret",
				"passwd"
			],
			apiKey: [
				"api_key",
				"token",
				"access_token",
				"key",
				"api_token",
				"secret_key"
			],
			notes: [
				"note",
				"comment",
				"description",
				"desc"
			],
			category: [
				"type",
				"group",
				"cat"
			],
			tags: ["tag", "labels"]
		},
		contentSignals: [
			/password|passwd|pwd/i,
			/api.?key|token|secret/i,
			/login|credential|auth/i
		]
	},
	payments: {
		label: "Payments",
		emoji: "💰",
		requiredFields: ["title", "amount"],
		optionalFields: [
			"currency",
			"type",
			"status",
			"category",
			"from",
			"to",
			"dueDate",
			"paidDate",
			"recurring",
			"notes"
		],
		aliases: {
			title: [
				"name",
				"description",
				"item",
				"payment",
				"invoice",
				"label",
				"memo",
				"transaction"
			],
			amount: [
				"price",
				"cost",
				"value",
				"total",
				"sum",
				"fee",
				"charge",
				"subtotal"
			],
			currency: [
				"curr",
				"money_type",
				"currency_code"
			],
			type: [
				"kind",
				"payment_type",
				"direction",
				"txn_type"
			],
			status: [
				"state",
				"paid",
				"payment_status"
			],
			category: ["group", "cat"],
			from: [
				"sender",
				"payer",
				"source",
				"client",
				"buyer"
			],
			to: [
				"receiver",
				"payee",
				"recipient",
				"vendor",
				"seller"
			],
			dueDate: [
				"due",
				"deadline",
				"due_date",
				"date",
				"invoice_date",
				"payment_deadline"
			],
			paidDate: [
				"paid_date",
				"paid_on",
				"payment_date",
				"settled_on"
			],
			recurring: [
				"repeat",
				"auto",
				"subscription",
				"recur"
			],
			notes: [
				"note",
				"comment",
				"memo",
				"desc"
			]
		},
		contentSignals: [
			/\$[\d,.]+|\d+\.\d{2}/i,
			/invoice|payment|paid|unpaid|overdue/i,
			/USD|EUR|GBP|JPY/i,
			/income|expense|subscription/i
		]
	},
	notes: {
		label: "Notes",
		emoji: "📝",
		requiredFields: ["title"],
		optionalFields: [
			"content",
			"color",
			"pinned",
			"tags"
		],
		aliases: {
			title: [
				"name",
				"subject",
				"heading",
				"note_title"
			],
			content: [
				"body",
				"text",
				"note",
				"description",
				"desc",
				"details",
				"message"
			],
			color: ["colour", "theme"],
			pinned: [
				"pin",
				"favorite",
				"starred",
				"fav"
			],
			tags: [
				"tag",
				"labels",
				"keywords",
				"categories"
			]
		},
		contentSignals: [/note|memo|journal/i]
	},
	ideas: {
		label: "Ideas",
		emoji: "💡",
		requiredFields: ["title"],
		optionalFields: [
			"description",
			"category",
			"priority",
			"status",
			"tags",
			"linkedProject",
			"votes"
		],
		aliases: {
			title: [
				"name",
				"idea",
				"subject",
				"concept",
				"proposal"
			],
			description: [
				"desc",
				"details",
				"body",
				"content",
				"notes"
			],
			category: [
				"type",
				"group",
				"cat"
			],
			priority: ["prio", "importance"],
			status: ["state", "phase"],
			tags: ["tag", "labels"],
			linkedProject: ["project", "linked_project"],
			votes: [
				"vote",
				"score",
				"rating",
				"upvotes"
			]
		},
		contentSignals: [/idea|concept|brainstorm|proposal/i, /exploring|validated|spark/i]
	},
	habits: {
		label: "Habits",
		emoji: "🔄",
		requiredFields: ["name"],
		optionalFields: [
			"icon",
			"frequency",
			"color"
		],
		aliases: {
			name: [
				"habit",
				"title",
				"label",
				"activity",
				"routine"
			],
			icon: ["emoji"],
			frequency: [
				"freq",
				"interval",
				"schedule",
				"repeat"
			],
			color: ["colour", "theme"]
		},
		contentSignals: [/daily|weekly|monthly/i, /habit|routine|streak/i]
	}
};
function normalize(s) {
	return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s\-./*#@!&^%$()]+/g, "");
}
var URL_REGEX = /https?:\/\/[^\s,;"'<>)}\]]+/gi;
var EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
var CURRENCY_REGEX = /(?:[$€£¥₹])\s*[\d,.]+|[\d,.]+\s*(?:USD|EUR|GBP|JPY|INR|AUD|CAD)/gi;
function extractHostname(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url.match(/(?:https?:\/\/)?(?:www\.)?([^/\s:]+)/)?.[1] || url;
	}
}
function prettifyHostname(hostname) {
	return hostname.replace(/\.(com|org|net|io|dev|co|app|me|info|biz|xyz|site|online|store|tech|ai|gg|tv|us|uk|de|fr|es|it|nl|br|ca|au|jp|kr|ru|in|cn)(\.[a-z]{2,3})?$/i, "").split(/[.\-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function parseNaturalDate(text) {
	if (!text) return null;
	const t = text.toLowerCase().trim();
	const now = /* @__PURE__ */ new Date();
	if (t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)) return t;
	const slashMatch = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
	if (slashMatch) return `${slashMatch[3].length === 2 ? "20" + slashMatch[3] : slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
	if (t === "today" || t === "now") return formatDate(now);
	if (t === "tomorrow" || t === "tmr" || t === "tmrw") return formatDate(addDays(now, 1));
	if (t === "yesterday") return formatDate(addDays(now, -1));
	const inMatch = t.match(/in\s+(\d+)\s+(day|week|month|hour|min)s?/);
	if (inMatch) {
		const n = parseInt(inMatch[1]);
		if (inMatch[2] === "day") return formatDate(addDays(now, n));
		if (inMatch[2] === "week") return formatDate(addDays(now, n * 7));
		if (inMatch[2] === "month") {
			now.setMonth(now.getMonth() + n);
			return formatDate(now);
		}
		return formatDate(addDays(now, 1));
	}
	const dayNames = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday"
	];
	const shortDays = [
		"sun",
		"mon",
		"tue",
		"wed",
		"thu",
		"fri",
		"sat"
	];
	const nextMatch = t.match(/next\s+(\w+)/);
	if (nextMatch) {
		let targetDay = dayNames.indexOf(nextMatch[1]);
		if (targetDay === -1) targetDay = shortDays.indexOf(nextMatch[1]);
		if (targetDay !== -1) {
			const currentDay = now.getDay();
			let daysAhead = targetDay - currentDay;
			if (daysAhead <= 0) daysAhead += 7;
			return formatDate(addDays(now, daysAhead));
		}
		if (nextMatch[1] === "week") return formatDate(addDays(now, 7));
		if (nextMatch[1] === "month") {
			now.setMonth(now.getMonth() + 1);
			return formatDate(now);
		}
	}
	const thisMatch = t.match(/this\s+(\w+)/);
	if (thisMatch) {
		let targetDay = dayNames.indexOf(thisMatch[1]);
		if (targetDay === -1) targetDay = shortDays.indexOf(thisMatch[1]);
		if (targetDay !== -1) {
			const currentDay = now.getDay();
			let daysAhead = targetDay - currentDay;
			if (daysAhead < 0) daysAhead += 7;
			return formatDate(addDays(now, daysAhead));
		}
		if (thisMatch[1] === "weekend") return formatDate(addDays(now, (6 - now.getDay() + 7) % 7 || 7));
	}
	if (t.includes("end of week") || t === "eow") return formatDate(addDays(now, (5 - now.getDay() + 7) % 7 || 7));
	if (t.includes("end of month") || t === "eom") return formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
	const months = [
		"january",
		"february",
		"march",
		"april",
		"may",
		"june",
		"july",
		"august",
		"september",
		"october",
		"november",
		"december"
	];
	const shortMonths = [
		"jan",
		"feb",
		"mar",
		"apr",
		"may",
		"jun",
		"jul",
		"aug",
		"sep",
		"oct",
		"nov",
		"dec"
	];
	const monthDateMatch = t.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/);
	if (monthDateMatch) {
		let monthIdx = months.indexOf(monthDateMatch[1]);
		if (monthIdx === -1) monthIdx = shortMonths.indexOf(monthDateMatch[1]);
		if (monthIdx !== -1) {
			const year = monthDateMatch[3] ? parseInt(monthDateMatch[3]) : now.getFullYear();
			const day = parseInt(monthDateMatch[2]);
			return formatDate(new Date(year, monthIdx, day));
		}
	}
	const datemonthMatch = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?/);
	if (datemonthMatch) {
		let monthIdx = months.indexOf(datemonthMatch[2]);
		if (monthIdx === -1) monthIdx = shortMonths.indexOf(datemonthMatch[2]);
		if (monthIdx !== -1) {
			const year = datemonthMatch[3] ? parseInt(datemonthMatch[3]) : now.getFullYear();
			const day = parseInt(datemonthMatch[1]);
			return formatDate(new Date(year, monthIdx, day));
		}
	}
	return null;
}
function addDays(date, days) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}
function formatDate(date) {
	return date.toISOString().split("T")[0];
}
function extractPriority(text) {
	const t = text.toLowerCase();
	if (/\b(critical|asap|urgent|emergency|p0)\b/.test(t)) return "critical";
	if (/\b(high|important|p1)\b/.test(t)) return "high";
	if (/\b(medium|moderate|normal|p2)\b/.test(t)) return "medium";
	if (/\b(low|minor|nice.?to.?have|p3|p4)\b/.test(t)) return "low";
	return null;
}
function extractStatus(text) {
	const t = text.toLowerCase();
	if (/\b(done|completed|finished|resolved|closed|shipped)\b/.test(t)) return "done";
	if (/\b(in.?progress|wip|working|started|ongoing|active)\b/.test(t)) return "in-progress";
	if (/\b(blocked|stuck|waiting|on.?hold|paused)\b/.test(t)) return "blocked";
	if (/\b(todo|to.?do|pending|planned|backlog|open|new)\b/.test(t)) return "todo";
	return null;
}
function extractPaymentType(text) {
	const t = text.toLowerCase();
	if (/\b(income|revenue|earning|received|inflow|sale)\b/.test(t)) return "income";
	if (/\b(expense|cost|spend|paid|outflow|purchase|bought)\b/.test(t)) return "expense";
	if (/\b(subscription|sub|recurring|monthly|annual|yearly)\b/.test(t)) return "subscription";
	return null;
}
function extractCurrency(text) {
	if (/[$]|USD/i.test(text)) return "USD";
	if (/[€]|EUR/i.test(text)) return "EUR";
	if (/[£]|GBP/i.test(text)) return "GBP";
	if (/[¥]|JPY/i.test(text)) return "JPY";
	if (/[₹]|INR/i.test(text)) return "INR";
	return "USD";
}
function extractAmount(text) {
	const m = text.match(/[$€£¥₹]?\s*(\d[\d.,\s]*\d|\d)/);
	if (m) return parseMoney(m[1]) ?? 0;
	return 0;
}
/** Parses "1.234,56", "1,234.56", "1234,56 €", "€ 89,30" → number */
function parseMoney(raw) {
	if (!raw) return null;
	let s = String(raw).replace(/[^\d.,-]/g, "").trim();
	if (!s) return null;
	const lastComma = s.lastIndexOf(",");
	const lastDot = s.lastIndexOf(".");
	if (lastComma > -1 && lastDot > -1) {
		if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
		else s = s.replace(/,/g, "");
	} else if (lastComma > -1) s = s.length - lastComma - 1 === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
	const n = parseFloat(s);
	return Number.isFinite(n) ? n : null;
}
/** Maps free-form / multilingual payment status text to paid | pending | overdue | cancelled */
function normalizePaymentStatus(raw, context) {
	const t = `${raw || ""}`.toLowerCase().trim();
	if (/^(paid|settled|complete[d]?|cleared|εξοφλ|πληρωμ)/.test(t) || t === "true" || t === "yes") return "paid";
	if (/^(overdue|late|past.?due|ληξιπρ)/.test(t)) return "overdue";
	if (/^(cancel|void|ακυρ)/.test(t)) return "cancelled";
	if (/^(pending|unpaid|due|open|outstanding|απλήρωτ|εκκρεμ|οφειλ)/.test(t)) return "pending";
	const c = context.toLowerCase();
	if (/\b(paid|εξοφλήθηκε|εξοφληση|εξοφλημένο|πληρώθηκε)\b/.test(c)) return "paid";
	if (/\b(unpaid|outstanding|απλήρωτο|εκκρεμεί|οφειλή|πληρωτέο)\b/.test(c)) return "pending";
	return "pending";
}
function nlpExtractTask(line) {
	let title = line.replace(/^[-*•▪▸►→]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
	let dueDate;
	let priority;
	let status;
	for (const pat of [
		/\b(?:by|due|before|until|deadline)\s+(.+?)(?:\s*[,;.|]|$)/i,
		/\b(?:on|at)\s+((?:next\s+)?\w+day|tomorrow|today)/i,
		/\(\s*(.*?(?:tomorrow|today|next\s+\w+|in\s+\d+\s+\w+|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d+).*?)\s*\)/i
	]) {
		const m = title.match(pat);
		if (m) {
			const parsed = parseNaturalDate(m[1].trim());
			if (parsed) {
				dueDate = parsed;
				title = title.replace(m[0], "").trim();
				break;
			}
		}
	}
	for (const pat of [
		/\[(critical|high|medium|low|urgent)\]/i,
		/\((critical|high|medium|low|urgent)\)/i,
		/@(critical|high|medium|low|urgent)\b/i,
		/(!{3,})/,
		/(!{2})/
	]) {
		const m = title.match(pat);
		if (m) {
			if (m[1] === "!!" || m[1]?.startsWith("!!!")) priority = m[1].length >= 3 ? "critical" : "high";
			else priority = extractPriority(m[1] || m[0]) || void 0;
			title = title.replace(m[0], "").trim();
			break;
		}
	}
	for (const pat of [
		/\[(done|completed|in.?progress|wip|blocked|todo)\]/i,
		/\((done|completed|in.?progress|wip|blocked|todo)\)/i,
		/@(done|completed|wip|blocked)\b/i
	]) {
		const m = title.match(pat);
		if (m) {
			status = extractStatus(m[1] || m[0]) || void 0;
			title = title.replace(m[0], "").trim();
			break;
		}
	}
	if (!priority) priority = extractPriority(title) || void 0;
	if (!status) status = extractStatus(title) || void 0;
	title = title.replace(/[,;]+$/, "").replace(/\s{2,}/g, " ").trim();
	return {
		title,
		dueDate,
		priority,
		status
	};
}
function levenshtein(a, b) {
	const m = a.length, n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;
	const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
	return dp[m][n];
}
function parseMarkdownTable(text) {
	const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
	const headerIdx = lines.findIndex((l) => /^\|?.+\|.+\|?$/.test(l));
	if (headerIdx === -1) return null;
	const sepIdx = headerIdx + 1;
	if (sepIdx >= lines.length || !/^\|?[\s\-:]+\|[\s\-:|]+\|?$/.test(lines[sepIdx])) return null;
	const parseRow = (line) => {
		return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
	};
	const headers = parseRow(lines[headerIdx]);
	const rows = [];
	for (let i = sepIdx + 1; i < lines.length; i++) {
		if (!/\|/.test(lines[i])) break;
		const cells = parseRow(lines[i]);
		const row = {};
		headers.forEach((h, j) => {
			if (cells[j]) row[h] = cells[j];
		});
		if (Object.keys(row).length > 0) rows.push(row);
	}
	return rows.length > 0 ? {
		rows,
		fields: headers
	} : null;
}
function parseHtmlTable(text) {
	const tableMatch = text.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
	if (!tableMatch) return null;
	const html = tableMatch[1];
	const extractCells = (row, tag) => {
		const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gi");
		const cells = [];
		let m;
		while ((m = regex.exec(row)) !== null) cells.push(m[1].replace(/<[^>]+>/g, "").trim());
		return cells;
	};
	const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
	if (!rowMatches || rowMatches.length < 2) return null;
	let headers = extractCells(rowMatches[0], "th");
	let dataStart = 1;
	if (headers.length === 0) {
		headers = extractCells(rowMatches[0], "td");
		dataStart = 1;
	}
	if (headers.length === 0) return null;
	const rows = [];
	for (let i = dataStart; i < rowMatches.length; i++) {
		const cells = extractCells(rowMatches[i], "td");
		const row = {};
		headers.forEach((h, j) => {
			if (cells[j]) row[h] = cells[j];
		});
		if (Object.keys(row).length > 0) rows.push(row);
	}
	return rows.length > 0 ? {
		rows,
		fields: headers
	} : null;
}
/**
* Detect if a parsed TSV/CSV is actually a TRANSPOSED table.
*/
function detectAndTranspose(rows, sourceFields) {
	if (rows.length < 2 || sourceFields.length < 2) return null;
	const labelHeader = sourceFields[0];
	const dataHeaders = sourceFields.slice(1);
	const firstColValues = rows.map((r) => r[labelHeader]?.trim()).filter(Boolean);
	if (firstColValues.length < 2) return null;
	const allAliases = /* @__PURE__ */ new Set();
	for (const target of Object.keys(TARGET_META$1)) {
		const meta = TARGET_META$1[target];
		for (const field of [...meta.requiredFields, ...meta.optionalFields]) {
			allAliases.add(normalize(field));
			for (const alias of meta.aliases[field] || []) allAliases.add(normalize(alias));
		}
	}
	if (firstColValues.filter((v) => allAliases.has(normalize(v))).length < firstColValues.length * .3) return null;
	const transposed = [];
	for (const colHeader of dataHeaders) {
		const record = {};
		for (const row of rows) {
			const fieldName = row[labelHeader]?.trim();
			const value = row[colHeader]?.trim();
			if (fieldName && value) record[fieldName] = value;
		}
		if (Object.keys(record).length > 0) transposed.push(record);
	}
	return transposed.length > 0 ? transposed : null;
}
function splitMatrixLine(line) {
	if (line.includes("	")) return line.split("	").map((c) => c.trim());
	return line.split(/ {2,}/).map((c) => c.trim()).filter(Boolean);
}
function parseTransposedMatrix(text) {
	const matrix = text.split("\n").map((l) => splitMatrixLine(l)).filter((cells) => cells.length >= 2);
	if (matrix.length < 2) return null;
	const aliases = /* @__PURE__ */ new Set();
	for (const meta of Object.values(TARGET_META$1)) for (const field of [...meta.requiredFields, ...meta.optionalFields]) {
		aliases.add(normalize(field));
		for (const alias of meta.aliases[field] || []) aliases.add(normalize(alias));
	}
	const labeledRows = matrix.filter((cells) => aliases.has(normalize(cells[0])));
	const maxCols = Math.max(...matrix.map((cells) => cells.length));
	if (labeledRows.length < Math.max(2, matrix.length * .45) || maxCols < 3) return null;
	const rows = [];
	for (let col = 1; col < maxCols; col++) {
		const record = {};
		for (const cells of matrix) {
			const key = cells[0]?.trim();
			const value = cells[col]?.trim();
			if (key && value) record[key] = value;
		}
		if (Object.keys(record).length > 0) rows.push(record);
	}
	const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))];
	return rows.length > 0 ? {
		rows,
		fields
	} : null;
}
function parseImportData(text, fileName) {
	const trimmed = text.trim();
	const htmlResult = parseHtmlTable(trimmed);
	if (htmlResult && htmlResult.rows.length > 0) return {
		rows: htmlResult.rows,
		sourceFields: htmlResult.fields,
		detectedFormat: "html"
	};
	const mdResult = parseMarkdownTable(trimmed);
	if (mdResult && mdResult.rows.length > 0) return {
		rows: mdResult.rows,
		sourceFields: mdResult.fields,
		detectedFormat: "markdown"
	};
	const matrixResult = parseTransposedMatrix(trimmed);
	if (matrixResult && matrixResult.rows.length > 0) return {
		rows: matrixResult.rows,
		sourceFields: matrixResult.fields,
		detectedFormat: "tsv"
	};
	if (trimmed.startsWith("[") || trimmed.startsWith("{")) try {
		let parsed = JSON.parse(trimmed);
		if (!Array.isArray(parsed)) parsed = [parsed];
		const rows = parsed.map((item) => {
			const obj = {};
			for (const [k, v] of Object.entries(item)) obj[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
			return obj;
		});
		return {
			rows,
			sourceFields: rows.length > 0 ? [...new Set(rows.flatMap((r) => Object.keys(r)))] : [],
			detectedFormat: "json"
		};
	} catch {}
	const lines = trimmed.split("\n");
	if (lines.length > 0 && lines[0].trim().startsWith("{")) try {
		const rows = lines.filter((l) => l.trim()).map((l) => {
			const item = JSON.parse(l.trim());
			const obj = {};
			for (const [k, v] of Object.entries(item)) obj[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
			return obj;
		});
		return {
			rows,
			sourceFields: rows.length > 0 ? [...new Set(rows.flatMap((r) => Object.keys(r)))] : [],
			detectedFormat: "jsonlines"
		};
	} catch {}
	const delimiter = detectDelimiter(lines[0] || "");
	const isTSV = delimiter === "	" || fileName?.endsWith(".tsv");
	const result = import_papaparse.default.parse(trimmed, {
		header: true,
		skipEmptyLines: true,
		delimiter: delimiter || void 0,
		dynamicTyping: false,
		transformHeader: (h) => h.trim().replace(/^["']|["']$/g, "")
	});
	if (result.data.length > 0 && result.meta.fields && result.meta.fields.length > 1) {
		const rows = result.data.map((r) => {
			const obj = {};
			for (const [k, v] of Object.entries(r)) obj[k] = String(v ?? "").trim();
			return obj;
		});
		const transposed = detectAndTranspose(rows, result.meta.fields);
		if (transposed) return {
			rows: transposed,
			sourceFields: [...new Set(transposed.flatMap((r) => Object.keys(r)))],
			detectedFormat: isTSV ? "tsv" : "csv"
		};
		return {
			rows,
			sourceFields: result.meta.fields,
			detectedFormat: isTSV ? "tsv" : "csv"
		};
	}
	const plainRows = smartParsePlainText(lines);
	if (plainRows.length > 0) return {
		rows: plainRows,
		sourceFields: [...new Set(plainRows.flatMap((r) => Object.keys(r)))],
		detectedFormat: "text"
	};
	const nonEmpty = lines.filter((l) => l.trim());
	const plainRows2 = smartParsePlainText(nonEmpty);
	if (plainRows2.length > 0) return {
		rows: plainRows2,
		sourceFields: [...new Set(plainRows2.flatMap((r) => Object.keys(r)))],
		detectedFormat: "text"
	};
	return {
		rows: nonEmpty.map((l) => ({ item: l.trim() })),
		sourceFields: ["item"],
		detectedFormat: "text"
	};
}
function detectDelimiter(line) {
	const candidates = [
		",",
		";",
		"	",
		"|"
	];
	let best = ",";
	let bestCount = 0;
	for (const d of candidates) {
		const count = (line.match(new RegExp(d === "|" ? "\\|" : d === "	" ? "	" : d, "g")) || []).length;
		if (count > bestCount) {
			bestCount = count;
			best = d;
		}
	}
	return best;
}
function smartParsePlainText(lines) {
	const kvRegex = /^([^:=]+?)[:=]\s*(.+)$/;
	const isKvLine = (l) => {
		if (/^https?:/i.test(l.trim())) return false;
		return kvRegex.test(l);
	};
	const blocks = lines.join("\n").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
	if (blocks.length >= 1) {
		const kvBlocks = [];
		let totalKvLines = 0;
		let totalLines = 0;
		for (const block of blocks) {
			const blockLines = block.split("\n").map((l) => l.trim()).filter(Boolean);
			totalLines += blockLines.length;
			const kvMatches = blockLines.filter((l) => isKvLine(l));
			totalKvLines += kvMatches.length;
			if (kvMatches.length >= 1) {
				const obj = {};
				let headerUsed = false;
				for (const l of blockLines) if (isKvLine(l)) {
					const m = l.match(kvRegex);
					if (m) obj[m[1].trim()] = m[2].trim();
				} else if (!headerUsed && l.trim() && !l.startsWith("#") && !l.startsWith("---") && !/^https?:/i.test(l.trim())) {
					obj["__header__"] = l.replace(/^[-*•▪▸►→#]+\s*/, "").trim();
					headerUsed = true;
				}
				if (Object.keys(obj).length > 0) kvBlocks.push(obj);
			}
		}
		if (totalKvLines > 0 && totalKvLines >= totalLines * .35 && kvBlocks.length > 0) return kvBlocks.map((block) => {
			const normalized = {};
			for (const [rawKey, val] of Object.entries(block)) {
				if (rawKey === "__header__") {
					if (!Object.keys(block).some((k) => [
						"name",
						"site",
						"website",
						"title",
						"domain"
					].some((a) => normalize(k).includes(a)))) normalized["name"] = val;
					continue;
				}
				normalized[rawKey] = val;
			}
			return normalized;
		});
	}
	const urlLines = [];
	for (const l of lines) {
		const urls = l.match(URL_REGEX);
		URL_REGEX.lastIndex = 0;
		if (urls && urls.length > 0) urlLines.push({
			line: l,
			urls
		});
	}
	if (urlLines.length > 0 && urlLines.length >= lines.length * .3) return urlLines.map(({ line, urls }) => {
		const url = urls[0];
		const textWithoutUrl = line.replace(url, "").replace(/[-,|:•▪▸►→*]\s*/g, "").trim();
		const hostname = extractHostname(url);
		return {
			name: textWithoutUrl || prettifyHostname(hostname),
			url
		};
	});
	const categorizedLines = [];
	for (const l of lines) {
		if (!l.trim()) continue;
		const clean = l.replace(/^[-*•▪▸►→]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
		if (clean.match(CURRENCY_REGEX)) {
			CURRENCY_REGEX.lastIndex = 0;
			const amount = extractAmount(clean);
			if (amount > 0) {
				const title = clean.replace(CURRENCY_REGEX, "").replace(/^\s*[-–—:,]+\s*/, "").trim() || "Payment";
				CURRENCY_REGEX.lastIndex = 0;
				categorizedLines.push({
					title,
					amount: String(amount),
					currency: extractCurrency(clean),
					__type: "payments"
				});
				continue;
			}
		}
		CURRENCY_REGEX.lastIndex = 0;
		const nlp = nlpExtractTask(clean);
		const row = { title: nlp.title };
		if (nlp.dueDate) row.dueDate = nlp.dueDate;
		if (nlp.priority) row.priority = nlp.priority;
		if (nlp.status) row.status = nlp.status;
		categorizedLines.push(row);
	}
	return categorizedLines;
}
function scoreCategory(sourceFields, rows, target) {
	const meta = TARGET_META$1[target];
	const allFields = [...meta.requiredFields, ...meta.optionalFields];
	let score = 0;
	const matchedRequired = /* @__PURE__ */ new Set();
	for (const tf of allFields) {
		const normalTf = normalize(tf);
		const aliasList = (meta.aliases[tf] || []).map(normalize);
		for (const sf of sourceFields) {
			const normalSf = normalize(sf);
			if (normalSf === normalTf) {
				const pts = meta.requiredFields.includes(tf) ? 12 : 4;
				score += pts;
				if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
				break;
			}
			if (aliasList.includes(normalSf)) {
				const pts = meta.requiredFields.includes(tf) ? 10 : 3;
				score += pts;
				if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
				break;
			}
			if (normalSf.includes(normalTf) || normalTf.includes(normalSf)) {
				const pts = meta.requiredFields.includes(tf) ? 6 : 1;
				score += pts;
				if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
				break;
			}
			if (normalSf.length > 3 && normalTf.length > 3 && levenshtein(normalSf, normalTf) <= 2) {
				const pts = meta.requiredFields.includes(tf) ? 5 : 1;
				score += pts;
				if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
				break;
			}
		}
	}
	for (const rf of meta.requiredFields) if (!matchedRequired.has(rf)) score -= 3;
	const sampleRows = rows.slice(0, Math.min(10, rows.length));
	const allValues = sampleRows.flatMap((r) => Object.values(r)).filter(Boolean).join(" ");
	for (const signal of meta.contentSignals) {
		const matches = allValues.match(new RegExp(signal.source, signal.flags.includes("g") ? signal.flags : signal.flags + "g"));
		if (matches) score += Math.min(matches.length * 2, 10);
	}
	const githubUrlCount = sampleRows.filter((r) => Object.values(r).some((v) => /github\.com/i.test(v))).length;
	const lovableUrlCount = sampleRows.filter((r) => Object.values(r).some((v) => /lovable\.dev\/projects/i.test(v))).length;
	const pagesDevCount = sampleRows.filter((r) => Object.values(r).some((v) => /\.pages\.dev/i.test(v))).length;
	const isGitHubData = githubUrlCount > sampleRows.length * .3;
	const hasRepoFieldSignals = sourceFields.some((f) => {
		const n = normalize(f);
		return [
			"repositoryname",
			"reponame",
			"githublink",
			"githuburl",
			"cloudflarepage",
			"lovableapp",
			"lovableproject",
			"pagesurl"
		].some((kw) => n.includes(kw));
	});
	const hasLanguageField = sourceFields.some((f) => normalize(f) === "language" || normalize(f) === "lang" || normalize(f) === "programminglanguage");
	if (target === "repos") {
		if (isGitHubData) score += 50;
		if (hasRepoFieldSignals) score += 30;
		if (hasLanguageField) score += 15;
		if (lovableUrlCount > 0) score += lovableUrlCount * 3;
		if (pagesDevCount > 0) score += pagesDevCount * 3;
		const repoFieldCount = sourceFields.filter((f) => /repo|repository/i.test(f)).length;
		if (repoFieldCount > 0) score += repoFieldCount * 10;
	}
	if (target === "websites") {
		if (isGitHubData) score -= 40;
		if (hasRepoFieldSignals) score -= 30;
		if (hasLanguageField) score -= 20;
		const urlCount = sampleRows.filter((r) => Object.values(r).some((v) => URL_REGEX.test(v))).length;
		URL_REGEX.lastIndex = 0;
		if (!isGitHubData && urlCount > sampleRows.length * .5) score += 15;
		if (sourceFields.some((f) => normalize(f) === "name" || normalize(f) === "site" || normalize(f) === "website" || normalize(f) === "domain") && sourceFields.some((f) => normalize(f) === "url" || normalize(f) === "link" || normalize(f) === "href" || normalize(f) === "address") && !isGitHubData) score += 10;
		const websiteKeywords = [
			"wpadmin",
			"wordpress",
			"hosting",
			"hostingprovider",
			"wpusername",
			"wppassword",
			"siteurl",
			"adminurl",
			"hostinglogin",
			"cpanel",
			"nameserver",
			"dns",
			"ssl"
		];
		const keywordHits = sourceFields.filter((f) => websiteKeywords.some((kw) => normalize(f).includes(kw))).length;
		if (keywordHits > 0) score += keywordHits * 8;
		if (sampleRows.filter((r) => {
			const matches = Object.values(r).join(" ").match(URL_REGEX);
			URL_REGEX.lastIndex = 0;
			return matches && matches.length >= 2;
		}).length > 0 && !isGitHubData) score += 12;
	}
	if (target === "links") {
		if (isGitHubData) score -= 30;
		if (hasRepoFieldSignals) score -= 20;
		if (sourceFields.some((f) => [
			"site",
			"website",
			"domain",
			"hosting",
			"wp",
			"wpadmin",
			"wordpress",
			"hostingprovider",
			"wpusername",
			"wppassword",
			"adminurl"
		].some((kw) => normalize(f).includes(kw)))) score -= 15;
	}
	if (target === "buildProjects") {
		if (isGitHubData && hasRepoFieldSignals) score -= 20;
	}
	if (target === "credentials") {
		if (sourceFields.some((f) => [
			"hosting",
			"wpadmin",
			"wordpress",
			"hostingprovider",
			"siteurl"
		].some((kw) => normalize(f).includes(kw)))) score -= 10;
		if (isGitHubData) score -= 20;
	}
	if (target === "payments") {
		const hasCurrency = CURRENCY_REGEX.test(allValues);
		CURRENCY_REGEX.lastIndex = 0;
		if (hasCurrency) score += 15;
		const paymentMarkers = sampleRows.filter((r) => r.__type === "payments").length;
		if (paymentMarkers > 0) score += paymentMarkers * 5;
		if (isGitHubData) score -= 20;
	}
	if (target === "tasks") {
		const taskMarkers = sampleRows.filter((r) => r.dueDate || r.priority || r.status).length;
		if (taskMarkers > 0) score += taskMarkers * 3;
		if (isGitHubData) score -= 20;
	}
	return score;
}
function autoDetectWithConfidence(sourceFields, rows) {
	const results = Object.keys(TARGET_META$1).map((t) => {
		const score = scoreCategory(sourceFields, rows, t);
		const fieldMap = autoMapFields(sourceFields, t);
		return {
			target: t,
			score,
			fieldMap,
			validCount: normalizeItems(rows, t, fieldMap).length
		};
	});
	results.sort((a, b) => b.score - a.score);
	const top = results[0];
	const second = results[1];
	const gap = top.score - (second?.score ?? 0);
	return results.map((r, i) => ({
		...r,
		confidence: i === 0 ? gap > 8 && r.validCount > 0 ? "high" : gap > 3 && r.validCount > 0 ? "medium" : "low" : "low"
	}));
}
function autoMapFields(sourceFields, target) {
	const meta = TARGET_META$1[target];
	const allTargetFields = [...meta.requiredFields, ...meta.optionalFields];
	const map = {};
	const usedSource = /* @__PURE__ */ new Set();
	for (const tf of allTargetFields) {
		const normalTf = normalize(tf);
		const match = sourceFields.find((sf) => !usedSource.has(sf) && normalize(sf) === normalTf);
		if (match) {
			map[tf] = match;
			usedSource.add(match);
		}
	}
	for (const tf of allTargetFields) {
		if (map[tf]) continue;
		const aliasList = (meta.aliases[tf] || []).map(normalize);
		const match = sourceFields.find((sf) => !usedSource.has(sf) && aliasList.includes(normalize(sf)));
		if (match) {
			map[tf] = match;
			usedSource.add(match);
		}
	}
	for (const tf of allTargetFields) {
		if (map[tf]) continue;
		const normalTf = normalize(tf);
		const match = sourceFields.find((sf) => {
			if (usedSource.has(sf)) return false;
			const n = normalize(sf);
			return n.includes(normalTf) || normalTf.includes(n);
		});
		if (match) {
			map[tf] = match;
			usedSource.add(match);
		}
	}
	for (const tf of allTargetFields) {
		if (map[tf]) continue;
		const normalTf = normalize(tf);
		if (normalTf.length < 4) continue;
		const match = sourceFields.find((sf) => {
			if (usedSource.has(sf)) return false;
			const n = normalize(sf);
			return n.length > 3 && levenshtein(n, normalTf) <= 2;
		});
		if (match) {
			map[tf] = match;
			usedSource.add(match);
		}
	}
	if (Object.keys(map).length === 0 && sourceFields.length === 1) {
		const singleField = sourceFields[0];
		const firstRequired = meta.requiredFields[0];
		if (firstRequired) map[firstRequired] = singleField;
	}
	return map;
}
function normalizeWebsiteStatus(value) {
	const v = normalize(value || "active");
	if ([
		"maintenance",
		"maint",
		"updating"
	].includes(v)) return "maintenance";
	if ([
		"down",
		"offline",
		"outage",
		"inactive"
	].includes(v)) return "down";
	if ([
		"archived",
		"archive",
		"retired"
	].includes(v)) return "archived";
	return "active";
}
function normalizeItems(rows, target, fieldMap) {
	const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
	const meta = TARGET_META$1[target];
	const fieldAliasMap = /* @__PURE__ */ new Map();
	const allTargetFields = [...meta.requiredFields, ...meta.optionalFields];
	for (const tf of allTargetFields) {
		const aliases = /* @__PURE__ */ new Set();
		aliases.add(normalize(tf));
		for (const a of meta.aliases[tf] || []) aliases.add(normalize(a));
		fieldAliasMap.set(tf, aliases);
	}
	const normalizedRowKeys = /* @__PURE__ */ new Map();
	for (const row of rows) for (const k of Object.keys(row)) if (!normalizedRowKeys.has(k)) normalizedRowKeys.set(k, normalize(k));
	const get = (row, field) => {
		const mapped = fieldMap[field];
		if (mapped && row[mapped]?.trim()) return row[mapped].trim();
		if (row[field]?.trim()) return row[field].trim();
		const aliases = fieldAliasMap.get(field);
		if (aliases) for (const k of Object.keys(row)) {
			const nk = normalizedRowKeys.get(k) || normalize(k);
			if (aliases.has(nk) && row[k]?.trim()) return row[k].trim();
		}
		return "";
	};
	const toArray = (val) => val ? val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : [];
	const toBool = (val) => val ? [
		"true",
		"1",
		"yes",
		"on"
	].includes(val.toLowerCase()) : false;
	const extractUrl = (row) => {
		for (const v of Object.values(row)) {
			if (!v) continue;
			const m = v.match(URL_REGEX);
			URL_REGEX.lastIndex = 0;
			if (m) return m[0];
		}
		return "";
	};
	const nameFromUrl = (url) => {
		if (!url) return "";
		return prettifyHostname(extractHostname(url));
	};
	return rows.map((row) => {
		switch (target) {
			case "websites": {
				let url = get(row, "url") || extractUrl(row);
				let name = get(row, "name") || nameFromUrl(url) || "";
				const domainLikeName = name.trim().match(/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/i);
				const urlLikeAdmin = get(row, "wpAdminUrl") || get(row, "hostingLoginUrl");
				if (!url && domainLikeName) url = name.trim();
				else if (!url && urlLikeAdmin) url = urlLikeAdmin;
				if (!name) name = nameFromUrl(url) || "Unnamed";
				if (!url && URL_REGEX.test(name)) {
					url = name;
					name = nameFromUrl(url);
				}
				URL_REGEX.lastIndex = 0;
				if (url && !url.startsWith("http")) url = "https://" + url;
				let wpAdminUrl = get(row, "wpAdminUrl");
				let hostingLoginUrl = get(row, "hostingLoginUrl");
				if (wpAdminUrl && !wpAdminUrl.startsWith("http")) wpAdminUrl = "https://" + wpAdminUrl;
				if (hostingLoginUrl && !hostingLoginUrl.startsWith("http")) hostingLoginUrl = "https://" + hostingLoginUrl;
				return {
					name,
					url,
					wpAdminUrl,
					wpUsername: get(row, "wpUsername"),
					wpPassword: get(row, "wpPassword"),
					hostingProvider: get(row, "hostingProvider"),
					hostingLoginUrl,
					hostingUsername: get(row, "hostingUsername"),
					hostingPassword: get(row, "hostingPassword"),
					category: get(row, "category") || "Personal",
					status: normalizeWebsiteStatus(get(row, "status")),
					notes: get(row, "notes"),
					plugins: toArray(get(row, "plugins")),
					tags: toArray(get(row, "tags")),
					dateAdded: now,
					lastUpdated: now
				};
			}
			case "links": {
				let url = get(row, "url") || extractUrl(row);
				let title = get(row, "title") || nameFromUrl(url) || "Untitled";
				if (!url && URL_REGEX.test(title)) {
					url = title;
					title = nameFromUrl(url);
				}
				URL_REGEX.lastIndex = 0;
				if (url && !url.startsWith("http")) url = "https://" + url;
				return {
					title,
					url,
					category: get(row, "category") || "Other",
					status: get(row, "status") || "active",
					description: get(row, "description"),
					dateAdded: now,
					pinned: toBool(get(row, "pinned")),
					tags: toArray(get(row, "tags"))
				};
			}
			case "tasks": {
				const rawTitle = get(row, "title") || Object.values(row).find((v) => v?.trim()) || "Untitled";
				const nlp = nlpExtractTask(rawTitle);
				const rawDueDate = get(row, "dueDate");
				const parsedDueDate = rawDueDate ? parseNaturalDate(rawDueDate) || rawDueDate : nlp.dueDate;
				return {
					title: nlp.title || rawTitle,
					priority: get(row, "priority") || nlp.priority || "medium",
					status: get(row, "status") || nlp.status || "todo",
					dueDate: parsedDueDate || now,
					category: get(row, "category") || "General",
					description: get(row, "description"),
					linkedProject: get(row, "linkedProject"),
					subtasks: [],
					tags: toArray(get(row, "tags")),
					createdAt: now
				};
			}
			case "repos": return {
				name: get(row, "name") || "unnamed-repo",
				url: get(row, "url") || extractUrl(row),
				description: get(row, "description"),
				language: get(row, "language") || "TypeScript",
				stars: parseInt(get(row, "stars")) || 0,
				forks: parseInt(get(row, "forks")) || 0,
				status: get(row, "status") || "active",
				demoUrl: get(row, "demoUrl"),
				progress: parseInt(get(row, "progress")) || 0,
				topics: toArray(get(row, "topics")),
				lastUpdated: now,
				devPlatformUrl: get(row, "devPlatformUrl"),
				deploymentUrl: get(row, "deploymentUrl")
			};
			case "buildProjects": return {
				name: get(row, "name") || "Unnamed",
				platform: get(row, "platform") || "other",
				projectUrl: get(row, "projectUrl"),
				deployedUrl: get(row, "deployedUrl"),
				description: get(row, "description"),
				techStack: toArray(get(row, "techStack")),
				status: get(row, "status") || "building",
				startedDate: now,
				lastWorkedOn: now,
				nextSteps: get(row, "nextSteps"),
				githubRepo: get(row, "githubRepo")
			};
			case "credentials": return {
				label: get(row, "label") || get(row, "name") || "Untitled",
				service: get(row, "service") || get(row, "provider") || get(row, "platform") || "",
				url: get(row, "url") || extractUrl(row),
				username: get(row, "username"),
				password: get(row, "password"),
				apiKey: get(row, "apiKey"),
				notes: get(row, "notes"),
				category: get(row, "category") || "Other",
				tags: toArray(get(row, "tags")),
				createdAt: now
			};
			case "payments": {
				const amountStr = get(row, "amount");
				const allVals = Object.values(row).join(" ");
				const amount = amountStr ? parseMoney(amountStr) ?? extractAmount(allVals) : extractAmount(allVals);
				const rawDueDate = get(row, "dueDate");
				const rawPaidDate = get(row, "paidDate");
				const status = normalizePaymentStatus(get(row, "status"), allVals);
				const dueDate = rawDueDate ? parseNaturalDate(rawDueDate) || rawDueDate : now;
				const paidDate = rawPaidDate ? parseNaturalDate(rawPaidDate) || rawPaidDate : status === "paid" ? dueDate || now : "";
				const isOverdue = status === "pending" && !!dueDate && dueDate < now;
				return {
					title: get(row, "title") || "Untitled",
					amount,
					currency: get(row, "currency") || extractCurrency(allVals),
					type: get(row, "type") || extractPaymentType(allVals) || "expense",
					status: isOverdue ? "overdue" : status,
					category: get(row, "category") || "Other",
					from: get(row, "from"),
					to: get(row, "to"),
					dueDate,
					paidDate,
					linkedProject: "",
					recurring: toBool(get(row, "recurring")),
					recurringInterval: "",
					notes: get(row, "notes"),
					createdAt: now
				};
			}
			case "notes": return {
				title: get(row, "title") || Object.values(row).find((v) => v?.trim()) || "Untitled",
				content: get(row, "content") || "",
				color: get(row, "color") || "blue",
				pinned: toBool(get(row, "pinned")),
				tags: toArray(get(row, "tags")),
				createdAt: now,
				updatedAt: now
			};
			case "ideas": return {
				title: get(row, "title") || Object.values(row).find((v) => v?.trim()) || "Untitled",
				description: get(row, "description") || "",
				category: get(row, "category") || "General",
				priority: get(row, "priority") || "medium",
				status: get(row, "status") || "spark",
				tags: toArray(get(row, "tags")),
				linkedProject: get(row, "linkedProject"),
				votes: parseInt(get(row, "votes")) || 0,
				createdAt: now,
				updatedAt: now
			};
			case "habits": return {
				name: get(row, "name") || Object.values(row).find((v) => v?.trim()) || "Untitled",
				icon: get(row, "icon") || "🎯",
				frequency: get(row, "frequency") || "daily",
				completions: [],
				streak: 0,
				color: get(row, "color") || "",
				createdAt: now
			};
			default: return {};
		}
	}).filter((item) => {
		if (TARGET_META$1[target].requiredFields.filter((f) => {
			const val = item[f];
			return val !== void 0 && val !== null && val !== "" && val !== "Unnamed" && val !== "Untitled" && val !== "unnamed-repo";
		}).length > 0) return true;
		const allVals = Object.values(item).filter((v) => typeof v === "string" && v.trim()).join(" ");
		return URL_REGEX.test(allVals) || allVals.length > 10;
	});
}
function generateTemplate(target) {
	const meta = TARGET_META$1[target];
	const headers = [...meta.requiredFields, ...meta.optionalFields];
	return headers.join(",") + "\n" + headers.map(() => "").join(",");
}
/**
* Attempt to split rows into multiple categories when the data contains
* mixed types (e.g., some rows have URLs → websites, some have amounts → payments).
* Returns null if data is homogeneous (single category is better).
*/
function tryMultiCategorySplit(rows, sourceFields) {
	if (rows.filter((r) => r.__type).length > 0) {
		const groups = /* @__PURE__ */ new Map();
		const unmarked = [];
		for (const row of rows) if (row.__type) {
			const t = row.__type;
			if (!groups.has(t)) groups.set(t, []);
			groups.get(t).push(row);
		} else unmarked.push(row);
		if (groups.size > 0 || unmarked.length > 0) {
			const categories = [];
			for (const [type, groupRows] of groups) {
				const target = type;
				if (!TARGET_META$1[target]) continue;
				const fieldMap = autoMapFields(Object.keys(groupRows[0]), target);
				const items = normalizeItems(groupRows, target, fieldMap);
				if (items.length > 0) categories.push({
					target,
					meta: TARGET_META$1[target],
					confidence: "high",
					items,
					fieldMap,
					score: 100
				});
			}
			if (unmarked.length > 0) {
				const best = autoDetectWithConfidence([...new Set(unmarked.flatMap((r) => Object.keys(r)))], unmarked)[0];
				if (best && best.validCount > 0) {
					const items = normalizeItems(unmarked, best.target, best.fieldMap);
					if (items.length > 0) {
						const existing = categories.find((c) => c.target === best.target);
						if (existing) existing.items.push(...items);
						else categories.push({
							target: best.target,
							meta: TARGET_META$1[best.target],
							confidence: best.confidence,
							items,
							fieldMap: best.fieldMap,
							score: best.score
						});
					}
				}
			}
			if (categories.length > 1 || categories.length === 1 && groups.size > 0) return categories;
		}
	}
	if (rows.length >= 3) {
		const homogeneousDetections = autoDetectWithConfidence(sourceFields, rows);
		const topDetection = homogeneousDetections[0];
		const secondDetection = homogeneousDetections[1];
		if (Boolean(topDetection && topDetection.validCount >= Math.max(2, Math.ceil(rows.length * .66)) && topDetection.score - (secondDetection?.score ?? 0) >= 8)) return null;
		const rowSignatures = rows.map((row) => {
			const values = Object.values(row).join(" ");
			const hasUrl = URL_REGEX.test(values);
			URL_REGEX.lastIndex = 0;
			const hasCurrency = CURRENCY_REGEX.test(values);
			CURRENCY_REGEX.lastIndex = 0;
			const hasEmail = EMAIL_REGEX.test(values);
			EMAIL_REGEX.lastIndex = 0;
			if (hasCurrency) return "payments";
			if (hasUrl && (row.username || row.password || row.wpAdminUrl)) return "websites";
			if (hasUrl) return "links";
			if (hasEmail && (row.password || row.apiKey)) return "credentials";
			return "tasks";
		});
		if (new Set(rowSignatures).size >= 2) {
			const groups = /* @__PURE__ */ new Map();
			rows.forEach((row, i) => {
				const type = rowSignatures[i];
				if (!groups.has(type)) groups.set(type, []);
				groups.get(type).push(row);
			});
			const categories = [];
			for (const [type, groupRows] of groups) {
				const target = type;
				if (!TARGET_META$1[target]) continue;
				const fieldMap = autoMapFields([...new Set(groupRows.flatMap((r) => Object.keys(r)))], target);
				const items = normalizeItems(groupRows, target, fieldMap);
				if (items.length > 0) categories.push({
					target,
					meta: TARGET_META$1[target],
					confidence: items.length >= 2 ? "medium" : "low",
					items,
					fieldMap,
					score: items.length * 10
				});
			}
			if (categories.length >= 2) return categories;
		}
	}
	return null;
}
/**
* Fully autonomous import: parse → detect → map → normalize → split.
* v15: Now supports multi-category output and express mode.
*/
function autonomousImport(text, fileName) {
	try {
		const dump = parseCredentialsDump(text);
		if (dump && dump.length > 0) {
			const totalItems = dump.reduce((sum, c) => sum + c.items.length, 0);
			return {
				categories: dump.sort((a, b) => b.items.length - a.items.length),
				parsedData: {
					rows: [],
					sourceFields: [],
					format: "text"
				},
				totalItems,
				expressReady: true
			};
		}
	} catch {}
	const parsedData = parseImportData(text, fileName);
	if (parsedData.rows.length === 0) return {
		categories: [],
		parsedData,
		totalItems: 0,
		expressReady: false
	};
	const multiSplit = tryMultiCategorySplit(parsedData.rows, parsedData.sourceFields);
	if (multiSplit && multiSplit.length > 0) {
		const totalItems = multiSplit.reduce((sum, c) => sum + c.items.length, 0);
		const allHigh = multiSplit.every((c) => c.confidence === "high");
		return {
			categories: multiSplit.sort((a, b) => b.items.length - a.items.length),
			parsedData,
			totalItems,
			expressReady: allHigh && totalItems > 0
		};
	}
	const detections = autoDetectWithConfidence(parsedData.sourceFields, parsedData.rows);
	let bestResult = null;
	for (const det of detections.slice(0, 3)) {
		const items = normalizeItems(parsedData.rows, det.target, det.fieldMap);
		if (items.length > 0 && (!bestResult || items.length > bestResult.items.length || items.length === bestResult.items.length && det.score > bestResult.score)) bestResult = {
			target: det.target,
			meta: TARGET_META$1[det.target],
			items,
			confidence: det.confidence,
			fieldMap: det.fieldMap,
			score: det.score
		};
	}
	if (!bestResult || bestResult.items.length === 0) {
		const allValues = parsedData.rows.flatMap((r) => Object.values(r)).join(" ");
		const hasUrls = URL_REGEX.test(allValues);
		URL_REGEX.lastIndex = 0;
		const fallbackTarget = /github\.com/i.test(allValues) ? "repos" : hasUrls ? "websites" : "tasks";
		const fieldMap = autoMapFields(parsedData.sourceFields, fallbackTarget);
		const items = normalizeItems(parsedData.rows, fallbackTarget, fieldMap);
		if (items.length > 0) bestResult = {
			target: fallbackTarget,
			meta: TARGET_META$1[fallbackTarget],
			items,
			confidence: "medium",
			fieldMap,
			score: 0
		};
	}
	const categories = bestResult ? [bestResult] : [];
	const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
	return {
		categories,
		parsedData,
		totalItems,
		expressReady: categories.length === 1 && categories[0].confidence === "high" && totalItems > 0
	};
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var InputSchema = objectType({
	text: stringType().max(2e5).optional(),
	fileName: stringType().optional(),
	images: arrayType(stringType().min(16).max(12e6)).max(6).optional()
}).refine((v) => v.text && v.text.trim().length > 0 || v.images && v.images.length > 0, { message: "Provide text or at least one image" });
var aiParseImport = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema.parse(input)).handler(createSsrRpc("c5549b3e0d1890139b14258b4a180430f7fded692955ec18742e1ec9fc7c8f3f"));
function stringifyRow(item) {
	const out = {};
	for (const [k, v] of Object.entries(item)) {
		if (v == null) continue;
		if (Array.isArray(v)) out[k] = v.join(", ");
		else if (typeof v === "object") out[k] = JSON.stringify(v);
		else out[k] = String(v);
	}
	return out;
}
/**
* AI-first autonomous import: sends raw text to Lovable AI Gateway,
* receives structured multi-category items, normalizes them through the
* existing importEngine so downstream dedup/import stays identical.
*/
async function aiAutonomousImport(text, fileName) {
	const dump = parseCredentialsDump(text);
	if (dump && dump.length > 0) {
		const normalizedCats = dump.map((c) => {
			const rows = c.items.map(stringifyRow);
			const fieldMap = autoMapFields(Array.from(new Set(rows.flatMap((r) => Object.keys(r)))), c.target);
			const items = normalizeItems(rows, c.target, fieldMap);
			return {
				target: c.target,
				meta: TARGET_META$1[c.target],
				confidence: "high",
				items,
				fieldMap,
				score: 100
			};
		}).filter((c) => c.items.length > 0);
		const totalItems = normalizedCats.reduce((s, c) => s + c.items.length, 0);
		if (totalItems > 0) return {
			categories: normalizedCats,
			parsedData: {
				rows: [],
				sourceFields: [],
				format: "text"
			},
			totalItems,
			expressReady: true
		};
	}
	const categories = ((await aiParseImport({ data: {
		text: redactSecretText(text),
		fileName
	} }))?.categories ?? []).map((c) => {
		const target = c.target;
		const rows = c.items.map(stringifyRow);
		const fieldMap = autoMapFields(Array.from(new Set(rows.flatMap((r) => Object.keys(r)))), target);
		const items = normalizeItems(rows, target, fieldMap);
		return {
			target,
			meta: TARGET_META$1[target],
			confidence: "high",
			items,
			fieldMap,
			score: 100
		};
	}).filter((c) => c.items.length > 0).sort((a, b) => b.items.length - a.items.length);
	const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
	return {
		categories,
		parsedData: {
			rows: [],
			sourceFields: [],
			format: "text"
		},
		totalItems,
		expressReady: totalItems > 0
	};
}
function buildCategories(cats) {
	return cats.map((c) => {
		const rows = c.items.map(stringifyRow);
		const fieldMap = autoMapFields(Array.from(new Set(rows.flatMap((r) => Object.keys(r)))), c.target);
		const items = normalizeItems(rows, c.target, fieldMap);
		return {
			target: c.target,
			meta: TARGET_META$1[c.target],
			confidence: "high",
			items,
			fieldMap,
			score: 100
		};
	}).filter((c) => c.items.length > 0).sort((a, b) => b.items.length - a.items.length);
}
/**
* Vision import: send photos of handwritten notes / whiteboards / screenshots
* to the AI, which OCRs the handwriting and classifies every item.
*/
async function aiImageImport(images, fileName, note) {
	const categories = buildCategories((await aiParseImport({ data: {
		images,
		fileName,
		text: note ? redactSecretText(note) : note
	} }))?.categories ?? []);
	const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
	return {
		categories,
		parsedData: {
			rows: [],
			sourceFields: [],
			format: "text"
		},
		totalItems,
		expressReady: totalItems > 0
	};
}
var MOBILE_BREAKPOINT = 768;
function useIsMobile() {
	const [isMobile, setIsMobile] = import_react.useState(void 0);
	import_react.useEffect(() => {
		const mql = window.matchMedia(`(max-width: 767px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return () => mql.removeEventListener("change", onChange);
	}, []);
	return !!isMobile;
}
var useSettingsStore = create((set, get) => ({
	userName: "Alex",
	userRole: "Digital Creator & Developer",
	theme: "dark",
	isLoading: true,
	setTheme: (t) => {
		set({ theme: t });
		db.settings.update("default", { theme: t });
		applyTheme(t);
	},
	toggleTheme: () => {
		const order = [
			"dark",
			"sage",
			"light"
		];
		const next = order[(order.indexOf(get().theme === "system" ? "dark" : get().theme) + 1) % order.length];
		get().setTheme(next);
	},
	updateSettings: async (changes) => {
		await db.settings.update("default", changes);
		if (changes.userName) set({ userName: changes.userName });
		if (changes.userRole) set({ userRole: changes.userRole });
		if (changes.theme) {
			set({ theme: changes.theme });
			applyTheme(changes.theme);
		}
	},
	loadSettings: async () => {
		const settings = await db.settings.get("default");
		if (settings) {
			set({
				userName: settings.userName || "Alex",
				userRole: settings.userRole || "Digital Creator & Developer",
				theme: settings.theme || "sage",
				isLoading: false
			});
			applyTheme(settings.theme || "sage");
		} else {
			set({ isLoading: false });
			applyTheme("sage");
		}
	}
}));
function applyTheme(theme) {
	const root = document.documentElement;
	if (theme === "sage") {
		root.classList.remove("dark");
		root.setAttribute("data-theme", "sage");
		return;
	}
	root.removeAttribute("data-theme");
	const isDark = theme === "dark" || theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
	root.classList.toggle("dark", isDark);
}
var useNavigationStore = create()(persist((set, get) => ({
	activeSection: "dashboard",
	setActiveSection: (section) => {
		set({ activeSection: section });
		get().pushRecent(section);
	},
	sidebarOpen: false,
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	sidebarCollapsed: false,
	setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
	toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
	recentSections: [],
	pushRecent: (section) => {
		const recent = get().recentSections.filter((s) => s !== section);
		recent.unshift(section);
		set({ recentSections: recent.slice(0, 8) });
	},
	commandPaletteOpen: false,
	setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
	importModalOpen: false,
	setImportModalOpen: (open) => set({ importModalOpen: open }),
	focusTaskId: null,
	setFocusTaskId: (id) => set({ focusTaskId: id }),
	focusEntity: null,
	setFocusEntity: (e) => set({ focusEntity: e })
}), {
	name: "mc-navigation-v1",
	partialize: (state) => ({
		recentSections: state.recentSections,
		sidebarCollapsed: state.sidebarCollapsed
	})
}));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var STORAGE_KEY = "google_tasks_email_v1";
function getGoogleTasksOAuthDiagnostics() {
	const origin = getGoogleOrigin();
	const clientId = getGoogleClientId();
	const hasId = /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId);
	return {
		origin,
		embedded: typeof window !== "undefined" && window.self !== window.top,
		scopes: GOOGLE_SCOPES,
		mode: hasId ? "Direct Google OAuth (user Client ID)" : "Not configured",
		clientIdConfigured: hasId
	};
}
function formatGoogleAuthError(error) {
	const raw = typeof error === "string" ? error : error && typeof error === "object" && "message" in error ? String(error.message) : "";
	const lower = raw.toLowerCase();
	if (lower.includes("origin_mismatch") || lower.includes("invalid_origin") || lower.includes("origin mismatch")) return /* @__PURE__ */ new Error(`Google rejected this app origin (${originLabel()}). Open Google Cloud Console → Credentials → your OAuth client → add this origin under "Authorized JavaScript origins", then try again.`);
	if (lower.includes("popup")) return /* @__PURE__ */ new Error("Google sign-in popup was blocked. Allow popups for this site and try again.");
	if (lower.includes("idpiframe") || lower.includes("iframe")) return /* @__PURE__ */ new Error("Google blocked the sign-in frame. Try again from the standalone app tab.");
	return new Error(raw || "Google sign-in failed");
}
function originLabel() {
	return getGoogleOrigin() || "this origin";
}
async function ensureToken(interactive = false) {
	const token = validGoogleToken();
	if (token) return token;
	if (!interactive) throw new Error("Not connected to Google Tasks");
	try {
		return await requestGoogleToken({ scope: GTASKS_SCOPE });
	} catch (err) {
		throw formatGoogleAuthError(err);
	}
}
async function signIn() {
	if (typeof window === "undefined") throw new Error("Google sign-in is only available in the browser");
	if (!getGoogleClientId()) throw new Error("Google isn't connected yet. Open Settings → Google Connection, paste your Google OAuth Client ID, then come back and press Connect.");
	try {
		const email = await fetchGoogleEmail((await requestGoogleToken({ prompt: "select_account" })).access_token);
		if (email) try {
			localStorage.setItem(STORAGE_KEY, email);
		} catch {}
	} catch (err) {
		throw formatGoogleAuthError(err);
	}
}
function isSignedIn() {
	return readGoogleToken() !== null;
}
async function refreshSignInState() {
	return validGoogleToken() !== null;
}
function signOut() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {}
	clearGoogleToken();
}
async function api(path, init = {}) {
	const token = await ensureToken();
	const res = await fetch(`https://tasks.googleapis.com/tasks/v1${path}`, {
		...init,
		headers: {
			...init.headers || {},
			Authorization: `Bearer ${token.access_token}`,
			"Content-Type": "application/json"
		}
	});
	if (res.status === 401) {
		clearGoogleToken();
		throw new Error("Google Tasks session expired — please sign in again");
	}
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google Tasks ${res.status}: ${text.slice(0, 200)}`);
	}
	if (res.status === 204) return void 0;
	return res.json();
}
async function listTaskLists() {
	return (await api("/users/@me/lists")).items || [];
}
async function listTasks(listId, showCompleted = false) {
	const qs = new URLSearchParams({
		maxResults: "100",
		showCompleted: String(showCompleted),
		showHidden: "false"
	});
	return (await api(`/lists/${encodeURIComponent(listId)}/tasks?${qs}`)).items || [];
}
async function createTask(listId, body) {
	return api(`/lists/${encodeURIComponent(listId)}/tasks`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
async function updateTask(listId, taskId, body) {
	return api(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
		method: "PATCH",
		body: JSON.stringify(body)
	});
}
async function deleteTask(listId, taskId) {
	await api(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}
function GoogleSetupModal({ open, onClose }) {
	const [value, setValue] = (0, import_react.useState)(() => getGoogleClientId());
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [saved, setSaved] = (0, import_react.useState)(hasGoogleClientId());
	const origin = getGoogleOrigin();
	if (!open) return null;
	const handleSave = () => {
		setGoogleClientId(value);
		setSaved(/\.apps\.googleusercontent\.com$/.test(value.trim()));
		window.dispatchEvent(new Event("mc-google-client-id-changed"));
	};
	const copyOrigin = async () => {
		try {
			await navigator.clipboard.writeText(origin);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-5 py-4 border-b border-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, {
							size: 16,
							className: "text-primary"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-bold text-foreground",
							children: "Connect Google — one-time setup"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "p-1.5 rounded-lg hover:bg-secondary text-muted-foreground",
						"aria-label": "Close",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 16 })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-5 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground leading-relaxed",
							children: [
								"This app talks to Google directly from your browser — no third-party servers. To do that, Google needs an OAuth Client ID that authorizes",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold text-foreground",
									children: origin
								}),
								". It takes about 3 minutes, once."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border bg-secondary/30 p-3 space-y-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] font-semibold text-foreground",
								children: "Steps in Google Cloud Console:"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
								className: "text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										"Open",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: "https://console.cloud.google.com/apis/credentials",
											target: "_blank",
											rel: "noreferrer",
											className: "text-primary underline underline-offset-2 inline-flex items-center gap-0.5",
											children: ["console.cloud.google.com → Credentials ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 9 })]
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										"Enable the ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground font-medium",
											children: "Google Calendar API"
										}),
										" ",
										"and ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground font-medium",
											children: "Google Tasks API"
										}),
										" (APIs & Services → Library)."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "OAuth consent screen → External → add your Google account as a Test user (or Publish the app)." }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										"Create Credentials →",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground font-medium",
											children: "OAuth client ID"
										}),
										" → Web application."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										"Under",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground font-medium",
											children: "Authorized JavaScript origins"
										}),
										" ",
										"add:",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: copyOrigin,
											className: "mt-1.5 w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border font-mono text-[10px] text-foreground hover:border-primary/40 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate",
												children: origin
											}), copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
												size: 11,
												className: "text-green-500 shrink-0"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
												size: 11,
												className: "text-muted-foreground shrink-0"
											})]
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										"Copy the Client ID (ends in",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono",
											children: ".apps.googleusercontent.com"
										}),
										") and paste it below."
									] })
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-semibold text-foreground",
									htmlFor: "mc-google-client-id",
									children: "Google OAuth Client ID"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "mc-google-client-id",
									type: "text",
									value,
									onChange: (e) => {
										setValue(e.target.value);
										setSaved(false);
									},
									placeholder: "123456789-abcdefg.apps.googleusercontent.com",
									className: "w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
								}),
								value.trim() && !/\.apps\.googleusercontent\.com$/.test(value.trim()) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-amber-500",
									children: "Client IDs end in .apps.googleusercontent.com — double-check what you pasted."
								})
							]
						}),
						saved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { size: 12 }), " Google Client ID saved. Press Connect on the calendar."]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-end gap-2 px-5 py-4 border-t border-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary",
						children: saved ? "Done" : "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: handleSave,
						disabled: !value.trim(),
						className: "px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors",
						children: "Save Client ID"
					})]
				})
			]
		})
	});
}
var CAPTURE_FOCUS_EVENT = "mc:capture-focus";
var TARGET_META = {
	tasks: {
		icon: ListChecks,
		label: "Task",
		tone: "text-primary"
	},
	reminders: {
		icon: Bell,
		label: "Reminder",
		tone: "text-info"
	},
	notes: {
		icon: StickyNote,
		label: "Note",
		tone: "text-amber-500"
	},
	ideas: {
		icon: Lightbulb,
		label: "Idea",
		tone: "text-violet-500"
	},
	links: {
		icon: Link2,
		label: "Link",
		tone: "text-emerald-500"
	}
};
function QuickCaptureBar({ autoFocus = false }) {
	const [text, setText] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [ov, setOv] = (0, import_react.useState)({});
	const inputRef = (0, import_react.useRef)(null);
	const startedAt = (0, import_react.useRef)(null);
	const addItem = useAddItem();
	const { area: areaFilter, bump } = usePlanStore();
	(0, import_react.useEffect)(() => {
		const focus = () => inputRef.current?.focus();
		window.addEventListener(CAPTURE_FOCUS_EVENT, focus);
		return () => window.removeEventListener(CAPTURE_FOCUS_EVENT, focus);
	}, []);
	const parsed = (0, import_react.useMemo)(() => text.trim() ? parseCapture(text) : null, [text]);
	const preview = (0, import_react.useMemo)(() => {
		if (!parsed) return null;
		const merged = {
			...parsed,
			...ov
		};
		if (!merged.area && areaFilter !== "all") merged.area = areaFilter;
		if (merged.due && !merged.dateRole) merged.dateRole = "scheduled";
		if (ov.due === "") {
			delete merged.due;
			delete merged.dateRole;
			delete merged.dateText;
		}
		return merged;
	}, [
		parsed,
		ov,
		areaFilter
	]);
	const meta = preview ? TARGET_META[preview.target] : null;
	const reset = () => {
		setText("");
		setOv({});
		startedAt.current = null;
	};
	const save = async () => {
		if (!preview || saving) return;
		setSaving(true);
		try {
			await addItem(preview.target, toRecord(preview));
			const isInbox = preview.target === "tasks" && !preview.due;
			toast.success(isInbox ? "Captured to Inbox" : `${TARGET_META[preview.target].label} captured`, { description: preview.title.slice(0, 60) });
			if (startedAt.current) bump("captureMsTotal", Date.now() - startedAt.current);
			bump("captures");
			reset();
		} catch (e) {
			toast.error("Capture failed", { description: String(e.message ?? e) });
		} finally {
			setSaving(false);
		}
	};
	const isTask = preview?.target === "tasks";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "se-capture p-3 sm:p-4",
		"aria-label": "Quick capture",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ultra-capture-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CornerDownLeft, { size: 16 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: inputRef,
					autoFocus,
					value: text,
					onChange: (e) => {
						if (!startedAt.current) startedAt.current = Date.now();
						setText(e.target.value);
					},
					onKeyDown: (e) => {
						if (e.key === "Enter") save();
						if (e.key === "Escape") reset();
					},
					"aria-label": "Capture a task, note, idea, link or reminder",
					placeholder: "What needs doing? e.g. \"Send proposal by Friday, 45 min, Work\"",
					className: "min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/55"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
					className: "hidden rounded-md border border-border/50 bg-secondary/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline",
					children: "N"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: save,
					disabled: !preview || saving,
					className: "se-btn se-btn-primary h-10 px-4 text-[12px] disabled:opacity-40",
					children: saving ? "..." : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 14 }), " Save"] })
				})
			]
		}), preview && meta && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2.5 flex flex-wrap items-center gap-1.5 pl-0 sm:pl-[52px]",
			role: "group",
			"aria-label": "Interpreted details — click a chip to change it",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					tone: meta.tone,
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(meta.icon, { size: 11 }),
					label: meta.label,
					onClick: () => {
						const order = [
							"tasks",
							"notes",
							"ideas",
							"reminders",
							"links"
						];
						setOv((o) => ({
							...o,
							target: order[(order.indexOf(preview.target) + 1) % order.length]
						}));
					},
					hint: "Click to change where this lands"
				}),
				preview.due ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { size: 11 }),
					label: `${preview.dateRole === "deadline" ? "Due" : "Plan for"} ${preview.due.slice(5)}`,
					strong: preview.dateRole === "deadline",
					hint: preview.dateRole === "deadline" ? `"${preview.dateText ?? preview.due}" read as a deadline. Click to make it a plan instead.` : `"${preview.dateText ?? preview.due}" read as when you'll work on it — not a deadline. Click to make it the deadline.`,
					onClick: () => setOv((o) => ({
						...o,
						dateRole: preview.dateRole === "deadline" ? "scheduled" : "deadline"
					})),
					onClear: () => setOv((o) => ({
						...o,
						due: ""
					}))
				}) : isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { size: 11 }),
					label: "Inbox · no date",
					hint: "Title only. Decide the date later."
				}),
				preview.time && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 11 }),
					label: preview.time
				}),
				isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { size: 11 }),
					label: preview.durationMin ? fmtMinutes(preview.durationMin) : "est. 30 min",
					hint: "Click to cycle the estimate",
					onClick: () => {
						const steps = [
							15,
							30,
							45,
							60,
							90,
							120
						];
						const cur = preview.durationMin ?? 30;
						const next = steps[(steps.indexOf(cur) + 1) % steps.length] ?? 30;
						setOv((o) => ({
							...o,
							durationMin: next
						}));
					}
				}),
				isTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: preview.area === "personal" ? "Personal" : "Work",
					hint: "Visibility only — click to switch",
					onClick: () => setOv((o) => ({
						...o,
						area: (preview.area ?? "work") === "work" ? "personal" : "work"
					}))
				}),
				preview.priority && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, { size: 11 }),
					label: preview.priority,
					onClear: () => setOv((o) => ({
						...o,
						priority: void 0
					}))
				})
			]
		})]
	});
}
function Chip({ icon, label, hint, tone, strong, onClick, onClear }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center overflow-hidden rounded-full border border-border/50 bg-secondary/50 text-[10.5px] font-semibold",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(onClick ? "button" : "span", {
			type: onClick ? "button" : void 0,
			onClick,
			title: hint,
			className: `inline-flex items-center gap-1 px-2.5 py-1 ${tone ?? "text-foreground/80"} ${strong ? "bg-primary/10 text-primary" : ""} ${onClick ? "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" : ""}`,
			children: [
				icon,
				" ",
				label
			]
		}), onClear && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onClear,
			"aria-label": `Remove ${label}`,
			className: "px-1.5 py-1 text-muted-foreground hover:text-destructive",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 10 })
		})]
	});
}
var defaults = {
	highContrast: false,
	fontScale: 1,
	motion: "system",
	alwaysShowFocus: false,
	underlineLinks: false
};
function applyToDom(s) {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	root.classList.toggle("a11y-contrast", s.highContrast);
	root.classList.toggle("a11y-reduce-motion", s.motion === "reduced");
	root.classList.toggle("a11y-focus-always", s.alwaysShowFocus);
	root.classList.toggle("a11y-underline-links", s.underlineLinks);
	root.style.setProperty("--a11y-font-scale", String(s.fontScale));
	root.style.fontSize = `${Math.round(16 * s.fontScale)}px`;
}
var useA11yStore = create()(persist((set, get) => ({
	...defaults,
	set: (patch) => {
		set(patch);
		const s = get();
		applyToDom({
			highContrast: s.highContrast,
			fontScale: s.fontScale,
			motion: s.motion,
			alwaysShowFocus: s.alwaysShowFocus,
			underlineLinks: s.underlineLinks
		});
	},
	reset: () => {
		set(defaults);
		applyToDom(defaults);
	},
	apply: () => {
		const s = get();
		applyToDom({
			highContrast: s.highContrast,
			fontScale: s.fontScale,
			motion: s.motion,
			alwaysShowFocus: s.alwaysShowFocus,
			underlineLinks: s.underlineLinks
		});
	}
}), {
	name: "mc-a11y-v1",
	partialize: (s) => ({
		highContrast: s.highContrast,
		fontScale: s.fontScale,
		motion: s.motion,
		alwaysShowFocus: s.alwaysShowFocus,
		underlineLinks: s.underlineLinks
	}),
	onRehydrateStorage: () => (state) => state?.apply()
}));
var REMINDER_OFFSETS = {
	"at-time": 0,
	"5min": 3e5,
	"15min": 9e5,
	"30min": 18e5,
	"1hr": 36e5,
	"2hr": 72e5,
	"1day": 864e5
};
var REMINDER_LABELS = {
	none: "No reminder",
	"at-time": "At due time",
	"5min": "5 minutes before",
	"15min": "15 minutes before",
	"30min": "30 minutes before",
	"1hr": "1 hour before",
	"2hr": "2 hours before",
	"1day": "1 day before"
};
/** Get a human-readable label for any reminder key (including custom) */
function getReminderLabel(key) {
	if (REMINDER_LABELS[key]) return REMINDER_LABELS[key];
	if (key.startsWith("custom:")) {
		const mins = parseInt(key.split(":")[1], 10);
		if (isNaN(mins)) return key;
		if (mins < 60) return `${mins} minutes before`;
		if (mins === 60) return "1 hour before";
		if (mins < 1440) {
			const h = Math.floor(mins / 60);
			const m = mins % 60;
			return m ? `${h}h ${m}m before` : `${h} hours before`;
		}
		const d = Math.floor(mins / 1440);
		const rem = mins % 1440;
		if (rem === 0) return `${d} day${d > 1 ? "s" : ""} before`;
		return `${d}d ${Math.floor(rem / 60)}h before`;
	}
	return key;
}
/** Get offset in ms for a reminder key */
function getOffsetMs(key) {
	if (REMINDER_OFFSETS[key] !== void 0) return REMINDER_OFFSETS[key];
	if (key.startsWith("custom:")) {
		const mins = parseInt(key.split(":")[1], 10);
		if (!isNaN(mins)) return mins * 6e4;
	}
	return 0;
}
/** Request browser notification permission (call once on user action) */
async function requestNotificationPermission() {
	if (!("Notification" in window)) return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	return await Notification.requestPermission() === "granted";
}
/** Get the due datetime in ms */
function getDueMs(task) {
	if (!task.dueDate) return null;
	const dateStr = task.dueDate;
	const timeStr = task.allDay === false && task.startTime ? task.startTime : "09:00";
	const dueMs = (/* @__PURE__ */ new Date(`${dateStr}T${timeStr}`)).getTime();
	return isNaN(dueMs) ? null : dueMs;
}
/** Fire a notification (browser + in-app toast) */
function fireNotification(task, label) {
	const body = `${label} — ${task.title}`;
	toast.info(`🔔 Reminder: ${task.title}`, {
		description: label,
		duration: 1e4
	});
	if ("Notification" in window && Notification.permission === "granted") try {
		new Notification("Mission Control Reminder", {
			body,
			icon: "/favicon.ico",
			tag: `task-${task.id}-${Date.now()}`
		});
	} catch {}
}
var intervalId = null;
var visibilityHandler = null;
var DIGEST_KEY = "mc:lastOverdueDigest";
/** Fires a once-per-day summary of everything overdue / due today. */
async function overdueDigestCheck(tasks) {
	if (typeof localStorage === "undefined") return;
	const { buildBriefing, todayISO } = await import("./overdue-CpArWbx3.mjs").then((n) => n.c).then((n) => n.c);
	const today = todayISO();
	if (localStorage.getItem(DIGEST_KEY) === today) return;
	const briefing = buildBriefing(tasks, today);
	if (briefing.overdue.length === 0 && briefing.dueToday.length === 0) return;
	localStorage.setItem(DIGEST_KEY, today);
	const summary = briefing.overdue.length ? `${briefing.overdue.length} overdue · ${briefing.dueToday.length} due today` : `${briefing.dueToday.length} due today`;
	const preview = [...briefing.overdue, ...briefing.dueToday].slice(0, 3).map((t) => `• ${t.title}`).join("\n");
	toast.warning(`📋 Daily briefing — ${summary}`, {
		description: preview,
		duration: 15e3
	});
	if ("Notification" in window && Notification.permission === "granted") try {
		new Notification(`Mission Control — ${summary}`, {
			body: preview,
			icon: "/favicon.ico",
			tag: `digest-${today}`
		});
	} catch {}
}
var check = async () => {
	try {
		const now = Date.now();
		const tasks = await db.tasks.toArray();
		await overdueDigestCheck(tasks);
		for (const task of tasks) {
			if (task.status === "done") continue;
			const reminders = task.reminders;
			if (reminders && reminders.length > 0) {
				const dueMs = getDueMs(task);
				if (!dueMs) continue;
				const fired = new Set(task.remindersFired || []);
				let newFired = false;
				for (const key of reminders) {
					if (key === "none" || fired.has(key)) continue;
					if (now >= dueMs - getOffsetMs(key)) {
						fireNotification(task, getReminderLabel(key));
						fired.add(key);
						newFired = true;
					}
				}
				if (newFired) {
					await db.tasks.update(task.id, { remindersFired: Array.from(fired) });
					markCloudRecordDirty("tasks", task.id);
					queueCloudPush();
				}
				continue;
			}
			if (!task.reminder || task.reminder === "none") continue;
			if (task.reminderFired) continue;
			const dueMs = getDueMs(task);
			if (!dueMs) continue;
			if (now >= dueMs - (REMINDER_OFFSETS[task.reminder] ?? 0)) {
				fireNotification(task, REMINDER_LABELS[task.reminder] || task.reminder);
				await db.tasks.update(task.id, { reminderFired: true });
				markCloudRecordDirty("tasks", task.id);
				queueCloudPush();
			}
		}
	} catch (e) {
		console.error("Notification check error:", e);
	}
};
function startTimer() {
	if (intervalId) return;
	intervalId = setInterval(check, 3e4);
}
function stopTimer() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
}
/** Start the notification checker loop (call once from a top-level component) */
function startNotificationLoop() {
	check();
	if (typeof document !== "undefined" && document.hidden) {} else startTimer();
	if (!visibilityHandler && typeof document !== "undefined") {
		visibilityHandler = () => {
			if (document.hidden) stopTimer();
			else {
				check();
				startTimer();
			}
		};
		document.addEventListener("visibilitychange", visibilityHandler);
	}
}
/** Stop the notification loop */
function stopNotificationLoop() {
	stopTimer();
	if (visibilityHandler && typeof document !== "undefined") {
		document.removeEventListener("visibilitychange", visibilityHandler);
		visibilityHandler = null;
	}
}
var Toaster$1 = ({ ...props }) => {
	const { theme = "system" } = z();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		theme,
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
var TooltipProvider = Provider;
var TooltipContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className),
	...props
}));
TooltipContent.displayName = Content2.displayName;
var DashboardContext = (0, import_react.createContext)(null);
async function ensureSettingsRow() {
	if (await db.settings.get("default")) return;
	await db.settings.put({
		id: "default",
		userName: "",
		userRole: "",
		theme: "dark",
		sidebarCollapsed: false,
		dashboardLayout: []
	});
}
function DashboardProvider({ children }) {
	const loadSettings = useSettingsStore((s) => s.loadSettings);
	const setIsLoadingStore = useDataStore((s) => s.setIsLoading);
	const setDashboardLayout = useDataStore((s) => s.setDashboardLayout);
	const [isLoading, setIsLoading] = (0, import_react.useState)(true);
	const initialized = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (initialized.current) return;
		initialized.current = true;
		(async () => {
			try {
				await migrateFromLocalStorage();
				let cloudRestored = 0;
				try {
					cloudRestored = (await startCloudSync()).restored;
				} catch (e) {
					console.warn("Cloud sync unavailable:", e);
				}
				if (cloudRestored === 0) {
					const [t, w, r, b] = await Promise.all([
						db.tasks.count(),
						db.websites.count(),
						db.repos.count(),
						db.buildProjects.count()
					]);
					if (t + w + r + b === 0) await restoreLatestNonEmptyVersion();
				}
				await ensureSettingsRow();
				await deduplicateAll();
				await loadSettings();
				const settings = await db.settings.get("default");
				if (settings?.dashboardLayout) setDashboardLayout(settings.dashboardLayout);
			} catch (e) {
				console.error("DB init error:", e);
			} finally {
				setIsLoading(false);
				setIsLoadingStore(false);
			}
		})();
	}, [
		loadSettings,
		setIsLoadingStore,
		setDashboardLayout
	]);
	const value = import_react.useMemo(() => ({ isLoading }), [isLoading]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardContext.Provider, {
		value,
		children
	});
}
function useDashboardOptional() {
	return (0, import_react.useContext)(DashboardContext);
}
var navGroups = [{
	label: "NOW",
	items: [
		{
			id: "dashboard",
			label: "Home",
			icon: House
		},
		{
			id: "tasks",
			label: "Tasks",
			icon: SquareCheckBig
		},
		{
			id: "review",
			label: "Review",
			icon: RefreshCcw
		},
		{
			id: "calendar",
			label: "Calendar",
			icon: Calendar
		},
		{
			id: "control-center",
			label: "Captures",
			icon: Radar
		}
	]
}, {
	label: "CORE",
	items: [
		{
			id: "decisions",
			label: "Findings",
			icon: Scale
		},
		{
			id: "reminders",
			label: "Reminders",
			icon: Bell
		},
		{
			id: "notes",
			label: "Notes",
			icon: FileText
		}
	]
}];
var modulesNav = [
	{
		id: "projects",
		label: "Projects",
		icon: PanelsTopLeft
	},
	{
		id: "websites",
		label: "Websites",
		icon: Globe
	},
	{
		id: "wp-manage",
		label: "WordPress",
		icon: Zap
	},
	{
		id: "seo",
		label: "SEO",
		icon: Search
	},
	{
		id: "industry",
		label: "Trends",
		icon: Newspaper
	},
	{
		id: "mentions",
		label: "Mentions",
		icon: AtSign
	},
	{
		id: "audience",
		label: "Audience",
		icon: Users
	},
	{
		id: "payments",
		label: "Finance",
		icon: DollarSign
	},
	{
		id: "habits",
		label: "Habits",
		icon: Flame
	},
	{
		id: "ideas",
		label: "Ideas",
		icon: Lightbulb
	},
	{
		id: "credentials",
		label: "Credentials",
		icon: KeyRound
	},
	{
		id: "links",
		label: "Links Hub",
		icon: Link2
	},
	{
		id: "github",
		label: "GitHub",
		icon: Github
	},
	{
		id: "builds",
		label: "Build Projects",
		icon: Hammer
	},
	{
		id: "google-tasks",
		label: "Google Tasks",
		icon: SquareCheckBig
	},
	{
		id: "cloudflare",
		label: "Cloudflare",
		icon: Cloud
	},
	{
		id: "vercel",
		label: "Vercel",
		icon: Rocket
	},
	{
		id: "openclaw",
		label: "OpenClaw",
		icon: Bug
	},
	{
		id: "focus",
		label: "Focus Timer",
		icon: Timer
	},
	{
		id: "settings",
		label: "Settings",
		icon: Settings
	}
];
var archivedNav = [
	{
		id: "dashboard",
		label: "Dashboard",
		icon: House
	},
	{
		id: "habits",
		label: "Habits",
		icon: Flame
	},
	{
		id: "ideas",
		label: "Ideas",
		icon: Lightbulb
	},
	{
		id: "credentials",
		label: "Credentials",
		icon: KeyRound
	},
	{
		id: "links",
		label: "Links Hub",
		icon: Link2
	},
	{
		id: "github",
		label: "GitHub",
		icon: Github
	},
	{
		id: "builds",
		label: "Build Projects",
		icon: Hammer
	},
	{
		id: "google-tasks",
		label: "Google Tasks",
		icon: SquareCheckBig
	},
	{
		id: "cloudflare",
		label: "Cloudflare",
		icon: Cloud
	},
	{
		id: "vercel",
		label: "Vercel",
		icon: Rocket
	},
	{
		id: "openclaw",
		label: "OpenClaw",
		icon: Bug
	}
];
function Sidebar() {
	const tasks = useTasks();
	const payments = usePayments();
	const ideas = useIdeas();
	const customModules = useCustomModules();
	const addItem = useAddItem();
	const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useNavigationStore();
	const { userName, userRole, theme, toggleTheme } = useSettingsStore();
	const [addingTo, setAddingTo] = (0, import_react.useState)(null);
	const [newModName, setNewModName] = (0, import_react.useState)("");
	const [newModEmoji, setNewModEmoji] = (0, import_react.useState)("📁");
	const [archiveOpen, setArchiveOpen] = (0, import_react.useState)(false);
	const [modulesOpen, setModulesOpen] = (0, import_react.useState)(false);
	const inModules = modulesNav.some((m) => m.id === activeSection);
	(0, import_react.useEffect)(() => {
		if (inModules) setModulesOpen(true);
	}, [inModules]);
	const openTaskCount = tasks.filter((t) => t.status !== "done").length;
	const overduePayments = payments.filter((p) => p.status === "overdue").length;
	const activeIdeas = ideas.filter((i) => i.status === "exploring" || i.status === "validated").length;
	const getBadge = (id) => {
		if (id === "tasks") return openTaskCount || null;
		if (id === "payments" && overduePayments > 0) return overduePayments;
		if (id === "ideas" && activeIdeas > 0) return activeIdeas;
		return null;
	};
	const isCollapsed = sidebarCollapsed;
	const handleAddModule = async (groupLabel) => {
		if (!newModName.trim()) return;
		if (await addItem("customModules", {
			name: newModName.trim(),
			icon: newModEmoji,
			description: "",
			fields: [
				{
					key: "name",
					label: "Name",
					type: "text"
				},
				{
					key: "url",
					label: "URL",
					type: "url"
				},
				{
					key: "notes",
					label: "Notes",
					type: "textarea"
				}
			],
			data: [],
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			order: customModules.length,
			visible: true,
			color: ""
		})) toast.success(`"${newModName}" added!`);
		else toast.error(`"${newModName}" already exists`);
		setNewModName("");
		setNewModEmoji("📁");
		setAddingTo(null);
	};
	const emojiOptions = [
		"📁",
		"📊",
		"🎯",
		"🏷️",
		"📱",
		"🖥️",
		"🎨",
		"📐",
		"🔧",
		"⚙️",
		"🌟",
		"💎",
		"🏠",
		"📈",
		"🛒",
		"📡",
		"🔬",
		"🎮",
		"🎵",
		"📚"
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [sidebarOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm lg:hidden",
		onClick: () => setSidebarOpen(false)
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: `fixed top-0 left-0 z-50 h-full flex flex-col bg-sidebar/95 text-sidebar-foreground backdrop-blur-2xl border-r border-sidebar-border/70 shadow-[18px_0_60px_-44px_hsl(var(--foreground)/0.7)]
          lg:relative lg:translate-x-0 transition-all duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`,
		style: { width: isCollapsed ? 72 : 260 },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setSidebarOpen(false),
				className: "absolute top-5 right-5 lg:hidden text-muted-foreground hover:text-foreground transition-colors touch-manipulation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `h-[72px] flex items-center border-b border-sidebar-border/70 ${isCollapsed ? "justify-center px-3" : "px-5 gap-3"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-extrabold text-base flex-shrink-0 ring-1 ring-sidebar-primary/30",
					style: { boxShadow: "var(--shadow-primary)" },
					children: "N"
				}), !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-bold text-[15px] text-sidebar-foreground tracking-tight",
						children: "Nexus"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] text-sidebar-foreground/45 font-medium",
						children: "Mission Control"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setSidebarCollapsed(!isCollapsed),
				className: "hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 w-7 h-7 items-center justify-center rounded-full bg-sidebar border border-sidebar-border shadow-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-110 transition-all",
				children: isCollapsed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { size: 12 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "flex-1 overflow-y-auto px-3 py-5 space-y-5",
				children: [
					navGroups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						!isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between px-3 mb-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/35 uppercase",
								children: group.label
							}), group.label !== "GENERAL" && group.label !== "SYSTEM" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setAddingTo(addingTo === group.label ? null : group.label),
								className: "p-0.5 rounded text-sidebar-foreground/25 hover:text-sidebar-primary transition-all hover:scale-110",
								title: `Add to ${group.label}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 11 })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-0.5",
							children: group.items.map((item) => {
								const active = activeSection === item.id;
								const badge = getBadge(item.id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => {
										setActiveSection(item.id);
										setSidebarOpen(false);
									},
									className: `w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all duration-200 group relative
                        ${isCollapsed ? "justify-center px-0 rounded-xl" : "rounded-xl"}
                        ${item.indent && !isCollapsed ? "ml-5 border-l border-sidebar-border/40 pl-4" : ""}
                        ${active ? "v10-nav-active bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-1 ring-sidebar-primary/35" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"}`,
									style: active ? { boxShadow: "0 12px 30px -18px hsl(var(--sidebar-primary) / 0.9)" } : void 0,
									title: isCollapsed ? item.label : void 0,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
											size: 16,
											strokeWidth: active ? 2.2 : 1.5,
											className: "flex-shrink-0"
										}),
										!isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "flex-1 text-left truncate",
											children: item.label
										}),
										badge !== null && !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-[10px] font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"}`,
											children: badge
										}),
										badge !== null && isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center",
											children: badge
										})
									]
								}, item.id);
							})
						}),
						addingTo === group.label && !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 mx-1 p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: newModEmoji,
											onChange: (e) => setNewModEmoji(e.target.value),
											className: "w-9 h-9 rounded-lg bg-secondary text-center text-sm appearance-none cursor-pointer outline-none border border-transparent focus:border-primary/30",
											children: emojiOptions.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: e,
												children: e
											}, e))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: newModName,
											onChange: (e) => setNewModName(e.target.value),
											placeholder: "Module name...",
											autoFocus: true,
											onKeyDown: (e) => {
												if (e.key === "Enter") handleAddModule(group.label);
												if (e.key === "Escape") setAddingTo(null);
											},
											className: "flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs outline-none border border-transparent focus:border-primary/30 placeholder:text-muted-foreground/40"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleAddModule(group.label),
											disabled: !newModName.trim(),
											className: "w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 13 })
										})
									]
								})
							})
						})
					] }, group.label)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setModulesOpen((o) => !o),
						className: `w-full flex items-center justify-between px-3 mb-1.5 text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/35 uppercase hover:text-sidebar-foreground/60 transition-colors ${isCollapsed ? "justify-center" : ""}`,
						title: "All modules",
						children: [
							!isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelsTopLeft, { size: 10 }),
									" Modules · ",
									modulesNav.length
								]
							}),
							!isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: modulesOpen ? "−" : "+" }),
							isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelsTopLeft, {
								size: 16,
								strokeWidth: 1.5
							})
						]
					}), modulesOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-0.5",
						children: modulesNav.map((item) => {
							const active = activeSection === item.id;
							const badge = getBadge(item.id);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									setActiveSection(item.id);
									setSidebarOpen(false);
								},
								className: `w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-xl transition-all
                        ${active ? "v10-nav-active bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-1 ring-sidebar-primary/35" : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
										size: 15,
										strokeWidth: 1.5,
										className: "flex-shrink-0"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex-1 text-left truncate",
										children: item.label
									}),
									badge !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary",
										children: badge
									})
								]
							}, item.id);
						})
					})] }),
					customModules.filter((m) => m.visible).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [!isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center justify-between px-3 mb-1.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/35 uppercase",
							children: "CUSTOM"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-0.5",
						children: customModules.filter((m) => m.visible).sort((a, b) => a.order - b.order).map((mod) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								setActiveSection(`custom-${mod.id}`);
								setSidebarOpen(false);
							},
							className: `w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all duration-200
                      ${isCollapsed ? "justify-center px-0 rounded-xl" : "rounded-xl"}
                      ${activeSection === `custom-${mod.id}` ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-1 ring-sidebar-primary/35" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"}`,
							style: activeSection === `custom-${mod.id}` ? { boxShadow: "0 12px 30px -18px hsl(var(--sidebar-primary) / 0.9)" } : void 0,
							title: isCollapsed ? mod.name : void 0,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm",
								children: mod.icon
							}), !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex-1 text-left truncate",
								children: mod.name
							})]
						}, mod.id))
					})] }),
					customModules.filter((m) => m.visible).length === 0 && !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: addingTo !== "NEW_CUSTOM" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setAddingTo("NEW_CUSTOM"),
						className: "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-sidebar-foreground/35 hover:text-sidebar-primary hover:bg-sidebar-accent/60 transition-all border border-dashed border-sidebar-border/70 hover:border-sidebar-primary/30",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 15 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add Custom Module" })]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: newModEmoji,
										onChange: (e) => setNewModEmoji(e.target.value),
										className: "w-9 h-9 rounded-lg bg-secondary text-center text-sm appearance-none cursor-pointer outline-none",
										children: emojiOptions.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: e,
											children: e
										}, e))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: newModName,
										onChange: (e) => setNewModName(e.target.value),
										placeholder: "Module name...",
										autoFocus: true,
										onKeyDown: (e) => {
											if (e.key === "Enter") handleAddModule("NEW_CUSTOM");
											if (e.key === "Escape") setAddingTo(null);
										},
										className: "flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs outline-none placeholder:text-muted-foreground/40"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => handleAddModule("NEW_CUSTOM"),
										disabled: !newModName.trim(),
										className: "w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 13 })
									})
								]
							})
						})
					}) }),
					!isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setArchiveOpen((o) => !o),
						className: "w-full flex items-center justify-between px-3 mb-1.5 text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/35 uppercase hover:text-sidebar-foreground/60 transition-colors",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { size: 10 }), " More"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: archiveOpen ? "−" : "+" })]
					}), archiveOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-0.5",
						children: archivedNav.map((item) => {
							const active = activeSection === item.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									setActiveSection(item.id);
									setSidebarOpen(false);
								},
								className: `w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-xl transition-all
                          ${active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-1 ring-sidebar-primary/35" : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
									size: 15,
									strokeWidth: 1.5,
									className: "flex-shrink-0"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex-1 text-left truncate",
									children: item.label
								})]
							}, item.id);
						})
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border-t border-sidebar-border/70 p-3 space-y-2",
				children: [!isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sidebar-accent/45 hover:bg-sidebar-accent/70 transition-colors ring-1 ring-sidebar-border/50",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 shadow-sm",
							children: userName.charAt(0)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold text-sidebar-foreground truncate",
								children: userName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-sidebar-foreground/45 truncate",
								children: userRole
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: toggleTheme,
							className: "p-1.5 rounded-lg text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all",
							title: `Theme: ${theme} — click to switch`,
							children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { size: 14 }) : theme === "sage" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Leaf, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { size: 14 })
						})
					]
				}), isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: toggleTheme,
					className: "w-full flex items-center justify-center py-2.5 rounded-xl text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all",
					title: `Theme: ${theme} — click to switch`,
					children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { size: 15 }) : theme === "sage" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Leaf, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { size: 15 })
				})]
			})
		]
	})] });
}
var CommandPalette = (0, import_react.lazy)(() => import("./CommandPalette-BGDhTeT9.mjs"));
var BulkImportModal = (0, import_react.lazy)(() => import("./BulkImportModal-Cg-cPc4F.mjs"));
var VersionsModal = (0, import_react.lazy)(() => import("./VersionsModal-Gyq-SOQb.mjs"));
function DeferredOverlayFallback() {
	return null;
}
var quickAddItems = [
	{
		id: "websites",
		label: "Website",
		emoji: "🌐"
	},
	{
		id: "tasks",
		label: "Task",
		emoji: "✅"
	},
	{
		id: "github",
		label: "GitHub Repo",
		emoji: "🐙"
	},
	{
		id: "builds",
		label: "Build Project",
		emoji: "🛠️"
	},
	{
		id: "links",
		label: "Link",
		emoji: "🔗"
	},
	{
		id: "notes",
		label: "Note",
		emoji: "📝"
	},
	{
		id: "projects",
		label: "Kanban Card",
		emoji: "📋"
	},
	{
		id: "payments",
		label: "Payment",
		emoji: "💰"
	},
	{
		id: "ideas",
		label: "Idea",
		emoji: "💡"
	},
	{
		id: "credentials",
		label: "Credential",
		emoji: "🔐"
	}
];
var TopBar = (0, import_react.forwardRef)(function TopBar(_props, ref) {
	const tasks = useTasks();
	const exportAllData = useExportAllData();
	const { userName } = useSettingsStore();
	const { setSidebarOpen, setActiveSection, commandPaletteOpen, setCommandPaletteOpen, importModalOpen, setImportModalOpen } = useNavigationStore();
	const [quickAddOpen, setQuickAddOpen] = (0, import_react.useState)(false);
	const [versionsOpen, setVersionsOpen] = (0, import_react.useState)(false);
	const [notifOpen, setNotifOpen] = (0, import_react.useState)(false);
	const shortcutLabel = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘K" : "Ctrl K";
	const today = todayISO();
	const overdueTasks = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today);
	const dueTodayTasks = tasks.filter((t) => t.status !== "done" && t.dueDate === today);
	const overdueCount = overdueTasks.length;
	const dueTodayCount = dueTodayTasks.length;
	const notifCount = overdueCount + dueTodayCount;
	(0, import_react.useEffect)(() => {
		const handler = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setCommandPaletteOpen(true);
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "n") {
				e.preventDefault();
				setQuickAddOpen(true);
			}
			if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
				const el = document.activeElement;
				if (!!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
				e.preventDefault();
				setActiveSection("dashboard");
				requestAnimationFrame(() => window.dispatchEvent(new Event(CAPTURE_FOCUS_EVENT)));
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [setCommandPaletteOpen, setActiveSection]);
	(0, import_react.useEffect)(() => {
		if (!quickAddOpen) return;
		const handler = (e) => {
			if (e.key === "Escape") setQuickAddOpen(false);
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [quickAddOpen]);
	const handleQuickAdd = (sectionId) => {
		setActiveSection(sectionId);
		setQuickAddOpen(false);
	};
	const handleExport = async () => {
		const data = await exportAllData();
		const blob = new Blob([data], { type: "application/json" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `mission-control-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
		a.click();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		ref,
		className: "mobile-top-glass sm:enterprise-panel sticky top-0 z-30 px-3 sm:px-6 lg:px-8 h-[62px] sm:h-[72px] flex items-center gap-2 sm:gap-3 border-x-0 border-t-0 rounded-none shadow-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setSidebarOpen(true),
				className: "lg:hidden text-muted-foreground hover:text-foreground p-2 -ml-1 rounded-2xl active:scale-90 active:bg-secondary/70 transition-all touch-manipulation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { size: 18 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setCommandPaletteOpen(true),
				className: "flex items-center gap-2 sm:gap-2.5 flex-1 max-w-xl h-10 sm:h-11 px-3 sm:px-4 rounded-2xl bg-card/62 border border-border/50 hover:border-primary/35 hover:bg-card/80 hover:shadow-[var(--shadow-glow)] transition-all duration-300 cursor-pointer group touch-manipulation",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
						size: 14,
						className: "text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 sm:w-4 sm:h-4"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs sm:text-sm text-muted-foreground/50 flex-1 text-left truncate",
						children: "Search or jump to…"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hidden md:flex items-center gap-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
							className: "text-[10px] text-muted-foreground/50 bg-card px-2 py-1 rounded-lg font-medium border border-border/40",
							children: shortcutLabel
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1 sm:gap-1.5 ml-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setImportModalOpen(true),
						className: "hidden sm:flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-xl sm:rounded-2xl text-muted-foreground/55 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation",
						title: "Import",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { size: 16 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setVersionsOpen(true),
						className: "flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-xl sm:rounded-2xl text-muted-foreground/55 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation",
						title: "Versions — save & restore",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { size: 16 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: handleExport,
						className: "hidden sm:flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-xl sm:rounded-2xl text-muted-foreground/55 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation",
						title: "Export",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 16 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setNotifOpen((o) => !o),
							className: "relative flex items-center justify-center w-10 h-10 rounded-2xl text-muted-foreground/60 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation",
							title: "Notifications",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
								size: 16,
								className: "sm:w-[18px] sm:h-[18px]"
							}), notifCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center shadow-md",
								children: notifCount > 9 ? "9+" : notifCount
							})]
						}), notifOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "fixed inset-0 z-40",
							onClick: () => setNotifOpen(false)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute right-0 top-full mt-3 z-50 w-80 max-h-[70vh] overflow-y-auto mobile-sheet-luxe rounded-[24px] p-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "px-4 py-2.5 flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest",
									children: "Notifications"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[10px] text-muted-foreground/50",
									children: [notifCount, " pending"]
								})]
							}), notifCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "px-4 py-8 text-center text-sm text-muted-foreground/60",
								children: "🎉 You're all caught up!"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-0.5",
								children: [
									overdueCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "px-4 py-1.5 text-[10px] font-semibold text-destructive uppercase tracking-wider",
										children: [
											"Overdue (",
											overdueCount,
											")"
										]
									}),
									overdueTasks.slice(0, 8).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => {
											setNotifOpen(false);
											setActiveSection("tasks");
										},
										className: "w-full flex items-start gap-3 px-4 py-2.5 rounded-2xl text-left hover:bg-secondary/60 transition-all",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-base",
											children: "⚠️"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[13px] font-medium text-foreground truncate",
												children: t.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[10px] text-destructive",
												children: ["Due ", t.dueDate]
											})]
										})]
									}, t.id)),
									dueTodayCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "px-4 py-1.5 mt-2 text-[10px] font-semibold text-primary uppercase tracking-wider",
										children: [
											"Due Today (",
											dueTodayCount,
											")"
										]
									}),
									dueTodayTasks.slice(0, 8).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => {
											setNotifOpen(false);
											setActiveSection("tasks");
										},
										className: "w-full flex items-start gap-3 px-4 py-2.5 rounded-2xl text-left hover:bg-secondary/60 transition-all",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-base",
											children: "📌"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[13px] font-medium text-foreground truncate",
												children: t.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-muted-foreground",
												children: "Due today"
											})]
										})]
									}, t.id)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "border-t border-border/20 mt-1 pt-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												setNotifOpen(false);
												setActiveSection("tasks");
											},
											className: "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-medium text-primary hover:bg-secondary/60 transition-all",
											children: "View all tasks →"
										})
									})
								]
							})]
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-px bg-border/30 mx-1 hidden sm:block" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden sm:flex items-center gap-3 pl-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-[13px] font-bold text-primary-foreground shadow-[var(--shadow-primary)] cursor-pointer",
							children: userName.charAt(0)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "hidden lg:block min-w-0 mr-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-semibold text-foreground truncate",
								children: userName
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setQuickAddOpen(!quickAddOpen),
							className: "h-10 px-3 sm:px-4 rounded-xl bg-primary text-primary-foreground flex items-center gap-2 text-sm font-medium hover:opacity-90 transition touch-manipulation",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
								size: 16,
								className: `transition-transform duration-200 ${quickAddOpen ? "rotate-45" : ""}`
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Capture"
							})]
						}), quickAddOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "fixed inset-0 z-40 bg-foreground/10 sm:bg-transparent",
							onClick: () => setQuickAddOpen(false)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "fixed sm:absolute inset-x-3 sm:inset-x-auto bottom-[92px] sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 z-50 sm:w-60 mobile-sheet-luxe rounded-[28px] p-2 overflow-hidden",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-widest",
									children: "Quick Add"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-2 sm:grid-cols-1 gap-0.5",
									children: quickAddItems.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => handleQuickAdd(item.id),
										className: "w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-2xl text-[13px] text-foreground hover:bg-secondary/60 active:bg-secondary transition-all touch-manipulation",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-base sm:text-sm",
											children: item.emoji
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: item.label
										})]
									}, item.id))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "border-t border-border/20 mt-1 pt-1",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => {
											setQuickAddOpen(false);
											setImportModalOpen(true);
										},
										className: "w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-2xl text-[13px] text-foreground hover:bg-secondary/60 active:bg-secondary transition-all touch-manipulation",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-base sm:text-sm",
											children: "📥"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: "Bulk Import"
										})]
									})
								})
							]
						})] })]
					})
				]
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Suspense, {
		fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeferredOverlayFallback, {}),
		children: [
			commandPaletteOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandPalette, {
				open: commandPaletteOpen,
				onClose: () => setCommandPaletteOpen(false),
				onImport: () => setImportModalOpen(true)
			}),
			importModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulkImportModal, {
				open: importModalOpen,
				onClose: () => setImportModalOpen(false)
			}),
			versionsOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VersionsModal, {
				open: versionsOpen,
				onClose: () => setVersionsOpen(false)
			})
		]
	})] });
});
function EmailSignInDialog({ open, onClose }) {
	const [email, setEmail] = (0, import_react.useState)("");
	const [code, setCode] = (0, import_react.useState)("");
	const [stage, setStage] = (0, import_react.useState)("email");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [sent, setSent] = (0, import_react.useState)(false);
	const [mode, setMode] = (0, import_react.useState)("code");
	const [link, setLink] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => onCloudStatus((s) => {
		if (s === "synced") onClose();
	}), [onClose]);
	if (!open) return null;
	const requestCode = async () => {
		if (!/^\S+@\S+\.\S+$/.test(email)) {
			setError("Enter a valid email address");
			return;
		}
		setBusy(true);
		setError(null);
		const r = await requestEmailCode(email);
		setBusy(false);
		if (r.ok) {
			setStage("code");
			setSent(true);
		} else setError(r.error ?? "Could not send the code");
	};
	const verify = async () => {
		if (mode === "link") {
			if (!link.trim().startsWith("http")) {
				setError("Paste the full “Log In” link from the email");
				return;
			}
			setBusy(true);
			setError(null);
			const r = await verifyMagicLink(link, email);
			setBusy(false);
			if (r.ok) onClose();
			else if (r.resent) {
				setLink("");
				setStage("code");
				setSent(true);
				setError(r.error ?? null);
			} else setError(r.error ?? "That link did not work");
			return;
		}
		if (code.trim().length < 6) {
			setError("Enter the 6-digit code from the email");
			return;
		}
		setBusy(true);
		setError(null);
		const r = await verifyEmailCode(email, code);
		setBusy(false);
		if (r.ok) onClose();
		else setError(r.error ?? "That code did not work");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[210] flex items-center justify-center p-4",
		onClick: onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-foreground/40 backdrop-blur-md" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative w-full max-w-md overflow-hidden rounded-[26px] border border-border/60 bg-card shadow-[var(--shadow-xl)]",
			onClick: (e) => e.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative overflow-hidden bg-gradient-to-br from-primary/15 via-transparent to-transparent p-6 pb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex items-start justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, { size: 18 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display mt-3 text-[19px] font-extrabold tracking-tight text-foreground",
							children: "Turn on cloud backup"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[12px] leading-relaxed text-muted-foreground",
							children: "Your data lives only on this device right now. Sign in and everything syncs privately — restore on any device, any time."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 16 })
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 p-6 pt-4",
				children: [
					stage === "email" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "block text-[11px] font-bold uppercase tracking-wide text-muted-foreground",
							children: "Email address"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 focus-within:border-primary/50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, {
								size: 15,
								className: "shrink-0 text-muted-foreground"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								autoFocus: true,
								type: "email",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") requestCode();
								},
								placeholder: "you@example.com",
								className: "h-11 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: requestCode,
							disabled: busy,
							className: "flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[13px] font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50",
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								size: 15,
								className: "animate-spin"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { size: 15 }), busy ? "Sending code…" : "Send sign-in code"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-center text-[10.5px] leading-relaxed text-muted-foreground/70",
							children: "Google sign-in is temporarily unavailable on this deployment — email codes work the same."
						})
					] }),
					stage === "code" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[12px] text-muted-foreground",
							children: [sent ? "Code sent to " : "Enter the code sent to ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-foreground",
								children: email
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-1 rounded-xl bg-secondary p-1 text-[11px] font-bold",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setMode("code"),
								className: `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 transition ${mode === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { size: 12 }), " 6-digit code"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setMode("link"),
								className: `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 transition ${mode === "link" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, { size: 12 }), " I got a link"]
							})]
						}),
						mode === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoFocus: true,
							inputMode: "numeric",
							maxLength: 6,
							value: code,
							onChange: (e) => setCode(e.target.value.replace(/\D/g, "")),
							onKeyDown: (e) => {
								if (e.key === "Enter") verify();
							},
							placeholder: "••••••",
							className: "h-13 w-full rounded-2xl border border-border/70 bg-background px-4 text-center font-mono text-[22px] font-bold tracking-[0.4em] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/50",
							style: { height: 52 }
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 focus-within:border-primary/50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, {
								size: 15,
								className: "shrink-0 text-muted-foreground"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								autoFocus: true,
								type: "text",
								value: link,
								onChange: (e) => setLink(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") verify();
								},
								placeholder: "Paste the “Log In” link from the email",
								className: "h-11 min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[10.5px] leading-relaxed text-muted-foreground/70",
							children: "Got a “Log In” button instead of numbers? Paste the full link here — it signs you in from any origin."
						})] }),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] font-semibold text-destructive",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: verify,
							disabled: busy,
							className: "flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[13px] font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50",
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								size: 15,
								className: "animate-spin"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { size: 15 }), busy ? "Verifying…" : "Verify & start backup"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setStage("email");
								setCode("");
								setLink("");
								setError(null);
							},
							className: "w-full text-center text-[11px] font-semibold text-muted-foreground transition hover:text-foreground",
							children: "Use a different email"
						})
					] }),
					stage === "email" && error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] font-semibold text-destructive",
						children: error
					})
				]
			})]
		})]
	});
}
function label(status) {
	switch (status) {
		case "synced": return "Backed up";
		case "syncing": return "Backing up…";
		case "connecting": return "Connecting…";
		case "offline": return "Offline";
		case "error": return "Backup error";
		default: return "Not backed up";
	}
}
/** Compact badge for the desktop status bar. */
function CloudBackupBadge() {
	const [status, setStatus] = (0, import_react.useState)("signed-out");
	(0, import_react.useEffect)(() => onCloudStatus((s) => setStatus(s)), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => status === "signed-out" ? void signInToCloud() : void forceCloudSync(),
		className: `flex items-center gap-1 transition-colors hover:text-foreground ${status === "synced" ? "text-success/80" : status === "error" ? "text-destructive/80" : status === "signed-out" ? "text-muted-foreground/60" : "text-amber-500/80"}`,
		title: status === "signed-out" ? "Sign in to back up your data" : `Last sync: ${getLastCloudSync() ?? "—"}`,
		children: [
			status === "syncing" || status === "connecting" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
				size: 10,
				className: "animate-spin"
			}) : status === "synced" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { size: 10 }) : status === "signed-out" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudOff, { size: 10 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, { size: 10 }),
			"Cloud · ",
			label(status)
		]
	});
}
/** Prominent, mobile-friendly banner asking the user to enable cloud backup. */
function CloudBackupBanner() {
	const [status, setStatus] = (0, import_react.useState)("signed-out");
	const [err, setErr] = (0, import_react.useState)(null);
	const [emailDialog, setEmailDialog] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => onCloudStatus((s, e) => {
		setStatus(s);
		setErr(e);
	}), []);
	if (status === "synced" || status === "syncing") return null;
	const oauthBroken = /GOOGLE_OAUTH_UNCONFIGURED|OAuth secret|Unsupported provider/i.test(err ?? "");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `enterprise-panel mb-3 flex items-center gap-3 rounded-2xl border p-3 sm:mb-4 sm:p-4 ${status === "error" ? "border-destructive/40" : "border-primary/30"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `shrink-0 rounded-xl p-2 ${status === "error" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`,
				children: status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudOff, { size: 16 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-[13px] font-semibold text-foreground sm:text-sm",
					children: status === "error" ? "Cloud backup problem" : "Data is only on this device"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "line-clamp-2 text-[11px] text-muted-foreground sm:text-xs",
					children: status === "error" ? oauthBroken ? "Google sign-in is not configured on this deployment yet. Use the email code instead — same private backup." : err ?? "Sync failed. Try again." : "Sign in to back up and restore on any device."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: status === "error" && !oauthBroken ? () => void forceCloudSync() : () => setEmailDialog(true),
				className: "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity active:opacity-80 sm:px-4 sm:text-sm",
				children: status === "error" && !oauthBroken ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 14 }),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: "Retry sync"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, { size: 14 }),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: "Back up with email"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sm:hidden",
						children: "Back up"
					})
				] })
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmailSignInDialog, {
		open: emailDialog,
		onClose: () => setEmailDialog(false)
	})] });
}
function StatusBar() {
	const [online, setOnline] = (0, import_react.useState)(navigator.onLine);
	const [saveStatus, setSaveStatus] = (0, import_react.useState)("idle");
	(0, import_react.useEffect)(() => {
		const on = () => setOnline(true);
		const off = () => setOnline(false);
		window.addEventListener("online", on);
		window.addEventListener("offline", off);
		return () => {
			window.removeEventListener("online", on);
			window.removeEventListener("offline", off);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		return onSaveStatus((status) => {
			setSaveStatus(status);
			if (status === "saved") {
				const t = setTimeout(() => setSaveStatus("idle"), 3e3);
				return () => clearTimeout(t);
			}
		});
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "enterprise-panel sticky bottom-0 z-20 hidden lg:flex border-x-0 border-b-0 rounded-none shadow-none px-5 h-8 items-center justify-between text-[11px] text-muted-foreground/70",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-4",
			children: [
				online ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1.5 text-success font-medium",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative flex h-2 w-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-success" })]
					}), "Online"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1.5 text-destructive font-medium animate-pulse",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, { size: 11 }), " Offline"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1 text-muted-foreground/40",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { size: 10 }), " IndexedDB"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudBackupBadge, {}),
				saveStatus === "saving" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1 text-amber-500/70 animate-pulse",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
						size: 10,
						className: "animate-spin"
					}), " Saving…"]
				}),
				saveStatus === "saved" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1 text-success/70",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 10 }), " Saved"]
				}),
				saveStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1 text-destructive/70",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { size: 10 }), " Sync error"]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
				className: "text-[10px] text-muted-foreground/30 bg-secondary/40 px-1.5 py-0.5 rounded font-mono border border-border/20",
				children: "⌘K"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium text-muted-foreground/35",
				children: "Mission Control v9.1"
			})]
		})]
	});
}
var moreItems = [
	{
		id: "tasks",
		label: "Tasks",
		icon: SquareCheckBig
	},
	{
		id: "review",
		label: "Review",
		icon: RefreshCcw
	},
	{
		id: "focus",
		label: "Focus",
		icon: Timer
	},
	{
		id: "calendar",
		label: "Calendar",
		icon: Calendar
	},
	{
		id: "notes",
		label: "Notes",
		icon: FileText
	},
	{
		id: "decisions",
		label: "Findings",
		icon: Scale
	},
	{
		id: "reminders",
		label: "Reminders",
		icon: Bell
	},
	{
		id: "control-center",
		label: "Captures",
		icon: Radar
	},
	{
		id: "websites",
		label: "Sites",
		icon: Globe
	},
	{
		id: "seo",
		label: "SEO",
		icon: Search
	},
	{
		id: "payments",
		label: "Finance",
		icon: DollarSign
	},
	{
		id: "industry",
		label: "Trends",
		icon: Newspaper
	},
	{
		id: "mentions",
		label: "Mentions",
		icon: AtSign
	},
	{
		id: "audience",
		label: "Audience",
		icon: Users
	},
	{
		id: "projects",
		label: "Projects",
		icon: PanelsTopLeft
	},
	{
		id: "habits",
		label: "Habits",
		icon: Flame
	},
	{
		id: "ideas",
		label: "Ideas",
		icon: Lightbulb
	},
	{
		id: "credentials",
		label: "Vault",
		icon: KeyRound
	},
	{
		id: "github",
		label: "GitHub",
		icon: Github
	},
	{
		id: "builds",
		label: "Builds",
		icon: Hammer
	},
	{
		id: "links",
		label: "Links",
		icon: Link2
	},
	{
		id: "dashboard",
		label: "Dashboard",
		icon: House
	},
	{
		id: "settings",
		label: "Settings",
		icon: Settings
	}
];
function MobileBottomNav() {
	const { activeSection, setActiveSection, setCommandPaletteOpen } = useNavigationStore();
	const tasks = useTasks();
	const decisions = useDecisions();
	const [moreOpen, setMoreOpen] = (0, import_react.useState)(false);
	const inboxCount = tasks.filter((t) => t.status === "todo" && !t.dueDate).length + decisions.filter((d) => d.status === "open").length;
	const go = (id) => {
		setActiveSection(id);
		setMoreOpen(false);
	};
	const tabCls = (active) => `relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-colors touch-manipulation active:scale-[0.94] ${active ? "text-primary" : "text-muted-foreground/70"}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [moreOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden",
		onClick: () => setMoreOpen(false)
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mobile-sheet-luxe fixed bottom-[80px] left-2 right-2 z-50 max-h-[70vh] overflow-hidden rounded-[26px] lg:hidden animate-slide-up",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-center pt-3 pb-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1.5 w-10 rounded-full bg-muted-foreground/20" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-5 pb-2 pt-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-[15px] font-semibold tracking-tight text-foreground",
					children: "All sections"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-y-auto px-3 pb-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-4 gap-2",
					children: moreItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => go(item.id),
						className: `flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl p-2 text-center transition touch-manipulation active:scale-90 ${activeSection === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-secondary/70"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
							size: 19,
							strokeWidth: 1.8
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-medium leading-tight",
							children: item.label
						})]
					}, item.id))
				})
			})
		]
	})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)*0.5+0.5rem)] lg:hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mobile-liquid-bar rounded-[24px] px-2 py-1.5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-stretch justify-around gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => go("dashboard"),
						className: tabCls(activeSection === "dashboard"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, {
							size: 20,
							strokeWidth: activeSection === "dashboard" ? 2.4 : 1.7
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-medium leading-none",
							children: "Home"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => go("control-center"),
						className: tabCls(activeSection === "control-center"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, {
								size: 20,
								strokeWidth: activeSection === "control-center" ? 2.4 : 1.7
							}), inboxCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "absolute -right-2.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground",
								children: inboxCount > 99 ? "99+" : inboxCount
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-medium leading-none",
							children: "Inbox"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setMoreOpen(false);
							setActiveSection("dashboard");
							requestAnimationFrame(() => window.dispatchEvent(new Event(CAPTURE_FOCUS_EVENT)));
						},
						"aria-label": "Capture",
						className: "relative -mt-6 flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_34px_-12px_hsl(var(--primary)/0.85)] transition active:scale-90 touch-manipulation",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
							size: 24,
							strokeWidth: 2.4
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setMoreOpen(false);
							setCommandPaletteOpen(true);
						},
						className: tabCls(false),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 20,
							strokeWidth: 1.7
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-medium leading-none",
							children: "Search"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setMoreOpen((o) => !o),
						className: tabCls(moreOpen),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Grip, {
							size: 20,
							strokeWidth: moreOpen ? 2.4 : 1.7
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-medium leading-none",
							children: "More"
						})]
					})
				]
			})
		})
	})] });
}
var taskSchema = objectType({
	title: stringType().max(300),
	priority: stringType().max(30).optional(),
	dueDate: stringType().max(20).optional(),
	startTime: stringType().max(10).optional(),
	daysOverdue: numberType().optional()
});
var digestSchema = objectType({
	date: stringType().max(20),
	overdue: arrayType(taskSchema).max(200),
	dueToday: arrayType(taskSchema).max(200),
	dueTomorrow: arrayType(taskSchema).max(200),
	completedToday: numberType()
});
/**
* Sends the daily overdue digest. The recipient is fixed by the template
* (account owner) — the browser can never choose a recipient or template.
*/
var sendOverdueDigest = createServerFn({ method: "POST" }).inputValidator((data) => digestSchema.parse(data)).handler(createSsrRpc("d7d1718120be17eb85dbaa89181b79e2a884da990a2bb1141d11ac01efd0a9c4"));
var PRIORITY_STYLE = {
	critical: "bg-rose-500/15 text-rose-500 ring-rose-500/25",
	high: "bg-amber-500/15 text-amber-600 ring-amber-500/25",
	medium: "bg-sky-500/15 text-sky-600 ring-sky-500/25",
	low: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25"
};
function TaskRow({ task, overdue }) {
	const updateItem = useUpdateItem();
	const days = daysOverdue(task);
	const complete = async () => {
		await updateItem("tasks", task.id, {
			status: "done",
			completedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		toast.success("Task completed");
	};
	const snooze = async () => {
		const next = addDaysLocal(todayISO(), 1);
		await updateItem("tasks", task.id, {
			notBefore: next,
			scheduledAt: next,
			remindersFired: []
		});
		toast.success("Planned for tomorrow — deadline unchanged");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2.5 rounded-2xl border border-border/40 bg-background/60 px-3 py-2.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: complete,
				"aria-label": "Complete task",
				className: "shrink-0 rounded-full p-1 text-muted-foreground transition hover:text-emerald-500 active:scale-90",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 20 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate text-[13px] font-semibold text-foreground",
					children: task.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `rounded-full px-1.5 py-0.5 font-bold uppercase ring-1 ${PRIORITY_STYLE[task.priority] ?? ""}`,
							children: task.priority
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [task.dueDate, task.startTime ? ` · ${task.startTime}` : ""] }),
						overdue && days > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-semibold text-rose-500",
							children: [days, "d overdue"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: snooze,
				className: "shrink-0 rounded-full border border-border/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition active:scale-95",
				children: "Tomorrow"
			})
		]
	});
}
function DailyBriefingBanner() {
	const tasks = useTasks();
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	const settings = useSettingsStore();
	const [expanded, setExpanded] = (0, import_react.useState)(false);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [sending, setSending] = (0, import_react.useState)(false);
	const sendDigest = useServerFn(sendOverdueDigest);
	const briefing = (0, import_react.useMemo)(() => buildBriefing(tasks), [tasks]);
	const today = todayISO();
	if (briefing.overdue.length === 0 && briefing.dueToday.length === 0) return null;
	const digestEmail = typeof settings.digestEmail === "string" && settings.digestEmail || typeof settings.email === "string" && settings.email || "papalexios@gmail.com";
	const copyDigest = async () => {
		await navigator.clipboard.writeText(buildDigestText(briefing, today));
		setCopied(true);
		toast.success("Digest copied");
		setTimeout(() => setCopied(false), 1800);
	};
	const toDigestTask = (t) => ({
		title: t.title,
		priority: t.priority,
		dueDate: t.dueDate || void 0,
		startTime: t.startTime || void 0,
		daysOverdue: daysOverdue(t, today)
	});
	const emailDigest = async () => {
		if (sending) return;
		setSending(true);
		try {
			if ((await sendDigest({ data: {
				date: today,
				overdue: briefing.overdue.map(toDigestTask),
				dueToday: briefing.dueToday.map(toDigestTask),
				dueTomorrow: briefing.dueTomorrow.map(toDigestTask),
				completedToday: briefing.completedToday
			} })).sent) toast.success(`Digest emailed to ${digestEmail}`);
			else toast.warning("That address is unsubscribed from emails");
		} catch (e) {
			if (String(e?.message || e).includes("domain_not_verified")) toast.error("Email domain still verifying — opening your mail app instead");
			else toast.error("Could not send — opening your mail app instead");
			mailDigest(briefing, digestEmail, today);
		} finally {
			setSending(false);
		}
	};
	const shown = expanded ? [...briefing.overdue, ...briefing.dueToday] : [...briefing.overdue, ...briefing.dueToday].slice(0, 2);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mb-4 overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-[0_18px_45px_-38px_hsl(var(--foreground)/0.6)] backdrop-blur",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2.5 border-b border-border/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl sm:h-9 sm:w-9 ${briefing.overdue.length ? "bg-rose-500/15 text-rose-500" : "bg-sky-500/15 text-sky-500"}`,
					children: briefing.overdue.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { size: 18 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "truncate text-[13px] font-extrabold tracking-tight text-foreground sm:text-[14px]",
						children: briefing.overdue.length ? `${briefing.overdue.length} overdue · ${briefing.dueToday.length} due today` : `${briefing.dueToday.length} task${briefing.dueToday.length === 1 ? "" : "s"} due today`
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "truncate text-[10px] text-muted-foreground sm:text-[11px]",
						children: [
							"Daily briefing · ",
							today,
							" · ",
							briefing.completedToday,
							" completed today"
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: copyDigest,
							title: "Copy digest",
							className: "hidden rounded-full border border-border/50 p-2 sm:block text-muted-foreground transition active:scale-90",
							children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 15 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: emailDigest,
							title: "Email digest",
							className: "hidden rounded-full border border-border/50 p-2 sm:block text-muted-foreground transition active:scale-90",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, {
								size: 15,
								className: sending ? "animate-pulse" : ""
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveSection("tasks"),
							className: "shrink-0 rounded-full bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground transition active:scale-95",
							children: "Open tasks"
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2 px-2.5 py-2.5 sm:px-4 sm:py-3",
			children: [shown.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, {
				task: t,
				overdue: !!t.dueDate && t.dueDate < today
			}, t.id)), briefing.total > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setExpanded((e) => !e),
				className: "flex w-full items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground",
				children: [expanded ? "Show less" : `Show all ${briefing.total}`, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
					size: 13,
					className: expanded ? "rotate-180 transition" : "transition"
				})]
			})]
		})]
	});
}
var RELOAD_KEY = "mc-chunk-reload-at";
function isChunkLoadError(error) {
	const message = String(error?.message ?? error ?? "");
	return /Failed to fetch dynamically imported module/i.test(message) || /Importing a module script failed/i.test(message) || /error loading dynamically imported module/i.test(message) || /ChunkLoadError/i.test(message);
}
/**
* React.lazy with resilience against stale build chunks after a new deploy.
* Retries once with a cache-busting reload of the page (at most once per minute).
*/
function lazyWithRetry(factory) {
	return (0, import_react.lazy)(async () => {
		try {
			return await factory();
		} catch (error) {
			if (!isChunkLoadError(error)) throw error;
			try {
				return await factory();
			} catch (retryError) {
				if (!isChunkLoadError(retryError)) throw retryError;
				if (typeof window !== "undefined") {
					const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? "0");
					if (Date.now() - last > 6e4) {
						window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
						window.location.reload();
						return await new Promise(() => {});
					}
				}
				throw retryError;
			}
		}
	});
}
var RouteErrorBoundary = class extends import_react.Component {
	state = { error: null };
	static getDerivedStateFromError(error) {
		return { error };
	}
	componentDidCatch(error, info) {
		console.error(`🔴 [${this.props.sectionName ?? "Route"}] crashed:`, error, info);
	}
	render() {
		if (this.state.error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-center min-h-[50vh]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "max-w-md text-center space-y-4 p-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-7 h-7 text-destructive" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold text-foreground",
						children: "Something went wrong"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground leading-relaxed",
						children: this.state.error.message
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => this.setState({ error: null }),
						className: "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-4 h-4" }), "Try Again"]
					})
				]
			})
		});
		return this.props.children;
	}
};
function GoogleTasksPage() {
	const [signed, setSigned] = (0, import_react.useState)(isSignedIn());
	const [lists, setLists] = (0, import_react.useState)([]);
	const [activeList, setActiveList] = (0, import_react.useState)(null);
	const [tasks, setTasks] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [showCompleted, setShowCompleted] = (0, import_react.useState)(false);
	const [newTitle, setNewTitle] = (0, import_react.useState)("");
	const [authError, setAuthError] = (0, import_react.useState)(null);
	const [setupOpen, setSetupOpen] = (0, import_react.useState)(false);
	const oauth = getGoogleTasksOAuthDiagnostics();
	(0, import_react.useEffect)(() => {
		refreshSignInState().then(setSigned).catch(() => setSigned(isSignedIn()));
	}, []);
	const loadLists = (0, import_react.useCallback)(async () => {
		setLoading(true);
		try {
			const ls = await listTaskLists();
			setLists(ls);
			if (ls.length && !activeList) setActiveList(ls[0].id);
		} catch (e) {
			toast.error(e.message);
			if (/session expired|Not signed in/i.test(e.message)) setSigned(false);
		} finally {
			setLoading(false);
		}
	}, [activeList]);
	const loadTasks = (0, import_react.useCallback)(async () => {
		if (!activeList) return;
		setLoading(true);
		try {
			setTasks(await listTasks(activeList, showCompleted));
		} catch (e) {
			toast.error(e.message);
			if (/session expired|Not signed in/i.test(e.message)) setSigned(false);
		} finally {
			setLoading(false);
		}
	}, [activeList, showCompleted]);
	(0, import_react.useEffect)(() => {
		if (signed) loadLists();
	}, [signed, loadLists]);
	(0, import_react.useEffect)(() => {
		if (signed && activeList) loadTasks();
	}, [
		signed,
		activeList,
		loadTasks
	]);
	const handleSignIn = async () => {
		setAuthError(null);
		try {
			await signIn();
			const connected = await refreshSignInState();
			setSigned(connected || isSignedIn());
			toast.success("Connected to Google Tasks");
		} catch (e) {
			const message = e?.message || "Google sign-in failed";
			setAuthError(message);
			toast.error(message);
		}
	};
	const openStandalone = () => {
		window.open(window.location.href, "_blank", "noopener,noreferrer");
	};
	const copyOrigin = async () => {
		await navigator.clipboard.writeText(oauth.origin);
		toast.success("Origin copied");
	};
	const handleSignOut = () => {
		signOut();
		setSigned(false);
		setLists([]);
		setTasks([]);
		setActiveList(null);
		toast.success("Disconnected");
	};
	const toggleDone = async (t) => {
		if (!activeList) return;
		const next = t.status === "completed" ? "needsAction" : "completed";
		try {
			await updateTask(activeList, t.id, { status: next });
			setTasks((prev) => prev.map((x) => x.id === t.id ? {
				...x,
				status: next
			} : x));
		} catch (e) {
			toast.error(e.message);
		}
	};
	const addTask = async () => {
		if (!activeList || !newTitle.trim()) return;
		try {
			const created = await createTask(activeList, { title: newTitle.trim() });
			setTasks((prev) => [created, ...prev]);
			setNewTitle("");
		} catch (e) {
			toast.error(e.message);
		}
	};
	const removeTask = async (t) => {
		if (!activeList) return;
		try {
			await deleteTask(activeList, t.id);
			setTasks((prev) => prev.filter((x) => x.id !== t.id));
		} catch (e) {
			toast.error(e.message);
		}
	};
	if (!signed) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-2xl mx-auto mt-16 space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListTodo, {
							size: 28,
							className: "text-primary"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-bold",
						children: "Google Tasks"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Connect your Google account to view and manage your Google Tasks."
					})
				]
			}),
			authError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "card-elevated p-4 text-left space-y-3 border-destructive/25 bg-destructive/5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
						size: 18,
						className: "text-destructive shrink-0 mt-0.5"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold text-foreground",
							children: "Google connection failed"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs leading-relaxed text-muted-foreground",
							children: authError
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card-elevated p-4 text-left space-y-2 border-primary/15 bg-primary/5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold text-foreground",
						children: hasGoogleClientId() ? "Direct Google connection" : "One-time setup needed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs leading-relaxed text-muted-foreground",
						children: hasGoogleClientId() ? "This app talks to Google directly from your browser using your own OAuth Client ID — no third-party servers." : "Google integration runs directly in your browser and needs your own Google OAuth Client ID (3-minute setup, once)."
					}),
					!hasGoogleClientId() && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setSetupOpen(true),
						className: "mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { size: 13 }), " Set up Google connection"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-secondary/60 p-3 space-y-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] uppercase tracking-wide text-muted-foreground font-bold",
							children: "Current app origin"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "min-w-0 flex-1 truncate text-xs text-foreground",
								children: oauth.origin
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: copyOrigin,
								className: "p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground",
								title: "Copy origin",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 13 })
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap justify-center gap-2",
				children: [hasGoogleClientId() ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: handleSignIn,
					className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, { size: 16 }), " Connect Google Tasks"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setSetupOpen(true),
					className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { size: 16 }), " Set up Google Connection"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: openStandalone,
					className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/75 transition",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 16 }), " Open standalone"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleSetupModal, {
				open: setupOpen,
				onClose: () => setSetupOpen(false)
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-xl sm:text-2xl font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListTodo, {
						size: 20,
						className: "text-primary"
					}), " Google Tasks"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted-foreground",
					children: [
						lists.length,
						" list",
						lists.length === 1 ? "" : "s",
						" · synced from your Google account"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: loadTasks,
						className: "p-2 rounded-xl bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground",
						title: "Refresh",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
							size: 14,
							className: loading ? "animate-spin" : ""
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: handleSignOut,
						className: "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-secondary hover:bg-destructive/10 hover:text-destructive",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { size: 14 }), " Disconnect"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-1.5 overflow-x-auto hide-scrollbar",
				children: [lists.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setActiveList(l.id),
					className: `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${activeList === l.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
					children: l.title
				}, l.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "ml-auto flex items-center gap-1.5 text-xs text-muted-foreground px-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: showCompleted,
						onChange: (e) => setShowCompleted(e.target.checked)
					}), "Show completed"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: newTitle,
					onChange: (e) => setNewTitle(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Enter") addTask();
					},
					placeholder: "Add a task...",
					className: "flex-1 px-4 py-2.5 rounded-xl bg-secondary outline-none border border-transparent focus:border-primary/30 text-sm"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: addTask,
					disabled: !newTitle.trim(),
					className: "flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 15 }), " Add"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [tasks.length === 0 && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center py-16 text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-5xl mb-3",
							children: "✅"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-foreground",
							children: "No tasks"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm",
							children: showCompleted ? "Nothing here yet." : "All caught up!"
						})
					]
				}), tasks.map((t) => {
					const done = t.status === "completed";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-elevated p-3 flex items-center gap-3 group",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => toggleDone(t),
								className: "shrink-0 text-muted-foreground hover:text-primary transition",
								children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
									size: 20,
									className: "text-emerald-500"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { size: 20 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`,
										children: t.title || "(untitled)"
									}),
									t.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground line-clamp-2 mt-0.5",
										children: t.notes
									}),
									t.due && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[11px] text-muted-foreground mt-0.5",
										children: ["Due ", new Date(t.due).toLocaleDateString()]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => removeTask(t),
								className: "opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
							})
						]
					}, t.id);
				})]
			})
		]
	});
}
function compressImage(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Could not read image"));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(/* @__PURE__ */ new Error("Invalid image"));
			img.onload = () => {
				const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
				const w = Math.round(img.width * scale);
				const h = Math.round(img.height * scale);
				const canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(reader.result);
					return;
				}
				ctx.drawImage(img, 0, 0, w, h);
				resolve(canvas.toDataURL("image/jpeg", .85));
			};
			img.src = reader.result;
		};
		reader.readAsDataURL(file);
	});
}
var TEXT_EXTENSIONS = [
	".txt",
	".csv",
	".tsv",
	".json",
	".jsonl",
	".md",
	".markdown",
	".html",
	".htm",
	".xml",
	".yaml",
	".yml",
	".log",
	".env"
];
function isTextFile(file) {
	if (file.type.startsWith("text/")) return true;
	if (file.type === "application/json" || file.type === "application/xml") return true;
	const name = file.name.toLowerCase();
	return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
}
function readFileAsText(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Could not read file"));
		reader.onload = () => resolve(reader.result);
		reader.readAsText(file);
	});
}
function SnapCapture() {
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [result, setResult] = (0, import_react.useState)(null);
	const [preview, setPreview] = (0, import_react.useState)(null);
	const [showActions, setShowActions] = (0, import_react.useState)(false);
	const cameraRef = (0, import_react.useRef)(null);
	const galleryRef = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const longPressTimer = (0, import_react.useRef)(null);
	const longPressFired = (0, import_react.useRef)(false);
	const bulkAddItems = useBulkAddItems();
	const reset = (0, import_react.useCallback)(() => {
		setPhase("idle");
		setResult(null);
		setPreview(null);
		setShowActions(false);
	}, []);
	const executeImport = (0, import_react.useCallback)(async (snapResult) => {
		setPhase("saving");
		try {
			for (const cat of snapResult.categories) await bulkAddItems(cat.target, cat.items);
			setPhase("done");
			const breakdown = snapResult.categories.map((c) => `${c.emoji} ${c.items.length} ${c.label}`).join(" · ");
			toast.success(`Filed: ${breakdown}`, {
				duration: 5e3,
				description: snapResult.skippedDupes > 0 ? `${snapResult.skippedDupes} duplicate(s) skipped` : void 0
			});
			setTimeout(reset, 1600);
		} catch (err) {
			console.error("Snap import error:", err);
			toast.error(err?.message || "Could not file those items.");
			reset();
		}
	}, [bulkAddItems, reset]);
	const processImportResult = (0, import_react.useCallback)(async (importResult) => {
		if (!importResult.totalItems) {
			toast.error("Could not read anything from that file.");
			reset();
			return;
		}
		let totalSkipped = 0;
		const categories = [];
		for (const cat of importResult.categories) {
			const unique = await deduplicateItems(cat.target, cat.items);
			totalSkipped += cat.items.length - unique.length;
			if (unique.length > 0) categories.push({
				target: cat.target,
				items: unique,
				label: TARGET_META$1[cat.target]?.label ?? cat.target,
				emoji: TARGET_META$1[cat.target]?.emoji ?? "📄"
			});
		}
		const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
		if (totalItems === 0) {
			toast(`Everything in that file already exists (${totalSkipped} duplicates).`);
			reset();
			return;
		}
		const snapResult = {
			categories,
			totalItems,
			skippedDupes: totalSkipped
		};
		setResult(snapResult);
		if (categories.length === 1 && totalItems <= 5) await executeImport(snapResult);
		else setPhase("review");
	}, [executeImport, reset]);
	const processImages = (0, import_react.useCallback)(async (files) => {
		const imageFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, 4);
		if (imageFiles.length === 0) {
			toast.error("No image found. Try a photo or screenshot.");
			return;
		}
		setPhase("processing");
		setShowActions(false);
		try {
			const encoded = await Promise.all(imageFiles.map(compressImage));
			setPreview(encoded[0]);
			const importResult = await aiImageImport(encoded);
			await processImportResult(importResult);
		} catch (err) {
			console.error("Snap processing error:", err);
			toast.error(err?.message || "Processing failed. Try a clearer photo.");
			reset();
		}
	}, [processImportResult, reset]);
	const processFiles = (0, import_react.useCallback)(async (files) => {
		if (files.length === 0) return;
		const imageFiles = files.filter((f) => f.type.startsWith("image/"));
		const textFiles = files.filter((f) => isTextFile(f));
		const otherFiles = files.filter((f) => !f.type.startsWith("image/") && !isTextFile(f));
		if (imageFiles.length > 0) {
			processImages(imageFiles);
			return;
		}
		if (textFiles.length > 0) {
			setPhase("processing");
			setShowActions(false);
			try {
				const file = textFiles[0];
				const text = await readFileAsText(file);
				if (!text.trim()) {
					toast.error("That file appears to be empty.");
					reset();
					return;
				}
				const importResult = await aiAutonomousImport(text, file.name);
				await processImportResult(importResult);
			} catch (err) {
				console.error("File import error:", err);
				toast.error(err?.message || "Could not process that file.");
				reset();
			}
			return;
		}
		if (otherFiles.length > 0) {
			setPhase("processing");
			setShowActions(false);
			try {
				const file = otherFiles[0];
				const cleanText = (await readFileAsText(file)).replace(/[^\x20-\x7E\u00A0-\uFFFF\n\r\t]/g, " ").replace(/\s{3,}/g, "\n").trim();
				if (cleanText.length < 20) {
					toast.error(`Could not read "${file.name}". Try converting to .txt, .csv, or an image.`);
					reset();
					return;
				}
				const importResult = await aiAutonomousImport(cleanText, file.name);
				await processImportResult(importResult);
			} catch (err) {
				console.error("Binary file import error:", err);
				toast.error(`Could not process that file type. Try .txt, .csv, or an image.`);
				reset();
			}
		}
	}, [
		processImages,
		processImportResult,
		reset
	]);
	const handleFiles = (0, import_react.useCallback)((e) => {
		const files = Array.from(e.target.files || []);
		e.target.value = "";
		if (files.length > 0) processFiles(files);
	}, [processFiles]);
	const handleFABDown = (0, import_react.useCallback)((e) => {
		if ("button" in e && e.button !== 0) return;
		longPressFired.current = false;
		longPressTimer.current = setTimeout(() => {
			longPressFired.current = true;
			longPressTimer.current = null;
			setShowActions(true);
		}, 400);
	}, []);
	const handleFABUp = (0, import_react.useCallback)((e) => {
		if ("button" in e && e.button !== 0) return;
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
			cameraRef.current?.click();
		}
	}, []);
	const pasteFromClipboard = (0, import_react.useCallback)(async () => {
		setShowActions(false);
		try {
			const clipItems = await navigator.clipboard.read();
			for (const item of clipItems) for (const type of item.types) if (type.startsWith("image/")) {
				const blob = await item.getType(type);
				processFiles([new File([blob], "pasted.png", { type })]);
				return;
			}
			const text = await navigator.clipboard.readText();
			if (text && text.trim().length > 5) {
				setPhase("processing");
				try {
					const importResult = await aiAutonomousImport(text);
					await processImportResult(importResult);
				} catch (err) {
					toast.error(err?.message || "Could not process clipboard.");
					reset();
				}
				return;
			}
			toast.error("Nothing importable in clipboard.");
		} catch {
			toast.error("Clipboard access denied.");
		}
	}, [
		processFiles,
		processImportResult,
		reset
	]);
	(0, import_react.useEffect)(() => {
		const handlePaste = (e) => {
			const t = e.target;
			if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;
			const imageFiles = Array.from(e.clipboardData?.items || []).filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter((f) => f !== null);
			if (imageFiles.length > 0) {
				e.preventDefault();
				processFiles(imageFiles);
				return;
			}
			const text = e.clipboardData?.getData("text");
			if (text && text.trim().length > 10) {
				e.preventDefault();
				setPhase("processing");
				aiAutonomousImport(text).then(processImportResult).catch((err) => {
					console.error("Paste import error:", err);
					toast.error("Could not process pasted text.");
					reset();
				});
			}
		};
		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, [
		processFiles,
		processImportResult,
		reset
	]);
	(0, import_react.useEffect)(() => {
		const handleDragOver = (e) => {
			if (e.dataTransfer?.types?.includes("Files")) {
				e.preventDefault();
				if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
			}
		};
		const handleDrop = (e) => {
			if (!e.dataTransfer?.files?.length) return;
			e.preventDefault();
			const files = Array.from(e.dataTransfer.files);
			processFiles(files);
		};
		window.addEventListener("dragover", handleDragOver);
		window.addEventListener("drop", handleDrop);
		return () => {
			window.removeEventListener("dragover", handleDragOver);
			window.removeEventListener("drop", handleDrop);
		};
	}, [processFiles]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		phase === "idle" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "fixed bottom-[calc(env(safe-area-inset-bottom)+152px)] right-4 lg:bottom-[calc(32px+64px+12px)] lg:right-8 z-[90] flex flex-col items-end gap-2",
			children: [showActions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-[89]",
				onClick: () => setShowActions(false)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setShowActions(false);
							cameraRef.current?.click();
						},
						className: "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/40 shadow-lg text-xs font-medium text-card-foreground hover:bg-secondary transition-all",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "w-4 h-4" }), " Take Photo"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setShowActions(false);
							galleryRef.current?.click();
						},
						className: "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/40 shadow-lg text-xs font-medium text-card-foreground hover:bg-secondary transition-all",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image$1, { className: "w-4 h-4" }), " Choose Image"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setShowActions(false);
							fileRef.current?.click();
						},
						className: "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/40 shadow-lg text-xs font-medium text-card-foreground hover:bg-secondary transition-all",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUp, { className: "w-4 h-4" }), " Upload File"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: pasteFromClipboard,
						className: "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/40 shadow-lg text-xs font-medium text-card-foreground hover:bg-secondary transition-all",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clipboard, { className: "w-4 h-4" }), " Paste"]
					})
				]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onMouseDown: handleFABDown,
				onMouseUp: handleFABUp,
				onMouseLeave: () => {
					if (longPressTimer.current) clearTimeout(longPressTimer.current);
				},
				onTouchStart: handleFABDown,
				onTouchEnd: (e) => {
					e.preventDefault();
					handleFABUp(e);
				},
				onContextMenu: (e) => {
					e.preventDefault();
					setShowActions(true);
				},
				className: "w-[52px] h-[52px] lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150",
				title: "Tap: camera · Long-press / right-click: more options",
				"aria-label": "Capture a photo or file to import",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "w-6 h-6 lg:w-7 lg:h-7" })
			})]
		}),
		(phase === "processing" || phase === "saving") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-[120] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "w-full max-w-xs rounded-2xl border border-border/40 bg-card p-5 shadow-2xl space-y-4",
				children: [preview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: preview,
					alt: "Captured import preview",
					className: "w-full h-36 object-cover rounded-xl border border-border/40"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-5 h-5 animate-spin text-primary shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold text-card-foreground",
						children: phase === "processing" ? "Reading content…" : "Filing items…"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-muted-foreground",
						children: phase === "processing" ? "AI recognizing and categorizing…" : "Saving to your database…"
					})] })]
				})]
			})
		}),
		phase === "review" && result && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-[120] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center",
			onClick: reset,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-border/40 bg-card p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto",
				onClick: (e) => e.stopPropagation(),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-primary" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-semibold text-card-foreground",
									children: "Capture Results"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[11px] text-muted-foreground",
									children: [result.totalItems, " items · confirm to file"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: reset,
								className: "p-1.5 rounded-lg hover:bg-secondary",
								"aria-label": "Close",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4 text-muted-foreground" })
							})
						]
					}),
					preview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: preview,
						alt: "Captured import preview",
						className: "w-full h-32 object-cover rounded-xl border border-border/40"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [result.categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-lg",
									children: cat.emoji
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex-1 min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-semibold text-card-foreground",
										children: cat.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[11px] text-muted-foreground truncate",
										children: [cat.items.slice(0, 3).map((it) => it.title || it.name || it.label || "Item").join(", "), cat.items.length > 3 && ` +${cat.items.length - 3} more`]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold text-primary",
									children: cat.items.length
								})
							]
						}, cat.target)), result.skippedDupes > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 px-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-3.5 h-3.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-muted-foreground",
								children: [result.skippedDupes, " duplicate(s) skipped"]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 pt-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: reset,
							className: "flex-1 py-2.5 rounded-xl border border-border/50 text-xs font-medium text-muted-foreground hover:bg-secondary transition-all",
							children: "Discard"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => executeImport(result),
							className: "flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-4 h-4" }),
								" File ",
								result.totalItems,
								" Items"
							]
						})]
					})
				]
			})
		}),
		phase === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-[120] flex items-center justify-center pointer-events-none",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-3 rounded-2xl bg-card/95 border border-border/40 px-8 py-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-6 h-6 text-primary" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-card-foreground",
					children: "Filed!"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			ref: cameraRef,
			type: "file",
			accept: "image/*",
			capture: "environment",
			className: "hidden",
			onChange: handleFiles
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			ref: galleryRef,
			type: "file",
			accept: "image/*",
			multiple: true,
			className: "hidden",
			onChange: handleFiles
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			ref: fileRef,
			type: "file",
			accept: "*/*",
			multiple: true,
			className: "hidden",
			onChange: handleFiles
		})
	] });
}
var VoiceCapture = lazyWithRetry(() => import("./VoiceCapture-JwnajyXO.mjs"));
var DashboardHome = lazyWithRetry(() => import("./DashboardHome-DOEc0LAH.mjs"));
var TasksPage = lazyWithRetry(() => import("./TasksPage-CkWMMJlL.mjs"));
var WebsitesPage = lazyWithRetry(() => import("./WebsitesPage-XfyGKj1o.mjs"));
var WordPressManagementPage = lazyWithRetry(() => import("./WordPressManagementPage-pDi4_W4U.mjs"));
var GitHubPage = lazyWithRetry(() => import("./GitHubPage-CYCtZJw9.mjs"));
var BuildsPage = lazyWithRetry(() => import("./BuildsPage-BMCNTKoJ.mjs"));
var LinksPage = lazyWithRetry(() => import("./LinksPage-BmOKeYDO.mjs"));
var NotesPage = lazyWithRetry(() => import("./NotesPage-BGfVaSbb.mjs"));
var FocusPage = lazyWithRetry(() => import("./FocusPage-RB85XrcY.mjs"));
var CalendarPage = lazyWithRetry(() => import("./CalendarPage-DcCqDKRY.mjs"));
var ProjectsPage = lazyWithRetry(() => import("./ProjectsPage-DJvWwSgv.mjs"));
var SettingsPage = lazyWithRetry(() => import("./SettingsPage-BcZG0jIf.mjs"));
var PaymentsPage = lazyWithRetry(() => import("./PaymentsPage-DLG7ygu3.mjs"));
var IdeasPage = lazyWithRetry(() => import("./IdeasPage-CZ1-Wks0.mjs"));
var CredentialsPage = lazyWithRetry(() => import("./CredentialsPage-C6EqeFen.mjs"));
var SEOPage = lazyWithRetry(() => import("./SEOPage-IevlRHLV.mjs"));
var CloudflarePage = lazyWithRetry(() => import("./CloudflarePage-BQQW9Dy4.mjs"));
var VercelPage = lazyWithRetry(() => import("./VercelPage-huAWSDch.mjs"));
var OpenClawPage = lazyWithRetry(() => import("./OpenClawPage-TdX6_7EB.mjs"));
var HabitsPage = lazyWithRetry(() => import("./HabitsPage-Cz5_fmfp.mjs"));
var ReviewPage = lazyWithRetry(() => import("./ReviewPage-Cmxm5fjU.mjs"));
var NowTodayPage = lazyWithRetry(() => import("./NowTodayPage-BkktsPZx.mjs"));
var DecisionsPage = lazyWithRetry(() => import("./DecisionsPage-BYppdhzo.mjs"));
var ControlCenterPage = lazyWithRetry(() => import("./ControlCenterPage-DIc2Zpwm.mjs"));
var IndustryPage = lazyWithRetry(() => import("./IndustryPage-YGnzCjB7.mjs"));
var MentionsPage = lazyWithRetry(() => import("./MentionsPage-BwBs7IhW.mjs"));
var AudiencePage = lazyWithRetry(() => import("./AudiencePage-Cgu7a1op.mjs"));
var RemindersPage = lazyWithRetry(() => import("./RemindersPage-hXone5MK.mjs"));
var CustomModulePage = lazyWithRetry(() => import("./CustomModulePage-CyRVF3KE.mjs"));
var sectionMap = {
	dashboard: DashboardHome,
	now: NowTodayPage,
	decisions: DecisionsPage,
	tasks: TasksPage,
	"google-tasks": GoogleTasksPage,
	websites: WebsitesPage,
	"wp-manage": WordPressManagementPage,
	github: GitHubPage,
	builds: BuildsPage,
	links: LinksPage,
	notes: NotesPage,
	focus: FocusPage,
	calendar: CalendarPage,
	projects: ProjectsPage,
	settings: SettingsPage,
	payments: PaymentsPage,
	ideas: IdeasPage,
	credentials: CredentialsPage,
	seo: SEOPage,
	cloudflare: CloudflarePage,
	vercel: VercelPage,
	openclaw: OpenClawPage,
	habits: HabitsPage,
	review: ReviewPage,
	"control-center": ControlCenterPage,
	industry: IndustryPage,
	mentions: MentionsPage,
	audience: AudiencePage,
	reminders: RemindersPage
};
function LoadingSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-pulse space-y-4 p-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 rounded-xl bg-muted/50 w-48" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "v10-skeleton h-24" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
				children: [...Array(4)].map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "v10-skeleton h-32" }, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "v10-skeleton h-64" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "v10-skeleton h-64" })]
			})
		]
	});
}
function DashboardLayout() {
	const dashboard = useDashboardOptional();
	const applyA11y = useA11yStore((s) => s.apply);
	const { activeSection } = useNavigationStore();
	const isMobile = useIsMobile();
	(0, import_react.useEffect)(() => {
		applyA11y();
	}, [applyA11y]);
	if (!dashboard) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardLayout, {}) });
	const { isLoading } = dashboard;
	const Section = activeSection.startsWith("custom-") ? CustomModulePage : sectionMap[activeSection] || DashboardHome;
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-screen items-center justify-center bg-background",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "w-12 h-12 mx-auto rounded-xl gradient-primary flex items-center justify-center shadow-[var(--shadow-primary)] animate-in zoom-in-75 fade-in duration-400",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-primary-foreground font-bold text-lg",
					children: "N"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300 delay-200 fill-mode-both",
				children: "Loading Mission Control..."
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "enterprise-shell relative flex h-screen overflow-hidden bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v10-aurora-bg",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "#main-content",
				className: "a11y-skip-link",
				children: "Skip to content"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative z-[1] hidden lg:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopBar, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
						id: "main-content",
						tabIndex: -1,
						className: "mobile-content-pad flex-1 overflow-y-auto lg:pb-0 overscroll-contain",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "max-w-[1680px] mx-auto px-3 pb-5 pt-3 sm:p-5 lg:p-7 xl:p-9",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudBackupBanner, {}),
								(activeSection === "tasks" || activeSection === "focus" || activeSection === "review") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DailyBriefingBanner, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteErrorBoundary, {
									sectionName: activeSection,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
										fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSkeleton, {}),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
												sectionId: activeSection,
												sectionId: activeSection
											})
										}, activeSection)
									})
								}, activeSection)
							]
						})
					}),
					!isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileBottomNav, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SnapCapture, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: null,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceCapture, {})
			})
		]
	});
}
if (typeof window !== "undefined") {
	const showFatal = (msg, stack) => {
		const el = document.getElementById("mc-fatal");
		if (!el) return;
		el.style.display = "flex";
		el.innerHTML = `
      <div style="max-width:560px;padding:32px;background:#1a1d27;border:1px solid #ef4444;border-radius:16px;color:#f8fafc;font-family:system-ui">
        <div style="font-size:24px;font-weight:800;margin-bottom:8px">Mission Control hit an error</div>
        <div style="color:#ef4444;font-weight:700;font-size:14px;margin-bottom:12px">${msg}</div>
        ${stack ? `<pre style="background:#0d0f14;padding:12px;border-radius:8;overflow:auto;font-size:11px;color:#94a3b8;white-space:pre-wrap;max-height:240px">${stack}</pre>` : ""}
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3b5cf6;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px">Reload</button>
      </div>`;
	};
	window.addEventListener("error", (e) => {
		console.error("Fatal client error:", e.error ?? e.message);
		showFatal(e.message, e.error?.stack);
	});
	window.addEventListener("unhandledrejection", (e) => {
		console.error("Unhandled promise rejection:", e.reason);
		const msg = e.reason?.message ?? String(e.reason ?? "Unknown error");
		showFatal(msg, e.reason?.stack);
	});
}
var ErrorBoundary = class extends import_react.Component {
	state = { error: null };
	static getDerivedStateFromError(error) {
		return { error };
	}
	componentDidCatch(error, info) {
		console.error("Mission Control Error:", error, info);
	}
	render() {
		if (this.state.error) {
			const err = this.state.error;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					minHeight: "100vh",
					background: "#0d0f14",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "system-ui",
					padding: 24
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						maxWidth: 640,
						background: "#1a1d27",
						border: "1px solid #ef4444",
						borderRadius: 16,
						padding: 32,
						color: "#f8fafc"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 24,
								fontWeight: 800,
								marginBottom: 8
							},
							children: "Mission Control hit an error"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								color: "#ef4444",
								fontWeight: 700,
								fontSize: 16,
								marginBottom: 12
							},
							children: err.message
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							style: {
								background: "#0d0f14",
								padding: 16,
								borderRadius: 8,
								overflow: "auto",
								fontSize: 11,
								color: "#94a3b8",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								maxHeight: 300
							},
							children: err.stack
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								this.setState({ error: null });
								window.location.reload();
							},
							style: {
								marginTop: 20,
								padding: "10px 20px",
								background: "#3b5cf6",
								color: "#fff",
								border: "none",
								borderRadius: 10,
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14
							},
							children: "Reload App"
						})
					]
				})
			});
		}
		return this.props.children;
	}
};
var queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function NotificationStarter() {
	(0, import_react.useEffect)(() => {
		startNotificationLoop();
		startAutoSnapshots();
		return () => {
			stopNotificationLoop();
			stopAutoSnapshots();
		};
	}, []);
	return null;
}
var App = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: "contents",
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DashboardProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationStarter, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardLayout, {})] })] })
	})
}) });
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Index });
function Index() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(App, {});
}
//#endregion
export { hasGoogleClientId as A, generateTemplate as C, ensureGoogleToken as D, usePlanStore as E, parseCapture as M, toRecord as N, fetchGoogleEmail as O, autonomousImport as S, inArea as T, aiAutonomousImport as _, useA11yStore as a, TARGET_META$1 as b, isSignedIn as c, signIn as d, signOut as f, useIsMobile as g, useSettingsStore as h, requestNotificationPermission as i, validGoogleToken as j, getGoogleClientId as k, listTaskLists as l, useNavigationStore as m, REMINDER_LABELS as n, QuickCaptureBar as o, cn as p, getReminderLabel as r, GoogleSetupModal as s, routes_exports as t, listTasks as u, aiImageImport as v, normalizeItems as w, autoMapFields as x, createSsrRpc as y };
