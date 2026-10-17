export type PrintOrientation = "auto" | "portrait" | "landscape";
const LABELS: Record<string, string> = {
  dashboard: "Today · Executive dashboard", now: "Today · Daily plan",
  tasks: "Tasks · Execution list", calendar: "Calendar · Events & deadlines",
  "family-schedule": "Family timetable · Yearly routines",
  websites: "Websites · Portfolio register", github: "GitHub · Repositories",
  "apps-funnels": "Apps & Funnels · Revenue assets", builds: "Build projects",
  seo: "SEO · Organic growth report", "wp-manage": "WordPress · Website operations",
  industry: "Trends · Intelligence report", mentions: "Brand mentions · Coverage report",
  audience: "Audience · Intelligence report", "control-center": "Capture & Intelligence",
  notes: "Notes · Workspace", links: "Links · Resource library",
  "ai-prompts": "AI prompts · Library", focus: "Focus · Execution",
  projects: "Projects · Planning", review: "Review · Executive report",
  decisions: "Decisions · Decision register", reminders: "Reminders · Follow-ups",
  payments: "Finance · Payments", habits: "Habits · Tracker",
  ideas: "Ideas · Opportunity register", credentials: "Credential vault · Inventory",
  settings: "Settings · Configuration", cloudflare: "Cloudflare · Operations",
  vercel: "Vercel · Deployments", "google-tasks": "Google Tasks · Work queue",
  demo: "Mission Control · Demonstration",
};
const WIDE = new Set(["calendar", "family-schedule", "github", "apps-funnels", "websites", "seo"]);
export function labelForPrintSection(section: string): string {
  if (LABELS[section]) return LABELS[section];
  if (section.startsWith("custom-")) return "Custom workspace · Report";
  return section ? section.replace(/[-_]/g, " ").replace(/\b\w/g, ch => ch.toUpperCase()) : "Mission Control";
}
export function printOrientationForSection(section: string): "portrait" | "landscape" {
  return WIDE.has(section) ? "landscape" : "portrait";
}
