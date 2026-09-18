import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { G as useSEOSnapshots, H as useSEOChanges, K as useSEOVisibilityChecks, Q as useUpdateItem, U as useSEOIssues, V as useSEOActions, W as useSEOProfiles, _ as useAddItem, tt as useWebsites } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Cn as CircleCheck, D as Sparkles, Hn as ArrowUpRight, L as Search, Lt as History, Nt as Info, On as Check, P as Settings2, St as ListChecks, Tn as ChevronRight, X as Plus, Xn as Activity, an as Earth, cn as Database, d as TriangleAlert, en as FileBraces, f as TrendingUp, kn as ChartColumn, kt as Layers, p as TrendingDown, qt as Funnel, rn as ExternalLink, s as Upload, t as Zap, tn as Eye, wn as CircleAlert, y as Target } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { m as useNavigationStore } from "./routes-qm6I9RAb.mjs";
import { i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/SEOPage-IevlRHLV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SOURCE_LABELS = {
	gsc: "Search Console",
	bing: "Bing Webmaster",
	ga4: "Analytics",
	crawl: "Crawler",
	pagespeed: "PageSpeed",
	manual: "Manual evidence"
};
var PRIORITY_RANK = {
	critical: 4,
	high: 3,
	medium: 2,
	low: 1
};
var PRIORITY_CLASSES = {
	critical: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20",
	high: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20",
	medium: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20",
	low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20"
};
var SOURCE_CLASSES = {
	gsc: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
	bing: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
	ga4: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
	crawl: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
	pagespeed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
	manual: "bg-secondary text-muted-foreground"
};
var DATA_SOURCES = Object.keys(SOURCE_LABELS);
function isSEODataSource(value) {
	return typeof value === "string" && DATA_SOURCES.includes(value);
}
var EMPTY_PROFILE_FORM = {
	priority: "medium",
	gscProperty: "",
	bingSiteUrl: "",
	ga4Property: "",
	primaryCountry: "",
	targetLanguages: "",
	trackedQueries: "",
	notes: ""
};
var EMPTY_ACTION_FORM = {
	websiteId: "",
	title: "",
	priority: "high",
	status: "ready",
	rationale: "",
	expectedMechanism: "",
	rollback: "",
	validation: "",
	dueDate: ""
};
var EMPTY_IMPORT = JSON.stringify({
	profiles: [],
	snapshots: [],
	issues: [],
	actions: [],
	changes: [],
	visibilityChecks: []
}, null, 2);
function isNumber(value) {
	return typeof value === "number" && Number.isFinite(value);
}
function formatNumber(value, maximumFractionDigits = 0) {
	if (!isNumber(value)) return "No data";
	return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}
function formatDate(value) {
	if (!value) return "Never";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	}).format(date);
}
function formatDateTime(value) {
	if (!value) return "Never";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(date);
}
function formatAge(value) {
	if (!value) return {
		label: "No evidence",
		tone: "muted"
	};
	const timestamp = new Date(value).getTime();
	if (!Number.isFinite(timestamp)) return {
		label: "Invalid date",
		tone: "warn"
	};
	const ageDays = Math.max(0, Math.floor((Date.now() - timestamp) / 864e5));
	if (ageDays <= 7) return {
		label: `${ageDays}d old`,
		tone: "good"
	};
	if (ageDays <= 30) return {
		label: `${ageDays}d old`,
		tone: "warn"
	};
	return {
		label: `${ageDays}d old`,
		tone: "muted"
	};
}
function optionalSum(values) {
	const observed = values.filter(isNumber);
	return observed.length ? observed.reduce((sum, value) => sum + value, 0) : void 0;
}
function optionalAverage(values) {
	const observed = values.filter(isNumber);
	return observed.length ? observed.reduce((sum, value) => sum + value, 0) / observed.length : void 0;
}
function metricDelta(current, previous) {
	if (!isNumber(current) || !isNumber(previous)) return void 0;
	return current - previous;
}
function pctDelta(current, previous) {
	if (!isNumber(current) || !isNumber(previous) || previous === 0) return void 0;
	return (current - previous) / Math.abs(previous) * 100;
}
function priorityLabel(priority) {
	return priority.charAt(0).toUpperCase() + priority.slice(1);
}
function statusLabel(status) {
	return status.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function getLatestSnapshots(rows) {
	const ordered = [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.importedAt.localeCompare(a.importedAt));
	const latest = ordered[0];
	return {
		latest,
		previous: latest ? ordered.find((row) => row.source === latest.source && row.date < latest.date) : void 0
	};
}
function safeUrl(value) {
	if (!value) return void 0;
	try {
		const url = new URL(value);
		return /^https?:$/.test(url.protocol) ? url.toString() : void 0;
	} catch {
		return;
	}
}
function SourcePill({ source }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${SOURCE_CLASSES[source]}`,
		children: SOURCE_LABELS[source]
	});
}
function PriorityPill({ priority }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold ${PRIORITY_CLASSES[priority]}`,
		children: priorityLabel(priority)
	});
}
function FreshnessPill({ value }) {
	const age = formatAge(value);
	const classes = age.tone === "good" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : age.tone === "warn" ? "bg-amber-500/10 text-amber-600 dark:text-amber-300" : "bg-secondary text-muted-foreground";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${classes}`,
		children: age.label
	});
}
function MetricCard({ label, value, detail, icon: Icon, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card-glass min-w-0 p-4 sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${{
						emerald: "text-emerald-500 bg-emerald-500/10",
						blue: "text-blue-500 bg-blue-500/10",
						violet: "text-violet-500 bg-violet-500/10",
						amber: "text-amber-500 bg-amber-500/10",
						rose: "text-rose-500 bg-rose-500/10"
					}[tone]}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 18 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55",
					children: "Observed"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 truncate text-2xl font-extrabold tracking-tight text-foreground",
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 text-xs font-semibold text-foreground/80",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 line-clamp-2 text-[11px] text-muted-foreground",
				children: detail
			})
		]
	});
}
function Sparkline({ values, tone = "emerald" }) {
	if (values.length < 2) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-16 items-center justify-center rounded-xl border border-dashed border-border/70 text-[11px] text-muted-foreground",
		children: "Add two observations to see a trend"
	});
	const colors = {
		emerald: "#10b981",
		blue: "#3b82f6",
		violet: "#8b5cf6",
		amber: "#f59e0b"
	};
	const width = 360;
	const height = 72;
	const min = Math.min(...values);
	const range = Math.max(...values) - min || 1;
	const points = values.map((value, index) => {
		return `${index / (values.length - 1) * width},${64 - (value - min) / range * 54}`;
	}).join(" ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "none",
		className: "h-16 w-full overflow-visible",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
			points,
			fill: "none",
			stroke: colors[tone],
			strokeWidth: "3",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: width,
			cy: Number(points.split(" ").at(-1)?.split(",")[1] ?? height / 2),
			r: "4",
			fill: colors[tone]
		})]
	});
}
function EmptyState({ icon: Icon, title, detail, actionLabel, onAction }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-dashed border-border/80 bg-secondary/20 px-5 py-9 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 19 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 text-sm font-bold text-foreground",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground",
				children: detail
			}),
			actionLabel && onAction && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: onAction,
				className: "btn-primary mx-auto mt-4 text-xs",
				children: [actionLabel, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 13 })]
			})
		]
	});
}
function Delta({ value, inverse = false, suffix = "" }) {
	if (!isNumber(value)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-[10px] text-muted-foreground",
		children: "No comparison"
	});
	const positive = inverse ? value < 0 : value > 0;
	const neutral = value === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `inline-flex items-center gap-0.5 text-[10px] font-semibold ${neutral ? "text-muted-foreground" : positive ? "text-emerald-500" : "text-rose-500"}`,
		children: [
			!neutral && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(positive ? TrendingUp : TrendingDown, { size: 11 }),
			" ",
			value > 0 ? "+" : "",
			value.toFixed(Math.abs(value) < 10 ? 1 : 0),
			suffix
		]
	});
}
function SiteStatus({ website, profile, latest }) {
	if (website.status === "down") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-500",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { size: 11 }), " Site down"]
	});
	if (profile?.syncStatus === "error") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-500",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 11 }), " Data error"]
	});
	if (!profile || !latest) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { size: 11 }), " Needs evidence"]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-500",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 11 }), " Evidence ready"]
	});
}
function SEOPage() {
	const websites = useWebsites();
	const profiles = useSEOProfiles();
	const snapshots = useSEOSnapshots();
	const issues = useSEOIssues();
	const actions = useSEOActions();
	const changes = useSEOChanges();
	const visibilityChecks = useSEOVisibilityChecks();
	const addItem = useAddItem();
	const updateItem = useUpdateItem();
	const { setActiveSection } = useNavigationStore();
	const [scope, setScope] = (0, import_react.useState)("all");
	const [tab, setTab] = (0, import_react.useState)("overview");
	const [search, setSearch] = (0, import_react.useState)("");
	const [sourceFilter, setSourceFilter] = (0, import_react.useState)("all");
	const [profileSiteId, setProfileSiteId] = (0, import_react.useState)(null);
	const [profileForm, setProfileForm] = (0, import_react.useState)(EMPTY_PROFILE_FORM);
	const [actionOpen, setActionOpen] = (0, import_react.useState)(false);
	const [actionForm, setActionForm] = (0, import_react.useState)(EMPTY_ACTION_FORM);
	const [importOpen, setImportOpen] = (0, import_react.useState)(false);
	const [importText, setImportText] = (0, import_react.useState)(EMPTY_IMPORT);
	const websiteMap = (0, import_react.useMemo)(() => new Map(websites.map((website) => [website.id, website])), [websites]);
	const profileMap = (0, import_react.useMemo)(() => new Map(profiles.map((profile) => [profile.websiteId, profile])), [profiles]);
	const scopedWebsiteIds = (0, import_react.useMemo)(() => new Set(websites.filter((website) => scope === "all" || website.id === scope).map((website) => website.id)), [scope, websites]);
	(0, import_react.useMemo)(() => snapshots.filter((snapshot) => scopedWebsiteIds.has(snapshot.websiteId)), [scopedWebsiteIds, snapshots]);
	const scopedIssues = (0, import_react.useMemo)(() => issues.filter((issue) => scopedWebsiteIds.has(issue.websiteId)), [issues, scopedWebsiteIds]);
	const scopedActions = (0, import_react.useMemo)(() => actions.filter((action) => scopedWebsiteIds.has(action.websiteId)), [actions, scopedWebsiteIds]);
	const scopedChanges = (0, import_react.useMemo)(() => changes.filter((change) => scopedWebsiteIds.has(change.websiteId)), [changes, scopedWebsiteIds]);
	const scopedVisibility = (0, import_react.useMemo)(() => visibilityChecks.filter((check) => scopedWebsiteIds.has(check.websiteId)), [scopedWebsiteIds, visibilityChecks]);
	const siteRows = (0, import_react.useMemo)(() => websites.filter((website) => scope === "all" || website.id === scope).filter((website) => {
		const query = search.trim().toLowerCase();
		return !query || website.name.toLowerCase().includes(query) || website.url.toLowerCase().includes(query);
	}).map((website) => {
		const rows = snapshots.filter((snapshot) => snapshot.websiteId === website.id);
		const { latest, previous } = getLatestSnapshots(rows);
		return {
			website,
			profile: profileMap.get(website.id),
			latest,
			previous,
			issues: issues.filter((issue) => issue.websiteId === website.id && (issue.status === "open" || issue.status === "in-progress")),
			actions: actions.filter((action) => action.websiteId === website.id && action.status !== "done" && action.status !== "cancelled"),
			trend: [...rows].sort((a, b) => a.date.localeCompare(b.date)).map((row) => row.clicks).filter(isNumber)
		};
	}), [
		actions,
		issues,
		profileMap,
		search,
		scope,
		snapshots,
		websites
	]);
	const latestSnapshots = (0, import_react.useMemo)(() => siteRows.map((row) => row.latest).filter((snapshot) => Boolean(snapshot)), [siteRows]);
	const totalClicks = optionalSum(latestSnapshots.map((snapshot) => snapshot.clicks));
	const totalImpressions = optionalSum(latestSnapshots.map((snapshot) => snapshot.impressions));
	const averagePosition = optionalAverage(latestSnapshots.map((snapshot) => snapshot.avgPosition));
	const openIssueCount = scopedIssues.filter((issue) => issue.status === "open" || issue.status === "in-progress").length;
	const openActionCount = scopedActions.filter((action) => action.status !== "done" && action.status !== "cancelled").length;
	const configuredCount = websites.filter((website) => scopedWebsiteIds.has(website.id) && profileMap.get(website.id)?.syncStatus === "connected").length;
	const evidenceSiteCount = latestSnapshots.length;
	const mentionedCount = scopedVisibility.filter((check) => check.mentioned).length;
	const citedCount = scopedVisibility.filter((check) => check.cited).length;
	const aiCheckCount = scopedVisibility.length;
	const priorityActions = (0, import_react.useMemo)(() => [...scopedActions].filter((action) => action.status !== "done" && action.status !== "cancelled").sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")).slice(0, 6), [scopedActions]);
	const recentChanges = (0, import_react.useMemo)(() => [...scopedChanges].filter((change) => sourceFilter === "all" || change.source === sourceFilter).filter((change) => {
		const query = search.trim().toLowerCase();
		const websiteName = websiteMap.get(change.websiteId)?.name.toLowerCase() ?? "";
		return !query || websiteName.includes(query) || change.field.toLowerCase().includes(query) || (change.url ?? "").toLowerCase().includes(query);
	}).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 40), [
		search,
		scopedChanges,
		sourceFilter,
		websiteMap
	]);
	const openIssues = (0, import_react.useMemo)(() => [...scopedIssues].filter((issue) => issue.status === "open" || issue.status === "in-progress").sort((a, b) => PRIORITY_RANK[b.severity] - PRIORITY_RANK[a.severity] || b.observedAt.localeCompare(a.observedAt)), [scopedIssues]);
	const setProfile = (siteId) => {
		const existing = profileMap.get(siteId);
		setProfileForm(existing ? {
			priority: existing.priority,
			gscProperty: existing.gscProperty ?? "",
			bingSiteUrl: existing.bingSiteUrl ?? "",
			ga4Property: existing.ga4Property ?? "",
			primaryCountry: existing.primaryCountry ?? "",
			targetLanguages: existing.targetLanguages?.join("\n") ?? "",
			trackedQueries: existing.trackedQueries?.join("\n") ?? "",
			notes: existing.notes ?? ""
		} : EMPTY_PROFILE_FORM);
		setProfileSiteId(siteId);
	};
	const saveProfile = async () => {
		if (!profileSiteId) return;
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const payload = {
			websiteId: profileSiteId,
			priority: profileForm.priority,
			gscProperty: profileForm.gscProperty.trim() || void 0,
			bingSiteUrl: profileForm.bingSiteUrl.trim() || void 0,
			ga4Property: profileForm.ga4Property.trim() || void 0,
			primaryCountry: profileForm.primaryCountry.trim() || void 0,
			targetLanguages: profileForm.targetLanguages.split("\n").map((value) => value.trim()).filter(Boolean),
			trackedQueries: profileForm.trackedQueries.split("\n").map((value) => value.trim()).filter(Boolean),
			syncStatus: profileMap.get(profileSiteId)?.syncStatus ?? "not-configured",
			lastSyncedAt: profileMap.get(profileSiteId)?.lastSyncedAt,
			syncError: profileMap.get(profileSiteId)?.syncError,
			notes: profileForm.notes.trim() || void 0,
			updatedAt: now
		};
		const existing = profileMap.get(profileSiteId);
		if (existing) await updateItem("seoProfiles", existing.id, payload);
		else await addItem("seoProfiles", {
			...payload,
			createdAt: now
		});
		setProfileSiteId(null);
		toast.success("SEO profile saved. Add a verified snapshot or connector result next.");
	};
	const openNewAction = (websiteId) => {
		setActionForm({
			...EMPTY_ACTION_FORM,
			websiteId: websiteId ?? (scope !== "all" ? scope : websites[0]?.id ?? "")
		});
		setActionOpen(true);
	};
	const saveAction = async () => {
		if (!actionForm.websiteId || !actionForm.title.trim()) {
			toast.error("Choose a website and enter an action title.");
			return;
		}
		const missing = [
			["rationale", actionForm.rationale],
			["expected mechanism", actionForm.expectedMechanism],
			["rollback", actionForm.rollback],
			["validation", actionForm.validation]
		].filter(([, value]) => !value.trim()).map(([label]) => label);
		if (missing.length) {
			toast.error(`Complete the action contract: ${missing.join(", ")}.`);
			return;
		}
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await addItem("seoActions", {
			websiteId: actionForm.websiteId,
			title: actionForm.title.trim(),
			priority: actionForm.priority,
			status: actionForm.status,
			rationale: actionForm.rationale.trim(),
			expectedMechanism: actionForm.expectedMechanism.trim(),
			rollback: actionForm.rollback.trim(),
			validation: actionForm.validation.trim(),
			source: "manual",
			dueDate: actionForm.dueDate || void 0,
			createdAt: now,
			updatedAt: now
		});
		setActionOpen(false);
		toast.success("Action added to the evidence-backed queue.");
	};
	const setActionStatus = async (action, status) => {
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await updateItem("seoActions", action.id, {
			status,
			updatedAt: now,
			completedAt: status === "done" ? now : void 0
		});
		toast.success(`Action marked ${statusLabel(status).toLowerCase()}.`);
	};
	const setIssueStatus = async (issue, status) => {
		await updateItem("seoIssues", issue.id, {
			status,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		toast.success(`Issue marked ${statusLabel(status).toLowerCase()}.`);
	};
	const createActionFromIssue = async (issue) => {
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await addItem("seoActions", {
			websiteId: issue.websiteId,
			title: issue.title,
			priority: issue.severity,
			status: "ready",
			rationale: issue.evidence ?? "Created from an observed SEO issue.",
			expectedMechanism: issue.expectedMechanism ?? "Define the expected organic, technical, AEO, or GEO mechanism before changing production.",
			rollback: issue.rollback ?? "Record the exact prior state and revert only after validation fails.",
			validation: issue.validation ?? "Define the URL, metric, query set, and validation date before execution.",
			issueId: issue.id,
			source: "issue",
			createdAt: now,
			updatedAt: now
		});
		toast.success("Issue copied to the prioritized action queue.");
	};
	const importEvidence = async () => {
		let parsed;
		try {
			const value = JSON.parse(importText);
			if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The root value must be a JSON object.");
			parsed = value;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Invalid JSON.");
			return;
		}
		const collections = [
			["profiles", "seoProfiles"],
			["snapshots", "seoSnapshots"],
			["issues", "seoIssues"],
			["actions", "seoActions"],
			["changes", "seoChanges"],
			["visibilityChecks", "seoVisibilityChecks"]
		];
		const knownIds = new Set(websites.map((website) => website.id));
		let imported = 0;
		let skipped = 0;
		for (const [key, table] of collections) {
			const rows = parsed[key];
			if (!Array.isArray(rows)) continue;
			for (const row of rows) {
				if (!row || typeof row !== "object" || Array.isArray(row)) {
					skipped += 1;
					continue;
				}
				const record = row;
				if (typeof record.websiteId !== "string" || !knownIds.has(record.websiteId)) {
					skipped += 1;
					continue;
				}
				if ([
					"seoSnapshots",
					"seoIssues",
					"seoChanges"
				].includes(table) && !isSEODataSource(record.source)) {
					skipped += 1;
					continue;
				}
				const incomingId = typeof record.id === "string" ? record.id : void 0;
				const payload = { ...record };
				delete payload.id;
				try {
					if (incomingId) {
						if (table === "seoProfiles" ? profiles.find((item) => item.id === incomingId) : table === "seoSnapshots" ? snapshots.find((item) => item.id === incomingId) : table === "seoIssues" ? issues.find((item) => item.id === incomingId) : table === "seoActions" ? actions.find((item) => item.id === incomingId) : table === "seoChanges" ? changes.find((item) => item.id === incomingId) : visibilityChecks.find((item) => item.id === incomingId)) await updateItem(table, incomingId, payload);
						else await addItem(table, payload);
					} else await addItem(table, payload);
					imported += 1;
				} catch {
					skipped += 1;
				}
			}
		}
		setImportOpen(false);
		toast.success(`Imported ${imported} evidence record${imported === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`);
	};
	const tabItems = [
		{
			id: "overview",
			label: "Portfolio overview",
			icon: ChartColumn
		},
		{
			id: "changes",
			label: "Exact changes",
			icon: History,
			count: scopedChanges.length
		},
		{
			id: "queue",
			label: "Action queue",
			icon: ListChecks,
			count: openActionCount + openIssueCount
		},
		{
			id: "data",
			label: "Data health",
			icon: Database
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5 pb-10 sm:space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "relative overflow-hidden rounded-[30px] p-6 sm:p-8",
				style: {
					background: "linear-gradient(135deg,#081321 0%,#0d1f2f 50%,#123e3b 100%)",
					boxShadow: "0 30px 70px -35px rgba(8,19,33,.72)"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute inset-0 opacity-80",
					style: { background: "radial-gradient(520px 280px at 5% 0%,rgba(16,185,129,.30),transparent 60%),radial-gradient(520px 300px at 100% 0%,rgba(59,130,246,.26),transparent 60%)" }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-3xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" }), " Daily organic growth review"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-3xl font-extrabold tracking-tight text-white sm:text-5xl",
								children: "Portfolio SEO control center"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-[15px]",
								children: "Review every website, exact before and after changes, search performance, technical health, AI visibility, AEO, and GEO opportunities from one evidence-backed workspace."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 flex flex-wrap gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setImportOpen(true),
										className: "inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 14 }), " Import evidence"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => openNewAction(),
										className: "inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/15",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Add next action"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setActiveSection("websites"),
										className: "inline-flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold text-white/70 transition hover:text-white",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Earth, { size: 14 }),
											" Manage websites ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { size: 13 })
										]
									})
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid w-full shrink-0 grid-cols-2 gap-2 sm:w-[320px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl font-extrabold text-white",
									children: websites.length
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50",
									children: "Sites in portfolio"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl font-extrabold text-white",
									children: evidenceSiteCount
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50",
									children: "Sites with evidence"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl font-extrabold text-white",
									children: openIssueCount
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50",
									children: "Open issues"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl font-extrabold text-white",
									children: openActionCount
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50",
									children: "Open actions"
								})]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm sm:flex-row sm:items-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 14,
							className: "shrink-0 text-muted-foreground"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: search,
							onChange: (event) => setSearch(event.target.value),
							placeholder: "Filter websites, URLs, fields...",
							className: "w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, {
							size: 14,
							className: "text-muted-foreground"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: scope,
							onChange: (event) => setScope(event.target.value),
							className: "rounded-xl bg-secondary/70 px-3 py-2.5 text-xs font-semibold text-foreground outline-none",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "All websites"
							}), websites.map((website) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: website.id,
								children: website.name
							}, website.id))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setImportOpen(true),
						className: "btn-secondary shrink-0 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileBraces, { size: 14 }), " Import JSON"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 lg:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						label: "Observed clicks",
						value: formatNumber(totalClicks),
						detail: totalClicks === void 0 ? "Connect or import Search Console data" : `${latestSnapshots.filter((snapshot) => isNumber(snapshot.clicks)).length} site snapshots`,
						icon: TrendingUp,
						tone: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						label: "Observed impressions",
						value: formatNumber(totalImpressions),
						detail: totalImpressions === void 0 ? "No verified search exposure loaded" : "Latest available snapshot per site",
						icon: Eye,
						tone: "blue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						label: "Average position",
						value: formatNumber(averagePosition, 1),
						detail: averagePosition === void 0 ? "No comparable position data" : "Unweighted mean of latest observations",
						icon: Target,
						tone: "violet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						label: "AI mentions / citations",
						value: aiCheckCount ? `${mentionedCount} / ${citedCount}` : "No data",
						detail: aiCheckCount ? `${aiCheckCount} recorded visibility checks` : "Record prompt evidence before judging AI visibility",
						icon: Sparkles,
						tone: "amber"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						label: "Connected sources",
						value: `${configuredCount}/${websites.filter((website) => scopedWebsiteIds.has(website.id)).length || 0}`,
						detail: "Profiles marked connected, not guessed",
						icon: Activity,
						tone: "rose"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/60 p-1.5 shadow-sm",
				children: tabItems.map((item) => {
					const Icon = item.icon;
					const active = tab === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setTab(item.id),
						className: `inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 14 }),
							" ",
							item.label,
							item.count ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-secondary text-foreground"}`,
								children: item.count
							}) : null
						]
					}, item.id);
				})
			}),
			tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 xl:grid-cols-[1.45fr_.85fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated min-w-0 p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
								size: 17,
								className: "text-primary"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-extrabold text-foreground",
								children: "Website review board"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "The latest observed state for each website. Missing values stay empty."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setActiveSection("websites"),
							className: "inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline",
							children: ["Manage ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 13 })]
						})]
					}), siteRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: Earth,
						title: "No websites match this filter",
						detail: "Add a website in My Websites, then configure its evidence sources here.",
						actionLabel: "Open websites",
						onAction: () => setActiveSection("websites")
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-3 md:grid-cols-2",
						children: siteRows.map((row) => {
							const latestClicksDelta = metricDelta(row.latest?.clicks, row.previous?.clicks);
							const latestPositionDelta = metricDelta(row.latest?.avgPosition, row.previous?.avgPosition);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "rounded-2xl border border-border/70 bg-background/45 p-4 transition hover:border-primary/25 hover:shadow-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "truncate text-sm font-bold text-foreground",
												children: row.website.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
												href: safeUrl(row.website.url),
												target: "_blank",
												rel: "noopener noreferrer",
												className: "mt-1 flex max-w-full items-center gap-1 truncate text-[11px] text-primary hover:underline",
												children: [row.website.url, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
													size: 10,
													className: "shrink-0"
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setProfile(row.website.id),
											className: "rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-primary",
											title: "Configure evidence sources",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { size: 15 })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 flex flex-wrap items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteStatus, {
											website: row.website,
											profile: row.profile,
											latest: row.latest
										}), row.latest && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourcePill, { source: row.latest.source }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FreshnessPill, { value: row.latest.date })] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-4 grid grid-cols-3 gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-xl bg-secondary/60 p-2.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-sm font-extrabold text-emerald-500",
														children: formatNumber(row.latest?.clicks)
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "mt-0.5 text-[10px] text-muted-foreground",
														children: "Clicks"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, { value: latestClicksDelta })
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-xl bg-secondary/60 p-2.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-sm font-extrabold text-blue-500",
														children: formatNumber(row.latest?.impressions)
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "mt-0.5 text-[10px] text-muted-foreground",
														children: "Impressions"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, {
														value: pctDelta(row.latest?.impressions, row.previous?.impressions),
														suffix: "%"
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-xl bg-secondary/60 p-2.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-sm font-extrabold text-violet-500",
														children: formatNumber(row.latest?.avgPosition, 1)
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "mt-0.5 text-[10px] text-muted-foreground",
														children: "Position"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, {
														value: latestPositionDelta,
														inverse: true
													})
												]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkline, {
											values: row.trend,
											tone: "emerald"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											row.issues.length,
											" open issue",
											row.issues.length === 1 ? "" : "s",
											" ·",
											" ",
											row.actions.length,
											" action",
											row.actions.length === 1 ? "" : "s"
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												setScope(row.website.id);
												setTab("queue");
											},
											className: "font-bold text-primary hover:underline",
											children: "Review site"
										})]
									})
								]
							}, row.website.id);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated min-w-0 p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, {
								size: 17,
								className: "text-amber-500"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-extrabold text-foreground",
								children: "Today's priority queue"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Only actions with a recorded rationale and validation contract."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setTab("queue");
							},
							className: "text-xs font-bold text-primary hover:underline",
							children: "View queue"
						})]
					}), priorityActions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: ListChecks,
						title: "No approved actions yet",
						detail: "Import evidence, triage an issue, or add a bounded action with a rollback and validation plan.",
						actionLabel: "Add action",
						onAction: () => openNewAction()
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2.5",
						children: priorityActions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-border/70 bg-background/45 p-3.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,.12)]" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs font-bold text-foreground",
												children: action.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1 text-[10px] text-muted-foreground",
												children: [
													websiteMap.get(action.websiteId)?.name ?? "Unknown website",
													" ·",
													" ",
													action.dueDate ? `Due ${formatDate(action.dueDate)}` : "No due date"
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityPill, { priority: action.priority })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground",
									children: action.rationale || "No rationale recorded. Add the observed defect before execution."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60",
										children: statusLabel(action.status)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setActionStatus(action, action.status === "in-progress" ? "ready" : "in-progress"),
										className: "inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/15",
										children: [action.status === "in-progress" ? "Pause" : "Start", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 11 })]
									})]
								})
							]
						}, action.id))
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-start justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, {
								size: 17,
								className: "text-rose-500"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-extrabold text-foreground",
								children: "Observed issues"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Technical SEO, content, SERP, AEO, GEO, and AI visibility findings."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setTab("queue"),
							className: "text-xs font-bold text-primary hover:underline",
							children: "Triage"
						})]
					}), openIssues.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: CircleCheck,
						title: "No open issues recorded",
						detail: "This means no issues have been imported or entered. It does not prove that every website is healthy."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2.5",
						children: openIssues.slice(0, 5).map((issue) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3 rounded-2xl border border-border/70 bg-background/45 p-3.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityPill, { priority: issue.severity }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-bold text-foreground",
											children: issue.title
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1 text-[10px] text-muted-foreground",
										children: [
											websiteMap.get(issue.websiteId)?.name ?? "Unknown website",
											" ·",
											" ",
											statusLabel(issue.category),
											" · ",
											formatDate(issue.observedAt)
										]
									}),
									issue.url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-1 truncate text-[10px] text-primary",
										children: issue.url
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => createActionFromIssue(issue),
								className: "shrink-0 rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-foreground hover:bg-primary/10 hover:text-primary",
								children: "Create action"
							})]
						}, issue.id))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-start justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, {
								size: 17,
								className: "text-violet-500"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-extrabold text-foreground",
								children: "AI visibility evidence"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Prompt-level observations, not estimated AI citations."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setTab("data"),
							className: "text-xs font-bold text-primary hover:underline",
							children: "Inspect data"
						})]
					}), scopedVisibility.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: Sparkles,
						title: "No AI visibility checks recorded",
						detail: "Record the exact query, engine, mention, citation, URL, and evidence source before judging AI visibility, AEO, or GEO performance.",
						actionLabel: "Import checks",
						onAction: () => setImportOpen(true)
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-secondary/60 p-3 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xl font-extrabold text-foreground",
									children: aiCheckCount
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-muted-foreground",
									children: "Checks"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-secondary/60 p-3 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xl font-extrabold text-emerald-500",
									children: mentionedCount
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-muted-foreground",
									children: "Mentioned"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-secondary/60 p-3 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xl font-extrabold text-violet-500",
									children: citedCount
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-muted-foreground",
									children: "Cited"
								})]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 space-y-2",
						children: [...scopedVisibility].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)).slice(0, 3).map((check) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3 rounded-xl border border-border/60 p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `mt-0.5 h-2 w-2 shrink-0 rounded-full ${check.cited ? "bg-violet-500" : check.mentioned ? "bg-emerald-500" : "bg-muted-foreground/30"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-xs font-bold text-foreground",
									children: check.query
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 text-[10px] text-muted-foreground",
									children: [
										statusLabel(check.engine),
										" · ",
										formatDate(check.checkedAt),
										" ·",
										" ",
										check.cited ? "Cited" : check.mentioned ? "Mentioned" : "Not observed"
									]
								})]
							})]
						}, check.id))
					})] })]
				})]
			})] }),
			tab === "changes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card-elevated p-5 sm:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, {
							size: 17,
							className: "text-primary"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-extrabold text-foreground",
							children: "Exact change history"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Before and after values with timestamp, object, URL, source, and validation status."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: sourceFilter,
							onChange: (event) => setSourceFilter(event.target.value),
							className: "rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground outline-none",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "All sources"
							}), DATA_SOURCES.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: source,
								children: SOURCE_LABELS[source]
							}, source))]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setImportOpen(true),
							className: "btn-secondary text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 13 }), " Add evidence"]
						})]
					})]
				}), recentChanges.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: History,
					title: "No exact changes recorded",
					detail: "Import or enter a change record. The dashboard will not infer before and after values from current metrics.",
					actionLabel: "Import changes",
					onAction: () => setImportOpen(true)
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full min-w-[760px] text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border/70 text-[10px] uppercase tracking-wider text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3",
									children: "When"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3",
									children: "Website / object"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3",
									children: "Field"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3",
									children: "Before"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3",
									children: "After"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3",
									children: "Evidence"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: recentChanges.map((change) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border/50 align-top text-xs last:border-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-3 text-muted-foreground",
									children: [formatDateTime(change.occurredAt), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourcePill, { source: change.source })
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-bold text-foreground",
										children: websiteMap.get(change.websiteId)?.name ?? "Unknown website"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1 text-[10px] text-muted-foreground",
										children: [statusLabel(change.objectType), change.url ? ` · ${change.url}` : ""]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 font-semibold text-foreground",
									children: change.field
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "max-w-[180px] whitespace-pre-wrap break-words px-3 py-3 text-rose-500",
									children: change.before || "Empty"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "max-w-[180px] whitespace-pre-wrap break-words px-3 py-3 text-emerald-500",
									children: change.after || "Empty"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `rounded-full px-2 py-1 text-[10px] font-bold ${change.status === "validated" ? "bg-emerald-500/10 text-emerald-500" : change.status === "reverted" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"}`,
										children: statusLabel(change.status)
									}), change.evidence && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-2 max-w-[180px] text-[10px] leading-4 text-muted-foreground",
										children: change.evidence
									})]
								})
							]
						}, change.id)) })]
					})
				})]
			}),
			tab === "queue" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 xl:grid-cols-[1.1fr_.9fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-start justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, {
								size: 17,
								className: "text-primary"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-extrabold text-foreground",
								children: "Prioritized next actions"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Each action should state why, expected mechanism, rollback, and validation."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => openNewAction(),
							className: "btn-primary text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 13 }), " New action"]
						})]
					}), scopedActions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: ListChecks,
						title: "Action queue is empty",
						detail: "Create a bounded action after recording the evidence and expected mechanism.",
						actionLabel: "Add action",
						onAction: () => openNewAction()
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2.5",
						children: [...scopedActions].sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.updatedAt.localeCompare(a.updatedAt)).map((action) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-border/70 bg-background/45 p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityPill, { priority: action.priority }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-bold text-foreground",
											children: action.title
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1 text-[10px] text-muted-foreground",
										children: [
											websiteMap.get(action.websiteId)?.name ?? "Unknown website",
											" ·",
											" ",
											statusLabel(action.status),
											action.dueDate ? ` · Due ${formatDate(action.dueDate)}` : ""
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: action.status,
									onChange: (event) => setActionStatus(action, event.target.value),
									className: "rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-foreground outline-none",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "backlog",
											children: "Backlog"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "ready",
											children: "Ready"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "in-progress",
											children: "In progress"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "blocked",
											children: "Blocked"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "done",
											children: "Done"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "cancelled",
											children: "Cancelled"
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 grid gap-2 text-[11px] leading-5 text-muted-foreground md:grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-foreground",
											children: "Why:"
										}),
										" ",
										action.rationale || "Not recorded"
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-foreground",
											children: "Mechanism:"
										}),
										" ",
										action.expectedMechanism || "Not recorded"
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-foreground",
											children: "Validation:"
										}),
										" ",
										action.validation || "Not recorded"
									] })
								]
							})]
						}, action.id))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-5 flex items-start justify-between",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
								size: 17,
								className: "text-amber-500"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-extrabold text-foreground",
								children: "Issues awaiting action"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Convert an issue into a bounded change only after its evidence is reviewed."
						})] })
					}), openIssues.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: Check,
						title: "No open issues",
						detail: "No issue records are currently open in this scope."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2.5",
						children: openIssues.map((issue) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-border/70 bg-background/45 p-3.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityPill, { priority: issue.severity }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-bold text-foreground",
												children: issue.title
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1 text-[10px] text-muted-foreground",
											children: [
												websiteMap.get(issue.websiteId)?.name ?? "Unknown website",
												" ·",
												" ",
												SOURCE_LABELS[issue.source]
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setIssueStatus(issue, issue.status === "in-progress" ? "open" : "in-progress"),
										className: "rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-foreground",
										children: issue.status === "in-progress" ? "Pause" : "Start"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 line-clamp-3 text-[11px] leading-5 text-muted-foreground",
									children: issue.evidence || "No evidence detail recorded."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => createActionFromIssue(issue),
										className: "text-[10px] font-bold text-primary hover:underline",
										children: "Create action"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setIssueStatus(issue, "resolved"),
										className: "text-[10px] font-bold text-emerald-500 hover:underline",
										children: "Mark resolved"
									})]
								})
							]
						}, issue.id))
					})]
				})]
			}),
			tab === "data" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 xl:grid-cols-[1fr_.9fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-start justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, {
								size: 17,
								className: "text-primary"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-extrabold text-foreground",
								children: "Source and freshness coverage"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "A connected profile is configuration only. Metrics appear only after an observation is imported or synced."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setImportOpen(true),
							className: "btn-secondary text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 13 }), " Import"]
						})]
					}), websites.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: Earth,
						title: "No websites configured",
						detail: "Create your website records first.",
						actionLabel: "Open websites",
						onAction: () => setActiveSection("websites")
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2.5",
						children: websites.filter((website) => scopedWebsiteIds.has(website.id)).map((website) => {
							const profile = profileMap.get(website.id);
							const rows = snapshots.filter((snapshot) => snapshot.websiteId === website.id);
							const { latest } = getLatestSnapshots(rows);
							const age = formatAge(latest?.date);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-border/70 bg-background/45 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "truncate text-sm font-bold text-foreground",
												children: website.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-1 text-[10px] text-muted-foreground",
												children: website.url
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteStatus, {
											website,
											profile,
											latest
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setProfile(website.id),
											className: "rounded-lg bg-secondary p-2 text-muted-foreground hover:text-primary",
											title: "Configure profile",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { size: 14 })
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl bg-secondary/60 p-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-muted-foreground",
												children: "Profile"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-1 text-xs font-bold text-foreground",
												children: profile ? statusLabel(profile.syncStatus) : "Not configured"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl bg-secondary/60 p-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-muted-foreground",
												children: "Latest evidence"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-1 text-xs font-bold text-foreground",
												children: latest ? formatDate(latest.date) : "None"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl bg-secondary/60 p-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-muted-foreground",
												children: "Age"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `mt-1 text-xs font-bold ${age.tone === "good" ? "text-emerald-500" : age.tone === "warn" ? "text-amber-500" : "text-muted-foreground"}`,
												children: age.label
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl bg-secondary/60 p-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-muted-foreground",
												children: "Snapshots"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-1 text-xs font-bold text-foreground",
												children: rows.length
											})]
										})
									]
								})]
							}, website.id);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card-elevated p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
							size: 17,
							className: "text-amber-500"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-extrabold text-foreground",
							children: "Connector contract"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "What the future server-side ingestion layer should write."
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3 text-xs leading-5 text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-border/70 bg-background/45 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-bold text-foreground",
									children: "Search performance"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1",
									children: "Import date, source, clicks, impressions, CTR, average position, period, and source reference."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-border/70 bg-background/45 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-bold text-foreground",
									children: "Technical evidence"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1",
									children: "Import exact URL, defect, observed timestamp, source, expected mechanism, rollback, and validation contract."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-border/70 bg-background/45 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-bold text-foreground",
									children: "AI, AEO, and GEO"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1",
									children: "Record the exact engine, prompt, mention state, citation state, cited URL, evidence, and verification status. No estimated visibility."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-700 dark:text-amber-300",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 font-bold",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { size: 14 }), " Current repo limitation"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1",
									children: "This repository is a browser-first app. It does not yet contain secure OAuth workers for GSC, Bing, GA4, crawlers, or AI prompt observation. Import keeps the UI honest until those connectors are added."
								})]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "card-glass p-5 sm:p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, {
							size: 17,
							className: "text-primary"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-extrabold text-foreground",
							children: "Daily review rule"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-3xl text-xs leading-5 text-muted-foreground",
						children: "Start with fresh evidence, inspect exact changes, triage critical issues, choose one or two bounded actions, and validate the expected mechanism before declaring a lift in organic traffic, SERP rankings, AEO, GEO, or AI visibility."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "https://search.google.com/search-console",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-secondary text-xs",
							children: ["Open Search Console ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 12 })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "https://www.bing.com/webmasters",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-secondary text-xs",
							children: ["Open Bing ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 12 })]
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: Boolean(profileSiteId),
				onClose: () => setProfileSiteId(null),
				title: `Configure SEO profile${profileSiteId ? ` · ${websiteMap.get(profileSiteId)?.name ?? "Website"}` : ""}`,
				onSubmit: saveProfile,
				submitLabel: "Save profile",
				size: "lg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-5 text-blue-700 dark:text-blue-300",
						children: "Configuration does not create metrics. Mark a connector connected only when a real ingestion job or verified import has run."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Priority",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: profileForm.priority,
								onChange: (value) => setProfileForm((form) => ({
									...form,
									priority: value
								})),
								options: [
									"critical",
									"high",
									"medium",
									"low"
								].map((value) => ({
									value,
									label: priorityLabel(value)
								}))
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Primary country",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								value: profileForm.primaryCountry,
								onChange: (value) => setProfileForm((form) => ({
									...form,
									primaryCountry: value
								})),
								placeholder: "Optional market"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "GSC property",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								value: profileForm.gscProperty,
								onChange: (value) => setProfileForm((form) => ({
									...form,
									gscProperty: value
								})),
								placeholder: "sc-domain:example.com or URL property"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Bing site URL",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								value: profileForm.bingSiteUrl,
								onChange: (value) => setProfileForm((form) => ({
									...form,
									bingSiteUrl: value
								})),
								placeholder: "https://example.com/"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "GA4 property",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: profileForm.ga4Property,
							onChange: (value) => setProfileForm((form) => ({
								...form,
								ga4Property: value
							})),
							placeholder: "Property ID or reference"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Target languages",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
								value: profileForm.targetLanguages,
								onChange: (value) => setProfileForm((form) => ({
									...form,
									targetLanguages: value
								})),
								placeholder: "One language per line",
								rows: 3
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Tracked queries",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
								value: profileForm.trackedQueries,
								onChange: (value) => setProfileForm((form) => ({
									...form,
									trackedQueries: value
								})),
								placeholder: "One query per line",
								rows: 3
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Notes",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: profileForm.notes,
							onChange: (value) => setProfileForm((form) => ({
								...form,
								notes: value
							})),
							placeholder: "Market, route ownership, or connector notes",
							rows: 3
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: actionOpen,
				onClose: () => setActionOpen(false),
				title: "Add bounded SEO action",
				onSubmit: saveAction,
				submitLabel: "Add action",
				size: "lg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Website",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: actionForm.websiteId,
								onChange: (value) => setActionForm((form) => ({
									...form,
									websiteId: value
								})),
								options: [{
									value: "",
									label: "Choose a website"
								}, ...websites.map((website) => ({
									value: website.id,
									label: website.name
								}))]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Priority",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: actionForm.priority,
								onChange: (value) => setActionForm((form) => ({
									...form,
									priority: value
								})),
								options: [
									"critical",
									"high",
									"medium",
									"low"
								].map((value) => ({
									value,
									label: priorityLabel(value)
								}))
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Action title",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: actionForm.title,
							onChange: (value) => setActionForm((form) => ({
								...form,
								title: value
							})),
							placeholder: "Example: repair canonical mismatch on /guide/"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Why this matters",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: actionForm.rationale,
							onChange: (value) => setActionForm((form) => ({
								...form,
								rationale: value
							})),
							placeholder: "Observed defect, query, URL, and baseline",
							rows: 3
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Expected mechanism",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: actionForm.expectedMechanism,
							onChange: (value) => setActionForm((form) => ({
								...form,
								expectedMechanism: value
							})),
							placeholder: "What should improve and why?",
							rows: 3
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Rollback",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
								value: actionForm.rollback,
								onChange: (value) => setActionForm((form) => ({
									...form,
									rollback: value
								})),
								placeholder: "Exact reversible rollback",
								rows: 3
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Validation",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
								value: actionForm.validation,
								onChange: (value) => setActionForm((form) => ({
									...form,
									validation: value
								})),
								placeholder: "URL, metric, query set, and date",
								rows: 3
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Status",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: actionForm.status,
								onChange: (value) => setActionForm((form) => ({
									...form,
									status: value
								})),
								options: [
									"backlog",
									"ready",
									"in-progress",
									"blocked"
								].map((value) => ({
									value,
									label: statusLabel(value)
								}))
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Due date",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								type: "date",
								value: actionForm.dueDate,
								onChange: (value) => setActionForm((form) => ({
									...form,
									dueDate: value
								}))
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: importOpen,
				onClose: () => setImportOpen(false),
				title: "Import verified SEO evidence",
				onSubmit: importEvidence,
				submitLabel: "Merge evidence",
				size: "lg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 font-bold",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileBraces, { size: 14 }), " Merge-only import"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1",
							children: "Records must reference an existing website ID. Existing IDs update; new records receive a local ID. Do not paste credentials or unverified estimates."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "JSON payload",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: importText,
							onChange: setImportText,
							rows: 16
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] leading-5 text-muted-foreground",
						children: "Supported arrays: profiles, snapshots, issues, actions, changes, visibilityChecks. Snapshot fields can include clicks, impressions, CTR, average position, indexed pages, schema, canonical, Core Web Vitals, and AI counts. Visibility checks should include the exact engine, query, mention state, citation state, cited URL, and evidence."
					})
				]
			})
		]
	});
}
//#endregion
export { SEOPage as default };
