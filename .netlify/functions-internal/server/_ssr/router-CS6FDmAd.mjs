import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as createRootRouteWithContext, d as HeadContent, g as createFileRoute, h as lazyRouteComponent, m as Outlet, p as createRouter, u as Scripts, v as Link, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { a as anthropicToolUse, o as isAnthropicAvailable } from "./anthropicServer-DVyUpP7T.mjs";
import { t as Body } from "../_libs/react-email__body.mjs";
import { t as Button } from "../_libs/react-email__button.mjs";
import { t as Container } from "../_libs/react-email__container.mjs";
import { t as Head } from "../_libs/react-email__head.mjs";
import { t as Heading } from "../_libs/react-email__heading.mjs";
import { t as Html } from "../_libs/react-email__html.mjs";
import { t as Link$1 } from "../_libs/react-email__link.mjs";
import { t as Preview } from "../_libs/react-email__preview.mjs";
import { n as render } from "../_libs/@react-email/render+[...].mjs";
import { t as Text } from "../_libs/react-email__text.mjs";
import { t as TEMPLATES } from "./registry-xs9QoTYL.mjs";
import { n as createAuthEmailHandler } from "../_libs/@lovable.dev/email-js+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CS6FDmAd.js
var router_CS6FDmAd_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-DI0Eb63D.css";
function reportLovableError(error, context) {
	if (context) {
		console.error("Lovable runtime error", context, error);
		return;
	}
	console.error("Lovable runtime error", error);
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$6 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{
				name: "theme-color",
				content: "#f5f6ef"
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent"
			},
			{ title: "Mission Control" },
			{
				name: "description",
				content: "Mission Control dashboard"
			},
			{
				name: "author",
				content: "Mission Control"
			},
			{
				property: "og:title",
				content: "Mission Control"
			},
			{
				property: "og:description",
				content: "Mission Control dashboard"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:site",
				content: "@Lovable"
			},
			{
				name: "twitter:title",
				content: "Mission Control"
			},
			{
				name: "twitter:description",
				content: "Mission Control dashboard"
			},
			{
				property: "og:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/73140473-e678-4823-b8d0-6e729556977a/id-preview-ef994308--a71d0f06-96ad-41fa-b8dc-84ee838e0a5a.lovable.app-1784633788062.png"
			},
			{
				name: "twitter:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/73140473-e678-4823-b8d0-6e729556977a/id-preview-ef994308--a71d0f06-96ad-41fa-b8dc-84ee838e0a5a.lovable.app-1784633788062.png"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				id: "mc-fatal",
				style: {
					display: "none",
					position: "fixed",
					inset: 0,
					zIndex: 99999,
					background: "#0d0f14",
					alignItems: "center",
					justifyContent: "center",
					padding: 24
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "prism-aurora",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "prism-grain",
				"aria-hidden": "true"
			}),
			children,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$6.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
var $$splitComponentImporter = () => import("./routes-qm6I9RAb.mjs").then((n) => n.t);
var Route$5 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Mission Control" },
		{
			name: "description",
			content: "Mission Control personal dashboard for tasks, calendars, imports, credentials, and daily work."
		},
		{
			property: "og:title",
			content: "Mission Control"
		},
		{
			property: "og:description",
			content: "Mission Control personal dashboard for tasks, calendars, imports, credentials, and daily work."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var RANK = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3
};
var DIGEST_TIME_ZONE = "Europe/Athens";
function isoDay(offsetDays = 0, tz = DIGEST_TIME_ZONE) {
	const d = new Date(Date.now() + offsetDays * 864e5);
	return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}
function sortTasks(list) {
	return [...list].sort((a, b) => {
		const p = (RANK[a.priority ?? ""] ?? 9) - (RANK[b.priority ?? ""] ?? 9);
		if (p !== 0) return p;
		return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
	});
}
function shape(t, today) {
	const due = t.dueDate ? (/* @__PURE__ */ new Date(`${t.dueDate}T00:00:00`)).getTime() : 0;
	const now = (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime();
	return {
		title: String(t.title ?? "").slice(0, 300),
		priority: t.priority ?? "medium",
		dueDate: t.dueDate ?? "",
		startTime: t.startTime ?? "",
		daysOverdue: due ? Math.max(0, Math.round((now - due) / 864e5)) : 0
	};
}
function money(p) {
	const amt = typeof p.amount === "number" ? p.amount : 0;
	const cur = (p.currency || "EUR").toUpperCase();
	return `${cur === "EUR" ? "€" : cur === "USD" ? "$" : cur === "GBP" ? "£" : `${cur} `}${amt.toFixed(2)}`;
}
async function run(request) {
	const provided = request.headers.get("x-digest-secret") ?? new URL(request.url).searchParams.get("secret");
	if (!provided) return new Response("Unauthorized", { status: 401 });
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const envSecret = process.env["DIGEST_CRON_SECRET"];
	let authorized = !!envSecret && provided === envSecret;
	if (!authorized) {
		const { data: tok } = await supabaseAdmin.from("mc_cron_tokens").select("token").eq("name", "digest").maybeSingle();
		authorized = !!tok?.token && tok.token === provided;
	}
	if (!authorized) return new Response("Unauthorized", { status: 401 });
	const ownerUserId = process.env["MISSION_CONTROL_OWNER_USER_ID"]?.trim();
	if (!ownerUserId) {
		console.error("[digest] MISSION_CONTROL_OWNER_USER_ID is required");
		return Response.json({
			ok: false,
			error: "Digest owner is not configured"
		}, { status: 503 });
	}
	const { data, error } = await supabaseAdmin.from("mc_records").select("collection, data").eq("user_id", ownerUserId).in("collection", ["tasks", "payments"]).eq("deleted", false).limit(8e3);
	if (error) return Response.json({
		ok: false,
		error: error.message
	}, { status: 500 });
	const rows = data ?? [];
	const tasks = rows.filter((r) => r.collection === "tasks").map((r) => r.data).filter(Boolean);
	const payments = rows.filter((r) => r.collection === "payments").map((r) => r.data).filter(Boolean);
	const today = isoDay(0);
	const tomorrow = isoDay(1);
	const weekEnd = isoDay(7);
	const weekStart = isoDay(-6);
	const open = tasks.filter((t) => t && t.status !== "done" && !t.deletedAt);
	const done = tasks.filter((t) => t?.status === "done" && !t.deletedAt);
	const overdue = sortTasks(open.filter((t) => t.dueDate && t.dueDate < today));
	const dueToday = sortTasks(open.filter((t) => t.dueDate === today));
	const dueTomorrow = sortTasks(open.filter((t) => t.dueDate === tomorrow));
	const upcoming = sortTasks(open.filter((t) => t.dueDate && t.dueDate > tomorrow && t.dueDate <= weekEnd));
	const backlog = sortTasks(open.filter((t) => !t.dueDate));
	const inProgress = open.filter((t) => t.status === "in-progress" || t.status === "doing");
	const dayOf = (t) => (t.completedAt || t.updatedAt || "").slice(0, 10);
	const completedTodayList = done.filter((t) => dayOf(t) === today);
	const completedWeek = done.filter((t) => {
		const d = dayOf(t);
		return d >= weekStart && d <= today;
	}).length;
	const issues = [];
	const critOverdue = overdue.filter((t) => (t.priority || "").toLowerCase() === "critical");
	if (critOverdue.length) issues.push({
		label: `${critOverdue.length} critical task${critOverdue.length === 1 ? "" : "s"} overdue`,
		detail: critOverdue.slice(0, 3).map((t) => t.title ?? "").join(" · "),
		severity: "high"
	});
	const stale = overdue.filter((t) => {
		const due = t.dueDate ? (/* @__PURE__ */ new Date(`${t.dueDate}T00:00:00`)).getTime() : 0;
		const now = (/* @__PURE__ */ new Date(`${today}T00:00:00`)).getTime();
		return due && (now - due) / 864e5 >= 14;
	});
	if (stale.length) issues.push({
		label: `${stale.length} task${stale.length === 1 ? "" : "s"} stuck for 2+ weeks`,
		detail: "Decide now: do it, delegate it, reschedule it, or delete it.",
		severity: "medium"
	});
	const unpaid = payments.filter((p) => (p.status || "").toLowerCase() !== "paid" && p.dueDate && p.dueDate <= weekEnd);
	const unpaidOverdue = unpaid.filter((p) => (p.dueDate ?? "") < today);
	if (unpaidOverdue.length) issues.push({
		label: `${unpaidOverdue.length} bill${unpaidOverdue.length === 1 ? "" : "s"} past due`,
		detail: unpaidOverdue.slice(0, 3).map((p) => `${p.title ?? "Bill"} ${money(p)}`).join(" · "),
		severity: "high"
	});
	const unpaidSoon = unpaid.filter((p) => (p.dueDate ?? "") >= today);
	if (unpaidSoon.length) issues.push({
		label: `${unpaidSoon.length} bill${unpaidSoon.length === 1 ? "" : "s"} due this week`,
		detail: unpaidSoon.slice(0, 3).map((p) => `${p.title ?? "Bill"} ${money(p)} · ${p.dueDate}`).join(" · "),
		severity: "medium"
	});
	if (backlog.length >= 10) issues.push({
		label: `${backlog.length} tasks have no due date`,
		detail: "Undated work needs planning — choose the next few intentionally.",
		severity: "low"
	});
	if (!issues.length && overdue.length === 0) issues.push({
		label: "No blockers detected",
		detail: "Nothing overdue, nothing past due on bills. Clean board.",
		severity: "low"
	});
	const templateData = {
		date: today,
		overdue: overdue.slice(0, 100).map((t) => shape(t, today)),
		dueToday: dueToday.slice(0, 100).map((t) => shape(t, today)),
		dueTomorrow: dueTomorrow.slice(0, 50).map((t) => shape(t, today)),
		upcoming: upcoming.slice(0, 50).map((t) => shape(t, today)),
		backlog: backlog.slice(0, 15).map((t) => shape(t, today)),
		completed: completedTodayList.slice(0, 30).map((t) => shape(t, today)),
		completedToday: completedTodayList.length,
		completedWeek,
		totalOpen: open.length,
		inProgress: inProgress.length,
		issues: issues.slice(0, 6)
	};
	const { sendTemplateEmail } = await import("./send-email-FVJL45-y.mjs");
	const runTag = new URL(request.url).searchParams.get("run");
	const result = await sendTemplateEmail("overdue-digest", "", {
		templateData,
		idempotencyKey: `mc-daily-briefing-${today}${runTag ? `-${runTag}` : ""}`
	});
	return Response.json({
		ok: true,
		...result,
		counts: {
			overdue: overdue.length,
			dueToday: dueToday.length,
			dueTomorrow: dueTomorrow.length,
			upcoming: upcoming.length,
			backlog: backlog.length,
			completedToday: completedTodayList.length,
			completedWeek,
			issues: issues.length
		}
	});
}
var Route$4 = createFileRoute("/api/public/digest")({ server: { handlers: {
	GET: ({ request }) => run(request),
	POST: ({ request }) => run(request)
} } });
function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}
var SYSTEM_PROMPT = `You are the capture brain of "Mission Control", a personal work dashboard.
You receive a raw voice transcript in ANY language. Clean it up and turn it into one structured item.

Rules:
- ALWAYS keep the speaker's original language for title and cleanedTranscript. Never translate.
- Fix obvious speech-recognition errors, punctuation, casing, diacritics and de-duplicate stuttered/repeated phrases.
- Set language to the BCP-47 code of the detected spoken language (e.g. en, el, de, fr).
- NEVER invent content that was not said.
- Classify into exactly one of: tasks | notes | ideas | links.
- title: a short, human, imperative summary (max 80 chars, no trailing period).
- cleanedTranscript: the full corrected text of what was said.
- For tasks: set priority (critical|high|medium|low) and dueDate (YYYY-MM-DD) resolved from natural language relative to the provided current date. If no date is mentioned, use the current date.
- For tasks: if the speaker lists several actions, put the extra ones in subtasks (array of short strings).
- For tasks: startTime/endTime as HH:MM (24h) only if a time was actually mentioned.
- For links: extract the url (add https:// if missing).
- tags: 1-4 short lowercase keywords.
You MUST call the capture_item tool.`;
var TOOL_SCHEMA = {
	type: "object",
	properties: {
		type: {
			type: "string",
			enum: [
				"tasks",
				"notes",
				"ideas",
				"links"
			]
		},
		language: { type: "string" },
		title: { type: "string" },
		cleanedTranscript: { type: "string" },
		priority: {
			type: "string",
			enum: [
				"critical",
				"high",
				"medium",
				"low"
			]
		},
		dueDate: { type: "string" },
		startTime: { type: "string" },
		endTime: { type: "string" },
		url: { type: "string" },
		subtasks: {
			type: "array",
			items: { type: "string" }
		},
		tags: {
			type: "array",
			items: { type: "string" }
		}
	},
	required: [
		"type",
		"title",
		"cleanedTranscript"
	]
};
var Route$3 = createFileRoute("/api/voice/transcribe")({ server: { handlers: { POST: async ({ request }) => {
	if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) return json({ error: "Expected multipart/form-data upload." }, 400);
	const form = await request.formData();
	const file = form.get("audio");
	const browserTranscript = String(form.get("browserTranscript") ?? "").trim();
	const hasAudio = file instanceof File && file.size > 0;
	if (!browserTranscript) {
		if (hasAudio) return json({
			error: "Could not transcribe audio in this browser. Try Chrome, or type your note below.",
			allowTextFallback: true
		}, 200);
		return json({ error: "No audio or transcript received." }, 400);
	}
	if (isAnthropicAvailable()) {
		const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		const structured = await anthropicToolUse(`${SYSTEM_PROMPT}\nCurrent date: ${today}.`, `Transcript:\n"""${browserTranscript}"""`, {
			name: "capture_item",
			description: "Structure a voice capture into a Mission Control item",
			input_schema: TOOL_SCHEMA
		});
		if (structured) return json({
			transcript: structured.cleanedTranscript || browserTranscript,
			source: "browser",
			structured
		});
	}
	return json({
		transcript: browserTranscript,
		source: "browser",
		structured: null
	});
} } } });
var SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Html, {
	lang: "en",
	dir: "ltr",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Head, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Preview, { children: ["Confirm your email for ", siteName] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
			style: main$5,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, {
				style: container$5,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading, {
						style: h1$5,
						children: "Confirm your email"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
						style: text$5,
						children: [
							"Thanks for signing up for",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								href: siteUrl,
								style: link$2,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: siteName })
							}),
							"!"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
						style: text$5,
						children: [
							"Please confirm your email address (",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								href: `mailto:${recipient}`,
								style: link$2,
								children: recipient
							}),
							") by clicking the button below:"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						style: button$4,
						href: confirmationUrl,
						children: "Verify Email"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: footer$5,
						children: "If you didn't create an account, you can safely ignore this email."
					})
				]
			})
		})
	]
});
var main$5 = {
	backgroundColor: "#ffffff",
	fontFamily: "Arial, sans-serif"
};
var container$5 = { padding: "20px 25px" };
var h1$5 = {
	fontSize: "22px",
	fontWeight: "bold",
	color: "#000000",
	margin: "0 0 20px"
};
var text$5 = {
	fontSize: "14px",
	color: "#55575d",
	lineHeight: "1.5",
	margin: "0 0 25px"
};
var link$2 = {
	color: "inherit",
	textDecoration: "underline"
};
var button$4 = {
	backgroundColor: "#000000",
	color: "#ffffff",
	fontSize: "14px",
	borderRadius: "8px",
	padding: "12px 20px",
	textDecoration: "none"
};
var footer$5 = {
	fontSize: "12px",
	color: "#999999",
	margin: "30px 0 0"
};
var InviteEmail = ({ siteName, siteUrl, confirmationUrl }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Html, {
	lang: "en",
	dir: "ltr",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Head, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Preview, { children: ["You've been invited to join ", siteName] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
			style: main$4,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, {
				style: container$4,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading, {
						style: h1$4,
						children: "You've been invited"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
						style: text$4,
						children: [
							"You've been invited to join",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								href: siteUrl,
								style: link$1,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: siteName })
							}),
							". Click the button below to accept the invitation and create your account."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						style: button$3,
						href: confirmationUrl,
						children: "Accept Invitation"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: footer$4,
						children: "If you weren't expecting this invitation, you can safely ignore this email."
					})
				]
			})
		})
	]
});
var main$4 = {
	backgroundColor: "#ffffff",
	fontFamily: "Arial, sans-serif"
};
var container$4 = { padding: "20px 25px" };
var h1$4 = {
	fontSize: "22px",
	fontWeight: "bold",
	color: "#000000",
	margin: "0 0 20px"
};
var text$4 = {
	fontSize: "14px",
	color: "#55575d",
	lineHeight: "1.5",
	margin: "0 0 25px"
};
var link$1 = {
	color: "inherit",
	textDecoration: "underline"
};
var button$3 = {
	backgroundColor: "#000000",
	color: "#ffffff",
	fontSize: "14px",
	borderRadius: "8px",
	padding: "12px 20px",
	textDecoration: "none"
};
var footer$4 = {
	fontSize: "12px",
	color: "#999999",
	margin: "30px 0 0"
};
var MagicLinkEmail = ({ siteName, confirmationUrl }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Html, {
	lang: "en",
	dir: "ltr",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Head, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Preview, { children: ["Your login link for ", siteName] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
			style: main$3,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, {
				style: container$3,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading, {
						style: h1$3,
						children: "Your login link"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
						style: text$3,
						children: [
							"Click the button below to log in to ",
							siteName,
							". This link will expire shortly."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						style: button$2,
						href: confirmationUrl,
						children: "Log In"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: footer$3,
						children: "If you didn't request this link, you can safely ignore this email."
					})
				]
			})
		})
	]
});
var main$3 = {
	backgroundColor: "#ffffff",
	fontFamily: "Arial, sans-serif"
};
var container$3 = { padding: "20px 25px" };
var h1$3 = {
	fontSize: "22px",
	fontWeight: "bold",
	color: "#000000",
	margin: "0 0 20px"
};
var text$3 = {
	fontSize: "14px",
	color: "#55575d",
	lineHeight: "1.5",
	margin: "0 0 25px"
};
var button$2 = {
	backgroundColor: "#000000",
	color: "#ffffff",
	fontSize: "14px",
	borderRadius: "8px",
	padding: "12px 20px",
	textDecoration: "none"
};
var footer$3 = {
	fontSize: "12px",
	color: "#999999",
	margin: "30px 0 0"
};
var RecoveryEmail = ({ siteName, confirmationUrl }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Html, {
	lang: "en",
	dir: "ltr",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Head, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Preview, { children: ["Reset your password for ", siteName] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
			style: main$2,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, {
				style: container$2,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading, {
						style: h1$2,
						children: "Reset your password"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
						style: text$2,
						children: [
							"We received a request to reset your password for ",
							siteName,
							". Click the button below to choose a new password."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						style: button$1,
						href: confirmationUrl,
						children: "Reset Password"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: footer$2,
						children: "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed."
					})
				]
			})
		})
	]
});
var main$2 = {
	backgroundColor: "#ffffff",
	fontFamily: "Arial, sans-serif"
};
var container$2 = { padding: "20px 25px" };
var h1$2 = {
	fontSize: "22px",
	fontWeight: "bold",
	color: "#000000",
	margin: "0 0 20px"
};
var text$2 = {
	fontSize: "14px",
	color: "#55575d",
	lineHeight: "1.5",
	margin: "0 0 25px"
};
var button$1 = {
	backgroundColor: "#000000",
	color: "#ffffff",
	fontSize: "14px",
	borderRadius: "8px",
	padding: "12px 20px",
	textDecoration: "none"
};
var footer$2 = {
	fontSize: "12px",
	color: "#999999",
	margin: "30px 0 0"
};
var EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Html, {
	lang: "en",
	dir: "ltr",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Head, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Preview, { children: ["Confirm your email change for ", siteName] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
			style: main$1,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, {
				style: container$1,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading, {
						style: h1$1,
						children: "Confirm your email change"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Text, {
						style: text$1,
						children: [
							"You requested to change your email address for ",
							siteName,
							" from",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								href: `mailto:${oldEmail}`,
								style: link,
								children: oldEmail
							}),
							" ",
							"to",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								href: `mailto:${newEmail}`,
								style: link,
								children: newEmail
							}),
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: text$1,
						children: "Click the button below to confirm this change:"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						style: button,
						href: confirmationUrl,
						children: "Confirm Email Change"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: footer$1,
						children: "If you didn't request this change, please secure your account immediately."
					})
				]
			})
		})
	]
});
var main$1 = {
	backgroundColor: "#ffffff",
	fontFamily: "Arial, sans-serif"
};
var container$1 = { padding: "20px 25px" };
var h1$1 = {
	fontSize: "22px",
	fontWeight: "bold",
	color: "#000000",
	margin: "0 0 20px"
};
var text$1 = {
	fontSize: "14px",
	color: "#55575d",
	lineHeight: "1.5",
	margin: "0 0 25px"
};
var link = {
	color: "inherit",
	textDecoration: "underline"
};
var button = {
	backgroundColor: "#000000",
	color: "#ffffff",
	fontSize: "14px",
	borderRadius: "8px",
	padding: "12px 20px",
	textDecoration: "none"
};
var footer$1 = {
	fontSize: "12px",
	color: "#999999",
	margin: "30px 0 0"
};
var ReauthenticationEmail = ({ token }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Html, {
	lang: "en",
	dir: "ltr",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Head, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Preview, { children: "Your verification code" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
			style: main,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, {
				style: container,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading, {
						style: h1,
						children: "Confirm reauthentication"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: text,
						children: "Use the code below to confirm your identity:"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: codeStyle,
						children: token
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						style: footer,
						children: "This code will expire shortly. If you didn't request this, you can safely ignore this email."
					})
				]
			})
		})
	]
});
var main = {
	backgroundColor: "#ffffff",
	fontFamily: "Arial, sans-serif"
};
var container = { padding: "20px 25px" };
var h1 = {
	fontSize: "22px",
	fontWeight: "bold",
	color: "#000000",
	margin: "0 0 20px"
};
var text = {
	fontSize: "14px",
	color: "#55575d",
	lineHeight: "1.5",
	margin: "0 0 25px"
};
var codeStyle = {
	fontFamily: "Courier, monospace",
	fontSize: "22px",
	fontWeight: "bold",
	color: "#000000",
	margin: "0 0 30px"
};
var footer = {
	fontSize: "12px",
	color: "#999999",
	margin: "30px 0 0"
};
var EMAIL_TEMPLATES = {
	signup: SignupEmail,
	invite: InviteEmail,
	magiclink: MagicLinkEmail,
	recovery: RecoveryEmail,
	email_change: EmailChangeEmail,
	reauthentication: ReauthenticationEmail
};
var SITE_NAME$1 = "mission-control-001";
var SAMPLE_PROJECT_URL = "https://mission-control-001.lovable.app";
var SAMPLE_EMAIL = "user@example.test";
var SAMPLE_DATA = {
	signup: {
		siteName: SITE_NAME$1,
		siteUrl: SAMPLE_PROJECT_URL,
		recipient: SAMPLE_EMAIL,
		confirmationUrl: SAMPLE_PROJECT_URL
	},
	magiclink: {
		siteName: SITE_NAME$1,
		confirmationUrl: SAMPLE_PROJECT_URL
	},
	recovery: {
		siteName: SITE_NAME$1,
		confirmationUrl: SAMPLE_PROJECT_URL
	},
	invite: {
		siteName: SITE_NAME$1,
		siteUrl: SAMPLE_PROJECT_URL,
		confirmationUrl: SAMPLE_PROJECT_URL
	},
	email_change: {
		siteName: SITE_NAME$1,
		oldEmail: SAMPLE_EMAIL,
		email: SAMPLE_EMAIL,
		newEmail: SAMPLE_EMAIL,
		confirmationUrl: SAMPLE_PROJECT_URL
	},
	reauthentication: { token: "123456" }
};
var Route$2 = createFileRoute("/lovable/email/auth/preview")({ server: { handlers: { POST: async ({ request }) => {
	const apiKey = process.env["LOVABLE_API_KEY"];
	if (!apiKey) return Response.json({ error: "Server configuration error" }, { status: 500 });
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || authHeader !== `Bearer ${apiKey}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
	let type;
	try {
		type = (await request.json()).type;
	} catch {
		return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
	}
	const EmailTemplate = EMAIL_TEMPLATES[type];
	if (!EmailTemplate) return Response.json({ error: `Unknown email type: ${type}` }, { status: 400 });
	const sampleData = SAMPLE_DATA[type] || {};
	const html = await render(import_react.createElement(EmailTemplate, sampleData));
	return new Response(html, {
		status: 200,
		headers: { "Content-Type": "text/html; charset=utf-8" }
	});
} } } });
var SITE_NAME = "mission-control-001";
var SENDER_DOMAIN = "notify.webmarketingbooks.com";
var ROOT_DOMAIN = "webmarketingbooks.com";
var FROM_DOMAIN = "webmarketingbooks.com";
var SITE_URL = `https://${ROOT_DOMAIN}`;
var Route$1 = createFileRoute("/lovable/email/auth/webhook")({ server: { handlers: { POST: ({ request }) => {
	return createAuthEmailHandler({
		apiKey: process.env["LOVABLE_API_KEY"],
		from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
		senderDomain: SENDER_DOMAIN,
		sendUrl: process.env["LOVABLE_SEND_URL"],
		emails: {
			signup: {
				subject: "Confirm your email",
				render: (data) => import_react.createElement(SignupEmail, {
					siteName: SITE_NAME,
					siteUrl: SITE_URL,
					recipient: data.email,
					confirmationUrl: data.url
				})
			},
			invite: {
				subject: "You've been invited",
				render: (data) => import_react.createElement(InviteEmail, {
					siteName: SITE_NAME,
					siteUrl: SITE_URL,
					confirmationUrl: data.url
				})
			},
			magiclink: {
				subject: "Your login link",
				render: (data) => import_react.createElement(MagicLinkEmail, {
					siteName: SITE_NAME,
					confirmationUrl: data.url
				})
			},
			recovery: {
				subject: "Reset your password",
				render: (data) => import_react.createElement(RecoveryEmail, {
					siteName: SITE_NAME,
					confirmationUrl: data.url
				})
			},
			email_change: {
				subject: "Confirm your new email",
				render: (data) => import_react.createElement(EmailChangeEmail, {
					siteName: SITE_NAME,
					oldEmail: data.old_email ?? "",
					email: data.email,
					newEmail: data.new_email ?? "",
					confirmationUrl: data.url
				})
			},
			reauthentication: {
				subject: "Your verification code",
				render: (data) => import_react.createElement(ReauthenticationEmail, { token: data.token ?? "" })
			}
		}
	})(request);
} } } });
var Route = createFileRoute("/lovable/email/transactional/preview")({ server: { handlers: { POST: async ({ request }) => {
	const apiKey = process.env["LOVABLE_API_KEY"];
	if (!apiKey) return Response.json({ error: "Server configuration error" }, { status: 500 });
	if (request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") !== apiKey) return Response.json({ error: "Unauthorized" }, { status: 401 });
	const templateNames = Object.keys(TEMPLATES);
	const results = [];
	for (const name of templateNames) {
		const entry = TEMPLATES[name];
		const displayName = entry.displayName || name;
		if (!entry.previewData) {
			results.push({
				templateName: name,
				displayName,
				subject: "",
				html: "",
				status: "preview_data_required"
			});
			continue;
		}
		try {
			const html = await render(import_react.createElement(entry.component, entry.previewData));
			const resolvedSubject = typeof entry.subject === "function" ? entry.subject(entry.previewData) : entry.subject;
			results.push({
				templateName: name,
				displayName,
				subject: resolvedSubject,
				html,
				status: "ready"
			});
		} catch (err) {
			console.error("Failed to render template for preview", {
				template: name,
				error: err
			});
			results.push({
				templateName: name,
				displayName,
				subject: "",
				html: "",
				status: "render_failed",
				errorMessage: err instanceof Error ? err.message : String(err)
			});
		}
	}
	return Response.json({ templates: results });
} } } });
var rootRouteChildren = {
	IndexRoute: Route$5.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$6
	}),
	ApiPublicDigestRoute: Route$4.update({
		id: "/api/public/digest",
		path: "/api/public/digest",
		getParentRoute: () => Route$6
	}),
	ApiVoiceTranscribeRoute: Route$3.update({
		id: "/api/voice/transcribe",
		path: "/api/voice/transcribe",
		getParentRoute: () => Route$6
	}),
	LovableEmailAuthPreviewRoute: Route$2.update({
		id: "/lovable/email/auth/preview",
		path: "/lovable/email/auth/preview",
		getParentRoute: () => Route$6
	}),
	LovableEmailAuthWebhookRoute: Route$1.update({
		id: "/lovable/email/auth/webhook",
		path: "/lovable/email/auth/webhook",
		getParentRoute: () => Route$6
	}),
	LovableEmailTransactionalPreviewRoute: Route.update({
		id: "/lovable/email/transactional/preview",
		path: "/lovable/email/transactional/preview",
		getParentRoute: () => Route$6
	})
};
var routeTree = Route$6._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter, router_CS6FDmAd_exports as t };
