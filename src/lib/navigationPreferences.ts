const validSection = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const groups = ["Focus", "Growth", "Intelligence", "Operate", "Tools", "Custom"];
export const DEFAULT_PINNED_SECTIONS = ["dashboard", "tasks", "industry", "review"];
export function sanitizeNavigation(value: unknown) {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const recent = Array.isArray(input.recentSections)
    ? input.recentSections.filter(validSection)
    : [];
  return {
    activeSection: validSection(input.activeSection) ? input.activeSection : "dashboard",
    sidebarCollapsed: input.sidebarCollapsed === true,
    density: input.density === "compact" ? ("compact" as const) : ("comfortable" as const),
    recentSections: [...new Set(recent)].slice(0, 8),
    pinnedSections: Array.isArray(input.pinnedSections)
      ? [...new Set(input.pinnedSections.filter(validSection))].slice(0, 8)
      : DEFAULT_PINNED_SECTIONS,
    closedGroups: Array.isArray(input.closedGroups)
      ? [
          ...new Set(
            input.closedGroups.filter(
              (group): group is string => typeof group === "string" && groups.includes(group),
            ),
          ),
        ]
      : ["Growth", "Tools"],
  };
}
