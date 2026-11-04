import { describe, expect, it } from "vitest";
import { filterWorkspaces, sectionFromHash, WORKSPACE_SECTIONS } from "../workspaceCatalog";
import {
  DEFAULT_PINNED_SECTIONS,
  sanitizeNavigation,
  upgradeLegacyPins,
} from "../navigationPreferences";

describe("workspace discovery", () => {
  it("makes previously inaccessible hosting, WordPress and Google workspaces discoverable", () => {
    for (const id of [
      "cloudflare",
      "vercel",
      "wp-manage",
      "google-tasks",
      "industry",
      "mentions",
      "audience",
      "control-center",
      "payments",
    ]) {
      expect(filterWorkspaces(WORKSPACE_SECTIONS, id).some((item) => item.id === id)).toBe(true);
    }
    expect(new Set(WORKSPACE_SECTIONS.map((item) => item.id)).size).toBe(WORKSPACE_SECTIONS.length);
  });
  it("searches a workspace's actual purpose and preserves the Home filter", () => {
    expect(
      filterWorkspaces(WORKSPACE_SECTIONS, "outstanding payments").map((item) => item.id),
    ).toContain("payments");
    expect(filterWorkspaces(WORKSPACE_SECTIONS, "workers").map((item) => item.id)).toEqual([
      "cloudflare",
    ]);
    expect(filterWorkspaces(WORKSPACE_SECTIONS, "workers", true)).toEqual([]);
    expect(
      filterWorkspaces(WORKSPACE_SECTIONS, "reminders", true).some(
        (item) => item.id === "reminders",
      ),
    ).toBe(true);
  });
  it("keeps custom workspaces searchable without inventing routes", () => {
    const module = {
      ...WORKSPACE_SECTIONS[0],
      id: "custom-finance",
      label: "Travel planning",
      description: "Trips and costs",
      group: "Custom" as const,
      personal: false,
    };
    expect(filterWorkspaces([...WORKSPACE_SECTIONS, module], "trips")).toContain(module);
  });
});
describe("section links and saved layout", () => {
  it("recognises real sections and custom modules and leaves OAuth fragments alone", () => {
    expect(sectionFromHash("#section=audience")).toBe("audience");
    expect(sectionFromHash("#section=custom-a123")).toBe("custom-a123");
    for (const hash of [
      "#access_token=private",
      "#section=unknown",
      "#section=../../tasks",
      "#section=tasks&access_token=private",
      "#main-content",
      "",
    ])
      expect(sectionFromHash(hash)).toBeNull();
  });
  it("migrates existing preferences safely and only persists supported density values", () => {
    expect(sanitizeNavigation({ activeSection: "tasks" }).density).toBe("comfortable");
    expect(sanitizeNavigation({ density: "compact" }).density).toBe("compact");
    expect(sanitizeNavigation({ density: "invalid", setDensity: "overwritten" })).toEqual({
      activeSection: "dashboard",
      recentSections: [],
      sidebarCollapsed: false,
      density: "comfortable",
      pinnedSections: ["dashboard", "tasks", "industry", "review", "github", "cloudflare"],
      closedGroups: ["Growth", "Tools"],
    });
  });
  it("keeps user pin order, deduplicates saved pins and rejects invalid group preferences", () => {
    const state = sanitizeNavigation({
      pinnedSections: ["payments", "tasks", "payments", "../../private"],
      closedGroups: ["Tools", "Tools", "unknown"],
    });
    expect(state.pinnedSections).toEqual(["payments", "tasks"]);
    expect(state.closedGroups).toEqual(["Tools"]);
    expect(sanitizeNavigation({ pinnedSections: [] }).pinnedSections).toEqual([]);
  });
  it("upgrades only untouched default pins to include GitHub and Cloudflare", () => {
    const legacy = ["dashboard", "tasks", "industry", "review"];
    expect(upgradeLegacyPins(legacy)).toEqual([...legacy, "github", "cloudflare"]);
    // Anything the user changed — a different set, order, or an emptied list — is theirs and stays.
    expect(upgradeLegacyPins(["tasks", "dashboard", "industry", "review"])).toEqual([
      "tasks",
      "dashboard",
      "industry",
      "review",
    ]);
    expect(upgradeLegacyPins(["payments", "tasks"])).toEqual(["payments", "tasks"]);
    expect(upgradeLegacyPins([])).toEqual([]);
    expect(upgradeLegacyPins(legacy)).not.toBe(legacy);
  });
  it("keeps the default pin list within the eight-pin limit", () => {
    expect(DEFAULT_PINNED_SECTIONS.length).toBeLessThanOrEqual(8);
    expect(new Set(DEFAULT_PINNED_SECTIONS).size).toBe(DEFAULT_PINNED_SECTIONS.length);
  });
});
