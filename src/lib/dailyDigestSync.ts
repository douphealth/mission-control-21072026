import { db } from "@/lib/db";
import { readGoogleToken } from "@/lib/googleDirectAuth";
import { buildExecutiveDigestSnapshot } from "@/lib/dailyDigestSnapshot";

export interface DigestSyncResult {
  ok: boolean;
  sent?: boolean;
  email?: string;
  error?: string;
  configured?: boolean;
}

export interface DigestHealth {
  ok: boolean;
  storageConfigured: boolean;
  emailConfigured: boolean;
  mailflareConfigured: boolean;
  resendConfigured: boolean;
  schedulerReady: boolean;
}

let queuedTimer: number | null = null;
let queuedInFlight = false;

/**
 * Keep the server-side executive snapshot fresh without turning every local
 * mutation into a network request. Repeated writes collapse into one upload.
 */
export function queueDailyDigestSnapshot(delayMs = 5000) {
  if (typeof window === "undefined") return;
  if (queuedTimer !== null) window.clearTimeout(queuedTimer);
  queuedTimer = window.setTimeout(async () => {
    queuedTimer = null;
    if (queuedInFlight) return;
    queuedInFlight = true;
    try {
      await syncDailyDigestSnapshot({ silent: true });
    } finally {
      queuedInFlight = false;
    }
  }, Math.max(1000, delayMs));
}

export async function syncDailyDigestSnapshot(options?: {
  sendNow?: boolean;
  silent?: boolean;
}): Promise<DigestSyncResult> {
  const settings = await db.settings.get("default");
  if (settings?.digestEmailEnabled === false && !options?.sendNow) return { ok: true };

  const token = readGoogleToken();
  if (!token?.access_token) {
    return {
      ok: false,
      error: "Connect Google in Mission Control so the daily email recipient can be verified.",
    };
  }

  const snapshot = await buildExecutiveDigestSnapshot();
  const response = await fetch("/api/public/digest", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      action: options?.sendNow ? "send-now" : "snapshot",
      snapshot,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as DigestSyncResult;
  if (!response.ok || data.ok === false) {
    if (!options?.silent) {
      throw new Error(data.error || "Daily briefing sync failed.");
    }
    return {
      ok: false,
      error: data.error || "Daily briefing sync failed.",
      configured: data.configured,
    };
  }

  const now = new Date().toISOString();
  await db.settings.update("default", {
    digestEmailLastSnapshotAt: now,
    ...(data.sent ? { digestEmailLastSentAt: now } : {}),
  });

  return data;
}

export async function getDailyDigestHealth(): Promise<DigestHealth> {
  const response = await fetch("/api/public/digest", { cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as Partial<DigestHealth>;
  return {
    ok: response.ok && data.ok === true,
    storageConfigured: data.storageConfigured === true,
    emailConfigured: data.emailConfigured === true,
    mailflareConfigured: data.mailflareConfigured === true,
    resendConfigured: data.resendConfigured === true,
    schedulerReady: data.schedulerReady === true,
  };
}
