import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { G as useSEOSnapshots, L as useNotes, N as useHabits, P as useIdeas, R as usePayments, U as useSEOIssues, V as useSEOActions, W as useSEOProfiles, Y as useTasks, tt as useWebsites, x as useBuildProjects } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $t as FileText, Bn as ArrowUp, Et as Lightbulb, Hn as ArrowUpRight, Ht as Globe, In as Bug, Jn as ArrowDownRight, L as Search, Q as Play, Rn as Bell, St as ListChecks, T as SquareCheckBig, Tn as ChevronRight, U as Rocket, Ut as Github, X as Plus, Xn as Activity, Xt as Flame, _n as Clock, f as TrendingUp, hn as Cloud, in as Ellipsis, kn as ChartColumn, rt as Pause, sn as DollarSign, t as Zap } from "../_libs/lucide-react.mjs";
import { h as useSettingsStore, m as useNavigationStore } from "./routes-qm6I9RAb.mjs";
import { t as TaskQuickEditor } from "./TaskQuickEditor-CeQxnFy3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/InsightsPanel-C3ss6u1b.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var HUES = {
	emerald: {
		grad: "linear-gradient(140deg,#10b981,#059669 65%,#047857)",
		soft: "rgba(16,185,129,0.12)",
		ink: "#065f46"
	},
	violet: {
		grad: "linear-gradient(140deg,#a78bfa,#8b5cf6 60%,#6d28d9)",
		soft: "rgba(139,92,246,0.12)",
		ink: "#5b21b6"
	},
	rose: {
		grad: "linear-gradient(140deg,#fb7185,#f43f5e 60%,#e11d48)",
		soft: "rgba(244,63,94,0.12)",
		ink: "#9f1239"
	},
	amber: {
		grad: "linear-gradient(140deg,#fbbf24,#f59e0b 60%,#d97706)",
		soft: "rgba(245,158,11,0.14)",
		ink: "#92400e"
	},
	sky: {
		grad: "linear-gradient(140deg,#38bdf8,#0ea5e9 60%,#0369a1)",
		soft: "rgba(14,165,233,0.12)",
		ink: "#0c4a6e"
	},
	ink: {
		grad: "linear-gradient(160deg,#0f172a,#1e293b 60%,#0b1220)",
		soft: "rgba(15,23,42,0.06)",
		ink: "#0f172a"
	}
};
var fu = (i) => ({ style: { animation: `fadeUp 0.55s ${i * 55}ms cubic-bezier(0.22,1,0.36,1) both` } });
var PRI = {
	critical: {
		hue: "rose",
		lbl: "Critical"
	},
	high: {
		hue: "amber",
		lbl: "High"
	},
	medium: {
		hue: "sky",
		lbl: "Medium"
	},
	low: {
		hue: "emerald",
		lbl: "Low"
	}
};
var SectionTitle = ({ title, sub, onAction, actionLabel = "View all", invert }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "flex items-start justify-between mb-5",
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
		className: `text-[15px] font-bold tracking-tight ${invert ? "text-white" : "zen-label"}`,
		children: title
	}), sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: `text-[11px] mt-0.5 ${invert ? "text-white/50" : "text-muted-foreground"}`,
		children: sub
	})] }), onAction && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: onAction,
		className: `inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition ${invert ? "text-white/70 hover:text-white bg-white/10 hover:bg-white/15" : "text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/70"}`,
		children: [
			actionLabel,
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 11 })
		]
	})]
});
var MomentumChart = ({ data }) => {
	const [hover, setHover] = (0, import_react.useState)(null), w = 720, h = 220, padX = 14, padTop = 22;
	const pts = data.length ? data : [0, 0];
	const max = Math.max(...pts, 1);
	const stepX = pts.length > 1 ? 692 / (pts.length - 1) : 0;
	const xy = pts.map((v, i) => [padX + i * stepX, 194 - v / max * 172]);
	let line = `M${xy[0][0]},${xy[0][1]}`;
	for (let i = 0; i < xy.length - 1; i++) {
		const p0 = xy[i - 1] ?? xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] ?? p2;
		const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
		const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
		line += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
	}
	const area = `${line} L${xy[xy.length - 1][0]},194 L${xy[0][0]},194 Z`;
	const active = hover != null ? xy[hover] : xy[xy.length - 1];
	const activeVal = pts[hover != null ? hover : pts.length - 1];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${w} ${h}`,
			preserveAspectRatio: "none",
			className: "h-[200px] w-full overflow-visible",
			onMouseLeave: () => setHover(null),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: "mcStroke",
						x1: "0",
						y1: "0",
						x2: "1",
						y2: "0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "hsl(var(--info))"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "55%",
								stopColor: "hsl(var(--primary))"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "hsl(var(--violet))"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: "mcFill",
						x1: "0",
						y1: "0",
						x2: "0",
						y2: "1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "hsl(var(--primary))",
								stopOpacity: .34
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "60%",
								stopColor: "hsl(var(--primary))",
								stopOpacity: .08
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "hsl(var(--primary))",
								stopOpacity: 0
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("filter", {
						id: "mcGlow",
						x: "-20%",
						y: "-40%",
						width: "140%",
						height: "200%",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("feGaussianBlur", {
							stdDeviation: "6",
							result: "b"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("feMerge", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("feMergeNode", { in: "b" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("feMergeNode", { in: "SourceGraphic" })] })]
					})
				] }),
				[
					.25,
					.5,
					.75
				].map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: padX,
					x2: 706,
					y1: padTop + g * 172,
					y2: padTop + g * 172,
					stroke: "hsl(var(--border))",
					strokeWidth: 1,
					strokeDasharray: "2 8",
					opacity: .7
				}, g)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: area,
					fill: "url(#mcFill)",
					style: { animation: "mcFade 0.9s ease-out both" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: line,
					fill: "none",
					stroke: "url(#mcStroke)",
					strokeWidth: 3,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					filter: "url(#mcGlow)",
					pathLength: 1,
					style: {
						strokeDasharray: 1,
						animation: "mcDraw 1.4s cubic-bezier(0.22,1,0.36,1) both"
					}
				}),
				active && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: active[0],
						x2: active[0],
						y1: 14,
						y2: 194,
						stroke: "hsl(var(--primary))",
						strokeWidth: 1,
						strokeDasharray: "3 4",
						opacity: .5
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: active[0],
						cy: active[1],
						r: 9,
						fill: "hsl(var(--primary))",
						opacity: .16
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: active[0],
						cy: active[1],
						r: 4.5,
						fill: "hsl(var(--card))",
						stroke: "hsl(var(--primary))",
						strokeWidth: 3
					})
				] }),
				xy.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: p[0] - stepX / 2,
					y: 0,
					width: stepX || w,
					height: h,
					fill: "transparent",
					onMouseEnter: () => setHover(i)
				}, i))
			]
		}), active && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-none absolute -top-1 rounded-lg border border-border/60 bg-card/95 px-2 py-1 text-[10px] font-bold text-foreground shadow-[var(--shadow-md)] backdrop-blur",
			style: { left: `calc(${active[0] / w * 100}% - 26px)` },
			children: [activeVal, " done"]
		})]
	});
};
var AvatarStack = ({ names, size = 28 }) => {
	const colors = [
		"#f59e0b",
		"#8b5cf6",
		"#10b981",
		"#0ea5e9",
		"#f43f5e"
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex -space-x-2",
		children: [names.slice(0, 4).map((n, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				width: size,
				height: size,
				background: colors[i % colors.length]
			},
			className: "rounded-full ring-2 ring-background flex items-center justify-center text-white text-[10px] font-bold uppercase",
			children: n.charAt(0)
		}, i)), names.length > 4 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				width: size,
				height: size
			},
			className: "rounded-full ring-2 ring-background bg-secondary text-foreground/70 flex items-center justify-center text-[10px] font-bold",
			children: ["+", names.length - 4]
		})]
	});
};
var InsightsPanel = (0, import_react.forwardRef)(function InsightsPanel({ highlightsOnly = false }, ref) {
	const websites = useWebsites();
	const buildProjects = useBuildProjects();
	const tasks = useTasks();
	const notes = useNotes();
	const payments = usePayments();
	const ideas = useIdeas();
	const habits = useHabits();
	const seoProfiles = useSEOProfiles();
	const seoSnapshots = useSEOSnapshots();
	const seoIssues = useSEOIssues();
	const seoActions = useSEOActions();
	const { setActiveSection } = useNavigationStore();
	const { userName } = useSettingsStore();
	const [clock, setClock] = (0, import_react.useState)(/* @__PURE__ */ new Date());
	const [timerRunning, setTimerRunning] = (0, import_react.useState)(false);
	const [chartRange, setChartRange] = (0, import_react.useState)("1W");
	const [timerSec, setTimerSec] = (0, import_react.useState)(1500);
	const [editingTaskId, setEditingTaskId] = (0, import_react.useState)(null);
	const [taskSearch, setTaskSearch] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const t = setInterval(() => setClock(/* @__PURE__ */ new Date()), 1e3);
		return () => clearInterval(t);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!timerRunning) return;
		const t = setInterval(() => setTimerSec((s) => Math.max(0, s - 1)), 1e3);
		return () => clearInterval(t);
	}, [timerRunning]);
	const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
	const fmt = (n) => new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0
	}).format(n);
	const done = tasks.filter((t) => t.status === "done");
	const open = tasks.filter((t) => t.status !== "done");
	const inProgress = tasks.filter((t) => t.status === "in-progress");
	const todo = tasks.filter((t) => t.status === "todo");
	const dueToday = tasks.filter((t) => t.dueDate === today && t.status !== "done").length;
	const overdue = tasks.filter((t) => !!t.dueDate && t.dueDate < today && t.status !== "done").length;
	const completedToday = tasks.filter((t) => t.completedAt === today).length;
	const income = payments.filter((p) => p.type === "income" && p.status === "paid").reduce((s, p) => s + p.amount, 0);
	const expense = payments.filter((p) => (p.type === "expense" || p.type === "subscription") && p.status === "paid").reduce((s, p) => s + p.amount, 0);
	const pending = payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount, 0);
	tasks.length > 0 && done.length / tasks.length * 100;
	const upcoming = tasks.filter((t) => t.status !== "done" && t.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
	const topIdeas = ideas.filter((i) => i.status !== "parked").sort((a, b) => b.votes - a.votes).slice(0, 4);
	const pinnedNotes = notes.filter((n) => n.pinned).slice(0, 3);
	const seoEvidenceSiteIds = new Set(seoSnapshots.map((s) => s.websiteId));
	const seoConnectedProfiles = seoProfiles.filter((p) => p.syncStatus === "connected").length;
	const seoOpenIssues = seoIssues.filter((i) => i.status === "open" || i.status === "in-progress");
	const seoOpenActions = seoActions.filter((a) => a.status !== "done" && a.status !== "cancelled");
	const seoNextActions = [...seoOpenActions].sort((a, b) => ({
		critical: 4,
		high: 3,
		medium: 2,
		low: 1
	})[b.priority] - {
		critical: 4,
		high: 3,
		medium: 2,
		low: 1
	}[a.priority]).slice(0, 3);
	const rangeDays = {
		"1W": 7,
		"1M": 30,
		"3M": 90,
		"1Y": 365
	}[chartRange] ?? 7;
	const buckets = rangeDays <= 30 ? rangeDays : 12;
	const taskWave = (0, import_react.useMemo)(() => {
		const span = Math.max(1, Math.round(rangeDays / buckets));
		const now = (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime();
		return Array.from({ length: buckets }, (_, i) => {
			const end = now - (buckets - 1 - i) * span * 864e5;
			const start = end - (span - 1) * 864e5;
			return tasks.filter((t) => {
				const stamp = (t.completedAt || "").slice(0, 10);
				if (!stamp) return false;
				const ts = (/* @__PURE__ */ new Date(`${stamp}T00:00:00`)).getTime();
				return ts >= start && ts <= end;
			}).length;
		});
	}, [
		tasks,
		rangeDays,
		buckets,
		today
	]);
	const rangeCompleted = taskWave.reduce((s, n) => s + n, 0);
	const previousRangeCompleted = (0, import_react.useMemo)(() => {
		const end = (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime() - rangeDays * 864e5;
		const start = end - (rangeDays - 1) * 864e5;
		return tasks.filter((task) => {
			const stamp = (task.completedAt || "").slice(0, 10);
			if (!stamp) return false;
			const completed = (/* @__PURE__ */ new Date(`${stamp}T00:00:00`)).getTime();
			return completed >= start && completed <= end;
		}).length;
	}, [
		tasks,
		rangeDays,
		today
	]);
	const completionChange = previousRangeCompleted > 0 ? Math.round((rangeCompleted - previousRangeCompleted) / previousRangeCompleted * 100) : rangeCompleted > 0 ? 100 : 0;
	const maxWave = Math.max(...taskWave, 0);
	const peakIndex = maxWave > 0 ? taskWave.indexOf(maxWave) : -1;
	const periodLabel = chartRange === "1W" ? "7 days" : chartRange === "1M" ? "30 days" : chartRange === "3M" ? "90 days" : "12 months";
	clock.getHours();
	clock.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric"
	});
	const timerText = `${String(Math.floor(timerSec / 60)).padStart(2, "0")}:${String(timerSec % 60).padStart(2, "0")}`;
	const matching = (items) => items.filter((t) => `${t.title} ${t.description ?? ""} ${t.category ?? ""}`.toLowerCase().includes(taskSearch.trim().toLowerCase()));
	const kanban = [
		{
			key: "todo",
			title: "To do",
			hue: "sky",
			items: matching(todo).slice(0, 6)
		},
		{
			key: "in-progress",
			title: "In progress",
			hue: "amber",
			items: matching(inProgress).slice(0, 6)
		},
		{
			key: "review",
			title: "High priority",
			hue: "violet",
			items: matching(open.filter((t) => t.priority === "high" || t.priority === "critical")).slice(0, 6)
		},
		{
			key: "done",
			title: "Completed",
			hue: "emerald",
			items: matching(done).slice(0, 6)
		}
	];
	const editingTask = tasks.find((t) => t.id === editingTaskId) ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "flex flex-col gap-5 sm:gap-6 pb-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes mcDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes mcFade{from{opacity:0}to{opacity:1}}` }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
				children: [
					{
						hue: "emerald",
						label: "Total projects",
						value: websites.length + buildProjects.length,
						delta: null,
						Icon: ChartColumn,
						nav: "websites",
						sub: "across all workspaces"
					},
					{
						hue: "violet",
						label: "Completed",
						value: done.length,
						delta: null,
						Icon: SquareCheckBig,
						nav: "tasks",
						sub: "tasks this month"
					},
					{
						hue: "amber",
						label: "Active tasks",
						value: open.length,
						delta: overdue ? `${overdue} overdue` : null,
						Icon: TrendingUp,
						nav: "tasks",
						sub: "currently running"
					},
					{
						hue: "sky",
						label: "Net revenue",
						value: fmt(income - expense),
						delta: null,
						Icon: DollarSign,
						nav: "payments",
						sub: "this period"
					}
				].map((s, i) => {
					const h = HUES[s.hue];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setActiveSection(s.nav),
						...fu(i + 1),
						className: "group relative text-left rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 overflow-hidden text-white transition-transform hover:-translate-y-1 active:scale-[0.98]",
						style: {
							background: h.grad,
							boxShadow: `0 20px 50px -20px ${h.soft.replace("0.12", "0.55").replace("0.14", "0.55")}`
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30",
							style: { background: "radial-gradient(circle, rgba(255,255,255,0.6), transparent 65%)" }
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between mb-4 sm:mb-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.Icon, {
											size: 18,
											className: "text-white"
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, {
										size: 16,
										className: "text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-display text-[26px] sm:text-[36px] font-extrabold tracking-tighter leading-none tabular-nums",
									children: s.value
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold text-white/90",
									children: s.label
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 hidden sm:block text-[11px] text-white/65",
									children: s.sub
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3 sm:mt-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold",
									children: s.delta ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { size: 10 }),
										" ",
										s.delta
									] }) : "No comparison data"
								})
							]
						})]
					}, s.label);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					...fu(6),
					className: "lg:col-span-8 relative overflow-hidden rounded-[28px] border border-border/60 bg-card p-5 shadow-[var(--shadow-lg)] sm:p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.18),transparent_65%)] blur-2xl" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,hsl(var(--info)/0.12),transparent_65%)] blur-2xl" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "relative flex h-1.5 w-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" })]
										}), "Productivity pulse"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
										className: "font-display text-[24px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[30px]",
										children: [
											"Momentum,",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "bg-gradient-to-r from-primary via-info to-violet bg-clip-text text-transparent",
												children: "visualised"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-[12px] text-muted-foreground",
										children: ["Live output across the last ", periodLabel]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "inline-flex shrink-0 rounded-2xl border border-border/60 bg-secondary/60 p-1 text-[11px] font-semibold backdrop-blur",
								role: "group",
								"aria-label": "Performance range",
								children: [
									"1W",
									"1M",
									"3M",
									"1Y"
								].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setChartRange(v),
									"aria-pressed": chartRange === v,
									className: `min-w-10 rounded-xl px-2.5 py-2 transition-all duration-300 ${chartRange === v ? "bg-card text-foreground shadow-[0_6px_18px_-8px_hsl(var(--primary)/0.7)] ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground"}`,
									children: v
								}, v))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3",
							children: [
								{
									key: "done",
									lbl: "Completed",
									val: rangeCompleted,
									delta: `${completionChange >= 0 ? "+" : ""}${completionChange}% vs prior`,
									icon: SquareCheckBig,
									tone: "primary",
									up: completionChange >= 0,
									bar: Math.min(100, rangeCompleted ? 100 : 0)
								},
								{
									key: "motion",
									lbl: "In motion",
									val: inProgress.length,
									delta: `${open.length} total open`,
									icon: Zap,
									tone: "info",
									up: true,
									bar: open.length ? inProgress.length / open.length * 100 : 0
								},
								{
									key: "attn",
									lbl: "Needs attention",
									val: overdue,
									delta: overdue ? "Overdue now" : "All clear",
									icon: Bell,
									tone: overdue ? "destructive" : "primary",
									up: !overdue,
									bar: open.length ? overdue / open.length * 100 : 0
								}
							].map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: { animation: `fadeUp 0.6s ${300 + i * 90}ms cubic-bezier(0.22,1,0.36,1) both` },
								className: "group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-secondary/50 to-secondary/20 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_40px_-24px_hsl(var(--primary)/0.55)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
										style: { background: `radial-gradient(120% 80% at 50% 0%, hsl(var(--${m.tone})/0.14), transparent 70%)` }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative mb-3 flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
											children: m.lbl
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
											style: {
												background: `hsl(var(--${m.tone})/0.12)`,
												color: `hsl(var(--${m.tone}))`
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(m.icon, { size: 14 })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative flex items-end justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-display text-[34px] font-extrabold leading-none tabular-nums text-foreground",
											children: m.val
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1 text-right text-[10px] font-bold",
											style: { color: m.up ? "hsl(var(--muted-foreground))" : "hsl(var(--destructive))" },
											children: [m.key === "done" && (m.up ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, {
												size: 11,
												className: "text-primary"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownRight, {
												size: 11,
												className: "text-destructive"
											})), m.delta]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "relative mt-3 h-1 overflow-hidden rounded-full bg-border/60",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-full rounded-full transition-all duration-700",
											style: {
												width: `${Math.max(6, Math.min(100, m.bar))}%`,
												background: `linear-gradient(90deg, hsl(var(--${m.tone})/0.5), hsl(var(--${m.tone})))`
											}
										})
									})
								]
							}, m.key))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative overflow-hidden rounded-[22px] border border-border/50 bg-gradient-to-b from-secondary/25 to-transparent p-4 sm:p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-2 flex flex-wrap items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { size: 11 }),
											" ",
											peakIndex >= 0 ? `Peak ${maxWave} task${maxWave === 1 ? "" : "s"}` : "Complete a task to start your curve"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] font-semibold text-muted-foreground",
										children: [
											rangeCompleted,
											" completed · ",
											periodLabel
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MomentumChart, { data: taskWave }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Earlier" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Today" })]
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					...fu(7),
					className: "lg:col-span-4 rounded-[28px] p-6 sm:p-7 text-white relative overflow-hidden",
					style: { background: "linear-gradient(160deg,#0f172a,#111827 55%,#0b1220)" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-40",
						style: { background: "radial-gradient(circle,#10b981,transparent 65%)" }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" }), " Focus session"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {
									size: 16,
									className: "text-white/50"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[64px] font-extrabold tracking-tighter tabular-nums leading-none",
								children: timerText
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[12px] text-white/50 mt-1",
								children: "Deep work · Pomodoro 25/5"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-6 h-1.5 rounded-full bg-white/10 overflow-hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full rounded-full transition-all",
									style: {
										width: `${100 - timerSec / 1500 * 100}%`,
										background: "linear-gradient(90deg,#10b981,#38bdf8)"
									}
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-6 flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setTimerRunning((r) => !r),
									className: "flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-slate-900 font-bold text-[13px] hover:scale-[1.02] transition",
									children: timerRunning ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { size: 14 }), " Pause"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { size: 14 }), " Start"] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										setTimerRunning(false);
										setTimerSec(1500);
									},
									className: "px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 text-[13px] font-semibold transition",
									children: "Reset"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-center",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-lg font-extrabold text-white",
										children: completedToday
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-white/50 mt-0.5",
										children: "Done today"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-lg font-extrabold text-white",
										children: dueToday
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-white/50 mt-0.5",
										children: "Due today"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `text-lg font-extrabold ${overdue ? "text-rose-300" : "text-white"}`,
										children: overdue
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-white/50 mt-0.5",
										children: "Overdue"
									})] })
								]
							})
						]
					})]
				})]
			}),
			!highlightsOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					...fu(8),
					className: "zen-card enterprise-card relative rounded-[28px] p-6 sm:p-7",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between flex-wrap gap-4 mb-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5",
								children: "Task board"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-[22px] font-extrabold tracking-tight text-foreground",
								children: "What's on your plate"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[12px] text-muted-foreground mt-1",
								children: "Live view · updates in real time"
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
									size: 14,
									className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: taskSearch,
									onChange: (e) => setTaskSearch(e.target.value),
									placeholder: "Search tasks...",
									className: "pl-9 pr-3 py-2 rounded-2xl bg-secondary text-[12px] text-foreground placeholder:text-muted-foreground/60 outline-none w-40 sm:w-52 focus:ring-2 focus:ring-primary/30"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveSection("tasks"),
								className: "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-foreground text-background text-[12px] font-bold hover:opacity-90 transition",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 13 }), " New task"]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4",
						children: kanban.map((col, ci) => {
							const h = HUES[col.hue];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								...fu(9 + ci),
								className: "rounded-3xl p-4 border border-border/60 flex flex-col gap-3",
								style: { background: "var(--surface-panel)" },
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between px-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "w-2 h-2 rounded-full",
													style: { background: h.grad }
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[12px] font-bold text-foreground",
													children: col.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-muted-foreground bg-secondary",
													children: col.items.length
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "text-muted-foreground hover:text-foreground",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 13 })
										})]
									}),
									col.items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-center py-6 text-[11px] text-muted-foreground/60",
										children: "Nothing here yet"
									}),
									col.items.map((t, i) => {
										const p = PRI[t.priority] || PRI.medium;
										const ph = HUES[p.hue];
										const isOverdue = t.dueDate && t.dueDate < today && col.key !== "done";
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => setEditingTaskId(t.id),
											className: "text-left rounded-2xl p-3.5 border border-border/60 bg-background hover:shadow-md hover:border-primary/30 transition-all group",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center justify-between mb-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold",
														style: {
															background: ph.soft,
															color: ph.ink
														},
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "w-1.5 h-1.5 rounded-full",
																style: { background: ph.grad }
															}),
															" ",
															p.lbl
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {
														size: 13,
														className: "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[13px] font-semibold text-foreground line-clamp-2 leading-snug mb-3",
													children: t.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center justify-between",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarStack, {
														names: [userName],
														size: 22
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: `flex items-center gap-1 text-[10px] font-semibold ${isOverdue ? "text-rose-500" : "text-muted-foreground"}`,
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 10 }), t.dueDate ? t.dueDate === today ? "Today" : t.dueDate.slice(5) : "—"]
													})]
												})
											]
										}, t.id);
									})
								]
							}, col.key);
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 lg:grid-cols-12 gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							...fu(13),
							className: "lg:col-span-5 zen-card enterprise-card relative rounded-[28px] p-6 sm:p-7",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
									title: "Finance",
									sub: "Income, expenses & profit",
									onAction: () => setActiveSection("payments"),
									actionLabel: "Details"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-3 gap-3 mb-4",
									children: [
										{
											hue: "emerald",
											lbl: "Income",
											val: income,
											Icon: ArrowUpRight
										},
										{
											hue: "rose",
											lbl: "Expenses",
											val: expense,
											Icon: ArrowDownRight
										},
										{
											hue: "amber",
											lbl: "Pending",
											val: pending,
											Icon: Clock
										}
									].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-2xl p-4 border border-border/60",
										style: { background: HUES[d.hue].soft },
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(d.Icon, {
												size: 14,
												style: { color: HUES[d.hue].ink }
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-2 text-[15px] font-extrabold tabular-nums",
												style: { color: HUES[d.hue].ink },
												children: fmt(d.val)
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] font-semibold text-muted-foreground mt-0.5",
												children: d.lbl
											})
										]
									}, d.lbl))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-4 rounded-2xl border border-border/60 bg-secondary/40 flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-muted-foreground font-semibold uppercase tracking-wide",
										children: "Net profit"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `text-[24px] font-extrabold tabular-nums leading-none mt-1 ${income - expense >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`,
										children: fmt(income - expense)
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-right",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] text-muted-foreground",
											children: [payments.length, " transactions"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `text-[11px] font-bold mt-0.5 ${income - expense >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`,
											children: income - expense >= 0 ? "▲ Profitable" : "▼ Loss"
										})]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							...fu(14),
							className: "lg:col-span-4 zen-card enterprise-card relative rounded-[28px] p-6 sm:p-7",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
								title: "Upcoming",
								sub: `${upcoming.length} deadlines`,
								onAction: () => setActiveSection("calendar"),
								actionLabel: "Calendar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [upcoming.map((t, i) => {
									const d = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 864e5);
									const h = HUES[d <= 0 ? "rose" : d <= 2 ? "amber" : "sky"];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										...fu(i),
										className: "flex w-full items-center gap-3 p-3 text-left rounded-2xl hover:bg-secondary/50 transition",
										onClick: () => setEditingTaskId(t.id),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "w-11 h-11 rounded-2xl flex flex-col items-center justify-center flex-shrink-0",
												style: {
													background: h.soft,
													color: h.ink
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[8px] font-bold uppercase leading-none",
													children: new Date(t.dueDate).toLocaleDateString("en", { month: "short" })
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-extrabold leading-tight",
													children: new Date(t.dueDate).getDate()
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex-1 min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[13px] font-semibold text-foreground truncate",
													children: t.title
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[10px] text-muted-foreground",
													children: d <= 0 ? "Due today" : d === 1 ? "Tomorrow" : `In ${d} days`
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
												size: 14,
												className: "text-muted-foreground"
											})
										]
									}, t.id);
								}), upcoming.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-center py-10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-4xl mb-2",
										children: "🌟"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[12px] text-muted-foreground",
										children: "Nothing scheduled"
									})]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							...fu(15),
							className: "lg:col-span-3 rounded-[28px] p-6 sm:p-7 text-white relative overflow-hidden",
							style: { background: "linear-gradient(160deg,#7c2d12,#c2410c 60%,#f97316)" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-40",
								style: { background: "radial-gradient(circle,#fbbf24,transparent 65%)" }
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
									invert: true,
									title: "Habits",
									sub: `${habits.filter((h) => h.completions?.includes(today)).length}/${habits.length} today`,
									onAction: () => setActiveSection("habits"),
									actionLabel: "Track"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [habits.slice(0, 5).map((h, i) => {
										const isDone = h.completions?.includes(today);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											...fu(i),
											className: `flex items-center gap-2.5 p-2.5 rounded-2xl transition ${isDone ? "bg-white/25" : "bg-white/10 hover:bg-white/15"}`,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-base",
													children: h.icon
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex-1 min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-[12px] font-bold text-white truncate",
														children: h.name
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-[9px] text-white/70",
														children: h.frequency
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-0.5 text-white",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { size: 11 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[10px] font-extrabold tabular-nums",
														children: h.streak
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: `w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${isDone ? "bg-white text-orange-600" : "bg-white/20 text-white/40"}`,
													children: isDone ? "✓" : ""
												})
											]
										}, h.id);
									}), habits.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-center py-8",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, {
												size: 28,
												className: "mx-auto text-white/60 mb-2"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[11px] text-white/80 mb-2",
												children: "Build a streak"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setActiveSection("habits"),
												className: "text-[11px] text-white font-bold hover:underline",
												children: "Start →"
											})
										]
									})]
								})]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					...fu(15),
					className: "zen-card enterprise-card relative rounded-[28px] p-6 sm:p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
							title: "Portfolio SEO pulse",
							sub: `${seoEvidenceSiteIds.size}/${websites.length} sites have observations · ${seoOpenIssues.length} open issues · ${seoOpenActions.length} open actions`,
							onAction: () => setActiveSection("seo"),
							actionLabel: "Open control center"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
							children: [
								{
									label: "Evidence coverage",
									value: `${seoEvidenceSiteIds.size}/${websites.length}`,
									detail: "Sites with imported snapshots",
									tone: "sky"
								},
								{
									label: "Connected profiles",
									value: `${seoConnectedProfiles}`,
									detail: "Profiles marked connected",
									tone: "emerald"
								},
								{
									label: "Open issues",
									value: `${seoOpenIssues.length}`,
									detail: "Needs triage or validation",
									tone: "rose"
								},
								{
									label: "Next actions",
									value: `${seoOpenActions.length}`,
									detail: "Bounded work in queue",
									tone: "amber"
								}
							].map((metric) => {
								const h = HUES[metric.tone];
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setActiveSection("seo"),
									className: "rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left transition hover:border-primary/25 hover:bg-secondary/50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-2xl font-extrabold tabular-nums",
											style: { color: h.ink },
											children: metric.value
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-1 text-[11px] font-bold text-foreground",
											children: metric.label
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-1 text-[10px] text-muted-foreground",
											children: metric.detail
										})
									]
								}, metric.label);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-border/60 bg-secondary/20 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-3 flex items-center gap-2 text-xs font-bold text-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, {
										size: 14,
										className: "text-primary"
									}), " Highest-priority next actions"]
								}), seoNextActions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] leading-5 text-muted-foreground",
									children: "No actions have been approved yet. Open the control center to import evidence or define the next bounded test."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2",
									children: seoNextActions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setActiveSection("seo"),
										className: "flex w-full items-center gap-2 rounded-xl bg-background/50 p-2.5 text-left transition hover:bg-background",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2 w-2 rounded-full ${action.priority === "critical" ? "bg-rose-500" : action.priority === "high" ? "bg-amber-500" : "bg-sky-500"}` }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground",
												children: action.title
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
												size: 12,
												className: "shrink-0 text-muted-foreground"
											})
										]
									}, action.id))
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-border/60 bg-secondary/20 p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-3 flex items-center gap-2 text-xs font-bold text-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, {
											size: 14,
											className: "text-emerald-500"
										}), " Evidence discipline"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] leading-5 text-muted-foreground",
										children: "The pulse never invents clicks, rankings, traffic, or AI citations. It shows what is actually observed, what is stale, and what still needs a connector or verified import."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setActiveSection("seo"),
										className: "mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline",
										children: ["Review data health ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { size: 12 })]
									})
								]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 lg:grid-cols-12 gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							...fu(16),
							className: "lg:col-span-4 zen-card enterprise-card relative rounded-[28px] p-6 sm:p-7",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
								title: "Top ideas",
								sub: "Voted by team",
								onAction: () => setActiveSection("ideas")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [topIdeas.map((idea, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									...fu(i),
									onClick: () => setActiveSection("ideas"),
									className: "w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-border/60 hover:border-primary/30 hover:bg-secondary/40 transition",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold tabular-nums text-[13px] flex-shrink-0",
											style: {
												background: HUES.violet.soft,
												color: HUES.violet.ink
											},
											children: idea.votes
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[13px] font-semibold text-foreground truncate",
												children: idea.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-muted-foreground",
												children: idea.category
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] px-2 py-0.5 rounded-full font-bold capitalize",
											style: {
												background: idea.status === "validated" ? HUES.emerald.soft : HUES.sky.soft,
												color: idea.status === "validated" ? HUES.emerald.ink : HUES.sky.ink
											},
											children: idea.status
										})
									]
								}, idea.id)), topIdeas.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-center py-10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbulb, {
										size: 28,
										className: "mx-auto text-muted-foreground/40 mb-2"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[12px] text-muted-foreground",
										children: "No ideas yet"
									})]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							...fu(17),
							className: "lg:col-span-4 zen-card enterprise-card relative rounded-[28px] p-6 sm:p-7",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
								title: "Pinned notes",
								sub: `${pinnedNotes.length} pinned`,
								onAction: () => setActiveSection("notes")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2.5",
								children: [pinnedNotes.map((n, i) => {
									const h = HUES[[
										"violet",
										"amber",
										"sky",
										"emerald"
									][i % 4]];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setActiveSection("notes"),
										...fu(i),
										className: "w-full text-left p-4 rounded-2xl border transition hover:shadow-md",
										style: {
											background: h.soft,
											borderColor: h.soft
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 mb-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "w-2 h-2 rounded-full",
												style: { background: h.grad }
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[13px] font-bold truncate",
												style: { color: h.ink },
												children: n.title
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-muted-foreground line-clamp-2 leading-relaxed",
											children: n.content.slice(0, 100)
										})]
									}, n.id);
								}), pinnedNotes.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-center py-10",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
											size: 28,
											className: "mx-auto text-muted-foreground/40 mb-2"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[12px] text-muted-foreground mb-2",
											children: "No pinned notes"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setActiveSection("notes"),
											className: "text-[12px] text-primary font-bold hover:underline",
											children: "Create one →"
										})
									]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							...fu(18),
							className: "lg:col-span-4 zen-card enterprise-card relative rounded-[28px] p-6 sm:p-7",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
								title: "Platforms",
								sub: "System status",
								onAction: () => setActiveSection("cloudflare"),
								actionLabel: "Manage"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2",
								children: [
									{
										name: "Cloudflare",
										Icon: Cloud,
										hue: "amber",
										s: "cloudflare",
										up: "99.9%"
									},
									{
										name: "Vercel",
										Icon: Rocket,
										hue: "ink",
										s: "vercel",
										up: "99.8%"
									},
									{
										name: "GitHub",
										Icon: Github,
										hue: "violet",
										s: "github",
										up: "99.9%"
									},
									{
										name: "OpenClaw",
										Icon: Bug,
										hue: "emerald",
										s: "openclaw",
										up: "100%"
									},
									{
										name: "Websites",
										Icon: Globe,
										hue: "sky",
										s: "websites",
										up: `${websites.filter((w) => w.status === "active").length} live`
									}
								].map((p) => {
									const h = HUES[p.hue];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setActiveSection(p.s),
										className: "w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-10 h-10 rounded-2xl flex items-center justify-center",
												style: {
													background: h.soft,
													color: h.ink
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(p.Icon, { size: 16 })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex-1 text-left",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[13px] font-semibold text-foreground",
													children: p.name
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500" }), " Operational"]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] font-mono tabular-nums text-muted-foreground",
												children: p.up
											})
										]
									}, p.name);
								})
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskQuickEditor, {
					task: editingTask,
					onClose: () => setEditingTaskId(null)
				})
			] })
		]
	});
});
//#endregion
export { InsightsPanel as default };
