import { describe, expect, it } from 'vitest';
import { computeCapacity, fixedEventsFor, suggestOutcomes } from '../planning';
import { selectedDailyOutcomes, outcomeProgress } from '../dailyOutcomes';
import { validateSnapshot, sameSnapshotData } from '../snapshotValidation';
import { stripSecretsForExport, REDACTED } from '../secrets';
import { preserveExcludedSecrets } from '../versionSecrets';
import type { Task } from '../db';
const today = '2026-10-07';
const task = (id: string, props: Partial<Task> = {}) => ({ id, title: id, status: 'todo', priority: 'medium', createdAt: today, dueDate: '', committedOn: today, ...props }) as Task;

describe('daily planning accuracy', () => {
  it('retains completed selected work in the progress denominator', () => {
    const items = selectedDailyOutcomes([task('a', { status:'done' }), task('b'), task('c')], [], today);
    expect(outcomeProgress(items)).toEqual({ total:3, done:1 });
  });
  it('includes completed blocks but excludes archived and deleted tasks', () => {
    const done = task('done', { committedOn:undefined, status:'done', blocks:[{ id:'b', date:today, start:'09:00', end:'10:00', done:true }] });
    expect(selectedDailyOutcomes([done, task('archived', { archived:true }), task('deleted', { deletedAt:today })], [], today).map(item => item.refId)).toEqual(['done']);
  });
  it('does not invent commitments from unselected tasks', () => {
    expect(selectedDailyOutcomes([task('a', { committedOn:undefined })], [], today)).toEqual([]);
  });
  it('counts overlapping fixed events only once', () => {
    const cap = computeCapacity({ tasks:[], today, nowHHMM:'09:00', workdayStart:'09:00', workdayEnd:'12:00', fixed:[
      { id:'a', title:'Meeting A', start:'09:00', end:'10:00', allDay:false },
      { id:'b', title:'Meeting B', start:'09:30', end:'10:30', allDay:false },
      { id:'c', title:'Duplicate', start:'09:30', end:'10:00', allDay:false },
    ] });
    expect(cap.fixedMin).toBe(90); expect(cap.availableMin).toBe(90);
  });
  it('clips overnight timed events to the local day', () => {
    const events = fixedEventsFor([{ id:'overnight', summary:'Overnight', start:{ dateTime:'2026-10-06T23:00:00' }, end:{ dateTime:'2026-10-07T02:00:00' } }] as never, today);
    expect(events[0]).toMatchObject({ start:'00:00', end:'02:00', allDay:false });
  });
  it('never calls an oversized first suggestion a fit', () => {
    const candidates = [{ task:task('large', { estimateMin:60 }), score:100, reasons:[] }, { task:task('small', { estimateMin:15 }), score:20, reasons:[] }];
    expect(suggestOutcomes(candidates, 0)).toEqual([]);
    expect(suggestOutcomes(candidates, 20).map(item => item.task.id)).toEqual(['small']);
    expect(suggestOutcomes(candidates, NaN)).toEqual([]);
    expect(suggestOutcomes([{ ...candidates[1], task:task('blocked', { status:'blocked', estimateMin:10 }) }], 30)).toEqual([]);
  });
});
describe('backup validation and secrecy', () => {
  it('rejects malformed collections, settings and duplicate row IDs', () => {
    const snapshot = { id:'version', createdAt:new Date().toISOString(), payload:{ tasks:[{ id:'one' }] } };
    expect(() => validateSnapshot(snapshot)).not.toThrow();
    expect(() => validateSnapshot({ ...snapshot, payload:{ tasks:[{ id:'one' }, { id:'one' }] } })).toThrow();
    expect(() => validateSnapshot({ ...snapshot, payload:{ tasks:'bad' } })).toThrow();
    expect(() => validateSnapshot({ ...snapshot, settings:'bad' })).toThrow();
  });
  it('does not treat a matching version ID as proof of matching data', () => {
    const a = { id:'a', payload:{ tasks:[{ id:'t', title:'original' }] } } as any;
    expect(sameSnapshotData(a, { ...a, name:'renamed' })).toBe(true);
    expect(sameSnapshotData(a, { ...a, payload:{ tasks:[{ id:'t', title:'different' }] } })).toBe(false);
  });
  it('redacts every credential-bearing URL, not alternate matches', () => {
    const input = Array(6).fill('postgres://fixture:fixture-secret@example.invalid/db');
    expect(stripSecretsForExport(input)).toEqual(Array(6).fill(REDACTED));
  });
  it('does not leak an excessively nested raw tail', () => {
    let value: any = { password:'fixture-private' };
    for (let i = 0; i < 40; i++) value = { child:value };
    expect(JSON.stringify(stripSecretsForExport(value))).not.toContain('fixture-private');
  });
  it('restores ordinary values while preserving omitted live credentials', () => {
    const restored = preserveExcludedSecrets({ id:'a', title:'Restored' }, { id:'a', title:'Current', apiKey:'fixture-private', description:'old ordinary field' });
    expect(restored).toEqual({ id:'a', title:'Restored', apiKey:'fixture-private' });
  });
});
