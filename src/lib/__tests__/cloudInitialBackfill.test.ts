import { describe, expect, it } from 'vitest';
import { capturedChangeIsCurrent } from '@/lib/cloudSyncProtocol';

describe('initial cloud backfill / dirty journal interaction', () => {
  const seed = { changedAt: '2026-10-28T12:00:00.000Z', revision: 'seed-1' };
  const edit = { changedAt: '2026-10-28T12:01:00.000Z', revision: 'local-edit-1' };

  it('includes existing IndexedDB rows missing from the cloud, even without a journal entry', () => {
    expect(capturedChangeIsCurrent(seed, undefined, true)).toBe(true);
  });

  it('defers an inferred seed when a newer edit appears during upload', () => {
    expect(capturedChangeIsCurrent(seed, edit, true)).toBe(false);
  });

  it('preserves explicit edits until their captured revision is still current', () => {
    expect(capturedChangeIsCurrent(edit, edit, false)).toBe(true);
    expect(capturedChangeIsCurrent(seed, edit, false)).toBe(false);
    expect(capturedChangeIsCurrent(edit, undefined, false)).toBe(false);
  });

  it('also supports legacy journal entries without a revision', () => {
    const legacy = { changedAt: '2026-10-28T12:02:00.000Z' };
    expect(capturedChangeIsCurrent(legacy, { ...legacy }, false)).toBe(true);
    expect(capturedChangeIsCurrent(legacy, { changedAt: '2026-10-28T12:03:00.000Z' }, false)).toBe(false);
  });
});
