import type { Task } from '@/lib/db';
import type { CanonicalTask } from '@/lib/missionControlModels';

export interface ExternalTaskRecord {
  source: 'google-calendar' | 'google-tasks';
  sourceId: string;
  title: string;
  description?: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  completed?: boolean;
  updatedAt?: string;
}

export interface ReconciliationResult {
  create: CanonicalTask[];
  update: Array<{ id: string; changes: Partial<CanonicalTask> }>;
  unchanged: string[];
}

function normalizedTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function equivalent(local: CanonicalTask, external: ExternalTaskRecord) {
  return normalizedTitle(local.title) === normalizedTitle(external.title)
    && (local.dueDate || '') === (external.dueDate || '')
    && (local.startTime || '') === (external.startTime || '')
    && (local.endTime || '') === (external.endTime || '')
    && (local.status === 'done') === Boolean(external.completed);
}

export function reconcileExternalTasks(localTasks: Task[], externalRecords: ExternalTaskRecord[], now = new Date()): ReconciliationResult {
  const local = localTasks as CanonicalTask[];
  const bySource = new Map(
    local.filter(task => task.source && task.sourceId).map(task => [`${task.source}:${task.sourceId}`, task]),
  );

  const create: CanonicalTask[] = [];
  const update: Array<{ id: string; changes: Partial<CanonicalTask> }> = [];
  const unchanged: string[] = [];

  for (const external of externalRecords) {
    const key = `${external.source}:${external.sourceId}`;
    const match = bySource.get(key);
    if (!match) {
      create.push({
        id: crypto.randomUUID?.() ?? `${external.sourceId}-${now.getTime()}`,
        canonicalId: crypto.randomUUID?.() ?? `${key}-${now.getTime()}`,
        source: external.source,
        sourceId: external.sourceId,
        domain: 'work',
        title: external.title,
        description: external.description || '',
        priority: 'medium',
        status: external.completed ? 'done' : 'todo',
        dueDate: external.dueDate || '',
        startTime: external.startTime,
        endTime: external.endTime,
        allDay: !external.startTime,
        category: external.source === 'google-calendar' ? 'Calendar' : 'Google Tasks',
        linkedProject: '',
        subtasks: [],
        createdAt: now.toISOString(),
        completedAt: external.completed ? now.toISOString() : undefined,
      });
      continue;
    }

    if (equivalent(match, external)) {
      unchanged.push(match.id);
      continue;
    }

    update.push({
      id: match.id,
      changes: {
        title: external.title,
        description: external.description ?? match.description,
        dueDate: external.dueDate || '',
        startTime: external.startTime,
        endTime: external.endTime,
        allDay: !external.startTime,
        status: external.completed ? 'done' : match.status === 'done' ? 'todo' : match.status,
        completedAt: external.completed ? match.completedAt || now.toISOString() : undefined,
      },
    });
  }

  return { create, update, unchanged };
}
