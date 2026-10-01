import {
  Activity,
  AppWindow,
  AtSign,
  Bell,
  Blocks,
  Brain,
  CheckCircle2,
  Cloud,
  DollarSign,
  ExternalLink,
  Flame,
  Focus,
  KeyRound,
  Lightbulb,
  Link2,
  ListChecks,
  Newspaper,
  Radar,
  RefreshCcw,
  Rocket,
  Scale,
  ServerCog,
  Sparkles,
  Users,
} from "lucide-react";
import {
  useAudienceAccounts,
  useAudienceReadings,
  useBuildProjects,
  useCredentials,
  useDecisions,
  useFeedSources,
  useHabits,
  useIdeas,
  useLinks,
  usePayments,
  useReminders,
  useStreamItems,
  useSyncHealth,
  useTasks,
  useWatchTerms,
  useWebsites,
} from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { todayISO } from "@/lib/overdue";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "violet" | "neutral";

type Stat = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
};

type Related = {
  label: string;
  section: string;
};

type PulseConfig = {
  group: "Operate" | "Systems & tools";
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number }>;
  stats: Stat[];
  related: Related[];
  truth: string;
};

const MANAGED = new Set([
  "review",
  "decisions",
  "control-center",
  "reminders",
  "payments",
  "builds",
  "google-tasks",
  "cloudflare",
  "vercel",
  "openclaw",
  "ideas",
  "habits",
  "credentials",
  "links",
  "industry",
  "mentions",
  "audience",
  "focus",
]);

export default function WorkspacePulseBar() {
  const activeSection = useNavigationStore((state) => state.activeSection);
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);

  const tasks = useTasks();
  const decisions = useDecisions();
  const reminders = useReminders();
  const payments = usePayments();
  const builds = useBuildProjects();
  const ideas = useIdeas();
  const habits = useHabits();
  const credentials = useCredentials();
  const links = useLinks();
  const feeds = useFeedSources();
  const terms = useWatchTerms();
  const stream = useStreamItems();
  const accounts = useAudienceAccounts();
  const readings = useAudienceReadings();
  const health = useSyncHealth();
  const websites = useWebsites();

  if (!MANAGED.has(activeSection)) return null;

  const today = todayISO();
  const openTasks = tasks.filter((task) => task.status !== "done" && !task.archived);
  const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < today);
  const blocked = openTasks.filter((task) => task.status === "blocked");
  const openDecisions = decisions.filter((decision) => decision.status === "open");
  const deferred = decisions.filter((decision) => decision.status === "later");
  const criticalDecisions = openDecisions.filter(
    (decision) => decision.severity === "critical" || decision.severity === "high",
  );
  const pendingReminders = reminders.filter((reminder) => reminder.status !== "done");
  const dueReminders = pendingReminders.filter(
    (reminder) => new Date(reminder.remindAt).getTime() <= Date.now(),
  );
  const recurringReminders = pendingReminders.filter(
    (reminder) => reminder.recurrence && reminder.recurrence !== "none",
  );
  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending" || payment.status === "overdue",
  );
  const overduePayments = payments.filter((payment) => payment.status === "overdue");
  const trackedBuilds = builds.filter(
    (build) =>
      !build.portfolioGroup ||
      build.portfolioGroup === "experiment" ||
      build.portfolioGroup === "internal",
  );
  const linkedGoogleTasks = tasks.filter((task) => Boolean(task.gtaskId));
  const deployedBuilds = trackedBuilds.filter((build) => build.status === "deployed");
  const activeIdeas = ideas.filter((idea) => idea.status !== "parked");
  const validatedIdeas = ideas.filter((idea) => idea.status === "validated");
  const buildingIdeas = ideas.filter((idea) => idea.status === "building");
  const habitsDone = habits.filter((habit) => habit.completions.includes(today));
  const activeLinks = links.filter((link) => link.status === "active");
  const enabledFeeds = feeds.filter((source) => source.enabled);
  const feedErrors = feeds.filter((source) => Boolean(source.lastError));
  const activeStories = stream.filter(
    (item) => item.kind === "industry" && item.status === "active",
  );
  const activeMentions = stream.filter(
    (item) => item.kind === "mention" && item.status === "active",
  );
  const enabledTerms = terms.filter((term) => term.enabled);
  const accountsWithReadings = new Set(
    readings.filter((reading) => reading.followers !== null).map((reading) => reading.accountId),
  );
  const audienceUnavailable = accounts.filter(
    (account) => account.lastStatus === "unavailable" || account.lastStatus === "limited",
  );
  const cloudflareSites = websites.filter((site) =>
    (site.hostingProvider || "").toLowerCase().includes("cloudflare"),
  );
  const vercelBuilds = builds.filter((build) => build.platform === "vercel");
  const openClawBuilds = builds.filter((build) =>
    [build.name, build.productName, build.description].some((value) =>
      (value || "").toLowerCase().includes("openclaw"),
    ),
  );

  const healthState = (id: string) => health.find((item) => item.id === id)?.status ?? "not-configured";

  const config: Record<string, PulseConfig> = {
    review: {
      group: "Operate",
      label: "Review pulse",
      subtitle: "Decide what stays active, what moves, and what gets removed from attention.",
      icon: RefreshCcw,
      stats: [
        { label: "Open tasks", value: openTasks.length, tone: "primary" },
        { label: "Overdue", value: overdue.length, tone: overdue.length ? "danger" : "success" },
        { label: "Blocked", value: blocked.length, tone: blocked.length ? "warning" : "success" },
      ],
      related: [
        { label: "Tasks", section: "tasks" },
        { label: "Focus", section: "focus" },
      ],
      truth: "Task records are live from Mission Control.",
    },
    decisions: {
      group: "Operate",
      label: "Findings pulse",
      subtitle: "Turn real SEO, sync, mention and task findings into explicit decisions.",
      icon: Scale,
      stats: [
        { label: "Open", value: openDecisions.length, tone: "primary" },
        { label: "Critical / high", value: criticalDecisions.length, tone: criticalDecisions.length ? "danger" : "success" },
        { label: "Deferred", value: deferred.length, tone: "neutral" },
      ],
      related: [
        { label: "Review", section: "review" },
        { label: "SEO / AI", section: "seo" },
      ],
      truth: "Findings are generated from stored evidence, never demo counts.",
    },
    "control-center": {
      group: "Operate",
      label: "Capture & intelligence pulse",
      subtitle: "One intake surface for trends, verified mentions, audience observations and reminders.",
      icon: Radar,
      stats: [
        { label: "Active stories", value: activeStories.length, tone: "info" },
        { label: "Mentions", value: activeMentions.length, tone: "violet" },
        { label: "Due reminders", value: dueReminders.length, tone: dueReminders.length ? "warning" : "success" },
      ],
      related: [
        { label: "Trends", section: "industry" },
        { label: "Mentions", section: "mentions" },
        { label: "Audience", section: "audience" },
      ],
      truth: "Collector output is shown only when actually observed.",
    },
    reminders: {
      group: "Operate",
      label: "Reminder pulse",
      subtitle: "Time-based commitments, recurring nudges and due-now items.",
      icon: Bell,
      stats: [
        { label: "Pending", value: pendingReminders.length, tone: "primary" },
        { label: "Due now", value: dueReminders.length, tone: dueReminders.length ? "danger" : "success" },
        { label: "Recurring", value: recurringReminders.length, tone: "info" },
      ],
      related: [
        { label: "Calendar", section: "calendar" },
        { label: "Tasks", section: "tasks" },
      ],
      truth: "Reminder timestamps are stored records and sync with Mission Control data.",
    },
    payments: {
      group: "Operate",
      label: "Finance pulse",
      subtitle: "Track obligations and transactions without mixing unlike currencies.",
      icon: DollarSign,
      stats: [
        { label: "Records", value: payments.length, tone: "primary" },
        { label: "Pending", value: pendingPayments.length, tone: "warning" },
        { label: "Overdue", value: overduePayments.length, tone: overduePayments.length ? "danger" : "success" },
      ],
      related: [
        { label: "Projects", section: "projects" },
        { label: "Apps & funnels", section: "apps-funnels" },
      ],
      truth: "Finance totals remain currency-separated; empty data is never treated as revenue.",
    },
    builds: {
      group: "Systems & tools",
      label: "Build portfolio pulse",
      subtitle: "Internal builds and experiments with deployment, repository and next-step context.",
      icon: Blocks,
      stats: [
        { label: "Tracked", value: trackedBuilds.length, tone: "primary" },
        { label: "Deployed", value: deployedBuilds.length, tone: "success" },
        { label: "Building / testing", value: trackedBuilds.filter((b) => b.status === "building" || b.status === "testing").length, tone: "warning" },
      ],
      related: [
        { label: "GitHub", section: "github" },
        { label: "Apps & funnels", section: "apps-funnels" },
      ],
      truth: "Verified portfolio builds are seeded globally; user planning fields stay editable.",
    },
    "google-tasks": {
      group: "Systems & tools",
      label: "Google Tasks pulse",
      subtitle: "Live Google Tasks when connected, plus Mission Control task linkage.",
      icon: ListChecks,
      stats: [
        { label: "Linked local tasks", value: linkedGoogleTasks.length, tone: "primary" },
        { label: "Open linked", value: linkedGoogleTasks.filter((task) => task.status !== "done").length, tone: "info" },
        { label: "Connector", value: healthState("google-calendar").replace("-", " "), tone: healthState("google-calendar") === "ok" ? "success" : "neutral" },
      ],
      related: [
        { label: "Tasks", section: "tasks" },
        { label: "Calendar", section: "calendar" },
      ],
      truth: "Google data appears only after OAuth succeeds; local linkage is counted separately.",
    },
    cloudflare: {
      group: "Systems & tools",
      label: "Cloudflare control pulse",
      subtitle: "DNS, security, CDN and deployment control with live API truth when connected.",
      icon: Cloud,
      stats: [
        { label: "Known hosted sites", value: cloudflareSites.length, tone: "info" },
        { label: "Saved credentials", value: credentials.filter((c) => (c.service + " " + c.label).toLowerCase().includes("cloudflare")).length, tone: "violet" },
        { label: "Portfolio links", value: activeLinks.filter((link) => link.url.includes("cloudflare.com")).length, tone: "neutral" },
      ],
      related: [
        { label: "Websites", section: "websites" },
        { label: "Credentials", section: "credentials" },
      ],
      truth: "Zone counts on the page come only from the Cloudflare API when connected.",
    },
    vercel: {
      group: "Systems & tools",
      label: "Vercel control pulse",
      subtitle: "Live deployment state when connected, with local portfolio references kept separate.",
      icon: Rocket,
      stats: [
        { label: "Local Vercel builds", value: vercelBuilds.length, tone: "primary" },
        { label: "Saved credentials", value: credentials.filter((c) => (c.service + " " + c.label).toLowerCase().includes("vercel")).length, tone: "violet" },
        { label: "Vercel links", value: activeLinks.filter((link) => link.url.includes("vercel.com")).length, tone: "neutral" },
      ],
      related: [
        { label: "Build Projects", section: "builds" },
        { label: "Credentials", section: "credentials" },
      ],
      truth: "Project/deployment counts on the page are live only when the Vercel API responds.",
    },
    openclaw: {
      group: "Systems & tools",
      label: "OpenClaw pulse",
      subtitle: "Track OpenClaw services without assuming an endpoint is healthy before probing it.",
      icon: ServerCog,
      stats: [
        { label: "Related builds", value: openClawBuilds.length, tone: "primary" },
        { label: "Related links", value: activeLinks.filter((link) => link.title.toLowerCase().includes("openclaw") || link.url.toLowerCase().includes("openclaw")).length, tone: "info" },
        { label: "Watch terms", value: terms.filter((term) => term.term.toLowerCase().includes("openclaw")).length, tone: "neutral" },
      ],
      related: [
        { label: "Build Projects", section: "builds" },
        { label: "Links Hub", section: "links" },
      ],
      truth: "Service health remains unknown until an actual probe succeeds.",
    },
    ideas: {
      group: "Systems & tools",
      label: "Ideas pipeline pulse",
      subtitle: "Move ideas from spark to validation to build without letting them become clutter.",
      icon: Lightbulb,
      stats: [
        { label: "Active", value: activeIdeas.length, tone: "primary" },
        { label: "Validated", value: validatedIdeas.length, tone: "success" },
        { label: "Building", value: buildingIdeas.length, tone: "violet" },
      ],
      related: [
        { label: "Projects", section: "projects" },
        { label: "Build Projects", section: "builds" },
      ],
      truth: "Portfolio ideas are seeded only from known operating priorities.",
    },
    habits: {
      group: "Systems & tools",
      label: "Habit pulse",
      subtitle: "Daily life-system consistency using local-day-safe completion tracking.",
      icon: Flame,
      stats: [
        { label: "Habits", value: habits.length, tone: "primary" },
        { label: "Done today", value: habitsDone.length, tone: habits.length && habitsDone.length === habits.length ? "success" : "info" },
        { label: "Best streak", value: Math.max(0, ...habits.map((habit) => habit.streak || 0)), tone: "warning" },
      ],
      related: [
        { label: "Reminders", section: "reminders" },
        { label: "Focus", section: "focus" },
      ],
      truth: "Completions use the user's local calendar day, not UTC dates.",
    },
    credentials: {
      group: "Systems & tools",
      label: "Credential vault pulse",
      subtitle: "Keep access references centralized without exposing secrets in dashboard summaries.",
      icon: KeyRound,
      stats: [
        { label: "Vault records", value: credentials.length, tone: "primary" },
        { label: "Services", value: new Set(credentials.map((credential) => credential.service || credential.label)).size, tone: "info" },
        { label: "With URLs", value: credentials.filter((credential) => Boolean(credential.url)).length, tone: "neutral" },
      ],
      related: [
        { label: "Cloudflare", section: "cloudflare" },
        { label: "Vercel", section: "vercel" },
        { label: "WordPress", section: "wp-manage" },
      ],
      truth: "No credential values are surfaced in this pulse strip.",
    },
    links: {
      group: "Systems & tools",
      label: "Links hub pulse",
      subtitle: "Production properties, apps and first-party control surfaces in one searchable library.",
      icon: Link2,
      stats: [
        { label: "Active links", value: activeLinks.length, tone: "primary" },
        { label: "Pinned", value: activeLinks.filter((link) => link.pinned).length, tone: "warning" },
        { label: "Categories", value: new Set(activeLinks.map((link) => link.category)).size, tone: "info" },
      ],
      related: [
        { label: "Websites", section: "websites" },
        { label: "Apps & funnels", section: "apps-funnels" },
      ],
      truth: "Verified portfolio website/app links are hydrated automatically.",
    },
    industry: {
      group: "Systems & tools",
      label: "Trends pulse",
      subtitle: "Focused industry monitoring from sources you explicitly track.",
      icon: Newspaper,
      stats: [
        { label: "Enabled sources", value: enabledFeeds.length, tone: "primary" },
        { label: "Active stories", value: activeStories.length, tone: "info" },
        { label: "Source errors", value: feedErrors.length, tone: feedErrors.length ? "warning" : "success" },
      ],
      related: [
        { label: "Captures", section: "control-center" },
        { label: "Ideas", section: "ideas" },
      ],
      truth: "Feed items appear only after collection; source errors remain visible.",
    },
    mentions: {
      group: "Systems & tools",
      label: "Mentions pulse",
      subtitle: "Monitor brands and domains with anchors and negative filters to reduce noise.",
      icon: AtSign,
      stats: [
        { label: "Enabled terms", value: enabledTerms.length, tone: "primary" },
        { label: "Active mentions", value: activeMentions.length, tone: "violet" },
        { label: "Never scanned", value: enabledTerms.filter((term) => !term.lastCheckedAt).length, tone: "neutral" },
      ],
      related: [
        { label: "Captures", section: "control-center" },
        { label: "Audience", section: "audience" },
      ],
      truth: "Matches are stored as observed items; no synthetic mention counts.",
    },
    audience: {
      group: "Systems & tools",
      label: "Audience pulse",
      subtitle: "Track public profiles while keeping unavailable metrics blank rather than zero.",
      icon: Users,
      stats: [
        { label: "Profiles", value: accounts.length, tone: "primary" },
        { label: "With readings", value: accountsWithReadings.size, tone: "success" },
        { label: "Limited / unavailable", value: audienceUnavailable.length, tone: audienceUnavailable.length ? "warning" : "neutral" },
      ],
      related: [
        { label: "Mentions", section: "mentions" },
        { label: "Trends", section: "industry" },
      ],
      truth: "Missing follower counts remain unknown; they are never converted to false zeros.",
    },
    focus: {
      group: "Systems & tools",
      label: "Focus pulse",
      subtitle: "Attach focused work to one real task and keep the highest-value queue in view.",
      icon: Focus,
      stats: [
        { label: "Open tasks", value: openTasks.length, tone: "primary" },
        { label: "Critical / high", value: openTasks.filter((task) => task.priority === "critical" || task.priority === "high").length, tone: "warning" },
        { label: "Blocked", value: blocked.length, tone: blocked.length ? "danger" : "success" },
      ],
      related: [
        { label: "Today", section: "dashboard" },
        { label: "Review", section: "review" },
      ],
      truth: "Focus candidates use the same priority engine as the Today workspace.",
    },
  };

  const pulse = config[activeSection];
  if (!pulse) return null;
  const Icon = pulse.icon;

  return (
    <section className="mc-workspace-pulse" data-group={pulse.group === "Operate" ? "operate" : "systems"}>
      <div className="mc-workspace-pulse-main">
        <div className="mc-workspace-pulse-icon">
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mc-workspace-pulse-eyebrow">
            <Sparkles size={10} />
            {pulse.group}
          </div>
          <div className="mc-workspace-pulse-title">{pulse.label}</div>
          <div className="mc-workspace-pulse-subtitle">{pulse.subtitle}</div>
        </div>
      </div>

      <div className="mc-workspace-pulse-stats">
        {pulse.stats.map((stat) => (
          <div key={stat.label} className="mc-workspace-pulse-stat" data-tone={stat.tone || "neutral"}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            {stat.hint && <small>{stat.hint}</small>}
          </div>
        ))}
      </div>

      <div className="mc-workspace-pulse-bottom">
        <div className="mc-workspace-pulse-truth">
          <CheckCircle2 size={11} />
          {pulse.truth}
        </div>
        <div className="mc-workspace-pulse-related">
          {pulse.related.map((item) => (
            <button key={item.section} type="button" onClick={() => setActiveSection(item.section)}>
              {item.label}
              <ExternalLink size={10} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
