import { describe, it, expect } from 'vitest';
import { redactSecrets, redactSecretText, hasSecretLike, isSecretKey, REDACTED } from '@/lib/secrets';

describe('isSecretKey', () => {
  it('flags secret-bearing field names', () => {
    for (const k of ['password', 'apiKey', 'api_key', 'clientSecret', 'ftpPassword', 'refresh_token']) {
      expect(isSecretKey(k)).toBe(true);
    }
  });
  it('keeps references and harmless fields', () => {
    for (const k of ['secretRef', 'username', 'url', 'title', 'notes']) {
      expect(isSecretKey(k)).toBe(false);
    }
  });
});

describe('redactSecrets', () => {
  it('redacts secret fields without mutating the input', () => {
    const input = { label: 'Site', username: 'admin', password: 'hunter2', nested: { apiKey: 'abc' } };
    const out = redactSecrets(input);
    expect(out.password).toBe(REDACTED);
    expect(out.nested.apiKey).toBe(REDACTED);
    expect(out.username).toBe('admin');
    expect(input.password).toBe('hunter2');
  });

  it('redacts secret-shaped values anywhere', () => {
    const out = redactSecrets({ note: 'token ghp_abcdefghijklmnopqrstuvwxyz012345 leaked' });
    expect(out.note).not.toContain('ghp_');
  });
});

describe('redactSecretText', () => {
  it('redacts key: value pairs', () => {
    const out = redactSecretText('user: admin\nPassword: s3cr3t!\nurl: https://x.com');
    expect(out).toContain('user: admin');
    expect(out).not.toContain('s3cr3t!');
    expect(out).toContain('url: https://x.com');
  });
  it('detects secret-like text', () => {
    expect(hasSecretLike('api key: 12345')).toBe(true);
    expect(hasSecretLike('just a normal note')).toBe(false);
  });
});
