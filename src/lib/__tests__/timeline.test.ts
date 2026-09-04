import { describe, expect, it } from 'vitest';
import { buildTimeline, hhmmNow, type Timeline } from '@/lib/timeline';
import type { WorkItem } from '@/lib/workQueue';
import type { AttentionItem } from '@/lib/whyNow';

const today = '2026-09-01';

function item(over: Partial<WorkItem>): WorkItem {
  return {
    id: over.id ?? 'w1',
    kind: over.kind ?? 'task',
    refId: over.id ?? 'w1',
    title: over.title ?? 'Item',
    priority: over.priority ?? 'medium',
    overdueDays: over.overdueDays ?? 0,
    staleDays: over.staleDays ?? 0,
    score: over.score ?? 10,
    bucket: over.bucket ?? 'today',
    source: 'Tasks',
    scoreDimensions: over.scoreDimensions,
    time: over.time,
    due: over.due,
    ...over,
  } as WorkItem;
}

function flag(id: string, title: string): AttentionItem {
  return { id, title, detail: 'detail', severity: 'critical', section: 'tasks', actionLabel: 'Fix' };
}

describe('unified timeline', () => {
  it('flags are pinned first, never mixed into chronology', () => {
    const t: Timeline = buildTimeline({
      items: [item({ id: 'a', time: '08:00', title: 'Morning task' })],
      attention: [flag('f1', 'Site down')],
      nowTime: '09:00',
      today,
    });
    expect(t.entries[0].kind).toBe('flag');
    expect(t.entries[0].title).toBe('Site down');
    expect(t.nowIndex).toBe(2); // flag + elapsed 08:00 appointment
  });

  it('places NOW between elapsed and current/future timed work', () => {
    const t = buildTimeline({
      items: [
        item({ id: 'a', time: '08:00', title: 'Past' }),
        item({ id: 'b', time: '10:00', title: 'Future' }),
        item({ id: 'c', title: 'Untimed', score: 99 }),
      ],
      attention: [],
      nowTime: '09:00',
      today,
    });
    expect(t.nowIndex).toBe(1);
    expect(t.entries[t.nowIndex - 1].title).toBe('Past');
    expect(t.entries[t.nowIndex].title).toBe('Future');
    expect(t.entries[t.nowIndex + 1].title).toBe('Untimed');
  });

  it('treats an event at the current minute as current, not elapsed', () => {
    const t = buildTimeline({
      items: [
        item({ id: 'a', time: '08:59', title: 'Past' }),
        item({ id: 'b', time: '09:00', title: 'Current' }),
      ],
      attention: [],
      nowTime: '09:00',
      today,
    });
    expect(t.nowIndex).toBe(1);
    expect(t.entries[t.nowIndex].title).toBe('Current');
  });

  it('with no timed entries the NOW marker separates flags from the queue', () => {
    const t = buildTimeline({
      items: [item({ id: 'a', title: 'Untimed', score: 50 })],
      attention: [flag('f1', 'Flag')],
      nowTime: '12:00',
      today,
    });
    expect(t.nowIndex).toBe(1);
    expect(t.counts.timed).toBe(0);
  });

  it('untimed queue items are score-ordered and capped', () => {
    const items = Array.from({ length: 12 }, (_, i) => item({ id: `u${i}`, score: 100 - i * 10 }));
    const t = buildTimeline({ items, attention: [], nowTime: '09:00', today });
    expect(t.counts.untimed).toBe(8);
    const scores = t.entries.filter((e) => !e.time && e.kind !== 'flag').map((e) => e.score);
    expect(scores).toEqual([100, 90, 80, 70, 60, 50, 40, 30]);
  });

  it('engine dimensions become the timeline reasons', () => {
    const t = buildTimeline({
      items: [
        item({
          id: 'a',
          score: 82,
          scoreDimensions: [
            { name: 'dueToday', points: 22, reason: 'due today' },
            { name: 'priority', points: 60, reason: 'critical priority' },
          ],
        }),
      ],
      attention: [],
      nowTime: '09:00',
      today,
    });
    expect(t.entries[0].reasons).toEqual(['due today', 'critical priority']);
  });

  it('overdue work is marked critical in the timeline', () => {
    const t = buildTimeline({
      items: [item({ id: 'a', overdueDays: 5, time: '14:00' })],
      attention: [],
      nowTime: '09:00',
      today,
    });
    expect(t.entries[0].severity).toBe('critical');
  });

  it('hhmmNow is local, padded, and never UTC', () => {
    const d = new Date(2026, 8, 1, 9, 5);
    expect(hhmmNow(d)).toBe('09:05');
    const midnight = new Date(2026, 8, 1, 0, 0);
    expect(hhmmNow(midnight)).toBe('00:00');
  });
});
