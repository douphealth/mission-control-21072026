import {
  GSC_READONLY_SCOPE,
  GOOGLE_SEARCH_CONSOLE_SCOPES,
  getSearchConsoleApiSetupUrl,
  googleTokenHasScopes,
  readGoogleToken,
  requestGoogleToken,
} from "@/lib/googleDirectAuth";

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel?: string;
}

export interface SearchConsoleMetric {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface SearchConsoleRefreshResult {
  property: string;
  startDate: string;
  endDate: string;
  metrics: SearchConsoleMetric;
}

export class SearchConsoleSetupError extends Error {
  setupUrl: string;
  constructor(message: string) {
    super(message);
    this.name = "SearchConsoleSetupError";
    this.setupUrl = getSearchConsoleApiSetupUrl();
  }
}

function domain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value
      .replace(/^sc-domain:/i, "")
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
}

export function matchSearchConsoleProperty(
  websiteUrl: string,
  sites: SearchConsoleSite[],
): string | null {
  const host = domain(websiteUrl);
  if (!host) return null;

  const domainProperty = sites.find(
    (site) => site.siteUrl.toLowerCase() === `sc-domain:${host}`,
  );
  if (domainProperty) return domainProperty.siteUrl;

  const exactPrefix = sites.find((site) => {
    if (site.siteUrl.toLowerCase().startsWith("sc-domain:")) return false;
    return domain(site.siteUrl) === host;
  });
  return exactPrefix?.siteUrl || null;
}

function isoDateOffset(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function googleFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    const normalized = raw.toLowerCase();
    if (
      response.status === 403 &&
      /accessnotconfigured|service_disabled|api has not been used|search console api.*disabled/.test(
        normalized,
      )
    ) {
      throw new SearchConsoleSetupError(
        "Google Search Console API is disabled for this OAuth project. Enable it once, then retry the refresh.",
      );
    }
    if (response.status === 403 && /insufficient|scope|permission|forbidden/.test(normalized)) {
      throw new SearchConsoleSetupError(
        "Google has not granted Search Console read access. Approve the Search Console permission and retry.",
      );
    }
    throw new Error(
      `Search Console request failed (${response.status})${raw ? `: ${raw.slice(0, 400)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

async function searchConsoleToken() {
  let token = readGoogleToken();
  if (!token || !googleTokenHasScopes(token, [GSC_READONLY_SCOPE])) {
    token = await requestGoogleToken({
      scope: GOOGLE_SEARCH_CONSOLE_SCOPES,
      prompt: "consent",
    });
  }
  if (!googleTokenHasScopes(token, [GSC_READONLY_SCOPE])) {
    throw new SearchConsoleSetupError(
      "Google did not grant Search Console read permission.",
    );
  }
  return token.access_token;
}

export async function listSearchConsoleSites(): Promise<SearchConsoleSite[]> {
  const token = await searchConsoleToken();
  const payload = await googleFetch<{ siteEntry?: SearchConsoleSite[] }>(
    "https://www.googleapis.com/webmasters/v3/sites",
    token,
  );
  return payload.siteEntry || [];
}

export async function fetchSearchConsoleMetrics(
  property: string,
): Promise<SearchConsoleRefreshResult> {
  const token = await searchConsoleToken();

  // Search Console commonly has a processing delay. End at D-2 and use a
  // complete rolling 28-day window so the dashboard does not pretend today's
  // partial data is complete.
  const endDate = isoDateOffset(-2);
  const startDate = isoDateOffset(-29);

  const payload = await googleFetch<{
    rows?: Array<{
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
  }>(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        startDate,
        endDate,
        rowLimit: 1,
      }),
    },
  );

  const row = payload.rows?.[0];
  return {
    property,
    startDate,
    endDate,
    metrics: {
      clicks: Number(row?.clicks || 0),
      impressions: Number(row?.impressions || 0),
      ctr: Number(row?.ctr || 0),
      avgPosition: Number(row?.position || 0),
    },
  };
}
