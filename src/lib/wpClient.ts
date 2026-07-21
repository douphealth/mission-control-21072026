// WordPress REST API client using Application Passwords (Basic Auth).
// All calls run in the browser. CORS must be permitted by the WP site for
// authenticated REST endpoints (WP allows it by default for /wp-json/* with
// Authorization header from the same protocol).

export type WpCreds = { url: string; username: string; appPassword: string };

const STORAGE_KEY = 'wp-mgmt-creds-v1';

export type CredsMap = Record<string, { username: string; appPassword: string }>;

export function loadCreds(): CredsMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
export function saveCreds(map: CredsMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
export function setCred(siteId: string, username: string, appPassword: string) {
  const m = loadCreds();
  m[siteId] = { username, appPassword };
  saveCreds(m);
}
export function clearCred(siteId: string) {
  const m = loadCreds();
  delete m[siteId];
  saveCreds(m);
}

export function normalizeUrl(u: string) {
  if (!u) return '';
  const trimmed = u.trim().replace(/\/+$/, '');
  return trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
}

function authHeader(c: { username: string; appPassword: string }) {
  return 'Basic ' + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, '')}`);
}

export async function wpFetch<T = any>(
  baseUrl: string,
  path: string,
  creds?: { username: string; appPassword: string },
  init: RequestInit = {}
): Promise<T> {
  const url = `${normalizeUrl(baseUrl)}/wp-json${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };
  if (creds?.username && creds?.appPassword) {
    headers['Authorization'] = authHeader(creds);
  }
  const res = await fetch(url, { ...init, headers, credentials: 'omit' });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Health check (works without auth where possible) ───────────────────────

export type HealthResult = {
  reachable: boolean;
  status?: number;
  responseMs?: number;
  protocol: 'http' | 'https' | 'unknown';
  isWordPress?: boolean;
  wpVersion?: string;
  siteName?: string;
  siteDescription?: string;
  homeUrl?: string;
  error?: string;
};

export async function checkHealth(siteUrl: string): Promise<HealthResult> {
  const url = normalizeUrl(siteUrl);
  const protocol: HealthResult['protocol'] = url.startsWith('https://') ? 'https' : url.startsWith('http://') ? 'http' : 'unknown';
  const start = performance.now();

  // Try /wp-json — public discovery endpoint, returns site info + REST routes
  try {
    const res = await fetch(`${url}/wp-json/`, { method: 'GET', credentials: 'omit' });
    const responseMs = Math.round(performance.now() - start);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return {
        reachable: true,
        status: res.status,
        responseMs,
        protocol,
        isWordPress: !!data?.namespaces,
        siteName: data?.name,
        siteDescription: data?.description,
        homeUrl: data?.home,
      };
    }
    return { reachable: true, status: res.status, responseMs, protocol, isWordPress: false };
  } catch (e: any) {
    // Fallback: opaque ping to detect reachability
    try {
      await fetch(url, { method: 'GET', mode: 'no-cors', credentials: 'omit' });
      return {
        reachable: true,
        responseMs: Math.round(performance.now() - start),
        protocol,
        isWordPress: undefined,
        error: 'Reachable but REST API blocked by CORS',
      };
    } catch (e2: any) {
      return { reachable: false, protocol, error: e?.message || 'Network error' };
    }
  }
}

// ─── SEO basic checks (public) ──────────────────────────────────────────────

export type SeoResult = {
  hasSitemap: boolean;
  sitemapUrl?: string;
  hasRobots: boolean;
  robotsAllowsAll: boolean | null;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogImage?: string;
  canonical?: string;
  errors: string[];
};

export async function checkSeo(siteUrl: string): Promise<SeoResult> {
  const url = normalizeUrl(siteUrl);
  const errors: string[] = [];
  const result: SeoResult = {
    hasSitemap: false,
    hasRobots: false,
    robotsAllowsAll: null,
    errors,
  };

  // Sitemap candidates
  for (const p of ['/wp-sitemap.xml', '/sitemap.xml', '/sitemap_index.xml']) {
    try {
      const r = await fetch(`${url}${p}`, { method: 'GET' });
      if (r.ok) { result.hasSitemap = true; result.sitemapUrl = `${url}${p}`; break; }
    } catch {}
  }

  // robots.txt
  try {
    const r = await fetch(`${url}/robots.txt`);
    if (r.ok) {
      const txt = await r.text();
      result.hasRobots = true;
      result.robotsAllowsAll = !/Disallow:\s*\/\s*$/im.test(txt);
    }
  } catch (e: any) { errors.push('robots.txt fetch failed (CORS or offline)'); }

  // Try parsing homepage <head> via no-cors won't expose body. Try CORS first:
  try {
    const r = await fetch(url, { method: 'GET' });
    if (r.ok) {
      const html = await r.text();
      result.title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
      result.description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1];
      result.ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1];
      result.ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1];
      result.canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
    }
  } catch { errors.push('Homepage HTML blocked by CORS — meta tags unavailable'); }

  return result;
}

// ─── Authenticated endpoints ────────────────────────────────────────────────

export type WpPlugin = {
  plugin: string;
  status: 'active' | 'inactive';
  name: string;
  version: string;
  update?: string;          // 'available' | 'none'
  description?: { raw?: string; rendered?: string };
  author?: string;
  author_uri?: string;
  plugin_uri?: string;
  network_only?: boolean;
};

export type WpTheme = {
  stylesheet: string;
  template: string;
  status: 'active' | 'inactive';
  name?: { raw?: string; rendered?: string };
  version?: string;
  update?: any;
  description?: { raw?: string; rendered?: string };
};

export async function fetchPlugins(url: string, c: { username: string; appPassword: string }) {
  return wpFetch<WpPlugin[]>(url, '/wp/v2/plugins?context=edit', c);
}
export async function fetchThemes(url: string, c: { username: string; appPassword: string }) {
  return wpFetch<WpTheme[]>(url, '/wp/v2/themes?context=edit', c);
}
export async function fetchUsers(url: string, c: { username: string; appPassword: string }) {
  return wpFetch<any[]>(url, '/wp/v2/users?context=edit&per_page=100', c);
}
export async function fetchPostsCount(url: string, c: { username: string; appPassword: string }) {
  const res = await fetch(`${normalizeUrl(url)}/wp-json/wp/v2/posts?per_page=1`, {
    headers: { Authorization: 'Basic ' + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, '')}`) },
  });
  return Number(res.headers.get('x-wp-total') || 0);
}
export async function fetchPagesCount(url: string, c: { username: string; appPassword: string }) {
  const res = await fetch(`${normalizeUrl(url)}/wp-json/wp/v2/pages?per_page=1`, {
    headers: { Authorization: 'Basic ' + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, '')}`) },
  });
  return Number(res.headers.get('x-wp-total') || 0);
}
export async function fetchCommentsCount(url: string, c: { username: string; appPassword: string }) {
  const res = await fetch(`${normalizeUrl(url)}/wp-json/wp/v2/comments?per_page=1`, {
    headers: { Authorization: 'Basic ' + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, '')}`) },
  });
  return Number(res.headers.get('x-wp-total') || 0);
}

// Toggle plugin active/inactive
export async function setPluginStatus(url: string, c: { username: string; appPassword: string }, plugin: string, status: 'active' | 'inactive') {
  return wpFetch(url, `/wp/v2/plugins/${encodeURIComponent(plugin)}`, c, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}
