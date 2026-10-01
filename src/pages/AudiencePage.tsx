import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  Gauge,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAudienceAccounts, useAudienceReadings, genId } from "@/hooks/useTableData";
import { db, type AudiencePlatform, type AudienceReading } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { runAudienceCollector } from "@/lib/controlCenter";
import { isTrustedAudienceReading } from "@/lib/intelligenceQuality";
import { CCHeader, EmptyState, Panel, relTime } from "@/components/controlcenter/ui";

const PLATFORMS: {
  id: AudiencePlatform;
  label: string;
  hint: string;
  hosts: string[];
}[] = [
  { id: "youtube", label: "YouTube", hint: "https://youtube.com/@handle", hosts: ["youtube.com", "youtu.be"] },
  { id: "x", label: "X", hint: "https://x.com/handle", hosts: ["x.com", "twitter.com"] },
  { id: "instagram", label: "Instagram", hint: "https://instagram.com/handle", hosts: ["instagram.com"] },
  { id: "facebook", label: "Facebook", hint: "https://facebook.com/page", hosts: ["facebook.com", "fb.com"] },
  { id: "linkedin", label: "LinkedIn", hint: "https://linkedin.com/company/x", hosts: ["linkedin.com"] },
  { id: "threads", label: "Threads", hint: "https://threads.net/@handle", hosts: ["threads.net"] },
  { id: "tiktok", label: "TikTok", hint: "https://tiktok.com/@handle", hosts: ["tiktok.com"] },
];

const nf = new Intl.NumberFormat("en-US");

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function Sparkline({ readings }: { readings: AudienceReading[] }) {
  const values = readings
    .filter((reading) => reading.followers !== null)
    .slice(-12)
    .map((reading) => reading.followers as number);
  if (values.length < 2) {
    return <div className="cc-audience-spark-empty">Needs 2 readings for trend</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 34 - ((value - min) / span) * 28;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="cc-audience-spark" aria-label="Follower trend">
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AudiencePage() {
  const accounts = useAudienceAccounts();
  const readings = useAudienceReadings();
  const [platform, setPlatform] = useState<AudiencePlatform>("youtube");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const autoRefreshStarted = useRef(false);

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

  const latestValid = useMemo(() => {
    const map = new Map<string, AudienceReading>();
    accounts.forEach((account) => {
      const latest = [...(byAccount.get(account.id) ?? [])]
        .reverse()
        .find((reading) => isTrustedAudienceReading(reading));
      if (latest) map.set(account.id, latest);
    });
    return map;
  }, [accounts, byAccount]);

  const officialCount = [...latestValid.values()].filter(
    (reading) => reading.method === "official-api",
  ).length;
  const recentChecks = accounts.filter(
    (account) =>
      account.lastCheckedAt &&
      Date.now() - new Date(account.lastCheckedAt).getTime() < 24 * 3_600_000,
  ).length;
  const unavailable = accounts.filter(
    (account) => account.lastStatus === "limited" || account.lastStatus === "unavailable",
  ).length;

  useEffect(() => {
    if (autoRefreshStarted.current || !accounts.length) return;
    const stale = accounts.some(
      (account) =>
        !account.lastCheckedAt ||
        Date.now() - new Date(account.lastCheckedAt).getTime() > 12 * 3_600_000,
    );
    if (!stale) return;
    autoRefreshStarted.current = true;
    void runAudienceCollector().catch(() => {
      // Account/collector status surfaces failures; auto-refresh stays quiet.
    });
  }, [accounts]);

  const addAccount = async () => {
    const clean = url.trim();
    if (!clean) return;
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

    const duplicate = accounts.find((account) => account.url.toLowerCase() === normalised.toLowerCase());
    if (duplicate) {
      toast.info("This profile is already tracked");
      return;
    }

    const handle = parsed.pathname.replace(/^\/+|\/+$/g, "") || host;
    const record = {
      id: genId(),
      platform,
      handle,
      url: normalised,
      createdAt: new Date().toISOString(),
    };
    await db.audienceAccounts.put(record);
    markCloudRecordDirty("audienceAccounts", record.id);
    queueCloudPush();
    setUrl("");
    toast.success(`Tracking ${handle}`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const { updated } = await runAudienceCollector();
      toast.success(
        updated
          ? `Checked ${updated} ${updated === 1 ? "profile" : "profiles"}`
          : "Nothing to update",
        {
          description:
            "Valid metrics are stored; failed/limited checks never overwrite the last good reading.",
        },
      );
    } catch (error: any) {
      toast.error("Audience refresh failed", { description: String(error?.message ?? error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <CCHeader
        title="Audience Intelligence"
        subtitle="Real public audience measurements with source method, confidence and freshness. Official APIs are preferred when configured; public-page parsing is clearly labeled as a fallback."
        actions={
          <button
            onClick={() => void refresh()}
            disabled={busy || !accounts.length}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            Refresh metrics
          </button>
        }
      />

      <section className="grid gap-2 sm:grid-cols-4">
        {[
          ["Tracked profiles", accounts.length, "primary"],
          ["Valid readings", latestValid.size, "success"],
          ["Official API", officialCount, "info"],
          ["Limited / unavailable", unavailable, unavailable ? "warning" : "success"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="cc-intel-kpi" data-tone={String(tone)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <ShieldCheck size={15} className="text-success" />
              Measurement policy
            </div>
            <p className="mt-1 max-w-3xl text-[10px] leading-5 text-muted-foreground">
              YouTube uses the official YouTube Data API when <code>YOUTUBE_API_KEY</code> is
              configured. Public-page fallbacks are accepted only when the returned page matches
              the requested profile identity and is not a login/challenge page. Hidden or uncertain
              counts stay unavailable — never zero, never guessed.
            </p>
          </div>
          <span className="rounded-full border border-border/50 bg-secondary/50 px-2.5 py-1 text-[9px] font-bold text-muted-foreground">
            {recentChecks}/{accounts.length} checked in last 24h
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1.6fr_auto]">
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as AudiencePlatform)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            {PLATFORMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void addAccount()}
            placeholder={PLATFORMS.find((item) => item.id === platform)?.hint}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button onClick={() => void addAccount()} className="btn-primary justify-center">
            <Plus size={14} /> Track profile
          </button>
        </div>
      </Panel>

      {accounts.length === 0 ? (
        <EmptyState
          title="No profiles tracked yet"
          hint="Add the exact public profile URL. Mission Control validates that the URL matches the selected platform before saving it."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {accounts.map((account) => {
            const list = byAccount.get(account.id) ?? [];
            const valid = list.filter(
              (reading) => reading.followers !== null && reading.status === "ok",
            );
            const latest = valid.at(-1);
            const previousComparable = latest
              ? [...valid]
                  .slice(0, -1)
                  .reverse()
                  .find(
                    (reading) =>
                      reading.method === latest.method &&
                      reading.provider === latest.provider &&
                      Boolean(reading.approximate) === Boolean(latest.approximate),
                  )
              : undefined;
            const comparable = Boolean(latest && previousComparable);
            const delta =
              latest && previousComparable
                ? (latest.followers as number) - (previousComparable.followers as number)
                : null;
            const DeltaIcon =
              delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
            const platformLabel =
              PLATFORMS.find((item) => item.id === account.platform)?.label ?? account.platform;

            return (
              <article key={account.id} className="cc-audience-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        {platformLabel}
                      </span>
                      {latest?.method === "official-api" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-bold text-success">
                          <BadgeCheck size={9} /> Official API
                        </span>
                      )}
                      {latest?.method === "public-page" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-1.5 py-0.5 text-[8px] font-bold text-info">
                          <ShieldCheck size={9} /> Identity-verified public page
                        </span>
                      )}
                    </div>
                    <a
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-sm font-extrabold text-foreground hover:text-primary"
                    >
                      {account.handle}
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                      aria-label="Open profile"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      onClick={async () => {
                        await db.audienceAccounts.delete(account.id);
                        const accountReadings = readings.filter((reading) => reading.accountId === account.id);
                        if (accountReadings.length) {
                          await db.audienceReadings.bulkDelete(accountReadings.map((reading) => reading.id));
                          accountReadings.forEach((reading) =>
                            markCloudRecordDirty("audienceReadings", reading.id, "delete"),
                          );
                        }
                        markCloudRecordDirty("audienceAccounts", account.id, "delete");
                        queueCloudPush();
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove profile"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      Followers
                    </div>
                    <div className="mt-0.5 text-3xl font-black tabular-nums tracking-tight text-foreground">
                      {latest?.followers !== null && latest?.followers !== undefined
                        ? `${latest.approximate ? "~" : ""}${nf.format(latest.followers)}`
                        : "—"}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 rounded-xl px-2 py-1 text-[9px] font-bold ${
                      delta !== null && delta > 0
                        ? "bg-success/10 text-success"
                        : delta !== null && delta < 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <DeltaIcon size={11} />
                    {delta === null
                      ? comparable
                        ? "No change"
                        : "No comparable prior"
                      : `${delta > 0 ? "+" : ""}${nf.format(delta)}`}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-border/35 bg-background/35 p-2">
                  <Sparkline readings={valid} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
                  <div className="rounded-xl bg-secondary/35 p-2">
                    <span className="block text-muted-foreground">Provider</span>
                    <strong className="mt-0.5 block truncate text-foreground">
                      {latest?.provider || "No valid reading"}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-secondary/35 p-2">
                    <span className="block text-muted-foreground">Confidence</span>
                    <strong className="mt-0.5 block capitalize text-foreground">
                      {latest?.confidence || "unknown"}
                    </strong>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] text-muted-foreground">
                  <Gauge size={10} />
                  <span>
                    {latest ? `valid reading ${relTime(latest.capturedAt)}` : "no valid metric yet"}
                  </span>
                  {account.lastCheckedAt && <span>· checked {relTime(account.lastCheckedAt)}</span>}
                </div>

                {account.lastStatus && account.lastStatus !== "ok" && (
                  <div className="mt-2 rounded-xl border border-warning/20 bg-warning/7 p-2 text-[9px] leading-4 text-muted-foreground">
                    Latest refresh was <strong className="text-warning">{account.lastStatus}</strong>.
                    {latest
                      ? " The previous valid metric is preserved above."
                      : " No follower value is shown because the platform did not expose one reliably."}
                  </div>
                )}

                {latest?.evidence && (
                  <p className="mt-2 text-[8.5px] leading-4 text-muted-foreground/75">
                    Evidence: {latest.evidence}
                    {latest.approximate ? " Displayed with ~ because the public source exposed a compact value." : ""}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
