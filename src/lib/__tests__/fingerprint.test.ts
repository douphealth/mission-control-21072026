import { describe, it, expect } from 'vitest';
import { fingerprint, isSuppressed, isRegression, cooldownFrom } from '@/lib/fingerprint';

describe('fingerprint', () => {
  it('is deterministic and order-sensitive only on content', () => {
    const a = fingerprint('seo', ['https://Example.com', 'Missing  title']);
    const b = fingerprint('seo', ['example.com', 'missing title']);
    expect(a).toBe(b);
  });
  it('separates different findings', () => {
    expect(fingerprint('seo', ['a'])).not.toBe(fingerprint('seo', ['b']));
    expect(fingerprint('seo', ['a'])).not.toBe(fingerprint('sync', ['a']));
  });
});

describe('cooldowns and regressions', () => {
  const now = new Date('2026-01-10T12:00:00Z');

  it('suppresses a resolved finding inside its cooldown', () => {
    const rec = { status: 'acted', severity: 'medium' as const, cooldownUntil: cooldownFrom(7, now) };
    expect(isSuppressed(rec, now)).toBe(true);
    expect(isRegression(rec, 'medium', now)).toBe(false);
  });

  it('treats an escalation inside the cooldown as a regression', () => {
    const rec = { status: 'acted', severity: 'low' as const, cooldownUntil: cooldownFrom(7, now) };
    expect(isRegression(rec, 'critical', now)).toBe(true);
  });

  it('reopens once the cooldown expires', () => {
    const rec = { status: 'ignored', severity: 'high' as const, cooldownUntil: cooldownFrom(-1, now) };
    expect(isSuppressed(rec, now)).toBe(false);
    expect(isRegression(rec, 'high', now)).toBe(true);
  });

  it('never calls an open finding a regression', () => {
    expect(isRegression({ status: 'open', severity: 'high' }, 'critical', now)).toBe(false);
  });
});
