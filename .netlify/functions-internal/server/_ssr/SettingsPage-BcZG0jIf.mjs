import { i as __toESM } from "../_runtime.mjs";
import { _ as refreshSupabaseSchemaState, b as testSupabaseConnection, c as getLastSyncTime, d as getSupabaseSyncDiagnostics, h as pullFromSupabase, m as onSyncComplete, n as clearSupabaseConfig, p as isSupabaseConnected, s as fullSync, t as SUPABASE_SCHEMA_SQL, u as getSupabaseConfig, v as setSupabaseConfig } from "./supabase-D3pMiuZg.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as useImportAllData, Z as useUpdateData, j as useExportAllData, v as useAudienceAccounts } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { A as Shield, Cn as CircleCheck, Dt as Leaf, G as RefreshCw, H as RotateCcw, I as ServerCrash, Kn as ArrowDown, Mn as Calendar, Mt as KeyRound, Nt as Info, On as Check, Tn as ChevronRight, Un as ArrowUpDown, Z as Plug, Zn as Accessibility, at as Palette, cn as Database, ct as Moon, d as TriangleAlert, dn as Contrast, h as Trash2, hn as Cloud, jt as Key, l as Type, lt as Monitor, o as User, on as Download, rn as ExternalLink, s as Upload, st as MousePointerClick, t as Zap, un as Copy, v as Terminal, vn as Clock3, wt as Link2, x as Sun, xn as CircleX, yt as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as hasGoogleClientId, E as usePlanStore, a as useA11yStore, h as useSettingsStore, m as useNavigationStore, s as GoogleSetupModal } from "./routes-qm6I9RAb.mjs";
import { t as useGoogleCalendar } from "./useGoogleCalendar-Bhv1HlZF.mjs";
import { a as setEncryptionKey, i as hasCustomEncryptionKey, r as generateStrongKey } from "./encryption-BGmZWQtj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/SettingsPage-BcZG0jIf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatTime(value) {
	if (!value) return "Never";
	return new Date(value).toLocaleString();
}
var SupabaseSyncConsole = (0, import_react.forwardRef)(function SupabaseSyncConsole(_props, ref) {
	const [diagnostics, setDiagnostics] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const refresh = async () => {
		setLoading(true);
		try {
			setDiagnostics(await getSupabaseSyncDiagnostics());
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		refresh();
		const interval = window.setInterval(refresh, 6e4);
		const unsubscribe = onSyncComplete(() => void refresh());
		window.addEventListener("online", refresh);
		window.addEventListener("offline", refresh);
		return () => {
			window.clearInterval(interval);
			unsubscribe();
			window.removeEventListener("online", refresh);
			window.removeEventListener("offline", refresh);
		};
	}, []);
	const schemaSummary = (0, import_react.useMemo)(() => {
		if (!diagnostics) return {
			available: 0,
			missing: 0
		};
		const values = Object.values(diagnostics.availableTables);
		return {
			available: values.filter(Boolean).length,
			missing: values.filter((value) => !value).length
		};
	}, [diagnostics]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		ref,
		className: "border border-border/40 bg-card/70 p-4 sm:p-5 space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "text-base font-semibold text-foreground flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, {
						size: 18,
						className: "text-primary"
					}), " Supabase sync status console"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground mt-1",
					children: "Schema diagnostics, queue depth, and last sync signal."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => void refresh(),
					className: "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-60",
					disabled: loading,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
						size: 14,
						className: loading ? "animate-spin" : ""
					}), " Refresh"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border border-border/30 bg-background/40 p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] uppercase tracking-wide text-muted-foreground",
							children: "Last sync"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 flex items-center gap-2 text-sm font-medium text-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock3, { size: 14 }),
								" ",
								formatTime(diagnostics?.lastSyncAt ?? null)
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border border-border/30 bg-background/40 p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] uppercase tracking-wide text-muted-foreground",
							children: "Queued changes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 text-sm font-medium text-foreground",
							children: [diagnostics?.queuedChanges ?? "—", " local records"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border border-border/30 bg-background/40 p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] uppercase tracking-wide text-muted-foreground",
							children: "Schema health"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 flex items-center gap-2 text-sm font-medium text-foreground",
							children: [
								schemaSummary.missing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
									size: 14,
									className: "text-destructive"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
									size: 14,
									className: "text-success"
								}),
								schemaSummary.available,
								"/",
								schemaSummary.available + schemaSummary.missing || 0,
								" tables available"
							]
						})]
					})
				]
			}),
			diagnostics && !diagnostics.schemaReady && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 font-medium text-destructive",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 14 }),
						" ",
						diagnostics.schemaErrors.some((error) => error.table === "connection") ? "Sync is blocked because the cloud connection is failing." : "Sync is blocked until the Supabase schema is created."
					]
				}), diagnostics.schemaErrors.some((error) => error.table === "connection") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2",
					children: "Reconnect with a valid project URL + anon key, or disconnect cloud sync to keep this device local-only."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2",
					children: [
						"Missing tables:",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-foreground",
							children: diagnostics.missingTables.join(", ")
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 text-xs font-medium text-muted-foreground",
					children: [diagnostics?.schemaErrors.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServerCrash, {
						size: 14,
						className: "text-destructive"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
						size: 14,
						className: "text-success"
					}), "Exact schema-level errors"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-h-56 overflow-auto border border-border/30 bg-background/50",
					children: diagnostics?.schemaErrors.length ? diagnostics.schemaErrors.map((error) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b border-border/20 p-3 text-xs last:border-b-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-mono text-foreground",
								children: [
									error.table,
									" · ",
									error.code || "UNKNOWN"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 text-destructive",
								children: error.message
							}),
							(error.details || error.hint) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 text-muted-foreground",
								children: error.details || error.hint
							})
						]
					}, `${error.table}-${error.checkedAt}`)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-3 text-xs text-muted-foreground",
						children: "No schema errors detected."
					})
				})]
			})
		]
	});
});
function Row({ icon: Icon, title, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border/60 last:border-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3 min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					size: 16,
					className: "text-primary"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-foreground",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: hint
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "shrink-0",
			children
		})]
	});
}
function Toggle({ checked, onChange, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "switch",
		"aria-checked": checked,
		"aria-label": label,
		onClick: () => onChange(!checked),
		className: `relative w-14 h-8 min-h-11 min-w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary"}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-1 left-1 w-6 h-6 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-6" : ""}` })
	});
}
var SCALES = [
	{
		v: 1,
		label: "100%"
	},
	{
		v: 1.125,
		label: "112%"
	},
	{
		v: 1.25,
		label: "125%"
	},
	{
		v: 1.4,
		label: "140%"
	}
];
var MOTIONS = [
	{
		v: "system",
		label: "System"
	},
	{
		v: "reduced",
		label: "Reduced"
	},
	{
		v: "full",
		label: "Full"
	}
];
function AccessibilityPanel() {
	const a11y = useA11yStore();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "card-elevated p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3 mb-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "font-semibold text-lg flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Accessibility, {
							size: 18,
							className: "text-primary"
						}), " Accessibility & inclusivity"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: a11y.reset,
						className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 13 }), " Reset"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground mb-2",
					children: "These preferences apply to every page and are saved on this device."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					icon: Contrast,
					title: "High contrast mode",
					hint: "Stronger borders, deeper text contrast, less transparency.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						checked: a11y.highContrast,
						onChange: (v) => a11y.set({ highContrast: v }),
						label: "High contrast mode"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					icon: Type,
					title: "Text size",
					hint: "Scales the whole interface, not just body copy.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-1.5 flex-wrap",
						children: SCALES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => a11y.set({ fontScale: s.v }),
							"aria-pressed": a11y.fontScale === s.v,
							className: `px-3 py-2 min-h-11 rounded-xl text-xs font-semibold transition-colors ${a11y.fontScale === s.v ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`,
							children: s.label
						}, s.v))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					icon: Zap,
					title: "Motion",
					hint: "Reduce animations and transitions for vestibular comfort.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-1.5 flex-wrap",
						children: MOTIONS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => a11y.set({ motion: m.v }),
							"aria-pressed": a11y.motion === m.v,
							className: `px-3 py-2 min-h-11 rounded-xl text-xs font-semibold transition-colors ${a11y.motion === m.v ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`,
							children: m.label
						}, m.v))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					icon: MousePointerClick,
					title: "Always show focus outlines",
					hint: "Keyboard-friendly navigation — visible rings on mouse and keyboard alike.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						checked: a11y.alwaysShowFocus,
						onChange: (v) => a11y.set({ alwaysShowFocus: v }),
						label: "Always show focus outlines"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					icon: Link2,
					title: "Underline links",
					hint: "Never rely on colour alone to identify a link.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						checked: a11y.underlineLinks,
						onChange: (v) => a11y.set({ underlineLinks: v }),
						label: "Underline links"
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "card-elevated p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-semibold text-sm mb-2",
				children: "Keyboard shortcuts"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "text-xs text-muted-foreground space-y-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: "px-1.5 py-0.5 rounded bg-secondary text-foreground",
						children: "Tab"
					}), " — move focus. A “Skip to content” link appears first on every page."] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: "px-1.5 py-0.5 rounded bg-secondary text-foreground",
						children: "Ctrl/⌘ + K"
					}), " — command palette, jump to any section."] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: "px-1.5 py-0.5 rounded bg-secondary text-foreground",
						children: "Esc"
					}), " — close any dialog or menu."] })
				]
			})]
		})]
	});
}
var inputCls = "rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60";
function PlanningSettings() {
	const { workdayStart, workdayEnd, personalAsBusy, setWorkday, setPersonalAsBusy } = usePlanStore();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card-elevated space-y-4 p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-bold text-foreground",
				children: "Planning"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-muted-foreground",
				children: "Your workday sets the capacity check on Today. Personal items can be mirrored to the calendar as an opaque “Busy” slot — availability without titles or notes."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 sm:max-w-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[10px] text-muted-foreground",
					children: ["Workday starts", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "time",
						value: workdayStart,
						onChange: (e) => setWorkday(e.target.value, workdayEnd),
						className: `mt-1 w-full ${inputCls}`
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[10px] text-muted-foreground",
					children: ["Workday ends", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "time",
						value: workdayEnd,
						onChange: (e) => setWorkday(workdayStart, e.target.value),
						className: `mt-1 w-full ${inputCls}`
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-2 text-xs text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: personalAsBusy,
					onChange: (e) => setPersonalAsBusy(e.target.checked),
					className: "h-4 w-4 accent-primary"
				}), "Mirror personal tasks to Google Calendar as “Busy” (no title, no notes)"]
			})
		]
	});
}
var PLATFORMS = [
	{
		id: "youtube",
		label: "YouTube",
		hint: "Public channel metrics are read automatically on every refresh."
	},
	{
		id: "x",
		label: "X (Twitter)",
		hint: "Public profile metrics are read on refresh; some profiles hide counts."
	},
	{
		id: "instagram",
		label: "Instagram",
		hint: "Public profile metrics are read on refresh; login-walled profiles stay blank."
	},
	{
		id: "facebook",
		label: "Facebook",
		hint: "Public pages only."
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		hint: "Public company pages only."
	},
	{
		id: "tiktok",
		label: "TikTok",
		hint: "Public profiles only."
	}
];
function ConnectionsPanel() {
	const accounts = useAudienceAccounts();
	const setActiveSection = useNavigationStore((s) => s.setActiveSection);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "card-elevated p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "font-semibold text-lg flex items-center gap-2 mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plug, {
						size: 18,
						className: "text-primary"
					}), " Connections"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground mb-4",
					children: "Audience tracking runs on public profile data — no API keys required. Add a profile URL and Mission Control reads follower counts on every refresh. Readings that a platform hides stay blank instead of showing a false zero."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: PLATFORMS.map((p) => {
						const tracked = accounts.filter((a) => a.platform === p.id).length;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-semibold text-foreground",
									children: p.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: p.hint
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${tracked ? "bg-emerald-500/15 text-emerald-600" : "bg-secondary text-muted-foreground"}`,
								children: tracked ? `${tracked} tracked` : "Not tracked"
							})]
						}, p.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setActiveSection("audience"),
					className: "mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground",
					children: ["Manage tracked profiles ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 13 })]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "card-elevated p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				className: "font-semibold text-sm flex items-center gap-2 mb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, {
					size: 15,
					className: "text-primary"
				}), " Google Calendar"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Task sync with Google Calendar is configured in the Google Calendar tab."
			})]
		})]
	});
}
var tabs = [
	{
		id: "profile",
		label: "Profile",
		icon: User
	},
	{
		id: "appearance",
		label: "Appearance",
		icon: Palette
	},
	{
		id: "accessibility",
		label: "Accessibility",
		icon: Accessibility
	},
	{
		id: "connections",
		label: "Connections",
		icon: Plug
	},
	{
		id: "google-calendar",
		label: "Google Calendar",
		icon: Calendar
	},
	{
		id: "security",
		label: "Security",
		icon: Shield
	},
	{
		id: "data",
		label: "Data",
		icon: Database
	},
	{
		id: "about",
		label: "About",
		icon: Info
	}
];
var themes = [
	{
		id: "sage",
		label: "Sage",
		icon: Leaf
	},
	{
		id: "light",
		label: "Light",
		icon: Sun
	},
	{
		id: "dark",
		label: "Dark",
		icon: Moon
	},
	{
		id: "system",
		label: "System",
		icon: Monitor
	}
];
var CopyButton = (0, import_react.forwardRef)(function CopyButton({ text }, ref) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	const copy = () => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2e3);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		ref,
		onClick: copy,
		className: "p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
		children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
			size: 13,
			className: "text-emerald-500"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 13 })
	});
});
function SettingsPage() {
	const { userName, userRole, theme, setTheme, toggleTheme } = useSettingsStore();
	const updateData = useUpdateData();
	const exportAllData = useExportAllData();
	const importAllData = useImportAllData();
	const [activeTab, setActiveTab] = (0, import_react.useState)("profile");
	const [name, setName] = (0, import_react.useState)(userName);
	const [role, setRole] = (0, import_react.useState)(userRole);
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)("");
	const importRef = (0, import_react.useRef)(null);
	const gcal = useGoogleCalendar({ autoFetch: false });
	const [googleSetupOpen, setGoogleSetupOpen] = (0, import_react.useState)(false);
	const [sbUrl, setSbUrl] = (0, import_react.useState)(getSupabaseConfig()?.url || "");
	const [sbKey, setSbKey] = (0, import_react.useState)(getSupabaseConfig()?.anonKey || "");
	const [sbConnected, setSbConnected] = (0, import_react.useState)(isSupabaseConnected());
	const [sbTesting, setSbTesting] = (0, import_react.useState)(false);
	const [sbTestResult, setSbTestResult] = (0, import_react.useState)(null);
	const [sbSyncing, setSbSyncing] = (0, import_react.useState)(null);
	const [sbLastSync, setSbLastSync] = (0, import_react.useState)(null);
	const [showSchema, setShowSchema] = (0, import_react.useState)(false);
	const [sbSchemaReady, setSbSchemaReady] = (0, import_react.useState)(false);
	const [sbConnectionOk, setSbConnectionOk] = (0, import_react.useState)(false);
	const [encKey, setEncKey] = (0, import_react.useState)("");
	const [showEncKey, setShowEncKey] = (0, import_react.useState)(false);
	const [hasCustomKey, setHasCustomKey] = (0, import_react.useState)(hasCustomEncryptionKey());
	const refreshSchemaStatus = async () => {
		refreshSupabaseSchemaState();
		const result = await testSupabaseConnection(sbUrl, sbKey);
		setSbConnectionOk(result.connectionOk);
		setSbSchemaReady(result.schemaReady);
		return result;
	};
	(0, import_react.useEffect)(() => {
		if (sbConnected) {
			getLastSyncTime().then(setSbLastSync);
			refreshSchemaStatus().catch(() => setSbSchemaReady(false));
		}
	}, [sbConnected]);
	(0, import_react.useEffect)(() => {
		setName(userName);
	}, [userName]);
	(0, import_react.useEffect)(() => {
		setRole(userRole);
	}, [userRole]);
	const saveName = () => updateData({
		userName: name,
		userRole: role
	});
	const handleExport = async () => {
		try {
			const data = await exportAllData();
			const totalItems = JSON.parse(data)._meta?.totalItems || "all";
			const blob = new Blob([data], { type: "application/json" });
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = `mission-control-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
			a.click();
			URL.revokeObjectURL(a.href);
			toast.success(`Backup downloaded — ${totalItems} items across all tables`);
		} catch (e) {
			toast.error("Export failed. Please try again.");
		}
	};
	const handleImport = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async (ev) => {
			try {
				const json = ev.target?.result;
				const parsed = JSON.parse(json);
				if (![
					"websites",
					"tasks",
					"repos",
					"links",
					"notes"
				].some((k) => Array.isArray(parsed[k]))) {
					toast.error("This doesn't look like a Mission Control backup file.");
					return;
				}
				await importAllData(json);
				if (isSupabaseConnected()) {
					toast.info("Syncing imported data to cloud…");
					const result = await fullSync();
					if (result.success) toast.success(`Import complete — pushed ${result.pushed} items to cloud`);
					else toast.warning("Imported locally but cloud sync failed. Will retry automatically.");
				} else toast.success("Backup imported successfully");
				setTimeout(() => window.location.reload(), 1200);
			} catch (err) {
				toast.error("Invalid file or import failed. Make sure it's a valid JSON backup.");
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};
	const handleClearAll = async () => {
		if (confirmDelete !== "DELETE") return;
		localStorage.clear();
		const req = indexedDB.deleteDatabase("MissionControlDB");
		req.onsuccess = () => {
			window.location.reload();
		};
		toast.success("All data cleared");
	};
	const handleTestConnection = async () => {
		if (!sbUrl || !sbKey) {
			toast.error("Enter URL and anon key first");
			return;
		}
		setSbTesting(true);
		setSbTestResult(null);
		const result = await refreshSchemaStatus();
		setSbTestResult({
			ok: result.ok,
			msg: result.ok ? "Supabase connected and schema is ready." : result.error || "Connection failed"
		});
		setSbTesting(false);
	};
	const handleSaveSupabase = () => {
		if (!sbUrl || !sbKey) {
			toast.error("Both URL and anon key are required");
			return;
		}
		setSupabaseConfig(sbUrl, sbKey);
		setSbConnected(true);
		setSbConnectionOk(false);
		setSbSchemaReady(false);
		toast.success("Supabase connection saved — testing schema now");
		refreshSchemaStatus().catch(() => setSbSchemaReady(false));
	};
	const handleDisconnectSupabase = () => {
		clearSupabaseConfig();
		setSbConnected(false);
		setSbConnectionOk(false);
		setSbSchemaReady(false);
		setSbLastSync(null);
		setSbTestResult(null);
		toast.info("Supabase disconnected");
	};
	const handleSyncNow = async () => {
		setSbSyncing("sync");
		refreshSupabaseSchemaState();
		const result = await fullSync();
		setSbSyncing(null);
		if (result.success) {
			toast.success(`✅ Synced ${result.pushed} pushed + ${result.pulled} pulled`);
			setSbLastSync((/* @__PURE__ */ new Date()).toISOString());
			return;
		}
		toast.error(`Sync failed: ${result.error}`);
	};
	const handleRefreshFromCloud = async () => {
		setSbSyncing("refresh");
		refreshSupabaseSchemaState();
		const result = await pullFromSupabase();
		setSbSyncing(null);
		if (result.success) {
			toast.success(`✅ Refreshed ${result.added} new + ${result.updated} updated items from cloud`);
			setSbLastSync((/* @__PURE__ */ new Date()).toISOString());
			return;
		}
		toast.error(`Refresh failed: ${result.error}`);
	};
	const handleGenerateEncKey = () => {
		const key = generateStrongKey();
		setEncKey(key);
	};
	const handleSaveEncKey = () => {
		if (!encKey.trim()) {
			toast.error("Enter an encryption key");
			return;
		}
		setEncryptionKey(encKey.trim());
		setHasCustomKey(true);
		toast.success("Encryption key saved");
	};
	const fadeIn = {
		initial: {
			opacity: 0,
			y: 8
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: { duration: .25 }
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5 max-w-4xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-xl sm:text-2xl font-bold text-foreground",
			children: "Settings"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
			children: "Manage your Mission Control preferences, sync, and security"
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col lg:flex-row gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:w-52 flex lg:flex-col gap-1 overflow-x-auto hide-scrollbar pb-1 lg:pb-0",
				children: tabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setActiveTab(tab.id),
					className: `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap lg:w-full text-left flex-shrink-0
                ${activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(tab.icon, { size: 15 }),
						tab.label,
						activeTab === tab.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
							size: 13,
							className: "ml-auto opacity-60"
						})
					]
				}, tab.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 space-y-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					activeTab === "profile" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						...fadeIn,
						className: "space-y-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-elevated p-6 space-y-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-semibold text-lg",
								children: "Profile"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg shrink-0",
									children: name.charAt(0).toUpperCase()
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex-1 space-y-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-semibold text-muted-foreground mb-1.5 block",
										children: "Display Name"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: name,
										onChange: (e) => setName(e.target.value),
										onBlur: saveName,
										className: "input-base",
										placeholder: "Your name"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-semibold text-muted-foreground mb-1.5 block",
										children: "Role / Title"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: role,
										onChange: (e) => setRole(e.target.value),
										onBlur: saveName,
										className: "input-base",
										placeholder: "Digital Creator & Developer"
									})] })]
								})]
							})]
						})
					}, "profile"),
					activeTab === "appearance" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						...fadeIn,
						className: "space-y-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-elevated p-6 space-y-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-semibold text-lg",
								children: "Appearance"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-semibold text-muted-foreground mb-3 block",
								children: "Theme"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex gap-2",
								children: themes.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setTheme(t.id),
									className: `flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${theme === t.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(t.icon, { size: 17 }), t.label]
								}, t.id))
							})] })]
						})
					}, "appearance"),
					activeTab === "accessibility" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						...fadeIn,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessibilityPanel, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanningSettings, {})
						})]
					}, "accessibility"),
					activeTab === "connections" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						...fadeIn,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionsPanel, {})
					}, "connections"),
					activeTab === "google-calendar" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						...fadeIn,
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `rounded-2xl border p-4 flex items-center gap-3 ${gcal.connected ? "bg-emerald-500/5 border-emerald-500/20" : "bg-blue-500/5 border-blue-500/20"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${gcal.connected ? "bg-emerald-500/15" : "bg-blue-500/15"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png",
											alt: "",
											className: "w-6 h-6"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `text-sm font-semibold ${gcal.connected ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`,
												children: gcal.connected ? "🟢 Google Calendar Connected" : "⚡ Google Calendar Not Connected"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-muted-foreground mt-0.5",
												children: gcal.connected ? gcal.email ? `Signed in as ${gcal.email}` : "Connected — events are syncing" : "Connect your Google Calendar to see all your events in Mission Control"
											}),
											gcal.lastSync && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[10px] text-muted-foreground mt-0.5",
												children: ["Last sync: ", new Date(gcal.lastSync).toLocaleString()]
											})
										]
									}),
									gcal.connected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => gcal.syncEvents(true),
										disabled: gcal.syncing,
										className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors shrink-0",
										children: [gcal.syncing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
											size: 12,
											className: "animate-spin"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 12 }), "Sync Now"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-elevated p-6 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "font-semibold text-lg",
											children: "Connection"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => setGoogleSetupOpen(true),
											className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { size: 12 }), " Client ID setup"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20",
										children: [gcal.connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
											size: 18,
											className: "text-emerald-500 shrink-0 mt-0.5"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, {
											size: 18,
											className: "text-destructive shrink-0 mt-0.5"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0 space-y-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-sm font-semibold text-foreground",
													children: gcal.connected ? "Connected to your Google account" : "Google Calendar not connected"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-xs text-muted-foreground",
													children: gcal.connected ? "This app uses your own Google sign-in, so it can load the same calendars you see in Google Calendar." : "Sign in with your Google account to load your calendars, subscriptions, birthdays, holidays, and other calendar feeds."
												}),
												gcal.email && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs text-muted-foreground",
													children: ["Account: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-mono",
														children: gcal.email
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[10px] text-muted-foreground",
													children: [
														"OAuth Client ID:",
														" ",
														hasGoogleClientId() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "font-mono text-emerald-600 dark:text-emerald-400",
															children: "configured"
														}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-amber-600 dark:text-amber-400",
															children: "not set"
														})
													]
												})
											]
										})]
									}),
									gcal.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-destructive/10 text-destructive",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { size: 15 }), gcal.error]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex gap-2 flex-wrap",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: async () => {
												const result = await gcal.connect();
												if (result.success) toast.success(result.email ? `✅ Synced as ${result.email}` : "✅ Google Calendar synced");
												else toast.error(result.error || "Sync failed");
											},
											disabled: gcal.connecting || gcal.syncing,
											className: "btn-primary text-sm gap-2",
											children: [gcal.connecting || gcal.syncing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
												size: 14,
												className: "animate-spin"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 14 }), "Refresh & Sync Now"]
										})
									})
								]
							}),
							gcal.calendars.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-elevated p-6 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-semibold text-lg",
										children: "Calendars"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: "Choose which calendars to show in Mission Control"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "space-y-2",
										children: gcal.calendars.map((cal) => {
											const enabled = gcal.enabledCalendarIds.includes(cal.id);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => gcal.toggleCalendar(cal.id),
												className: `flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${enabled ? "border-primary/30 bg-primary/5" : "border-border/30 hover:border-border/60 hover:bg-secondary/30"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "w-4 h-4 rounded-md flex items-center justify-center shrink-0",
													style: {
														background: enabled ? cal.backgroundColor || "#039BE5" : "transparent",
														border: `2px solid ${cal.backgroundColor || "#039BE5"}`
													},
													children: enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
														size: 10,
														className: "text-white"
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex-1 min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-sm font-semibold text-foreground truncate",
														children: cal.summary
													}), cal.primary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[10px] text-primary font-medium",
														children: "Primary"
													})]
												})]
											}, cal.id);
										})
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-elevated p-6 space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-semibold text-lg",
									children: "Sync Settings"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm font-medium text-foreground",
										children: "Auto-sync"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground",
										children: "Automatically refresh events every 5 minutes"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											gcal.setAutoSync(!gcal.autoSync);
											toast.success(gcal.autoSync ? "Auto-sync disabled" : "Auto-sync enabled");
										},
										className: `relative w-12 h-6 rounded-full transition-colors ${gcal.autoSync ? "bg-primary" : "bg-secondary"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${gcal.autoSync ? "translate-x-6" : ""}` })
									})]
								})]
							})
						]
					}, "google-calendar"),
					activeTab === "google-calendar" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleSetupModal, {
						open: googleSetupOpen,
						onClose: () => setGoogleSetupOpen(false)
					}),
					activeTab === "supabase" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						...fadeIn,
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `rounded-2xl border p-4 flex items-center gap-3 ${sbConnected ? sbConnectionOk ? sbSchemaReady ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20" : "bg-destructive/5 border-destructive/20" : "bg-amber-500/5 border-amber-500/20"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sbConnected ? sbConnectionOk ? sbSchemaReady ? "bg-emerald-500/15" : "bg-destructive/15" : "bg-destructive/15" : "bg-amber-500/15"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, {
											size: 17,
											className: sbConnected ? sbConnectionOk ? sbSchemaReady ? "text-emerald-500" : "text-destructive" : "text-destructive" : "text-amber-500"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `text-sm font-semibold ${sbConnected ? sbConnectionOk ? sbSchemaReady ? "text-emerald-600 dark:text-emerald-400" : "text-destructive" : "text-destructive" : "text-amber-600 dark:text-amber-400"}`,
											children: sbConnected ? sbConnectionOk ? sbSchemaReady ? "🟢 Supabase Sync Ready" : "🛑 Supabase Schema Missing" : "🛑 Supabase Connection Error" : "⚡ Supabase Not Connected"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground mt-0.5",
											children: sbConnected ? sbConnectionOk ? sbSchemaReady ? sbLastSync ? `Last sync: ${new Date(sbLastSync).toLocaleString()}` : "Schema is ready — no sync has run yet" : "Your Supabase project is reachable, but the Mission Control tables have not been created yet" : "The project cannot be reached from this browser right now. Verify the URL/key or disconnect cloud sync." : "Connect your Supabase project for multi-device sync & backup"
										})]
									}),
									sbConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "https://supabase.com/dashboard",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0",
										children: ["Dashboard ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 10 })]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-elevated p-6 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "font-semibold text-lg",
											children: "Connection Settings"
										}), sbConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: handleDisconnectSupabase,
											className: "text-xs text-destructive hover:underline font-medium",
											children: "Disconnect"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-semibold text-muted-foreground mb-1.5 block",
											children: "Project URL"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: sbUrl,
											onChange: (e) => setSbUrl(e.target.value),
											className: "input-base font-mono text-xs",
											placeholder: "https://your-project.supabase.co"
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-semibold text-muted-foreground mb-1.5 block",
											children: "Anon Key"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: sbKey,
											onChange: (e) => setSbKey(e.target.value),
											type: "password",
											className: "input-base font-mono text-xs",
											placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
										})] })]
									}),
									sbTestResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${sbTestResult.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`,
										children: [sbTestResult.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { size: 15 }), sbTestResult.msg]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex gap-2 flex-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: handleTestConnection,
											disabled: sbTesting,
											className: "btn-secondary text-sm gap-2.5",
											children: [sbTesting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
												size: 14,
												className: "animate-spin"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plug, { size: 14 }), "Test Connection"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: handleSaveSupabase,
											className: "btn-primary text-sm",
											children: "Save & Connect"
										})]
									})
								]
							}),
							sbConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SupabaseSyncConsole, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-elevated p-6 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "font-semibold text-lg",
											children: "Live Cloud Sync"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: `text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1 ${sbConnectionOk && sbSchemaReady ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"}`,
											children: [
												sbConnectionOk && sbSchemaReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 10 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 10 }),
												" ",
												sbConnectionOk && sbSchemaReady ? "Auto-Save Active" : "Blocked"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `flex items-start gap-2 p-3 rounded-xl border ${sbConnectionOk && sbSchemaReady ? "bg-emerald-500/8 border-emerald-500/15" : "bg-destructive/5 border-destructive/20"}`,
										children: [sbConnectionOk && sbSchemaReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
											size: 14,
											className: "text-emerald-500 shrink-0 mt-0.5"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
											size: 14,
											className: "text-destructive shrink-0 mt-0.5"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground leading-relaxed",
											children: sbConnectionOk && sbSchemaReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-foreground",
													children: "Always-on live sync."
												}),
												" ",
												"Changes are auto-saved to cloud and auto-refreshed on every device. Use Export/Import below only for version snapshots."
											] }) : !sbConnectionOk ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-foreground",
													children: "Sync is currently blocked."
												}),
												" ",
												"The saved cloud connection is failing at the network/auth level, so the schema checks are not reliable. Test the connection again, update the URL/key, or disconnect cloud sync to keep this device local-only."
											] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-foreground",
													children: "Sync is currently blocked."
												}),
												" ",
												"The console above is showing real Supabase errors because the required tables do not exist yet. Run the SQL schema below, then test again."
											] })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: handleSyncNow,
											disabled: !!sbSyncing || !sbConnectionOk || !sbSchemaReady,
											className: "flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all text-left group",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 transition-transform group-hover:scale-105",
												children: sbSyncing === "sync" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
													size: 18,
													className: "text-primary-foreground animate-spin"
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpDown, {
													size: 18,
													className: "text-primary-foreground"
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-sm font-bold text-foreground",
													children: "Sync Now"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[11px] text-muted-foreground mt-0.5",
													children: "Run immediate two-way sync (push + pull)"
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: handleRefreshFromCloud,
											disabled: !!sbSyncing || !sbConnectionOk || !sbSchemaReady,
											className: "flex items-center gap-3 p-4 rounded-2xl bg-secondary/30 border-2 border-border/30 hover:border-border/60 hover:bg-secondary/50 transition-all text-left group",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
												children: sbSyncing === "refresh" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
													size: 18,
													className: "text-foreground animate-spin"
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, {
													size: 18,
													className: "text-muted-foreground"
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-sm font-bold text-foreground",
													children: "Refresh From Cloud"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[11px] text-muted-foreground mt-0.5",
													children: "Pull latest cloud changes to this device"
												})]
											})]
										})]
									}),
									sbLastSync && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[11px] text-muted-foreground text-center",
										children: ["Last cloud sync: ", new Date(sbLastSync).toLocaleString()]
									})
								]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-elevated p-6 space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
											className: "font-semibold text-lg flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, {
												size: 16,
												className: "text-muted-foreground"
											}), " Database Schema"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setShowSchema(!showSchema),
											className: "text-xs font-medium text-primary hover:underline",
											children: showSchema ? "Hide" : "Show SQL"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: "First time setup: Run this SQL in your Supabase SQL Editor to create all required tables."
									}),
									showSchema && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
											className: "bg-secondary/50 rounded-xl p-4 text-[10px] font-mono text-muted-foreground overflow-auto max-h-60 leading-relaxed",
											children: SUPABASE_SCHEMA_SQL.trim()
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "absolute top-2 right-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyButton, { text: SUPABASE_SCHEMA_SQL.trim() })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "https://supabase.com/dashboard/project/_/editor",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline",
										children: ["Open SQL Editor ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 10 })]
									})
								]
							})
						]
					}, "supabase"),
					activeTab === "security" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						...fadeIn,
						className: "space-y-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-elevated p-6 space-y-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, {
										size: 18,
										className: "text-primary"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-semibold text-lg",
										children: "Encryption Key"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "Your credential vault passwords and API keys are encrypted using AES-256. Set a custom master key below for enhanced security. Keep it safe — you'll need it to decrypt your data."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `rounded-xl p-3 ${hasCustomKey ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"} text-sm font-medium flex items-center gap-2`,
									children: [hasCustomKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 15 }), hasCustomKey ? "Custom encryption key is set" : "A strong device key was generated automatically. Save a custom key if you need portable vault recovery."]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-semibold text-muted-foreground block",
											children: "Encryption Key"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: encKey,
												onChange: (e) => setEncKey(e.target.value),
												type: showEncKey ? "text" : "password",
												className: "input-base font-mono text-xs flex-1",
												placeholder: "Enter or generate a strong key..."
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setShowEncKey(!showEncKey),
												className: "btn-secondary px-3 text-xs shrink-0",
												children: showEncKey ? "Hide" : "Show"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: handleGenerateEncKey,
												className: "btn-secondary text-sm gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 13 }), " Generate Key"]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: handleSaveEncKey,
												disabled: !encKey,
												className: "btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed",
												children: "Save Key"
											})]
										})
									]
								})
							]
						})
					}, "security"),
					activeTab === "data" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						...fadeIn,
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-elevated p-6 space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-semibold text-lg",
								children: "Backup & Restore"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: handleExport,
										className: "flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
											size: 19,
											className: "text-primary shrink-0"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-sm font-semibold text-foreground",
											children: "Export All Data"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground",
											children: "Download full JSON backup"
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => importRef.current?.click(),
										className: "flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {
											size: 19,
											className: "text-primary shrink-0"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-sm font-semibold text-foreground",
											children: "Import Data"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground",
											children: "Restore from JSON backup"
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										ref: importRef,
										type: "file",
										accept: ".json",
										onChange: handleImport,
										className: "hidden"
									})
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-elevated p-6 space-y-4 border-destructive/20",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
										size: 17,
										className: "text-destructive"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-semibold text-destructive",
										children: "Danger Zone"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "Permanently deletes ALL data — websites, tasks, notes, credentials, settings. This cannot be undone."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-semibold text-muted-foreground block",
											children: "Type \"DELETE\" to confirm:"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: confirmDelete,
											onChange: (e) => setConfirmDelete(e.target.value),
											placeholder: "DELETE",
											className: "input-base max-w-xs"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: handleClearAll,
											disabled: confirmDelete !== "DELETE",
											className: "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 }), " Delete All Data"]
										})
									]
								})
							]
						})]
					}, "data"),
					activeTab === "about" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						...fadeIn,
						className: "space-y-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-elevated p-6 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg",
										children: "M"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-bold text-xl",
										children: "Mission Control"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "badge-primary mt-1",
										children: "v8.0 Enterprise"
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2 text-sm",
									children: [
										{
											label: "Framework",
											value: "React 18 + TypeScript + Vite"
										},
										{
											label: "Styling",
											value: "Tailwind CSS + Framer Motion"
										},
										{
											label: "Storage",
											value: "IndexedDB (Dexie.js) — Offline-first"
										},
										{
											label: "Cloud Sync",
											value: "Mission Control Cloud"
										},
										{
											label: "Encryption",
											value: "AES-256-GCM via Web Crypto"
										},
										{
											label: "Layout",
											value: "react-grid-layout — Drag & Drop"
										}
									].map(({ label, value }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between py-2 border-b border-border/30 last:border-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground font-medium",
											children: label
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground font-semibold text-xs",
											children: value
										})]
									}, label))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Built with ❤️ for infinite flexibility" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "badge-muted",
										children: "Open Source"
									})]
								})
							]
						})
					}, "about")
				] })
			})]
		})]
	});
}
//#endregion
export { SettingsPage as default };
