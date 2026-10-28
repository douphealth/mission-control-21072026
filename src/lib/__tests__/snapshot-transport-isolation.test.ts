import { describe, expect, it } from 'vitest';
import { isSnapshotDataTable } from '@/lib/snapshotValidation';

describe('portable and safety backup boundaries', () => {
  it('never saves or restores the device-local sync mutation queue', () => {
    expect(isSnapshotDataTable('syncJournal')).toBe(false);
    expect(isSnapshotDataTable('syncMeta')).toBe(false);
    expect(isSnapshotDataTable('syncHealth')).toBe(false);
    expect(isSnapshotDataTable('settings')).toBe(false);
  });

  it('continues backing up user-owned data', () => {
    for (const name of ['tasks', 'websites', 'notes', 'payments', 'credentials', 'buildProjects', 'validations']) {
      expect(isSnapshotDataTable(name)).toBe(true);
    }
  });
});
