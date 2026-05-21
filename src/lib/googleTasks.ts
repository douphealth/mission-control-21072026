// Google Tasks — per-user OAuth via Google Identity Services (token flow).
// No client secret needed in the browser.

const CLIENT_ID = '444136985265-oehu4tfpce7b0kadq5vvn14kn6gk5tor.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/tasks';
const STORAGE_KEY = 'google_tasks_token_v1';

type StoredToken = { access_token: string; expires_at: number };

let gisLoaded: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
  return gisLoaded;
}

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    if (t.expires_at - 30_000 < Date.now()) return null;
    return t;
  } catch { return null; }
}

function saveToken(access_token: string, expires_in: number) {
  const t: StoredToken = { access_token, expires_at: Date.now() + expires_in * 1000 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function isSignedIn(): boolean {
  return readToken() !== null;
}

export function signOut() {
  const t = readToken();
  localStorage.removeItem(STORAGE_KEY);
  if (t?.access_token && (window as any).google?.accounts?.oauth2) {
    try { (window as any).google.accounts.oauth2.revoke(t.access_token, () => {}); } catch { /* noop */ }
  }
}

export async function signIn(): Promise<void> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      prompt: '',
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        saveToken(resp.access_token, Number(resp.expires_in || 3600));
        resolve();
      },
      error_callback: (err: any) => reject(new Error(err?.message || 'Sign-in cancelled')),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = readToken();
  if (!token) throw new Error('Not signed in to Google Tasks');
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEY);
    throw new Error('Google Tasks session expired — please sign in again');
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
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  position?: string;
  parent?: string;
};

export async function listTaskLists(): Promise<GTaskList[]> {
  const r = await api<{ items?: GTaskList[] }>('/users/@me/lists');
  return r.items || [];
}

export async function listTasks(listId: string, showCompleted = false): Promise<GTask[]> {
  const qs = new URLSearchParams({ maxResults: '100', showCompleted: String(showCompleted), showHidden: 'false' });
  const r = await api<{ items?: GTask[] }>(`/lists/${encodeURIComponent(listId)}/tasks?${qs}`);
  return r.items || [];
}

export async function createTask(listId: string, body: Partial<GTask>): Promise<GTask> {
  return api<GTask>(`/lists/${encodeURIComponent(listId)}/tasks`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateTask(listId: string, taskId: string, body: Partial<GTask>): Promise<GTask> {
  return api<GTask>(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteTask(listId: string, taskId: string): Promise<void> {
  await api<void>(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
}
