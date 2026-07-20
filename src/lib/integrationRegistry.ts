import { automationDb, type IntegrationHealth } from '@/lib/automationDb';

export type IntegrationId = 'google-calendar' | 'google-tasks' | 'github' | 'wordpress' | 'gsc' | 'ga4' | 'gmail' | 'cloudflare' | 'hermes';

export interface IntegrationAdapter {
  id: IntegrationId;
  label: string;
  configured(): boolean;
  healthCheck(signal: AbortSignal): Promise<Omit<IntegrationHealth, 'id' | 'integration' | 'lastCheckedAt'>>;
}

const adapters = new Map<IntegrationId, IntegrationAdapter>();

export function registerIntegration(adapter: IntegrationAdapter) {
  adapters.set(adapter.id, adapter);
  return () => adapters.delete(adapter.id);
}

export function listIntegrations() {
  return Array.from(adapters.values());
}

export async function checkIntegration(adapter: IntegrationAdapter, timeoutMs = 10000): Promise<IntegrationHealth> {
  const checkedAt = new Date().toISOString();
  if (!adapter.configured()) {
    const record: IntegrationHealth = {
      id: adapter.id,
      integration: adapter.id,
      status: 'unconfigured',
      lastCheckedAt: checkedAt,
    };
    await automationDb.integrationHealth.put(record);
    return record;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const result = await adapter.healthCheck(controller.signal);
    const record: IntegrationHealth = {
      ...result,
      id: adapter.id,
      integration: adapter.id,
      lastCheckedAt: checkedAt,
      latencyMs: Math.round(performance.now() - started),
      lastSuccessfulAt: result.status === 'healthy' ? checkedAt : result.lastSuccessfulAt,
    };
    await automationDb.integrationHealth.put(record);
    return record;
  } catch (error) {
    const record: IntegrationHealth = {
      id: adapter.id,
      integration: adapter.id,
      status: 'offline',
      lastCheckedAt: checkedAt,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    };
    await automationDb.integrationHealth.put(record);
    return record;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkAllIntegrations() {
  return Promise.all(listIntegrations().map(adapter => checkIntegration(adapter)));
}
