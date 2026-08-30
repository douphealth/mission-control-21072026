import Dexie, { type Table } from 'dexie';

export type ISODateTime = string;
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type WorkStatus =
  | 'inbox'
  | 'ready'
  | 'scheduled'
  | 'in-progress'
  | 'waiting'
  | 'blocked'
  | 'validating'
  | 'monitoring'
  | 'done'
  | 'cancelled'
  | 'someday';

export type EntityKind =
  | 'website'
  | 'repo'
  | 'app'
  | 'domain'
  | 'service'
  | 'account'
  | 'person'
  | 'asset'
  | 'document'
  | 'other';

export type FindingStatus = 'open' | 'accepted' | 'ignored' | 'resolved' | 'regression';
export type ValidationStatus = 'pending' | 'passed' | 'failed' | 'inconclusive';
export type EventActorType = 'user' | 'agent' | 'integration' | 'system';

export interface OSArea {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OSProject {
  id: string;
  areaId?: string;
  name: string;
  outcome: string;
  status: 'planned' | 'active' | 'waiting' | 'completed' | 'cancelled' | 'archived';
  successMetric?: string;
  baseline?: string;
  target?: string;
  startedAt?: ISODateTime;
  reviewAt?: ISODateTime;
  completedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OSEntity {
  id: string;
  areaId?: string;
  projectId?: string;
  kind: EntityKind;
  name: string;
  canonicalRef?: string;
  externalId?: string;
  status: 'active' | 'paused' | 'archived';
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OSWorkItem {
  id: string;
  areaId?: string;
  projectId?: string;
  entityIds?: string[];
  title: string;
  description?: string;
  priority: Priority;
  status: WorkStatus;
  source: 'manual' | 'finding' | 'agent' | 'integration' | 'system';
  sourceRef?: string;
  nextAction?: string;
  waitingFor?: string;
  effort?: number;
  impact?: number;
  confidence?: number;
  risk?: number;
  scheduledAt?: ISODateTime;
  dueAt?: ISODateTime;
  notBefore?: ISODateTime;
  reviewAt?: ISODateTime;
  cooldownUntil?: ISODateTime;
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  cancelledAt?: ISODateTime;
  assignedTo?: string;
  tags?: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OSFinding {
  id: string;
  fingerprint: string;
  areaId?: string;
  projectId?: string;
  entityId?: string;
  title: string;
  category: string;
  severity: Priority;
  status: FindingStatus;
  source: string;
  sourceRef?: string;
  evidence?: string;
  firstSeenAt: ISODateTime;
  lastSeenAt: ISODateTime;
  occurrenceCount: number;
  resolvedAt?: ISODateTime;
  cooldownUntil?: ISODateTime;
  workItemId?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OSValidation {
  id: string;
  workItemId: string;
  findingId?: string;
  status: ValidationStatus;
  method: string;
  expected?: string;
  observed?: string;
  evidence?: string;
  checkedAt: ISODateTime;
  nextCheckAt?: ISODateTime;
  createdAt: ISODateTime;
}

export interface OSEvent {
  id: string;
  occurredAt: ISODateTime;
  actorType: EventActorType;
  actorId?: string;
  eventType: string;
  areaId?: string;
  projectId?: string;
  entityId?: string;
  workItemId?: string;
  findingId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  evidence?: string;
  rollback?: string;
  metadata?: Record<string, unknown>;
}

export interface OSRelation {
  id: string;
  fromType: 'area' | 'project' | 'entity' | 'work-item' | 'finding';
  fromId: string;
  toType: 'area' | 'project' | 'entity' | 'work-item' | 'finding';
  toId: string;
  relation: string;
  createdAt: ISODateTime;
}

class MissionControlOSDB extends Dexie {
  areas!: Table<OSArea>;
  projects!: Table<OSProject>;
  entities!: Table<OSEntity>;
  workItems!: Table<OSWorkItem>;
  findings!: Table<OSFinding>;
  validations!: Table<OSValidation>;
  events!: Table<OSEvent>;
  relations!: Table<OSRelation>;

  constructor() {
    super('MissionControlOSDB');
    this.version(1).stores({
      areas: 'id, name, status, updatedAt',
      projects: 'id, areaId, status, reviewAt, updatedAt',
      entities: 'id, areaId, projectId, kind, status, canonicalRef, updatedAt',
      workItems: 'id, areaId, projectId, status, priority, dueAt, scheduledAt, reviewAt, cooldownUntil, updatedAt',
      findings: 'id, &fingerprint, areaId, projectId, entityId, status, severity, lastSeenAt, cooldownUntil, workItemId',
      validations: 'id, workItemId, findingId, status, checkedAt, nextCheckAt',
      events: 'id, occurredAt, eventType, actorType, projectId, entityId, workItemId, findingId',
      relations: 'id, fromType, fromId, toType, toId, relation, [fromType+fromId], [toType+toId]',
    });
  }
}

export const osDb = new MissionControlOSDB();

export function osId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `os_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function nowISO(): ISODateTime {
  return new Date().toISOString();
}

export function normalizeFingerprintPart(value?: string | null): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\s+/g, ' ');
}

/**
 * Stable, deterministic finding fingerprint. The same source issue should update
 * one finding instead of creating repeated work every time an agent/scanner runs.
 */
export async function findingFingerprint(input: {
  scope?: string;
  entityRef?: string;
  category: string;
  key: string;
}): Promise<string> {
  const canonical = [input.scope, input.entityRef, input.category, input.key]
    .map(normalizeFingerprintPart)
    .join('|');
  const bytes = new TextEncoder().encode(canonical);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (const b of bytes) hash = Math.imul(hash ^ b, 16777619);
  return `fnv_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function upsertFinding(input: Omit<OSFinding, 'id' | 'occurrenceCount' | 'firstSeenAt' | 'lastSeenAt' | 'createdAt' | 'updatedAt'>) {
  const now = nowISO();
  const existing = await osDb.findings.where('fingerprint').equals(input.fingerprint).first();
  if (existing) {
    const patch: Partial<OSFinding> = {
      ...input,
      lastSeenAt: now,
      occurrenceCount: (existing.occurrenceCount || 0) + 1,
      updatedAt: now,
    };

    // Closed findings do not silently become actionable again while cooling down.
    // A real recurrence after cooldown is explicitly marked as a regression.
    const cooling = !!existing.cooldownUntil && new Date(existing.cooldownUntil).getTime() > Date.now();
    if (existing.status === 'resolved') {
      patch.status = cooling ? 'resolved' : 'regression';
    }

    await osDb.findings.update(existing.id, patch);
    await appendEvent({
      eventType: cooling ? 'finding.observed-during-cooldown' : 'finding.observed',
      actorType: 'system',
      findingId: existing.id,
      entityId: existing.entityId,
      projectId: existing.projectId,
      summary: cooling
        ? `Repeated finding suppressed during cooldown: ${existing.title}`
        : `Finding observed again: ${existing.title}`,
      after: patch,
    });
    return { id: existing.id, created: false, suppressed: cooling };
  }

  const id = osId();
  const finding: OSFinding = {
    ...input,
    id,
    occurrenceCount: 1,
    firstSeenAt: now,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await osDb.findings.add(finding);
  await appendEvent({
    eventType: 'finding.created',
    actorType: 'system',
    findingId: id,
    entityId: finding.entityId,
    projectId: finding.projectId,
    summary: `Finding created: ${finding.title}`,
    after: finding,
  });
  return { id, created: true, suppressed: false };
}

export async function appendEvent(input: Omit<OSEvent, 'id' | 'occurredAt'> & { occurredAt?: ISODateTime }) {
  const event: OSEvent = {
    ...input,
    id: osId(),
    occurredAt: input.occurredAt ?? nowISO(),
  };
  await osDb.events.add(event);
  return event.id;
}

export async function transitionWorkItem(
  id: string,
  status: WorkStatus,
  opts: { actorType?: EventActorType; actorId?: string; reason?: string; evidence?: string } = {},
) {
  const current = await osDb.workItems.get(id);
  if (!current) throw new Error(`Work item not found: ${id}`);

  const now = nowISO();
  const patch: Partial<OSWorkItem> = { status, updatedAt: now };
  if (status === 'in-progress' && !current.startedAt) patch.startedAt = now;
  if (status === 'done') patch.completedAt = now;
  if (status === 'cancelled') patch.cancelledAt = now;

  await osDb.workItems.update(id, patch);
  await appendEvent({
    actorType: opts.actorType ?? 'user',
    actorId: opts.actorId,
    eventType: 'work-item.status-changed',
    workItemId: id,
    projectId: current.projectId,
    summary: opts.reason || `${current.title}: ${current.status} -> ${status}`,
    before: { status: current.status },
    after: { status },
    evidence: opts.evidence,
  });
}

export function priorityScore(input: Pick<OSWorkItem, 'priority' | 'impact' | 'confidence' | 'effort' | 'risk'>): number {
  const priority = { critical: 100, high: 75, medium: 50, low: 25 }[input.priority];
  const impact = Math.max(0, Math.min(100, input.impact ?? 50));
  const confidence = Math.max(0, Math.min(100, input.confidence ?? 50));
  const effort = Math.max(1, Math.min(100, input.effort ?? 50));
  const risk = Math.max(0, Math.min(100, input.risk ?? 25));
  return Math.round(priority * 0.35 + impact * 0.35 + confidence * 0.2 - effort * 0.07 - risk * 0.03);
}

export async function getNowQueue(limit = 3): Promise<OSWorkItem[]> {
  const all = await osDb.workItems.toArray();
  const now = Date.now();
  return all
    .filter((w) => ['ready', 'scheduled', 'in-progress'].includes(w.status))
    .filter((w) => !w.notBefore || new Date(w.notBefore).getTime() <= now)
    .filter((w) => !w.cooldownUntil || new Date(w.cooldownUntil).getTime() <= now)
    .sort((a, b) => {
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
      return priorityScore(b) - priorityScore(a);
    })
    .slice(0, limit);
}
