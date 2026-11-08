import { WORKSPACE_GROUPS, type WorkspaceSection } from "./workspaceCatalog";

export interface SidebarCategory { id: string; label: string }
export interface SidebarLayout {
  categories: SidebarCategory[];
  assignments: Record<string, string>;
  sectionOrder: string[];
  hiddenSections: string[];
}
export function defaultSidebarLayout(): SidebarLayout {
  return { categories: WORKSPACE_GROUPS.map(id => ({ id, label: id })), assignments: {}, sectionOrder: [], hiddenSections: [] };
}
const validId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
export function sanitizeSidebarLayout(value: unknown): SidebarLayout {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const defaults = defaultSidebarLayout();
  const categories: SidebarCategory[] = [];
  if (Array.isArray(input.categories)) for (const entry of input.categories) {
    if (!entry || typeof entry !== "object") continue;
    const { id, label } = entry;
    if (validId(id) && typeof label === "string" && label.trim() && !categories.some(c => c.id === id))
      categories.push({ id, label: label.trim().slice(0, 80) });
  }
  for (const category of defaults.categories) if (!categories.some(c => c.id === category.id)) categories.push(category);
  const assignments: Record<string, string> = {};
  if (input.assignments && typeof input.assignments === "object") for (const [id, group] of Object.entries(input.assignments)) {
    if (validId(id) && id !== "__proto__" && typeof group === "string" && categories.some(c => c.id === group)) assignments[id] = group;
  }
  const ids = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter(validId))] : [];
  return { categories, assignments, sectionOrder: ids(input.sectionOrder), hiddenSections: ids(input.hiddenSections) };
}
export function sectionCategory(section: WorkspaceSection, layout: SidebarLayout) {
  return layout.assignments[section.id] ?? section.group;
}
export function orderedSections(sections: readonly WorkspaceSection[], layout: SidebarLayout, includeHidden = false) {
  const positions = new Map(layout.sectionOrder.map((id, index) => [id, index]));
  return sections.filter(s => includeHidden || !layout.hiddenSections.includes(s.id))
    .sort((a, b) => (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}
export function moveSection(layout: SidebarLayout, sections: readonly WorkspaceSection[], id: string, category: string, beforeId?: string): SidebarLayout {
  if (!sections.some(s => s.id === id) || !layout.categories.some(c => c.id === category) || id === beforeId) return layout;
  const order = orderedSections(sections, layout, true).map(s => s.id).filter(s => s !== id);
  const index = beforeId ? order.indexOf(beforeId) : -1;
  if (index >= 0) order.splice(index, 0, id); else order.push(id);
  return { ...layout, assignments: { ...layout.assignments, [id]: category }, sectionOrder: order };
}
export function removeCategory(layout: SidebarLayout, id: string): SidebarLayout {
  if (WORKSPACE_GROUPS.some(group => group === id)) return layout;
  return { ...layout, categories: layout.categories.filter(c => c.id !== id), assignments: Object.fromEntries(Object.entries(layout.assignments).filter(([, group]) => group !== id)) };
}