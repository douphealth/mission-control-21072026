import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const clientSrc = readFileSync(join(root, "src/integrations/supabase/client.ts"), "utf8");
const legacySrc = readFileSync(join(root, "src/lib/supabase.ts"), "utf8");

/** Read source without comments so doc-comments can't mask regressions. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const code = stripComments(clientSrc);
const legacyCode = stripComments(legacySrc);

/**
 * Regression guard for the "Missing Supabase environment variable(s)" outage.
 *
 * The generated Supabase client used to throw at first property access when
 * SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY were not injected at build time.
 * On the Cloudflare Pages mirror (and any deployment without env vars) this
 * killed cloud backup, Google/Email sign-in, and the sync engine at boot:
 * "Cloud backup problem — Missing Supabase environment variable(s)…".
 *
 * The client now falls back to the project's built-in publishable
 * configuration (client-safe by design — the key ships to browsers in the
 * bundle anyway; data access is enforced by RLS + user auth, not the key).
 */
describe("cloud backup resilience (regression)", () => {
  it("the supabase client never throws for missing env vars", () => {
    // The old kill-switch must be gone.
    expect(code).not.toMatch(/Missing Supabase environment variable/);
    expect(code).not.toMatch(/throw new Error\(message\)/);
    // And a built-in default configuration must exist to fall back to.
    expect(code).toMatch(/DEFAULT_SUPABASE_URL/);
    expect(code).toMatch(/DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
    expect(code).toMatch(/qmhuzbumfqjgpbeqdcjp\.supabase\.co/);
  });

  it("falls back to the default project when env vars are absent", () => {
    expect(code).toMatch(/envUrl && envKey/);
    expect(clientSrc).toMatch(/source:\s*"env" \| "default"/);
  });

  it("the legacy engine no longer connects to the deleted project", () => {
    // The dead host may appear ONLY inside the self-heal denylist.
    const appearances = legacyCode.split("dszpokkqhrtjutmvcxnh").length - 1;
    const denylistAppearances = legacyCode.split('"dszpokkqhrtjutmvcxnh.supabase.co"').length - 1;
    expect(appearances).toBe(denylistAppearances);
    expect(denylistAppearances).toBeGreaterThan(0);
    expect(legacyCode).toMatch(/DEAD_PROJECT_HOSTS/);
  });

  it("shipped SQL policies are owner-scoped, never world-open", () => {
    // Extract the shipped SQL template and check its policies.
    const sql = legacySrc.match(/SUPABASE_SCHEMA_SQL = `([\s\S]*?)`;/)?.[1] ?? "";
    expect(sql).not.toMatch(/USING ?\(true\)/);
    expect(sql).toMatch(/auth\.uid\(\) IS NOT NULL/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });
});
