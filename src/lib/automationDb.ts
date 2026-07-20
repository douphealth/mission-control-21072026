import Dexie, { type Table } from 'dexie';
import type { AutomationDefinition, AutomationRun } from '@/lib/missionControlModels';

export interface ApprovalRequest {
  id: string;
  automationId: string;
  runId: string;
  actionType: string;
  summary: string;
  destructive: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface IntegrationHealth {
  id: string;
  integration: string;
  status: 'healthy' | 'degraded' | 'offline' | 'unconfigured';
  lastCheckedAt: string;
  lastSuccessfulAt?: string;
  latencyMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AutomationLock {
  id: string;
  automationId: string;
  owner: string;
  acquiredAt: string;
  expiresAt: string;
}

class AutomationDB extends Dexie {
  automations!: Table<AutomationDefinition>;
  runs!: Table<AutomationRun>;
  approvals!: Table<ApprovalRequest>;
  integrationHealth!: Table<IntegrationHealth>;
  locks!: Table<AutomationLock>;

  constructor() {
    super('MissionControlAutomationDB');
    this.version(1).stores({
      automations: 'id, status, domain, nextRunAt, updatedAt',
      runs: 'id, automationId, status, idempotencyKey, scheduledFor, startedAt, finishedAt',
      approvals: 'id, automationId, runId, status, requestedAt',
      integrationHealth: 'id, integration, status, lastCheckedAt',
      locks: 'id, automationId, owner, expiresAt',
    });
  }
}

export const automationDb = new AutomationDB();
