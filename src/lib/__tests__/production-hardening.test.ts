import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("production hardening gates", () => {
  it("server digest accepts only sanitized snapshots from a verified Google identity", () => {
    const route = read("src/routes/api/public/digest.ts");
    const snapshot = read("src/lib/dailyDigestSnapshot.ts");

    expect(route).toContain("verifiedGoogleEmail");
    expect(route).toContain("openidconnect.googleapis.com/v1/userinfo");
    expect(route).toContain("validSnapshot");
    expect(route).not.toContain("supabaseAdmin");
    expect(route).not.toContain("papalexios@gmail.com");

    expect(snapshot).not.toContain("db.credentials");
    expect(snapshot).not.toContain("db.notes");
    expect(snapshot).not.toContain("wpPassword");
    expect(snapshot).not.toContain("apiKey");
  });

  it("daily digest scheduler requires a server-side secret and never embeds it", () => {
    const route = read("src/routes/api/public/digest.ts");
    const workflow = read(".github/workflows/daily-mission-control-email.yml");

    expect(route).toContain('env("DIGEST_CRON_SECRET")');
    expect(route).toContain('request.headers.get("x-mission-control-cron")');
    expect(workflow).toContain("secrets.MISSION_CONTROL_DIGEST_CRON_SECRET");
    expect(workflow).not.toMatch(/MISSION_CONTROL_DIGEST_CRON_SECRET:\s*['"][^$]/);
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
