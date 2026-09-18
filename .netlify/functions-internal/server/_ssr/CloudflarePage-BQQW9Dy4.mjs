import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { T as useCredentials } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { G as RefreshCw, Ht as Globe, Xn as Activity, _t as Lock, hn as Cloud, rn as ExternalLink, t as Zap, un as Copy } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as getCloudflareZones } from "./integrations.functions-BjRj_6uH.mjs";
import { n as ConnectorError, r as TruthBadge, t as ConnectorEmpty } from "./TruthUI-Ib34yaTg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/CloudflarePage-BQQW9Dy4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var cfTools = [
	{
		label: "Cloudflare Dashboard",
		url: "https://dash.cloudflare.com",
		icon: "☁️",
		desc: "Main account & zone management"
	},
	{
		label: "DNS Management",
		url: "https://dash.cloudflare.com/?to=/:account/:zone/dns/records",
		icon: "🌐",
		desc: "Manage DNS records"
	},
	{
		label: "SSL/TLS Settings",
		url: "https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls",
		icon: "🔒",
		desc: "HTTPS & certificate config"
	},
	{
		label: "Firewall Rules",
		url: "https://dash.cloudflare.com/?to=/:account/:zone/security/waf",
		icon: "🛡️",
		desc: "Firewall & security rules"
	},
	{
		label: "Page Rules",
		url: "https://dash.cloudflare.com/?to=/:account/:zone/rules/page-rules",
		icon: "📋",
		desc: "URL redirects & caching"
	},
	{
		label: "Analytics",
		url: "https://dash.cloudflare.com/?to=/:account/:zone/analytics",
		icon: "📊",
		desc: "Traffic & bandwidth stats"
	},
	{
		label: "Workers",
		url: "https://dash.cloudflare.com/?to=/:account/workers",
		icon: "⚡",
		desc: "Edge computing & serverless"
	},
	{
		label: "Pages",
		url: "https://dash.cloudflare.com/?to=/:account/pages",
		icon: "🚀",
		desc: "Static site deployments"
	},
	{
		label: "R2 Storage",
		url: "https://dash.cloudflare.com/?to=/:account/r2",
		icon: "📦",
		desc: "Object storage, S3-compatible"
	},
	{
		label: "Turnstile",
		url: "https://dash.cloudflare.com/?to=/:account/turnstile",
		icon: "🤖",
		desc: "CAPTCHA alternative"
	},
	{
		label: "Status Page",
		url: "https://www.cloudflarestatus.com",
		icon: "💚",
		desc: "Cloudflare system status"
	},
	{
		label: "API Docs",
		url: "https://developers.cloudflare.com/api",
		icon: "📖",
		desc: "Cloudflare API reference"
	}
];
var dotFor = (status) => status === "active" ? "bg-emerald-500" : status === "pending" ? "bg-amber-500" : status === "paused" ? "bg-zinc-400" : "bg-red-500";
function CloudflarePage() {
	const credentials = useCredentials();
	const [zones, setZones] = (0, import_react.useState)([]);
	const [meta, setMeta] = (0, import_react.useState)({
		truthState: "unavailable",
		source: "Cloudflare API"
	});
	const [loading, setLoading] = (0, import_react.useState)(true);
	const load = (0, import_react.useCallback)(async () => {
		setLoading(true);
		try {
			const r = await getCloudflareZones();
			setZones(r.zones);
			setMeta({
				truthState: r.truthState,
				source: r.source,
				fetchedAt: r.fetchedAt,
				error: r.error
			});
		} catch (e) {
			setZones([]);
			setMeta({
				truthState: "error",
				source: "Cloudflare API",
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
	const cfCreds = credentials.filter((c) => c.service.toLowerCase().includes("cloudflare") || c.label.toLowerCase().includes("cloudflare"));
	const copyNs = (ns) => {
		navigator.clipboard.writeText(ns);
		toast.success("Nameservers copied");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "flex items-center gap-2 text-xl font-bold sm:text-2xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, {
						size: 20,
						className: "text-orange-500"
					}), " Cloudflare"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "DNS, security and CDN — read live from your account"
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
							href: "https://www.cloudflarestatus.com",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/15",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { size: 12 }), " System Status"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "https://dash.cloudflare.com",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-primary text-sm",
							children: ["Open Dashboard ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 13 })]
						})
					]
				})]
			}),
			meta.truthState === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					{
						label: "Active Zones",
						value: zones.filter((z) => z.status === "active").length,
						icon: Globe,
						color: "text-blue-500 bg-blue-500/10"
					},
					{
						label: "Paid Zones",
						value: zones.filter((z) => !/free/i.test(z.plan)).length,
						icon: Zap,
						color: "text-amber-500 bg-amber-500/10"
					},
					{
						label: "Saved Credentials",
						value: cfCreds.length,
						icon: Lock,
						color: "text-violet-500 bg-violet-500/10"
					},
					{
						label: "Total Zones",
						value: zones.length,
						icon: Cloud,
						color: "text-emerald-500 bg-emerald-500/10"
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
				className: "grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 lg:col-span-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "flex items-center gap-2 text-base font-bold text-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
								size: 15,
								className: "text-primary"
							}), " DNS Zones"]
						}),
						loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "card-glass p-6 text-center text-sm text-muted-foreground",
							children: "Loading zones from Cloudflare…"
						}),
						!loading && meta.truthState === "not_connected" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectorEmpty, {
							title: "Cloudflare is not connected",
							description: "Add a Cloudflare API token with Zone:Read permission to this project and your real zones will appear here. Until then this page shows nothing — no sample domains.",
							docsUrl: "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/",
							onRetry: () => void load()
						}),
						!loading && meta.truthState === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectorError, {
							message: meta.error ?? "Unknown error",
							onRetry: () => void load()
						}),
						!loading && meta.truthState === "live" && zones.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "card-glass p-6 text-center text-sm text-muted-foreground",
							children: "Connected — this Cloudflare account has no zones."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: zones.map((zone) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-elevated group flex items-center gap-4 p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `inline-block h-2 w-2 rounded-full ${dotFor(zone.status)}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-semibold text-foreground",
													children: zone.name
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "badge badge-muted",
													children: zone.plan
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `badge capitalize ${zone.status === "active" ? "badge-success" : "badge-warning"}`,
													children: zone.status
												})
											]
										}), zone.nameservers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1 font-mono text-[10px] text-muted-foreground",
											children: [
												"ns: ",
												zone.nameservers.join(" / "),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													className: "ml-2 transition-colors hover:text-foreground",
													onClick: () => copyNs(zone.nameservers.join("\n")),
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 9 })
												})
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: `https://dash.cloudflare.com/?to=/:account/${zone.name}`,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "shrink-0 text-muted-foreground/40 transition-colors hover:text-primary",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 13 })
									})
								]
							}, zone.id))
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "flex items-center gap-2 text-base font-bold text-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
							size: 15,
							className: "text-primary"
						}), " Saved Accounts"]
					}), cfCreds.length > 0 ? cfCreds.map((cred) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-glass space-y-1.5 p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm font-semibold text-foreground",
									children: cred.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TruthBadge, { state: "manual" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "truncate text-xs text-muted-foreground",
								children: cred.username
							}),
							cred.url && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: cred.url,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "flex items-center gap-1 text-[11px] text-primary hover:underline",
								children: ["Open ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 9 })]
							})
						]
					}, cred.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-glass p-4 text-center text-sm text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
								size: 20,
								className: "mx-auto mb-2 opacity-40"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "No Cloudflare credentials saved" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 text-xs",
								children: ["Add them in ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Credential Vault" })]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "mb-3 flex items-center gap-2 text-base font-bold",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
					size: 15,
					className: "text-primary"
				}), " Quick Access"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4",
				children: cfTools.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
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
export { CloudflarePage as default };
