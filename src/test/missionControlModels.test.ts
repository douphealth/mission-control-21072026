import { describe, expect, it } from 'vitest';
import { createIdempotencyKey, requiresApproval, type AutomationDefinition } from '@/lib/missionControlModels';

const base: AutomationDefinition = {
  id: 'daily-brief',
  name: 'Daily brief',
  description: 'Build the daily execution brief',
  domain: 'work',
  status: 'active',
  schedule: '0 8 * * *',
  timezone: 'Europe/Athens',
  actionType: 'daily-brief',
  actionConfig: {},
  approvalMode: 'destructive-only',
  maxRetries: 2,
  retryDelayMinutes: 10,
  timeoutMinutes: 15,
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

describe('automation safety primitives', () => {
  it('creates stable idempotency keys for the same scheduled run', () => {
    const first = createIdempotencyKey('daily-brief', '2026-07-20T08:00:00+03:00');
    const second = createIdempotencyKey('daily-brief', '2026-07-20T05:00:00.000Z');
    expect(first).toBe(second);
  });

  it('requires approval only for destructive operations in destructive-only mode', () => {
    expect(requiresApproval(base, false)).toBe(false);
    expect(requiresApproval(base, true)).toBe(true);
  });

  it('supports always and never approval policies', () => {
    expect(requiresApproval({ ...base, approvalMode: 'always' }, false)).toBe(true);
    expect(requiresApproval({ ...base, approvalMode: 'never' }, true)).toBe(false);
  });
});
