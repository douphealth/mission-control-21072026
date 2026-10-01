import {
  db,
  genId,
  type BuildProject,
  type FeedSource,
  type GitHubRepo,
  type Idea,
  type LinkItem,
  type SEOAction,
  type SEOIssue,
  type SEOProfile,
  type WatchTerm,
  type Website,
} from "@/lib/db";
import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";
import { GITHUB_REPO_CATALOG } from "@/lib/repoCatalog";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

async function putIfMissing<T extends { id: string }>(
  table: any,
  collection: string,
  exists: () => Promise<boolean>,
  record: Omit<T, "id">,
) {
  if (await exists()) return false;
  const id = genId();
  await table.put({ ...record, id });
  markCloudRecordDirty(collection, id);
  return true;
}


async function ensureGitHubCatalog() {
  const existing = await db.repos.toArray();
  const byUrl = new Map(existing.map((row) => [row.url.toLowerCase(), row]));
  const byName = new Map(existing.map((row) => [row.name.toLowerCase(), row]));
  let changed = false;

  for (const catalog of GITHUB_REPO_CATALOG) {
    const current =
      byUrl.get(catalog.url.toLowerCase()) ?? byName.get(catalog.name.toLowerCase());

    if (!current) {
      const id = genId();
      await db.repos.put({ ...catalog, id });
      markCloudRecordDirty("repos", id);
      changed = true;
      continue;
    }

    const technicalPatch: Partial<GitHubRepo> = {};
    if (current.visibility !== catalog.visibility) technicalPatch.visibility = catalog.visibility;
    if (current.defaultBranch !== catalog.defaultBranch) {
      technicalPatch.defaultBranch = catalog.defaultBranch;
    }
    if (current.repoSizeKb !== catalog.repoSizeKb) technicalPatch.repoSizeKb = catalog.repoSizeKb;

    if (Object.keys(technicalPatch).length) {
      await db.repos.update(current.id, technicalPatch);
      markCloudRecordDirty("repos", current.id);
      changed = true;
    }
  }

  return changed;
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
    const profileExists = await db.seoProfiles.where("websiteId").equals(website.id).first();
    if (!profileExists) {
      const priority = website.priority || "medium";
      const record: Omit<SEOProfile, "id"> = {
        websiteId: website.id,
        priority,
        gscProperty: "",
        bingSiteUrl: website.url,
        ga4Property: "",
        primaryCountry: "",
        targetLanguages: ["en"],
        trackedQueries: [],
        syncStatus: "not-configured",
        notes: "Portfolio profile seeded from verified website inventory. Metrics remain empty until real GSC/Bing/GA4/crawl evidence is imported or connected.",
        createdAt: now(),
        updatedAt: now(),
      };
      const id = genId();
      await db.seoProfiles.put({ ...record, id });
      markCloudRecordDirty("seoProfiles", id);
    }
  }

  const byDomain = new Map(websites.map((w) => [domainOf(w.url), w]));
  const issueSeeds: Array<{ domain: string; issue: Omit<SEOIssue, "id" | "websiteId">; action: Omit<SEOAction, "id" | "websiteId" | "issueId"> }> = [
    {
      domain: "gearuptofit.com",
      issue: {
        title: "Historical indexation collapse requires URL-level recovery",
        category: "indexing",
        severity: "critical",
        status: "in-progress",
        observedAt: "2026-07-17",
        source: "manual",
        evidence: "Portfolio evidence records a severe indexed-URL collapse. Validate current state in GSC before acting; classify historical URLs by live status, canonical/noindex and retained value.",
        expectedMechanism: "Restore crawlable canonical 200 URLs or redirect historically valuable URLs to their closest relevant equivalents; remove sitemap/internal-link waste.",
        rollback: "Keep a redirect/restoration manifest and revert individual routing changes if validation shows loss or mismatch.",
        validation: "Compare GSC indexed pages, impressions/clicks and priority URL inspection after implementation.",
        createdAt: now(),
        updatedAt: now(),
      },
      action: {
        title: "Classify and recover GearUpToFit historical URLs",
        priority: "critical",
        status: "in-progress",
        rationale: "Indexation recovery has higher expected leverage than publishing new URLs.",
        expectedMechanism: "Recover historical search equity and remove crawl/indexation contradictions.",
        rollback: "Maintain per-URL before/after route manifest.",
        validation: "GSC URL Inspection + sitemap coverage + priority query/URL trends.",
        source: "system",
        createdAt: now(),
        updatedAt: now(),
      },
    },
    {
      domain: "affiliatemarketingforsuccess.com",
      issue: {
        title: "Commercial review pages have incomplete monetization coverage",
        category: "content",
        severity: "high",
        status: "open",
        observedAt: "2026-08-24",
        source: "manual",
        evidence: "Portfolio audit identified review URLs without complete tracking/merchant links. Re-verify the current page set before bulk edits.",
        expectedMechanism: "Improve revenue capture on traffic that already exists without expanding thin content.",
        rollback: "Retain previous CTA/link markup per URL.",
        validation: "Affiliate-click event coverage and merchant-link verification on the priority review set.",
        createdAt: now(),
        updatedAt: now(),
      },
      action: {
        title: "Repair AMFS priority review monetization",
        priority: "critical",
        status: "ready",
        rationale: "Existing review pages are closer to revenue than new content.",
        expectedMechanism: "Increase qualified merchant clicks from existing organic demand.",
        rollback: "Restore previous CTA/link markup.",
        validation: "GA4 affiliate_click plus tracked merchant link presence.",
        source: "system",
        createdAt: now(),
        updatedAt: now(),
      },
    },
    {
      domain: "openclaw-skillshub.com",
      issue: {
        title: "Canonical deployment ambiguity needs consolidation",
        category: "canonical",
        severity: "medium",
        status: "open",
        observedAt: today(),
        source: "manual",
        evidence: "Portfolio mapping contains the public domain plus deployment variants. Confirm canonical host and remove contradictory signals.",
        expectedMechanism: "Concentrate crawl/indexation signals on one public host.",
        rollback: "Retain deployment mapping and revert canonical/redirect changes individually.",
        validation: "Canonical tags, redirects, sitemap URLs and search-engine inspection agree on one host.",
        createdAt: now(),
        updatedAt: now(),
      },
      action: {
        title: "Consolidate OpenClaw Skills Hub canonical signals",
        priority: "medium",
        status: "ready",
        rationale: "Duplicate deployment identities can dilute crawl and indexing signals.",
        expectedMechanism: "One canonical public URL per resource.",
        rollback: "Revert host redirects/canonical changes from the route manifest.",
        validation: "Inspect canonical, redirects and indexed URL set after recrawl.",
        source: "system",
        createdAt: now(),
        updatedAt: now(),
      },
    },
  ];

  for (const seed of issueSeeds) {
    const website = byDomain.get(seed.domain);
    if (!website) continue;
    const existing = await db.seoIssues.where("websiteId").equals(website.id).filter((row) => row.title === seed.issue.title).first();
    if (existing) continue;
    const issueId = genId();
    await db.seoIssues.put({ ...seed.issue, id: issueId, websiteId: website.id });
    markCloudRecordDirty("seoIssues", issueId);
    const actionId = genId();
    await db.seoActions.put({ ...seed.action, id: actionId, websiteId: website.id, issueId });
    markCloudRecordDirty("seoActions", actionId);
  }
}

export async function ensureWorkspaceBootstrap() {
  let changed = await ensureGitHubCatalog();

  for (const app of APP_FUNNEL_CATALOG) {
    changed =
      (await putIfMissing<BuildProject>(
        db.buildProjects,
        "buildProjects",
        async () => Boolean(await db.buildProjects.filter((row) => row.githubRepo.toLowerCase() === app.githubRepo.toLowerCase()).first()),
        app,
      )) || changed;
  }

  for (const build of INTERNAL_BUILDS) {
    changed =
      (await putIfMissing<BuildProject>(
        db.buildProjects,
        "buildProjects",
        async () => Boolean(await db.buildProjects.filter((row) => row.githubRepo.toLowerCase() === build.githubRepo.toLowerCase()).first()),
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
      )) || changed;
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
    changed =
      (await putIfMissing<WatchTerm>(
        db.watchTerms,
        "watchTerms",
        async () => Boolean(await db.watchTerms.filter((row) => row.term.toLowerCase() === term.toLowerCase()).first()),
        record,
      )) || changed;
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
