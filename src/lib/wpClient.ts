// WordPress REST API client using Application Passwords (Basic Auth).
// All calls run in the browser. CORS must be permitted by the WP site for
// authenticated REST endpoints (WP allows it by default for /wp-json/* with
// Authorization header from the same protocol).

export type WpCreds = { url: string; username: string; appPassword: string };

const STORAGE_KEY = "wp-mgmt-creds-v1";

export type CredsMap = Record<string, { username: string; appPassword: string }>;

export function loadCreds(): CredsMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
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
  if (!u) return "";
  const trimmed = u.trim().replace(/\/+$/, "");
  return trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
}

function authHeader(c: { username: string; appPassword: string }) {
  return "Basic " + btoa(`${c.username}:${c.appPassword.replace(/\s+/g, "")}`);
}

export async function wpFetch<T = any>(
  baseUrl: string,
  path: string,
  creds?: { username: string; appPassword: string },
  init: RequestInit = {},
): Promise<T> {
  const url = `${normalizeUrl(baseUrl)}/wp-json${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (creds?.username && creds?.appPassword) {
    headers["Authorization"] = authHeader(creds);
  }
  const res = await fetch(url, { ...init, headers, credentials: "omit" });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Health check (works without auth where possible) ───────────────────────

export type SiteHealthStatus = "good" | "recommended" | "critical";
export type SiteHealthTest = {
  key: string;
  label: string;
  status: SiteHealthStatus;
  badge?: { label?: string; color?: string };
  description?: string;
  actions?: string;
};

export type WpCurrentUser = {
  id: number;
  username?: string;
  name?: string;
  email?: string;
  roles?: string[];
  capabilities?: Record<string, boolean>;
};

export type HealthResult = {
  reachable: boolean;
  status?: number;
  responseMs?: number;
  protocol: "http" | "https" | "unknown";
  isWordPress?: boolean;
  wpVersion?: string;
  siteName?: string;
  siteDescription?: string;
  homeUrl?: string;
  error?: string;
};

export async function checkHealth(siteUrl: string): Promise<HealthResult> {
  const url = normalizeUrl(siteUrl);
  const protocol: HealthResult["protocol"] = url.startsWith("https://")
    ? "https"
    : url.startsWith("http://")
      ? "http"
      : "unknown";
  const start = performance.now();

  // Try /wp-json — public discovery endpoint, returns site info + REST routes
  try {
    const res = await fetch(`${url}/wp-json/`, { method: "GET", credentials: "omit" });
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
      await fetch(url, { method: "GET", mode: "no-cors", credentials: "omit" });
      return {
        reachable: true,
        responseMs: Math.round(performance.now() - start),
        protocol,
        isWordPress: undefined,
        error: "Reachable but REST API blocked by CORS",
      };
    } catch (e2: any) {
      return { reachable: false, protocol, error: e?.message || "Network error" };
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
  for (const p of ["/wp-sitemap.xml", "/sitemap.xml", "/sitemap_index.xml"]) {
    try {
      const r = await fetch(`${url}${p}`, { method: "GET" });
      if (r.ok) {
        result.hasSitemap = true;
        result.sitemapUrl = `${url}${p}`;
        break;
      }
    } catch {
      /* ignore */
    }
  }

  // robots.txt
  try {
    const r = await fetch(`${url}/robots.txt`);
    if (r.ok) {
      const txt = await r.text();
      result.hasRobots = true;
      result.robotsAllowsAll = !/Disallow:\s*\/\s*$/im.test(txt);
    }
  } catch (e: any) {
    errors.push("robots.txt fetch failed (CORS or offline)");
  }

  // Try parsing homepage <head> via no-cors won't expose body. Try CORS first:
  try {
    const r = await fetch(url, { method: "GET" });
    if (r.ok) {
      const html = await r.text();
      result.title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
      result.description = html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i,
      )?.[1];
      result.ogTitle = html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i,
      )?.[1];
      result.ogImage = html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
      )?.[1];
      result.canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
    }
  } catch {
    errors.push("Homepage HTML blocked by CORS — meta tags unavailable");
  }

  return result;
}

// ─── Authenticated endpoints ────────────────────────────────────────────────

export type WpPlugin = {
  plugin: string;
  status: "active" | "inactive";
  name: string;
  version: string;
  update?: string; // 'available' | 'none'
  description?: { raw?: string; rendered?: string };
  author?: string;
  author_uri?: string;
  plugin_uri?: string;
  network_only?: boolean;
};

export type WpTheme = {
  stylesheet: string;
  template: string;
  status: "active" | "inactive";
  name?: { raw?: string; rendered?: string };
  version?: string;
  update?: any;
  description?: { raw?: string; rendered?: string };
};

export async function fetchCurrentUser(url: string, c: { username: string; appPassword: string }) {
  return wpFetch<WpCurrentUser>(url, "/wp/v2/users/me?context=edit", c);
}

function wpPlainText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SITE_HEALTH_TESTS = [
  ["background-updates", "Background updates"],
  ["loopback-requests", "Loopback requests"],
  ["https-status", "HTTPS status"],
  ["dotorg-communication", "WordPress.org communication"],
  ["authorization-header", "Authorization header"],
  ["page-cache", "Page cache"],
] as const;

export async function fetchSiteHealthTests(
  url: string,
  c: { username: string; appPassword: string },
): Promise<SiteHealthTest[]> {
  const results = await Promise.all(
    SITE_HEALTH_TESTS.map(async ([key, label]) => {
      try {
        const result = await wpFetch<any>(url, `/wp-site-health/v1/tests/${key}`, c);
        const status: SiteHealthStatus =
          result?.status === "critical" || result?.status === "recommended" ? result.status : "good";
        return {
          key,
          label,
          status,
          badge: result?.badge,
          description: wpPlainText(result?.description),
          actions: wpPlainText(result?.actions),
        } satisfies SiteHealthTest;
      } catch (error: any) {
        // Some tests are conditional (for example page-cache or authorization-header).
        // A missing/forbidden route is unknown evidence, not a passing test.
        return {
          key,
          label,
          status: "recommended",
          description: `Unavailable: ${error?.message || "endpoint not available"}`,
        } satisfies SiteHealthTest;
      }
    }),
  );
  return results;
}

export async function fetchPlugins(url: string, c: { username: string; appPassword: string }) {
  return wpFetch<WpPlugin[]>(url, "/wp/v2/plugins?context=edit", c);
}
export async function fetchThemes(url: string, c: { username: string; appPassword: string }) {
  return wpFetch<WpTheme[]>(url, "/wp/v2/themes?context=edit", c);
}
export async function fetchUsers(url: string, c: { username: string; appPassword: string }) {
  return wpFetch<any[]>(url, "/wp/v2/users?context=edit&per_page=100", c);
}
async function fetchTotalCount(
  url: string,
  c: { username: string; appPassword: string },
  route: "posts" | "pages" | "comments",
) {
  const res = await fetch(`${normalizeUrl(url)}/wp-json/wp/v2/${route}?per_page=1&context=edit`, {
    headers: {
      Accept: "application/json",
      Authorization: authHeader(c),
    },
    credentials: "omit",
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* leave HTTP status */
    }
    throw new Error(`${route}: ${message}`);
  }
  const raw = res.headers.get("x-wp-total");
  if (raw === null) throw new Error(`${route}: WordPress did not return X-WP-Total`);
  const total = Number(raw);
  if (!Number.isFinite(total)) throw new Error(`${route}: invalid X-WP-Total`);
  return total;
}

export const fetchPostsCount = (url: string, c: { username: string; appPassword: string }) =>
  fetchTotalCount(url, c, "posts");
export const fetchPagesCount = (url: string, c: { username: string; appPassword: string }) =>
  fetchTotalCount(url, c, "pages");
export const fetchCommentsCount = (url: string, c: { username: string; appPassword: string }) =>
  fetchTotalCount(url, c, "comments");

// Toggle plugin active/inactive
export async function setPluginStatus(
  url: string,
  c: { username: string; appPassword: string },
  plugin: string,
  status: "active" | "inactive",
) {
  return wpFetch(url, `/wp/v2/plugins/${encodeURIComponent(plugin)}`, c, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
