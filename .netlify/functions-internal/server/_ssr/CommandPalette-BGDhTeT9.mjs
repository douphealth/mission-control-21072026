import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { B as useRepos, I as useLinks, L as useNotes, R as usePayments, Y as useTasks, _ as useAddItem, j as useExportAllData, tt as useWebsites, x as useBuildProjects } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { l as todayISO } from "./overdue-CpArWbx3.mjs";
import { $t as FileText, Et as Lightbulb, Ht as Globe, It as House, L as Search, Mn as Calendar, Mt as KeyRound, N as Settings, T as SquareCheckBig, Ut as Github, Wn as ArrowRight, Xt as Flame, _n as Clock, ct as Moon, f as TrendingUp, g as Timer, kn as ChartColumn, on as Download, rn as ExternalLink, s as Upload, sn as DollarSign, t as Zap, wt as Link2, zt as Hammer } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { M as parseCapture, N as toRecord, h as useSettingsStore, m as useNavigationStore } from "./routes-qm6I9RAb.mjs";
import { t as entry_default } from "../_libs/fuse.js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/CommandPalette-BGDhTeT9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var sections = [
	{
		id: "dashboard",
		label: "Dashboard",
		icon: House,
		emoji: "🏠",
		keywords: [
			"home",
			"overview",
			"main"
		]
	},
	{
		id: "tasks",
		label: "Tasks",
		icon: SquareCheckBig,
		emoji: "✅",
		keywords: [
			"todo",
			"checklist",
			"work"
		]
	},
	{
		id: "calendar",
		label: "Calendar",
		icon: Calendar,
		emoji: "📅",
		keywords: [
			"date",
			"schedule",
			"events"
		]
	},
	{
		id: "notes",
		label: "Notes",
		icon: FileText,
		emoji: "📝",
		keywords: [
			"write",
			"document",
			"memo"
		]
	},
	{
		id: "habits",
		label: "Habit Tracker",
		icon: Flame,
		emoji: "🔥",
		keywords: [
			"streak",
			"daily",
			"routine"
		]
	},
	{
		id: "focus",
		label: "Focus Timer",
		icon: Timer,
		emoji: "🍅",
		keywords: [
			"pomodoro",
			"timer",
			"concentrate"
		]
	},
	{
		id: "websites",
		label: "My Websites",
		icon: Globe,
		emoji: "🌐",
		keywords: [
			"sites",
			"domains",
			"hosting"
		]
	},
	{
		id: "github",
		label: "GitHub Projects",
		icon: Github,
		emoji: "🐙",
		keywords: [
			"repos",
			"code",
			"git"
		]
	},
	{
		id: "builds",
		label: "Build Projects",
		icon: Hammer,
		emoji: "🛠️",
		keywords: [
			"deploy",
			"bolt",
			"lovable"
		]
	},
	{
		id: "links",
		label: "Links Hub",
		icon: Link2,
		emoji: "🔗",
		keywords: [
			"bookmarks",
			"urls",
			"resources"
		]
	},
	{
		id: "projects",
		label: "Kanban Board",
		icon: ChartColumn,
		emoji: "📊",
		keywords: [
			"board",
			"kanban",
			"columns"
		]
	},
	{
		id: "payments",
		label: "Payments",
		icon: DollarSign,
		emoji: "💰",
		keywords: [
			"money",
			"invoice",
			"billing"
		]
	},
	{
		id: "ideas",
		label: "Ideas Board",
		icon: Lightbulb,
		emoji: "💡",
		keywords: [
			"brainstorm",
			"concepts",
			"innovation"
		]
	},
	{
		id: "credentials",
		label: "Credential Vault",
		icon: KeyRound,
		emoji: "🔐",
		keywords: [
			"passwords",
			"secrets",
			"keys"
		]
	},
	{
		id: "seo",
		label: "SEO Center",
		icon: TrendingUp,
		emoji: "🔍",
		keywords: [
			"search",
			"optimization",
			"ranking"
		]
	},
	{
		id: "cloudflare",
		label: "Cloudflare",
		icon: Globe,
		emoji: "☁️",
		keywords: [
			"cdn",
			"dns",
			"protection"
		]
	},
	{
		id: "vercel",
		label: "Vercel",
		icon: Globe,
		emoji: "🚀",
		keywords: [
			"deploy",
			"hosting",
			"nextjs"
		]
	},
	{
		id: "openclaw",
		label: "OpenClaw",
		icon: Github,
		emoji: "🐙",
		keywords: ["tool", "platform"]
	},
	{
		id: "settings",
		label: "Settings",
		icon: Settings,
		emoji: "⚙️",
		keywords: [
			"preferences",
			"config",
			"account"
		]
	}
];
var nlPatterns = [
	{
		pattern: /tasks?\s*(due|for)\s*(today|this week|tomorrow)/i,
		handler: (ctx) => {
			const today = todayISO();
			return ctx.tasks.filter((t) => t.status !== "done" && t.dueDate <= today).map((t) => ({
				id: `task-${t.id}`,
				type: "data",
				label: t.title,
				sub: `${t.priority} · ${t.dueDate}`,
				action: () => {
					ctx.setActiveSection("tasks");
					ctx.onClose();
				},
				emoji: "✅",
				priority: 10
			}));
		}
	},
	{
		pattern: /overdue|late|past\s*due/i,
		handler: (ctx) => {
			const today = todayISO();
			return ctx.tasks.filter((t) => t.status !== "done" && !!t.dueDate && t.dueDate < today).map((t) => ({
				id: `overdue-${t.id}`,
				type: "data",
				label: `⚠️ ${t.title}`,
				sub: `Overdue since ${t.dueDate}`,
				action: () => {
					ctx.setActiveSection("tasks");
					ctx.onClose();
				},
				emoji: "🔴",
				priority: 10
			}));
		}
	},
	{
		pattern: /unpaid|pending\s*(payment|invoice)/i,
		handler: (ctx) => {
			return ctx.payments.filter((p) => p.status === "pending" || p.status === "overdue").map((p) => ({
				id: `payment-${p.id}`,
				type: "data",
				label: p.title,
				sub: `$${p.amount} · ${p.status}`,
				action: () => {
					ctx.setActiveSection("payments");
					ctx.onClose();
				},
				emoji: "💰",
				priority: 10
			}));
		}
	}
];
function CommandPalette({ open, onClose, onImport }) {
	const websites = useWebsites();
	const tasks = useTasks();
	const repos = useRepos();
	const buildProjects = useBuildProjects();
	const links = useLinks();
	const notes = useNotes();
	const payments = usePayments();
	const addItem = useAddItem();
	const exportAllData = useExportAllData();
	const toggleTheme = useSettingsStore((s) => s.toggleTheme);
	const { setActiveSection, recentSections } = useNavigationStore();
	const [query, setQuery] = (0, import_react.useState)("");
	const inputRef = (0, import_react.useRef)(null);
	const listRef = (0, import_react.useRef)(null);
	const [selectedIndex, setSelectedIndex] = (0, import_react.useState)(0);
	const [activeTab, setActiveTab] = (0, import_react.useState)("all");
	(0, import_react.useEffect)(() => {
		if (open) {
			setQuery("");
			setSelectedIndex(0);
			setActiveTab("all");
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);
	const ctx = (0, import_react.useMemo)(() => ({
		tasks,
		payments,
		setActiveSection,
		onClose
	}), [
		tasks,
		payments,
		setActiveSection,
		onClose
	]);
	const allItems = (0, import_react.useMemo)(() => {
		const items = [];
		const raw = query.trim();
		if (raw.length > 1 && ![
			"tasks due",
			"overdue",
			"unpaid"
		].some((p) => p === raw.toLowerCase())) {
			const parsed = parseCapture(raw);
			items.push({
				id: "capture-inline",
				type: "action",
				label: `Capture: “${raw.slice(0, 48)}${raw.length > 48 ? "…" : ""}”`,
				sub: `→ ${parsed.target}${parsed.due ? ` · ${parsed.due}` : ""}${parsed.priority ? ` · ${parsed.priority}` : ""}`,
				action: async () => {
					try {
						await addItem(parsed.target, toRecord(parsed));
						toast.success(`Captured as ${parsed.target}`, { description: parsed.title.slice(0, 60) });
					} catch (e) {
						toast.error("Capture failed", { description: String(e?.message ?? e) });
					}
					onClose();
				},
				emoji: "⚡",
				icon: Zap,
				keywords: [
					"capture",
					"add",
					"new",
					"task",
					"note",
					"idea",
					"reminder",
					"link"
				],
				priority: 200
			});
		}
		recentSections.slice(0, 4).forEach((id, i) => {
			const sec = sections.find((s) => s.id === id);
			if (sec) items.push({
				id: `recent-${id}`,
				type: "recent",
				label: sec.label,
				sub: "Recently visited",
				action: () => {
					setActiveSection(sec.id);
					onClose();
				},
				emoji: sec.emoji,
				icon: Clock,
				priority: 100 - i
			});
		});
		sections.forEach((s) => {
			items.push({
				id: `nav-${s.id}`,
				type: "navigate",
				label: s.label,
				sub: "Go to section",
				action: () => {
					setActiveSection(s.id);
					onClose();
				},
				emoji: s.emoji,
				icon: ArrowRight,
				keywords: s.keywords,
				priority: 50
			});
		});
		items.push({
			id: "action-import",
			type: "action",
			label: "Bulk Import (CSV/JSON)",
			sub: "Import data from file",
			action: () => {
				onImport();
				onClose();
			},
			emoji: "📥",
			icon: Upload,
			keywords: [
				"upload",
				"csv",
				"json"
			],
			priority: 40
		});
		items.push({
			id: "action-export",
			type: "action",
			label: "Export All Data",
			sub: "Download backup JSON",
			action: async () => {
				const data = await exportAllData();
				const blob = new Blob([data], { type: "application/json" });
				const a = document.createElement("a");
				a.href = URL.createObjectURL(blob);
				a.download = `mission-control-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
				a.click();
				onClose();
			},
			emoji: "📤",
			icon: Download,
			keywords: [
				"backup",
				"save",
				"download"
			],
			priority: 40
		});
		items.push({
			id: "action-theme",
			type: "action",
			label: "Toggle Dark Mode",
			sub: "Switch between light & dark",
			action: () => {
				toggleTheme();
				onClose();
			},
			emoji: "🌙",
			icon: Moon,
			keywords: [
				"theme",
				"dark",
				"light",
				"mode"
			],
			priority: 30
		});
		websites.forEach((w) => items.push({
			id: `site-${w.id}`,
			type: "data",
			label: w.name,
			sub: w.url,
			action: () => {
				window.open(w.url, "_blank");
				onClose();
			},
			emoji: "🌐",
			icon: ExternalLink,
			keywords: [w.category, w.hostingProvider],
			priority: 20
		}));
		tasks.filter((t) => t.status !== "done").forEach((t) => items.push({
			id: `task-${t.id}`,
			type: "data",
			label: t.title,
			sub: `${t.priority} · ${t.dueDate}`,
			action: () => {
				setActiveSection("tasks");
				onClose();
			},
			emoji: "✅",
			keywords: [t.category, t.linkedProject],
			priority: 20
		}));
		repos.forEach((r) => items.push({
			id: `repo-${r.id}`,
			type: "data",
			label: r.name,
			sub: r.description?.slice(0, 50) || "",
			action: () => {
				window.open(r.url, "_blank");
				onClose();
			},
			emoji: "🐙",
			icon: ExternalLink,
			keywords: [r.language, ...r.topics || []],
			priority: 15
		}));
		buildProjects.forEach((b) => items.push({
			id: `build-${b.id}`,
			type: "data",
			label: b.name,
			sub: `${b.platform} · ${b.status}`,
			action: () => {
				setActiveSection("builds");
				onClose();
			},
			emoji: "🛠️",
			keywords: b.techStack,
			priority: 15
		}));
		links.forEach((l) => items.push({
			id: `link-${l.id}`,
			type: "data",
			label: l.title,
			sub: l.url,
			action: () => {
				window.open(l.url, "_blank");
				onClose();
			},
			emoji: "🔗",
			icon: ExternalLink,
			keywords: [l.category],
			priority: 10
		}));
		notes.forEach((n) => items.push({
			id: `note-${n.id}`,
			type: "data",
			label: n.title,
			sub: n.content?.slice(0, 40) || "",
			action: () => {
				setActiveSection("notes");
				onClose();
			},
			emoji: "📝",
			keywords: n.tags,
			priority: 10
		}));
		return items;
	}, [
		query,
		websites,
		tasks,
		repos,
		buildProjects,
		links,
		notes,
		payments,
		addItem,
		recentSections,
		setActiveSection,
		onClose,
		onImport,
		exportAllData,
		toggleTheme
	]);
	const fuse = (0, import_react.useMemo)(() => new entry_default(allItems, {
		keys: [
			{
				name: "label",
				weight: .5
			},
			{
				name: "sub",
				weight: .2
			},
			{
				name: "type",
				weight: .1
			},
			{
				name: "keywords",
				weight: .2
			}
		],
		threshold: .35,
		includeScore: true,
		sortFn: (a, b) => a.score - b.score
	}), [allItems]);
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim();
		if (!q) {
			let items = allItems;
			if (activeTab !== "all") items = items.filter((i) => activeTab === "actions" ? i.type === "action" : i.type === activeTab);
			return items.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 12);
		}
		for (const nlp of nlPatterns) if (nlp.pattern.test(q)) {
			const results = nlp.handler(ctx);
			if (results.length > 0) return results.slice(0, 10);
		}
		let results = fuse.search(q).map((r) => r.item);
		if (activeTab !== "all") results = results.filter((i) => activeTab === "actions" ? i.type === "action" : i.type === activeTab);
		return results.slice(0, 12);
	}, [
		query,
		allItems,
		fuse,
		activeTab,
		ctx
	]);
	(0, import_react.useEffect)(() => {
		setSelectedIndex(0);
	}, [query, activeTab]);
	(0, import_react.useEffect)(() => {
		if (listRef.current) listRef.current.children[selectedIndex]?.scrollIntoView({ block: "nearest" });
	}, [selectedIndex]);
	const handleKeyDown = (0, import_react.useCallback)((e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((i) => Math.max(i - 1, 0));
		}
		if (e.key === "Enter" && filtered[selectedIndex]) filtered[selectedIndex].action();
		if (e.key === "Escape") onClose();
		if (e.key === "Tab") {
			e.preventDefault();
			const tabs = [
				"all",
				"navigate",
				"data",
				"actions"
			];
			const next = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length];
			setActiveTab(next);
		}
	}, [
		filtered,
		selectedIndex,
		onClose,
		activeTab
	]);
	const typeConfig = {
		recent: {
			label: "Recent",
			color: "bg-warning/10 text-warning"
		},
		navigate: {
			label: "Navigate",
			color: "bg-primary/10 text-primary"
		},
		action: {
			label: "Action",
			color: "bg-accent/10 text-accent"
		},
		data: {
			label: "Data",
			color: "bg-secondary text-muted-foreground"
		}
	};
	const tabs = [
		{
			id: "all",
			label: "All",
			count: allItems.length
		},
		{
			id: "navigate",
			label: "Navigate",
			count: allItems.filter((i) => i.type === "navigate").length
		},
		{
			id: "data",
			label: "Data",
			count: allItems.filter((i) => i.type === "data").length
		},
		{
			id: "actions",
			label: "Actions",
			count: allItems.filter((i) => i.type === "action").length
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4",
		onClick: onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-foreground/30 backdrop-blur-md" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative w-full max-w-xl bg-card/95 backdrop-blur-2xl rounded-2xl shadow-[var(--shadow-xl)] border border-border/50 overflow-hidden",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 px-4 py-3.5 border-b border-border/40",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 17,
							className: "text-primary flex-shrink-0"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: inputRef,
							value: query,
							onChange: (e) => setQuery(e.target.value),
							onKeyDown: handleKeyDown,
							placeholder: "Search, navigate, or type a command...",
							className: "flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/50"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
							className: "text-[10px] text-muted-foreground/40 bg-secondary px-1.5 py-0.5 rounded font-mono border border-border/30",
							children: "ESC"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1 px-4 py-2 border-b border-border/30 bg-secondary/20",
					children: tabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setActiveTab(tab.id),
						className: `flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"}`,
						children: [tab.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `text-[9px] px-1 rounded ${activeTab === tab.id ? "bg-primary-foreground/20" : "bg-secondary"}`,
							children: tab.count
						})]
					}, tab.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: listRef,
					className: "max-h-[50vh] overflow-y-auto py-1.5",
					children: [
						!query && activeTab === "all" && recentSections.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-4 py-1.5 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 10 }), " Recent"]
						}),
						filtered.map((item, i) => {
							const tc = typeConfig[item.type] || typeConfig.data;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: item.action,
								onMouseEnter: () => setSelectedIndex(i),
								className: `w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${selectedIndex === i ? "bg-primary/8 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-secondary/40"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base flex-shrink-0 w-7 text-center",
										children: item.emoji
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[13px] font-semibold text-foreground truncate",
											children: item.label
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-muted-foreground/50 truncate",
											children: item.sub
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `text-[9px] px-2 py-0.5 rounded-md font-semibold flex-shrink-0 ${tc.color}`,
										children: tc.label
									}),
									selectedIndex === i && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
										size: 12,
										className: "text-primary flex-shrink-0 ml-1"
									})
								]
							}, item.id);
						}),
						filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-4 py-10 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl mb-2",
									children: "🔍"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-sm font-semibold text-foreground/60",
									children: [
										"No results for \"",
										query,
										"\""
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted-foreground/40 mt-1",
									children: "Try \"tasks due today\" or \"unpaid invoices\""
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border/40 px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground/40 bg-secondary/10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
										className: "px-1 py-0.5 rounded bg-secondary font-mono text-[9px]",
										children: "↑↓"
									}),
									" ",
									"Navigate"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
										className: "px-1 py-0.5 rounded bg-secondary font-mono text-[9px]",
										children: "↵"
									}),
									" ",
									"Select"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
										className: "px-1 py-0.5 rounded bg-secondary font-mono text-[9px]",
										children: "Tab"
									}),
									" ",
									"Filter"
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
							size: 10,
							className: "text-primary"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold text-primary/60",
							children: "Fuzzy Search"
						})]
					})]
				})
			]
		})]
	}) });
}
//#endregion
export { CommandPalette as default };
