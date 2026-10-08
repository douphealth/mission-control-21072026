import { describe, it, expect } from "vitest";
import type { SEOSnapshot, Task, Website } from "@/lib/db";
import {
  byNextAction,
  completeness,
  domainOf,
  fleetSummary,
  latestEvidenceBySource,
  profileChecks,
  siteKind,
  summarizeTasks,
  tasksForSite,
} from "@/lib/portfolioInsights";

const site = (overrides: Partial<Website> = {}): Website => ({
  id: "w1",
  name: "GearUpToFit",
  url: "https://gearuptofit.com/",
  wpAdminUrl: "",
  wpUsername: "",
  wpPassword: "",
  hostingProvider: "",
  hostingLoginUrl: "",
  hostingUsername: "",
  hostingPassword: "",
  category: "Fitness & Running",
  status: "active",
  notes: "",
  plugins: [],
  dateAdded: "2026-10-01",
  lastUpdated: "2026-10-01",
  ...overrides,
});

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Task",
  priority: "medium",
  status: "todo",
  dueDate: "",
  category: "SEO",
  description: "",
  linkedProject: "",
  subtasks: [],
  createdAt: "2026-10-01",
  ...overrides,
});

const snapshot = (overrides: Partial<SEOSnapshot>): SEOSnapshot => ({
  id: "s",
  websiteId: "w1",
  date: "2026-10-01",
  source: "bing",
  importedAt: "2026-10-01",
  ...overrides,
});

describe("domainOf", () => {
  it("strips protocol, www and path, and lowercases", () => {
    expect(domainOf("https://WWW.GearUpToFit.com/shoes/")).toBe("gearuptofit.com");
  });

  it("falls back gracefully for values that are not URLs", () => {
    expect(domainOf("imagealchemy.app/pricing")).toBe("imagealchemy.app");
  });
});

describe("siteKind", () => {
  it("treats a WP admin URL or a wordpress tag as WordPress", () => {
    expect(siteKind({ wpAdminUrl: "https://x.com/wp-admin/", tags: [] })).toBe("wordpress");
    expect(siteKind({ wpAdminUrl: "", tags: ["WordPress"] })).toBe("wordpress");
  });

  it("classifies everything else as a web property", () => {
    expect(siteKind({ wpAdminUrl: "", tags: ["cloudflare"] })).toBe("property");
  });
});

describe("tasksForSite", () => {
  const sites = site({ url: "https://mysticaldigits.com/" });

  it("matches a task whose linked project names the domain", () => {
    const linked = task({ id: "a", linkedProject: "mysticaldigits.com" });
    expect(tasksForSite(sites, [linked]).map((t) => t.id)).toEqual(["a"]);
  });

  it("matches a task whose tag is the site label", () => {
    const tagged = task({ id: "b", tags: ["mysticaldigits", "funnel"] });
    expect(tasksForSite(sites, [tagged]).map((t) => t.id)).toEqual(["b"]);
  });

  it("ignores deleted and archived tasks and unrelated work", () => {
    const tasks = [
      task({ id: "c", linkedProject: "mysticaldigits.com", deletedAt: "2026-10-02" }),
      task({ id: "d", linkedProject: "mysticaldigits.com", archived: true }),
      task({ id: "e", linkedProject: "gearuptofit.com" }),
    ];
    expect(tasksForSite(sites, tasks)).toEqual([]);
  });
});

describe("summarizeTasks and next action", () => {
  it("excludes done work and counts in-progress and blocked", () => {
    const summary = summarizeTasks([
      task({ id: "1", status: "done" }),
      task({ id: "2", status: "in-progress" }),
      task({ id: "3", status: "blocked" }),
      task({ id: "4", status: "todo" }),
    ]);
    expect(summary.open).toBe(3);
    expect(summary.inProgress).toBe(1);
    expect(summary.blocked).toBe(1);
  });

  it("prefers unblocked work, then priority, then work already started", () => {
    const blockedCritical = task({ id: "x", title: "A", priority: "critical", status: "blocked" });
    const highTodo = task({ id: "y", title: "B", priority: "high", status: "todo" });
    const highStarted = task({ id: "z", title: "C", priority: "high", status: "in-progress" });
    const sorted = [blockedCritical, highTodo, highStarted].sort(byNextAction).map((t) => t.id);
    expect(sorted).toEqual(["z", "y", "x"]);
    expect(summarizeTasks([blockedCritical, highTodo, highStarted]).next?.id).toBe("z");
  });

  it("returns no next move when nothing is open", () => {
    expect(summarizeTasks([task({ status: "done" })]).next).toBeNull();
  });
});

describe("latestEvidenceBySource", () => {
  it("keeps only the newest snapshot per source for this website", () => {
    const evidence = latestEvidenceBySource("w1", [
      snapshot({ source: "bing", date: "2026-09-01", clicks: 10 }),
      snapshot({ source: "bing", date: "2026-10-01", clicks: 40 }),
      snapshot({ source: "gsc", date: "2026-10-01", clicks: 7 }),
      snapshot({ websiteId: "other", source: "bing", date: "2026-10-05", clicks: 999 }),
    ]);
    expect(evidence.map((e) => [e.source, e.clicks])).toEqual([
      ["bing", 40],
      ["gsc", 7],
    ]);
  });

  it("returns an empty list when nothing is connected, never zeros", () => {
    expect(latestEvidenceBySource("w1", [])).toEqual([]);
  });
});

describe("profile completeness", () => {
  it("reports every gap on a bare record", () => {
    const result = completeness(site());
    expect(result.done).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.missing).toContain("Main goal");
    expect(result.missing).not.toContain("WP admin link");
  });

  it("adds the WP admin check only for WordPress sites", () => {
    expect(
      profileChecks(site({ wpAdminUrl: "https://gearuptofit.com/wp-admin/" })).map((c) => c.key),
    ).toContain("wp");
    expect(profileChecks(site()).map((c) => c.key)).not.toContain("wp");
  });

  it("computes percent from completed checks", () => {
    const complete = site({
      niche: "Running",
      primaryGoal: "Recover",
      revenueModel: "Affiliate",
      hostingProvider: "Cloudflare",
      appUrls: ["https://shoe-match.gearuptofit.com/"],
      githubRepos: ["https://github.com/douphealth/runmatch"],
      wpUsername: "admin",
    });
    expect(completeness(complete).percent).toBe(100);
  });
});

describe("fleetSummary", () => {
  it("excludes archived sites and counts unique apps, repos and open tasks", () => {
    const sites = [
      site({
        id: "a",
        url: "https://gearuptofit.com/",
        wpAdminUrl: "https://gearuptofit.com/wp-admin/",
        appUrls: ["https://x.gearuptofit.com/"],
        githubRepos: ["https://github.com/o/r"],
      }),
      site({
        id: "b",
        name: "Old",
        url: "https://old.example.com/",
        status: "archived",
        appUrls: ["https://x.gearuptofit.com/"],
      }),
      site({
        id: "c",
        name: "Mystic",
        url: "https://mysticaldigits.com/",
        status: "down",
        appUrls: ["https://x.gearuptofit.com/"],
      }),
    ];
    const tasks = [
      task({ id: "t1", linkedProject: "gearuptofit.com" }),
      task({ id: "t2", linkedProject: "gearuptofit.com", status: "blocked" }),
      task({ id: "t3", linkedProject: "mysticaldigits.com", tags: ["portfolio-key:x"] }),
    ];
    const summary = fleetSummary(sites, tasks, [
      snapshot({ websiteId: "a", source: "bing", clicks: 3 }),
    ]);
    expect(summary.total).toBe(2);
    expect(summary.wordpress).toBe(1);
    expect(summary.properties).toBe(1);
    expect(summary.apps).toBe(1);
    expect(summary.repos).toBe(1);
    expect(summary.openTasks).toBe(3);
    expect(summary.blockedTasks).toBe(1);
    expect(summary.withEvidence).toBe(1);
    expect(summary.needsAttention).toBe(2);
  });

  it("returns zeros for an empty portfolio", () => {
    expect(fleetSummary([], [], [])).toMatchObject({ total: 0, avgCompleteness: 0, openTasks: 0 });
  });
});

describe("sortPortfolioQueue", () => {
  it("orders unblocked work first, then priority, then work already started", async () => {
    const { sortPortfolioQueue } = await import("@/lib/portfolioInsights");
    const items = [
      { task: task({ id: "blocked", title: "A", priority: "critical", status: "blocked" }), siteName: "X" },
      { task: task({ id: "low", title: "B", priority: "low", status: "in-progress" }), siteName: "X" },
      { task: task({ id: "high", title: "C", priority: "high", status: "todo" }), siteName: null },
    ];
    expect(sortPortfolioQueue(items).map((item) => item.task.id)).toEqual(["high", "low", "blocked"]);
  });
});
