import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/db";
import { getCloudUserId } from "@/lib/cloudSync";
import {
  getDailyDigestHealth,
  syncDailyDigestSnapshot,
  type DigestHealth,
} from "@/lib/dailyDigestSync";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const SCHEDULE_VERSION = 2;
const DEFAULT_SEND_HOUR = 9;

function hourLabel(hour: number) {
  return new Date(2020, 0, 1, hour).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DailyEmailSettings() {
  const settings = useLiveQuery(() => db.settings.get("default"), []);
  const [busy, setBusy] = useState<"sync" | "send" | null>(null);
  const [health, setHealth] = useState<DigestHealth | null>(null);

  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const enabled = settings?.digestEmailEnabled !== false;
  const sendHour =
    settings?.digestEmailScheduleVersion === SCHEDULE_VERSION &&
    Number.isFinite(settings?.digestEmailHour)
      ? Number(settings?.digestEmailHour)
      : DEFAULT_SEND_HOUR;
  const timezone = settings?.digestEmailTimezone || browserTimezone;
  const recipient = getCloudUserId();

  const refreshHealth = async () => {
    try {
      setHealth(await getDailyDigestHealth());
    } catch {
      setHealth({
        ok: false,
        storageConfigured: false,
        emailConfigured: false,
        mailflareConfigured: false,
        resendConfigured: false,
        schedulerReady: false,
      });
    }
  };

  useEffect(() => {
    void refreshHealth();
  }, []);

  useEffect(() => {
    if (!settings) return;
    if (settings.digestEmailScheduleVersion === SCHEDULE_VERSION) return;

    // User explicitly requested a 09:00 morning briefing. Migrate the previous
    // default once, then respect any future manual schedule change.
    void db.settings.update("default", {
      digestEmailEnabled: true,
      digestEmailHour: DEFAULT_SEND_HOUR,
      digestEmailTimezone: settings.digestEmailTimezone || browserTimezone,
      digestEmailScheduleVersion: SCHEDULE_VERSION,
    });
  }, [settings, browserTimezone]);

  const update = async (changes: {
    digestEmailEnabled?: boolean;
    digestEmailHour?: number;
    digestEmailTimezone?: string;
  }) => {
    await db.settings.update("default", {
      ...changes,
      digestEmailScheduleVersion: SCHEDULE_VERSION,
    });
    void syncDailyDigestSnapshot({ silent: true });
  };

  const syncNow = async (sendNow = false) => {
    setBusy(sendNow ? "send" : "sync");
    try {
      const result = await syncDailyDigestSnapshot({ sendNow });
      if (!result.ok) throw new Error(result.error || "Daily briefing sync failed.");
      toast.success(
        sendNow ? "Executive briefing sent" : "Executive briefing synced",
        result.email ? { description: `Recipient: ${result.email}` } : undefined,
      );
      await refreshHealth();
    } catch (error) {
      toast.error(sendNow ? "Email was not sent" : "Briefing was not synced", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(null);
    }
  };

  const ready =
    health?.storageConfigured &&
    health?.emailConfigured &&
    health?.schedulerReady;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_24px_70px_-50px_hsl(var(--foreground)/0.45)]">
        <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-card to-sky-500/5 p-5 sm:p-6">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.17em] text-primary">
                <Mail size={14} />
                09:00 executive briefing
              </div>
              <h2 className="mt-2 font-display text-2xl font-black tracking-[-0.04em]">
                Wake up to the decisions that matter.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                One morning email compresses Mission Control into the three moves to execute,
                blockers to clear, today&apos;s planned workload, deadlines, reminders, finance,
                SEO actions, system failures, website incidents, repo next steps, and recent wins.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => void update({ digestEmailEnabled: !enabled })}
              className={`relative h-8 w-14 shrink-0 rounded-full border transition-all ${
                enabled ? "border-primary/30 bg-primary" : "border-border/60 bg-secondary"
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                  enabled ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Clock3 size={14} className="text-primary" />
              Daily delivery
            </div>
            <div className="mt-3 grid grid-cols-[110px_1fr] gap-2">
              <select
                value={sendHour}
                onChange={(event) =>
                  void update({ digestEmailHour: Number(event.target.value) })
                }
                className="rounded-xl border border-border/50 bg-card px-3 py-2 text-sm font-semibold"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hourLabel(hour)}
                  </option>
                ))}
              </select>
              <input
                value={timezone}
                onChange={(event) =>
                  void update({
                    digestEmailTimezone: event.target.value.trim() || browserTimezone,
                  })
                }
                className="min-w-0 rounded-xl border border-border/50 bg-card px-3 py-2 text-xs"
                aria-label="Daily email timezone"
              />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Default is 09:00 in your local timezone. The scheduler checks on the hour and
              sends at most once per local calendar day.
            </p>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/45 p-4">
            <div className="flex items-center gap-2 text-xs font-bold">
              <ShieldCheck size={14} className="text-primary" />
              Verified recipient
            </div>
            <p className="mt-3 truncate text-sm font-semibold">
              {recipient || "Connect Google to verify the recipient"}
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Passwords, API keys, credential-vault contents, and note bodies never enter
              the email snapshot.
            </p>
          </div>
        </div>

        <div className="grid gap-2 border-t border-border/40 p-4 sm:grid-cols-3 sm:p-5">
          {[
            ["Snapshot store", health?.storageConfigured],
            ["Mailflare delivery", health?.mailflareConfigured || health?.resendConfigured],
            ["09:00 scheduler", health?.schedulerReady],
          ].map(([label, ok]) => (
            <div
              key={String(label)}
              className="flex items-center gap-2 rounded-xl border border-border/40 bg-secondary/30 px-3 py-2"
            >
              {ok ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <TriangleAlert size={14} className="text-amber-500" />
              )}
              <span className="text-[11px] font-semibold">{label}</span>
              <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground">
                {ok ? "ready" : "setup"}
              </span>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="rounded-2xl border border-border/40 bg-background/45 p-3 text-[10px] leading-relaxed text-muted-foreground">
            {health?.mailflareConfigured
              ? "Mailflare is the primary transport. Resend remains an automatic fallback when configured."
              : health?.resendConfigured
                ? "Resend fallback is active. Add Mailflare runtime configuration to make Mailflare primary."
                : "Email transport is not configured yet. Add Mailflare (preferred) or Resend runtime configuration."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 bg-secondary/15 p-4 sm:p-5">
          <button
            onClick={() => void syncNow(false)}
            disabled={busy !== null}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/50 bg-card px-4 text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy === "sync" ? "animate-spin" : ""} />
            Refresh briefing
          </button>
          <button
            onClick={() => void syncNow(true)}
            disabled={busy !== null || !ready}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/15 disabled:opacity-40"
          >
            <Send size={13} />
            Send live test
          </button>
          <button
            onClick={() => void refreshHealth()}
            className="ml-auto text-[10px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Recheck backend
          </button>
        </div>
      </section>
    </div>
  );
}
