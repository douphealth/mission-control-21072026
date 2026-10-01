import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeRemoteRecords, parseBackup, type RemoteRecord } from '../cloudSyncProtocol';
import { audienceProfile, measuredCount, profileJsonMetrics } from '../audienceEvidence';
import { coverageOutcome, isOwnedDomainCoverage, mapLimited, mentionQuery } from '../intelligenceRunQuality';
import { readAudience } from '../audienceProviders.server';
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
  it('makes missing YouTube configuration an explicit unavailable state', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    const result = await readAudience('youtube', 'https://youtube.com/@target');
    expect(result.errorCode).toBe('api-not-configured'); expect(result.followers).toBeNull();
  });
  it('never changes an HTTP 503 into a successful measurement', async () => {
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
