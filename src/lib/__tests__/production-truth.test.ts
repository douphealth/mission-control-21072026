import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ageState, freshness, notConnected } from "../truth";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !full.includes("__tests__")) out.push(full);
  }
  return out;
}

const SOURCES = walk("src");

/** Identifiers that historically shipped fabricated data to the UI. */
const BANNED = [
  /\bsampleZones\b/,
  /\bsampleProjects\b/,
  /\bdefaultServices\b/,
  /\bdefaultCards\b/,
  /\bmockData\b/,
  /\bfakeUsers\b/,
];

describe("production truth gate", () => {
  it("no demo/sample datasets remain in app source", () => {
    const offenders = SOURCES.filter((f) => {
      const src = readFileSync(f, "utf8");
      return BANNED.some((re) => re.test(src));
    });
    expect(offenders).toEqual([]);
  });

  it("infrastructure connectors never invent data without a token", () => {
    const src = readFileSync("src/lib/integrations.functions.ts", "utf8");
    expect(src).toMatch(/process\.env\[(['"])CLOUDFLARE_API_TOKEN\1\]/);
    expect(src).toMatch(/process\.env\[(['"])VERCEL_API_TOKEN\1\]/);
    expect(src).toMatch(/truthState: ['"]not_connected['"]/);
  });

  it("connector pages render provenance badges", () => {
    for (const page of ["src/pages/CloudflarePage.tsx", "src/pages/VercelPage.tsx"]) {
      const src = readFileSync(page, "utf8");
      expect(src).toContain("TruthBadge");
      expect(src).toContain("ConnectorEmpty");
      expect(src).toContain("ConnectorError");
    }
  });
});

describe("truth helpers", () => {
  it("reports unknown freshness honestly", () => {
    expect(freshness(null)).toBeNull();
    expect(freshness("not-a-date")).toBeNull();
    expect(freshness(new Date().toISOString())).toBe("just now");
  });

  it("downgrades live data to stale once it ages out", () => {
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(ageState({ truthState: "live", source: "x", fetchedAt: old })).toBe("stale");
    expect(ageState({ truthState: "live", source: "x", fetchedAt: new Date().toISOString() })).toBe(
      "live",
    );
  });

  it("not_connected never carries a success timestamp", () => {
    expect(notConnected("Cloudflare API").lastSuccessAt).toBeNull();
  });
});
