import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";

// ─── Real infrastructure connectors ────────────────────────────────────────────
// These never fabricate data. Missing token → not_connected. API error → error.

type TruthState = "live" | "not_connected" | "error";

const nowIso = () => new Date().toISOString();

async function json(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`External API returned HTTP ${res.status}`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Unparseable response from ${new URL(url).host}`);
  }
}

export interface CloudflareZoneRow {
  id: string;
  name: string;
  status: string;
  plan: string;
  nameservers: string[];
  modifiedAt: string | null;
}

export const getCloudflareZones = createServerFn({ method: "GET" }).handler(async () => {
  await requireCloudflareViewer(getRequest());
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  const fetchedAt = nowIso();
  if (!token) {
    return {
      truthState: "not_connected" as TruthState,
      source: "Cloudflare API",
      fetchedAt,
      error: null,
      zones: [] as CloudflareZoneRow[],
    };
  }
  try {
    const zones: CloudflareZoneRow[] = [];
    let completed = false;
    // All pages of the zone listing are required: the old implementation
    // silently truncated accounts with more than 50 zones.
    for (let page = 1; page <= 100; page++) {
      const data = await json(
        "https://api.cloudflare.com/client/v4/zones?page=" + page + "&per_page=50", token);
      if (data?.success === false || !Array.isArray(data?.result)) {
        throw new Error("Cloudflare zone listing failed");
      }
      zones.push(...data.result.map((z: any) => ({
        id: String(z.id),
        name: String(z.name),
        status: String(z.status ?? "unknown"),
        plan: String(z.plan?.name ?? "Unknown"),
        nameservers: Array.isArray(z.name_servers) ? z.name_servers.map(String) : [],
        modifiedAt: z.modified_on ?? null,
      })));
      if (data?.result_info?.total_pages > 100) {
        throw new Error("Cloudflare zones exceed the configured page limit");
      }
      if (data?.result_info?.total_pages
        ? page >= data.result_info.total_pages : data.result.length < 50) {
        completed = true;
        break;
      }
    }
    if (!completed) throw new Error("Cloudflare zone pagination limit reached");
    return {
      truthState: "live" as TruthState,
      source: "Cloudflare API",
      fetchedAt,
      error: null,
      zones,
    };
  } catch (e: any) {
    return {
      truthState: "error" as TruthState,
      source: "Cloudflare API",
      fetchedAt,
      error: String(e?.message ?? e).slice(0, 300),
      zones: [] as CloudflareZoneRow[],
    };
  }
});

export interface VercelProjectRow {
  id: string;
  name: string;
  framework: string | null;
  liveUrl: string | null;
  dashboardUrl: string;
  state: string;
  branch: string | null;
  lastDeployedAt: string | null;
}

export const getVercelProjects = createServerFn({ method: "GET" }).handler(async () => {
  await requireCloudflareViewer(getRequest());
  const token = process.env["VERCEL_API_TOKEN"];
  const fetchedAt = nowIso();
  if (!token) {
    return {
      truthState: "not_connected" as TruthState,
      source: "Vercel API",
      fetchedAt,
      error: null,
      projects: [] as VercelProjectRow[],
    };
  }
  try {
    const data = await json("https://api.vercel.com/v9/projects?limit=50", token);
    const projects: VercelProjectRow[] = (data?.projects ?? []).map((p: any) => {
      const dep = p.latestDeployments?.[0] ?? p.targets?.production ?? null;
      return {
        id: String(p.id),
        name: String(p.name),
        framework: p.framework ?? null,
        liveUrl: dep?.url ? `https://${dep.url}` : p.alias?.[0] ? `https://${p.alias[0]}` : null,
        dashboardUrl: `https://vercel.com/dashboard`,
        state: String(dep?.readyState ?? dep?.state ?? "unknown").toLowerCase(),
        branch: dep?.meta?.githubCommitRef ?? null,
        lastDeployedAt: dep?.createdAt ? new Date(dep.createdAt).toISOString() : null,
      };
    });
    return {
      truthState: "live" as TruthState,
      source: "Vercel API",
      fetchedAt,
      error: null,
      projects,
    };
  } catch (e: any) {
    return {
      truthState: "error" as TruthState,
      source: "Vercel API",
      fetchedAt,
      error: String(e?.message ?? e).slice(0, 300),
      projects: [] as VercelProjectRow[],
    };
  }
});

/** Real reachability probe used by the service tracker — no manual "operational" claims. */
export const probeEndpoint = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    await requireCloudflareViewer(getRequest());
    const checkedAt = nowIso();
    const started = Date.now();
    try {
      const parsed = new URL(data.url);
      // Deny direct localhost/IP/intranet access and redirect-following to
      // prevent the API becoming a trivial internal-network SSRF primitive.
      if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
          parsed.port || !/^[a-z0-9.-]+$/i.test(parsed.hostname) ||
          !parsed.hostname.includes(".") ||
          /(^|\.)(localhost|local|internal|test|invalid)$/.test(parsed.hostname) ||
          /^(\d+\.){3}\d+$/.test(parsed.hostname) ||
          parsed.hostname.includes("..")) {
        throw new Error("Only public HTTPS domain endpoints may be probed");
      }
      const res = await fetch(parsed.toString(), {
        method: "GET", redirect: "manual", signal: AbortSignal.timeout(8000),
      });
      return {
        url: data.url,
        checkedAt,
        ok: res.ok,
        status: res.status,
        ms: Date.now() - started,
        error: null as string | null,
      };
    } catch (e: any) {
      return {
        url: data.url,
        checkedAt,
        ok: false,
        status: 0,
        ms: Date.now() - started,
        error: String(e?.message ?? e).slice(0, 200),
      };
    }
  });
