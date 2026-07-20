import { db, genId, type Task } from '@/lib/db';
import { registerAutomationAction } from '@/lib/automationScheduler';
import { rankTasks } from '@/lib/taskPriority';

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

async function createReviewTask(title: string, description: string, category: string, priority: Task['priority'] = 'medium') {
  const task: Task = {
    id: genId(),
    title,
    priority,
    status: 'todo',
    dueDate: todayISO(),
    category,
    description,
    linkedProject: '',
    subtasks: [],
    createdAt: new Date().toISOString(),
  };
  await db.tasks.add(task);
  return task.id;
}

export function registerDefaultAutomationActions() {
  const unregister = [
    registerAutomationAction('routine.morning-plan', async () => {
      const tasks = await db.tasks.toArray();
      const queue = rankTasks(tasks).slice(0, 7);
      return { output: { taskIds: queue.map(task => task.id), generatedAt: new Date().toISOString() } };
    }),
    registerAutomationAction('routine.end-of-day', async () => ({
      createdTaskId: await createReviewTask(
        'Complete end-of-day review',
        'Record completed work, unresolved blockers, unfinished commitments and tomorrow’s first action.',
        'Review',
      ),
    })),
    registerAutomationAction('routine.weekly-review', async () => ({
      createdTaskId: await createReviewTask(
        'Complete weekly review',
        'Review projects, stale tasks, calendar commitments, finances, health routines and next-week priorities.',
        'Planning',
        'high',
      ),
    })),
    registerAutomationAction('routine.portfolio-health', async () => ({
      createdTaskId: await createReviewTask(
        'Review website portfolio health',
        'Review technical availability, indexation, analytics, publishing cadence, monetization and connector health. External fixes require configured adapters and approval.',
        'Websites',
        'high',
      ),
    })),
    registerAutomationAction('routine.health-checkin', async () => ({
      createdTaskId: await createReviewTask(
        'Log health check-in',
        'Record sleep, energy, training, symptoms and medication adherence. This routine records observations and does not make medical decisions.',
        'Health',
      ),
    })),
  ];

  return () => unregister.forEach(dispose => dispose());
}
