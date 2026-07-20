import { describe, expect, it } from 'vitest';
import { rankTasks } from '@/lib/taskPriority';
import type { Task } from '@/lib/db';

const base: Task = {
  id: 'base',
  title: 'Base task',
  priority: 'medium',
  status: 'todo',
  dueDate: '2026-07-25',
  category: 'Work',
  description: '',
  linkedProject: '',
  subtasks: [],
  createdAt: '2026-07-20',
};

describe('rankTasks', () => {
  it('puts overdue critical work before future low-priority work', () => {
    const ranked = rankTasks([
      { ...base, id: 'future', priority: 'low', dueDate: '2026-08-20' },
      { ...base, id: 'overdue', priority: 'critical', dueDate: '2026-07-18' },
    ], new Date('2026-07-20T10:00:00'));

    expect(ranked[0].id).toBe('overdue');
    expect(ranked[0].reasons).toContain('2 day(s) overdue');
  });

  it('excludes completed tasks and penalizes blocked tasks', () => {
    const ranked = rankTasks([
      { ...base, id: 'done', status: 'done' },
      { ...base, id: 'blocked', status: 'blocked', priority: 'high' },
      { ...base, id: 'active', status: 'in-progress', priority: 'high' },
    ], new Date('2026-07-20T10:00:00'));

    expect(ranked.map(task => task.id)).toEqual(['active', 'blocked']);
  });
});
