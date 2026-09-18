import { i as __toESM } from "../_runtime.mjs";
import { n as genId, t as db } from "./db-DLy-AV_e.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as markCloudRecordDirty, u as queueCloudPush, v as useAudienceAccounts, y as useAudienceReadings } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { G as RefreshCw, X as Plus, f as TrendingUp, h as Trash2, p as TrendingDown, ut as Minus } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { l as runAudienceCollector, n as EmptyState, r as Panel, s as relTime, t as CCHeader } from "./ui-BiQ_kQgK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AudiencePage-Cgu7a1op.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PLATFORMS = [
	{
		id: "youtube",
		label: "YouTube",
		hint: "https://youtube.com/@handle"
	},
	{
		id: "x",
		label: "X",
		hint: "https://x.com/handle"
	},
	{
		id: "instagram",
		label: "Instagram",
		hint: "https://instagram.com/handle"
	},
	{
		id: "facebook",
		label: "Facebook",
		hint: "https://facebook.com/page"
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		hint: "https://linkedin.com/company/x"
	},
	{
		id: "threads",
		label: "Threads",
		hint: "https://threads.net/@handle"
	},
	{
		id: "tiktok",
		label: "TikTok",
		hint: "https://tiktok.com/@handle"
	}
];
var nf = new Intl.NumberFormat("en-US");
function AudiencePage() {
	const accounts = useAudienceAccounts();
	const readings = useAudienceReadings();
	const [platform, setPlatform] = (0, import_react.useState)("youtube");
	const [url, setUrl] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const byAccount = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		readings.forEach((r) => {
			const list = map.get(r.accountId) ?? [];
			list.push(r);
			map.set(r.accountId, list);
		});
		map.forEach((list) => list.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)));
		return map;
	}, [readings]);
	const addAccount = async () => {
		const clean = url.trim();
		if (!clean) return;
		const normalised = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
		let handle = "";
		try {
			handle = new URL(normalised).pathname.replace(/^\/+|\/+$/g, "") || new URL(normalised).hostname;
		} catch {
			toast.error("That does not look like a valid profile URL");
			return;
		}
		const record = {
			id: genId(),
			platform,
			handle,
			url: normalised,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await db.audienceAccounts.put(record);
		markCloudRecordDirty("audienceAccounts", record.id);
		queueCloudPush();
		setUrl("");
		toast.success(`Tracking ${handle}`);
	};
	const refresh = async () => {
		setBusy(true);
		try {
			const { updated } = await runAudienceCollector();
			toast.success(updated ? `Updated ${updated} ${updated === 1 ? "account" : "accounts"}` : "Nothing to update");
		} catch (e) {
			toast.error("Audience refresh failed", { description: String(e?.message ?? e) });
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CCHeader, {
				title: "Audience",
				subtitle: "Follower growth across your public profiles. Unavailable readings stay blank — never a false zero.",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: refresh,
					disabled: busy || !accounts.length,
					className: "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
						size: 13,
						className: busy ? "animate-spin" : ""
					}), " Refresh metrics"]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-3",
				children: "Track a profile"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-[auto_1.6fr_auto]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: platform,
						onChange: (e) => setPlatform(e.target.value),
						className: "px-3 py-2 rounded-xl bg-background border border-border text-sm",
						children: PLATFORMS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: p.id,
							children: p.label
						}, p.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: url,
						onChange: (e) => setUrl(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && addAccount(),
						placeholder: PLATFORMS.find((p) => p.id === platform)?.hint,
						className: "px-3 py-2 rounded-xl bg-background border border-border text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: addAccount,
						className: "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Track"]
					})
				]
			})] }),
			accounts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "No profiles tracked yet",
				hint: "Add a public profile URL to start charting follower growth."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
				children: accounts.map((a) => {
					const list = byAccount.get(a.id) ?? [];
					const latest = [...list].reverse().find((r) => r.followers !== null);
					const previous = [...list].reverse().filter((r) => r.followers !== null)[1];
					const delta = latest && previous ? (latest.followers ?? 0) - (previous.followers ?? 0) : 0;
					const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] uppercase tracking-wide font-semibold text-muted-foreground",
									children: PLATFORMS.find((p) => p.id === a.platform)?.label ?? a.platform
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: a.url,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "text-sm font-semibold text-foreground hover:text-primary truncate block",
									children: a.handle
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: async () => {
									await db.audienceAccounts.delete(a.id);
									markCloudRecordDirty("audienceAccounts", a.id, "delete");
									queueCloudPush();
								},
								className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10",
								"aria-label": "Remove profile",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-3xl font-bold text-foreground mt-3 tabular-nums",
							children: latest?.followers !== void 0 && latest?.followers !== null ? nf.format(latest.followers) : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									size: 12,
									className: delta > 0 ? "text-emerald-500" : delta < 0 ? "text-rose-500" : ""
								}),
								delta !== 0 ? `${delta > 0 ? "+" : ""}${nf.format(delta)} since last reading` : "No change recorded",
								a.lastCheckedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· ", relTime(a.lastCheckedAt)] })
							]
						}),
						a.lastStatus && a.lastStatus !== "ok" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-amber-500 mt-2",
							children: a.lastStatus === "unavailable" ? "Profile unreachable from the server." : "This platform hides counts from public pages."
						})
					] }, a.id);
				})
			})
		]
	});
}
//#endregion
export { AudiencePage as default };
