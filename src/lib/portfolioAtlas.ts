import { GITHUB_REPO_CATALOG } from "@/lib/repoCatalog";
import {
  PAPALEXIOS_PUBLIC_REPO_NAMES,
  PAPALEXIOS001_PUBLIC_REPO_NAMES,
} from "@/lib/portfolioAtlasSnapshot";

/**
 * Public inventory ONLY. The Github connector used for this audit is not an
 * authentication mechanism for the deployed app. Do not add private repository
 * identifiers to any client-side source, snapshot or build.
 */
export type PortfolioOwner = "douphealth" | "Papalexios" | "papalexios001-wq";
export type PortfolioCategory =
  | "Backlinks"
  | "Indexation"
  | "Social outreach"
  | "Automation"
  | "SEO & AI visibility"
  | "Revenue tools"
  | "Apps & websites";

export interface PortfolioRepository {
  owner: PortfolioOwner;
  name: string;
  url: string;
  category: PortfolioCategory;
  description: string;
  recordedAppUrl: string;
}

export const PORTFOLIO_CATEGORIES: PortfolioCategory[] = [
  "Backlinks",
  "Indexation",
  "Social outreach",
  "Automation",
  "SEO & AI visibility",
  "Revenue tools",
  "Apps & websites",
];

export function classifyPortfolioRepo(name: string): PortfolioCategory {
  const n = name.toLocaleLowerCase("en");
  // Topic classification from names only; NOT an operational verification.
  if (/backlink|linkforge|link-forge|link-building/.test(n)) return "Backlinks";
  if (/index|sitemap|canonical|crawl/.test(n)) return "Indexation";
  if (/social|facebook|instagram|outreach|viral|post-copilot/.test(n)) return "Social outreach";
  if (/automator|automation|orchestrat|hermes|agent|workflow|growthscribe|internal-link/.test(n)) return "Automation";
  if (/seo|geo|aeo|rank|schema|content|optim|pillar/.test(n)) return "SEO & AI visibility";
  if (/affiliate|amazon|amz|roi|monetiz|commerce|stripe/.test(n)) return "Revenue tools";
  return "Apps & websites";
}

function publicNames(owner: PortfolioOwner, names: readonly string[]): PortfolioRepository[] {
  return names.map(name => ({
    owner,
    name,
    url: "https://github.com/" + owner + "/" + encodeURIComponent(name),
    category: classifyPortfolioRepo(name),
    description: "",
    recordedAppUrl: "",
  }));
}

/** Frozen audit snapshot, not a live API sync or deployment-health signal. */
export const PUBLIC_PORTFOLIO_REPOS: PortfolioRepository[] = [
  ...GITHUB_REPO_CATALOG.filter(r => r.visibility === "public").map(r => ({
    owner: "douphealth" as const,
    name: r.name,
    url: r.url,
    category: classifyPortfolioRepo(r.name),
    description: r.description || "",
    recordedAppUrl: r.demoUrl || "",
  })),
  ...publicNames("Papalexios", PAPALEXIOS_PUBLIC_REPO_NAMES),
  ...publicNames("papalexios001-wq", PAPALEXIOS001_PUBLIC_REPO_NAMES),
].sort((a, b) => a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name));
