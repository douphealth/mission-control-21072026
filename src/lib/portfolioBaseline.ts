import { db, type Task, type Website } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";

export const PORTFOLIO_BASELINE_REVISION = "2026-09-30-v1";

type BaselineWebsite = Omit<Website, "id" | "wpUsername" | "wpPassword" | "hostingUsername" | "hostingPassword">;

const d = "2026-09-30";

export const WEBSITE_PORTFOLIO_BASELINE: BaselineWebsite[] = [
  {
    name: "GearUpToFit",
    url: "https://gearuptofit.com/",
    wpAdminUrl: "https://gearuptofit.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "Fitness & Running",
    status: "active",
    notes: "Primary recovery and revenue asset. Use live GSC/crawl evidence before broad content changes.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "critical",
    importance: 100,
    focus: "Indexation recovery → high-impression pages → app funnels",
    nextAction: "Revalidate current indexation, crawlability, canonical and sitemap state before broad content edits.",
    revenueModel: ["Amazon Associates", "Affiliate", "Display ads", "Growth apps"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "Affiliate Marketing for Success",
    url: "https://affiliatemarketingforsuccess.com/",
    wpAdminUrl: "https://affiliatemarketingforsuccess.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "Affiliate Marketing",
    status: "active",
    notes: "Commercial content and tool funnel. Historical review QA found merchant/tracking coverage gaps; revalidate before bulk changes.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "critical",
    importance: 98,
    focus: "Commercial review monetization, tracking and AI-search visibility",
    nextAction: "Re-audit the highest-intent reviews for merchant coverage, affiliate tracking and conversion paths.",
    revenueModel: ["Affiliate", "Lead generation", "Tools"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "Plantastic Haven",
    url: "https://plantastichaven.com/",
    wpAdminUrl: "https://plantastichaven.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "Plant Care",
    status: "active",
    notes: "Prioritize pages already earning meaningful impressions before creating unnecessary new URLs.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "high",
    importance: 91,
    focus: "GSC opportunity pages → topical authority → ProCare funnel",
    nextAction: "Refresh the current high-impression opportunity set and route qualified traffic into ProCare.",
    revenueModel: ["Affiliate", "Growth app"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "Efficient GPT Prompts",
    url: "https://efficientgptprompts.com/",
    wpAdminUrl: "https://efficientgptprompts.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "AI & Prompts",
    status: "active",
    notes: "Prompt content, PromptGrade and business-growth funnel.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "high",
    importance: 93,
    focus: "Technical trust → PromptGrade → lead/product conversion",
    nextAction: "Validate schema/trust gaps and measure PromptGrade plus business-funnel conversion end to end.",
    revenueModel: ["Digital products", "Tools", "Lead generation"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "Mystical Digits",
    url: "https://mysticaldigits.com/",
    wpAdminUrl: "https://mysticaldigits.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "Numerology",
    status: "active",
    notes: "Content authority plus the paid Blueprint funnel.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "high",
    importance: 92,
    focus: "Organic authority → Blueprint starts → paid conversion",
    nextAction: "Measure the canonical Blueprint funnel from content CTA through completion and payment/lead outcome.",
    revenueModel: ["Paid blueprint", "Lead generation"],
    evidenceStatus: "verified",
    verifiedAsOf: "2026-09-29",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "FrenchyFab",
    url: "https://frenchyfab.com/",
    wpAdminUrl: "https://frenchyfab.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "French Bulldog",
    status: "active",
    notes: "French Bulldog content plus Care Compass funnel.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "high",
    importance: 86,
    focus: "Trust content → Care Compass → monetization",
    nextAction: "Validate Care Compass handoff, conversion events and the highest-value content-to-app internal links.",
    revenueModel: ["Affiliate", "Growth app"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "Mice Gone Guide",
    url: "https://micegoneguide.com/",
    wpAdminUrl: "https://micegoneguide.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "Pest Control",
    status: "active",
    notes: "Pest-control authority plus Elimination funnel.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "high",
    importance: 85,
    focus: "Organic authority → elimination workflow → monetization",
    nextAction: "Validate the Elimination app route, analytics and content-to-tool conversion after the dependency cleanup.",
    revenueModel: ["Affiliate", "Growth app"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "GearUpToGrow",
    url: "https://gearuptogrow.com/",
    wpAdminUrl: "https://gearuptogrow.com/wp-admin/",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "Growth",
    status: "active",
    notes: "Growth content and Grow Plan funnel.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "hybrid",
    priority: "high",
    importance: 83,
    focus: "Core content → Grow Plan → measurable conversion",
    nextAction: "Confirm the current production origin and instrument the Grow Plan funnel from landing page to completion.",
    revenueModel: ["Lead generation", "Growth app"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "OpenClaw Skills Hub",
    url: "https://openclaw-skillshub.com/",
    wpAdminUrl: "",
    hostingProvider: "Cloudflare Pages",
    hostingLoginUrl: "",
    category: "AI Skills",
    status: "active",
    notes: "Production skills directory. Not a WordPress property.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "app",
    priority: "high",
    importance: 89,
    focus: "Skill-level SEO/GEO/AEO → assistant discovery → activation",
    nextAction: "Expand indexable skill-level discovery pages and measure assistant/plugin onboarding paths.",
    revenueModel: ["Lead generation", "Tools"],
    evidenceStatus: "verified",
    verifiedAsOf: "2026-09-18",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "ImageAlchemy",
    url: "https://imagealchemy.app/",
    wpAdminUrl: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "AI Tools",
    status: "active",
    notes: "Standalone image tool mapped to the form-beauty-studio production app.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "app",
    priority: "medium",
    importance: 78,
    focus: "Product usability → search discovery → conversion baseline",
    nextAction: "Establish verified production analytics, conversion events and an organic acquisition baseline.",
    revenueModel: ["Tool"],
    evidenceStatus: "known",
    verifiedAsOf: "2026-09-30",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
  {
    name: "Content Optimizer",
    url: "https://contentoptimizer.app/",
    wpAdminUrl: "",
    hostingProvider: "",
    hostingLoginUrl: "",
    category: "SEO Tools",
    status: "active",
    notes: "Production origin has conflicting candidate evidence. Resolve origin before production writes.",
    plugins: [],
    dateAdded: d,
    lastUpdated: d,
    siteType: "app",
    priority: "high",
    importance: 87,
    focus: "Production origin proof → reliability → product conversion",
    nextAction: "Resolve the exact production repo/deploy origin before any destructive or production change.",
    revenueModel: ["Tool"],
    evidenceStatus: "needs-verification",
    verifiedAsOf: "2026-09-18",
    portfolioRevision: PORTFOLIO_BASELINE_REVISION,
  },
];

type BaselineTask = Omit<Task, "id"> & { id: string };

const task = (
  id: string,
  title: string,
  linkedProject: string,
  priority: Task["priority"],
  category: string,
  description: string,
  extra: Partial<Task> = {},
): BaselineTask => ({
  id,
  title,
  priority,
  status: "todo",
  dueDate: "",
  category,
  description,
  linkedProject,
  subtasks: [],
  createdAt: "2026-09-30",
  touchedAt: "2026-09-30",
  inbox: true,
  area: "work",
  ...extra,
});

export const PORTFOLIO_TASK_BASELINE: BaselineTask[] = [
  task("portfolio-task-gutf-index", "Revalidate GearUpToFit indexation and crawl state", "GearUpToFit", "critical", "SEO / Indexation", "Capture a fresh crawl plus current GSC indexation evidence before broad content edits. Verify preferred host, robots, sitemap, canonical and indexability."),
  task("portfolio-task-gutf-recovery", "Complete GearUpToFit P0 host, sitemap, canonical and URL-inventory recovery", "GearUpToFit", "critical", "SEO / Indexation", "Execute the technical recovery gate before content-scale changes. Preserve valuable URLs and log before/after validation."),
  task("portfolio-task-gutf-command-center", "Reconcile GearUpToFit recovery task queue against fresh evidence", "GearUpToFit", "high", "SEO / Planning", "Review the existing SEO Recovery Command Center queue against current GSC/crawl state. Do not blindly execute stale July statuses or dependencies."),
  task("portfolio-task-gutf-opportunities", "Build GearUpToFit post-recovery high-impression opportunity queue", "GearUpToFit", "high", "SEO / Content", "After technical gates pass, prioritize pages already earning impressions with weak CTR/rankings and surgical commercial upside."),
  task("portfolio-task-shoe-finder", "Instrument Shoe Finder recommendation and affiliate conversions", "GearUpToFit", "high", "Apps / Revenue", "Track quiz start, completion, recommendation view and outbound shoe clicks. Keep the experience recommendation-led rather than payment-led."),
  task("portfolio-task-watch-match", "Instrument Watch Match completion, product clicks and revenue", "GearUpToFit", "high", "Apps / Revenue", "Measure quiz starts, matches, outbound product clicks and assisted revenue for Watch Match."),
  task("portfolio-task-supplement-match", "Instrument Supplement Match completion and outbound conversion", "GearUpToFit", "high", "Apps / Revenue", "Measure quiz starts/completions and outbound supplement clicks while preserving evidence and safety layers."),
  task("portfolio-task-fitness-plan", "Validate Fitness Plan funnel and conversion tracking end to end", "GearUpToFit", "high", "Apps / Revenue", "Confirm canonical production route, landing-page handoff and real conversion tracking across the fitness-plan funnel."),
  task("portfolio-task-amfs-reviews", "Re-audit Affiliate Marketing for Success review monetization", "Affiliate Marketing for Success", "critical", "Revenue", "Revalidate the historical review QA gaps, then repair only confirmed missing merchant links, tracking and conversion paths."),
  task("portfolio-task-amfs-funnel", "Validate Affiliate Marketing for Success business funnel", "Affiliate Marketing for Success", "high", "Apps / Revenue", "Confirm the current production app mapping and measure lead/product conversion from WordPress into the business-growth funnel."),
  task("portfolio-task-plantastic-gsc", "Refresh Plantastic Haven high-impression GSC opportunities", "Plantastic Haven", "high", "SEO / Content", "Refresh current query/page evidence, then surgically improve existing opportunity pages before creating new URLs."),
  task("portfolio-task-plantastic-procare", "Measure Plantastic ProCare funnel conversion", "Plantastic Haven", "high", "Apps / Revenue", "Validate the canonical ProCare route and track content CTA, app start, completion and paid/lead outcome."),
  task("portfolio-task-efficient-trust", "Run Efficient GPT Prompts schema and trust audit", "Efficient GPT Prompts", "high", "SEO / Trust", "Validate structured-data, publisher trust and legacy-quality gaps using the current live site before changing templates."),
  task("portfolio-task-promptgrade", "Measure PromptGrade conversion end to end", "Efficient GPT Prompts", "high", "Apps / Revenue", "Use promptgrade.efficientgptprompts.com as the canonical app and measure analysis starts, completion and downstream conversion."),
  task("portfolio-task-efficient-funnel", "Validate Efficient GPT Prompts business-growth funnel", "Efficient GPT Prompts", "high", "Apps / Revenue", "Confirm marketing-forge-boost production mapping and measure WordPress-to-funnel lead/product conversion."),
  task("portfolio-task-mystical-blueprint", "Measure Mystical Digits Blueprint funnel", "Mystical Digits", "high", "Apps / Revenue", "Use blueprint.mysticaldigits.com as canonical. Track content CTA, blueprint start, completion and paid/lead conversion."),
  task("portfolio-task-frenchy-care", "Validate FrenchyFab Care Compass funnel", "FrenchyFab", "high", "Apps / Revenue", "Confirm the Care Compass production route, conversion events and highest-value contextual links from FrenchyFab content."),
  task("portfolio-task-mice-elimination", "Validate Mice Gone Guide Elimination funnel", "Mice Gone Guide", "high", "Apps / Revenue", "Confirm the Elimination app works without the retired dependency and measure content-to-tool conversion."),
  task("portfolio-task-grow-plan", "Validate GearUpToGrow Grow Plan funnel", "GearUpToGrow", "high", "Apps / Revenue", "Confirm the production origin and measure landing-page to Grow Plan start/completion."),
  task("portfolio-task-openclaw-seo", "Expand OpenClaw skill-level SEO, GEO and AEO coverage", "OpenClaw Skills Hub", "high", "SEO / AI Visibility", "Prioritize useful indexable skill pages, internal linking, structured entity context and answer-engine citability without thin mass publishing."),
  task("portfolio-task-openclaw-onboarding", "Improve OpenClaw assistant and plugin onboarding", "OpenClaw Skills Hub", "high", "Product / Conversion", "Make skill discovery lead to a clear install/use path and measure activation rather than only page views."),
  task("portfolio-task-contentoptimizer-origin", "Resolve contentoptimizer.app production origin proof", "Content Optimizer", "critical", "Reliability", "Verify the exact source repo, deployment and live origin before any destructive or production changes."),
  task("portfolio-task-imagealchemy", "Create ImageAlchemy acquisition and conversion baseline", "ImageAlchemy", "medium", "Growth", "Validate production analytics and define real search/product conversion events before optimization claims."),
  task("portfolio-task-family-nutrition", "Fix Family Nutrition OS edit navigation and form reliability", "Family Nutrition OS", "high", "Product / Reliability", "Validate the current GitHub Pages PWA and repair the known edit/navigation/form issues with regression coverage."),
  task("portfolio-task-clipgenius", "Finish ClipGenius verified-domain and domain-transfer plan", "ClipGenius", "medium", "Product / Distribution", "Resolve verified-domain access and document the safe domain handoff/transfer path without exposing credentials."),
  task("portfolio-task-baseline", "Build one current portfolio growth baseline", "All Websites", "critical", "Portfolio", "Replace historical assumptions with current crawl, GSC, GA4, conversion and revenue evidence. Keep sources separate and dated."),
  task("portfolio-task-daily-check", "Daily critical website check", "All Websites", "high", "Portfolio / Recurring", "Check outages, robots, sitemap/indexability regressions and broken production routes.", { inbox: false, recurring: true, recurringInterval: "daily" }),
  task("portfolio-task-weekly-growth", "Weekly portfolio growth review", "All Websites", "high", "Portfolio / Recurring", "Review GSC/analytics deltas, wins, losses, anomalies and the top ROI actions for the coming week.", { inbox: false, recurring: true, recurringInterval: "weekly" }),
  task("portfolio-task-revenue-qa", "Biweekly portfolio revenue QA", "All Websites", "high", "Portfolio / Recurring", "Audit broken offers, affiliate tracking, merchant coverage, disclosures and high-intent CTA paths.", { inbox: false, recurring: true, recurringInterval: "biweekly" }),
  task("portfolio-task-ai-benchmark", "Monthly AI visibility benchmark", "All Websites", "medium", "Portfolio / Recurring", "Run a fixed answer-engine query set and record mentions/citations with source evidence.", { inbox: false, recurring: true, recurringInterval: "monthly" }),
  task("portfolio-task-monthly-strategy", "Monthly portfolio strategy reset", "All Websites", "high", "Portfolio / Recurring", "Re-rank the backlog using impact, evidence, effort, risk and revenue potential; archive low-value work.", { inbox: false, recurring: true, recurringInterval: "monthly" }),
];

function normalizeHost(url: string) {
  try {
    return new URL(url.match(/^https?:\/\//) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase();
  }
}

function siteId(site: BaselineWebsite) {
  return `portfolio-site-${normalizeHost(site.url).replace(/[^a-z0-9]+/g, "-")}`;
}

const ENRICHMENT_KEYS: Array<keyof BaselineWebsite> = [
  "siteType",
  "priority",
  "importance",
  "focus",
  "nextAction",
  "revenueModel",
  "evidenceStatus",
  "verifiedAsOf",
  "portfolioRevision",
];

export async function ensurePortfolioBaseline(): Promise<{ websitesAdded: number; websitesEnriched: number; tasksAdded: number; appsAdded: number }> {
  let websitesAdded = 0;
  let websitesEnriched = 0;
  let tasksAdded = 0;
  let appsAdded = 0;

  const existingSites = await db.websites.toArray();

  for (const source of WEBSITE_PORTFOLIO_BASELINE) {
    const host = normalizeHost(source.url);
    const existing = existingSites.find((row) => normalizeHost(row.url) === host);

    if (!existing) {
      const id = siteId(source);
      await db.websites.put({
        id,
        wpUsername: "",
        wpPassword: "",
        hostingUsername: "",
        hostingPassword: "",
        ...source,
      });
      markCloudRecordDirty("websites", id);
      websitesAdded++;
      continue;
    }

    const patch: Partial<Website> = {};
    for (const key of ENRICHMENT_KEYS) {
      const next = source[key] as unknown;
      const current = existing[key] as unknown;
      if (key === "portfolioRevision" || current == null || current === "" || (Array.isArray(current) && current.length === 0)) {
        (patch as Record<string, unknown>)[key] = next;
      }
    }
    if (!existing.wpAdminUrl && source.wpAdminUrl) patch.wpAdminUrl = source.wpAdminUrl;
    if (!existing.category && source.category) patch.category = source.category;

    if (Object.keys(patch).length > 0) {
      await db.websites.update(existing.id, patch);
      markCloudRecordDirty("websites", existing.id);
      websitesEnriched++;
    }
  }

  const existingApps = await db.buildProjects.toArray();
  const appKeys = new Set(
    existingApps.flatMap((row) =>
      [row.githubRepo?.trim().toLowerCase(), row.name?.trim().toLowerCase()].filter(Boolean) as string[],
    ),
  );
  for (const source of APP_FUNNEL_CATALOG) {
    const repoKey = source.githubRepo?.trim().toLowerCase();
    const nameKey = source.name.trim().toLowerCase();
    if ((repoKey && appKeys.has(repoKey)) || appKeys.has(nameKey)) continue;
    const repoSlug = (repoKey || nameKey).split("/").pop()!.replace(/[^a-z0-9-]+/g, "-");
    const id = `portfolio-app-${repoSlug}`;
    await db.buildProjects.put({ id, ...source });
    markCloudRecordDirty("buildProjects", id);
    appKeys.add(nameKey);
    if (repoKey) appKeys.add(repoKey);
    appsAdded++;
  }

  for (const source of PORTFOLIO_TASK_BASELINE) {
    const existing = await db.tasks.get(source.id);
    if (existing) continue;
    const duplicate = await db.tasks
      .filter((row) => row.title.trim().toLowerCase() === source.title.trim().toLowerCase())
      .first();
    if (duplicate) continue;
    await db.tasks.put(source);
    markCloudRecordDirty("tasks", source.id);
    tasksAdded++;
  }

  if (websitesAdded || websitesEnriched || tasksAdded || appsAdded) queueCloudPush();

  return { websitesAdded, websitesEnriched, tasksAdded, appsAdded };
}
