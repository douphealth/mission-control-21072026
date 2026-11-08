import { describe, expect, it } from "vitest";
import { defaultSidebarLayout, moveSection, orderedSections, removeCategory, sanitizeSidebarLayout, sectionCategory } from "../sidebarLayout";
import { WORKSPACE_SECTIONS } from "../workspaceCatalog";
import { sanitizeNavigation } from "../navigationPreferences";

describe("owner-controlled sidebar layout", () => {
  it("moves any section into a category containing only chosen sections", () => {
    let layout = defaultSidebarLayout();
    layout.categories.unshift({ id: "category-work", label: "My work" });
    layout = moveSection(layout, WORKSPACE_SECTIONS, "github", "category-work");
    layout = moveSection(layout, WORKSPACE_SECTIONS, "cloudflare", "category-work", "github");
    expect(orderedSections(WORKSPACE_SECTIONS, layout).filter(s => sectionCategory(s, layout) === "category-work").map(s => s.id)).toEqual(["cloudflare", "github"]);
  });
  it("hides and restores any section without removing its catalog entry or placement", () => {
    const layout = moveSection(defaultSidebarLayout(), WORKSPACE_SECTIONS, "credentials", "Focus", "tasks");
    layout.hiddenSections = ["credentials", "settings"];
    expect(orderedSections(WORKSPACE_SECTIONS, layout).some(s => s.id === "credentials" || s.id === "settings")).toBe(false);
    expect(orderedSections(WORKSPACE_SECTIONS, layout, true).filter(s => layout.hiddenSections.includes(s.id)).map(s => s.id)).toEqual(["credentials", "settings"]);
    layout.hiddenSections = [];
    expect(orderedSections(WORKSPACE_SECTIONS, layout).findIndex(s => s.id === "credentials")).toBeLessThan(orderedSections(WORKSPACE_SECTIONS, layout).findIndex(s => s.id === "tasks"));
  });
  it("retains renamed category order and choices through persistence sanitation", () => {
    const layout = defaultSidebarLayout();
    layout.categories.reverse();
    layout.categories.unshift({ id: "category-mine", label: "Hosting" });
    layout.assignments = { cloudflare: "category-mine" };
    layout.hiddenSections = ["demo"];
    const saved = sanitizeNavigation(JSON.parse(JSON.stringify({ sidebarLayout: layout, closedGroups: ["category-mine"] })));
    expect(saved.sidebarLayout).toEqual(layout);
    expect(saved.closedGroups).toEqual(["category-mine"]);
  });
  it("returns sections to original categories when a custom category is deleted", () => {
    const layout = defaultSidebarLayout();
    layout.categories.push({ id: "category-mine", label: "Hosting" });
    layout.assignments = { github: "category-mine", cloudflare: "category-mine" };
    const next = removeCategory(layout, "category-mine");
    expect(next.categories.some(c => c.id === "category-mine")).toBe(false);
    expect(next.assignments).toEqual({});
    expect(removeCategory(next, "Focus")).toBe(next);
  });
  it("rejects invalid saved assignments and does not lose default categories", () => {
    const layout = sanitizeSidebarLayout({ categories: [{ id: "category-ok", label: " My list " }, { id: "category-ok", label: "Duplicate" }], assignments: { tasks: "missing", github: "category-ok" }, hiddenSections: ["tasks", "tasks", "../../vault"] });
    expect(layout.assignments).toEqual({ github: "category-ok" });
    expect(layout.categories.map(c => c.label)).toEqual(["My list", "Focus", "Growth", "Intelligence", "Operate", "Tools", "Custom"]);
    expect(layout.hiddenSections).toEqual(["tasks"]);
  });
});