import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as useFeedSources, et as useWatchTerms, q as useStreamItems, v as useAudienceAccounts, y as useAudienceReadings, z as useReminders } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { G as RefreshCw, Rn as Bell, Wn as ArrowRight, a as Users, ot as Newspaper, zn as AtSign } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { m as useNavigationStore } from "./routes-qm6I9RAb.mjs";
import { a as StreamRow, c as runAllCollectors, i as StatTile, n as EmptyState, o as lastCollectorRun, r as Panel, s as relTime, t as CCHeader } from "./ui-BiQ_kQgK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ControlCenterPage-DIc2Zpwm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var nf = new Intl.NumberFormat("en-US");
function ControlCenterPage() {
	const items = useStreamItems();
	const sources = useFeedSources();
	const terms = useWatchTerms();
	const accounts = useAudienceAccounts();
	const readings = useAudienceReadings();
	const reminders = useReminders();
	const { setActiveSection } = useNavigationStore();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [lastRun, setLastRun] = (0, import_react.useState)(() => lastCollectorRun());
	const active = (0, import_react.useMemo)(() => items.filter((i) => i.status === "active"), [items]);
	const topStories = (0, import_react.useMemo)(() => active.filter((i) => i.kind === "industry").sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6), [active]);
	const topMentions = (0, import_react.useMemo)(() => active.filter((i) => i.kind === "mention").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5), [active]);
	const dueReminders = (0, import_react.useMemo)(() => reminders.filter((r) => r.status !== "done" && new Date(r.remindAt).getTime() <= Date.now() + 864e5).sort((a, b) => a.remindAt.localeCompare(b.remindAt)).slice(0, 5), [reminders]);
	const totalFollowers = (0, import_react.useMemo)(() => {
		let sum = 0;
		accounts.forEach((a) => {
			const latest = readings.filter((r) => r.accountId === a.id && r.followers !== null).sort((x, y) => y.capturedAt.localeCompare(x.capturedAt))[0];
			if (latest?.followers) sum += latest.followers;
		});
		return sum;
	}, [accounts, readings]);
	const refreshAll = async () => {
		setBusy(true);
		try {
			const res = await runAllCollectors();
			setLastRun((/* @__PURE__ */ new Date()).toISOString());
			toast.success("Control Center refreshed", { description: `${res.industry.added} stories · ${res.mentions.added} mentions · ${res.audience.updated} profiles` });
		} catch (e) {
			toast.error("Refresh failed", { description: String(e?.message ?? e) });
		} finally {
			setBusy(false);
		}
	};
	const nothingConfigured = !sources.length && !terms.length && !accounts.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CCHeader, {
				title: "Control Center",
				subtitle: lastRun ? `Last refreshed ${relTime(lastRun)}` : "Industry news, brand mentions, audience and reminders in one place.",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: refreshAll,
					disabled: busy || nothingConfigured,
					className: "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
						size: 13,
						className: busy ? "animate-spin" : ""
					}), " Refresh everything"]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 lg:grid-cols-4 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
						label: "Stories",
						value: active.filter((i) => i.kind === "industry").length,
						hint: `${sources.length} sources`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
						label: "Mentions",
						value: active.filter((i) => i.kind === "mention").length,
						hint: `${terms.length} watched terms`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
						label: "Followers",
						value: totalFollowers ? nf.format(totalFollowers) : "—",
						hint: `${accounts.length} profiles`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
						label: "Reminders due",
						value: dueReminders.length,
						hint: "next 24 hours"
					})
				]
			}),
			nothingConfigured ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "Set up your Control Center",
				hint: "Add news sources in Industry, watch terms in Mentions, and profiles in Audience. Everything runs on free public feeds — no API key needed."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 xl:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between mb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-sm font-bold text-foreground flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Newspaper, {
							size: 15,
							className: "text-primary"
						}), " Top industry stories"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setActiveSection("industry"),
						className: "text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1",
						children: ["Open ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 11 })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2.5",
					children: topStories.length ? topStories.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamRow, { item: s }, s.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "No stories yet — refresh to pull your feeds."
					})
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-sm font-bold text-foreground flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtSign, {
									size: 15,
									className: "text-primary"
								}), " Recent mentions"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveSection("mentions"),
								className: "text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1",
								children: ["Open ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 11 })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2.5",
							children: topMentions.length ? topMentions.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamRow, { item: m }, m.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "No verified mentions yet."
							})
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-sm font-bold text-foreground flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
									size: 15,
									className: "text-primary"
								}), " Reminders"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveSection("reminders"),
								className: "text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1",
								children: ["Open ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 11 })]
							})]
						}), dueReminders.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: dueReminders.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate font-medium text-foreground",
									children: r.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-muted-foreground shrink-0",
									children: relTime(r.remindAt)
								})]
							}, r.id))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Nothing due in the next 24 hours."
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-sm font-bold text-foreground flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, {
										size: 15,
										className: "text-primary"
									}), " Audience"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setActiveSection("audience"),
									className: "text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1",
									children: ["Open ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 11 })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold text-foreground mt-2 tabular-nums",
								children: totalFollowers ? nf.format(totalFollowers) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-muted-foreground",
								children: [
									"total followers across ",
									accounts.length,
									" tracked profiles"
								]
							})
						] })
					]
				})]
			})
		]
	});
}
//#endregion
export { ControlCenterPage as default };
