import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { Q as useUpdateItem, Y as useTasks } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as daysOverdue, l as todayISO } from "./overdue-CpArWbx3.mjs";
import { Cn as CircleCheck, H as RotateCcw, Q as Play, Xt as Flame, k as SkipForward, m as TreePine, pn as Coffee, rt as Pause, t as Zap, y as Target } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { m as useNavigationStore } from "./routes-qm6I9RAb.mjs";
import { i as daysSinceTouch, o as isOpen } from "./triage-Q9v9lxCb.mjs";
import { n as scoreItem } from "./priorityEngine-CLGg7F_y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/FocusPage-RB85XrcY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PRESETS = [
	{
		label: "Focus",
		minutes: 25,
		icon: Zap,
		emoji: "🍅",
		gradient: "from-primary to-accent"
	},
	{
		label: "Short Break",
		minutes: 5,
		icon: Coffee,
		emoji: "☕",
		gradient: "from-emerald-500 to-teal-500"
	},
	{
		label: "Long Break",
		minutes: 15,
		icon: TreePine,
		emoji: "🌿",
		gradient: "from-blue-500 to-indigo-500"
	}
];
function FocusPage() {
	const handoffId = useNavigationStore((s) => s.focusTaskId);
	const setFocusTaskId = useNavigationStore((s) => s.setFocusTaskId);
	const [preset, setPreset] = (0, import_react.useState)(0);
	const [totalSec, setTotalSec] = (0, import_react.useState)(PRESETS[0].minutes * 60);
	const [remaining, setRemaining] = (0, import_react.useState)(PRESETS[0].minutes * 60);
	const [running, setRunning] = (0, import_react.useState)(false);
	const [sessions, setSessions] = (0, import_react.useState)(0);
	const [lockedId, setLockedId] = (0, import_react.useState)(handoffId);
	const intervalRef = (0, import_react.useRef)(void 0);
	(0, import_react.useEffect)(() => {
		if (handoffId) {
			setLockedId(handoffId);
			setFocusTaskId(null);
		}
	}, [handoffId, setFocusTaskId]);
	const tasks = useTasks();
	const updateItem = useUpdateItem();
	const today = todayISO();
	const candidates = (0, import_react.useMemo)(() => {
		return tasks.filter(isOpen).map((t) => ({
			task: t,
			scored: scoreItem({
				priority: t.priority,
				overdueDays: daysOverdue(t, today),
				staleDays: daysSinceTouch(t, today),
				due: t.dueDate,
				today,
				kind: "task",
				pinned: t.committedOn === today
			})
		})).sort((a, b) => b.scored.score - a.scored.score).slice(0, 12);
	}, [tasks, today]);
	const locked = tasks.find((t) => t.id === lockedId) || null;
	const completeLocked = async () => {
		if (!locked) return;
		await updateItem("tasks", locked.id, {
			status: "done",
			completedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		toast.success(`"${locked.title}" done ✓`);
		setLockedId(null);
		setRunning(false);
	};
	const toggleRunning = () => {
		if (!running && preset === 0 && !locked) {
			toast.error("Pick the one task you are working on first");
			return;
		}
		setRunning((r) => !r);
	};
	(0, import_react.useEffect)(() => {
		if (running && remaining > 0) intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1e3);
		else {
			clearInterval(intervalRef.current);
			if (remaining === 0 && running) {
				setRunning(false);
				if (preset === 0) setSessions((s) => s + 1);
				if (preset === 0) {
					const nextPreset = sessions > 0 && (sessions + 1) % 4 === 0 ? 2 : 1;
					setPreset(nextPreset);
					setTotalSec(PRESETS[nextPreset].minutes * 60);
					setRemaining(PRESETS[nextPreset].minutes * 60);
				}
			}
		}
		return () => clearInterval(intervalRef.current);
	}, [
		running,
		remaining,
		preset,
		sessions
	]);
	const selectPreset = (i) => {
		setPreset(i);
		setTotalSec(PRESETS[i].minutes * 60);
		setRemaining(PRESETS[i].minutes * 60);
		setRunning(false);
	};
	const reset = () => {
		setRemaining(totalSec);
		setRunning(false);
	};
	const skip = () => {
		setRunning(false);
		if (preset === 0) setSessions((s) => s + 1);
		selectPreset(preset === 0 ? 1 : 0);
	};
	const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
	const ss = String(remaining % 60).padStart(2, "0");
	const pct = totalSec > 0 ? (totalSec - remaining) / totalSec * 100 : 0;
	const r = 90;
	const circumference = 2 * Math.PI * r;
	circumference - pct / 100 * circumference;
	const currentPreset = PRESETS[preset];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center justify-center min-h-[70vh] gap-6 sm:gap-8 px-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, {
						size: 22,
						className: "text-primary"
					}), "Focus Timer"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground/60 mt-1",
					children: [
						"Session #",
						sessions + 1,
						" · ",
						sessions,
						" completed today"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "w-full max-w-xl rounded-2xl border border-border/30 bg-card p-4 shadow-[var(--shadow-sm)]",
				children: locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, {
							size: 16,
							className: "text-primary shrink-0"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate text-sm font-semibold text-foreground",
							children: locked.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: completeLocked,
							className: "flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-500 transition hover:bg-emerald-500/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 12 }), " Done"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setLockedId(null);
								setRunning(false);
							},
							className: "rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground",
							children: "Unlock"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, {
						size: 14,
						className: "text-primary"
					}), " Lock the session to one task"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex max-h-40 flex-col gap-1.5 overflow-y-auto",
					children: [candidates.map(({ task: t, scored }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setLockedId(t.id),
						className: "flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2 text-left transition hover:bg-secondary",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 flex-1 truncate text-[13px] text-foreground",
								children: t.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "shrink-0 text-[10px] text-muted-foreground/80",
								children: [scored.dimensions.find((d) => d.name === "pinned") ? "📌 " : "", scored.score]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "shrink-0 text-[10px] uppercase text-muted-foreground",
								children: t.priority
							})
						]
					}, t.id)), !candidates.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-3 text-center text-xs text-muted-foreground",
						children: "No open tasks — nothing to focus on. 🎉"
					})]
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 p-1.5 rounded-2xl bg-secondary/50 border border-border/20",
				children: PRESETS.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => selectPreset(i),
					className: `relative px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation
              ${preset === i ? "bg-card text-foreground shadow-[var(--shadow-md)]" : "text-muted-foreground hover:text-foreground"}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative z-10 flex items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.emoji }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: p.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "sm:hidden",
								children: [p.minutes, "m"]
							})
						]
					})
				}, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [
					running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-0 rounded-full",
						style: {
							background: `radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)`,
							transform: "scale(1.3)"
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "260",
						height: "260",
						viewBox: "0 0 200 200",
						className: "drop-shadow-lg",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "100",
								cy: "100",
								r,
								fill: "none",
								stroke: "hsl(var(--muted) / 0.5)",
								strokeWidth: "6"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "100",
								cy: "100",
								r,
								fill: "none",
								stroke: "hsl(var(--primary))",
								strokeWidth: "7",
								strokeLinecap: "round",
								strokeDasharray: circumference,
								transform: "rotate(-90 100 100)",
								style: { filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.3))" }
							}),
							pct > 0 && pct < 100 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: 100 + r * Math.cos(pct / 100 * 2 * Math.PI - Math.PI / 2),
								cy: 100 + r * Math.sin(pct / 100 * 2 * Math.PI - Math.PI / 2),
								r: "5",
								fill: "hsl(var(--primary))",
								style: { filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" }
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute inset-0 flex flex-col items-center justify-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[56px] sm:text-[64px] font-extrabold text-foreground tracking-tighter tabular-nums leading-none",
							style: { fontFamily: "var(--font-mono)" },
							children: [
								mm,
								":",
								ss
							]
						}, `${mm}:${ss}`), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs sm:text-sm text-muted-foreground/50 font-medium mt-2 flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: currentPreset.emoji }), currentPreset.label]
						})]
					})
				]
			}, preset),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: reset,
						className: "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/60 border border-border/30 text-muted-foreground flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all touch-manipulation",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 20 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: toggleRunning,
						className: "w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] gradient-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-primary)] hover:shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.5)] transition-all touch-manipulation",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { size: 28 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
							size: 28,
							className: "ml-1"
						}) }, running ? "pause" : "play") })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: skip,
						className: "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/60 border border-border/30 text-muted-foreground flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all touch-manipulation",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, { size: 20 })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-6 px-6 py-4 rounded-2xl bg-card border border-border/30 shadow-[var(--shadow-sm)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-foreground tabular-nums",
							children: sessions
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-muted-foreground/50 font-medium mt-0.5",
							children: "Sessions"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-px h-8 bg-border/30" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-foreground tabular-nums",
							children: sessions * 25
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-muted-foreground/50 font-medium mt-0.5",
							children: "Minutes"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-px h-8 bg-border/30" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-2xl font-bold text-primary tabular-nums flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { size: 16 }), sessions]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-muted-foreground/50 font-medium mt-0.5",
							children: "Streak"
						})]
					})
				]
			})
		]
	});
}
//#endregion
export { FocusPage as default };
