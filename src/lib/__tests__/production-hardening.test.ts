import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("production hardening gates", () => {
  it("server digest cannot access private local records", () => {
    const src = read("src/routes/api/public/digest.ts");
    expect(src).toContain("standalone: true");
    expect(src).toContain("status: 410");
    expect(src).not.toContain("supabaseAdmin");
  });

  it("server digest does not embed account or timezone configuration", () => {
    const src = read("src/routes/api/public/digest.ts");
    expect(src).not.toContain("MISSION_CONTROL_OWNER_USER_ID");
    expect(src).not.toContain("DIGEST_CRON_SECRET");
  });

  it("account sync is restricted to Google's private app storage", () => {
    const src = read("src/lib/cloudSync.ts");
    expect(src).toContain('GDRIVE_APPDATA_SCOPE');
    expect(src).toContain('parents: ["appDataFolder"]');
    expect(src).not.toMatch(/supabase|lovable/i);
  });

  it("CI blocks tracked env files and makes lint blocking", () => {
    const src = read(".github/workflows/ci.yml");
    expect(src).toContain("Block tracked environment files");
    expect(src).not.toContain("continue-on-error");
  });
});
