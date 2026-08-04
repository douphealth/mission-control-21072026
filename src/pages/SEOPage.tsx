import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  ExternalLink,
  Eye,
  FileJson,
  Filter,
  Globe2,
  History,
  Info,
  Layers3,
  ListChecks,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import FormModal, { FormField, FormInput, FormSelect, FormTextarea } from "@/components/FormModal";
import {
  useAddItem,
  useSEOActions,
  useSEOChanges,
  useSEOIssues,
  useSEOProfiles,
  useSEOSnapshots,
  useSEOVisibilityChecks,
  useUpdateItem,
  useWebsites,
} from "@/hooks/useTableData";
import type {
  SEOAction,
  SEOActionStatus,
  SEODataSource,
  SEOIssue,
  SEOProfile,
  SEOPriority,
  SEOSnapshot,
  Website,
} from "@/lib/db";
import { useNavigationStore } from "@/stores/navigationStore";

const SOURCE_LABELS: Record<SEODataSource, string> = {
  gsc: "Search Console",
  bing: "Bing Webmaster",
  ga4: "Analytics",
  crawl: "Crawler",
  pagespeed: "PageSpeed",
  manual: "Manual evidence",
};

const PRIORITY_RANK: Record<SEOPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_CLASSES: Record<SEOPriority, string> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
};

const SOURCE_CLASSES: Record<SEODataSource, string> = {
  gsc: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  bing: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  ga4: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  crawl: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  pagespeed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  manual: "bg-secondary text-muted-foreground",
};

const DATA_SOURCES = Object.keys(SOURCE_LABELS) as SEODataSource[];

function isSEODataSource(value: unknown): value is SEODataSource {
  return typeof value === "string" && DATA_SOURCES.includes(value as SEODataSource);
}

const EMPTY_PROFILE_FORM = {
  priority: "medium" as SEOPriority,
  gscProperty: "",
  bingSiteUrl: "",
  ga4Property: "",
  primaryCountry: "",
  targetLanguages: "",
  trackedQueries: "",
  notes: "",
};

type ProfileForm = typeof EMPTY_PROFILE_FORM;

type ActionForm = {
  websiteId: string;
  title: string;
  priority: SEOPriority;
  status: SEOActionStatus;
  rationale: string;
  expectedMechanism: string;
  rollback: string;
  validation: string;
  dueDate: string;
};

const EMPTY_ACTION_FORM: ActionForm = {
  websiteId: "",
  title: "",
  priority: "high",
  status: "ready",
  rationale: "",
  expectedMechanism: "",
  rollback: "",
  validation: "",
  dueDate: "",
};

const EMPTY_IMPORT = JSON.stringify(
  {
    profiles: [],
    snapshots: [],
    issues: [],
    actions: [],
    changes: [],
    visibilityChecks: [],
  },
  null,
  2,
);

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value?: number, maximumFractionDigits = 0): string {
  if (!isNumber(value)) return "No data";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function formatPercent(value?: number): string {
  if (!isNumber(value)) return "No data";
  return `${value.toFixed(1)}%`;
}

function formatDate(value?: string): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatAge(value?: string): { label: string; tone: "good" | "warn" | "muted" } {
  if (!value) return { label: "No evidence", tone: "muted" };
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return { label: "Invalid date", tone: "warn" };
  const ageDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (ageDays <= 7) return { label: `${ageDays}d old`, tone: "good" };
  if (ageDays <= 30) return { label: `${ageDays}d old`, tone: "warn" };
  return { label: `${ageDays}d old`, tone: "muted" };
}

function optionalSum(values: Array<number | undefined>): number | undefined {
  const observed = values.filter(isNumber);
  return observed.length ? observed.reduce((sum, value) => sum + value, 0) : undefined;
}

function optionalAverage(values: Array<number | undefined>): number | undefined {
  const observed = values.filter(isNumber);
  return observed.length
    ? observed.reduce((sum, value) => sum + value, 0) / observed.length
    : undefined;
}

function metricDelta(current?: number, previous?: number): number | undefined {
  if (!isNumber(current) || !isNumber(previous)) return undefined;
  return current - previous;
}

function pctDelta(current?: number, previous?: number): number | undefined {
  if (!isNumber(current) || !isNumber(previous) || previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function priorityLabel(priority: SEOPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function statusLabel(status: string): string {
  return status.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLatestSnapshots(rows: SEOSnapshot[]): { latest?: SEOSnapshot; previous?: SEOSnapshot } {
  const ordered = [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || b.importedAt.localeCompare(a.importedAt),
  );
  const latest = ordered[0];
  const previous = latest
    ? ordered.find((row) => row.source === latest.source && row.date < latest.date)
    : undefined;
  return { latest, previous };
}

function safeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function SourcePill({ source }: { source: SEODataSource }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${SOURCE_CLASSES[source]}`}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

function PriorityPill({ priority }: { priority: SEOPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold ${PRIORITY_CLASSES[priority]}`}
    >
      {priorityLabel(priority)}
    </span>
  );
}

function FreshnessPill({ value }: { value?: string }) {
  const age = formatAge(value);
  const classes =
    age.tone === "good"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      : age.tone === "warn"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
        : "bg-secondary text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${classes}`}
    >
      {age.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "emerald" | "blue" | "violet" | "amber" | "rose";
}) {
  const tones = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    violet: "text-violet-500 bg-violet-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    rose: "text-rose-500 bg-rose-500/10",
  };
  return (
    <div className="card-glass min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}
        >
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55">
          Observed
        </span>
      </div>
      <div className="mt-4 truncate text-2xl font-extrabold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold text-foreground/80">{label}</div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function Sparkline({
  values,
  tone = "emerald",
}: {
  values: number[];
  tone?: "emerald" | "blue" | "violet" | "amber";
}) {
  if (values.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-border/70 text-[11px] text-muted-foreground">
        Add two observations to see a trend
      </div>
    );
  }
  const colors = { emerald: "#10b981", blue: "#3b82f6", violet: "#8b5cf6", amber: "#f59e0b" };
  const width = 360;
  const height = 72;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 8 - ((value - min) / range) * (height - 18);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-16 w-full overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={colors[tone]}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={Number(points.split(" ").at(-1)?.split(",")[1] ?? height / 2)}
        r="4"
        fill={colors[tone]}
      />
    </svg>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/20 px-5 py-9 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={19} />
      </div>
      <div className="mt-3 text-sm font-bold text-foreground">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{detail}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary mx-auto mt-4 text-xs">
          {actionLabel}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function Delta({
  value,
  inverse = false,
  suffix = "",
}: {
  value?: number;
  inverse?: boolean;
  suffix?: string;
}) {
  if (!isNumber(value))
    return <span className="text-[10px] text-muted-foreground">No comparison</span>;
  const positive = inverse ? value < 0 : value > 0;
  const neutral = value === 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${neutral ? "text-muted-foreground" : positive ? "text-emerald-500" : "text-rose-500"}`}
    >
      {!neutral && <Icon size={11} />} {value > 0 ? "+" : ""}
      {value.toFixed(Math.abs(value) < 10 ? 1 : 0)}
      {suffix}
    </span>
  );
}

function SiteStatus({
  website,
  profile,
  latest,
}: {
  website: Website;
  profile?: SEOProfile;
  latest?: SEOSnapshot;
}) {
  if (website.status === "down")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-500">
        <CircleAlert size={11} /> Site down
      </span>
    );
  if (profile?.syncStatus === "error")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-500">
        <AlertTriangle size={11} /> Data error
      </span>
    );
  if (!profile || !latest)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
        <Info size={11} /> Needs evidence
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-500">
      <CheckCircle2 size={11} /> Evidence ready
    </span>
  );
}

export default function SEOPage() {
  const websites = useWebsites();
  const profiles = useSEOProfiles();
  const snapshots = useSEOSnapshots();
  const issues = useSEOIssues();
  const actions = useSEOActions();
  const changes = useSEOChanges();
  const visibilityChecks = useSEOVisibilityChecks();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const { setActiveSection } = useNavigationStore();

  const [scope, setScope] = useState("all");
  const [tab, setTab] = useState<"overview" | "changes" | "queue" | "data">("overview");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SEODataSource | "all">("all");
  const [profileSiteId, setProfileSiteId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionForm, setActionForm] = useState<ActionForm>(EMPTY_ACTION_FORM);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState(EMPTY_IMPORT);

  const websiteMap = useMemo(
    () => new Map(websites.map((website) => [website.id, website])),
    [websites],
  );
  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.websiteId, profile])),
    [profiles],
  );
  const scopedWebsiteIds = useMemo(
    () =>
      new Set(
        websites
          .filter((website) => scope === "all" || website.id === scope)
          .map((website) => website.id),
      ),
    [scope, websites],
  );

  const scopedSnapshots = useMemo(
    () => snapshots.filter((snapshot) => scopedWebsiteIds.has(snapshot.websiteId)),
    [scopedWebsiteIds, snapshots],
  );
  const scopedIssues = useMemo(
    () => issues.filter((issue) => scopedWebsiteIds.has(issue.websiteId)),
    [issues, scopedWebsiteIds],
  );
  const scopedActions = useMemo(
    () => actions.filter((action) => scopedWebsiteIds.has(action.websiteId)),
    [actions, scopedWebsiteIds],
  );
  const scopedChanges = useMemo(
    () => changes.filter((change) => scopedWebsiteIds.has(change.websiteId)),
    [changes, scopedWebsiteIds],
  );
  const scopedVisibility = useMemo(
    () => visibilityChecks.filter((check) => scopedWebsiteIds.has(check.websiteId)),
    [scopedWebsiteIds, visibilityChecks],
  );

  const siteRows = useMemo(
    () =>
      websites
        .filter((website) => scope === "all" || website.id === scope)
        .filter((website) => {
          const query = search.trim().toLowerCase();
          return (
            !query ||
            website.name.toLowerCase().includes(query) ||
            website.url.toLowerCase().includes(query)
          );
        })
        .map((website) => {
          const rows = snapshots.filter((snapshot) => snapshot.websiteId === website.id);
          const { latest, previous } = getLatestSnapshots(rows);
          return {
            website,
            profile: profileMap.get(website.id),
            latest,
            previous,
            issues: issues.filter(
              (issue) =>
                issue.websiteId === website.id &&
                (issue.status === "open" || issue.status === "in-progress"),
            ),
            actions: actions.filter(
              (action) =>
                action.websiteId === website.id &&
                action.status !== "done" &&
                action.status !== "cancelled",
            ),
            trend: [...rows]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((row) => row.clicks)
              .filter(isNumber),
          };
        }),
    [actions, issues, profileMap, search, scope, snapshots, websites],
  );

  const latestSnapshots = useMemo(
    () =>
      siteRows
        .map((row) => row.latest)
        .filter((snapshot): snapshot is SEOSnapshot => Boolean(snapshot)),
    [siteRows],
  );
  const totalClicks = optionalSum(latestSnapshots.map((snapshot) => snapshot.clicks));
  const totalImpressions = optionalSum(latestSnapshots.map((snapshot) => snapshot.impressions));
  const averagePosition = optionalAverage(latestSnapshots.map((snapshot) => snapshot.avgPosition));
  const openIssueCount = scopedIssues.filter(
    (issue) => issue.status === "open" || issue.status === "in-progress",
  ).length;
  const openActionCount = scopedActions.filter(
    (action) => action.status !== "done" && action.status !== "cancelled",
  ).length;
  const configuredCount = websites.filter(
    (website) =>
      scopedWebsiteIds.has(website.id) && profileMap.get(website.id)?.syncStatus === "connected",
  ).length;
  const evidenceSiteCount = latestSnapshots.length;
  const mentionedCount = scopedVisibility.filter((check) => check.mentioned).length;
  const citedCount = scopedVisibility.filter((check) => check.cited).length;
  const aiCheckCount = scopedVisibility.length;

  const priorityActions = useMemo(
    () =>
      [...scopedActions]
        .filter((action) => action.status !== "done" && action.status !== "cancelled")
        .sort(
          (a, b) =>
            PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
            (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
        )
        .slice(0, 6),
    [scopedActions],
  );

  const recentChanges = useMemo(
    () =>
      [...scopedChanges]
        .filter((change) => sourceFilter === "all" || change.source === sourceFilter)
        .filter((change) => {
          const query = search.trim().toLowerCase();
          const websiteName = websiteMap.get(change.websiteId)?.name.toLowerCase() ?? "";
          return (
            !query ||
            websiteName.includes(query) ||
            change.field.toLowerCase().includes(query) ||
            (change.url ?? "").toLowerCase().includes(query)
          );
        })
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 40),
    [search, scopedChanges, sourceFilter, websiteMap],
  );

  const openIssues = useMemo(
    () =>
      [...scopedIssues]
        .filter((issue) => issue.status === "open" || issue.status === "in-progress")
        .sort(
          (a, b) =>
            PRIORITY_RANK[b.severity] - PRIORITY_RANK[a.severity] ||
            b.observedAt.localeCompare(a.observedAt),
        ),
    [scopedIssues],
  );

  const setProfile = (siteId: string) => {
    const existing = profileMap.get(siteId);
    setProfileForm(
      existing
        ? {
            priority: existing.priority,
            gscProperty: existing.gscProperty ?? "",
            bingSiteUrl: existing.bingSiteUrl ?? "",
            ga4Property: existing.ga4Property ?? "",
            primaryCountry: existing.primaryCountry ?? "",
            targetLanguages: existing.targetLanguages?.join("\n") ?? "",
            trackedQueries: existing.trackedQueries?.join("\n") ?? "",
            notes: existing.notes ?? "",
          }
        : EMPTY_PROFILE_FORM,
    );
    setProfileSiteId(siteId);
  };

  const saveProfile = async () => {
    if (!profileSiteId) return;
    const now = new Date().toISOString();
    const payload = {
      websiteId: profileSiteId,
      priority: profileForm.priority,
      gscProperty: profileForm.gscProperty.trim() || undefined,
      bingSiteUrl: profileForm.bingSiteUrl.trim() || undefined,
      ga4Property: profileForm.ga4Property.trim() || undefined,
      primaryCountry: profileForm.primaryCountry.trim() || undefined,
      targetLanguages: profileForm.targetLanguages
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      trackedQueries: profileForm.trackedQueries
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      syncStatus: profileMap.get(profileSiteId)?.syncStatus ?? "not-configured",
      lastSyncedAt: profileMap.get(profileSiteId)?.lastSyncedAt,
      syncError: profileMap.get(profileSiteId)?.syncError,
      notes: profileForm.notes.trim() || undefined,
      updatedAt: now,
    };
    const existing = profileMap.get(profileSiteId);
    if (existing) {
      await updateItem<SEOProfile>("seoProfiles", existing.id, payload);
    } else {
      await addItem("seoProfiles", { ...payload, createdAt: now });
    }
    setProfileSiteId(null);
    toast.success("SEO profile saved. Add a verified snapshot or connector result next.");
  };

  const openNewAction = (websiteId?: string) => {
    setActionForm({
      ...EMPTY_ACTION_FORM,
      websiteId: websiteId ?? (scope !== "all" ? scope : (websites[0]?.id ?? "")),
    });
    setActionOpen(true);
  };

  const saveAction = async () => {
    if (!actionForm.websiteId || !actionForm.title.trim()) {
      toast.error("Choose a website and enter an action title.");
      return;
    }
    const missing = [
      ["rationale", actionForm.rationale],
      ["expected mechanism", actionForm.expectedMechanism],
      ["rollback", actionForm.rollback],
      ["validation", actionForm.validation],
    ]
      .filter(([, value]) => !value.trim())
      .map(([label]) => label);
    if (missing.length) {
      toast.error(`Complete the action contract: ${missing.join(", ")}.`);
      return;
    }
    const now = new Date().toISOString();
    await addItem("seoActions", {
      websiteId: actionForm.websiteId,
      title: actionForm.title.trim(),
      priority: actionForm.priority,
      status: actionForm.status,
      rationale: actionForm.rationale.trim(),
      expectedMechanism: actionForm.expectedMechanism.trim(),
      rollback: actionForm.rollback.trim(),
      validation: actionForm.validation.trim(),
      source: "manual",
      dueDate: actionForm.dueDate || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setActionOpen(false);
    toast.success("Action added to the evidence-backed queue.");
  };

  const setActionStatus = async (action: SEOAction, status: SEOActionStatus) => {
    const now = new Date().toISOString();
    await updateItem<SEOAction>("seoActions", action.id, {
      status,
      updatedAt: now,
      completedAt: status === "done" ? now : undefined,
    });
    toast.success(`Action marked ${statusLabel(status).toLowerCase()}.`);
  };

  const setIssueStatus = async (issue: SEOIssue, status: SEOIssue["status"]) => {
    await updateItem<SEOIssue>("seoIssues", issue.id, {
      status,
      updatedAt: new Date().toISOString(),
    });
    toast.success(`Issue marked ${statusLabel(status).toLowerCase()}.`);
  };

  const createActionFromIssue = async (issue: SEOIssue) => {
    const now = new Date().toISOString();
    await addItem("seoActions", {
      websiteId: issue.websiteId,
      title: issue.title,
      priority: issue.severity,
      status: "ready",
      rationale: issue.evidence ?? "Created from an observed SEO issue.",
      expectedMechanism:
        issue.expectedMechanism ??
        "Define the expected organic, technical, AEO, or GEO mechanism before changing production.",
      rollback:
        issue.rollback ?? "Record the exact prior state and revert only after validation fails.",
      validation:
        issue.validation ??
        "Define the URL, metric, query set, and validation date before execution.",
      issueId: issue.id,
      source: "issue",
      createdAt: now,
      updatedAt: now,
    });
    toast.success("Issue copied to the prioritized action queue.");
  };

  const importEvidence = async () => {
    let parsed: Record<string, unknown>;
    try {
      const value = JSON.parse(importText);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("The root value must be a JSON object.");
      parsed = value as Record<string, unknown>;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid JSON.");
      return;
    }

    const collections = [
      ["profiles", "seoProfiles"],
      ["snapshots", "seoSnapshots"],
      ["issues", "seoIssues"],
      ["actions", "seoActions"],
      ["changes", "seoChanges"],
      ["visibilityChecks", "seoVisibilityChecks"],
    ] as const;
    const knownIds = new Set(websites.map((website) => website.id));
    let imported = 0;
    let skipped = 0;

    for (const [key, table] of collections) {
      const rows = parsed[key];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          skipped += 1;
          continue;
        }
        const record = row as Record<string, unknown>;
        if (typeof record.websiteId !== "string" || !knownIds.has(record.websiteId)) {
          skipped += 1;
          continue;
        }
        if (
          ["seoSnapshots", "seoIssues", "seoChanges"].includes(table) &&
          !isSEODataSource(record.source)
        ) {
          skipped += 1;
          continue;
        }
        const incomingId = typeof record.id === "string" ? record.id : undefined;
        const payload = { ...record } as Record<string, unknown>;
        delete payload.id;
        try {
          if (incomingId) {
            const existing =
              table === "seoProfiles"
                ? profiles.find((item) => item.id === incomingId)
                : table === "seoSnapshots"
                  ? snapshots.find((item) => item.id === incomingId)
                  : table === "seoIssues"
                    ? issues.find((item) => item.id === incomingId)
                    : table === "seoActions"
                      ? actions.find((item) => item.id === incomingId)
                      : table === "seoChanges"
                        ? changes.find((item) => item.id === incomingId)
                        : visibilityChecks.find((item) => item.id === incomingId);
            if (existing) {
              await updateItem(table, incomingId, payload);
            } else {
              await addItem(table, payload);
            }
          } else {
            await addItem(table, payload);
          }
          imported += 1;
        } catch {
          skipped += 1;
        }
      }
    }

    setImportOpen(false);
    toast.success(
      `Imported ${imported} evidence record${imported === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`,
    );
  };

  const tabItems = [
    { id: "overview" as const, label: "Portfolio overview", icon: BarChart3 },
    { id: "changes" as const, label: "Exact changes", icon: History, count: scopedChanges.length },
    {
      id: "queue" as const,
      label: "Action queue",
      icon: ListChecks,
      count: openActionCount + openIssueCount,
    },
    { id: "data" as const, label: "Data health", icon: Database },
  ];

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      <section
        className="relative overflow-hidden rounded-[30px] p-6 sm:p-8"
        style={{
          background: "linear-gradient(135deg,#081321 0%,#0d1f2f 50%,#123e3b 100%)",
          boxShadow: "0 30px 70px -35px rgba(8,19,33,.72)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(520px 280px at 5% 0%,rgba(16,185,129,.30),transparent 60%),radial-gradient(520px 300px at 100% 0%,rgba(59,130,246,.26),transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Daily
              organic growth review
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Portfolio SEO control center
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-[15px]">
              Review every website, exact before and after changes, search performance, technical
              health, AI visibility, AEO, and GEO opportunities from one evidence-backed workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]"
              >
                <Upload size={14} /> Import evidence
              </button>
              <button
                onClick={() => openNewAction()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/15"
              >
                <Plus size={14} /> Add next action
              </button>
              <button
                onClick={() => setActiveSection("websites")}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold text-white/70 transition hover:text-white"
              >
                <Globe2 size={14} /> Manage websites <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
          <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-extrabold text-white">{websites.length}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Sites in portfolio
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-extrabold text-white">{evidenceSiteCount}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Sites with evidence
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-extrabold text-white">{openIssueCount}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Open issues
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-extrabold text-white">{openActionCount}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Open actions
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2.5">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter websites, URLs, fields..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="rounded-xl bg-secondary/70 px-3 py-2.5 text-xs font-semibold text-foreground outline-none"
          >
            <option value="all">All websites</option>
            {websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setImportOpen(true)} className="btn-secondary shrink-0 text-xs">
          <FileJson size={14} /> Import JSON
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Observed clicks"
          value={formatNumber(totalClicks)}
          detail={
            totalClicks === undefined
              ? "Connect or import Search Console data"
              : `${latestSnapshots.filter((snapshot) => isNumber(snapshot.clicks)).length} site snapshots`
          }
          icon={TrendingUp}
          tone="emerald"
        />
        <MetricCard
          label="Observed impressions"
          value={formatNumber(totalImpressions)}
          detail={
            totalImpressions === undefined
              ? "No verified search exposure loaded"
              : "Latest available snapshot per site"
          }
          icon={Eye}
          tone="blue"
        />
        <MetricCard
          label="Average position"
          value={formatNumber(averagePosition, 1)}
          detail={
            averagePosition === undefined
              ? "No comparable position data"
              : "Unweighted mean of latest observations"
          }
          icon={Target}
          tone="violet"
        />
        <MetricCard
          label="AI mentions / citations"
          value={aiCheckCount ? `${mentionedCount} / ${citedCount}` : "No data"}
          detail={
            aiCheckCount
              ? `${aiCheckCount} recorded visibility checks`
              : "Record prompt evidence before judging AI visibility"
          }
          icon={Sparkles}
          tone="amber"
        />
        <MetricCard
          label="Connected sources"
          value={`${configuredCount}/${websites.filter((website) => scopedWebsiteIds.has(website.id)).length || 0}`}
          detail="Profiles marked connected, not guessed"
          icon={Activity}
          tone="rose"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/60 p-1.5 shadow-sm">
        {tabItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <Icon size={14} /> {item.label}
              {item.count ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-secondary text-foreground"}`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
            <section className="card-elevated min-w-0 p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers3 size={17} className="text-primary" />
                    <h2 className="text-base font-extrabold text-foreground">
                      Website review board
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The latest observed state for each website. Missing values stay empty.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection("websites")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  Manage <ChevronRight size={13} />
                </button>
              </div>
              {siteRows.length === 0 ? (
                <EmptyState
                  icon={Globe2}
                  title="No websites match this filter"
                  detail="Add a website in My Websites, then configure its evidence sources here."
                  actionLabel="Open websites"
                  onAction={() => setActiveSection("websites")}
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {siteRows.map((row) => {
                    const latestClicksDelta = metricDelta(row.latest?.clicks, row.previous?.clicks);
                    const latestPositionDelta = metricDelta(
                      row.latest?.avgPosition,
                      row.previous?.avgPosition,
                    );
                    return (
                      <article
                        key={row.website.id}
                        className="rounded-2xl border border-border/70 bg-background/45 p-4 transition hover:border-primary/25 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-foreground">
                              {row.website.name}
                            </div>
                            <a
                              href={safeUrl(row.website.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 flex max-w-full items-center gap-1 truncate text-[11px] text-primary hover:underline"
                            >
                              {row.website.url}
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          </div>
                          <button
                            onClick={() => setProfile(row.website.id)}
                            className="rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-primary"
                            title="Configure evidence sources"
                          >
                            <Settings2 size={15} />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <SiteStatus
                            website={row.website}
                            profile={row.profile}
                            latest={row.latest}
                          />
                          {row.latest && (
                            <>
                              <SourcePill source={row.latest.source} />
                              <FreshnessPill value={row.latest.date} />
                            </>
                          )}
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-secondary/60 p-2.5">
                            <div className="text-sm font-extrabold text-emerald-500">
                              {formatNumber(row.latest?.clicks)}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">Clicks</div>
                            <Delta value={latestClicksDelta} />
                          </div>
                          <div className="rounded-xl bg-secondary/60 p-2.5">
                            <div className="text-sm font-extrabold text-blue-500">
                              {formatNumber(row.latest?.impressions)}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              Impressions
                            </div>
                            <Delta
                              value={pctDelta(row.latest?.impressions, row.previous?.impressions)}
                              suffix="%"
                            />
                          </div>
                          <div className="rounded-xl bg-secondary/60 p-2.5">
                            <div className="text-sm font-extrabold text-violet-500">
                              {formatNumber(row.latest?.avgPosition, 1)}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">Position</div>
                            <Delta value={latestPositionDelta} inverse />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Sparkline values={row.trend} tone="emerald" />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                          <span>
                            {row.issues.length} open issue{row.issues.length === 1 ? "" : "s"} ·{" "}
                            {row.actions.length} action{row.actions.length === 1 ? "" : "s"}
                          </span>
                          <button
                            onClick={() => {
                              setScope(row.website.id);
                              setTab("queue");
                            }}
                            className="font-bold text-primary hover:underline"
                          >
                            Review site
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card-elevated min-w-0 p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ListChecks size={17} className="text-amber-500" />
                    <h2 className="text-base font-extrabold text-foreground">
                      Today&apos;s priority queue
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only actions with a recorded rationale and validation contract.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTab("queue");
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View queue
                </button>
              </div>
              {priorityActions.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="No approved actions yet"
                  detail="Import evidence, triage an issue, or add a bounded action with a rollback and validation plan."
                  actionLabel="Add action"
                  onAction={() => openNewAction()}
                />
              ) : (
                <div className="space-y-2.5">
                  {priorityActions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-2xl border border-border/70 bg-background/45 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,.12)]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground">{action.title}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {websiteMap.get(action.websiteId)?.name ?? "Unknown website"} ·{" "}
                            {action.dueDate ? `Due ${formatDate(action.dueDate)}` : "No due date"}
                          </div>
                        </div>
                        <PriorityPill priority={action.priority} />
                      </div>
                      <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                        {action.rationale ||
                          "No rationale recorded. Add the observed defect before execution."}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          {statusLabel(action.status)}
                        </span>
                        <button
                          onClick={() =>
                            setActionStatus(
                              action,
                              action.status === "in-progress" ? "ready" : "in-progress",
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/15"
                        >
                          {action.status === "in-progress" ? "Pause" : "Start"}
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card-elevated p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CircleAlert size={17} className="text-rose-500" />
                    <h2 className="text-base font-extrabold text-foreground">Observed issues</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Technical SEO, content, SERP, AEO, GEO, and AI visibility findings.
                  </p>
                </div>
                <button
                  onClick={() => setTab("queue")}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Triage
                </button>
              </div>
              {openIssues.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No open issues recorded"
                  detail="This means no issues have been imported or entered. It does not prove that every website is healthy."
                />
              ) : (
                <div className="space-y-2.5">
                  {openIssues.slice(0, 5).map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/45 p-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PriorityPill priority={issue.severity} />
                          <span className="text-xs font-bold text-foreground">{issue.title}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {websiteMap.get(issue.websiteId)?.name ?? "Unknown website"} ·{" "}
                          {statusLabel(issue.category)} · {formatDate(issue.observedAt)}
                        </div>
                        {issue.url && (
                          <div className="mt-1 truncate text-[10px] text-primary">{issue.url}</div>
                        )}
                      </div>
                      <button
                        onClick={() => createActionFromIssue(issue)}
                        className="shrink-0 rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-foreground hover:bg-primary/10 hover:text-primary"
                      >
                        Create action
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="card-elevated p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={17} className="text-violet-500" />
                    <h2 className="text-base font-extrabold text-foreground">
                      AI visibility evidence
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prompt-level observations, not estimated AI citations.
                  </p>
                </div>
                <button
                  onClick={() => setTab("data")}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Inspect data
                </button>
              </div>
              {scopedVisibility.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No AI visibility checks recorded"
                  detail="Record the exact query, engine, mention, citation, URL, and evidence source before judging AI visibility, AEO, or GEO performance."
                  actionLabel="Import checks"
                  onAction={() => setImportOpen(true)}
                />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-secondary/60 p-3 text-center">
                      <div className="text-xl font-extrabold text-foreground">{aiCheckCount}</div>
                      <div className="text-[10px] text-muted-foreground">Checks</div>
                    </div>
                    <div className="rounded-xl bg-secondary/60 p-3 text-center">
                      <div className="text-xl font-extrabold text-emerald-500">
                        {mentionedCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Mentioned</div>
                    </div>
                    <div className="rounded-xl bg-secondary/60 p-3 text-center">
                      <div className="text-xl font-extrabold text-violet-500">{citedCount}</div>
                      <div className="text-[10px] text-muted-foreground">Cited</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[...scopedVisibility]
                      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
                      .slice(0, 3)
                      .map((check) => (
                        <div
                          key={check.id}
                          className="flex items-start gap-3 rounded-xl border border-border/60 p-3"
                        >
                          <div
                            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${check.cited ? "bg-violet-500" : check.mentioned ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-foreground">
                              {check.query}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {statusLabel(check.engine)} · {formatDate(check.checkedAt)} ·{" "}
                              {check.cited
                                ? "Cited"
                                : check.mentioned
                                  ? "Mentioned"
                                  : "Not observed"}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}

      {tab === "changes" && (
        <section className="card-elevated p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History size={17} className="text-primary" />
                <h2 className="text-base font-extrabold text-foreground">Exact change history</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Before and after values with timestamp, object, URL, source, and validation status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as SEODataSource | "all")}
                className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground outline-none"
              >
                <option value="all">All sources</option>
                {DATA_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
              <button onClick={() => setImportOpen(true)} className="btn-secondary text-xs">
                <Upload size={13} /> Add evidence
              </button>
            </div>
          </div>
          {recentChanges.length === 0 ? (
            <EmptyState
              icon={History}
              title="No exact changes recorded"
              detail="Import or enter a change record. The dashboard will not infer before and after values from current metrics."
              actionLabel="Import changes"
              onAction={() => setImportOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-border/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3">When</th>
                    <th className="px-3 py-3">Website / object</th>
                    <th className="px-3 py-3">Field</th>
                    <th className="px-3 py-3">Before</th>
                    <th className="px-3 py-3">After</th>
                    <th className="px-3 py-3">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {recentChanges.map((change) => (
                    <tr
                      key={change.id}
                      className="border-b border-border/50 align-top text-xs last:border-0"
                    >
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatDateTime(change.occurredAt)}
                        <div className="mt-1">
                          <SourcePill source={change.source} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-foreground">
                          {websiteMap.get(change.websiteId)?.name ?? "Unknown website"}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {statusLabel(change.objectType)}
                          {change.url ? ` · ${change.url}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-foreground">{change.field}</td>
                      <td className="max-w-[180px] whitespace-pre-wrap break-words px-3 py-3 text-rose-500">
                        {change.before || "Empty"}
                      </td>
                      <td className="max-w-[180px] whitespace-pre-wrap break-words px-3 py-3 text-emerald-500">
                        {change.after || "Empty"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${change.status === "validated" ? "bg-emerald-500/10 text-emerald-500" : change.status === "reverted" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"}`}
                        >
                          {statusLabel(change.status)}
                        </span>
                        {change.evidence && (
                          <div className="mt-2 max-w-[180px] text-[10px] leading-4 text-muted-foreground">
                            {change.evidence}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "queue" && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <section className="card-elevated p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ListChecks size={17} className="text-primary" />
                  <h2 className="text-base font-extrabold text-foreground">
                    Prioritized next actions
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Each action should state why, expected mechanism, rollback, and validation.
                </p>
              </div>
              <button onClick={() => openNewAction()} className="btn-primary text-xs">
                <Plus size={13} /> New action
              </button>
            </div>
            {scopedActions.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Action queue is empty"
                detail="Create a bounded action after recording the evidence and expected mechanism."
                actionLabel="Add action"
                onAction={() => openNewAction()}
              />
            ) : (
              <div className="space-y-2.5">
                {[...scopedActions]
                  .sort(
                    (a, b) =>
                      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
                      b.updatedAt.localeCompare(a.updatedAt),
                  )
                  .map((action) => (
                    <div
                      key={action.id}
                      className="rounded-2xl border border-border/70 bg-background/45 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <PriorityPill priority={action.priority} />
                            <span className="text-sm font-bold text-foreground">
                              {action.title}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {websiteMap.get(action.websiteId)?.name ?? "Unknown website"} ·{" "}
                            {statusLabel(action.status)}
                            {action.dueDate ? ` · Due ${formatDate(action.dueDate)}` : ""}
                          </div>
                        </div>
                        <select
                          value={action.status}
                          onChange={(event) =>
                            setActionStatus(action, event.target.value as SEOActionStatus)
                          }
                          className="rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-foreground outline-none"
                        >
                          <option value="backlog">Backlog</option>
                          <option value="ready">Ready</option>
                          <option value="in-progress">In progress</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="mt-3 grid gap-2 text-[11px] leading-5 text-muted-foreground md:grid-cols-3">
                        <div>
                          <span className="font-bold text-foreground">Why:</span>{" "}
                          {action.rationale || "Not recorded"}
                        </div>
                        <div>
                          <span className="font-bold text-foreground">Mechanism:</span>{" "}
                          {action.expectedMechanism || "Not recorded"}
                        </div>
                        <div>
                          <span className="font-bold text-foreground">Validation:</span>{" "}
                          {action.validation || "Not recorded"}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
          <section className="card-elevated p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={17} className="text-amber-500" />
                  <h2 className="text-base font-extrabold text-foreground">
                    Issues awaiting action
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Convert an issue into a bounded change only after its evidence is reviewed.
                </p>
              </div>
            </div>
            {openIssues.length === 0 ? (
              <EmptyState
                icon={Check}
                title="No open issues"
                detail="No issue records are currently open in this scope."
              />
            ) : (
              <div className="space-y-2.5">
                {openIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-border/70 bg-background/45 p-3.5"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PriorityPill priority={issue.severity} />
                          <span className="text-xs font-bold text-foreground">{issue.title}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {websiteMap.get(issue.websiteId)?.name ?? "Unknown website"} ·{" "}
                          {SOURCE_LABELS[issue.source]}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setIssueStatus(
                            issue,
                            issue.status === "in-progress" ? "open" : "in-progress",
                          )
                        }
                        className="rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-foreground"
                      >
                        {issue.status === "in-progress" ? "Pause" : "Start"}
                      </button>
                    </div>
                    <div className="mt-2 line-clamp-3 text-[11px] leading-5 text-muted-foreground">
                      {issue.evidence || "No evidence detail recorded."}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        onClick={() => createActionFromIssue(issue)}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Create action
                      </button>
                      <button
                        onClick={() => setIssueStatus(issue, "resolved")}
                        className="text-[10px] font-bold text-emerald-500 hover:underline"
                      >
                        Mark resolved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "data" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
          <section className="card-elevated p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Database size={17} className="text-primary" />
                  <h2 className="text-base font-extrabold text-foreground">
                    Source and freshness coverage
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  A connected profile is configuration only. Metrics appear only after an
                  observation is imported or synced.
                </p>
              </div>
              <button onClick={() => setImportOpen(true)} className="btn-secondary text-xs">
                <Upload size={13} /> Import
              </button>
            </div>
            {websites.length === 0 ? (
              <EmptyState
                icon={Globe2}
                title="No websites configured"
                detail="Create your website records first."
                actionLabel="Open websites"
                onAction={() => setActiveSection("websites")}
              />
            ) : (
              <div className="space-y-2.5">
                {websites
                  .filter((website) => scopedWebsiteIds.has(website.id))
                  .map((website) => {
                    const profile = profileMap.get(website.id);
                    const rows = snapshots.filter((snapshot) => snapshot.websiteId === website.id);
                    const { latest } = getLatestSnapshots(rows);
                    const age = formatAge(latest?.date);
                    return (
                      <div
                        key={website.id}
                        className="rounded-2xl border border-border/70 bg-background/45 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-foreground">
                              {website.name}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {website.url}
                            </div>
                          </div>
                          <SiteStatus website={website} profile={profile} latest={latest} />
                          <button
                            onClick={() => setProfile(website.id)}
                            className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-primary"
                            title="Configure profile"
                          >
                            <Settings2 size={14} />
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-xl bg-secondary/60 p-2.5">
                            <div className="text-[10px] text-muted-foreground">Profile</div>
                            <div className="mt-1 text-xs font-bold text-foreground">
                              {profile ? statusLabel(profile.syncStatus) : "Not configured"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-secondary/60 p-2.5">
                            <div className="text-[10px] text-muted-foreground">Latest evidence</div>
                            <div className="mt-1 text-xs font-bold text-foreground">
                              {latest ? formatDate(latest.date) : "None"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-secondary/60 p-2.5">
                            <div className="text-[10px] text-muted-foreground">Age</div>
                            <div
                              className={`mt-1 text-xs font-bold ${age.tone === "good" ? "text-emerald-500" : age.tone === "warn" ? "text-amber-500" : "text-muted-foreground"}`}
                            >
                              {age.label}
                            </div>
                          </div>
                          <div className="rounded-xl bg-secondary/60 p-2.5">
                            <div className="text-[10px] text-muted-foreground">Snapshots</div>
                            <div className="mt-1 text-xs font-bold text-foreground">
                              {rows.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
          <section className="card-elevated p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-2">
              <Zap size={17} className="text-amber-500" />
              <div>
                <h2 className="text-base font-extrabold text-foreground">Connector contract</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  What the future server-side ingestion layer should write.
                </p>
              </div>
            </div>
            <div className="space-y-3 text-xs leading-5 text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                <div className="font-bold text-foreground">Search performance</div>
                <p className="mt-1">
                  Import date, source, clicks, impressions, CTR, average position, period, and
                  source reference.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                <div className="font-bold text-foreground">Technical evidence</div>
                <p className="mt-1">
                  Import exact URL, defect, observed timestamp, source, expected mechanism,
                  rollback, and validation contract.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                <div className="font-bold text-foreground">AI, AEO, and GEO</div>
                <p className="mt-1">
                  Record the exact engine, prompt, mention state, citation state, cited URL,
                  evidence, and verification status. No estimated visibility.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-2 font-bold">
                  <Info size={14} /> Current repo limitation
                </div>
                <p className="mt-1">
                  This repository is a browser-first app. It does not yet contain secure OAuth
                  workers for GSC, Bing, GA4, crawlers, or AI prompt observation. Import keeps the
                  UI honest until those connectors are added.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="card-glass p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={17} className="text-primary" />
              <h2 className="text-base font-extrabold text-foreground">Daily review rule</h2>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              Start with fresh evidence, inspect exact changes, triage critical issues, choose one
              or two bounded actions, and validate the expected mechanism before declaring a lift in
              organic traffic, SERP rankings, AEO, GEO, or AI visibility.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              Open Search Console <ExternalLink size={12} />
            </a>
            <a
              href="https://www.bing.com/webmasters"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              Open Bing <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      <FormModal
        open={Boolean(profileSiteId)}
        onClose={() => setProfileSiteId(null)}
        title={`Configure SEO profile${profileSiteId ? ` · ${websiteMap.get(profileSiteId)?.name ?? "Website"}` : ""}`}
        onSubmit={saveProfile}
        submitLabel="Save profile"
        size="lg"
      >
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-5 text-blue-700 dark:text-blue-300">
          Configuration does not create metrics. Mark a connector connected only when a real
          ingestion job or verified import has run.
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Priority">
            <FormSelect
              value={profileForm.priority}
              onChange={(value) =>
                setProfileForm((form) => ({ ...form, priority: value as SEOPriority }))
              }
              options={(["critical", "high", "medium", "low"] as SEOPriority[]).map((value) => ({
                value,
                label: priorityLabel(value),
              }))}
            />
          </FormField>
          <FormField label="Primary country">
            <FormInput
              value={profileForm.primaryCountry}
              onChange={(value) => setProfileForm((form) => ({ ...form, primaryCountry: value }))}
              placeholder="Optional market"
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="GSC property">
            <FormInput
              value={profileForm.gscProperty}
              onChange={(value) => setProfileForm((form) => ({ ...form, gscProperty: value }))}
              placeholder="sc-domain:example.com or URL property"
            />
          </FormField>
          <FormField label="Bing site URL">
            <FormInput
              value={profileForm.bingSiteUrl}
              onChange={(value) => setProfileForm((form) => ({ ...form, bingSiteUrl: value }))}
              placeholder="https://example.com/"
            />
          </FormField>
        </div>
        <FormField label="GA4 property">
          <FormInput
            value={profileForm.ga4Property}
            onChange={(value) => setProfileForm((form) => ({ ...form, ga4Property: value }))}
            placeholder="Property ID or reference"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Target languages">
            <FormTextarea
              value={profileForm.targetLanguages}
              onChange={(value) => setProfileForm((form) => ({ ...form, targetLanguages: value }))}
              placeholder="One language per line"
              rows={3}
            />
          </FormField>
          <FormField label="Tracked queries">
            <FormTextarea
              value={profileForm.trackedQueries}
              onChange={(value) => setProfileForm((form) => ({ ...form, trackedQueries: value }))}
              placeholder="One query per line"
              rows={3}
            />
          </FormField>
        </div>
        <FormField label="Notes">
          <FormTextarea
            value={profileForm.notes}
            onChange={(value) => setProfileForm((form) => ({ ...form, notes: value }))}
            placeholder="Market, route ownership, or connector notes"
            rows={3}
          />
        </FormField>
      </FormModal>

      <FormModal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title="Add bounded SEO action"
        onSubmit={saveAction}
        submitLabel="Add action"
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Website">
            <FormSelect
              value={actionForm.websiteId}
              onChange={(value) => setActionForm((form) => ({ ...form, websiteId: value }))}
              options={[
                { value: "", label: "Choose a website" },
                ...websites.map((website) => ({ value: website.id, label: website.name })),
              ]}
            />
          </FormField>
          <FormField label="Priority">
            <FormSelect
              value={actionForm.priority}
              onChange={(value) =>
                setActionForm((form) => ({ ...form, priority: value as SEOPriority }))
              }
              options={(["critical", "high", "medium", "low"] as SEOPriority[]).map((value) => ({
                value,
                label: priorityLabel(value),
              }))}
            />
          </FormField>
        </div>
        <FormField label="Action title">
          <FormInput
            value={actionForm.title}
            onChange={(value) => setActionForm((form) => ({ ...form, title: value }))}
            placeholder="Example: repair canonical mismatch on /guide/"
          />
        </FormField>
        <FormField label="Why this matters">
          <FormTextarea
            value={actionForm.rationale}
            onChange={(value) => setActionForm((form) => ({ ...form, rationale: value }))}
            placeholder="Observed defect, query, URL, and baseline"
            rows={3}
          />
        </FormField>
        <FormField label="Expected mechanism">
          <FormTextarea
            value={actionForm.expectedMechanism}
            onChange={(value) => setActionForm((form) => ({ ...form, expectedMechanism: value }))}
            placeholder="What should improve and why?"
            rows={3}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Rollback">
            <FormTextarea
              value={actionForm.rollback}
              onChange={(value) => setActionForm((form) => ({ ...form, rollback: value }))}
              placeholder="Exact reversible rollback"
              rows={3}
            />
          </FormField>
          <FormField label="Validation">
            <FormTextarea
              value={actionForm.validation}
              onChange={(value) => setActionForm((form) => ({ ...form, validation: value }))}
              placeholder="URL, metric, query set, and date"
              rows={3}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Status">
            <FormSelect
              value={actionForm.status}
              onChange={(value) =>
                setActionForm((form) => ({ ...form, status: value as SEOActionStatus }))
              }
              options={["backlog", "ready", "in-progress", "blocked"].map((value) => ({
                value,
                label: statusLabel(value),
              }))}
            />
          </FormField>
          <FormField label="Due date">
            <FormInput
              type="date"
              value={actionForm.dueDate}
              onChange={(value) => setActionForm((form) => ({ ...form, dueDate: value }))}
            />
          </FormField>
        </div>
      </FormModal>

      <FormModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import verified SEO evidence"
        onSubmit={importEvidence}
        submitLabel="Merge evidence"
        size="lg"
      >
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2 font-bold">
            <FileJson size={14} /> Merge-only import
          </div>
          <p className="mt-1">
            Records must reference an existing website ID. Existing IDs update; new records receive
            a local ID. Do not paste credentials or unverified estimates.
          </p>
        </div>
        <FormField label="JSON payload">
          <FormTextarea value={importText} onChange={setImportText} rows={16} />
        </FormField>
        <div className="text-[10px] leading-5 text-muted-foreground">
          Supported arrays: profiles, snapshots, issues, actions, changes, visibilityChecks.
          Snapshot fields can include clicks, impressions, CTR, average position, indexed pages,
          schema, canonical, Core Web Vitals, and AI counts. Visibility checks should include the
          exact engine, query, mention state, citation state, cited URL, and evidence.
        </div>
      </FormModal>
    </div>
  );
}
