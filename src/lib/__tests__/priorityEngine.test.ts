import { describe, expect, it } from 'vitest';
import {
  scoreItem,
  reasonsOf,
  PINNED_BONUS,
  MAX_ENGINE_SCORE,
} from '@/lib/priorityEngine';

const today = '2026-09-01';

describe('priority engine v2 — dimensions', () => {
  it('a critical task due today carries priority + dueToday dimensions', () => {
    const r = scoreItem({ priority: 'critical', overdueDays: 0, staleDays: 0, due: today, today, kind: 'task' });
    const names = r.dimensions.map((d) => d.name).sort();
    expect(names).toEqual(['dueToday', 'priority']);
    expect(r.score).toBe(60 + 22);
    expect(reasonsOf(r)[0]).toBe('due today');
    expect(reasonsOf(r)).toContain('critical priority');
  });

  it('overdue pressure grows per day and is capped', () => {
    const d10 = scoreItem({ priority: 'low', overdueDays: 10, staleDays: 0, today, kind: 'task' });
    const d30 = scoreItem({ priority: 'low', overdueDays: 30, staleDays: 0, today, kind: 'task' });
    const d300 = scoreItem({ priority: 'low', overdueDays: 300, staleDays: 0, today, kind: 'task' });
    expect(d10.dimensions.find((x) => x.name === 'lateness')?.points).toBeCloseTo(32, 5);
    expect(d30.score).toBe(d300.score); // capped — rot is review's job, not Now's
    expect(reasonsOf(d10)[0]).toBe('10 days overdue');
  });

  it('approaching deadline fades linearly to zero at the window edge', () => {
    const in1 = scoreItem({ priority: 'low', overdueDays: 0, staleDays: 0, due: '2026-09-02', today, kind: 'task' });
    const in14 = scoreItem({ priority: 'low', overdueDays: 0, staleDays: 0, due: '2026-09-15', today, kind: 'task' });
    const in15 = scoreItem({ priority: 'low', overdueDays: 0, staleDays: 0, due: '2026-09-16', today, kind: 'task' });
    expect(in1.score).toBeGreaterThan(in14.score);
    expect(in14.dimensions.find((x) => x.name === 'approaching')?.points ?? 0).toBe(0);
    expect(in15.dimensions.find((x) => x.name === 'approaching')).toBeUndefined();
  });

  it('kind bias: decisions and payments get flat boosts', () => {
    const dec = scoreItem({ priority: 'medium', overdueDays: 0, staleDays: 0, today, kind: 'decision' });
    const pay = scoreItem({ priority: 'medium', overdueDays: 0, staleDays: 0, today, kind: 'payment' });
    const tsk = scoreItem({ priority: 'medium', overdueDays: 0, staleDays: 0, today, kind: 'task' });
    expect(dec.score - tsk.score).toBe(12);
    expect(pay.score - tsk.score).toBe(8);
  });

  it('pinned outranks any non-pinned item', () => {
    const pinned = scoreItem({ priority: 'low', overdueDays: 0, staleDays: 0, today, kind: 'task', pinned: true });
    const maxNormal = scoreItem({
      priority: 'critical', overdueDays: 300, staleDays: 300,
      due: today, today, kind: 'decision',
    });
    expect(pinned.score).toBeGreaterThanOrEqual(PINNED_BONUS);
    expect(pinned.score).toBeGreaterThan(maxNormal.score);
    expect(MAX_ENGINE_SCORE).toBeLessThan(PINNED_BONUS);
    expect(reasonsOf(pinned)[0]).toBe('you committed to this today');
  });

  it('reasons never exceed three lines and deadline reasons lead', () => {
    const r = scoreItem({
      priority: 'critical', overdueDays: 40, staleDays: 40,
      due: today, today, kind: 'decision',
    });
    expect(reasonsOf(r).length).toBeLessThanOrEqual(3);
    expect(r.dimensions.length).toBe(5); // priority, lateness, dueToday, decay, kind
    expect(reasonsOf(r)[0]).toBe('40 days overdue');
  });

  it('an item with only a priority label still explains itself', () => {
    const r = scoreItem({ priority: 'medium', overdueDays: 0, staleDays: 0, today, kind: 'task' });
    expect(r.score).toBe(24);
    expect(reasonsOf(r)).toEqual(['medium priority']);
  });

  it('deterministic: same input, same output', () => {
    const a = scoreItem({ priority: 'high', overdueDays: 3, staleDays: 5, due: '2026-09-02', today, kind: 'task' });
    const b = scoreItem({ priority: 'high', overdueDays: 3, staleDays: 5, due: '2026-09-02', today, kind: 'task' });
    expect(a).toEqual(b);
  });
});
