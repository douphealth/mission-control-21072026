import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { T as useCredentials } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Cn as CircleCheck, G as RefreshCw, Gt as GitBranch, Ht as Globe, U as Rocket, Xn as Activity, _n as Clock, _t as Lock, mn as CodeXml, rn as ExternalLink, t as Zap } from "../_libs/lucide-react.mjs";
import { n as getVercelProjects } from "./integrations.functions-BjRj_6uH.mjs";
import { i as freshness, n as ConnectorError, r as TruthBadge, t as ConnectorEmpty } from "./TruthUI-Ib34yaTg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/VercelPage-huAWSDch.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var vercelTools = [
	{
		label: "Dashboard",
		url: "https://vercel.com/dashboard",
		icon: "🚀",
		desc: "Manage all deployments"
	},
	{
		label: "Deployments",
		url: "https://vercel.com/dashboard",
		icon: "📦",
		desc: "Deployment history & logs"
	},
	{
		label: "Domains",
		url: "https://vercel.com/dashboard/domains",
		icon: "🌐",
		desc: "Custom domain management"
	},
	{
		label: "Storage",
		url: "https://vercel.com/dashboard/stores",
		icon: "🗄️",
		desc: "KV, Blob, Postgres, Edge Config"
	},
	{
		label: "Analytics",
		url: "https://vercel.com/analytics",
		icon: "📊",
		desc: "Real-user web analytics"
	},
	{
		label: "Vercel AI SDK",
		url: "https://sdk.vercel.ai",
		icon: "🤖",
		desc: "Build AI apps with Vercel"
	},
	{
		label: "API Reference",
		url: "https://vercel.com/docs/rest-api",
		icon: "📖",
		desc: "REST API documentation"
	},
	{
		label: "Status",
		url: "https://www.vercel-status.com",
		icon: "💚",
		desc: "Platform health & incidents"
	}
];
function DeployBadge({ state }) {
	const m = {
		ready: {
			cls: "badge-success",
			label: "✅ Ready"
		},
		building: {
			cls: "badge-warning",
			label: "⟳ Building",
			pulse: true
		},
		error: {
			cls: "badge-destructive",
			label: "✗ Error"
		},
		queued: {
			cls: "badge-muted",
			label: "⏳ Queued"
		},
		canceled: {
			cls: "badge-muted",
			label: "⊘ Canceled"
		}
	}[state] ?? {
		cls: "badge-muted",
		label: state || "unknown"
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `badge ${m.cls} ${m.pulse ? "animate-pulse" : ""}`,
		children: m.label
	});
}
function VercelPage() {
	const credentials = useCredentials();
	const [projects, setProjects] = (0, import_react.useState)([]);
	const [meta, setMeta] = (0, import_react.useState)({
		truthState: "unavailable",
		source: "Vercel API"
	});
	const [loading, setLoading] = (0, import_react.useState)(true);
	const load = (0, import_react.useCallback)(async () => {
		setLoading(true);
		try {
			const r = await getVercelProjects();
			setProjects(r.projects);
			setMeta({
				truthState: r.truthState,
				source: r.source,
				fetchedAt: r.fetchedAt,
				error: r.error
			});
		} catch (e) {
			setProjects([]);
			setMeta({
				truthState: "error",
				source: "Vercel API",
				fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
				error: String(e?.message ?? e)
			});
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	const vercelCreds = credentials.filter((c) => c.service.toLowerCase().includes("vercel") || c.label.toLowerCase().includes("vercel"));
	const readyCount = projects.filter((p) => p.state === "ready").length;
	const buildingCount = projects.filter((p) => p.state === "building").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "flex items-center gap-2 text-xl font-bold sm:text-2xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, {
						size: 20,
						className: "text-foreground"
					}), " Vercel Deployments"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Live project and deployment state from your Vercel account"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TruthBadge, { meta })]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => void load(),
							disabled: loading,
							className: "btn-secondary text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								size: 13,
								className: loading ? "animate-spin" : ""
							}), " Refresh"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "https://www.vercel-status.com",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/15",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { size: 12 }), " Status"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "https://vercel.com/dashboard",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-primary text-sm",
							children: ["Open Vercel ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 13 })]
						})
					]
				})]
			}),
			meta.truthState === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					{
						label: "Projects",
						value: projects.length,
						icon: Rocket,
						color: "text-foreground bg-secondary"
					},
					{
						label: "Ready",
						value: readyCount,
						icon: CircleCheck,
						color: "text-emerald-500 bg-emerald-500/10"
					},
					{
						label: "Building",
						value: buildingCount,
						icon: RefreshCw,
						color: "text-amber-500 bg-amber-500/10"
					},
					{
						label: "Saved Creds",
						value: vercelCreds.length,
						icon: Lock,
						color: "text-violet-500 bg-violet-500/10"
					}
				].map((stat) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-glass flex items-center gap-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(stat.icon, { size: 17 })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xl font-bold text-foreground",
						children: stat.value
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground",
						children: stat.label
					})] })]
				}, stat.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "flex items-center gap-2 text-base font-bold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeXml, {
							size: 15,
							className: "text-primary"
						}), " Projects"]
					}),
					loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "card-glass p-6 text-center text-sm text-muted-foreground",
						children: "Loading projects from Vercel…"
					}),
					!loading && meta.truthState === "not_connected" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectorEmpty, {
						title: "Vercel is not connected",
						description: "Add a Vercel API token to this project and your real projects, branches and deployment states will appear here. No sample deployments are shown.",
						docsUrl: "https://vercel.com/docs/rest-api#authentication",
						onRetry: () => void load()
					}),
					!loading && meta.truthState === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectorError, {
						message: meta.error ?? "Unknown error",
						onRetry: () => void load()
					}),
					!loading && meta.truthState === "live" && projects.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "card-glass p-6 text-center text-sm text-muted-foreground",
						children: "Connected — this Vercel account has no projects."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 gap-3 lg:grid-cols-2",
						children: projects.map((proj) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-elevated space-y-3 p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-foreground",
												children: proj.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeployBadge, { state: proj.state })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1 flex items-center gap-3",
											children: [proj.framework && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "badge-muted capitalize",
												children: proj.framework
											}), proj.branch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-1 text-[10px] text-muted-foreground",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { size: 9 }),
													" ",
													proj.branch
												]
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex shrink-0 items-center gap-1",
										children: [proj.liveUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: proj.liveUrl,
											target: "_blank",
											rel: "noopener noreferrer",
											title: "Visit live deployment",
											className: "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { size: 13 })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: proj.dashboardUrl,
											target: "_blank",
											rel: "noopener noreferrer",
											title: "Open in Vercel",
											className: "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 13 })
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-[11px] text-muted-foreground",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 10 }),
										" ",
										proj.lastDeployedAt ? `Last deployed ${freshness(proj.lastDeployedAt)}` : "No deployment recorded"
									]
								}),
								proj.liveUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: proj.liveUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "block truncate font-mono text-[11px] text-primary/80 hover:text-primary hover:underline",
									children: proj.liveUrl
								})
							]
						}, proj.id))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "mb-3 flex items-center gap-2 text-base font-bold",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
					size: 15,
					className: "text-primary"
				}), " Quick Access"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
				children: vercelTools.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: tool.url,
					target: "_blank",
					rel: "noopener noreferrer",
					className: "card-glass group block p-3.5 transition-all hover:border-primary/20",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xl",
							children: tool.icon
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-semibold text-foreground transition-colors group-hover:text-primary",
							children: tool.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-0.5 line-clamp-2 text-[10px] text-muted-foreground",
							children: tool.desc
						})
					]
				}, tool.label))
			})] })
		]
	});
}
//#endregion
export { VercelPage as default };
