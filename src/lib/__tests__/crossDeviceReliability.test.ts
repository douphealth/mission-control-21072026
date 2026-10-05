import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeRemoteRecords, parseBackup, rebaseLocalPending, type RemoteRecord } from '../cloudSyncProtocol';
import { audienceProfile, measuredCount, profileJsonMetrics } from '../audienceEvidence';
import { coverageOutcome, isOwnedDomainCoverage, mapLimited, mentionQuery } from '../intelligenceRunQuality';
import { audienceCapabilities, readAudience } from '../audienceProviders.server';
import { isTrustedAudienceReading } from '../intelligenceQuality';
const record = (title: string, seconds: number, revision = title): RemoteRecord => ({ data: { id: title, title }, deleted: false, updatedAt: new Date(seconds * 1000).toISOString(), revision });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('cross-device reconciliation', () => {
  it('unions distinct phone and desktop tasks, regardless of file order', () => {
    const phone = { 'tasks::a': record('a', 1) }, desktop = { 'tasks::b': record('b', 2) };
    expect(mergeRemoteRecords(phone, desktop)).toEqual(mergeRemoteRecords(desktop, phone));
    expect(Object.keys(mergeRemoteRecords(phone, desktop))).toHaveLength(2);
  });
  it('chooses the newer same-task revision deterministically', () => {
    const old = { 'tasks::a': record('old', 1) }, newer = { 'tasks::a': record('new', 2) };
    expect(mergeRemoteRecords(newer, old)['tasks::a'].data?.title).toBe('new');
  });
  it('retains explicit tombstones and never interprets absence as deletion', () => {
    const task = record('a', 1), deletion: RemoteRecord = { data: null, deleted: true, updatedAt: new Date(2000).toISOString(), revision: 'delete' };
    expect(mergeRemoteRecords({ 'tasks::a': task }, {})['tasks::a']).toEqual(task);
    expect(mergeRemoteRecords({ 'tasks::a': deletion }, { 'tasks::a': task })['tasks::a'].deleted).toBe(true);
  });
  it('handles timestamp ties without depending on read order', () => {
    const a = { 'tasks::a': record('a', 2, 'a') }, b = { 'tasks::a': record('b', 2, 'b') };
    expect(mergeRemoteRecords(a, b)).toEqual(mergeRemoteRecords(b, a));
  });
  it('rejects malformed backups rather than wiping the device', () => {
    expect(() => parseBackup({ version: 4, records: {} })).toThrow();
    expect(() => parseBackup({ version: 1, records: { 'tasks::a': { updatedAt: 'bad', deleted: false } } })).toThrow();
    expect(parseBackup({ version: 1, updatedAt: '', records: {} }).records).toEqual({});
  });
});
describe('truthful audience evidence', () => {
  it('preserves a verified zero but rejects null, NaN, negative and infinite counts', () => {
    expect(measuredCount(0)).toBe(0);
    for (const value of [null, undefined, '', '1.2K', NaN, Infinity, -1]) expect(measuredCount(value)).toBeNull();
    expect(isTrustedAudienceReading({ status: 'ok', followers: NaN, method: 'official-api' })).toBe(false);
  });
  it('does not accept a video URL or arbitrary host as a profile', () => {
    expect(() => audienceProfile('youtube', 'https://youtube.com/watch?v=123')).toThrow();
    expect(() => audienceProfile('youtube', 'https://youtube.com.evil.test/@user')).toThrow();
    expect(() => audienceProfile('github', 'http://github.com/user')).toThrow();
  });
  it('does not attach another account follower count to the requested name', () => {
    const html = '<script type="application/json">' + JSON.stringify({ users: [{ username: 'target' }, { username: 'other', edge_followed_by: { count: 99000 } }] }) + '</script>';
    expect(profileJsonMetrics('instagram', 'target', html)).toBeNull();
  });
  it('accepts counts only within the matched profile object and rejects disagreement', () => {
    const script = (count: number) => `<script type="application/json">${JSON.stringify({ username: 'target', edge_followed_by: { count } })}</script>`;
    expect(profileJsonMetrics('instagram', 'target', script(0))?.followers).toBe(0);
    expect(profileJsonMetrics('instagram', 'target', script(1) + script(2))).toBeNull();
  });
  it('returns real-shaped GitHub API metrics and refuses mismatched identity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ login: 'target', followers: 42, public_repos: 7 }))));
    const result = await readAudience('github', 'https://github.com/target');
    expect(result.followers).toBe(42); expect(result.posts).toBeNull(); expect(result.identityVerified).toBe(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ login: 'other', followers: 42 }))));
    expect((await readAudience('github', 'https://github.com/target')).followers).toBeNull();
  });

  it('labels YouTube official subscriber counts as rounded platform metrics', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        id: 'UC1234567890123456789012',
        snippet: { customUrl: '@target' },
        statistics: { subscriberCount: '12300', videoCount: '88', hiddenSubscriberCount: false },
      }],
    }), { headers: { 'content-type': 'application/json' } })));
    const result = await readAudience('youtube', 'https://youtube.com/@target');
    expect(result.status).toBe('ok');
    expect(result.followers).toBe(12300);
    expect(result.posts).toBe(88);
    expect(result.method).toBe('official-api');
    expect(result.metricSemantics).toBe('rounded');
    expect(result.identityVerified).toBe(true);
  });

  it('accepts TikTok official follower stats only for the exact authorized username', async () => {
    vi.stubEnv('TIKTOK_ACCESS_TOKEN', 'token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { user: { open_id: 'oid', username: 'target', follower_count: 321, video_count: 44 } },
    }), { headers: { 'content-type': 'application/json' } })));
    const result = await readAudience('tiktok', 'https://tiktok.com/@target');
    expect(result.status).toBe('ok');
    expect(result.followers).toBe(321);
    expect(result.posts).toBe(44);
    expect(result.provider).toContain('TikTok');
    expect(result.metricSemantics).toBe('exact');
  });

  it('uses Instagram Business Discovery only when the exact target username is returned', async () => {
    vi.stubEnv('META_ACCESS_TOKEN', 'token');
    vi.stubEnv('INSTAGRAM_BUSINESS_ACCOUNT_ID', '111');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      business_discovery: {
        id: '222',
        username: 'target',
        followers_count: 4567,
        media_count: 123,
      },
    }), { headers: { 'content-type': 'application/json' } })));
    const result = await readAudience('instagram', 'https://instagram.com/target');
    expect(result.status).toBe('ok');
    expect(result.followers).toBe(4567);
    expect(result.posts).toBe(123);
    expect(result.provider).toContain('Business Discovery');
    expect(result.verifiedHandle).toBe('target');
  });

  it('reports official platform capabilities only when their server credentials exist', () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'key');
    vi.stubEnv('X_BEARER_TOKEN', '');
    vi.stubEnv('TIKTOK_ACCESS_TOKEN', 'token');
    const capabilities = audienceCapabilities();
    expect(capabilities.officialPlatforms).toContain('youtube');
    expect(capabilities.officialPlatforms).toContain('tiktok');
    expect(capabilities.officialPlatforms).not.toContain('x');
    expect(capabilities.configurationRequired.some(item => item.startsWith('X:'))).toBe(true);
  });

  it('makes missing YouTube configuration an explicit unavailable state', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    const result = await readAudience('youtube', 'https://youtube.com/@target');
    expect(result.errorCode).toBe('api-not-configured'); expect(result.followers).toBeNull();
  });
  it('recovers from a transient official-provider 503 without inventing data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'target', followers: 77 })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await readAudience('github', 'https://github.com/target');
    expect(result.status).toBe('ok');
    expect(result.followers).toBe(77);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never changes a persistent HTTP 503 into a successful measurement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 503 })));
    const result = await readAudience('github', 'https://github.com/target');
    expect(result.status).toBe('unavailable'); expect(result.evidence).toContain('503');
  });
});
describe('coverage outcomes', () => {
  it('separates an empty successful lookup from unavailable and partial coverage', () => {
    expect(coverageOutcome(3, 0, 0)).toBe('complete');
    expect(coverageOutcome(3, 3, 0)).toBe('unavailable');
    expect(coverageOutcome(3, 2, 1)).toBe('partial');
    expect(coverageOutcome(0, 0, 0)).toBe('not-configured');
  });
  it('does not count owned pages as external domain mentions', () => {
    expect(isOwnedDomainCoverage({ type: 'domain', term: 'example.com' }, { url: 'https://example.com/article' })).toBe(true);
    expect(isOwnedDomainCoverage({ type: 'domain', term: 'example.com' }, { url: 'https://publisher.test/review' })).toBe(false);
  });
  it('keeps a single bounded identity query with optional anchors', () => {
    expect(mentionQuery({ type: 'brand', term: 'Brand', anchors: ['product'] })).toBe('"Brand"');
    expect(mentionQuery({ type: 'name', term: 'Alex', anchors: ['Company', 'Site'] })).toBe('"Alex" ("Company" OR "Site")');
  });
  it('caps concurrency and preserves result order', async () => {
    let active = 0, maximum = 0;
    const output = await mapLimited([1, 2, 3, 4], 2, async i => { active++; maximum = Math.max(maximum, active); await new Promise(r => setTimeout(r, 2)); active--; return i * 2; });
    expect(maximum).toBeLessThanOrEqual(2); expect(output).toEqual([2, 4, 6, 8]);
  });
});


describe("pending local edits beat stale remote clocks", () => {
  it("rebases explicit local intent above a newer remote wall clock", () => {
    const local: RemoteRecord = {
      data: { id: "task-1", title: "Newest user edit" },
      deleted: false,
      updatedAt: "2026-10-05T06:00:00.000Z",
      revision: "local-revision",
    };
    const remote: RemoteRecord = {
      data: { id: "task-1", title: "Older remote value" },
      deleted: false,
      updatedAt: "2026-10-05T08:00:00.000Z",
      revision: "remote-revision",
    };

    const rebased = rebaseLocalPending(
      local,
      remote,
      Date.parse("2026-10-05T07:00:00.000Z"),
    );

    expect(rebased.revision).toBe("local-revision");
    expect(Date.parse(rebased.updatedAt)).toBeGreaterThan(Date.parse(remote.updatedAt));
    expect(rebased.data?.title).toBe("Newest user edit");
  });
});
