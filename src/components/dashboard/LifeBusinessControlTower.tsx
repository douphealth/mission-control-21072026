import { useMemo } from "react";
import {
  Activity,
  AppWindow,
  ArrowUpRight,
  BriefcaseBusiness,
  Cloud,
  Github,
  Globe2,
  HeartPulse,
  Lightbulb,
  NotebookText,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  useAudienceAccounts,
  useBuildProjects,
  useHabits,
  useIdeas,
  useNotes,
  usePayments,
  useReminders,
  useRepos,
  useSEOActions,
  useSEOIssues,
  useSyncHealth,
  useTasks,
  useWebsites,
} from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { todayISO } from "@/lib/overdue";
import { usePlanStore, type AreaFilter } from "@/stores/planStore";

const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function LifeBusinessControlTower() {
  const tasks = useTasks();
  const websites = useWebsites();
  const repos = useRepos();
  const builds = useBuildProjects();
  const payments = usePayments();
  const habits = useHabits();
  const reminders = useReminders();
  const notes = useNotes();
  const ideas = useIdeas();
  const seoIssues = useSEOIssues();
  const seoActions = useSEOActions();
  const syncHealth = useSyncHealth();
  const audienceAccounts = useAudienceAccounts();
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const setArea = usePlanStore((state) => state.setArea);
  const today = todayISO();

  const openTasks = tasks.filter((task) => task.status !== "done");
  const workTasks = openTasks.filter((task) => (task.area ?? "work") === "work");
  const personalTasks = openTasks.filter((task) => task.area === "personal");
  const workBlocked = workTasks.filter((task) => task.status === "blocked");
  const workDueToday = workTasks.filter((task) => task.dueDate === today);
  const activeWebsites = websites.filter((site) => site.status === "active");
  const criticalSites = activeWebsites.filter((site) => site.priority === "critical");
  const deployedBuilds = builds.filter((build) => build.status === "deployed");
  const openSeoIssues = seoIssues.filter((issue) => issue.status !== "resolved");
  const majorSeoIssues = openSeoIssues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "high",
  );
  const readySeoActions = seoActions.filter(
    (action) =>
      action.status === "ready" ||
      action.status === "in-progress" ||
      action.status === "blocked",
  );
  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending" || payment.status === "overdue",
  );
  const overduePayments = payments.filter((payment) => payment.status === "overdue");
  const pendingReminders = reminders.filter((reminder) => reminder.status === "pending");
  const todayHabitCompletions = habits.filter((habit) => habit.completions.includes(today)).length;
  const syncProblems = syncHealth.filter((item) => item.status === "error" || item.status === "stale");
  const unconfiguredSyncs = syncHealth.filter((item) => item.status === "not-configured");

  const topWork = useMemo(
    () =>
      [...workTasks]
        .sort(
          (a, b) =>
            (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) ||
            (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
        )
        .slice(0, 2),
    [workTasks],
  );

  const topPersonal = useMemo(
    () =>
      [...personalTasks]
        .sort(
          (a, b) =>
            (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) ||
            (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
        )
        .slice(0, 2),
    [personalTasks],
  );

  const cards = [
    {
      id: "tasks",
      title: "Business execution",
      icon: BriefcaseBusiness,
      value: workTasks.length,
      suffix: "open",
      detail: workDueToday.length + " due today · " + workBlocked.length + " blocked",
      tone: "primary",
      area: "work" as AreaFilter,
      rows: topWork.map((task) => task.title),
    },
    {
      id: "tasks",
      title: "Personal",
      icon: UserRound,
      value: personalTasks.length,
      suffix: "open",
      detail:
        pendingReminders.length +
        " reminders · " +
        todayHabitCompletions +
        "/" +
        habits.length +
        " habits today",
      tone: "violet",
      area: "personal" as AreaFilter,
      rows: topPersonal.map((task) => task.title),
    },
    {
      id: "websites",
      title: "Websites",
      icon: Globe2,
      value: activeWebsites.length,
      suffix: "active",
      detail: criticalSites.length + " critical · " + majorSeoIssues.length + " major SEO findings",
      tone: "info",
      rows: activeWebsites
        .slice()
        .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
        .slice(0, 2)
        .map((site) => site.name),
    },
    {
      id: "seo",
      title: "SEO / AI visibility",
      icon: Search,
      value: openSeoIssues.length,
      suffix: "findings",
      detail: readySeoActions.length + " actions ready or active",
      tone: majorSeoIssues.length ? "warning" : "success",
      rows: openSeoIssues
        .slice()
        .sort((a, b) => (priorityRank[a.severity] ?? 9) - (priorityRank[b.severity] ?? 9))
        .slice(0, 2)
        .map((issue) => issue.title),
    },
    {
      id: "apps-funnels",
      title: "Apps & builds",
      icon: AppWindow,
      value: deployedBuilds.length,
      suffix: "deployed",
      detail: builds.length + " tracked products/builds",
      tone: "violet",
      rows: builds
        .slice()
        .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
        .slice(0, 2)
        .map((build) => build.productName || build.name),
    },
    {
      id: "github",
      title: "GitHub portfolio",
      icon: Github,
      value: repos.length,
      suffix: "repos",
      detail: "Technical catalog hydrated at startup",
      tone: "neutral",
      rows: ["GitHub = technical truth", "Mission Control = planning truth"],
    },
    {
      id: "payments",
      title: "Finance",
      icon: WalletCards,
      value: pendingPayments.length,
      suffix: "pending",
      detail: overduePayments.length + " overdue · mixed currencies never combined",
      tone: overduePayments.length ? "danger" : "success",
      rows: payments.length ? [] : ["No real transactions yet"],
    },
    {
      id: habits.length ? "habits" : "reminders",
      title: "Life systems",
      icon: HeartPulse,
      value: habits.length + pendingReminders.length,
      suffix: "tracked",
      detail: habits.length + " habits · " + pendingReminders.length + " reminders",
      tone: "success",
      rows: habits.slice(0, 2).map((habit) => habit.name),
    },
    {
      id: notes.length ? "notes" : "ideas",
      title: "Knowledge & ideas",
      icon: NotebookText,
      value: notes.length + ideas.length,
      suffix: "items",
      detail: notes.length + " notes · " + ideas.length + " ideas",
      tone: "info",
      rows: notes.slice(0, 1).map((note) => note.title).concat(ideas.slice(0, 1).map((idea) => idea.title)),
    },
    {
      id: "settings",
      title: "System health",
      icon: Cloud,
      value: syncProblems.length,
      suffix: "issues",
      detail: unconfiguredSyncs.length + " integrations not configured",
      tone: syncProblems.length ? "danger" : unconfiguredSyncs.length ? "warning" : "success",
      rows: syncHealth.slice(0, 2).map((item) => item.label + ": " + item.status.replace("-", " ")),
    },
    {
      id: "audience",
      title: "Audience & mentions",
      icon: Radar,
      value: audienceAccounts.length,
      suffix: "accounts",
      detail: "Unknown metrics stay unknown until observed",
      tone: "neutral",
      rows: ["No invented follower counts"],
    },
    {
      id: "ideas",
      title: "Ideas pipeline",
      icon: Lightbulb,
      value: ideas.filter((idea) => idea.status !== "parked").length,
      suffix: "active",
      detail: ideas.filter((idea) => idea.status === "validated").length + " validated",
      tone: "violet",
      rows: ideas.filter((idea) => idea.status !== "parked").slice(0, 2).map((idea) => idea.title),
    },
  ] as const;

  return (
    <section className="mc-tower" aria-label="Life and business control tower">
      <div className="mc-tower-head">
        <div>
          <div className="mc-tower-eyebrow">
            <Sparkles size={12} /> Life &amp; business control tower
          </div>
          <h2>Everything important, without opening ten dashboards.</h2>
          <p>
            Real records only. Missing integrations stay unknown or not configured instead of
            showing fake zeros.
          </p>
        </div>
        <div className="mc-tower-truth">
          <span className="mc-tower-live-dot" />
          {websites.length > 0 && repos.length > 0 ? "Portfolio loaded" : "Data setup in progress"}
        </div>
      </div>

      <div className="mc-tower-grid">
        {cards.map((card) => (
          <button
            type="button"
            key={card.title}
            onClick={() => {
              if ("area" in card && card.area) setArea(card.area);
              setActiveSection(card.id);
            }}
            className="mc-tower-card"
            data-tone={card.tone}
          >
            <span className="mc-tower-card-top">
              <span className="mc-tower-card-icon">
                <card.icon size={17} />
              </span>
              <span className="mc-tower-card-title">{card.title}</span>
              <ArrowUpRight size={13} className="mc-tower-card-arrow" />
            </span>
            <span className="mc-tower-card-metric">
              <strong>{card.value}</strong>
              <small>{card.suffix}</small>
            </span>
            <span className="mc-tower-card-detail">{card.detail}</span>
            <span className="mc-tower-card-rows">
              {card.rows.length ? (
                card.rows.map((row) => <span key={row}>{row}</span>)
              ) : (
                <span>Open workspace for details</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="mc-tower-footer">
        <button onClick={() => setActiveSection("review")}>
          <ShieldCheck size={13} /> Weekly review
        </button>
        <button onClick={() => setActiveSection("control-center")}>
          <Activity size={13} /> Captures
        </button>
        <button onClick={() => setActiveSection("settings")}>
          <Cloud size={13} /> Connections &amp; data
        </button>
      </div>
    </section>
  );
}
