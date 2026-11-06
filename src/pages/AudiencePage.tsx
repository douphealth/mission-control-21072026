import SocialPerformanceDashboard from "@/components/growth/SocialPerformanceDashboard";
import CollectorStatusPanel from "@/components/controlcenter/CollectorStatusPanel";
import AudienceConnectionsPanel from "@/components/controlcenter/AudienceConnectionsPanel";
import { audienceProfile, audienceProfileKey } from "@/lib/audienceEvidence";
import { audienceMeasurementSummary } from "@/lib/audienceMeasurements";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  Download,
  LayoutGrid,
  List,
  Pencil,
  Plug,
  Users,
  X,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAudienceAccounts, useAudienceReadings, genId } from "@/hooks/useTableData";
import { db, type AudiencePlatform, type AudienceReading, type AudienceAccount } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { runAudienceCollector } from "@/lib/controlCenter";
import { isTrustedAudienceReading } from "@/lib/intelligenceQuality";
import {
  IntelligenceMetrics,
  IntelligenceTabs,
  IntelligenceHeading,
  IntelligenceEmpty,
  downloadIntelligenceCsv,
} from "@/components/controlcenter/IntelligenceWorkspace";
import { CCHeader, Panel, relTime } from "@/components/controlcenter/ui";

const PLATFORMS: {
  id: AudiencePlatform;
  label: string;
  hint: string;
  hosts: string[];
}[] = [
  {
    id: "youtube",
    label: "YouTube",
    hint: "https://youtube.com/@handle",
    hosts: ["youtube.com", "youtu.be"],
  },
  { id: "x", label: "X", hint: "https://x.com/handle", hosts: ["x.com", "twitter.com"] },
  {
    id: "instagram",
    label: "Instagram",
    hint: "https://instagram.com/handle",
    hosts: ["instagram.com"],
  },
  {
    id: "facebook",
    label: "Facebook",
    hint: "https://facebook.com/page",
    hosts: ["facebook.com", "fb.com"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    hint: "https://linkedin.com/company/x",
    hosts: ["linkedin.com"],
  },
  {
    id: "threads",
    label: "Threads",
    hint: "https://threads.net/@handle",
    hosts: ["threads.net", "threads.com"],
  },
  { id: "tiktok", label: "TikTok", hint: "https://tiktok.com/@handle", hosts: ["tiktok.com"] },
  { id: "github", label: "GitHub", hint: "https://github.com/username", hosts: ["github.com"] },
  { id: "bluesky", label: "Bluesky", hint: "https://bsky.app/profile/handle", hosts: ["bsky.app"] },
];

const nf = new Intl.NumberFormat("en-US");

function Sparkline({ readings }: { readings: AudienceReading[] }) {
  const samples = [
    ...new Map(
      readings
        .filter((reading) => isTrustedAudienceReading(reading))
        .map((reading) => [reading.capturedAt, reading]),
    ).values(),
  ].slice(-12);
  if (samples.length < 2)
    return (
      <div className="cc-audience-spark-empty">
        A second comparable reading will reveal a trend.
      </div>
    );
  const values = samples.map((reading) => reading.followers as number);
  const min = Math.min(...values),
    max = Math.max(...values);
  const firstAt = Date.parse(samples[0].capturedAt),
    lastAt = Date.parse(samples.at(-1)!.capturedAt);
  const elapsed = Math.max(1, lastAt - firstAt);
  const points = samples
    .map(
      (reading, index) =>
        `${((Date.parse(reading.capturedAt) - firstAt) / elapsed) * 100},${max === min ? 20 : 34 - ((values[index] - min) / (max - min)) * 28}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="cc-audience-spark"
      role="img"
      aria-label={`Range-scaled follower history. ${samples.length} comparable readings, from ${values[0]} on ${new Date(firstAt).toLocaleDateString()} to ${values.at(-1)} on ${new Date(lastAt).toLocaleDateString()}.`}
    >
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function countLabel(reading?: AudienceReading) {
  if (reading?.followers === null || reading?.followers === undefined) return "Unavailable";
  return `${reading.metricSemantics === "approximate" || reading.metricSemantics === "rounded" ? "~" : ""}${nf.format(reading.followers)}`;
}

export default function AudiencePage() {
  const accounts = useAudienceAccounts();
  const readings = useAudienceReadings();
  const [measurementNow, setMeasurementNow] = useState(() => Date.now());
  const [platform, setPlatform] = useState<AudiencePlatform>("youtube");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "current" | "attention">("all");
  const [tab, setTab] = useState<"profiles" | "add" | "connections">("profiles");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [layout, setLayout] = useState<"cards" | "compact">("cards");
  const [sort, setSort] = useState<"name" | "attention" | "latest">("attention");
  const [pending, setPending] = useState("");
  const mutationLock = useRef(false);
  const [editingAccount, setEditingAccount] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [confirmRemoval, setConfirmRemoval] = useState("");
  const [report, setReport] = useState<Awaited<ReturnType<typeof runAudienceCollector>> | null>(
    null,
  );
  const autoRefreshStarted = useRef(false);

  useEffect(() => {
    // Freshness expires even when no data changes. Refresh immediately after
    // returning to a suspended tab, without starting another provider request.
    const updateClock = () => {
      if (!document.hidden) setMeasurementNow(Date.now());
    };
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    window.addEventListener("focus", updateClock);
    window.addEventListener("pageshow", updateClock);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateClock);
      window.removeEventListener("pageshow", updateClock);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, []);

  const byAccount = useMemo(() => {
    const map = new Map<string, AudienceReading[]>();
    readings.forEach((reading) => {
      const list = map.get(reading.accountId) ?? [];
      list.push(reading);
      map.set(reading.accountId, list);
    });
    map.forEach((list) => list.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)));
    return map;
  }, [readings]);

  const summaries = useMemo(
    () =>
      new Map(
        accounts.map((account) => [
          account.id,
          audienceMeasurementSummary(byAccount.get(account.id) ?? [], account, measurementNow),
        ]),
      ),
    [accounts, byAccount, measurementNow],
  );
  const officialCount = [...summaries.values()].filter(
    (summary) => summary.latest?.method === "official-api",
  ).length;
  const freshVerified = [...summaries.values()].filter((summary) => summary.current).length;
  const measuredCount = [...summaries.values()].filter((summary) => summary.latest).length;
  const visibleAccounts = accounts
    .filter((account) => {
      const current = summaries.get(account.id)?.current;
      return (
        (view === "all" || (view === "current" ? current : !current)) &&
        (platformFilter === "all" || account.platform === platformFilter) &&
        (!search.trim() ||
          `${account.handle} ${account.label || ""} ${account.platform} ${account.url}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()))
      );
    })
    .sort((a, b) =>
      sort === "attention"
        ? Number(summaries.get(a.id)?.current) - Number(summaries.get(b.id)?.current) ||
          (a.label || a.handle).localeCompare(b.label || b.handle)
        : sort === "latest"
          ? (b.lastCheckedAt || "").localeCompare(a.lastCheckedAt || "")
          : (a.label || a.handle).localeCompare(b.label || b.handle),
    );

  useEffect(() => {
    if (autoRefreshStarted.current || !accounts.length) return;
    const stale = accounts.some(
      (account) =>
        !account.lastCheckedAt ||
        Date.now() - new Date(account.lastCheckedAt).getTime() > 12 * 3_600_000,
    );
    if (!stale) return;
    autoRefreshStarted.current = true;
    setBusy(true);
    void runAudienceCollector()
      .then(setReport)
      .catch(() => {
        // Account/collector status surfaces failures; auto-refresh stays quiet.
      })
      .finally(() => setBusy(false));
  }, [accounts]);

  const addAccount = async () => {
    const clean = url.trim();
    if (!clean || mutationLock.current) return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(clean) && !/^https?:\/\//i.test(clean)) {
      toast.error("Use an HTTP or HTTPS profile URL");
      return;
    }
    const normalised = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    let parsed: URL;
    try {
      parsed = new URL(normalised);
    } catch {
      toast.error("That does not look like a valid profile URL");
      return;
    }

    const config = PLATFORMS.find((item) => item.id === platform);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const matchesPlatform = config?.hosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
    if (!matchesPlatform) {
      toast.error(`URL does not look like a ${config?.label || platform} profile`, {
        description: `Detected host: ${host}`,
      });
      return;
    }

    let profile: ReturnType<typeof audienceProfile>;
    try {
      profile = audienceProfile(platform, normalised);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid profile URL");
      return;
    }

    const key = audienceProfileKey(platform, normalised);
    const duplicate = accounts.find((account) => {
      try {
        return audienceProfileKey(account.platform, account.url) === key;
      } catch {
        return account.url.toLowerCase() === profile.url.toLowerCase();
      }
    });
    if (duplicate) {
      toast.info("This profile is already tracked");
      return;
    }

    const handle = profile.handle || profile.channelId || host;
    const record = {
      id: genId(),
      platform,
      handle,
      url: profile.url,
      createdAt: new Date().toISOString(),
    };
    mutationLock.current = true;
    setPending("new");
    try {
      await db.audienceAccounts.put(record);
      markCloudRecordDirty("audienceAccounts", record.id);
      queueCloudPush();
      setUrl("");
      setTab("profiles");
      setView("all");
      setSearch("");
      setPlatformFilter("all");
      toast.success(`Tracking ${handle}`, {
        description: "Refresh metrics to collect a verified measurement.",
      });
    } catch (error) {
      toast.error("Profile was not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      mutationLock.current = false;
      setPending("");
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const result = await runAudienceCollector();
      setReport(result);
      if (!result.updated) toast.info("Add a profile before refreshing");
      else if (!result.succeeded)
        toast.error("No current audience metrics retrieved", {
          description:
            "Every attempted profile was unavailable. See the exact reason and next action on each profile card.",
        });
      else
        toast[result.unavailable ? "warning" : "success"](
          `${result.succeeded}/${result.updated} profiles returned verified metrics`,
          {
            description: result.unavailable
              ? `${result.unavailable} unavailable; previous valid readings are preserved and labeled.`
              : "The displayed readings came from the stated source methods.",
          },
        );
    } catch (error: any) {
      toast.error("Audience refresh failed", { description: String(error?.message ?? error) });
    } finally {
      setBusy(false);
    }
  };

  const changeAccount = async (id: string, action: () => Promise<void>) => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(id);
    try {
      await action();
    } catch (error) {
      toast.error("Profile change was not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      mutationLock.current = false;
      setPending("");
    }
  };
  const removeAccount = async (account: AudienceAccount) => {
    if (busy) {
      toast.info("Wait for the current refresh before removing a profile");
      return;
    }
    const history = readings.filter((reading) => reading.accountId === account.id);
    await db.transaction("rw", db.audienceAccounts, db.audienceReadings, async () => {
      await db.audienceReadings.bulkDelete(history.map((reading) => reading.id));
      await db.audienceAccounts.delete(account.id);
    });
    history.forEach((reading) => markCloudRecordDirty("audienceReadings", reading.id, "delete"));
    markCloudRecordDirty("audienceAccounts", account.id, "delete");
    queueCloudPush();
    setConfirmRemoval("");
    toast("Profile removed", {
      description: `${account.label || account.handle} and ${history.length} saved readings.`,
      duration: 10_000,
      action: {
        label: "Undo",
        onClick: () =>
          void changeAccount(account.id, async () => {
            await db.transaction("rw", db.audienceAccounts, db.audienceReadings, async () => {
              await db.audienceAccounts.put(account);
              await db.audienceReadings.bulkPut(history);
            });
            markCloudRecordDirty("audienceAccounts", account.id);
            history.forEach((reading) => markCloudRecordDirty("audienceReadings", reading.id));
            queueCloudPush();
            toast.success("Profile and history restored");
          }),
      },
    });
  };
  const resetView = () => {
    setSearch("");
    setView("all");
    setPlatformFilter("all");
  };
  const exportProfiles = () =>
    downloadIntelligenceCsv(
      "mission-control-audience.csv",
      [
        "Label",
        "Platform",
        "Profile",
        "URL",
        "Latest valid count",
        "Metric semantics",
        "Captured at",
        "Current within 24h",
        "Provider",
        "Method",
        "Delta",
        "Compared with",
        "Last attempt",
        "Last status",
        "Next action",
      ],
      visibleAccounts.map((account) => {
        const summary = summaries.get(account.id)!;
        return [
          account.label,
          account.platform,
          account.handle,
          account.url,
          summary.latest?.followers,
          summary.latest?.metricSemantics,
          summary.latest?.capturedAt,
          summary.current ? "Yes" : "No",
          summary.latest?.provider,
          summary.latest?.method,
          summary.delta,
          summary.previous?.capturedAt,
          account.lastCheckedAt,
          account.lastStatus,
          account.lastAction,
        ];
      }),
    );

  return (
    <div className="intel-workspace">
      <CCHeader
        title="Audience"
        subtitle="Understand your audience one verified profile at a time. Compare like-for-like measurements and see exactly where a connection needs attention."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setTab("add")}>
              <Plus size={15} />
              Track profile
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy || !accounts.length}
              className="btn-primary"
            >
              <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
              {busy ? "Checking profiles…" : "Refresh metrics"}
            </button>
          </>
        }
      />
      <SocialPerformanceDashboard />
      <IntelligenceMetrics
        items={[
          {
            label: "Tracked profiles",
            value: accounts.length,
            hint: `${measuredCount} have at least one valid reading`,
            tone: "accent",
            onClick: () => {
              setTab("profiles");
              resetView();
            },
          },
          {
            label: "Current measurements",
            value: freshVerified,
            hint: "Successful status · measured within 24h",
            tone: freshVerified ? "success" : undefined,
            active: tab === "profiles" && view === "current",
            onClick: () => {
              setTab("profiles");
              setView("current");
              setPlatformFilter("all");
              setSearch("");
            },
          },
          {
            label: "Needs attention",
            value: accounts.length - freshVerified,
            hint: "Unavailable, never measured or out of date",
            tone: accounts.length > freshVerified ? "warning" : undefined,
            active: tab === "profiles" && view === "attention",
            onClick: () => {
              setTab("profiles");
              setView("attention");
              setPlatformFilter("all");
              setSearch("");
            },
          },
          {
            label: "Official API readings",
            value: officialCount,
            hint: "Profiles whose latest valid reading used an API",
            onClick: () => setTab("connections"),
          },
        ]}
      />
      <IntelligenceTabs
        value={tab}
        onChange={setTab}
        label="Audience workspace views"
        items={[
          { id: "profiles", label: "Profiles", count: accounts.length, icon: <Users size={15} /> },
          { id: "add", label: "Track a profile", icon: <Plus size={15} /> },
          { id: "connections", label: "Connections", icon: <Plug size={15} /> },
        ]}
      />

      {tab === "profiles" && (
        <section className="space-y-4" aria-label="Audience profiles">
          <IntelligenceHeading
            eyebrow="Audience health"
            title="Your profile portfolio"
            description="Counts belong to each profile. They are not a deduplicated total of people across networks."
            actions={
              <>
                <div className="flex gap-1" aria-label="Profile layout">
                  <button
                    type="button"
                    aria-label="Card view"
                    aria-pressed={layout === "cards"}
                    className="intel-icon-button"
                    onClick={() => setLayout("cards")}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Compact table view"
                    aria-pressed={layout === "compact"}
                    className="intel-icon-button"
                    onClick={() => setLayout("compact")}
                  >
                    <List size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!visibleAccounts.length}
                  onClick={exportProfiles}
                >
                  <Download size={14} />
                  Export view
                </button>
              </>
            }
          />
          {report && (
            <div
              role="status"
              className="intel-notice"
              data-tone={report.unavailable ? "warning" : undefined}
            >
              <ShieldCheck size={17} />
              <div>
                <strong className="text-foreground">
                  Last refresh: {report.succeeded}/{report.updated} profiles measured.
                </strong>{" "}
                {report.unavailable
                  ? `${report.unavailable} need attention. Previous valid readings are preserved and labeled.`
                  : "Each measurement is tied to its source and capture time."}
              </div>
            </div>
          )}
          {!!accounts.length && (
            <>
              <div className="intel-toolbar">
                <label className="intel-search-field">
                  <Search size={15} />
                  <input
                    aria-label="Find audience profiles"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find a profile, label or platform"
                  />
                </label>
                <select
                  className="intel-select"
                  aria-label="Filter audience platform"
                  value={platformFilter}
                  onChange={(event) => setPlatformFilter(event.target.value)}
                >
                  <option value="all">All platforms</option>
                  {PLATFORMS.filter((item) =>
                    accounts.some((account) => account.platform === item.id),
                  ).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  className="intel-select"
                  aria-label="Filter audience measurement status"
                  value={view}
                  onChange={(event) => setView(event.target.value as typeof view)}
                >
                  <option value="all">All profiles</option>
                  <option value="current">Current measurements</option>
                  <option value="attention">Needs attention</option>
                </select>
                <select
                  className="intel-select"
                  aria-label="Sort audience profiles"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as typeof sort)}
                >
                  <option value="attention">Needs attention first</option>
                  <option value="name">Profile name</option>
                  <option value="latest">Latest checked</option>
                </select>
              </div>
              <div className="intel-filter-note">
                <span>
                  {visibleAccounts.length} of {accounts.length} profiles · Missing measurements are
                  unavailable, never assumed to be zero.
                </span>
                {(search || view !== "all" || platformFilter !== "all") && (
                  <button type="button" className="intel-link-button" onClick={resetView}>
                    Reset filters
                  </button>
                )}
              </div>
            </>
          )}
          {!accounts.length ? (
            <IntelligenceEmpty
              title="Your audience starts with one profile"
              description="Add the exact public URL of a profile you manage. Public APIs are available for some networks; other platforms may require an authorized integration."
              action="Track your first profile"
              onAction={() => setTab("add")}
            />
          ) : !visibleAccounts.length ? (
            <IntelligenceEmpty
              title="No profiles match this view"
              description="Reset the search, status and platform filters to return to your full profile portfolio."
              action="Show all profiles"
              onAction={resetView}
            />
          ) : layout === "compact" ? (
            <div
              className="intel-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Audience measurement table"
            >
              <table className="intel-table">
                <thead>
                  <tr>
                    <th scope="col">Profile</th>
                    <th scope="col">Measurement</th>
                    <th scope="col">Change</th>
                    <th scope="col">Data status</th>
                    <th scope="col">Source & time</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAccounts.map((account) => {
                    const { latest, previous, current, delta } = summaries.get(account.id)!;
                    return (
                      <tr key={account.id}>
                        <td>
                          <a
                            href={account.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold hover:text-primary"
                          >
                            {account.label || account.handle}
                            <ExternalLink size={11} className="ml-1 inline" />
                          </a>
                          <small>
                            {PLATFORMS.find((item) => item.id === account.platform)?.label} ·{" "}
                            {account.handle}
                          </small>
                          <button
                            type="button"
                            className="intel-link-button"
                            onClick={() => {
                              setLayout("cards");
                              setSearch(account.handle);
                            }}
                          >
                            Manage profile
                          </button>
                        </td>
                        <td className="font-semibold tabular-nums">
                          {countLabel(latest)}
                          <small>
                            {!current && latest
                              ? "Previous valid count"
                              : account.platform === "youtube"
                                ? "Subscribers"
                                : "Followers"}
                            {latest?.metricSemantics && ` · ${latest.metricSemantics}`}
                          </small>
                        </td>
                        <td>
                          {delta === null
                            ? "Not comparable"
                            : `${delta > 0 ? "+" : ""}${nf.format(delta)}`}
                          <small>
                            {delta !== null && previous
                              ? `Since ${new Date(previous.capturedAt).toLocaleString()}`
                              : "Two exact readings from the same provider are required."}
                          </small>
                        </td>
                        <td>
                          <span className="intel-pill" data-tone={current ? "success" : "warning"}>
                            {current ? "Current <24h" : latest ? "Previous reading" : "Unavailable"}
                          </span>
                          <small>
                            {account.lastAction ||
                              (!current
                                ? "Refresh or inspect connection"
                                : "Last refresh successful")}
                          </small>
                        </td>
                        <td>
                          {latest?.provider || "No valid source"}
                          <small>
                            {latest
                              ? new Date(latest.capturedAt).toLocaleString()
                              : "No valid capture"}
                          </small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="intel-profile-grid">
              {visibleAccounts.map((account) => {
                const { latest, series, previous, current, delta } = summaries.get(account.id)!;
                const DeltaIcon =
                  delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
                const platformName =
                  PLATFORMS.find((item) => item.id === account.platform)?.label || account.platform;
                return (
                  <article key={account.id} className="intel-profile-card">
                    <div className="intel-profile-top">
                      <div className="min-w-0">
                        <div className="intel-eyebrow">{platformName}</div>
                        <a
                          href={account.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block break-words text-base font-semibold tracking-tight hover:text-primary"
                        >
                          {account.label || account.handle}
                        </a>
                        {account.label && (
                          <p className="mt-1 break-words text-xs text-muted-foreground">
                            {account.handle}
                          </p>
                        )}
                      </div>
                      <div className="intel-source-actions">
                        <a
                          href={account.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="intel-icon-button"
                          aria-label={`Open ${account.handle} profile`}
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          className="intel-icon-button"
                          aria-label={`Edit label for ${account.handle}`}
                          onClick={() => {
                            setEditingAccount(account.id);
                            setEditLabel(account.label || "");
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="intel-pill" data-tone={current ? "success" : "warning"}>
                        {current
                          ? "Current · under 24h"
                          : latest
                            ? "Previous measurement"
                            : "No valid measurement"}
                      </span>
                      {latest?.method === "official-api" && (
                        <span className="intel-pill">
                          <BadgeCheck size={11} />
                          Official API
                        </span>
                      )}
                      {latest?.method === "public-page" && (
                        <span className="intel-pill">Identity-verified public page</span>
                      )}
                    </div>
                    {editingAccount === account.id && (
                      <form
                        className="intel-form mt-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void changeAccount(account.id, async () => {
                            await db.audienceAccounts.update(account.id, {
                              label: editLabel.trim(),
                            });
                            markCloudRecordDirty("audienceAccounts", account.id);
                            queueCloudPush();
                            setEditingAccount("");
                            toast.success("Profile label updated");
                          });
                        }}
                      >
                        <label className="intel-field">
                          Display label
                          <input
                            value={editLabel}
                            onChange={(event) => setEditLabel(event.target.value)}
                            placeholder="Optional · e.g. GearUpToFit main channel"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary" disabled={Boolean(pending)}>
                            Save label
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setEditingAccount("")}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                    <div className="intel-profile-measure">
                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">
                          {!current && latest ? "Last valid " : ""}
                          {account.platform === "youtube" ? "subscribers" : "followers"}
                        </p>
                        <div
                          className={
                            latest
                              ? "intel-profile-value"
                              : "text-xl font-semibold text-muted-foreground"
                          }
                        >
                          {countLabel(latest)}
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${delta !== null && delta > 0 ? "text-success" : delta !== null && delta < 0 ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        <DeltaIcon size={15} />
                        {delta === null ? "—" : `${delta > 0 ? "+" : ""}${nf.format(delta)}`}
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {delta !== null && previous
                        ? `Change since ${new Date(previous.capturedAt).toLocaleString()} · same provider and metric`
                        : latest?.metricSemantics === "rounded"
                          ? "Rounded source count. Exact growth is not calculated."
                          : latest?.metricSemantics === "approximate"
                            ? "Approximate source count. Exact growth is not calculated."
                            : "Growth requires two comparable exact measurements."}
                    </p>
                    <div className="intel-profile-spark">
                      <Sparkline readings={series} />
                    </div>
                    {series.length > 1 && (
                      <p className="mb-4 text-[10px] text-muted-foreground">
                        Range-scaled trend · latest {Math.min(series.length, 12)} comparable
                        readings
                      </p>
                    )}
                    <dl className="intel-profile-meta">
                      <div>
                        <dt>Measurement source</dt>
                        <dd>{latest?.provider || "No verified reading"}</dd>
                      </div>
                      <div>
                        <dt>Captured</dt>
                        <dd title={latest?.capturedAt}>
                          {latest ? relTime(latest.capturedAt) : "Not available"}
                        </dd>
                      </div>
                    </dl>
                    {!current && (
                      <div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs leading-relaxed">
                        <p className="font-semibold text-foreground">
                          {account.lastAction ||
                            "Refresh metrics to check this profile's connection."}
                        </p>
                        {account.lastEvidence && (
                          <p className="mt-1 text-muted-foreground">{account.lastEvidence}</p>
                        )}
                        <button
                          type="button"
                          className="intel-link-button"
                          onClick={() => setTab("connections")}
                        >
                          Inspect connections
                        </button>
                      </div>
                    )}
                    <details className="intel-evidence-details">
                      <summary>Evidence & profile settings</summary>
                      <div className="space-y-2">
                        <p>
                          <strong>Latest attempt:</strong>{" "}
                          {account.lastCheckedAt
                            ? new Date(account.lastCheckedAt).toLocaleString()
                            : "Not recorded"}{" "}
                          · {account.lastStatus || "Not checked"}
                        </p>
                        <p>
                          <strong>Confidence:</strong> {latest?.confidence || "Unknown"} ·{" "}
                          <strong>Metric:</strong> {latest?.metricSemantics || "Unavailable"}
                        </p>
                        {latest && (
                          <p>
                            <strong>Valid measurement:</strong>{" "}
                            {new Date(latest.capturedAt).toLocaleString()}
                          </p>
                        )}
                        {latest?.evidence && (
                          <p>
                            <strong>Evidence:</strong> {latest.evidence}
                          </p>
                        )}
                        {account.lastError && (
                          <p className="break-words text-warning">{account.lastError}</p>
                        )}
                        <p>
                          <strong>Saved history:</strong> {(byAccount.get(account.id) || []).length}{" "}
                          readings; {series.length} comparable to the latest valid metric.
                        </p>
                        {confirmRemoval === account.id ? (
                          <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
                            <p className="font-semibold text-foreground">
                              Remove this profile and its {(byAccount.get(account.id) || []).length}{" "}
                              saved readings?
                            </p>
                            <p className="mt-1">
                              This stops tracking here. Your actual social account is unaffected.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn-secondary text-destructive"
                                disabled={Boolean(pending) || busy}
                                onClick={() =>
                                  void changeAccount(account.id, () => removeAccount(account))
                                }
                              >
                                <Trash2 size={14} />
                                Remove profile
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setConfirmRemoval("")}
                              >
                                <X size={14} />
                                Keep profile
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="intel-link-button text-destructive"
                            disabled={busy}
                            onClick={() => setConfirmRemoval(account.id)}
                          >
                            <Trash2 size={13} />
                            Remove tracked profile
                          </button>
                        )}
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "add" && (
        <section className="space-y-5" aria-label="Add an audience profile">
          <IntelligenceHeading
            eyebrow="Grow your portfolio"
            title="Track an exact profile"
            description="Add the public profile URL, then refresh to attempt a measurement. The URL is validated against the selected network before it is saved."
          />
          <Panel>
            <form
              className="intel-form"
              onSubmit={(event) => {
                event.preventDefault();
                void addAccount();
              }}
            >
              <div className="intel-form-grid">
                <label className="intel-field">
                  Platform
                  <select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value as AudiencePlatform)}
                  >
                    {PLATFORMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="intel-field">
                  Public profile URL
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder={PLATFORMS.find((item) => item.id === platform)?.hint}
                    required
                  />
                  <small>Use the exact account profile, not a post, video or search page.</small>
                </label>
              </div>
              <div className="intel-form-footer">
                <p>No follower counts are assumed when you add a profile.</p>
                <button type="submit" disabled={Boolean(pending)} className="btn-primary">
                  <Plus size={15} />
                  {pending === "new" ? "Saving profile…" : "Track profile"}
                </button>
              </div>
            </form>
          </Panel>
          <div className="intel-notice">
            <Plug size={18} />
            <div>
              GitHub and Bluesky support public API measurements. Other networks may need an
              authorized integration or an accessible identity-verified page.{" "}
              <button
                type="button"
                className="intel-link-button"
                onClick={() => setTab("connections")}
              >
                Check available connections
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "connections" && (
        <section className="space-y-5" aria-label="Audience integration status">
          <IntelligenceHeading
            eyebrow="Measurement infrastructure"
            title="Connect reliable data"
            description="Inspect the methods available to this deployment. A configured integration still needs valid permissions and a successful profile measurement."
          />
          <AudienceConnectionsPanel />
        </section>
      )}
      <CollectorStatusPanel kind="audience" />
    </div>
  );
}
