import "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Body } from "../_libs/react-email__body.mjs";
import { t as Button } from "../_libs/react-email__button.mjs";
import { t as Column } from "../_libs/react-email__column.mjs";
import { t as Container } from "../_libs/react-email__container.mjs";
import { t as Head } from "../_libs/react-email__head.mjs";
import { t as Heading } from "../_libs/react-email__heading.mjs";
import { t as Hr } from "../_libs/react-email__hr.mjs";
import { t as Html } from "../_libs/react-email__html.mjs";
import { t as Link } from "../_libs/react-email__link.mjs";
import { t as Preview } from "../_libs/react-email__preview.mjs";
import { t as Row } from "../_libs/react-email__row.mjs";
import { t as Section } from "../_libs/react-email__section.mjs";
import { t as Text } from "../_libs/react-email__text.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
var APP_URL = "https://mission-control-001.lovable.app";
var INK = "#0b1220";
var MUTED = "#6b7c93";
var LINE = "#e6ebf2";
var EMERALD = "#0f9d76";
var PRIORITY = {
	critical: {
		bg: "#fee2e2",
		fg: "#b42318",
		bar: "#e0342a",
		rank: 0
	},
	high: {
		bg: "#ffedd5",
		fg: "#b54708",
		bar: "#f07c1a",
		rank: 1
	},
	medium: {
		bg: "#e0f2fe",
		fg: "#026aa2",
		bar: "#2e90fa",
		rank: 2
	},
	low: {
		bg: "#ecfdf5",
		fg: "#067a5c",
		bar: "#12b886",
		rank: 3
	}
};
var tone = (p) => PRIORITY[(p || "low").toLowerCase()] || PRIORITY["low"];
var weekday = (iso) => {
	if (!iso) return "";
	const d = /* @__PURE__ */ new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long"
	});
};
var shortDate = (iso) => {
	if (!iso) return "";
	const d = /* @__PURE__ */ new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-GB", {
		weekday: "short",
		day: "numeric",
		month: "short"
	});
};
/** Table-based bar — renders in every client, no CSS tricks. */
var Meter = ({ pct, color, track }) => {
	const p = Math.max(2, Math.min(100, Math.round(pct)));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
		width: "100%",
		cellPadding: 0,
		cellSpacing: 0,
		role: "presentation",
		style: {
			...meterOuter,
			backgroundColor: track ?? meterOuter.backgroundColor
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			style: {
				width: `${p}%`,
				backgroundColor: color,
				height: "8px",
				borderRadius: "999px",
				fontSize: "1px",
				lineHeight: "8px"
			},
			children: "\xA0"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			style: {
				height: "8px",
				fontSize: "1px",
				lineHeight: "8px"
			},
			children: "\xA0"
		})] }) })
	});
};
var StatTile = ({ value, label, color, bg }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Column, {
	style: tileWrap,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
		width: "100%",
		cellPadding: 0,
		cellSpacing: 0,
		role: "presentation",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
			style: {
				...tile,
				backgroundColor: bg
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
				style: {
					...tileValue,
					color
				},
				children: value
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
				style: tileLabel,
				children: label
			})]
		}) }) })
	})
});
/** One task card: colour-coded spine, rank badge, title, plain-language meta. */
var TaskCard = ({ task, index, showOverdue }) => {
	const t = tone(task.priority);
	const days = task.daysOverdue ?? 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
		width: "100%",
		cellPadding: 0,
		cellSpacing: 0,
		role: "presentation",
		style: cardTable,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			style: {
				...accentCol,
				backgroundColor: t.bar
			},
			children: "\xA0"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			style: cardBody,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
				width: "100%",
				cellPadding: 0,
				cellSpacing: 0,
				role: "presentation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					style: numCell,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: {
							...numBadge,
							backgroundColor: t.bg,
							color: t.fg
						},
						children: index
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
					style: taskTitle,
					children: task.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
					style: metaLine,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: {
								...pill,
								backgroundColor: t.bg,
								color: t.fg
							},
							children: (task.priority || "low").toUpperCase()
						}),
						task.dueDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							style: metaText,
							children: [
								showOverdue && days > 0 ? "was due " : "due ",
								shortDate(task.dueDate),
								task.startTime ? ` · ${task.startTime}` : ""
							]
						}),
						showOverdue && days > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							style: overduePill,
							children: [
								days,
								" day",
								days === 1 ? "" : "s",
								" late"
							]
						})
					]
				})] })] }) })
			})
		})] }) })
	});
};
var Group = ({ emoji, title, hint, color, tasks, showOverdue, limit = 8 }) => {
	if (!tasks.length) return null;
	const shown = tasks.slice(0, limit);
	const rest = tasks.length - shown.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
		style: group,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
				style: {
					...groupTitle,
					color
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: groupEmoji,
						children: emoji
					}),
					title,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: groupCount,
						children: tasks.length
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
				style: groupHint,
				children: hint
			}),
			shown.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskCard, {
				task: t,
				index: i + 1,
				showOverdue
			}, `${title}-${i}`)),
			rest > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
				style: groupHint,
				children: [
					"+ ",
					rest,
					" more in",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						href: `${APP_URL}/?section=tasks`,
						style: footerLink,
						children: "Mission Control"
					})
				]
			})
		]
	});
};
var OverdueDigestEmail = ({ date, overdue = [], dueToday = [], dueTomorrow = [], upcoming = [], backlog = [], completed = [], completedToday = 0, completedWeek = 0, totalOpen = 0, inProgress = 0, issues = [] }) => {
	const allClear = overdue.length === 0 && dueToday.length === 0;
	const plan = [...overdue, ...dueToday].sort((a, b) => {
		const p = tone(a.priority).rank - tone(b.priority).rank;
		if (p !== 0) return p;
		return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
	}).slice(0, 3);
	const scheduled = [...overdue, ...dueToday].filter((t) => !!t.startTime).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")).slice(0, 6);
	const openLoad = totalOpen || overdue.length + dueToday.length + dueTomorrow.length + upcoming.length;
	const closedRatio = completedWeek + openLoad > 0 ? completedWeek / (completedWeek + openLoad) * 100 : 0;
	const mix = {
		critical: 0,
		high: 0,
		medium: 0,
		low: 0
	};
	[
		...overdue,
		...dueToday,
		...dueTomorrow,
		...upcoming,
		...backlog
	].forEach((t) => {
		const key = (t.priority || "low").toLowerCase();
		if (key in mix) mix[key] = (mix[key] ?? 0) + 1;
	});
	const mixTotal = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
	const verdict = overdue.length ? `${overdue.length} task${overdue.length === 1 ? "" : "s"} slipped past their date. Clear the top one first — the rest of the day gets easier.` : dueToday.length ? `Nothing is late. ${dueToday.length} task${dueToday.length === 1 ? "" : "s"} land today — a clean, finishable day.` : "Nothing overdue, nothing due today. Use the free space for the work that actually moves things forward.";
	const previewText = overdue.length ? `${overdue.length} overdue · ${dueToday.length} due today · start with “${plan[0]?.title ?? ""}”` : dueToday.length ? `${dueToday.length} due today · start with “${plan[0]?.title ?? ""}”` : `All clear · ${completedWeek} finished this week`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Html, {
		lang: "en",
		dir: "ltr",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Head, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Preview, { children: previewText }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
				style: main,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, {
					style: shell,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
							width: "100%",
							cellPadding: 0,
							cellSpacing: 0,
							role: "presentation",
							style: heroTable,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								style: hero,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
										style: kicker,
										children: "MISSION CONTROL · DAILY BRIEFING"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading, {
										style: h1,
										children: allClear ? "You are clear today" : overdue.length ? `${overdue.length} overdue · ${dueToday.length} due today` : `${dueToday.length} task${dueToday.length === 1 ? "" : "s"} due today`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
										style: dateLine,
										children: weekday(date)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
										style: subLine,
										children: verdict
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
										width: "100%",
										cellPadding: 0,
										cellSpacing: 0,
										role: "presentation",
										style: { marginTop: "18px" },
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
											style: meterLabel,
											children: [
												"MOMENTUM · ",
												completedWeek,
												" CLOSED IN 7 DAYS · ",
												openLoad,
												" STILL OPEN"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
											pct: closedRatio,
											color: "#5eead4"
										})] }) }) })
									})
								]
							}) }) })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							style: statsWrap,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: overdue.length,
									label: "Overdue",
									color: "#b42318",
									bg: "#fff5f5"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: dueToday.length,
									label: "Due today",
									color: "#026aa2",
									bg: "#f0f9ff"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: dueTomorrow.length,
									label: "Tomorrow",
									color: "#b54708",
									bg: "#fffaf0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: inProgress,
									label: "In progress",
									color: "#5925dc",
									bg: "#f6f4ff"
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: completedToday,
									label: "Done today",
									color: "#067a5c",
									bg: "#f2fdf8"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: completedWeek,
									label: "Done / 7d",
									color: "#067a5c",
									bg: "#f2fdf8"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: upcoming.length,
									label: "This week",
									color: "#334155",
									bg: "#f7f9fc"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									value: openLoad,
									label: "Open total",
									color: "#334155",
									bg: "#f7f9fc"
								})
							] })]
						}),
						plan.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
							width: "100%",
							cellPadding: 0,
							cellSpacing: 0,
							role: "presentation",
							style: { margin: "0 0 24px" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								style: focusBox,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
										style: focusLabel,
										children: "DO THESE, IN THIS ORDER"
									}),
									plan.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
										width: "100%",
										cellPadding: 0,
										cellSpacing: 0,
										role: "presentation",
										style: { marginBottom: i === plan.length - 1 ? "16px" : "12px" },
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											style: planNumCell,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: {
													...planNum,
													backgroundColor: tone(t.priority).bar
												},
												children: i + 1
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
											style: i === 0 ? focusTitle : planTitle,
											children: t.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
											style: focusMeta,
											children: [
												(t.priority || "low").toUpperCase(),
												t.dueDate ? ` · due ${shortDate(t.dueDate)}` : "",
												t.startTime ? ` · ${t.startTime}` : "",
												(t.daysOverdue ?? 0) > 0 ? ` · ${t.daysOverdue} days late` : ""
											]
										})] })] }) })
									}, `plan-${i}`)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										href: `${APP_URL}/?section=focus`,
										style: cta,
										children: "Start a focus session →"
									})
								]
							}) }) })
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
							width: "100%",
							cellPadding: 0,
							cellSpacing: 0,
							role: "presentation",
							style: { margin: "0 0 24px" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								style: clearBox,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
										style: clearEmoji,
										children: "✅"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
										style: clearTitle,
										children: "Clean board"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
										style: clearText,
										children: [
											"Nothing overdue and nothing due today. ",
											completedWeek,
											" task",
											completedWeek === 1 ? "" : "s",
											" closed in the last seven days."
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										href: `${APP_URL}/?section=review`,
										style: cta,
										children: "Plan the week →"
									})
								]
							}) }) })
						}),
						scheduled.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							style: group,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
									style: {
										...groupTitle,
										color: INK
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: groupEmoji,
										children: "🕒"
									}), "TODAY’S TIMELINE"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
									style: groupHint,
									children: "Everything with a time on it, in order."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
									width: "100%",
									cellPadding: 0,
									cellSpacing: 0,
									role: "presentation",
									style: timelineBox,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: scheduled.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										style: timeCell,
										children: t.startTime
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										style: timeTitleCell,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: {
												...dot,
												backgroundColor: tone(t.priority).bar
											},
											children: "\xA0"
										}), t.title]
									})] }, `sched-${i}`)) })
								})
							]
						}),
						issues.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							style: group,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
									style: {
										...groupTitle,
										color: INK
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: groupEmoji,
										children: "🚩"
									}), "NEEDS A DECISION"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
									style: groupHint,
									children: "Signals picked up across tasks and bills."
								}),
								issues.map((it, i) => {
									const sev = it.severity === "high" ? {
										bg: "#fff5f5",
										bd: "#fecdca",
										fg: "#b42318"
									} : it.severity === "medium" ? {
										bg: "#fffaf0",
										bd: "#fedf89",
										fg: "#b54708"
									} : {
										bg: "#f7f9fc",
										bd: LINE,
										fg: "#334155"
									};
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
										width: "100%",
										cellPadding: 0,
										cellSpacing: 0,
										role: "presentation",
										style: {
											...cardTable,
											borderColor: sev.bd,
											backgroundColor: sev.bg
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											style: {
												...cardBody,
												color: sev.fg
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
												style: {
													...issueLabel,
													color: sev.fg
												},
												children: it.label
											}), it.detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
												style: {
													...issueDetail,
													color: sev.fg
												},
												children: it.detail
											})]
										}) }) })
									}, `issue-${i}`);
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
							emoji: "🔥",
							title: "OVERDUE",
							hint: "Past their date. Finish, reschedule, or drop each one.",
							color: "#b42318",
							tasks: overdue,
							showOverdue: true,
							limit: 10
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
							emoji: "📌",
							title: "DUE TODAY",
							hint: "Land these and today counts as a win.",
							color: "#026aa2",
							tasks: dueToday
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
							emoji: "🌅",
							title: "DUE TOMORROW",
							hint: "Prep anything here that needs someone else.",
							color: "#b54708",
							tasks: dueTomorrow,
							limit: 6
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
							emoji: "🗓️",
							title: "REST OF THE WEEK",
							hint: "On the horizon — no action needed yet.",
							color: "#334155",
							tasks: upcoming,
							limit: 6
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
							emoji: "🗃️",
							title: "NO DATE YET",
							hint: "Undated work never gets scheduled. Give the top ones a day.",
							color: "#334155",
							tasks: backlog,
							limit: 5
						}),
						mixTotal > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							style: group,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
									style: {
										...groupTitle,
										color: INK
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: groupEmoji,
										children: "⚖️"
									}), "WHERE THE LOAD SITS"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
									style: groupHint,
									children: "Open work by priority."
								}),
								[
									"critical",
									"high",
									"medium",
									"low"
								].map((k) => (mix[k] ?? 0) > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
									width: "100%",
									cellPadding: 0,
									cellSpacing: 0,
									role: "presentation",
									style: { marginBottom: "9px" },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										style: mixLabelCell,
										children: [
											k.toUpperCase(),
											" · ",
											mix[k]
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
										pct: (mix[k] ?? 0) / mixTotal * 100,
										color: PRIORITY[k].bar,
										track: "#eef2f7"
									}) })] }) })
								}, k) : null)
							]
						}),
						completed.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							style: group,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
								style: {
									...groupTitle,
									color: "#067a5c"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: groupEmoji,
										children: "🏆"
									}),
									"CLOSED TODAY",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: groupCount,
										children: completed.length
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
								width: "100%",
								cellPadding: 0,
								cellSpacing: 0,
								role: "presentation",
								style: doneBox,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: completed.slice(0, 8).map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									style: doneCheckCell,
									children: "✓"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									style: doneTextCell,
									children: t.title
								})] }, `done-${i}`)) })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
							width: "100%",
							cellPadding: 0,
							cellSpacing: 0,
							role: "presentation",
							style: actionsBox,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								style: {
									textAlign: "center",
									padding: "18px 16px"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
										style: actionsTitle,
										children: "Jump straight in"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										href: `${APP_URL}/?section=tasks`,
										style: ctaGhost,
										children: "All tasks"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										href: `${APP_URL}/?section=review`,
										style: ctaGhost,
										children: "Review"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										href: `${APP_URL}/?section=calendar`,
										style: ctaGhost,
										children: "Calendar"
									})
								]
							}) }) })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hr, { style: hr }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
							style: footer,
							children: [
								"Daily briefing from",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									href: APP_URL,
									style: footerLink,
									children: "Mission Control"
								}),
								" · ",
								"delivered every morning at 07:00"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
							style: footerFine,
							children: "You receive this because you own this workspace."
						})
					]
				})
			})
		]
	});
};
var template = {
	component: OverdueDigestEmail,
	subject: (data) => {
		const overdue = data["overdue"]?.length ?? 0;
		const today = data["dueToday"]?.length ?? 0;
		const done = data["completedToday"] ?? 0;
		const first = (data["overdue"]?.[0] ?? data["dueToday"]?.[0])?.title ?? "";
		return `Daily briefing — ${overdue ? `${overdue} overdue · ${today} due today` : today ? `${today} due today` : "All clear today"}${done ? ` · ${done} done` : ""}${first ? ` — start with “${first}”` : ""}`;
	},
	displayName: "Daily briefing",
	to: "papalexios@gmail.com",
	previewData: {
		date: "2026-08-30",
		completedToday: 3,
		completedWeek: 11,
		totalOpen: 14,
		inProgress: 2,
		issues: [{
			label: "1 critical task overdue",
			detail: "Renew SSL certificate",
			severity: "high"
		}, {
			label: "2 bills due this week",
			detail: "Electricity €84.20 · Κοινόχρηστα €45.00",
			severity: "medium"
		}],
		completed: [{ title: "Ship dashboard redesign" }, { title: "Reply to hosting support" }],
		upcoming: [{
			title: "Client call prep",
			priority: "high",
			dueDate: "2026-09-02"
		}],
		backlog: [{
			title: "Refactor import engine",
			priority: "medium"
		}],
		overdue: [{
			title: "Renew SSL certificate",
			priority: "critical",
			dueDate: "2026-08-17",
			daysOverdue: 13
		}, {
			title: "Send invoice to client",
			priority: "high",
			dueDate: "2026-08-28",
			daysOverdue: 2
		}],
		dueToday: [{
			title: "Publish blog post",
			priority: "medium",
			dueDate: "2026-08-30",
			startTime: "15:00"
		}, {
			title: "Team stand-up",
			priority: "low",
			dueDate: "2026-08-30",
			startTime: "09:30"
		}],
		dueTomorrow: [{
			title: "Weekly review",
			priority: "low",
			dueDate: "2026-08-31"
		}]
	}
};
var main = {
	backgroundColor: "#eef2f7",
	fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
	margin: "0",
	padding: "24px 0 32px"
};
var shell = {
	maxWidth: "620px",
	width: "100%",
	backgroundColor: "#ffffff",
	borderRadius: "22px",
	padding: "10px 22px 26px",
	margin: "0 auto"
};
var heroTable = { margin: "0 0 20px" };
var hero = {
	backgroundColor: "#0b1220",
	backgroundImage: "linear-gradient(135deg, #0b1220 0%, #10312b 100%)",
	borderRadius: "20px",
	padding: "26px 24px 24px"
};
var kicker = {
	fontSize: "10px",
	letterSpacing: "2.6px",
	color: "#5eead4",
	fontWeight: "bold",
	margin: "0 0 12px"
};
var h1 = {
	fontSize: "27px",
	lineHeight: "34px",
	fontWeight: "bold",
	color: "#ffffff",
	margin: "0 0 8px",
	letterSpacing: "-0.5px"
};
var dateLine = {
	fontSize: "12px",
	color: "#8ba3b8",
	margin: "0 0 10px"
};
var subLine = {
	fontSize: "14px",
	lineHeight: "21px",
	color: "#cbd8e4",
	margin: "0"
};
var meterLabel = {
	fontSize: "10px",
	letterSpacing: "1.8px",
	fontWeight: "bold",
	color: "#8ba3b8",
	margin: "0 0 7px"
};
var meterOuter = {
	backgroundColor: "rgba(255,255,255,0.14)",
	borderRadius: "999px",
	height: "8px"
};
var statsWrap = { margin: "0 0 22px" };
var tileWrap = {
	width: "25%",
	padding: "0 4px 8px"
};
var tile = {
	borderRadius: "14px",
	border: `1px solid ${LINE}`,
	padding: "13px 6px",
	textAlign: "center"
};
var tileValue = {
	fontSize: "25px",
	fontWeight: "bold",
	margin: "0 0 3px",
	lineHeight: "28px"
};
var tileLabel = {
	fontSize: "9px",
	letterSpacing: "1.1px",
	textTransform: "uppercase",
	color: MUTED,
	margin: "0",
	fontWeight: "bold"
};
var focusBox = {
	backgroundColor: "#0b1220",
	backgroundImage: "linear-gradient(135deg, #101a2c 0%, #0b1220 100%)",
	borderRadius: "18px",
	padding: "22px 24px"
};
var focusLabel = {
	fontSize: "10px",
	letterSpacing: "1.8px",
	color: "#5eead4",
	fontWeight: "bold",
	margin: "0 0 14px"
};
var focusTitle = {
	fontSize: "20px",
	lineHeight: "27px",
	color: "#ffffff",
	fontWeight: "bold",
	margin: "0 0 5px"
};
var planTitle = {
	fontSize: "15px",
	lineHeight: "21px",
	color: "#e2e8f0",
	fontWeight: "bold",
	margin: "0 0 4px"
};
var planNumCell = {
	width: "34px",
	verticalAlign: "top",
	paddingTop: "3px"
};
var planNum = {
	display: "inline-block",
	minWidth: "22px",
	textAlign: "center",
	borderRadius: "999px",
	color: "#ffffff",
	fontSize: "11px",
	fontWeight: "bold",
	padding: "3px 6px"
};
var focusMeta = {
	fontSize: "11px",
	color: "#8ba3b8",
	margin: "0"
};
var clearBox = {
	backgroundColor: "#f2fdf8",
	border: "1px solid #a6f4d0",
	borderRadius: "18px",
	padding: "26px 22px",
	textAlign: "center"
};
var clearEmoji = {
	fontSize: "30px",
	margin: "0 0 6px"
};
var clearTitle = {
	fontSize: "18px",
	color: "#05603a",
	fontWeight: "bold",
	margin: "0 0 6px"
};
var clearText = {
	fontSize: "13px",
	lineHeight: "20px",
	color: "#067a5c",
	margin: "0 0 18px"
};
var cta = {
	backgroundColor: EMERALD,
	color: "#ffffff",
	fontSize: "14px",
	fontWeight: "bold",
	borderRadius: "12px",
	padding: "13px 24px",
	textDecoration: "none",
	display: "inline-block"
};
var ctaGhost = {
	backgroundColor: "#ffffff",
	border: `1px solid ${LINE}`,
	color: INK,
	fontSize: "12px",
	fontWeight: "bold",
	borderRadius: "10px",
	padding: "10px 16px",
	textDecoration: "none",
	display: "inline-block",
	margin: "0 4px"
};
var group = { margin: "0 0 28px" };
var groupTitle = {
	fontSize: "13px",
	letterSpacing: "1.3px",
	textTransform: "uppercase",
	fontWeight: "bold",
	margin: "0 0 3px"
};
var groupEmoji = { marginRight: "8px" };
var groupCount = {
	display: "inline-block",
	backgroundColor: "#f1f5f9",
	color: "#475569",
	borderRadius: "999px",
	fontSize: "11px",
	padding: "1px 9px",
	marginLeft: "8px"
};
var groupHint = {
	fontSize: "12px",
	color: MUTED,
	margin: "0 0 13px"
};
var cardTable = {
	margin: "0 0 10px",
	borderRadius: "14px",
	border: `1px solid ${LINE}`,
	overflow: "hidden",
	backgroundColor: "#ffffff"
};
var accentCol = {
	width: "5px",
	fontSize: "1px",
	lineHeight: "1px"
};
var cardBody = { padding: "13px 16px" };
var numCell = {
	width: "34px",
	verticalAlign: "top",
	paddingTop: "2px"
};
var numBadge = {
	display: "inline-block",
	minWidth: "20px",
	textAlign: "center",
	borderRadius: "999px",
	fontSize: "11px",
	fontWeight: "bold",
	padding: "3px 6px"
};
var taskTitle = {
	fontSize: "15px",
	lineHeight: "21px",
	color: INK,
	fontWeight: "bold",
	margin: "0 0 7px"
};
var metaLine = {
	fontSize: "11px",
	margin: "0"
};
var metaText = {
	color: MUTED,
	marginRight: "8px"
};
var pill = {
	display: "inline-block",
	fontSize: "9px",
	fontWeight: "bold",
	letterSpacing: "0.6px",
	borderRadius: "999px",
	padding: "3px 8px",
	marginRight: "8px"
};
var overduePill = {
	display: "inline-block",
	backgroundColor: "#e0342a",
	color: "#ffffff",
	fontSize: "9px",
	fontWeight: "bold",
	borderRadius: "999px",
	padding: "3px 8px"
};
var timelineBox = {
	border: `1px solid ${LINE}`,
	borderRadius: "14px",
	backgroundColor: "#f7f9fc",
	padding: "6px 14px"
};
var timeCell = {
	width: "58px",
	fontSize: "12px",
	fontWeight: "bold",
	color: MUTED,
	padding: "9px 0",
	verticalAlign: "top"
};
var timeTitleCell = {
	fontSize: "14px",
	color: INK,
	padding: "9px 0",
	verticalAlign: "top"
};
var dot = {
	display: "inline-block",
	width: "8px",
	height: "8px",
	borderRadius: "999px",
	marginRight: "9px",
	fontSize: "1px",
	lineHeight: "8px"
};
var mixLabelCell = {
	width: "110px",
	fontSize: "10px",
	fontWeight: "bold",
	letterSpacing: "0.8px",
	color: MUTED,
	paddingRight: "10px"
};
var issueLabel = {
	fontSize: "14px",
	fontWeight: "bold",
	margin: "0 0 4px"
};
var issueDetail = {
	fontSize: "12px",
	lineHeight: "18px",
	margin: "0",
	opacity: .85
};
var doneBox = {
	backgroundColor: "#f2fdf8",
	border: "1px solid #a6f4d0",
	borderRadius: "14px",
	padding: "6px 14px"
};
var doneCheckCell = {
	width: "20px",
	color: "#12b886",
	fontWeight: "bold",
	fontSize: "13px",
	padding: "6px 0",
	verticalAlign: "top"
};
var doneTextCell = {
	fontSize: "14px",
	color: "#05603a",
	padding: "6px 0",
	textDecoration: "line-through"
};
var actionsBox = {
	backgroundColor: "#f7f9fc",
	border: `1px solid ${LINE}`,
	borderRadius: "16px",
	margin: "0 0 6px"
};
var actionsTitle = {
	fontSize: "10px",
	letterSpacing: "1.8px",
	textTransform: "uppercase",
	color: MUTED,
	fontWeight: "bold",
	margin: "0 0 12px"
};
var hr = {
	borderColor: LINE,
	margin: "22px 0 12px"
};
var footer = {
	fontSize: "11px",
	color: MUTED,
	margin: "0 0 4px",
	textAlign: "center"
};
var footerFine = {
	fontSize: "10px",
	color: "#9aa8b8",
	margin: "0",
	textAlign: "center"
};
var footerLink = {
	color: EMERALD,
	textDecoration: "none"
};
/**
* Template registry — maps template names to their React Email components.
* Import and register new templates here after creating them in this directory.
*
* Example:
*   import { template as welcomeTemplate } from './welcome'
*   // then add to TEMPLATES: 'welcome': welcomeTemplate
*/
var TEMPLATES = { "overdue-digest": template };
//#endregion
export { TEMPLATES as t };
