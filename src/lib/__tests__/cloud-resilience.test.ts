import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const cloudSync = readFileSync(join(root, "src/lib/cloudSync.ts"), "utf8");
const appStart = readFileSync(join(root, "src/start.ts"), "utf8");
const settings = readFileSync(join(root, "src/pages/SettingsPage.tsx"), "utf8");
const pkg = readFileSync(join(root, "package.json"), "utf8");

describe("standalone Google sync regression", () => {
  it("never initializes managed-platform auth or data services", () => {
    expect(cloudSync).not.toMatch(/supabase|lovable/i);
    expect(appStart).not.toMatch(/supabase|lovable/i);
  });

  it("uses private Google Drive app storage with durable pending changes", () => {
    expect(cloudSync).toContain("appDataFolder");
    expect(cloudSync).toContain("mc-cloud-dirty-records-v3");
    expect(cloudSync).toContain("Google Drive backup failed");
  });

  it("does not ship managed-service dependencies or setup UI", () => {
    expect(pkg).not.toMatch(/@lovable\.dev|@supabase\/supabase-js/);
    expect(settings).not.toMatch(/Supabase/);
  });
});
