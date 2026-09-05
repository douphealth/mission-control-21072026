// Public cron endpoint: builds the full daily briefing from the owner's cloud
// records and emails it. Called by a scheduled job (pg_cron) once a day.
// Security: requires the shared digest secret AND an explicit owner user id.
import { createFileRoute } from "@tanstack/react-router";

interface TaskLike {
  title?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  startTime?: string;
  completedAt?: string;
  updatedAt?: string;
}

interface PaymentLike {
  title?: string;
  amount?: number;
  currency?: string;
  status?: string;
  dueDate?: string;
  to?: string;
  type?: string;
}

const RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const DIGEST_TIME_ZONE = "Europe/Athens";

function isoDay(offsetDays = 0, tz = DIGEST_TIME_ZONE): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

function sortTasks(list: TaskLike[]) {
  return [...list].sort((a, b) => {
    const p = (RANK[a.priority ?? ""] ?? 9) - (RANK[b.priority ?? ""] ?? 9);
    if (p !== 0) return p;
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });
}

function shape(t: TaskLike, today: string) {
  const due = t.dueDate ? new Date(`${t.dueDate}T00:00:00`).getTime() : 0;
  const now = new Date(`${today}T00:00:00`).getTime();
  return {
    title: String(t.title ?? "").slice(0, 300),
    priority: t.priority ?? "medium",
    dueDate: t.dueDate ?? "",
    startTime: t.startTime ?? "",
    daysOverdue: due ? Math.max(0, Math.round((now - due) / 86_400_000)) : 0,
  };
}

function money(p: PaymentLike) {
  const amt = typeof p.amount === "number" ? p.amount : 0;
  const cur = (p.currency || "EUR").toUpperCase();
  const symbol = cur === "EUR" ? "€" : cur === "USD" ? "$" : cur === "GBP" ? "£" : `${cur} `;
  return `${symbol}${amt.toFixed(2)}`;
}

async function run(request: Request) {
  const provided =
    request.headers.get("x-digest-secret") ?? new URL(request.url).searchParams.get("secret");
  if (!provided) return new Response("Unauthorized", { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const envSecret = process.env["DIGEST_CRON_SECRET"];
  let authorized = !!envSecret && provided === envSecret;
  if (!authorized) {
    const { data: tok } = await supabaseAdmin
      .from("mc_cron_tokens")
      .select("token")
      .eq("name", "digest")
      .maybeSingle();
    authorized = !!tok?.token && tok.token === provided;
  }
  if (!authorized) return new Response("Unauthorized", { status: 401 });

  // Service-role queries bypass RLS. Never run a global digest: production
  // must declare the single Mission Control owner explicitly and fail closed
  // when that deployment setting is absent.
  const ownerUserId = process.env["MISSION_CONTROL_OWNER_USER_ID"]?.trim();
  if (!ownerUserId) {
    console.error("[digest] MISSION_CONTROL_OWNER_USER_ID is required");
    return Response.json({ ok: false, error: "Digest owner is not configured" }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from("mc_records")
    .select("collection, data")
    .eq("user_id", ownerUserId)
    .in("collection", ["tasks", "payments"])
    .eq("deleted", false)
    .limit(8000);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as { collection: string; data: unknown }[];
  const tasks: TaskLike[] = rows
    .filter((r) => r.collection === "tasks")
    .map((r) => r.data as TaskLike)
    .filter(Boolean);
  const payments: PaymentLike[] = rows
    .filter((r) => r.collection === "payments")
    .map((r) => r.data as PaymentLike)
    .filter(Boolean);

  const today = isoDay(0);
  const tomorrow = isoDay(1);
  const weekEnd = isoDay(7);
  const weekStart = isoDay(-6);

  const open = tasks.filter((t) => t && t.status !== "done");
  const done = tasks.filter((t) => t?.status === "done");

  const overdue = sortTasks(open.filter((t) => t.dueDate && t.dueDate < today));
  const dueToday = sortTasks(open.filter((t) => t.dueDate === today));
  const dueTomorrow = sortTasks(open.filter((t) => t.dueDate === tomorrow));
  const upcoming = sortTasks(
    open.filter((t) => t.dueDate && t.dueDate > tomorrow && t.dueDate <= weekEnd),
  );
  const backlog = sortTasks(open.filter((t) => !t.dueDate));
  const inProgress = open.filter((t) => t.status === "in-progress" || t.status === "doing");

  const dayOf = (t: TaskLike) => (t.completedAt || t.updatedAt || "").slice(0, 10);
  const completedTodayList = done.filter((t) => dayOf(t) === today);
  const completedWeek = done.filter((t) => {
    const d = dayOf(t);
    return d >= weekStart && d <= today;
  }).length;

  const issues: { label: string; detail: string; severity: "high" | "medium" | "low" }[] = [];

  const critOverdue = overdue.filter((t) => (t.priority || "").toLowerCase() === "critical");
  if (critOverdue.length) {
    issues.push({
      label: `${critOverdue.length} critical task${critOverdue.length === 1 ? "" : "s"} overdue`,
      detail: critOverdue
        .slice(0, 3)
        .map((t) => t.title ?? "")
        .join(" · "),
      severity: "high",
    });
  }

  const stale = overdue.filter((t) => {
    const due = t.dueDate ? new Date(`${t.dueDate}T00:00:00`).getTime() : 0;
    const now = new Date(`${today}T00:00:00`).getTime();
    return due && (now - due) / 86_400_000 >= 14;
  });
  if (stale.length) {
    issues.push({
      label: `${stale.length} task${stale.length === 1 ? "" : "s"} stuck for 2+ weeks`,
      detail: "Decide now: do it, delegate it, reschedule it, or delete it.",
      severity: "medium",
    });
  }

  const unpaid = payments.filter(
    (p) => (p.status || "").toLowerCase() !== "paid" && p.dueDate && p.dueDate <= weekEnd,
  );
  const unpaidOverdue = unpaid.filter((p) => (p.dueDate ?? "") < today);
  if (unpaidOverdue.length) {
    issues.push({
      label: `${unpaidOverdue.length} bill${unpaidOverdue.length === 1 ? "" : "s"} past due`,
      detail: unpaidOverdue
        .slice(0, 3)
        .map((p) => `${p.title ?? "Bill"} ${money(p)}`)
        .join(" · "),
      severity: "high",
    });
  }
  const unpaidSoon = unpaid.filter((p) => (p.dueDate ?? "") >= today);
  if (unpaidSoon.length) {
    issues.push({
      label: `${unpaidSoon.length} bill${unpaidSoon.length === 1 ? "" : "s"} due this week`,
      detail: unpaidSoon
        .slice(0, 3)
        .map((p) => `${p.title ?? "Bill"} ${money(p)} · ${p.dueDate}`)
        .join(" · "),
      severity: "medium",
    });
  }

  if (backlog.length >= 10) {
    issues.push({
      label: `${backlog.length} tasks have no due date`,
      detail: "Undated work needs planning — choose the next few intentionally.",
      severity: "low",
    });
  }

  if (!issues.length && overdue.length === 0) {
    issues.push({
      label: "No blockers detected",
      detail: "Nothing overdue, nothing past due on bills. Clean board.",
      severity: "low",
    });
  }

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
    issues: issues.slice(0, 6),
  };

  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const runTag = new URL(request.url).searchParams.get("run");
  const result = await sendTemplateEmail("overdue-digest", "", {
    templateData,
    idempotencyKey: `mc-daily-briefing-${today}${runTag ? `-${runTag}` : ""}`,
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
      issues: issues.length,
    },
  });
}

export const Route = createFileRoute("/api/public/digest")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
