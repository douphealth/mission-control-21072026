import { db, genId, type Task, type Website } from "@/lib/db";
import { markCloudRecordDirty } from "@/lib/cloudSync";

type WebsiteSeed = Omit<Website, "id"> & { slug: string };
type TaskSeed = Omit<Task, "id" | "createdAt" | "subtasks"> & { key: string; subtasks?: Task["subtasks"] };

const today = () => new Date().toISOString().slice(0, 10);

export const WEBSITE_PORTFOLIO: WebsiteSeed[] = [
  {
    slug: "gearuptofit",
    name: "GearUpToFit",
    url: "https://gearuptofit.com/",
    wpAdminUrl: "https://gearuptofit.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "Fitness & Running",
    status: "active",
    notes: "Primary recovery and revenue site. Current focus: crawl/indexation recovery, historical URL equity, high-impression commercial pages, and app-led funnels.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://gearuptofit.com/favicon.ico",
    tags: ["wordpress", "seo-recovery", "affiliate", "apps", "priority-critical"],
    priority: "critical",
    importance: 100,
    niche: "Fitness, running, shoes, smartwatches and supplements",
    primaryGoal: "Recover organic visibility and convert high-intent traffic into affiliate and app revenue.",
    revenueModel: "Affiliate commerce + app funnels",
    appUrls: [
      "https://shoe-match.gearuptofit.com/",
      "https://fitness-plan.gearuptofit.com/",
      "https://gearuptofit.com/watch-match/",
      "https://gearuptofit.com/supplement-match/"
    ],
    githubRepos: [
      "https://github.com/douphealth/runmatch-ai-buddy-1282c193",
      "https://github.com/douphealth/body-recomp-os-guru-7c1356da",
      "https://github.com/douphealth/wrist-wonderland-hub-460cce97",
      "https://github.com/douphealth/nutri-match-wiz-1eb55346"
    ]
  },
  {
    slug: "affiliate-marketing-for-success",
    name: "Affiliate Marketing for Success",
    url: "https://affiliatemarketingforsuccess.com/",
    wpAdminUrl: "https://affiliatemarketingforsuccess.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "Affiliate Marketing",
    status: "active",
    notes: "Large content site with strong internal topic hubs. Main gaps are monetization coverage on review pages and surgical improvement of priority URLs.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://affiliatemarketingforsuccess.com/favicon.ico",
    tags: ["wordpress", "affiliate", "seo", "ai-visibility"],
    priority: "critical",
    importance: 96,
    niche: "Affiliate marketing, SEO, AI search visibility and tools",
    primaryGoal: "Increase qualified organic traffic and repair monetization on commercially valuable pages.",
    revenueModel: "Affiliate commissions",
    appUrls: [],
    githubRepos: []
  },
  {
    slug: "plantastic-haven",
    name: "Plantastic Haven",
    url: "https://plantastichaven.com/",
    wpAdminUrl: "https://plantastichaven.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "Plant Care",
    status: "active",
    notes: "Plant-care publisher with several strong query opportunities and a Pro Care app funnel.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://plantastichaven.com/favicon.ico",
    tags: ["wordpress", "content", "seo", "app-funnel"],
    priority: "high",
    importance: 89,
    niche: "Houseplants and plant care",
    primaryGoal: "Grow topical authority and convert high-intent plant-care traffic into the Pro Care funnel.",
    revenueModel: "Content monetization + app funnel",
    appUrls: ["https://procare.plantastichaven.com/"],
    githubRepos: ["https://github.com/douphealth/plantastic-haven-pro-8e23ae56"]
  },
  {
    slug: "mystical-digits",
    name: "Mystical Digits",
    url: "https://mysticaldigits.com/",
    wpAdminUrl: "https://mysticaldigits.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "Numerology",
    status: "active",
    notes: "Numerology publisher with the Mystical Blueprint app as the main product funnel.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://mysticaldigits.com/favicon.ico",
    tags: ["wordpress", "numerology", "app-funnel"],
    priority: "high",
    importance: 88,
    niche: "Numerology and personalized spiritual content",
    primaryGoal: "Route high-intent numerology traffic into personalized blueprint conversion paths.",
    revenueModel: "Content + digital product/app",
    appUrls: ["https://blueprint.mysticaldigits.com/"],
    githubRepos: ["https://github.com/douphealth/mystic-blueprint-maker"]
  },
  {
    slug: "frenchyfab",
    name: "FrenchyFab",
    url: "https://frenchyfab.com/",
    wpAdminUrl: "https://frenchyfab.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "French Bulldog",
    status: "active",
    notes: "French Bulldog content site. Current priorities include trust pages, reliable WordPress access, and the Frenchie Care Plan funnel.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://frenchyfab.com/favicon.ico",
    tags: ["wordpress", "pets", "trust", "app-funnel"],
    priority: "high",
    importance: 91,
    niche: "French Bulldog care, health and ownership",
    primaryGoal: "Strengthen trust, organic visibility and conversion into the care-plan app.",
    revenueModel: "Content monetization + app funnel",
    appUrls: ["https://care-plan.frenchyfab.com/"],
    githubRepos: ["https://github.com/douphealth/frenchie-care-compass"]
  },
  {
    slug: "mice-gone-guide",
    name: "Mice Gone Guide",
    url: "https://micegoneguide.com/",
    wpAdminUrl: "https://micegoneguide.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "Pest Control",
    status: "active",
    notes: "Pest-control publisher connected to the Mice Elimination application.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://micegoneguide.com/favicon.ico",
    tags: ["wordpress", "pest-control", "app-funnel"],
    priority: "high",
    importance: 86,
    niche: "Mouse control and home pest prevention",
    primaryGoal: "Capture urgent pest-search demand and convert it into the elimination workflow.",
    revenueModel: "Content + premium app",
    appUrls: ["https://elimination.micegoneguide.com/"],
    githubRepos: ["https://github.com/douphealth/mice-solver-pro"]
  },
  {
    slug: "gear-up-to-grow",
    name: "GearUpToGrow",
    url: "https://gearuptogrow.com/",
    wpAdminUrl: "https://gearuptogrow.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "Cloudflare",
    hostingLoginUrl: "https://dash.cloudflare.com/",
    hostingUsername: "",
    hostingPassword: "",
    category: "Growth",
    status: "active",
    notes: "WordPress site behind Cloudflare, connected to the Grow Plan application.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://gearuptogrow.com/favicon.ico",
    tags: ["wordpress", "growth", "cloudflare", "app-funnel"],
    priority: "high",
    importance: 82,
    niche: "Growth, productivity and business systems",
    primaryGoal: "Establish the strongest site-to-app funnel and validate measurable demand.",
    revenueModel: "Content + app funnel",
    appUrls: ["https://grow-plan.gearuptogrow.com/"],
    githubRepos: ["https://github.com/douphealth/grow-stack-engine-945df4aa"]
  },
  {
    slug: "efficient-gpt-prompts",
    name: "Efficient GPT Prompts",
    url: "https://efficientgptprompts.com/",
    wpAdminUrl: "https://efficientgptprompts.com/wp-admin/",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "AI & Prompts",
    status: "active",
    notes: "AI/prompt publisher with PromptGrade as the main interactive tool and lead product.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://efficientgptprompts.com/favicon.ico",
    tags: ["wordpress", "ai", "prompts", "tool-funnel"],
    priority: "high",
    importance: 90,
    niche: "AI prompting, prompt engineering and optimization",
    primaryGoal: "Turn high-intent prompt traffic into PromptGrade usage and monetization.",
    revenueModel: "Content + tool funnel",
    appUrls: ["https://promptgrade.efficientgptprompts.com/"],
    githubRepos: ["https://github.com/douphealth/neural-prompt-coach"]
  },
  {
    slug: "openclaw-skills-hub",
    name: "OpenClaw Skills Hub",
    url: "https://openclaw-skillshub.com/",
    wpAdminUrl: "",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "Cloudflare",
    hostingLoginUrl: "https://dash.cloudflare.com/",
    hostingUsername: "",
    hostingPassword: "",
    category: "Developer Tools",
    status: "active",
    notes: "OpenClaw skills discovery hub. Treat as a growth property even though it is not a WordPress site.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://openclaw-skillshub.com/favicon.ico",
    tags: ["developer-tools", "cloudflare", "seo"],
    priority: "medium",
    importance: 75,
    niche: "OpenClaw skills and agent tooling",
    primaryGoal: "Improve canonical consistency, indexation and useful skills discovery.",
    revenueModel: "Audience + tool ecosystem",
    appUrls: [],
    githubRepos: ["https://github.com/douphealth/claw-skills-hub"]
  },
  {
    slug: "imagealchemy",
    name: "ImageAlchemy",
    url: "https://imagealchemy.app/",
    wpAdminUrl: "",
    wpUsername: "",
    wpPassword: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    hostingUsername: "",
    hostingPassword: "",
    category: "AI Image Tool",
    status: "active",
    notes: "Standalone image-generation/form-beautification product.",
    plugins: [],
    dateAdded: today(),
    lastUpdated: today(),
    favicon: "https://imagealchemy.app/favicon.ico",
    tags: ["ai", "image-tool", "product"],
    priority: "medium",
    importance: 77,
    niche: "AI-assisted image and form beautification",
    primaryGoal: "Validate the production conversion path, pricing, analytics and canonical positioning.",
    revenueModel: "Software product",
    appUrls: ["https://imagealchemy.app/"],
    githubRepos: ["https://github.com/douphealth/form-beauty-studio"]
  }
];

export const PRIORITY_TASKS: TaskSeed[] = [
  { key: "gutf-indexation", title: "Recover GearUpToFit indexation and historical URL equity", priority: "critical", status: "in-progress", dueDate: "", category: "SEO Recovery", description: "Use the historical export to classify 200/301/404/soft-404/canonical/noindex URLs, restore or redirect valuable URLs, clean the sitemap and resubmit priority canonical pages.", linkedProject: "gearuptofit.com", tags: ["gearuptofit", "indexation", "recovery"], estimateMin: 240 },
  { key: "gutf-commercial", title: "Surgically improve GearUpToFit priority commercial pages", priority: "critical", status: "todo", dueDate: "", category: "Content Revenue", description: "Prioritize pages already showing impressions/rankings: running shoes, smartwatches, HOKA Clifton 10, wide feet, comfort, supplements and related commercial hubs.", linkedProject: "gearuptofit.com", tags: ["gearuptofit", "commercial", "seo"], estimateMin: 180 },
  { key: "gutf-funnels", title: "Measure GearUpToFit app funnels end to end", priority: "critical", status: "todo", dueDate: "", category: "Revenue", description: "Track quiz starts, completions, outbound clicks and revenue for Shoe Match, Fitness Plan, Watch Match and Supplement Match.", linkedProject: "gearuptofit.com", tags: ["gearuptofit", "apps", "analytics"], estimateMin: 120 },

  { key: "amfs-monetization", title: "Repair monetization across AMFS review pages", priority: "critical", status: "todo", dueDate: "", category: "Revenue", description: "Fix missing merchant/tracking links on review pages, preserve rel=sponsored, and prioritize above-intro commercial CTAs.", linkedProject: "affiliatemarketingforsuccess.com", tags: ["amfs", "affiliate", "revenue"], estimateMin: 180 },
  { key: "amfs-primary-urls", title: "Work the AMFS PRIMARY URL queue before new content", priority: "high", status: "todo", dueDate: "", category: "SEO", description: "Improve the highest-value existing URLs first, using GSC/Bing/GA4 evidence and avoiding broad simultaneous rewrites.", linkedProject: "affiliatemarketingforsuccess.com", tags: ["amfs", "seo", "content-repair"], estimateMin: 180 },

  { key: "plantastic-opportunities", title: "Optimize Plantastic Haven's strongest existing query opportunities", priority: "high", status: "todo", dueDate: "", category: "SEO", description: "Prioritize purple spider plant, spider plant vs dracaena, philodendron soil mix, low-light houseplants, then improve the About/trust layer.", linkedProject: "plantastichaven.com", tags: ["plantastic", "seo"], estimateMin: 150 },
  { key: "plantastic-funnel", title: "Connect Plantastic Haven high-intent pages to Pro Care", priority: "high", status: "todo", dueDate: "", category: "Revenue", description: "Place contextually relevant Pro Care CTAs on high-intent plant-care pages and measure conversion from organic traffic.", linkedProject: "plantastichaven.com", tags: ["plantastic", "app", "conversion"], estimateMin: 90 },

  { key: "mystical-funnel", title: "Strengthen Mystical Digits → Mystical Blueprint funnel", priority: "high", status: "todo", dueDate: "", category: "Revenue", description: "Route high-intent numerology content, including 11:11-related traffic, into blueprint.mysticaldigits.com and measure conversion.", linkedProject: "mysticaldigits.com", tags: ["mysticaldigits", "app", "conversion"], estimateMin: 90 },

  { key: "frenchy-trust", title: "Finish FrenchyFab trust and editorial pages", priority: "high", status: "todo", dueDate: "", category: "Trust", description: "Publish or validate Editorial Policy, Review Methodology, Affiliate Disclosure and Contact pages with consistent E-E-A-T signals.", linkedProject: "frenchyfab.com", tags: ["frenchyfab", "eeat", "trust"], estimateMin: 120 },
  { key: "frenchy-wp-auth", title: "Fix reliable FrenchyFab WordPress write access", priority: "high", status: "blocked", dueDate: "", category: "Operations", description: "Resolve the WordPress REST 401 issue using the credentials-file workflow and verify a safe non-destructive write before automation resumes.", linkedProject: "frenchyfab.com", tags: ["frenchyfab", "wordpress", "auth"], estimateMin: 60 },
  { key: "frenchy-funnel", title: "Verify Frenchie Care Plan conversion flow", priority: "high", status: "todo", dueDate: "", category: "Revenue", description: "Validate care-plan.frenchyfab.com end to end, including paid path, analytics and contextual placement on high-intent pages.", linkedProject: "frenchyfab.com", tags: ["frenchyfab", "app", "conversion"], estimateMin: 90 },

  { key: "mice-dependency", title: "Remove fragile persistence dependency from Mice Solver Pro", priority: "high", status: "todo", dueDate: "", category: "Product", description: "Replace the frozen/fragile database dependency, preserve user state safely, and re-test the free and premium flows.", linkedProject: "micegoneguide.com", tags: ["micegoneguide", "app", "reliability"], estimateMin: 120 },
  { key: "mice-funnel", title: "Integrate Mice Solver Pro into urgent-intent pages", priority: "high", status: "todo", dueDate: "", category: "Revenue", description: "Link the elimination app from the site's strongest mouse-control pages and measure premium conversion.", linkedProject: "micegoneguide.com", tags: ["micegoneguide", "app", "conversion"], estimateMin: 90 },

  { key: "grow-funnel", title: "Validate GearUpToGrow's highest-value site-to-app funnel", priority: "high", status: "todo", dueDate: "", category: "Growth", description: "Confirm canonical production app routing, analytics and the single strongest conversion path from the WordPress site.", linkedProject: "gearuptogrow.com", tags: ["gearuptogrow", "funnel"], estimateMin: 90 },

  { key: "efficient-funnel", title: "Connect Efficient GPT Prompts to PromptGrade", priority: "high", status: "todo", dueDate: "", category: "Revenue", description: "Link the highest-intent prompt content to PromptGrade, track analyses/completions, and surface the tool as the primary conversion action.", linkedProject: "efficientgptprompts.com", tags: ["efficientgptprompts", "promptgrade", "conversion"], estimateMin: 90 },

  { key: "openclaw-canonical", title: "Consolidate OpenClaw Skills Hub canonical/indexation signals", priority: "medium", status: "todo", dueDate: "", category: "SEO", description: "Confirm the canonical public domain, eliminate duplicate deployment ambiguity, and strengthen crawlable skills architecture.", linkedProject: "openclaw-skillshub.com", tags: ["openclaw", "seo", "indexation"], estimateMin: 90 },

  { key: "imagealchemy-product", title: "Validate ImageAlchemy production monetization path", priority: "medium", status: "todo", dueDate: "", category: "Product", description: "Confirm canonical repo/domain alignment, pricing, analytics and the full production conversion path.", linkedProject: "imagealchemy.app", tags: ["imagealchemy", "product", "conversion"], estimateMin: 90 },

  { key: "portfolio-measurement", title: "Connect GSC, Bing and GA4 evidence to every priority website", priority: "critical", status: "todo", dueDate: "", category: "Measurement", description: "Make Mission Control the evidence source for priorities: GSC/Bing/GA4 first, then crawl/indexation, AI visibility and revenue actions.", linkedProject: "Mission Control", tags: ["portfolio", "measurement", "seo"], estimateMin: 180 }
];

function domainKey(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

export async function ensurePortfolioBootstrap() {
  const websites = await db.websites.toArray();
  const byDomain = new Map(websites.map((site) => [domainKey(site.url), site]));

  for (const seed of WEBSITE_PORTFOLIO) {
    const { slug: _slug, ...record } = seed;
    const domain = domainKey(record.url);
    const existing = byDomain.get(domain);

    if (!existing) {
      const id = genId();
      await db.websites.put({ ...record, id });
      markCloudRecordDirty("websites", id);
      byDomain.set(domain, { ...record, id });
      continue;
    }

    const additivePatch: Partial<Website> = {};
    const optionalFields = [
      "favicon",
      "tags",
      "priority",
      "importance",
      "niche",
      "primaryGoal",
      "revenueModel",
      "appUrls",
      "githubRepos"
    ] as const satisfies ReadonlyArray<keyof Omit<Website, "id">>;
    for (const field of optionalFields) {
      const current = existing[field];
      const incoming = record[field];
      const empty = current === undefined || current === "" || (Array.isArray(current) && current.length === 0);
      if (empty && incoming !== undefined) (additivePatch as any)[field] = incoming;
    }
    if (!existing.wpAdminUrl && record.wpAdminUrl) additivePatch.wpAdminUrl = record.wpAdminUrl;
    if (!existing.notes && record.notes) additivePatch.notes = record.notes;
    if (Object.keys(additivePatch).length) {
      await db.websites.update(existing.id, additivePatch);
      markCloudRecordDirty("websites", existing.id);
    }
  }

  const tasks = await db.tasks.toArray();
  const existingKeys = new Set(
    tasks.map((task) => task.tags?.find((tag) => tag.startsWith("portfolio-key:"))?.slice("portfolio-key:".length)).filter(Boolean),
  );

  for (const seed of PRIORITY_TASKS) {
    if (existingKeys.has(seed.key)) continue;
    const id = genId();
    const { key, subtasks = [], tags = [], dueDate, ...rest } = seed;
    await db.tasks.put({
      ...rest,
      id,
      createdAt: today(),
      dueDate: dueDate || "",
      subtasks,
      tags: [...tags, `portfolio-key:${key}`],
      area: "work",
      inbox: false
    });
    markCloudRecordDirty("tasks", id);
  }
}
