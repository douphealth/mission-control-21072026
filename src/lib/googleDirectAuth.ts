// ─── Direct Google OAuth (Google Identity Services) ─────────────────────────
// Works on ANY deployment (pages.dev, custom domains, localhost) — no Lovable
// Cloud broker required. The user supplies their own Google OAuth Client ID
// once (Settings → Google Connection, or VITE_GOOGLE_CLIENT_ID at build time);
// tokens are issued in-browser via google.accounts.oauth2 and cached locally.
//
// Google Cloud Console setup (one-time, ~3 minutes):
//   1. console.cloud.google.com → APIs & Services → Library → enable
//      "Google Calendar API", "Google Tasks API", and "Google Drive API".
//   2. OAuth consent screen → External → add yourself as test user (or publish).
//   3. Credentials → Create OAuth client ID → Web application.
//   4. Authorized JavaScript origins: add this app's origin (e.g.
//      https://mission-control-21072026.pages.dev).
//   5. Copy the Client ID (ends in .apps.googleusercontent.com) into Settings.

const CLIENT_ID_KEY = "mc_google_oauth_client_id";
const SERVER_CLIENT_ID_KEY = "mc_google_oauth_client_id_server";
const TOKEN_KEY = "mc_google_access_token_v1";
const TOKEN_TTL_MS = 55 * 60 * 1000; // Google access tokens live ~60 min

export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar";
export const GTASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
export const GDRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  GCAL_SCOPE,
  GTASKS_SCOPE,
  GDRIVE_APPDATA_SCOPE,
].join(" ");

export type StoredGoogleToken = {
  access_token: string;
  expires_at: number;
  scope: string;
  email?: string;
};

/** Where the GIS script is loaded from. */
const GIS_SRC = "https://accounts.google.com/gsi/client";

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  const w = window as any;
  if (w.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new Error("Could not load Google sign-in. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

/** The configured Google OAuth Client ID (build-time, user-pasted, or app-provided). */
export function getGoogleClientId(): string {
  if (typeof window === "undefined") return "";
  const env = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (env) return String(env);
  try {
    return localStorage.getItem(CLIENT_ID_KEY) || localStorage.getItem(SERVER_CLIENT_ID_KEY) || "";
  } catch {
    return "";
  }
}

let clientIdLoad: Promise<string> | null = null;

/**
 * Fetch the Google Client ID this app already ships with, so the user never
 * has to create or paste one. Cached locally; falls back silently when the
 * app is served without a configured identity (pure static hosting).
 */
export async function ensureGoogleClientId(): Promise<string> {
  const existing = getGoogleClientId();
  if (existing) return existing;
  if (!clientIdLoad) {
    clientIdLoad = (async () => {
      try {
        const { getServerGoogleClientId } = await import("@/lib/googleConfig.functions");
        const { clientId } = await getServerGoogleClientId();
        if (clientId) {
          try {
            localStorage.setItem(SERVER_CLIENT_ID_KEY, clientId);
          } catch {
            /* private-mode browsers keep it in memory only */
          }
        }
        return clientId || "";
      } catch {
        return "";
      } finally {
        clientIdLoad = null;
      }
    })();
  }
  return clientIdLoad;
}

export function setGoogleClientId(id: string): void {
  if (typeof window === "undefined") return;
  const clean = id.trim();
  if (clean) localStorage.setItem(CLIENT_ID_KEY, clean);
  else localStorage.removeItem(CLIENT_ID_KEY);
  // A new client ID invalidates any token from the previous one.
  localStorage.removeItem(TOKEN_KEY);
}

export function hasGoogleClientId(): boolean {
  return /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(getGoogleClientId());
}

export function getGoogleOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function readGoogleToken(): StoredGoogleToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredGoogleToken;
    if (t.expires_at - 30_000 < Date.now()) return null;
    return t;
  } catch {
    return null;
  }
}

export function googleTokenHasScopes(token: StoredGoogleToken, scopes: string[]): boolean {
  const granted = new Set(token.scope.split(/\s+/).filter(Boolean));
  return scopes.every((scope) => granted.has(scope));
}

export function clearGoogleToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  const w = window as any;
  if (w.google?.accounts?.oauth2 && getGoogleClientId()) {
    try {
      w.google.accounts.oauth2.revoke(getGoogleClientId(), () => {});
    } catch {
      /* best-effort */
    }
  }
}

function saveToken(t: StoredGoogleToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

/**
 * Open the Google consent/account picker via GIS token client.
 * Returns the fresh access token. Google remembers consent, so for the
 * user this is a one-tap account pick on every subsequent sign-in.
 */
export async function requestGoogleToken(opts?: {
  scope?: string;
  prompt?: string;
}): Promise<StoredGoogleToken> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      "No Google Client ID configured. Open Settings → Google Connection and paste your OAuth Client ID.",
    );
  }
  if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new Error(
      "That does not look like a Google OAuth Client ID — it should end in .apps.googleusercontent.com.",
    );
  }
  await loadGis();
  const w = window as any;
  if (!w.google?.accounts?.oauth2) {
    throw new Error("Google sign-in is unavailable in this browser.");
  }

  return new Promise<StoredGoogleToken>((resolve, reject) => {
    let settled = false;
    const client = w.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: opts?.scope || GOOGLE_SCOPES,
      prompt: opts?.prompt || "",
      callback: (resp: any) => {
        settled = true;
        if (resp?.error) {
          reject(new Error(formatAuthError(resp.error, resp.error_description)));
          return;
        }
        if (!resp?.access_token) {
          reject(new Error("Google did not return an access token."));
          return;
        }
        const token: StoredGoogleToken = {
          access_token: resp.access_token,
          expires_at: Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 10_000,
          scope: resp.scope || opts?.scope || GOOGLE_SCOPES,
          email: undefined,
        };
        saveToken(token);
        resolve(token);
      },
      error_callback: (err: any) => {
        if (settled) return;
        settled = true;
        const type = err?.type || "";
        if (type === "popup_closed" || type === "popup_failed_to_open") {
          reject(
            new Error(
              "Google sign-in was cancelled or the popup was blocked. Allow popups and try again.",
            ),
          );
        } else {
          reject(new Error(formatAuthError(type, err?.message)));
        }
      },
    });
    client.requestAccessToken({ prompt: opts?.prompt || "" });
  });
}

function formatAuthError(code: string, desc?: string): string {
  const raw = `${code}${desc ? `: ${desc}` : ""}`.toLowerCase();
  if (raw.includes("access_denied"))
    return "Google access was denied. Approve the permission prompt and try again.";
  if (raw.includes("origin_mismatch") || raw.includes("invalid_origin")) {
    return `Google rejected this app origin (${getGoogleOrigin()}). Add it under "Authorized JavaScript origins" in your Google OAuth client, then try again.`;
  }
  if (raw.includes("popup"))
    return "Google sign-in popup was blocked. Allow popups for this site and try again.";
  if (raw.includes("idpiframe") || raw.includes("third_party")) {
    return "Google blocked sign-in in this frame. Open the app in its own tab and try again.";
  }
  return `Google sign-in failed${desc ? ` — ${desc}` : ` (${code})`}`;
}

/** A still-valid token, or null. */
export function validGoogleToken(): StoredGoogleToken | null {
  return readGoogleToken();
}

/** Force a fresh token. Non-interactive callers (API fetches) must pass
 * interactive:false so a background sync never pops the consent window. */
export async function ensureGoogleToken(
  opts?: { scope?: string; prompt?: string; interactive?: boolean } | undefined,
): Promise<StoredGoogleToken> {
  const existing = readGoogleToken();
  const requiredScopes = (opts?.scope || GOOGLE_SCOPES).split(/\s+/).filter(Boolean);
  if (existing && googleTokenHasScopes(existing, requiredScopes)) return existing;
  if (opts?.interactive === false) {
    throw new Error("Not connected to Google");
  }
  return requestGoogleToken(opts);
}

/** Best-effort email for the connected account (from Google's userinfo). */
export async function fetchGoogleEmail(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}
