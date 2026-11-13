import type {
  CloudflareAccountSummary,
  CloudflareDeploymentRow,
  CloudflareInventory,
  CloudflareZone,
  InfraTruth,
} from "@/lib/cloudflareInventory.server";

/**
 * Pure, browser-safe aggregation shared by the server collector and the client
 * loader. The client fetches each account (and each section) in a separate
 * server invocation so no single Worker invocation exhausts its subrequest
 * budget; this module recombines those parts with the exact same truth rules.
 */
export function accountTruth(
  summary: Pick<
    CloudflareAccountSummary,
    "configuredToken" | "errors" | "pagesCount" | "workersCount" | "zonesCount"
  >,
): InfraTruth {
  if (!summary.configuredToken) return "not_connected";
  if (!summary.errors.length) return "live";
  return summary.pagesCount + summary.workersCount + summary.zonesCount > 0 ? "partial" : "error";
}

export function overallTruth(
  accountDetails: CloudflareAccountSummary[],
  errors: string[],
): InfraTruth {
  if (!accountDetails.length) return "not_connected";
  if (!errors.length) return "live";
  const connected = accountDetails.some(
    (a) => a.truthState === "live" || a.truthState === "partial",
  );
  if (connected) return "partial";
  return accountDetails.every((a) => a.truthState === "not_connected") ? "not_connected" : "error";
}

function mergeSummaries(
  a: CloudflareAccountSummary,
  b: CloudflareAccountSummary,
): CloudflareAccountSummary {
  const merged: CloudflareAccountSummary = {
    accountId: a.accountId,
    label: a.label || b.label,
    configuredToken: a.configuredToken && b.configuredToken,
    pagesCount: a.pagesCount + b.pagesCount,
    workersCount: a.workersCount + b.workersCount,
    zonesCount: a.zonesCount + b.zonesCount,
    errors: [...new Set([...a.errors, ...b.errors])],
    sections: [...new Set([...(a.sections || []), ...(b.sections || [])])],
    pagesApiRequests: a.pagesApiRequests ?? b.pagesApiRequests,
    pagesReportedTotal:
      a.pagesReportedTotal !== undefined ? a.pagesReportedTotal : b.pagesReportedTotal,
    deployEnabled: Boolean(a.deployEnabled || b.deployEnabled),
    workersTokenSource: a.workersTokenSource ?? b.workersTokenSource,
    truthState: "live",
  };
  merged.truthState = accountTruth(merged);
  return merged;
}

export function mergeCloudflareInventories(
  parts: CloudflareInventory[],
  fetchedAt = new Date().toISOString(),
): CloudflareInventory {
  const rows = new Map<string, CloudflareDeploymentRow>();
  const zones = new Map<string, CloudflareZone>();
  const details = new Map<string, CloudflareAccountSummary>();
  const accounts: string[] = [];
  for (const part of parts) {
    for (const row of part.rows) rows.set(row.key, row);
    for (const zone of part.zones) zones.set(zone.accountId + ":" + zone.id, zone);
    for (const id of part.accounts) if (!accounts.includes(id)) accounts.push(id);
    for (const summary of part.accountDetails) {
      const previous = details.get(summary.accountId);
      details.set(summary.accountId, previous ? mergeSummaries(previous, summary) : summary);
    }
  }
  const accountDetails = accounts.flatMap((id) => (details.get(id) ? [details.get(id)!] : []));
  const errors = accountDetails.flatMap((a) => a.errors);
  return {
    truthState: overallTruth(accountDetails, errors),
    source: "Cloudflare API",
    fetchedAt,
    accounts,
    accountDetails,
    errors,
    rows: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name)),
    zones: [...zones.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Synthesized summary for a part whose server invocation failed entirely. */
export function unreachableAccountPart(
  accountId: string,
  label: string,
  section: "pages" | "platform",
  fetchedAt: string,
): CloudflareInventory {
  const reason =
    (section === "pages" ? "Pages inventory" : "Workers/DNS inventory") +
    " request failed for " +
    label +
    "; retry or check the server runtime";
  const summary: CloudflareAccountSummary = {
    accountId,
    label,
    configuredToken: true,
    pagesCount: 0,
    workersCount: 0,
    zonesCount: 0,
    errors: [reason],
    sections: [section],
    truthState: "error",
  };
  return {
    truthState: "error",
    source: "Cloudflare API",
    fetchedAt,
    accounts: [accountId],
    accountDetails: [summary],
    errors: [reason],
    rows: [],
    zones: [],
  };
}

/**
 * When Cloudflare fails to answer for one account/section (outage, 5xx, rate
 * limit), reuse the rows from the last good inventory for exactly that account
 * and kind instead of showing them as gone. The failure stays in `errors`, so
 * the screen still says the list could not be refreshed.
 */
export function carryForwardFailedParts(
  parts: CloudflareInventory[],
  sections: ("pages" | "platform")[],
  previous: CloudflareInventory | null | undefined,
): CloudflareInventory[] {
  if (!previous?.rows?.length && !previous?.zones?.length) return parts;
  const when = previous.fetchedAt ? previous.fetchedAt.slice(0, 16).replace("T", " ") : "earlier";
  return parts.map((part, index) => {
    const section = sections[index];
    const summary = part.accountDetails[0];
    if (!summary || !summary.errors.length) return part;
    const accountId = summary.accountId;
    const has = (kind: string) => part.rows.some((row) => row.kind === kind);
    const carryKinds =
      section === "pages" ? (has("pages") ? [] : ["pages"]) : has("worker") ? [] : ["worker"];
    const carried = previous.rows.filter(
      (row) => row.accountId === accountId && carryKinds.includes(row.kind),
    );
    const carriedZones =
      section === "platform" && !part.zones.length
        ? (previous.zones || []).filter((zone) => zone.accountId === accountId)
        : [];
    if (!carried.length && !carriedZones.length) return part;
    const note = `Showing ${carried.length || carriedZones.length} saved item(s) from ${when} UTC because Cloudflare did not answer; they refresh automatically when it recovers.`;
    const nextSummary: CloudflareAccountSummary = {
      ...summary,
      pagesCount: summary.pagesCount + carried.filter((r) => r.kind === "pages").length,
      workersCount: summary.workersCount + carried.filter((r) => r.kind === "worker").length,
      zonesCount: summary.zonesCount + carriedZones.length,
      errors: [...summary.errors, note],
    };
    nextSummary.truthState = accountTruth(nextSummary);
    return {
      ...part,
      truthState: nextSummary.truthState,
      accountDetails: [nextSummary, ...part.accountDetails.slice(1)],
      errors: [...part.errors, note],
      rows: [...part.rows, ...carried],
      zones: [...part.zones, ...carriedZones],
    };
  });
}
