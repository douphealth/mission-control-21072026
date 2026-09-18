import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const cloudSync = readFileSync(join(root, "src/lib/cloudSync.ts"), "utf8");
const appStart = readFileSync(join(root, "src/start.ts"), "utf8");
const settings = readFileSync(join(root, "src/pages/SettingsPage.tsx"), "utf8");
const pkg = readFileSync(join(root, "package.json"), "utf8");

describe("standalone persistence regression", () => {
  it("never initializes remote auth or data services", () => {
    expect(cloudSync).not.toMatch(/supabase|lovable|fetch\s*\(/i);
    expect(appStart).not.toMatch(/supabase|lovable/i);
  });

  it("keeps cloud compatibility calls local and inert", () => {
    expect(cloudSync).toMatch(/return "local-only"/);
    expect(cloudSync).toMatch(/getPendingCloudCount\(\): number[\s\S]*return 0/);
  });

  it("does not ship managed-service dependencies or setup UI", () => {
    expect(pkg).not.toMatch(/@lovable\.dev|@supabase\/supabase-js/);
    expect(settings).not.toMatch(/Supabase|Cloud Sync/);
  });
});
