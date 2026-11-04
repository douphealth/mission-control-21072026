import {
  db,
  type BuildProject,
  type FeedSource,
  type GitHubRepo,
  type Idea,
  type LinkItem,
  type SEOProfile,
  type SyncHealth,
  type WatchTerm,
  type Website,
} from "@/lib/db";
import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";
import { GITHUB_REPO_CATALOG } from "@/lib/repoCatalog";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { ensureSeededWatchTerm } from "@/lib/watchTerms";
import { stableBootstrapId } from "@/lib/bootstrapIdentity";
import { seedPreferenceId } from "@/lib/bootstrapPreferences";
import { canonicalWebUrl } from "@/lib/intelligenceQuality";

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

/**
 * Stable identity for a seeded build project: its repository when it has one,
 * otherwise its deployed URL, otherwise its name. Repository-backed seeds keep
 * the exact identity (and therefore the exact record id) they always had.
 */
export function buildIdentity(build: {
  githubRepo?: string;
  deployedUrl?: string;
  projectUrl?: string;
  name?: string;
}): string {
  return (
    [build.githubRepo, build.deployedUrl, build.projectUrl, build.name]
      .map((value) => (value || "").trim())
      .find(Boolean) || ""
  );
}
/** Does a stored build already represent this seed? Uses the same identity ladder. */
export function isSameBuild(
  row: { githubRepo?: string; deployedUrl?: string; name?: string },
  seed: { githubRepo?: string; deployedUrl?: string; name?: string },
): boolean {
  const norm = (value?: string) => (value || "").trim().toLowerCase();
  if (norm(seed.githubRepo)) return norm(row.githubRepo) === norm(seed.githubRepo);
  if (norm(seed.deployedUrl)) return norm(row.deployedUrl) === norm(seed.deployedUrl);
  return norm(row.name) === norm(seed.name);
}

async function putIfMissing<T extends { id: string }>(
  table: any,
  collection: string,
  exists: () => Promise<boolean>,
  record: Omit<T, "id">,
  preferenceId?: string,
) {
  const values = record as Record<string, unknown>;
  const identity =
    collection === "buildProjects"
      ? buildIdentity(values as Parameters<typeof buildIdentity>[0])
      : collection === "ideas"
        ? values.title
        : values.url;
  // A seed with no identity can never be recognised again, so it is not created.
  // It must also never abort the stages after it (feeds, watch rules, SEO profiles).
  if (typeof identity !== "string" || !identity.trim()) {
    console.warn(`Skipped a starter record without an identity (${collection})`);
    return false;
  }
  const id = await stableBootstrapId(`seed-${collection}`, identity.trim().toLowerCase());
  const created = await db.transaction("rw", table, db.settings, async () => {
    if (preferenceId && (await db.settings.get(preferenceId))?.bootstrapSeedPreference?.dismissed) return false;
    if (await exists() || await table.get(id)) return false;
    await table.add({ ...record, id });
    return true;
  });
  if (created) markCloudRecordDirty(collection, id);
  return created;
}


async function ensureGitHubCatalog() {
  const seeds = await Promise.all(GITHUB_REPO_CATALOG.map(async catalog => ({
    catalog, id: await stableBootstrapId("seed-repos", catalog.url.toLowerCase()),
  })));
  const changedIds = await db.transaction("rw", db.repos, async () => {
    const existing = await db.repos.toArray();
    const byUrl = new Map(existing.map(row => [row.url.toLowerCase(), row]));
    const byName = new Map(existing.map(row => [row.name.toLowerCase(), row]));
    const changed: string[] = [];
    for (const { catalog, id } of seeds) {
      const current = byUrl.get(catalog.url.toLowerCase()) ?? byName.get(catalog.name.toLowerCase()) ?? await db.repos.get(id);
      if (!current) {
        const record = { ...catalog, id };
        await db.repos.add(record);
        byUrl.set(record.url.toLowerCase(), record); byName.set(record.name.toLowerCase(), record);
        changed.push(id);
        continue;
      }
      // Bootstrap may fill missing catalog metadata; it must not overwrite live/user values.
      const patch: Partial<GitHubRepo> = {};
      if (current.visibility == null && catalog.visibility != null) patch.visibility = catalog.visibility;
      if (current.defaultBranch == null && catalog.defaultBranch != null) patch.defaultBranch = catalog.defaultBranch;
      if (current.repoSizeKb == null && catalog.repoSizeKb != null) patch.repoSizeKb = catalog.repoSizeKb;
      if (Object.keys(patch).length) { await db.repos.update(current.id, patch); changed.push(current.id); }
    }
    return changed;
  });
  changedIds.forEach(id => markCloudRecordDirty("repos", id));
  return changedIds.length > 0;
}

const INTERNAL_BUILDS: Array<Omit<BuildProject, "id">> = [
  {
    name: "Mission Control",
    productName: "Mission Control Productivity OS",
    platform: "other",
    projectUrl: "https://github.com/douphealth/mission-control-21072026",
    deployedUrl: "https://mission-control-21072026.pages.dev/",
    description: "Primary operating system for websites, tasks, revenue assets, integrations and portfolio control.",
    techStack: ["React", "TypeScript", "Dexie", "Cloudflare Pages"],
    status: "deployed",
    startedDate: "",
    lastWorkedOn: today(),
    nextSteps: "Keep mobile navigation, connector truth states, persistence and portfolio data continuously validated.",
    githubRepo: "https://github.com/douphealth/mission-control-21072026",
    priority: "critical",
    importance: 100,
    portfolioGroup: "internal",
  },
  {
    name: "GrowthScribe OS",
    productName: "GrowthScribe OS",
    platform: "other",
    projectUrl: "https://github.com/douphealth/growthscribe-os",
    deployedUrl: "",
    description: "SEO/GEO/AEO growth automation and website operations system.",
    techStack: [],
    status: "testing",
    startedDate: "",
    lastWorkedOn: "",
    nextSteps: "Verify current data connections, keep write actions guarded, and consolidate the active growth workflow.",
    githubRepo: "https://github.com/douphealth/growthscribe-os",
    priority: "high",
    importance: 88,
    portfolioGroup: "internal",
  },
  {
    name: "Hermes Control Plane",
    productName: "Alexios Hermes Control Plane",
    platform: "other",
    projectUrl: "https://github.com/douphealth/alexios-hermes-control-plane",
    deployedUrl: "",
    description: "Control-plane repository for Hermes automation infrastructure.",
    techStack: [],
    status: "testing",
    startedDate: "",
    lastWorkedOn: "",
    nextSteps: "Keep bot/model routing, credentials and destructive write paths observable and reversible.",
    githubRepo: "https://github.com/douphealth/alexios-hermes-control-plane",
    priority: "high",
    importance: 86,
    portfolioGroup: "internal",
  },
  {
    name: "AI SEO Orchestrator",
    productName: "AI SEO Orchestrator",
    platform: "other",
    projectUrl: "https://github.com/douphealth/ai-seo-orchestrator-001",
    deployedUrl: "",
    description: "Repository for evidence-led SEO orchestration and surgical optimization workflows.",
    techStack: [],
    status: "testing",
    startedDate: "",
    lastWorkedOn: "",
    nextSteps: "Connect verified GSC, Bing, GA4 and crawl evidence before allowing write actions.",
    githubRepo: "https://github.com/douphealth/ai-seo-orchestrator-001",
    priority: "high",
    importance: 84,
    portfolioGroup: "internal",
  },
];

const LINKS: Array<Omit<LinkItem, "id">> = [
  {
    title: "Google Search Console",
    url: "https://search.google.com/search-console",
    category: "SEO",
    status: "active",
    description: "First-party Google search performance and indexation evidence.",
    dateAdded: today(),
    pinned: true,
    tags: ["verified-service", "seo", "gsc"],
  },
  {
    title: "Bing Webmaster Tools",
    url: "https://www.bing.com/webmasters",
    category: "SEO",
    status: "active",
    description: "First-party Bing search performance and crawl/indexation evidence.",
    dateAdded: today(),
    pinned: true,
    tags: ["verified-service", "seo", "bing"],
  },
  {
    title: "Google Analytics",
    url: "https://analytics.google.com/",
    category: "Analytics",
    status: "active",
    description: "First-party analytics workspace for traffic and conversion measurement.",
    dateAdded: today(),
    pinned: true,
    tags: ["verified-service", "analytics", "ga4"],
  },
  {
    title: "Cloudflare Dashboard",
    url: "https://dash.cloudflare.com/",
    category: "Hosting",
    status: "active",
    description: "DNS, Pages, Workers, security and CDN operations.",
    dateAdded: today(),
    pinned: true,
    tags: ["verified-service", "cloudflare"],
  },
  {
    title: "GitHub Portfolio",
    url: "https://github.com/douphealth",
    category: "Development",
    status: "active",
    description: "Canonical repository account used by Mission Control.",
    dateAdded: today(),
    pinned: true,
    tags: ["verified-service", "github"],
  },
  {
    title: "WordPress REST API",
    url: "https://developer.wordpress.org/rest-api/",
    category: "Documentation",
    status: "active",
    description: "Official WordPress REST API reference used by the remote WordPress control surface.",
    dateAdded: today(),
    pinned: false,
    tags: ["official-docs", "wordpress"],
  },
];

const FEED_SOURCES: Array<Omit<FeedSource, "id">> = [
  {
    name: "Google Search Central",
    url: "https://developers.google.com/search/blog",
    topics: ["Google Search", "ranking", "indexing", "spam", "structured data"],
    enabled: true,
    createdAt: now(),
  },
  {
    name: "GitHub Changelog",
    url: "https://github.blog/changelog/",
    topics: ["GitHub", "Actions", "security", "Copilot"],
    enabled: true,
    createdAt: now(),
  },
  {
    name: "Cloudflare Blog",
    url: "https://blog.cloudflare.com/",
    topics: ["Cloudflare", "Workers", "Pages", "security"],
    enabled: true,
    createdAt: now(),
  },
];

const IDEAS: Array<Omit<Idea, "id">> = [
  {
    title: "First-party SEO connector layer",
    description: "Add secure server-side GSC, Bing and GA4 ingestion so Portfolio SEO can move from verified manual imports to scheduled first-party evidence.",
    category: "Mission Control",
    priority: "high",
    status: "validated",
    tags: ["mission-control", "seo", "connectors", "evidence"],
    linkedProject: "mission-control-21072026",
    votes: 1,
    createdAt: today(),
    updatedAt: today(),
  },
  {
    title: "Unified revenue attribution",
    description: "Join app starts/completions, affiliate outbound clicks and paid conversions back to parent website and landing page.",
    category: "Revenue",
    priority: "high",
    status: "validated",
    tags: ["analytics", "revenue", "apps", "attribution"],
    linkedProject: "Mission Control",
    votes: 1,
    createdAt: today(),
    updatedAt: today(),
  },
  {
    title: "Portfolio evidence freshness SLA",
    description: "Surface stale GSC/Bing/GA4/crawl/AI evidence automatically and prevent stale observations from driving current priorities.",
    category: "Operations",
    priority: "high",
    status: "exploring",
    tags: ["seo", "freshness", "reliability"],
    linkedProject: "Mission Control",
    votes: 1,
    createdAt: today(),
    updatedAt: today(),
  },
];

const SYNC_HEALTH_SEEDS: Array<SyncHealth> = [
  {
    id: "cloud",
    label: "Cloud backup",
    status: "not-configured",
    detail: "Private Mission Control cloud backup/sync status.",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    status: "not-configured",
    detail: "Calendar and Google Tasks connection status.",
  },
  {
    id: "wordpress",
    label: "WordPress",
    status: "not-configured",
    detail: "Authenticated WordPress REST management status.",
  },
  {
    id: "gsc",
    label: "Google Search Console",
    status: "not-configured",
    detail: "First-party Google search/indexation evidence.",
  },
  {
    id: "ga4",
    label: "Google Analytics",
    status: "not-configured",
    detail: "First-party traffic and conversion evidence.",
  },
  {
    id: "bing",
    label: "Bing Webmaster Tools",
    status: "not-configured",
    detail: "Bing crawl, indexation and search evidence.",
  },
  {
    id: "feeds",
    label: "Industry feeds",
    status: "not-configured",
    detail: "Trend/news source refresh status.",
  },
  {
    id: "mentions",
    label: "Brand Mentions",
    status: "not-configured",
    detail: "Identity-filtered brand/name/domain mention collector status.",
  },
  {
    id: "audience",
    label: "Audience sources",
    status: "not-configured",
    detail: "Social audience observation status.",
  },
];

const WATCH_DOMAINS = [
  "gearuptofit.com",
  "affiliatemarketingforsuccess.com",
  "plantastichaven.com",
  "mysticaldigits.com",
  "frenchyfab.com",
  "micegoneguide.com",
  "gearuptogrow.com",
  "efficientgptprompts.com",
  "openclaw-skillshub.com",
  "imagealchemy.app",
];

async function ensureSeoControlData(websites: Website[]) {
  for (const website of websites) {
    const id = await stableBootstrapId("seed-seo-profile", website.id);
    const created = await db.transaction("rw", db.seoProfiles, async () => {
      if (await db.seoProfiles.where("websiteId").equals(website.id).first() || await db.seoProfiles.get(id)) return false;
      const record: SEOProfile = {
        id, websiteId: website.id, priority: website.priority || "medium",
        gscProperty: "", bingSiteUrl: website.url, ga4Property: "", primaryCountry: "",
        targetLanguages: ["en"], trackedQueries: [], syncStatus: "not-configured",
        notes: "Portfolio profile seeded from verified website inventory. Metrics remain empty until real GSC/Bing/GA4/crawl evidence is imported or connected.",
        createdAt: now(), updatedAt: now(),
      };
      await db.seoProfiles.add(record);
      return true;
    });
    if (created) markCloudRecordDirty("seoProfiles", id);
  }

  // Historical portfolio audits are useful context, but they are not live facts.
  // Older builds seeded these records as active issues/actions, which polluted
  // Today and the Portfolio SEO counts. Retire those exact bootstrap records
  // without deleting them so the audit context remains available.
  const legacyIssueTitles = new Set([
    "Historical indexation collapse requires URL-level recovery",
    "Commercial review pages have incomplete monetization coverage",
    "Canonical deployment ambiguity needs consolidation",
  ]);
  const legacyActionTitles = new Set([
    "Classify and recover GearUpToFit historical URLs",
    "Repair AMFS priority review monetization",
    "Consolidate OpenClaw Skills Hub canonical signals",
  ]);

  const legacyIssues = (await db.seoIssues.toArray()).filter(
    (issue) =>
      legacyIssueTitles.has(issue.title) &&
      issue.source === "manual" &&
      (issue.status === "open" || issue.status === "in-progress"),
  );
  for (const issue of legacyIssues) {
    await db.seoIssues.update(issue.id, {
      status: "ignored",
      updatedAt: now(),
    });
    markCloudRecordDirty("seoIssues", issue.id);
  }

  const legacyActions = (await db.seoActions.toArray()).filter(
    (action) =>
      legacyActionTitles.has(action.title) &&
      action.source === "system" &&
      action.status !== "done" &&
      action.status !== "cancelled",
  );
  for (const action of legacyActions) {
    await db.seoActions.update(action.id, {
      status: "cancelled",
      updatedAt: now(),
    });
    markCloudRecordDirty("seoActions", action.id);
  }
}

export async function ensureWorkspaceBootstrap() {
  let changed = await ensureGitHubCatalog();

  for (const app of APP_FUNNEL_CATALOG) {
    changed =
      (await putIfMissing<BuildProject>(
        db.buildProjects,
        "buildProjects",
        async () => Boolean(await db.buildProjects.filter((row) => isSameBuild(row, app)).first()),
        app,
      )) || changed;
  }

  for (const build of INTERNAL_BUILDS) {
    changed =
      (await putIfMissing<BuildProject>(
        db.buildProjects,
        "buildProjects",
        async () => Boolean(await db.buildProjects.filter((row) => isSameBuild(row, build)).first()),
        build,
      )) || changed;
  }

  for (const link of LINKS) {
    changed =
      (await putIfMissing<LinkItem>(
        db.links,
        "links",
        async () =>
          Boolean(
            await db.links
              .filter((row) => row.url.toLowerCase() === link.url.toLowerCase())
              .first(),
          ),
        link,
      )) || changed;
  }

  const portfolioWebsites = await db.websites.toArray();
  for (const website of portfolioWebsites) {
    const verifiedLinks: Array<Omit<LinkItem, "id">> = [
      {
        title: website.name,
        url: website.url,
        category: "Websites",
        status: "active",
        description: website.primaryGoal || website.niche || website.notes || "Portfolio website",
        dateAdded: today(),
        pinned: website.priority === "critical",
        favicon: website.favicon,
        tags: ["portfolio", "production", ...(website.tags || [])],
      },
      ...(website.appUrls || []).map((url) => ({
        title: website.name + " · " + domainOf(url),
        url,
        category: "Apps",
        status: "active" as const,
        description: "Production app/funnel connected to " + website.name,
        dateAdded: today(),
        pinned: website.priority === "critical",
        tags: ["portfolio", "app", "production"],
      })),
    ];

    for (const link of verifiedLinks) {
      changed =
        (await putIfMissing<LinkItem>(
          db.links,
          "links",
          async () =>
            Boolean(
              await db.links
                .filter((row) => row.url.toLowerCase() === link.url.toLowerCase())
                .first(),
            ),
          link,
        )) || changed;
    }
  }

  for (const feed of FEED_SOURCES) {
    changed =
      (await putIfMissing<FeedSource>(
        db.feedSources,
        "feedSources",
        async () => Boolean(await db.feedSources.filter((row) => row.url.toLowerCase() === feed.url.toLowerCase()).first()),
        feed,
        await seedPreferenceId("feedSources", canonicalWebUrl(feed.url)),
      )) || changed;
  }

  for (const health of SYNC_HEALTH_SEEDS) {
    const created = await db.transaction("rw", db.syncHealth, async () => {
      if (await db.syncHealth.get(health.id)) return false;
      await db.syncHealth.add(health);
      return true;
    });
    if (created) {
      markCloudRecordDirty("syncHealth", health.id);
      changed = true;
    }
  }

  for (const term of WATCH_DOMAINS) {
    const record: Omit<WatchTerm, "id"> = {
      term,
      type: "domain",
      anchors: [],
      negatives: [],
      enabled: true,
      createdAt: now(),
    };
    changed = (await ensureSeededWatchTerm(record)) || changed;
  }

  for (const idea of IDEAS) {
    changed =
      (await putIfMissing<Idea>(
        db.ideas,
        "ideas",
        async () => Boolean(await db.ideas.filter((row) => row.title === idea.title).first()),
        idea,
      )) || changed;
  }

  await ensureSeoControlData(await db.websites.toArray());

  if (changed) queueCloudPush();
}
