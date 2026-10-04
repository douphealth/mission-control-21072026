import { db } from "@/lib/db";
import {
  GMAIL_SEND_SCOPE,
  GOOGLE_EMAIL_SEND_SCOPES,
  googleTokenHasScopes,
  readGoogleToken,
  requestGoogleToken,
} from "@/lib/googleDirectAuth";
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

type RenderedDigest = {
  ok: boolean;
  email?: string;
  subject?: string;
  text?: string;
  html?: string;
  error?: string;
};

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${toBase64Url(value).replace(/-/g, "+").replace(/_/g, "/")}?=`;
}

async function sendDigestThroughGmail(snapshot: Awaited<ReturnType<typeof buildExecutiveDigestSnapshot>>) {
  let token = readGoogleToken();
  if (!token || !googleTokenHasScopes(token, [GMAIL_SEND_SCOPE])) {
    token = await requestGoogleToken({
      scope: GOOGLE_EMAIL_SEND_SCOPES,
      prompt: "",
    });
  }

  const renderedResponse = await fetch("/api/public/digest", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({ action: "render", snapshot }),
  });

  const rendered = (await renderedResponse.json().catch(() => ({}))) as RenderedDigest;
  if (!renderedResponse.ok || !rendered.ok || !rendered.email || !rendered.subject || !rendered.html) {
    throw new Error(rendered.error || "Could not prepare the executive email.");
  }

  const boundary = `mc_${crypto.randomUUID().replace(/-/g, "")}`;
  const raw = [
    `From: Mission Control <${rendered.email}>`,
    `To: ${rendered.email}`,
    `Subject: ${encodeHeader(rendered.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    rendered.text || "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    rendered.html,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(raw) }),
  });

  if (!sendResponse.ok) {
    const detail = (await sendResponse.text().catch(() => "")).slice(0, 500);
    throw new Error(
      sendResponse.status === 403
        ? "Google Gmail send permission is not enabled for this OAuth app yet."
        : `Gmail delivery failed (${sendResponse.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return { ok: true, sent: true, email: rendered.email } satisfies DigestSyncResult;
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

  // Manual send must work independently from Mailflare/Resend/Supabase.
  // Use the already-connected Google account and request gmail.send only when
  // the user explicitly presses "Send executive email now".
  if (options?.sendNow) {
    const result = await sendDigestThroughGmail(snapshot);
    const now = new Date().toISOString();
    await db.settings.update("default", {
      digestEmailLastSnapshotAt: now,
      digestEmailLastSentAt: now,
    });
    return result;
  }

  const response = await fetch("/api/public/digest", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      action: "snapshot",
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
