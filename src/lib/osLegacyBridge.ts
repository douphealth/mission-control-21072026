import { db } from '@/lib/db';
import { osDb, osId, nowISO, type OSProject, type OSEntity, type OSWorkItem } from '@/lib/osCore';

const MIGRATION_KEY = 'mc-os-v2-legacy-bridge-complete';

function canonical(value?: string) {
  return (value ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

async function ensureAreas() {
  const now = nowISO();
  const existing = await osDb.areas.toArray();
  if (existing.length) return;
  await osDb.areas.bulkAdd([
    { id: 'area-business', name: 'Business', status: 'active', createdAt: now, updatedAt: now },
    { id: 'area-personal', name: 'Personal', status: 'active', createdAt: now, updatedAt: now },
    { id: 'area-admin', name: 'Admin', status: 'active', createdAt: now, updatedAt: now },
  ]);
}

/**
 * Non-destructive bridge from the legacy Mission Control data model.
 * Existing Dexie tables remain untouched. We create canonical OS records once,
 * allowing the new operating-system layer to be adopted gradually.
 */
export async function bridgeLegacyIntoOS(): Promise<{ projects: number; entities: number; workItems: number }> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(MIGRATION_KEY) === '1') {
    return { projects: 0, entities: 0, workItems: 0 };
  }

  await ensureAreas();
  const [websites, repos, builds, tasks] = await Promise.all([
    db.websites.toArray(),
    db.repos.toArray(),
    db.buildProjects.toArray(),
    db.tasks.toArray(),
  ]);

  const now = nowISO();
  const existingProjects = await osDb.projects.toArray();
  const existingEntities = await osDb.entities.toArray();
  const existingWorkItems = await osDb.workItems.toArray();

  const projectByName = new Map(existingProjects.map((p) => [p.name.trim().toLowerCase(), p]));
  const entityByCanonical = new Map(existingEntities.filter((e) => e.canonicalRef).map((e) => [canonical(e.canonicalRef), e]));
  const workBySourceRef = new Map(existingWorkItems.filter((w) => w.sourceRef).map((w) => [w.sourceRef!, w]));

  const projectsToAdd: OSProject[] = [];
  const entitiesToAdd: OSEntity[] = [];
  const workItemsToAdd: OSWorkItem[] = [];

  const ensureProject = (name: string, outcome = '') => {
    const key = name.trim().toLowerCase();
    if (!key) return undefined;
    const existing = projectByName.get(key);
    if (existing) return existing.id;
    const project: OSProject = {
      id: osId(),
      areaId: 'area-business',
      name: name.trim(),
      outcome: outcome || `Operate and improve ${name.trim()}`,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    projectByName.set(key, project);
    projectsToAdd.push(project);
    return project.id;
  };

  for (const site of websites) {
    const projectId = ensureProject(site.name, `Operate ${site.name} effectively`);
    const key = canonical(site.url);
    if (key && entityByCanonical.has(key)) continue;
    const entity: OSEntity = {
      id: osId(),
      areaId: 'area-business',
      projectId,
      kind: 'website',
      name: site.name,
      canonicalRef: site.url,
      externalId: site.id,
      status: site.status === 'archived' ? 'archived' : site.status === 'maintenance' ? 'paused' : 'active',
      tags: site.tags,
      metadata: {
        legacyType: 'website',
        hostingProvider: site.hostingProvider,
        category: site.category,
        wpAdminUrl: site.wpAdminUrl,
      },
      createdAt: now,
      updatedAt: now,
    };
    entitiesToAdd.push(entity);
    if (key) entityByCanonical.set(key, entity);
  }

  for (const repo of repos) {
    const key = canonical(repo.url);
    if (key && entityByCanonical.has(key)) continue;
    const projectId = ensureProject(repo.name, `Maintain and ship ${repo.name}`);
    const entity: OSEntity = {
      id: osId(),
      areaId: 'area-business',
      projectId,
      kind: 'repo',
      name: repo.name,
      canonicalRef: repo.url,
      externalId: repo.id,
      status: repo.status === 'archived' ? 'archived' : repo.status === 'paused' ? 'paused' : 'active',
      tags: repo.topics,
      metadata: {
        legacyType: 'repo',
        language: repo.language,
        deploymentUrl: repo.deploymentUrl,
        devPlatformUrl: repo.devPlatformUrl,
      },
      createdAt: now,
      updatedAt: now,
    };
    entitiesToAdd.push(entity);
    if (key) entityByCanonical.set(key, entity);
  }

  for (const build of builds) {
    const projectId = ensureProject(build.name, `Complete and operate ${build.name}`);
    const key = canonical(build.projectUrl || build.deployedUrl);
    if (key && entityByCanonical.has(key)) continue;
    const entity: OSEntity = {
      id: osId(),
      areaId: 'area-business',
      projectId,
      kind: 'app',
      name: build.name,
      canonicalRef: build.projectUrl || build.deployedUrl,
      externalId: build.id,
      status: build.status === 'deployed' ? 'active' : 'active',
      tags: build.techStack,
      metadata: {
        legacyType: 'buildProject',
        platform: build.platform,
        deployedUrl: build.deployedUrl,
        githubRepo: build.githubRepo,
      },
      createdAt: now,
      updatedAt: now,
    };
    entitiesToAdd.push(entity);
    if (key) entityByCanonical.set(key, entity);
  }

  for (const task of tasks) {
    const sourceRef = `legacy:task:${task.id}`;
    if (workBySourceRef.has(sourceRef)) continue;
    const projectId = task.linkedProject ? ensureProject(task.linkedProject) : undefined;
    const status: OSWorkItem['status'] =
      task.status === 'done' ? 'done' :
      task.status === 'blocked' ? 'blocked' :
      task.status === 'in-progress' ? 'in-progress' :
      task.archived ? 'someday' : 'ready';

    workItemsToAdd.push({
      id: osId(),
      areaId: task.category === 'Private' ? 'area-personal' : 'area-business',
      projectId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status,
      source: 'integration',
      sourceRef,
      nextAction: task.subtasks?.find((s) => !s.done)?.title,
      dueAt: task.dueDate ? `${task.dueDate}T23:59:59` : undefined,
      startedAt: task.status === 'in-progress' ? (task.startDate ? `${task.startDate}T00:00:00` : task.createdAt) : undefined,
      completedAt: task.completedAt,
      tags: task.tags,
      createdAt: task.createdAt.includes('T') ? task.createdAt : `${task.createdAt}T00:00:00`,
      updatedAt: now,
    });
  }

  await osDb.transaction('rw', osDb.projects, osDb.entities, osDb.workItems, async () => {
    if (projectsToAdd.length) await osDb.projects.bulkAdd(projectsToAdd);
    if (entitiesToAdd.length) await osDb.entities.bulkAdd(entitiesToAdd);
    if (workItemsToAdd.length) await osDb.workItems.bulkAdd(workItemsToAdd);
  });

  if (typeof localStorage !== 'undefined') localStorage.setItem(MIGRATION_KEY, '1');
  return { projects: projectsToAdd.length, entities: entitiesToAdd.length, workItems: workItemsToAdd.length };
}
