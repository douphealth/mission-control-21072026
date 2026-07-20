import type { Task } from '@/lib/db';

export type WorkDomain = 'work' | 'personal' | 'health' | 'finance' | 'admin';
export type WorkSource = 'manual' | 'google-calendar' | 'google-tasks' | 'automation' | 'github' | 'wordpress' | 'email' | 'hermes';
export type ApprovalMode = 'never' | 'destructive-only' | 'always';
export type AutomationStatus = 'active' | 'paused' | 'error' | 'draft';
export type AutomationRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'awaiting-approval';

export interface CanonicalTaskMetadata {
  domain: WorkDomain;
  source: WorkSource;
  sourceId?: string;
  canonicalId: string;
  idempotencyKey?: string;
  estimatedMinutes?: number;
  energy?: 'low' | 'medium' | 'high';
  impact?: number;
  confidence?: number;
  effort?: number;
  approvalRequired?: boolean;
  automationId?: string;
}

export type CanonicalTask = Task & Partial<CanonicalTaskMetadata>;

export interface AutomationDefinition {
  id: string;
  name: string;
  description: string;
  domain: WorkDomain;
  status: AutomationStatus;
  schedule: string;
  timezone: string;
  actionType: string;
  actionConfig: Record<string, unknown>;
  approvalMode: ApprovalMode;
  maxRetries: number;
  retryDelayMinutes: number;
  timeoutMinutes: number;
  concurrencyKey?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  status: AutomationRunStatus;
  idempotencyKey: string;
  scheduledFor: string;
  startedAt?: string;
  finishedAt?: string;
  attempt: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  approvalNote?: string;
  createdTaskId?: string;
}

export function createIdempotencyKey(automationId: string, scheduledFor: string): string {
  return `${automationId}:${new Date(scheduledFor).toISOString()}`;
}

export function requiresApproval(definition: AutomationDefinition, destructive: boolean): boolean {
  if (definition.approvalMode === 'always') return true;
  if (definition.approvalMode === 'destructive-only') return destructive;
  return false;
}
