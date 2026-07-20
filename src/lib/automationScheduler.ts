import { automationDb, type ApprovalRequest } from '@/lib/automationDb';
import {
  createIdempotencyKey,
  requiresApproval,
  type AutomationDefinition,
  type AutomationRun,
} from '@/lib/missionControlModels';

const WORKER_ID = `browser:${crypto.randomUUID?.() ?? Date.now()}`;
const LOCK_TTL_MS = 5 * 60 * 1000;

export interface AutomationActionContext {
  definition: AutomationDefinition;
  run: AutomationRun;
  signal: AbortSignal;
}

export interface AutomationActionResult {
  output?: Record<string, unknown>;
  createdTaskId?: string;
}

export type AutomationAction = (context: AutomationActionContext) => Promise<AutomationActionResult>;

const actions = new Map<string, { execute: AutomationAction; destructive: boolean }>();

export function registerAutomationAction(actionType: string, execute: AutomationAction, destructive = false) {
  actions.set(actionType, { execute, destructive });
  return () => actions.delete(actionType);
}

async function acquireLock(definition: AutomationDefinition, now: Date): Promise<boolean> {
  const id = definition.concurrencyKey || definition.id;
  const existing = await automationDb.locks.get(id);
  if (existing && new Date(existing.expiresAt).getTime() > now.getTime()) return false;
  await automationDb.locks.put({
    id,
    automationId: definition.id,
    owner: WORKER_ID,
    acquiredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + LOCK_TTL_MS).toISOString(),
  });
  return true;
}

async function releaseLock(definition: AutomationDefinition) {
  await automationDb.locks.delete(definition.concurrencyKey || definition.id);
}

function retryAt(definition: AutomationDefinition, attempt: number, now: Date) {
  const multiplier = Math.max(1, 2 ** Math.max(0, attempt - 1));
  return new Date(now.getTime() + definition.retryDelayMinutes * multiplier * 60000).toISOString();
}

async function queueApproval(definition: AutomationDefinition, run: AutomationRun, destructive: boolean) {
  const approval: ApprovalRequest = {
    id: `approval:${run.id}`,
    automationId: definition.id,
    runId: run.id,
    actionType: definition.actionType,
    summary: `${definition.name}: ${definition.description}`,
    destructive,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  await automationDb.approvals.put(approval);
  await automationDb.runs.update(run.id, { status: 'awaiting-approval' });
}

export async function executeAutomation(definition: AutomationDefinition, scheduledFor: string, now = new Date()) {
  const action = actions.get(definition.actionType);
  if (!action) throw new Error(`No registered action for ${definition.actionType}`);

  const idempotencyKey = createIdempotencyKey(definition.id, scheduledFor);
  const existing = await automationDb.runs.where('idempotencyKey').equals(idempotencyKey).first();
  if (existing) return existing;
  if (!(await acquireLock(definition, now))) return null;

  const run: AutomationRun = {
    id: crypto.randomUUID?.() ?? `${Date.now()}`,
    automationId: definition.id,
    status: 'queued',
    idempotencyKey,
    scheduledFor,
    attempt: 1,
    input: definition.actionConfig,
  };

  await automationDb.runs.add(run);
  try {
    if (requiresApproval(definition, action.destructive)) {
      await queueApproval(definition, run, action.destructive);
      return { ...run, status: 'awaiting-approval' as const };
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), definition.timeoutMinutes * 60000);
    await automationDb.runs.update(run.id, { status: 'running', startedAt: now.toISOString() });
    try {
      const result = await action.execute({ definition, run, signal: controller.signal });
      const finishedAt = new Date().toISOString();
      await automationDb.runs.update(run.id, {
        status: 'succeeded',
        finishedAt,
        output: result.output,
        createdTaskId: result.createdTaskId,
      });
      await automationDb.automations.update(definition.id, { lastRunAt: finishedAt });
      return await automationDb.runs.get(run.id);
    } finally {
      window.clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date().toISOString();
    await automationDb.runs.update(run.id, { status: 'failed', finishedAt, error: message });
    if (run.attempt <= definition.maxRetries) {
      await automationDb.automations.update(definition.id, { nextRunAt: retryAt(definition, run.attempt, now), status: 'error' });
    }
    return await automationDb.runs.get(run.id);
  } finally {
    await releaseLock(definition);
  }
}

export async function runDueAutomations(now = new Date()) {
  const due = await automationDb.automations
    .where('status')
    .equals('active')
    .filter(item => Boolean(item.nextRunAt) && new Date(item.nextRunAt!).getTime() <= now.getTime())
    .toArray();

  const results = [];
  for (const definition of due) {
    results.push(await executeAutomation(definition, definition.nextRunAt!, now));
  }
  return results;
}

export function startAutomationScheduler(intervalMs = 60000) {
  let stopped = false;
  const tick = async () => {
    if (!stopped && document.visibilityState === 'visible') await runDueAutomations();
  };
  void tick();
  const timer = window.setInterval(() => void tick(), Math.max(15000, intervalMs));
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}
