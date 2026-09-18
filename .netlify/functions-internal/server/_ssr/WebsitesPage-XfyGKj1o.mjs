import { i as __toESM } from "../_runtime.mjs";
import { a as deduplicateTable } from "./supabase-D3pMiuZg.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, C as useBulkDeleteItems, Q as useUpdateItem, _ as useAddItem, k as useDeleteItem, tt as useWebsites, w as useBulkPatch } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { A as Shield, Cn as CircleCheck, Dn as ChevronDown, F as Server, G as RefreshCw, Ht as Globe, J as Puzzle, L as Search, Ot as LayoutGrid, T as SquareCheckBig, Tn as ChevronRight, Vn as ArrowUpNarrowWide, X as Plus, Yn as Archive, _n as Clock, _t as Lock, bt as List, d as TriangleAlert, h as Trash2, kt as Layers, nn as EyeOff, nt as Pen, qn as ArrowDownWideNarrow, qt as Funnel, rn as ExternalLink, tn as Eye, un as Copy, w as Square } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as FormTagsInput, i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/WebsitesPage-XfyGKj1o.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STATUS_CONFIG = {
	active: {
		label: "Active",
		color: "text-emerald-500",
		icon: CircleCheck,
		bg: "bg-emerald-500/10",
		border: "border-emerald-500/20",
		glow: "shadow-emerald-500/10"
	},
	maintenance: {
		label: "Maintenance",
		color: "text-amber-500",
		icon: RefreshCw,
		bg: "bg-amber-500/10",
		border: "border-amber-500/20",
		glow: "shadow-amber-500/10"
	},
	down: {
		label: "Down",
		color: "text-red-500",
		icon: TriangleAlert,
		bg: "bg-red-500/10",
		border: "border-red-500/20",
		glow: "shadow-red-500/10"
	},
	archived: {
		label: "Archived",
		color: "text-zinc-400",
		icon: Archive,
		bg: "bg-zinc-500/10",
		border: "border-zinc-500/20",
		glow: "shadow-zinc-500/10"
	}
};
var CATEGORY_CONFIG = {
	"Client Site": {
		gradient: "from-blue-500 to-cyan-500",
		emoji: "👔"
	},
	"E-Commerce": {
		gradient: "from-purple-500 to-pink-500",
		emoji: "🛒"
	},
	Personal: {
		gradient: "from-indigo-500 to-violet-500",
		emoji: "🏠"
	},
	Blog: {
		gradient: "from-green-500 to-emerald-500",
		emoji: "📝"
	},
	SaaS: {
		gradient: "from-orange-500 to-amber-500",
		emoji: "🚀"
	},
	Portfolio: {
		gradient: "from-rose-500 to-pink-500",
		emoji: "🎨"
	}
};
var emptyWebsite = {
	name: "",
	url: "",
	wpAdminUrl: "",
	wpUsername: "",
	wpPassword: "",
	hostingProvider: "",
	hostingLoginUrl: "",
	hostingUsername: "",
	hostingPassword: "",
	category: "Personal",
	status: "active",
	notes: "",
	plugins: [],
	dateAdded: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
	lastUpdated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
};
var fadeUp = (i) => ({
	initial: {
		opacity: 0,
		y: 12
	},
	animate: {
		opacity: 1,
		y: 0
	},
	transition: {
		delay: Math.min(i * .04, .5),
		duration: .35
	}
});
function WebsitesPage() {
	const websites = useWebsites();
	const addItem = useAddItem();
	const updateItem = useUpdateItem();
	const deleteItem = useDeleteItem();
	const bulkPatch = useBulkPatch();
	const bulkDeleteItems = useBulkDeleteItems();
	const duplicateItem = useDuplicateItem();
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterStatus, setFilterStatus] = (0, import_react.useState)("all");
	const [filterCategory, setFilterCategory] = (0, import_react.useState)("all");
	const [viewMode, setViewMode] = (0, import_react.useState)("grid");
	const [sortField, setSortField] = (0, import_react.useState)("lastUpdated");
	const [sortDirection, setSortDirection] = (0, import_react.useState)("desc");
	const [revealedPasswords, setRevealedPasswords] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyWebsite);
	const [expandedSite, setExpandedSite] = (0, import_react.useState)(null);
	const [showFilters, setShowFilters] = (0, import_react.useState)(false);
	const [selectedIds, setSelectedIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [bulkMode, setBulkMode] = (0, import_react.useState)(false);
	const cd = useConfirmDialog();
	const categories = (0, import_react.useMemo)(() => {
		const cats = new Set(websites.map((w) => w.category));
		return Array.from(cats).sort();
	}, [websites]);
	const hostingProviders = (0, import_react.useMemo)(() => {
		const providers = new Set(websites.map((w) => w.hostingProvider).filter(Boolean));
		return Array.from(providers).sort();
	}, [websites]);
	const filtered = (0, import_react.useMemo)(() => {
		return websites.filter((w) => filterStatus === "all" || w.status === filterStatus).filter((w) => filterCategory === "all" || w.category === filterCategory).filter((w) => {
			const q = search.toLowerCase();
			return w.name.toLowerCase().includes(q) || w.url.toLowerCase().includes(q) || w.hostingProvider.toLowerCase().includes(q) || w.category.toLowerCase().includes(q) || w.notes && w.notes.toLowerCase().includes(q);
		}).sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case "name":
					cmp = a.name.localeCompare(b.name);
					break;
				case "status":
					cmp = a.status.localeCompare(b.status);
					break;
				case "category":
					cmp = a.category.localeCompare(b.category);
					break;
				case "dateAdded":
					cmp = a.dateAdded.localeCompare(b.dateAdded);
					break;
				case "lastUpdated": cmp = a.lastUpdated.localeCompare(b.lastUpdated);
			}
			return sortDirection === "desc" ? -cmp : cmp;
		});
	}, [
		websites,
		filterStatus,
		filterCategory,
		search,
		sortField,
		sortDirection
	]);
	const stats = (0, import_react.useMemo)(() => ({
		total: websites.length,
		active: websites.filter((w) => w.status === "active").length,
		maintenance: websites.filter((w) => w.status === "maintenance").length,
		down: websites.filter((w) => w.status === "down").length,
		archived: websites.filter((w) => w.status === "archived").length,
		withWP: websites.filter((w) => w.wpAdminUrl).length,
		providers: new Set(websites.map((w) => w.hostingProvider).filter(Boolean)).size,
		totalPlugins: websites.reduce((sum, w) => sum + w.plugins.length, 0)
	}), [websites]);
	const toggleReveal = (0, import_react.useCallback)((key) => {
		setRevealedPasswords((prev) => {
			const n = new Set(prev);
			if (n.has(key)) n.delete(key);
			else {
				n.add(key);
				setTimeout(() => setRevealedPasswords((p) => {
					const x = new Set(p);
					x.delete(key);
					return x;
				}), 1e4);
			}
			return n;
		});
	}, []);
	const copyText = (0, import_react.useCallback)((text) => {
		navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard!");
	}, []);
	const openAdd = () => {
		setEditId(null);
		setForm(emptyWebsite);
		setModalOpen(true);
	};
	const openEdit = (site) => {
		setEditId(site.id);
		const { id, ...rest } = site;
		setForm(rest);
		setModalOpen(true);
	};
	const saveForm = () => {
		if (!form.name.trim()) {
			toast.error("Website name is required.");
			return;
		}
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		if (editId) {
			updateItem("websites", editId, {
				...form,
				lastUpdated: now
			});
			toast.success("Website updated successfully");
		} else {
			addItem("websites", {
				...form,
				dateAdded: now,
				lastUpdated: now
			});
			toast.success("Website added successfully");
		}
		setModalOpen(false);
	};
	const deleteWebsite = (id) => {
		cd.confirm({
			title: "Delete Website",
			description: "This website and all its data will be permanently removed.",
			onConfirm: () => {
				deleteItem("websites", id);
				toast.success("Website deleted");
			}
		});
	};
	const duplicateWebsite = async (id) => {
		if (await duplicateItem("websites", id)) toast.success("Website duplicated");
	};
	const toggleSelect = (0, import_react.useCallback)((id) => {
		setSelectedIds((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});
	}, []);
	const selectAll = (0, import_react.useCallback)(() => {
		if (selectedIds.size === filtered.length) setSelectedIds(/* @__PURE__ */ new Set());
		else setSelectedIds(new Set(filtered.map((w) => w.id)));
	}, [filtered, selectedIds.size]);
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (selectedIds.size === 0) return;
		cd.confirm({
			title: `Delete ${selectedIds.size} Website(s)`,
			description: `This will permanently remove ${selectedIds.size} websites.`,
			onConfirm: () => {
				bulkDeleteItems("websites", [...selectedIds]);
				toast.success(`${selectedIds.size} websites deleted`);
				setSelectedIds(/* @__PURE__ */ new Set());
				setBulkMode(false);
			}
		});
	}, [
		selectedIds,
		bulkDeleteItems,
		cd
	]);
	const bulkUpdateStatus = (0, import_react.useCallback)((status) => {
		if (selectedIds.size === 0) return;
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		bulkPatch("websites", [...selectedIds], {
			status,
			lastUpdated: now
		});
		toast.success(`${selectedIds.size} websites updated to ${status}`);
		setSelectedIds(/* @__PURE__ */ new Set());
	}, [selectedIds, bulkPatch]);
	const bulkUpdateCategory = (0, import_react.useCallback)((category) => {
		if (selectedIds.size === 0) return;
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		bulkPatch("websites", [...selectedIds], {
			category,
			lastUpdated: now
		});
		toast.success(`${selectedIds.size} websites updated to ${category}`);
		setSelectedIds(/* @__PURE__ */ new Set());
	}, [selectedIds, bulkPatch]);
	const toggleSort = (field) => {
		if (sortField === field) setSortDirection((d) => d === "asc" ? "desc" : "asc");
		else {
			setSortField(field);
			setSortDirection("desc");
		}
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const ensureUrl = (url) => url.match(/^https?:\/\//) ? url : `https://${url}`;
	const renderStatusBadge = (status) => {
		const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
		const Icon = cfg.icon;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.bg} ${cfg.color} ${cfg.border} border`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 11 }),
				" ",
				cfg.label
			]
		});
	};
	const renderCredentialField = (label, value, siteId, isPassword) => {
		if (!value) return null;
		const revealKey = `${siteId}-${label}`;
		const isRevealed = revealedPasswords.has(revealKey);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all group/cred",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] text-muted-foreground font-semibold uppercase tracking-wider w-14 flex-shrink-0",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-card-foreground font-mono truncate",
					children: isPassword && !isRevealed ? "••••••••••" : value
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-0.5 opacity-0 group-hover/cred:opacity-100 transition-opacity",
				children: [isPassword && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => toggleReveal(revealKey),
					className: "p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors",
					children: isRevealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { size: 11 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { size: 11 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => copyText(value),
					className: "p-1 rounded-md text-muted-foreground hover:text-primary transition-colors",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 11 })
				})]
			})]
		});
	};
	const renderGridCard = (site, i) => {
		const catConfig = CATEGORY_CONFIG[site.category] || {
			gradient: "from-zinc-500 to-zinc-600",
			emoji: "🌐"
		};
		STATUS_CONFIG[site.status] || STATUS_CONFIG.active;
		const isExpanded = expandedSite === site.id;
		const hasCredentials = site.wpUsername || site.hostingUsername;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			...fadeUp(i),
			onClick: bulkMode ? () => toggleSelect(site.id) : void 0,
			className: `group relative bg-card rounded-2xl border transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-primary/5 ${bulkMode ? "cursor-pointer" : ""} ${selectedIds.has(site.id) ? "border-primary/50 ring-1 ring-primary/20" : "border-border/30 hover:border-border/60"}`,
			children: [
				bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute top-3 right-3 z-10",
					children: selectedIds.has(site.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
						size: 18,
						className: "text-primary"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
						size: 18,
						className: "text-muted-foreground"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-1 bg-gradient-to-r ${catConfig.gradient}` }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-5 pb-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-3 mb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `w-11 h-11 rounded-xl bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-md shadow-primary/10`,
									children: site.name.charAt(0).toUpperCase()
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-bold text-card-foreground text-[15px] truncate leading-tight",
										children: site.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: ensureUrl(site.url),
										target: "_blank",
										rel: "noopener noreferrer",
										className: "text-xs text-muted-foreground hover:text-primary transition-colors truncate block mt-0.5 font-mono",
										children: site.url.replace(/^https?:\/\//, "")
									})]
								})]
							}), renderStatusBadge(site.status)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-1.5 mb-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r ${catConfig.gradient} text-white`,
									children: [
										catConfig.emoji,
										" ",
										site.category
									]
								}),
								site.hostingProvider && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary/50 text-muted-foreground border border-border/20",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Server, { size: 9 }),
										" ",
										site.hostingProvider
									]
								}),
								site.wpAdminUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/15",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { size: 9 }), " WordPress"]
								}),
								site.plugins.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-500 border border-violet-500/15",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Puzzle, { size: 9 }),
										" ",
										site.plugins.length,
										" plugins"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 border-t border-border/15 pt-3 mb-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: ensureUrl(site.url),
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/8 text-primary hover:bg-primary/15 transition-all border border-primary/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 11 }), " Visit Site"]
								}),
								site.wpAdminUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: ensureUrl(site.wpAdminUrl),
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-secondary/50 text-muted-foreground hover:text-foreground transition-all border border-border/20",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { size: 11 }), " WP Admin"]
								}),
								site.hostingLoginUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: ensureUrl(site.hostingLoginUrl),
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-secondary/50 text-muted-foreground hover:text-foreground transition-all border border-border/20",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Server, { size: 11 }), " Hosting"]
								})
							]
						}),
						hasCredentials && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setExpandedSite(isExpanded ? null : site.id),
								className: "flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all border border-border/15 text-xs font-semibold text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
										size: 12,
										className: "text-amber-500"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Credentials & Access" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-auto",
										children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 13 })
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 space-y-1 p-2.5 rounded-xl bg-secondary/15 border border-border/15",
									children: [
										site.wpUsername && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 pb-1",
											children: "WordPress"
										}),
										renderCredentialField("User", site.wpUsername, site.id),
										renderCredentialField("Pass", site.wpPassword, site.id, true),
										site.hostingUsername && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 pb-1 pt-2",
											children: "Hosting"
										}),
										renderCredentialField("User", site.hostingUsername, `${site.id}-host`),
										renderCredentialField("Pass", site.hostingPassword, `${site.id}-host`, true)
									]
								})
							}) })]
						}),
						site.plugins.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 flex flex-wrap gap-1",
							children: site.plugins.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] px-2 py-0.5 rounded-md bg-secondary/40 text-muted-foreground border border-border/10 font-medium",
								children: p
							}, p))
						}),
						site.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2.5 text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2 italic",
							children: site.notes
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-5 py-2.5 bg-secondary/8 border-t border-border/15",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 text-[10px] text-muted-foreground/60 font-medium",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 9 }),
								" Added ",
								site.dateAdded
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 9 }),
								" Updated ",
								site.lastUpdated
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => duplicateWebsite(site.id),
								className: "p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all",
								title: "Duplicate",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 13 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => openEdit(site),
								className: "p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 13 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => deleteWebsite(site.id),
								className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 })
							})
						]
					})]
				})
			]
		}, site.id);
	};
	const renderListRow = (site, i) => {
		const catConfig = CATEGORY_CONFIG[site.category] || {
			gradient: "from-zinc-500 to-zinc-600",
			emoji: "🌐"
		};
		const hasCredentials = site.wpUsername || site.hostingUsername;
		const isExpanded = expandedSite === site.id;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			...fadeUp(i),
			onClick: bulkMode ? () => toggleSelect(site.id) : void 0,
			className: `group bg-card rounded-xl border transition-all overflow-hidden hover:shadow-md ${bulkMode ? "cursor-pointer" : ""} ${selectedIds.has(site.id) ? "border-primary/50 ring-1 ring-primary/20" : "border-border/20 hover:border-border/50"}`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-4 px-5 py-3.5",
				children: [
					bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex-shrink-0",
						children: selectedIds.has(site.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
							size: 18,
							className: "text-primary"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
							size: 18,
							className: "text-muted-foreground"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `w-10 h-10 rounded-xl bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm`,
						children: site.name.charAt(0).toUpperCase()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 mb-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-bold text-card-foreground text-sm truncate",
								children: site.name
							}), renderStatusBadge(site.status)]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: ensureUrl(site.url),
									target: "_blank",
									rel: "noopener noreferrer",
									className: "hover:text-primary transition-colors font-mono truncate max-w-xs",
									children: site.url.replace(/^https?:\/\//, "")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-border",
									children: "·"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [
										catConfig.emoji,
										" ",
										site.category
									]
								}),
								site.hostingProvider && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-border",
									children: "·"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Server, { size: 10 }),
										" ",
										site.hostingProvider
									]
								})] })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5 flex-shrink-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: ensureUrl(site.url),
								target: "_blank",
								rel: "noopener noreferrer",
								className: "p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })
							}),
							site.wpAdminUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: ensureUrl(site.wpAdminUrl),
								target: "_blank",
								rel: "noopener noreferrer",
								className: "p-2 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { size: 14 })
							}),
							hasCredentials && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setExpandedSite(isExpanded ? null : site.id),
								className: `p-2 rounded-lg transition-all ${isExpanded ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { size: 14 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => duplicateWebsite(site.id),
								className: "p-2 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100",
								title: "Duplicate",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 14 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => openEdit(site),
								className: "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all opacity-0 group-hover:opacity-100",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 14 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => deleteWebsite(site.id),
								className: "p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 pb-4 pt-1 border-t border-border/15",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-4 mt-3",
							children: [(site.wpUsername || site.wpPassword) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider",
										children: "WordPress Credentials"
									}),
									renderCredentialField("User", site.wpUsername, site.id),
									renderCredentialField("Pass", site.wpPassword, site.id, true)
								]
							}), (site.hostingUsername || site.hostingPassword) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider",
										children: "Hosting Credentials"
									}),
									renderCredentialField("User", site.hostingUsername, `${site.id}-host`),
									renderCredentialField("Pass", site.hostingPassword, `${site.id}-host`, true)
								]
							})]
						}),
						site.plugins.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5",
								children: "Plugins"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1",
								children: site.plugins.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] px-2 py-0.5 rounded-md bg-secondary/50 text-muted-foreground font-medium",
									children: p
								}, p))
							})]
						}),
						site.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1",
								children: "Notes"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground/80 leading-relaxed",
								children: site.notes
							})]
						})
					]
				})
			}) })]
		}, site.id);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-extrabold text-foreground tracking-tight",
					children: "My Websites"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground mt-0.5 font-medium",
					children: "Manage all your websites, credentials, and hosting from one place"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: async () => {
								const n = await deduplicateTable("websites");
								toast.success(n > 0 ? `Merged ${n} duplicate${n === 1 ? "" : "s"}` : "No duplicates found");
							},
							className: "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20 transition-all",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { size: 15 }), " Merge duplicates"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								setBulkMode(!bulkMode);
								setSelectedIds(/* @__PURE__ */ new Set());
							},
							className: `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 15 }),
								" ",
								bulkMode ? "Cancel" : "Bulk"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: openAdd,
							className: "flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " Add Website"]
						})
					]
				})]
			}),
			bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: selectAll,
						className: "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 hover:bg-secondary transition-all",
						children: [selectedIds.size === filtered.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { size: 13 }), selectedIds.size === filtered.length ? "Deselect All" : "Select All"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs text-muted-foreground font-medium",
						children: [selectedIds.size, " selected"]
					}),
					selectedIds.size > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-px bg-border/30" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							onChange: (e) => {
								if (e.target.value) bulkUpdateStatus(e.target.value);
								e.target.value = "";
							},
							className: "px-2.5 py-1.5 rounded-lg bg-secondary/50 text-xs font-semibold text-muted-foreground border border-border/15 outline-none cursor-pointer",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Set Status..."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "active",
									children: "✅ Active"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "maintenance",
									children: "🔧 Maintenance"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "down",
									children: "🔴 Down"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "archived",
									children: "📦 Archived"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							onChange: (e) => {
								if (e.target.value) bulkUpdateCategory(e.target.value);
								e.target.value = "";
							},
							className: "px-2.5 py-1.5 rounded-lg bg-secondary/50 text-xs font-semibold text-muted-foreground border border-border/15 outline-none cursor-pointer",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Set Category..."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "Personal",
									children: "🏠 Personal"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "Client Site",
									children: "👔 Client Site"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "E-Commerce",
									children: "🛒 E-Commerce"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "Blog",
									children: "📝 Blog"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "SaaS",
									children: "🚀 SaaS"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "Portfolio",
									children: "🎨 Portfolio"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: bulkDelete,
							className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all ml-auto",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 }),
								" Delete (",
								selectedIds.size,
								")"
							]
						})
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2",
				children: [
					{
						label: "Total",
						value: stats.total,
						icon: Globe,
						color: "text-foreground",
						bg: "bg-secondary/30"
					},
					{
						label: "Active",
						value: stats.active,
						icon: CircleCheck,
						color: "text-emerald-500",
						bg: "bg-emerald-500/8"
					},
					{
						label: "Maintenance",
						value: stats.maintenance,
						icon: RefreshCw,
						color: "text-amber-500",
						bg: "bg-amber-500/8"
					},
					{
						label: "Down",
						value: stats.down,
						icon: TriangleAlert,
						color: "text-red-500",
						bg: "bg-red-500/8"
					},
					{
						label: "Archived",
						value: stats.archived,
						icon: Archive,
						color: "text-zinc-400",
						bg: "bg-zinc-500/8"
					},
					{
						label: "WordPress",
						value: stats.withWP,
						icon: Globe,
						color: "text-blue-500",
						bg: "bg-blue-500/8"
					},
					{
						label: "Providers",
						value: stats.providers,
						icon: Server,
						color: "text-purple-500",
						bg: "bg-purple-500/8"
					},
					{
						label: "Plugins",
						value: stats.totalPlugins,
						icon: Puzzle,
						color: "text-violet-500",
						bg: "bg-violet-500/8"
					}
				].map((stat) => {
					const Icon = stat.icon;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `${stat.bg} rounded-xl p-3 border border-border/15 text-center`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								size: 14,
								className: `${stat.color} mx-auto mb-1`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `text-lg font-extrabold ${stat.color} tabular-nums`,
								children: stat.value
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[9px] text-muted-foreground font-semibold uppercase tracking-wider",
								children: stat.label
							})
						]
					}, stat.label);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center bg-secondary/50 rounded-xl px-3.5 py-2.5 gap-2 flex-1 max-w-sm border border-border/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 15,
							className: "text-muted-foreground flex-shrink-0"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: search,
							onChange: (e) => setSearch(e.target.value),
							placeholder: "Search sites, URLs, providers...",
							className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none w-full"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-1 bg-secondary/30 rounded-xl p-1 border border-border/15",
						children: [
							"all",
							"active",
							"maintenance",
							"down",
							"archived"
						].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setFilterStatus(s),
							className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s ? "bg-card text-card-foreground shadow-sm border border-border/30" : "text-muted-foreground hover:text-foreground"}`,
							children: [s === "all" ? "All" : STATUS_CONFIG[s]?.label || s, s !== "all" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-1 text-[10px] opacity-60",
								children: s === "active" ? stats.active : s === "maintenance" ? stats.maintenance : s === "down" ? stats.down : stats.archived
							})]
						}, s))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setShowFilters(!showFilters),
						className: `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${showFilters ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/30 text-muted-foreground border-border/15 hover:text-foreground"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { size: 13 }),
							" Filters",
							filterCategory !== "all" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-1.5 h-1.5 rounded-full bg-primary" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1 ml-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: sortField,
								onChange: (e) => toggleSort(e.target.value),
								className: "px-2.5 py-2 rounded-xl bg-secondary/30 text-xs font-semibold text-muted-foreground border border-border/15 outline-none cursor-pointer",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "lastUpdated",
										children: "Last Updated"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "dateAdded",
										children: "Date Added"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "name",
										children: "Name"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "status",
										children: "Status"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "category",
										children: "Category"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSortDirection((d) => d === "asc" ? "desc" : "asc"),
								className: "p-2 rounded-xl bg-secondary/30 text-muted-foreground hover:text-foreground transition-all border border-border/15",
								children: sortDirection === "desc" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownWideNarrow, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpNarrowWide, { size: 14 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-0.5 bg-secondary/30 rounded-xl p-1 border border-border/15 ml-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setViewMode("grid"),
									className: `p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, { size: 14 })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setViewMode("list"),
									className: `p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, { size: 14 })
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: showFilters && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-3 p-4 rounded-xl bg-secondary/15 border border-border/15",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5",
						children: "Category"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setFilterCategory("all"),
							className: `px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${filterCategory === "all" ? "bg-primary/10 text-primary" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`,
							children: "All"
						}), categories.map((cat) => {
							const config = CATEGORY_CONFIG[cat] || { emoji: "🌐" };
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setFilterCategory(cat),
								className: `px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${filterCategory === cat ? "bg-primary/10 text-primary" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`,
								children: [
									config.emoji,
									" ",
									cat
								]
							}, cat);
						})]
					})] }), hostingProviders.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5",
						children: "Hosting Providers"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1",
						children: hostingProviders.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary/50 text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Server, {
								size: 9,
								className: "inline mr-1"
							}), p]
						}, p))
					})] })]
				})
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-xs text-muted-foreground font-medium",
				children: [
					"Showing ",
					filtered.length,
					" of ",
					websites.length,
					" websites",
					search && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						" ",
						"matching ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-primary font-semibold",
							children: [
								"\"",
								search,
								"\""
							]
						})
					] })
				]
			}),
			viewMode === "grid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4",
				children: filtered.map((site, i) => renderGridCard(site, i))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: filtered.map((site, i) => renderListRow(site, i))
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-20",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-20 h-20 mx-auto rounded-2xl bg-secondary/30 flex items-center justify-center mb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
							size: 36,
							className: "text-muted-foreground/30"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-lg font-bold text-card-foreground mb-1",
						children: "No websites found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground mb-4",
						children: search || filterStatus !== "all" || filterCategory !== "all" ? "Try adjusting your search or filters" : "Add your first website to get started"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: openAdd,
						className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " Add Website"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Website" : "Add Website",
				onSubmit: saveForm,
				size: "lg",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
								size: 13,
								className: "text-primary"
							}), " Basic Information"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Site Name *",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.name,
										onChange: (v) => uf("name", v),
										placeholder: "My Awesome Site"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "URL *",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.url,
										onChange: (v) => uf("url", v),
										placeholder: "https://example.com"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Category",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
										value: form.category,
										onChange: (v) => uf("category", v),
										options: [
											{
												value: "Personal",
												label: "🏠 Personal"
											},
											{
												value: "Client Site",
												label: "👔 Client Site"
											},
											{
												value: "E-Commerce",
												label: "🛒 E-Commerce"
											},
											{
												value: "Blog",
												label: "📝 Blog"
											},
											{
												value: "SaaS",
												label: "🚀 SaaS"
											},
											{
												value: "Portfolio",
												label: "🎨 Portfolio"
											}
										]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Status",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
										value: form.status,
										onChange: (v) => uf("status", v),
										options: [
											{
												value: "active",
												label: "✅ Active"
											},
											{
												value: "maintenance",
												label: "🔧 Maintenance"
											},
											{
												value: "down",
												label: "🔴 Down"
											},
											{
												value: "archived",
												label: "📦 Archived"
											}
										]
									})
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
								size: 13,
								className: "text-blue-500"
							}), " WordPress Access"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-3 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "WP Admin URL",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.wpAdminUrl,
										onChange: (v) => uf("wpAdminUrl", v),
										placeholder: "https://site.com/wp-admin/"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "WP Username",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.wpUsername,
										onChange: (v) => uf("wpUsername", v),
										placeholder: "admin"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "WP Password",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.wpPassword,
										onChange: (v) => uf("wpPassword", v),
										placeholder: "••••••",
										type: "password"
									})
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Server, {
								size: 13,
								className: "text-purple-500"
							}), " Hosting Details"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Hosting Provider",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.hostingProvider,
										onChange: (v) => uf("hostingProvider", v),
										placeholder: "SiteGround, Cloudways, etc."
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Hosting Login URL",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.hostingLoginUrl,
										onChange: (v) => uf("hostingLoginUrl", v),
										placeholder: "https://my.host.com"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Hosting Username",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.hostingUsername,
										onChange: (v) => uf("hostingUsername", v),
										placeholder: "Username"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Hosting Password",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.hostingPassword,
										onChange: (v) => uf("hostingPassword", v),
										type: "password",
										placeholder: "••••••"
									})
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
									size: 13,
									className: "text-emerald-500"
								}), " Additional Details"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Plugins",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTagsInput, {
									value: form.plugins,
									onChange: (v) => uf("plugins", v),
									placeholder: "Add plugin name and press Enter"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "Notes",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
										value: form.notes,
										onChange: (v) => uf("notes", v),
										placeholder: "Quick notes about this site..."
									})
								})
							})
						] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { WebsitesPage as default };
