import type { AutomationDefinition } from '@/lib/missionControlModels';

const now = () => new Date().toISOString();

export function buildDefaultRoutines(timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): AutomationDefinition[] {
  const createdAt = now();
  const base = {
    status: 'draft' as const,
    timezone,
    approvalMode: 'never' as const,
    maxRetries: 2,
    retryDelayMinutes: 15,
    timeoutMinutes: 5,
    createdAt,
    updatedAt: createdAt,
  };

  return [
    {
      ...base,
      id: 'routine-morning-plan',
      name: 'Morning plan',
      description: 'Build a realistic daily plan from overdue, due-today and high-impact tasks.',
      domain: 'personal',
      schedule: '0 8 * * *',
      actionType: 'routine.morning-plan',
      actionConfig: { maxTasks: 7, protectFocusMinutes: 90 },
    },
    {
      ...base,
      id: 'routine-end-of-day',
      name: 'End-of-day review',
      description: 'Capture unfinished work, blockers and tomorrow’s first action.',
      domain: 'personal',
      schedule: '0 19 * * *',
      actionType: 'routine.end-of-day',
      actionConfig: { carryForwardLimit: 5 },
    },
    {
      ...base,
      id: 'routine-weekly-review',
      name: 'Weekly review',
      description: 'Review projects, commitments, stale tasks, finances and next-week priorities.',
      domain: 'admin',
      schedule: '0 18 * * 0',
      actionType: 'routine.weekly-review',
      actionConfig: { staleAfterDays: 14 },
    },
    {
      ...base,
      id: 'routine-portfolio-health',
      name: 'Website portfolio health',
      description: 'Collect technical, analytics, publishing and monetization signals for all websites.',
      domain: 'work',
      schedule: '0 7 * * *',
      actionType: 'routine.portfolio-health',
      actionConfig: { createTasksForCriticalFindings: true },
      approvalMode: 'destructive-only',
    },
    {
      ...base,
      id: 'routine-health-checkin',
      name: 'Health check-in',
      description: 'Prompt for sleep, energy, training, symptoms and adherence without making medical decisions.',
      domain: 'health',
      schedule: '30 20 * * *',
      actionType: 'routine.health-checkin',
      actionConfig: { fields: ['sleep', 'energy', 'training', 'symptoms', 'medication'] },
    },
  ];
}
