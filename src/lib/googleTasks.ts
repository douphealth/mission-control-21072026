// Google Tasks — uses Lovable Cloud managed Google OAuth.
// This avoids the hardcoded Google Client ID/origin mismatch failure entirely.

import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const SCOPES = `openid email profile ${TASKS_SCOPE}`;
const STORAGE_KEY = "google_tasks_token_v1";

type StoredToken = { access_token: string; expires_at: number };

export function getGoogleTasksOAuthDiagnostics() {
  if (typeof window === "undefined") {
    return {
      origin: "",
      embedded: false,
      scopes: SCOPES,
      mode: "Lovable Cloud managed Google OAuth",
    };
  }
  return {
    origin: window.location.origin,
    embedded: window.self !== window.top,
    scopes: SCOPES,
    mode: "Lovable Cloud managed Google OAuth",
  };
}

function formatGoogleAuthError(error: unknown): Error {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object"
        ? [
            (error as any).message,
            (error as any).error,
            (error as any).type,
            (error as any).details,
          ]
            .filter(Boolean)
            .join(": ")
        : "";
  const lower = raw.toLowerCase();

  if (lower.includes("origin_mismatch") || lower.includes("origin mismatch")) {
    return new Error(
      "Google rejected the old custom OAuth client. Refresh the app and try again — this screen now uses Lovable Cloud managed Google OAuth instead.",
    );
  }
  if (lower.includes("popup") || lower.includes("blocked")) {
    return new Error("Google sign-in popup was blocked. Allow popups for this site and try again.");
  }
  if (lower.includes("idpiframe") || lower.includes("iframe")) {
    return new Error("Google blocked the sign-in frame. Try again from the standalone app tab.");
  }
  return new Error(raw || "Google sign-in failed");
}

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    if (t.expires_at - 30_000 < Date.now()) return null;
    return t;
  } catch {
    return null;
  }
}

function saveToken(access_token: string, expiresAt?: number) {
  const t: StoredToken = { access_token, expires_at: expiresAt || Date.now() + 60 * 60 * 1000 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

async function persistProviderTokenFromSession(
  fallbackToken?: string,
): Promise<StoredToken | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const providerToken = fallbackToken || session?.provider_token;
  if (!providerToken) return readToken();
  const expiresAt = session?.expires_at ? session.expires_at * 1000 : Date.now() + 60 * 60 * 1000;
  saveToken(providerToken, expiresAt);
  return readToken();
}

export async function refreshSignInState(): Promise<boolean> {
  return (await persistProviderTokenFromSession()) !== null;
}

export function isSignedIn(): boolean {
  return readToken() !== null;
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
  void supabase.auth.signOut();
}

export async function signIn(): Promise<void> {
  if (typeof window === "undefined")
    throw new Error("Google sign-in is only available in the browser");

  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
    extraParams: {
      prompt: "select_account consent",
      access_type: "online",
      include_granted_scopes: "true",
      scope: SCOPES,
    },
  });

  if ((result as any).error) {
    throw formatGoogleAuthError((result as any).error);
  }

  if ((result as any).redirected) {
    return;
  }

  const fallbackToken = (result as any).tokens?.provider_token || (result as any).provider_token;
  const token = await persistProviderTokenFromSession(fallbackToken);
  if (!token) {
    throw new Error(
      "Google sign-in finished, but Google Tasks access was not granted. Please approve Tasks access and try again.",
    );
  }
}

async function ensureToken(): Promise<StoredToken> {
  const token = readToken() || (await persistProviderTokenFromSession());
  if (!token) throw new Error("Not signed in to Google Tasks");
  return token;
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
    localStorage.removeItem(STORAGE_KEY);
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
