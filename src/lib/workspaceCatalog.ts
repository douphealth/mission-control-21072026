import {
  AppWindow,
  AtSign,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare,
  Cloud,
  DollarSign,
  FileText,
  Flame,
  Github,
  Globe,
  Hammer,
  House,
  Inbox,
  KeyRound,
  Layers3,
  Lightbulb,
  Link2,
  ListChecks,
  Newspaper,
  PanelsTopLeft,
  RefreshCcw,
  Rocket,
  Scale,
  Search,
  Settings,
  Timer,
  Users,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceGroup = "Focus" | "Growth" | "Intelligence" | "Operate" | "Tools" | "Custom";
export interface WorkspaceSection {
  id: string;
  label: string;
  description: string;
  group: WorkspaceGroup;
  icon: LucideIcon;
  personal?: boolean;
  keywords?: string[];
}

/** One source for desktop, mobile, search and section context. */
export const WORKSPACE_SECTIONS: readonly WorkspaceSection[] = [
  {
    id: "dashboard",
    label: "Today",
    description: "Your plan, commitments and next action.",
    group: "Focus",
    icon: House,
    personal: true,
    keywords: ["home", "dashboard"],
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Capture, prioritise and complete your work.",
    group: "Focus",
    icon: CheckSquare,
    personal: true,
  },
  {
    id: "projects",
    label: "Projects",
    description: "Organise outcomes, progress and next steps.",
    group: "Focus",
    icon: PanelsTopLeft,
    personal: true,
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "See commitments and plan your available time.",
    group: "Focus",
    icon: CalendarDays,
    personal: true,
  },
  {
    id: "family-schedule",
    label: "Family timetable",
    description: "Coordinate lessons, routines and activities.",
    group: "Focus",
    icon: Users,
    personal: true,
  },
  {
    id: "notes",
    label: "Notes",
    description: "Keep decisions, ideas and reference material.",
    group: "Focus",
    icon: FileText,
    personal: true,
  },
  {
    id: "websites",
    label: "Websites",
    description: "Manage your sites, evidence and growth priorities.",
    group: "Growth",
    icon: Globe,
  },
  {
    id: "apps-funnels",
    label: "Apps & funnels",
    description: "Connect products, repositories and production URLs.",
    group: "Growth",
    icon: AppWindow,
  },
  {
    id: "seo",
    label: "SEO & AI visibility",
    description: "Review search evidence and prioritise recovery work.",
    group: "Growth",
    icon: Search,
    keywords: ["gsc", "indexation", "rankings"],
  },
  {
    id: "wp-manage",
    label: "WordPress",
    description: "Review and manage connected WordPress sites.",
    group: "Growth",
    icon: Zap,
  },
  {
    id: "github",
    label: "GitHub portfolio",
    description: "Inspect repository inventory and development activity.",
    group: "Growth",
    icon: Github,
  },
  {
    id: "industry",
    label: "Trends",
    description: "Find relevant reporting with sources and publication dates.",
    group: "Intelligence",
    icon: Newspaper,
    keywords: ["news", "industry"],
  },
  {
    id: "mentions",
    label: "Mentions",
    description: "Review external references to your brands and sites.",
    group: "Intelligence",
    icon: AtSign,
    keywords: ["backlinks", "brand"],
  },
  {
    id: "audience",
    label: "Audience",
    description: "Track sourced profile measurements and comparable changes.",
    group: "Intelligence",
    icon: ChartNoAxesCombined,
    keywords: ["followers", "social"],
  },
  {
    id: "review",
    label: "Review",
    description: "Triage stale work and decide what deserves attention.",
    group: "Operate",
    icon: RefreshCcw,
    personal: true,
  },
  {
    id: "decisions",
    label: "Findings",
    description: "Turn evidence-backed issues into accountable actions.",
    group: "Operate",
    icon: Scale,
    keywords: ["issues", "decisions"],
  },
  {
    id: "control-center",
    label: "Captures",
    description: "Process incoming items into tasks and planned work.",
    group: "Operate",
    icon: Inbox,
    personal: true,
    keywords: ["inbox", "intake"],
  },
  {
    id: "reminders",
    label: "Reminders",
    description: "Manage due dates, recurring reminders and follow-ups.",
    group: "Operate",
    icon: Bell,
    personal: true,
  },
  {
    id: "payments",
    label: "Finance",
    description: "Review recorded income, expenses and outstanding payments.",
    group: "Operate",
    icon: DollarSign,
    personal: true,
    keywords: ["payments", "invoices", "money"],
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    description: "Inspect accounts, deployments, routes and inventory coverage.",
    group: "Tools",
    icon: Cloud,
    keywords: ["workers", "pages", "dns"],
  },
  {
    id: "vercel",
    label: "Vercel",
    description: "Review connected hosting projects and deployments.",
    group: "Tools",
    icon: Rocket,
  },
  {
    id: "builds",
    label: "Build projects",
    description: "Track implementation work and release progress.",
    group: "Tools",
    icon: Hammer,
  },
  {
    id: "google-tasks",
    label: "Google Tasks",
    description: "Manage tasks connected to your Google account.",
    group: "Tools",
    icon: ListChecks,
    personal: true,
  },
  {
    id: "ai-prompts",
    label: "AI prompts",
    description: "Save, organise and reuse your prompt library.",
    group: "Tools",
    icon: BookOpen,
    personal: true,
  },
  {
    id: "ideas",
    label: "Ideas",
    description: "Develop and evaluate your next opportunities.",
    group: "Tools",
    icon: Lightbulb,
    personal: true,
  },
  {
    id: "habits",
    label: "Habits",
    description: "Keep routines visible and record completion.",
    group: "Tools",
    icon: Flame,
    personal: true,
  },
  {
    id: "credentials",
    label: "Credentials",
    description: "Manage your encrypted account and service inventory.",
    group: "Tools",
    icon: KeyRound,
    keywords: ["vault", "secrets"],
  },
  {
    id: "family-vault",
    label: "Family vault",
    description: "Protected family identity, banking and emergency records.",
    group: "Tools",
    icon: Users,
    personal: true,
    keywords: ["family", "bank", "identity", "social number", "private"],
  },
  {
    id: "links",
    label: "Links",
    description: "Organise useful resources and saved destinations.",
    group: "Tools",
    icon: Link2,
    personal: true,
  },
  {
    id: "focus",
    label: "Focus timer",
    description: "Run a focused work session attached to a task.",
    group: "Tools",
    icon: Timer,
    personal: true,
  },
  {
    id: "now",
    label: "Action queue",
    description: "Choose what to do next from your prioritised work.",
    group: "Tools",
    icon: Layers3,
    personal: true,
  },
  {
    id: "demo",
    label: "Guided tour",
    description: "Explore the workflows and controls available here.",
    group: "Tools",
    icon: WandSparkles,
    personal: true,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Manage connections, appearance, accessibility and backups.",
    group: "Tools",
    icon: Settings,
    personal: true,
  },
];

export const WORKSPACE_GROUPS: WorkspaceGroup[] = [
  "Focus",
  "Growth",
  "Intelligence",
  "Operate",
  "Tools",
  "Custom",
];
export function workspaceById(id: string): WorkspaceSection | undefined {
  return WORKSPACE_SECTIONS.find((section) => section.id === id);
}
export function filterWorkspaces(
  sections: readonly WorkspaceSection[],
  query: string,
  personal = false,
) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return sections.filter((section) => {
    if (personal && !section.personal) return false;
    const text = [
      section.label,
      section.description,
      section.group,
      section.id,
      ...(section.keywords ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
export function sectionFromHash(hash: string): string | null {
  // Leave OAuth/session fragments to their existing handlers.
  if (!hash.startsWith("#section=")) return null;
  const id = hash.slice(9);
  return workspaceById(id) || /^custom-[a-zA-Z0-9_-]{1,120}$/.test(id) ? id : null;
}
