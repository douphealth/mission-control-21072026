import { describe, expect, it } from 'vitest';
import { applyAndConfirm, createCommittedMutationBuffer } from '../syncTransactionSafety';
import { createResilientStorage, resilientWebStorage, type StringStorage } from '../resilientStorage';
import { sanitizeNavigation } from '../../stores/navigationStore';

class MemoryStorage implements StringStorage {
  values = new Map<string, string>();
  blocked = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.blocked) throw new Error('Restricted'); this.values.set(key, value); }
  removeItem(key: string) { if (this.blocked) throw new Error('Restricted'); this.values.delete(key); }
}
describe('transactional synchronization', () => {
  it('never publishes receipts for a transaction that aborts', async () => {
    const cache = new Map([['existing', 'v1']]);
    await expect(applyAndConfirm(cache, async staged => { staged.set('new', 'v2'); throw new Error('abort'); }, () => true)).rejects.toThrow('abort');
    expect([...cache]).toEqual([['existing', 'v1']]);
  });
  it('waits for commit and account verification before publishing', async () => {
    const cache = new Map<string, string>();
    await expect(applyAndConfirm(cache, async staged => { staged.set('new', 'v1'); }, () => false)).rejects.toThrow('Account changed');
    expect(cache.size).toBe(0);
  });
  it('bounds the receipt cache without changing data', async () => {
    const cache = new Map([['old', 'v1']]);
    await applyAndConfirm(cache, async staged => { staged.set('a', 'v2'); staged.set('b', 'v3'); }, () => true, 2);
    expect([...cache.keys()]).toEqual(['a', 'b']);
  });
  it('coalesces only committed changes and ignores only the designated transaction', () => {
    const calls: unknown[] = [];
    const buffer = createCommittedMutationBuffer(changes => calls.push([...changes]));
    const callbacks: (() => void)[] = [];
    const tx = { on: (_event: 'complete', callback: () => void) => callbacks.push(callback) };
    buffer.stage(tx, 'tasks::a', 'put'); buffer.stage(tx, 'tasks::a', 'delete');
    expect(calls).toEqual([]); expect(callbacks.length).toBe(1);
    callbacks[0](); expect(calls).toEqual([[['tasks::a', 'delete']]]);
    buffer.ignore(tx); buffer.stage(tx, 'tasks::b', 'put'); expect(callbacks.length).toBe(1);
    const other = { on: (_event: 'complete', callback: () => void) => callbacks.push(callback) };
    buffer.stage(other, 'tasks::c', 'put'); expect(callbacks.length).toBe(2);
  });
});
describe('preference persistence safety', () => {
  it('returns the latest write when stale primary storage cannot be overwritten or removed', () => {
    const primary = new MemoryStorage(), fallback = new MemoryStorage();
    primary.setItem('pref', 'old'); primary.blocked = true;
    const storage = createResilientStorage({ primary: () => primary, fallback: () => fallback });
    storage.setItem('pref', 'new'); expect(storage.getItem('pref')).toBe('new');
    const reopened = createResilientStorage({ primary: () => primary, fallback: () => fallback });
    expect(reopened.getItem('pref')).toBe('new');
    storage.removeItem('pref'); expect(storage.getItem('pref')).toBeNull();
  });
  it('keeps an oversized latest value in memory rather than returning stale disk data', () => {
    const disk = new MemoryStorage(); disk.setItem('pref','old');
    const storage = createResilientStorage({ primary: () => disk, maxValueLength: 10 });
    storage.setItem('pref','x'.repeat(50)); expect(storage.getItem('pref')).toBe('x'.repeat(50));
  });
  it('does not persist request-specific preferences in a server singleton', () => {
    resilientWebStorage.setItem('ssr-pref', 'private'); expect(resilientWebStorage.getItem('ssr-pref')).toBeNull();
  });
  it('rejects corrupt navigation shapes and never hydrates methods', () => {
    expect(sanitizeNavigation({ recentSections: 'bad', activeSection: '<script>', setActiveSection: 'bad' })).toEqual({ activeSection:'dashboard', recentSections:[], sidebarCollapsed:false });
    expect(sanitizeNavigation({ activeSection:'calendar', recentSections:['tasks','tasks',null,...Array(20).fill('calendar')] })).toEqual({ activeSection:'calendar', recentSections:['tasks','calendar'], sidebarCollapsed:false });
  });
});
