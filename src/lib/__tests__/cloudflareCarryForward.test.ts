import { describe, expect, it } from "vitest";
import {
  carryForwardFailedParts,
  mergeCloudflareInventories,
  unreachableAccountPart,
} from "@/lib/cloudflareInventoryMerge";
import type { CloudflareInventory, CloudflareDeploymentRow } from "@/lib/cloudflareInventory.server";

const A = "5dc0401c38d9de0c6947fee40a210937";
const row = (kind: "pages" | "worker", name: string): CloudflareDeploymentRow =>
  ({ key: `${kind}:${A}:${name}`, kind, accountId: A, name }) as CloudflareDeploymentRow;

function part(section: "pages" | "platform", rows: CloudflareDeploymentRow[], errors: string[] = []): CloudflareInventory {
  return {
    truthState: errors.length ? "error" : "live",
    source: "Cloudflare API",
    fetchedAt: "2026-11-13T15:00:00Z",
    accounts: [A],
    accountDetails: [
      {
        accountId: A, label: "Account", configuredToken: true, errors, sections: [section],
        pagesCount: rows.filter((r) => r.kind === "pages").length,
        workersCount: rows.filter((r) => r.kind === "worker").length,
        zonesCount: 0, truthState: errors.length ? "error" : "live",
      },
    ],
    errors,
    rows,
    zones: [],
  };
}

const previous = mergeCloudflareInventories([
  part("pages", [row("pages", "site-a"), row("pages", "site-b")]),
  part("platform", [row("worker", "edge-1")]),
]);

describe("Cloudflare outage keeps the last good list", () => {
  it("keeps saved Pages projects when the Pages request fails", () => {
    const parts = [part("pages", [], ["Pages inventory unavailable"]), part("platform", [row("worker", "edge-1")])];
    const merged = mergeCloudflareInventories(carryForwardFailedParts(parts, ["pages", "platform"], previous));
    expect(merged.rows.filter((r) => r.kind === "pages").map((r) => r.name)).toEqual(["site-a", "site-b"]);
    expect(merged.accountDetails[0].pagesCount).toBe(2);
    expect(merged.errors.some((e) => e.includes("Pages inventory unavailable"))).toBe(true);
  });

  it("keeps saved Workers when the whole Workers request is unreachable", () => {
    const parts = [part("pages", [row("pages", "site-a")]), unreachableAccountPart(A, "Account", "platform", "now")];
    const merged = mergeCloudflareInventories(carryForwardFailedParts(parts, ["pages", "platform"], previous));
    expect(merged.rows.map((r) => r.name)).toEqual(["edge-1", "site-a"]);
  });

  it("uses fresh results unchanged when Cloudflare answers", () => {
    const parts = [part("pages", [row("pages", "site-a")]), part("platform", [])];
    const merged = mergeCloudflareInventories(carryForwardFailedParts(parts, ["pages", "platform"], previous));
    expect(merged.rows.map((r) => r.name)).toEqual(["site-a"]);
  });
});
