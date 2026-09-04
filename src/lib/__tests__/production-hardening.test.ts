import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('production hardening gates', () => {
  it('daily digest is owner-scoped despite using the service role', () => {
    const src = read('src/routes/api/public/digest.ts');
    expect(src).toContain("process.env['MISSION_CONTROL_OWNER_USER_ID']");
    expect(src).toContain(".eq('user_id', ownerUserId)");
    expect(src).toContain('Digest owner is not configured');
  });

  it('daily digest uses the canonical Athens timezone', () => {
    const src = read('src/routes/api/public/digest.ts');
    expect(src).toContain("Europe/Athens");
    expect(src).not.toContain('Europe/Bucharest');
  });

  it('environment example documents server-only secrets without values', () => {
    const src = read('.env.example');
    expect(src).toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(src).toContain('DIGEST_CRON_SECRET=');
    expect(src).toContain('MISSION_CONTROL_OWNER_USER_ID=');
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY=\S+/);
  });

  it('CI blocks tracked env files and makes lint blocking', () => {
    const src = read('.github/workflows/ci.yml');
    expect(src).toContain('Block tracked environment files');
    expect(src).not.toContain('continue-on-error');
  });
});
