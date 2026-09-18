// Google Tasks — direct Google OAuth via Google Identity Services (GIS).
// Works on ANY deployment (pages.dev, custom domains, localhost) — no Lovable
// Cloud broker. The user's own OAuth Client ID is configured once in Settings
// → Google Connection (or via VITE_GOOGLE_CLIENT_ID at build time).

import {
  GOOGLE_SCOPES,
  GTASKS_SCOPE,
  clearGoogleToken,
  fetchGoogleEmail,
  getGoogleClientId,
  getGoogleOrigin,
  readGoogleToken,
  requestGoogleToken,
  googleTokenHasScopes,
  validGoogleToken,
} from "@/lib/googleDirectAuth";
import type { StoredGoogleToken } from "@/lib/googleDirectAuth";

const STORAGE_KEY = "google_tasks_email_v1";

export function getGoogleTasksOAuthDiagnostics() {
  const origin = getGoogleOrigin();
  const clientId = getGoogleClientId();
  const hasId = /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId);
  return {
    origin,
    embedded: typeof window !== "undefined" && window.self !== window.top,
    scopes: GOOGLE_SCOPES,
    mode: hasId ? "Direct Google OAuth (user Client ID)" : "Not configured",
    clientIdConfigured: hasId,
  };
}

function formatGoogleAuthError(error: unknown): Error {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as any).message)
        : "";
  const lower = raw.toLowerCase();

  if (
    lower.includes("origin_mismatch") ||
    lower.includes("invalid_origin") ||
    lower.includes("origin mismatch")
  ) {
    return new Error(
      `Google rejected this app origin (${originLabel()}). Open Google Cloud Console → Credentials → your OAuth client → add this origin under "Authorized JavaScript origins", then try again.`,
    );
  }
  if (lower.includes("popup")) {
    return new Error("Google sign-in popup was blocked. Allow popups for this site and try again.");
  }
  if (lower.includes("idpiframe") || lower.includes("iframe")) {
    return new Error("Google blocked the sign-in frame. Try again from the standalone app tab.");
  }
  return new Error(raw || "Google sign-in failed");
}

function originLabel(): string {
  return getGoogleOrigin() || "this origin";
}

async function ensureToken(interactive = false): Promise<StoredGoogleToken> {
  const token = validGoogleToken();
  if (token && googleTokenHasScopes(token, [GTASKS_SCOPE])) return token;
  if (!interactive) throw new Error("Not connected to Google Tasks");
  try {
    return await requestGoogleToken({ scope: GOOGLE_SCOPES });
  } catch (err) {
    throw formatGoogleAuthError(err);
  }
}

export async function signIn(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in is only available in the browser");
  }
  const { ensureGoogleClientId } = await import("@/lib/googleDirectAuth");
  if (!(await ensureGoogleClientId())) {
    throw new Error("Google setup is required once. Press Connect Google and follow the three steps.");
  }
  try {
    const token = await requestGoogleToken({ scope: GOOGLE_SCOPES, prompt: "select_account" });
    const email = await fetchGoogleEmail(token.access_token);
    if (email) {
      try {
        localStorage.setItem(STORAGE_KEY, email);
      } catch {
        /* non-fatal */
      }
    }
    const { startCloudSync } = await import("@/lib/cloudSync");
    await startCloudSync(true);
    try {
      const { syncGoogleTasks } = await import("@/lib/googleTasksSync");
      await syncGoogleTasks();
    } catch {
      /* non-fatal — first sync retries on the next pass */
    }
  } catch (err) {
    throw formatGoogleAuthError(err);
  }
}

export function isSignedIn(): boolean {
  return readGoogleToken() !== null;
}

export async function refreshSignInState(): Promise<boolean> {
  // GIS tokens cannot be silently renewed; a valid cached token is the
  // only silent "connected" state. Never pops consent on background calls.
  return validGoogleToken() !== null;
}

export function signedInEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function signOut(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-fatal */
  }
  clearGoogleToken();
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureToken();
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 401) {
    clearGoogleToken();
    throw new Error("Google Tasks session expired — please sign in again");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Tasks ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type GTaskList = { id: string; title: string };
export type GTask = {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  updated?: string;
  position?: string;
  parent?: string;
};

export async function listTaskLists(): Promise<GTaskList[]> {
  const r = await api<{ items?: GTaskList[] }>("/users/@me/lists");
  return r.items || [];
}

export async function listTasks(listId: string, showCompleted = false): Promise<GTask[]> {
  const qs = new URLSearchParams({
    maxResults: "100",
    showCompleted: String(showCompleted),
    showHidden: "false",
  });
  const r = await api<{ items?: GTask[] }>(`/lists/${encodeURIComponent(listId)}/tasks?${qs}`);
  return r.items || [];
}

export async function createTask(listId: string, body: Partial<GTask>): Promise<GTask> {
  return api<GTask>(`/lists/${encodeURIComponent(listId)}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTask(
  listId: string,
  taskId: string,
  body: Partial<GTask>,
): Promise<GTask> {
  return api<GTask>(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTask(listId: string, taskId: string): Promise<void> {
  await api<void>(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
}
