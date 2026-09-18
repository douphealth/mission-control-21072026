import { i as __toESM } from "../_runtime.mjs";
import { a as deduplicateTable } from "./supabase-D3pMiuZg.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { tt as useWebsites } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $t as FileText, A as Shield, Cn as CircleCheck, F as Server, G as RefreshCw, Gn as ArrowLeft, Ht as Globe, J as Puzzle, Kt as Gauge, L as Search, V as Save, Xn as Activity, _n as Clock, _t as Lock, a as Users, at as Palette, d as TriangleAlert, jt as Key, nn as EyeOff, rn as ExternalLink, t as Zap, tn as Eye, vt as LockOpen, xn as CircleX, yt as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { m as useNavigationStore } from "./routes-qm6I9RAb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/WordPressManagementPage-pDi4_W4U.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STORAGE_KEY = "wp-mgmt-creds-v1";
function loadCreds() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
	} catch {
		return {};
	}
}
function saveCreds(map) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
function setCred(siteId, username, appPassword) {
	const m = loadCreds();
	m[siteId] = {
		username,
		appPassword
	};
	saveCreds(m);
}
function clearCred(siteId) {
	const m = loadCreds();
	delete m[siteId];
	saveCreds(m);
}
function normalizeUrl(u) {
	if (!u) return "";
	const trimmed = u.trim().replace(/\/+$/, "");
	return trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
}
function authHeader(c) {
	return "Basic " + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, "")}`);
}
async function wpFetch(baseUrl, path, creds, init = {}) {
	const url = `${normalizeUrl(baseUrl)}/wp-json${path}`;
	const headers = {
		Accept: "application/json",
		...init.headers || {}
	};
	if (creds?.username && creds?.appPassword) headers["Authorization"] = authHeader(creds);
	const res = await fetch(url, {
		...init,
		headers,
		credentials: "omit"
	});
	if (!res.ok) {
		let msg = `${res.status} ${res.statusText}`;
		try {
			const j = await res.json();
			if (j?.message) msg = j.message;
		} catch {}
		throw new Error(msg);
	}
	return res.json();
}
async function checkHealth(siteUrl) {
	const url = normalizeUrl(siteUrl);
	const protocol = url.startsWith("https://") ? "https" : url.startsWith("http://") ? "http" : "unknown";
	const start = performance.now();
	try {
		const res = await fetch(`${url}/wp-json/`, {
			method: "GET",
			credentials: "omit"
		});
		const responseMs = Math.round(performance.now() - start);
		if (res.ok) {
			const data = await res.json().catch(() => null);
			return {
				reachable: true,
				status: res.status,
				responseMs,
				protocol,
				isWordPress: !!data?.namespaces,
				siteName: data?.name,
				siteDescription: data?.description,
				homeUrl: data?.home
			};
		}
		return {
			reachable: true,
			status: res.status,
			responseMs,
			protocol,
			isWordPress: false
		};
	} catch (e) {
		try {
			await fetch(url, {
				method: "GET",
				mode: "no-cors",
				credentials: "omit"
			});
			return {
				reachable: true,
				responseMs: Math.round(performance.now() - start),
				protocol,
				isWordPress: void 0,
				error: "Reachable but REST API blocked by CORS"
			};
		} catch (e2) {
			return {
				reachable: false,
				protocol,
				error: e?.message || "Network error"
			};
		}
	}
}
async function checkSeo(siteUrl) {
	const url = normalizeUrl(siteUrl);
	const errors = [];
	const result = {
		hasSitemap: false,
		hasRobots: false,
		robotsAllowsAll: null,
		errors
	};
	for (const p of [
		"/wp-sitemap.xml",
		"/sitemap.xml",
		"/sitemap_index.xml"
	]) try {
		if ((await fetch(`${url}${p}`, { method: "GET" })).ok) {
			result.hasSitemap = true;
			result.sitemapUrl = `${url}${p}`;
			break;
		}
	} catch {}
	try {
		const r = await fetch(`${url}/robots.txt`);
		if (r.ok) {
			const txt = await r.text();
			result.hasRobots = true;
			result.robotsAllowsAll = !/Disallow:\s*\/\s*$/im.test(txt);
		}
	} catch (e) {
		errors.push("robots.txt fetch failed (CORS or offline)");
	}
	try {
		const r = await fetch(url, { method: "GET" });
		if (r.ok) {
			const html = await r.text();
			result.title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
			result.description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1];
			result.ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1];
			result.ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1];
			result.canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
		}
	} catch {
		errors.push("Homepage HTML blocked by CORS — meta tags unavailable");
	}
	return result;
}
async function fetchPlugins(url, c) {
	return wpFetch(url, "/wp/v2/plugins?context=edit", c);
}
async function fetchThemes(url, c) {
	return wpFetch(url, "/wp/v2/themes?context=edit", c);
}
async function fetchUsers(url, c) {
	return wpFetch(url, "/wp/v2/users?context=edit&per_page=100", c);
}
async function fetchPostsCount(url, c) {
	const res = await fetch(`${normalizeUrl(url)}/wp-json/wp/v2/posts?per_page=1`, { headers: { Authorization: "Basic " + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, "")}`) } });
	return Number(res.headers.get("x-wp-total") || 0);
}
async function fetchPagesCount(url, c) {
	const res = await fetch(`${normalizeUrl(url)}/wp-json/wp/v2/pages?per_page=1`, { headers: { Authorization: "Basic " + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, "")}`) } });
	return Number(res.headers.get("x-wp-total") || 0);
}
async function fetchCommentsCount(url, c) {
	const res = await fetch(`${normalizeUrl(url)}/wp-json/wp/v2/comments?per_page=1`, { headers: { Authorization: "Basic " + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, "")}`) } });
	return Number(res.headers.get("x-wp-total") || 0);
}
async function setPluginStatus(url, c, plugin, status) {
	return wpFetch(url, `/wp/v2/plugins/${encodeURIComponent(plugin)}`, c, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status })
	});
}
var Score = ({ value, label }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `p-3 rounded-xl ${value >= 80 ? "bg-emerald-500/10" : value >= 50 ? "bg-amber-500/10" : "bg-red-500/10"} border border-border/30`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[10px] uppercase tracking-wider text-muted-foreground font-bold",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-2xl font-extrabold ${value >= 80 ? "text-emerald-500" : value >= 50 ? "text-amber-500" : "text-red-500"} mt-1`,
			children: value
		})]
	});
};
var StatusPill = ({ ok, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
	className: `inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border ${ok === true ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ok === false ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-muted text-muted-foreground border-border"}`,
	children: [ok === true ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 11 }) : ok === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { size: 11 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 11 }), label]
});
function WordPressManagementPage() {
	const websites = useWebsites();
	const { setActiveSection } = useNavigationStore();
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("overview");
	const [statuses, setStatuses] = (0, import_react.useState)({});
	const [credsMap, setCredsMap] = (0, import_react.useState)(loadCreds());
	const [showAuth, setShowAuth] = (0, import_react.useState)(false);
	const [authForm, setAuthForm] = (0, import_react.useState)({
		username: "",
		appPassword: ""
	});
	const [revealPwd, setRevealPwd] = (0, import_react.useState)(false);
	const wpSites = (0, import_react.useMemo)(() => websites.filter((w) => w.status !== "archived"), [websites]);
	const selected = wpSites.find((w) => w.id === selectedId) || null;
	const selectedCred = selected ? credsMap[selected.id] : null;
	const selectedStatus = selected ? statuses[selected.id] || {} : {};
	(0, import_react.useEffect)(() => {
		if (!selectedId && wpSites.length) setSelectedId(wpSites[0].id);
	}, [wpSites, selectedId]);
	(0, import_react.useEffect)(() => {
		if (selected && !selectedStatus.health && !selectedStatus.loading) runQuickCheck(selected.id, selected.url);
	}, [selectedId]);
	const openAuth = () => {
		if (!selected) return;
		setAuthForm({
			username: selectedCred?.username || selected.wpUsername || "",
			appPassword: selectedCred?.appPassword || ""
		});
		setShowAuth(true);
	};
	const saveAuth = () => {
		if (!selected) return;
		if (!authForm.username || !authForm.appPassword) {
			toast.error("Username and Application Password required");
			return;
		}
		setCred(selected.id, authForm.username, authForm.appPassword);
		setCredsMap(loadCreds());
		setShowAuth(false);
		toast.success("Credentials saved locally");
		runFullCheck(selected.id, selected.url);
	};
	const removeAuth = () => {
		if (!selected) return;
		clearCred(selected.id);
		setCredsMap(loadCreds());
		setStatuses((s) => ({
			...s,
			[selected.id]: {
				...s[selected.id],
				plugins: void 0,
				themes: void 0,
				users: void 0,
				counts: void 0
			}
		}));
		toast.success("Credentials cleared");
	};
	async function runQuickCheck(id, url) {
		setStatuses((s) => ({
			...s,
			[id]: {
				...s[id],
				loading: true
			}
		}));
		const [health, seo] = await Promise.all([checkHealth(url), checkSeo(url)]);
		setStatuses((s) => ({
			...s,
			[id]: {
				...s[id],
				health,
				seo,
				loading: false,
				lastChecked: (/* @__PURE__ */ new Date()).toISOString()
			}
		}));
	}
	async function runFullCheck(id, url) {
		const cred = loadCreds()[id];
		setStatuses((s) => ({
			...s,
			[id]: {
				...s[id],
				loading: true,
				authError: void 0
			}
		}));
		const [health, seo] = await Promise.all([checkHealth(url), checkSeo(url)]);
		let next = {
			...statuses[id],
			health,
			seo,
			loading: true,
			lastChecked: (/* @__PURE__ */ new Date()).toISOString()
		};
		setStatuses((s) => ({
			...s,
			[id]: next
		}));
		if (cred?.username && cred?.appPassword) try {
			const [plugins, themes, users, posts, pages, comments] = await Promise.all([
				fetchPlugins(url, cred).catch((e) => {
					throw new Error("Plugins: " + e.message);
				}),
				fetchThemes(url, cred).catch(() => []),
				fetchUsers(url, cred).catch(() => []),
				fetchPostsCount(url, cred).catch(() => 0),
				fetchPagesCount(url, cred).catch(() => 0),
				fetchCommentsCount(url, cred).catch(() => 0)
			]);
			next = {
				...next,
				plugins,
				themes,
				users,
				counts: {
					posts,
					pages,
					comments
				},
				loading: false
			};
			setStatuses((s) => ({
				...s,
				[id]: next
			}));
			toast.success("All checks complete");
		} catch (e) {
			next = {
				...next,
				loading: false,
				authError: e.message
			};
			setStatuses((s) => ({
				...s,
				[id]: next
			}));
			toast.error("Auth check failed: " + e.message);
		}
		else setStatuses((s) => ({
			...s,
			[id]: {
				...next,
				loading: false
			}
		}));
	}
	async function checkAllSites() {
		toast.info(`Running checks on ${wpSites.length} sites...`);
		for (const site of wpSites) await runQuickCheck(site.id, site.url);
		toast.success("Bulk health check complete");
	}
	async function togglePlugin(pl) {
		if (!selected || !selectedCred) return;
		const newStatus = pl.status === "active" ? "inactive" : "active";
		try {
			await setPluginStatus(selected.url, selectedCred, pl.plugin, newStatus);
			toast.success(`${pl.name} ${newStatus === "active" ? "activated" : "deactivated"}`);
			runFullCheck(selected.id, selected.url);
		} catch (e) {
			toast.error("Failed: " + e.message);
		}
	}
	const scores = (0, import_react.useMemo)(() => {
		const h = selectedStatus.health;
		const s = selectedStatus.seo;
		const p = selectedStatus.plugins;
		let health = 0, seo = 0, security = 0;
		if (h?.reachable) health += 50;
		if (h?.protocol === "https") health += 25;
		if (h?.isWordPress) health += 15;
		if (h?.responseMs && h.responseMs < 1500) health += 10;
		if (s?.hasSitemap) seo += 30;
		if (s?.hasRobots) seo += 20;
		if (s?.title) seo += 20;
		if (s?.description) seo += 15;
		if (s?.ogTitle) seo += 8;
		if (s?.canonical) seo += 7;
		if (h?.protocol === "https") security += 40;
		if (p) {
			const updates = p.filter((x) => x.update && x.update !== "none").length;
			security += updates === 0 ? 40 : Math.max(0, 40 - updates * 10);
			const inactive = p.filter((x) => x.status === "inactive").length;
			security += inactive < 5 ? 20 : 10;
		} else if (h?.isWordPress) security += 20;
		return {
			health: Math.min(100, health),
			seo: Math.min(100, seo),
			security: Math.min(100, security)
		};
	}, [selectedStatus]);
	const pluginUpdates = selectedStatus.plugins?.filter((p) => p.update && p.update !== "none") || [];
	if (!wpSites.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "text-center py-20",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
				size: 48,
				className: "mx-auto text-muted-foreground mb-4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-bold",
				children: "No websites yet"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground mt-2",
				children: "Add a website in My Websites to manage it here."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setActiveSection("websites"),
				className: "mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold",
				children: "Go to My Websites"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3 flex-wrap",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setActiveSection("websites"),
					className: "p-2 rounded-lg hover:bg-muted transition-colors",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { size: 16 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-extrabold tracking-tight flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
						className: "text-primary",
						size: 22
					}), "WordPress Management"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground mt-0.5",
					children: "Health, plugins, security & SEO across all your WP sites — powered by REST API + Application Passwords."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: async () => {
						const n = await deduplicateTable("websites");
						toast.success(n > 0 ? `Merged ${n} duplicate site${n === 1 ? "" : "s"}` : "No duplicates found");
					},
					className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { size: 14 }), " Merge duplicates"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: checkAllSites,
					className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { size: 14 }), " Check All Sites"]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-12 gap-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "col-span-12 lg:col-span-3 space-y-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2",
					children: [
						"Websites (",
						wpSites.length,
						")"
					]
				}), wpSites.map((site) => {
					const st = statuses[site.id];
					const active = site.id === selectedId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setSelectedId(site.id),
						className: `w-full text-left px-3 py-2.5 rounded-xl border transition-all ${active ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20" : "bg-card border-border/30 hover:bg-muted/50"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-semibold text-sm truncate",
								children: site.name
							}), st?.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								size: 12,
								className: "animate-spin text-muted-foreground"
							}) : st?.health?.reachable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }) : st?.health ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-red-500" }) : null]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-muted-foreground truncate font-mono mt-0.5",
							children: site.url.replace(/^https?:\/\//, "")
						})]
					}, site.id);
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "col-span-12 lg:col-span-9 space-y-4",
				children: selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-card border border-border/30 rounded-2xl p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-lg font-bold",
										children: selected.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: normalizeUrl(selected.url),
										target: "_blank",
										rel: "noopener",
										className: "text-muted-foreground hover:text-primary",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground font-mono",
									children: selected.url
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [selectedCred ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold border border-emerald-500/20",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { size: 11 }), " Authenticated"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: openAuth,
											className: "px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-muted",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, {
												size: 12,
												className: "inline mr-1"
											}), " Update"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: removeAuth,
											className: "px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
											children: "Clear"
										})
									] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: openAuth,
										className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { size: 12 }), " Connect with App Password"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => runFullCheck(selected.id, selected.url),
										disabled: selectedStatus.loading,
										className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-muted disabled:opacity-50",
										children: [selectedStatus.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
											size: 12,
											className: "animate-spin"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 12 }), "Run All Checks"]
									})]
								})]
							}),
							selectedStatus.authError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
										size: 12,
										className: "inline mr-1"
									}),
									" ",
									selectedStatus.authError
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-2 mt-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Score, {
										value: scores.health,
										label: "Health"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Score, {
										value: scores.seo,
										label: "SEO"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Score, {
										value: scores.security,
										label: "Security"
									})
								]
							})
						]
					}),
					showAuth && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "fixed inset-0 z-50 bg-black/50 backdrop-blur flex items-center justify-center p-4",
						onClick: () => setShowAuth(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-card rounded-2xl border border-border max-w-md w-full p-5",
							onClick: (e) => e.stopPropagation(),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-lg font-bold mb-1 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { size: 16 }), " WordPress Application Password"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground mb-4",
									children: "Generate one in your WP admin → Users → Profile → Application Passwords. Stored locally in your browser only."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
										children: "Username"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: authForm.username,
										onChange: (e) => setAuthForm((f) => ({
											...f,
											username: e.target.value
										})),
										className: "w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border/30 text-sm outline-none focus:border-primary/50",
										placeholder: "admin"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
										children: "Application Password"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex gap-1.5 mt-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: revealPwd ? "text" : "password",
											value: authForm.appPassword,
											onChange: (e) => setAuthForm((f) => ({
												...f,
												appPassword: e.target.value
											})),
											className: "flex-1 px-3 py-2 rounded-lg bg-secondary border border-border/30 text-sm font-mono outline-none focus:border-primary/50",
											placeholder: "xxxx xxxx xxxx xxxx"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setRevealPwd((r) => !r),
											className: "px-2.5 rounded-lg bg-secondary border border-border/30",
											children: revealPwd ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { size: 14 })
										})]
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-end gap-2 mt-5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setShowAuth(false),
										className: "px-4 py-2 rounded-lg bg-secondary text-sm font-semibold",
										children: "Cancel"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: saveAuth,
										className: "px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { size: 14 }), " Save & Test"]
									})]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-1 border-b border-border/30 overflow-x-auto",
						children: [
							[
								"overview",
								"Overview",
								Activity
							],
							[
								"health",
								"Health",
								Gauge
							],
							[
								"plugins",
								"Plugins",
								Puzzle
							],
							[
								"themes",
								"Themes",
								Palette
							],
							[
								"security",
								"Security",
								Shield
							],
							[
								"seo",
								"SEO",
								Search
							],
							[
								"content",
								"Content",
								FileText
							]
						].map(([id, label, Icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setTab(id),
							className: `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 13 }),
								" ",
								label,
								id === "plugins" && pluginUpdates.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-1 text-[9px] font-bold bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full",
									children: pluginUpdates.length
								})
							]
						}, id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-card border border-border/30 rounded-2xl p-5",
						children: [
							tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewTab, { status: selectedStatus }),
							tab === "health" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthTab, { status: selectedStatus }),
							tab === "plugins" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginsTab, {
								status: selectedStatus,
								hasAuth: !!selectedCred,
								onToggle: togglePlugin
							}),
							tab === "themes" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemesTab, {
								status: selectedStatus,
								hasAuth: !!selectedCred
							}),
							tab === "security" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecurityTab, { status: selectedStatus }),
							tab === "seo" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeoTab, { status: selectedStatus }),
							tab === "content" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContentTab, {
								status: selectedStatus,
								hasAuth: !!selectedCred
							})
						]
					})
				] })
			})]
		})]
	});
}
function OverviewTab({ status }) {
	const h = status.health;
	status.seo;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Reachable",
						value: h?.reachable ? "Yes" : "No",
						ok: !!h?.reachable,
						icon: Server
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Protocol",
						value: h?.protocol?.toUpperCase() || "-",
						ok: h?.protocol === "https",
						icon: Lock
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Response",
						value: h?.responseMs ? `${h.responseMs} ms` : "-",
						ok: h?.responseMs ? h.responseMs < 1500 : null,
						icon: Clock
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "WordPress",
						value: h?.isWordPress ? `v${h?.wpVersion || "?"}` : "Not detected",
						ok: !!h?.isWordPress,
						icon: Globe
					})
				]
			}),
			status.counts && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Posts",
						value: status.counts.posts,
						icon: FileText
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Pages",
						value: status.counts.pages,
						icon: FileText
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Comments",
						value: status.counts.comments,
						icon: Users
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[11px] text-muted-foreground",
				children: status.lastChecked && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Last checked: ", new Date(status.lastChecked).toLocaleString()] })
			})
		]
	});
}
function HealthTab({ status }) {
	const h = status.health;
	if (!h) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { msg: "Run health check to see results" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Site reachable",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: h.reachable,
					label: h.reachable ? "Online" : "Offline"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "HTTP Status",
				value: h.status?.toString() || "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Response time",
				value: h.responseMs ? `${h.responseMs} ms` : "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "HTTPS",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: h.protocol === "https",
					label: h.protocol.toUpperCase()
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "WordPress detected",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: h.isWordPress,
					label: h.isWordPress ? "Yes" : "No"
				})
			}),
			h.siteName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Site name",
				value: h.siteName
			}),
			h.siteDescription && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Tagline",
				value: h.siteDescription
			}),
			h.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700",
				children: ["⚠️ ", h.error]
			})
		]
	});
}
function PluginsTab({ status, hasAuth, onToggle }) {
	if (!hasAuth) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthRequired, { msg: "Connect with an Application Password to manage plugins" });
	if (!status.plugins) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { msg: "Run all checks to load plugins" });
	const updates = status.plugins.filter((p) => p.update && p.update !== "none");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [updates.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-3 rounded-xl bg-amber-500/10 border border-amber-500/20",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-amber-700 font-bold text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 14 }),
					" ",
					updates.length,
					" plugin update",
					updates.length > 1 ? "s" : "",
					" available"
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-1.5",
			children: status.plugins.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 hover:border-border/40 transition",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-sm",
								children: p.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[10px] text-muted-foreground font-mono",
								children: ["v", p.version]
							}),
							p.update && p.update !== "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded",
								children: "Update available"
							})
						]
					}), p.author && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[11px] text-muted-foreground mt-0.5",
						children: ["by ", p.author]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => onToggle(p),
					className: `px-2.5 py-1 rounded-md text-[11px] font-semibold ${p.status === "active" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-secondary text-muted-foreground hover:bg-muted"}`,
					children: p.status === "active" ? "Active" : "Inactive"
				})]
			}, p.plugin))
		})]
	});
}
function ThemesTab({ status, hasAuth }) {
	if (!hasAuth) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthRequired, { msg: "Connect with an Application Password to view themes" });
	if (!status.themes) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { msg: "Run all checks to load themes" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 gap-3",
		children: status.themes.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-3 rounded-xl bg-secondary/30 border border-border/20",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold text-sm",
					children: t.name?.rendered || t.stylesheet
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-[11px] text-muted-foreground font-mono",
					children: ["v", t.version || "?"]
				})] }), t.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded",
					children: "ACTIVE"
				})]
			})
		}, t.stylesheet))
	});
}
function SecurityTab({ status }) {
	const h = status.health;
	const updates = status.plugins?.filter((p) => p.update && p.update !== "none").length || 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "HTTPS enabled",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: h?.protocol === "https",
					label: h?.protocol === "https" ? "Secure" : "Insecure"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "WordPress reachable via REST",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: h?.isWordPress,
					label: h?.isWordPress ? "Detected" : "Hidden / Unknown"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Plugins needing update",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: updates === 0,
					label: String(updates)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Inactive plugins (attack surface)",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: (status.plugins?.filter((p) => p.status === "inactive").length || 0) < 3,
					label: String(status.plugins?.filter((p) => p.status === "inactive").length || 0)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-3 rounded-xl bg-secondary/30 border border-border/20 text-xs text-muted-foreground space-y-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-bold text-foreground mb-1",
						children: "Recommendations"
					}),
					h?.protocol !== "https" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "• Force HTTPS via your host or a plugin like Really Simple SSL" }),
					updates > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						"• Update ",
						updates,
						" outdated plugin",
						updates > 1 ? "s" : "",
						" immediately"
					] }),
					(status.plugins?.filter((p) => p.status === "inactive").length || 0) >= 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "• Remove unused inactive plugins" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "• Use strong Application Passwords and rotate them regularly" })
				]
			})
		]
	});
}
function SeoTab({ status }) {
	const s = status.seo;
	if (!s) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { msg: "Run all checks to see SEO data" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Sitemap",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: s.hasSitemap,
					label: s.hasSitemap ? "Found" : "Missing"
				}),
				value: s.sitemapUrl
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "robots.txt",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: s.hasRobots,
					label: s.hasRobots ? "Found" : "Missing"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "robots allows indexing",
				pill: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, {
					ok: s.robotsAllowsAll,
					label: s.robotsAllowsAll === null ? "—" : s.robotsAllowsAll ? "Yes" : "Blocked"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Title",
				value: s.title || "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Meta description",
				value: s.description || "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Open Graph title",
				value: s.ogTitle || "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "OG image",
				value: s.ogImage || "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Canonical URL",
				value: s.canonical || "—"
			}),
			s.errors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 space-y-1",
				children: s.errors.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["⚠️ ", e] }, i))
			})
		]
	});
}
function ContentTab({ status, hasAuth }) {
	if (!hasAuth) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthRequired, { msg: "Connect with an Application Password to load content stats" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-3 gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Posts",
					value: status.counts?.posts ?? "—",
					icon: FileText
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Pages",
					value: status.counts?.pages ?? "—",
					icon: FileText
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Comments",
					value: status.counts?.comments ?? "—",
					icon: Users
				})
			]
		}), status.users && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-xs font-bold mb-2",
			children: [
				"Users (",
				status.users.length,
				")"
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-1.5",
			children: status.users.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/20",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-semibold",
					children: u.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[10px] text-muted-foreground",
					children: u.slug
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1",
					children: (u.roles || []).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded",
						children: r
					}, r))
				})]
			}, u.id))
		})] })]
	});
}
function Stat({ label, value, ok, icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-3 rounded-xl bg-secondary/30 border border-border/20",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold",
			children: [
				Icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 11 }),
				" ",
				label
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-lg font-bold mt-1 ${ok === true ? "text-emerald-500" : ok === false ? "text-red-500" : "text-foreground"}`,
			children: value
		})]
	});
}
function Row({ label, value, pill }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted-foreground font-medium",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-foreground text-right truncate max-w-[60%]",
			children: pill || value
		})]
	});
}
function Empty({ msg }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-center py-10 text-sm text-muted-foreground",
		children: msg
	});
}
function AuthRequired({ msg }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "text-center py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
				size: 32,
				className: "mx-auto text-muted-foreground mb-3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-semibold",
				children: msg
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-muted-foreground mt-1",
				children: "Click \"Connect with App Password\" above"
			})
		]
	});
}
//#endregion
export { WordPressManagementPage as default };
