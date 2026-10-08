// Shared visual vocabulary for the portfolio modules (My Websites + WordPress).
// Tones map to `pf-chip--*` classes in portfolio-aurora.css.

import type { SEODataSource, Website } from "@/lib/db";

export type Tone = "accent" | "sky" | "violet" | "amber" | "rose" | "muted";

export const STATUS_CONFIG: Record<Website["status"], { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "accent" },
  maintenance: { label: "Maintenance", tone: "amber" },
  down: { label: "Down", tone: "rose" },
  archived: { label: "Archived", tone: "muted" },
};

export const PRIORITY_TONE: Record<string, Tone> = {
  critical: "rose",
  high: "amber",
  medium: "sky",
  low: "accent",
};

export const CATEGORY_CONFIG: Record<string, { gradient: string; emoji: string }> = {
  "Client Site": { gradient: "from-blue-500 to-cyan-500", emoji: "👔" },
  "E-Commerce": { gradient: "from-purple-500 to-pink-500", emoji: "🛒" },
  Personal: { gradient: "from-indigo-500 to-violet-500", emoji: "🏠" },
  Blog: { gradient: "from-green-500 to-emerald-500", emoji: "📝" },
  SaaS: { gradient: "from-orange-500 to-amber-500", emoji: "🚀" },
  Portfolio: { gradient: "from-rose-500 to-pink-500", emoji: "🎨" },
  "Fitness & Running": { gradient: "from-cyan-500 to-blue-500", emoji: "🏃" },
  "Affiliate Marketing": { gradient: "from-amber-500 to-orange-500", emoji: "💸" },
  "Plant Care": { gradient: "from-emerald-500 to-lime-500", emoji: "🌿" },
  Numerology: { gradient: "from-violet-500 to-fuchsia-500", emoji: "🔢" },
  "French Bulldog": { gradient: "from-rose-500 to-orange-400", emoji: "🐾" },
  "Pest Control": { gradient: "from-slate-500 to-zinc-600", emoji: "🛡️" },
  Growth: { gradient: "from-sky-500 to-indigo-500", emoji: "📈" },
  "AI & Prompts": { gradient: "from-violet-500 to-blue-500", emoji: "✨" },
  "Developer Tools": { gradient: "from-zinc-600 to-slate-700", emoji: "🛠️" },
  "AI Image Tool": { gradient: "from-fuchsia-500 to-pink-500", emoji: "🖼️" },
};

export const categoryVisual = (category: string) =>
  CATEGORY_CONFIG[category] || { gradient: "from-zinc-500 to-zinc-600", emoji: "🌐" };

export const WEBSITE_CATEGORY_OPTIONS = [
  "Fitness & Running",
  "Affiliate Marketing",
  "Plant Care",
  "Numerology",
  "French Bulldog",
  "Pest Control",
  "Growth",
  "AI & Prompts",
  "Developer Tools",
  "AI Image Tool",
  "Personal",
  "Client Site",
  "E-Commerce",
  "Blog",
  "SaaS",
  "Portfolio",
] as const;

export const SOURCE_LABEL: Record<SEODataSource, string> = {
  gsc: "Google",
  bing: "Bing",
  ga4: "GA4",
  crawl: "Crawl",
  pagespeed: "PageSpeed",
  manual: "Manual",
};
