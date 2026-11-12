import { describe, it, expect } from 'vitest';
import { resolvePendingChange, type RemoteRecord } from '../cloudSyncProtocol';
import { createCommittedMutationBuffer } from '../syncTransactionSafety';

const T0 = '2026-11-10T10:00:00.000Z';
const T1 = '2026-11-11T10:00:00.000Z';
const NOW = Date.parse('2026-11-12T10:00:00.000Z');
const put = (data: Record<string, unknown>, updatedAt: string, revision: string): RemoteRecord => ({ data, deleted: false, updatedAt, revision });

describe('task sync across devices', () => {
  it('a stale phone background edit does not bring back a task trashed on the laptop', () => {
    const remote = put({ id: 't1', title: 'Pay rent', deletedAt: T1 }, T1, 'laptop');
    const local = put({ id: 't1', title: 'Pay rent', gtaskHash: 'h2' }, T0, 'phone');
    const { record } = resolvePendingChange(local, remote, { fields: ['gtaskHash'], seenRemote: false }, NOW);
    expect(record.data?.deletedAt).toBe(T1);
    expect(record.data?.gtaskHash).toBe('h2');
  });

  it('a permanently deleted task stays deleted when another device edited an old copy', () => {
    const remote: RemoteRecord = { data: null, deleted: true, updatedAt: T1, revision: 'laptop-del' };
    const local = put({ id: 't1', title: 'Old', createdAt: T0 }, T0, 'phone');
    expect(resolvePendingChange(local, remote, { fields: ['title'], seenRemote: false }, NOW).outcome).toBe('remote-delete');
  });

  it('a task re-created after the delete is kept', () => {
    const remote: RemoteRecord = { data: null, deleted: true, updatedAt: T0, revision: 'del' };
    const local = put({ id: 't1', title: 'New', createdAt: T1 }, T1, 'phone');
    expect(resolvePendingChange(local, remote, { seenRemote: false }, NOW).outcome).toBe('local');
  });

  it('restoring from Trash on another device wins', () => {
    const remote = put({ id: 't1', title: 'A', deletedAt: T0 }, T0, 'laptop');
    const local = put({ id: 't1', title: 'A' }, T1, 'phone');
    const { record } = resolvePendingChange(local, remote, { fields: ['deletedAt', 'touchedAt'], seenRemote: false }, NOW);
    expect(record.data?.deletedAt).toBeUndefined();
  });

  it('newer edits from another device survive an older device changing a different field', () => {
    const remote = put({ id: 't1', title: 'Renamed on laptop', status: 'todo' }, T1, 'laptop');
    const local = put({ id: 't1', title: 'Original', status: 'done' }, T0, 'phone');
    const { record } = resolvePendingChange(local, remote, { fields: ['status'], seenRemote: false }, NOW);
    expect(record.data).toMatchObject({ title: 'Renamed on laptop', status: 'done' });
    expect(Date.parse(record.updatedAt)).toBeGreaterThan(Date.parse(T1));
  });

  it('an edit made on top of the latest cloud copy wins whole', () => {
    const remote = put({ id: 't1', title: 'A', note: 'x' }, T0, 'r1');
    const local = put({ id: 't1', title: 'B' }, T1, 'l1');
    expect(resolvePendingChange(local, remote, { fields: ['title'], seenRemote: true }, NOW).record.data).toEqual({ id: 't1', title: 'B' });
  });

  it('without field details a trash marker from another device is still kept', () => {
    const remote = put({ id: 't1', title: 'A', deletedAt: T1 }, T1, 'laptop');
    const local = put({ id: 't1', title: 'A2' }, T0, 'phone');
    expect(resolvePendingChange(local, remote, { seenRemote: false }, NOW).record.data).toMatchObject({ title: 'A2', deletedAt: T1 });
  });

  it('records the changed fields of each committed edit', () => {
    const calls: Array<[string, string[] | undefined]> = [];
    const buffer = createCommittedMutationBuffer((_c, fields) => calls.push(...fields));
    const done: (() => void)[] = [];
    const tx = { on: (_e: 'complete', cb: () => void) => done.push(cb) };
    buffer.stage(tx, 'tasks::a', 'put', ['title']);
    buffer.stage(tx, 'tasks::a', 'put', ['status']);
    buffer.stage(tx, 'tasks::b', 'put');
    done[0]();
    expect(calls).toEqual([['tasks::a', ['title', 'status']], ['tasks::b', undefined]]);
  });
});
