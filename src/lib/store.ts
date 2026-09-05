// Lightweight localStorage wrapper for Mission Control data

export interface Website {
  id: string;
  name: string;
  url: string;
  wpAdminUrl: string;
  wpUsername: string;
  wpPassword: string;
  hostingProvider: string;
  hostingLoginUrl: string;
  hostingUsername: string;
  hostingPassword: string;
  category: string;
  status: "active" | "maintenance" | "down" | "archived";
  notes: string;
  plugins: string[];
  dateAdded: string;
  lastUpdated: string;
}

export interface Task {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "todo" | "in-progress" | "blocked" | "done";
  dueDate: string;
  category: string;
  description: string;
  linkedProject: string;
  subtasks: { id: string; title: string; done: boolean }[];
  createdAt: string;
  completedAt?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
}

export interface GitHubRepo {
  id: string;
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  status: "active" | "stable" | "archived" | "paused";
  demoUrl: string;
  progress: number;
  topics: string[];
  lastUpdated: string;
  devPlatformUrl?: string;
  deploymentUrl?: string;
  dbType?:
    | "supabase"
    | "firebase"
    | "planetscale"
    | "neon"
    | "railway"
    | "mongodb"
    | "postgres"
    | "mysql"
    | "other";
  dbUrl?: string;
  dbDashboardUrl?: string;
  dbName?: string;
  dbNotes?: string;
}

export interface BuildProject {
  id: string;
  name: string;
  platform: "bolt" | "lovable" | "replit";
  projectUrl: string;
  deployedUrl: string;
  description: string;
  techStack: string[];
  status: "ideation" | "building" | "testing" | "deployed";
  startedDate: string;
  lastWorkedOn: string;
  nextSteps: string;
  githubRepo: string;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  status: "active" | "archived";
  description: string;
  dateAdded: string;
  pinned: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  title: string;
  amount: number;
  currency: string;
  type: "income" | "expense" | "invoice" | "subscription";
  status: "paid" | "pending" | "overdue" | "cancelled";
  category: string;
  from: string;
  to: string;
  dueDate: string;
  paidDate: string;
  recurring: boolean;
  recurringInterval: string;
  linkedProject: string;
  notes: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "spark" | "exploring" | "validated" | "building" | "parked";
  tags: string[];
  linkedProject: string;
  votes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialVault {
  id: string;
  label: string;
  service: string;
  url: string;
  username: string;
  password: string;
  apiKey: string;
  notes: string;
  category: string;
  createdAt: string;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const STORAGE_KEY = "mission-control-data";

export interface StoreData {
  websites: Website[];
  tasks: Task[];
  repos: GitHubRepo[];
  buildProjects: BuildProject[];
  links: LinkItem[];
  notes: Note[];
  payments: Payment[];
  ideas: Idea[];
  credentials: CredentialVault[];
  userName: string;
  userRole: string;
}

function getDefaultData(): StoreData {
  // No demo data. Mission Control never invents operational records.
  return {
    userName: "",
    userRole: "",
    websites: [],
    tasks: [],
    repos: [],
    buildProjects: [],
    links: [],
    notes: [],
    payments: [],
    ideas: [],
    credentials: [],
  };
}

export function loadData(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults for new fields
      const defaults = getDefaultData();
      return {
        ...defaults,
        ...parsed,
        payments: parsed.payments || defaults.payments,
        ideas: parsed.ideas || defaults.ideas,
        credentials: parsed.credentials || defaults.credentials,
      };
    }
  } catch {
    /* ignore */
  }
  const d = getDefaultData();
  saveData(d);
  return d;
}

export function saveData(data: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage quota exceeded", e);
  }
}

export function useStore() {
  return { load: loadData, save: saveData, genId };
}
