/** Pins are a favorites list; generous but bounded so menus stay usable. */
export const MAX_PINNED_SECTIONS = 24;
import { sanitizeSidebarLayout } from "./sidebarLayout";

const validSection = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const validGroup = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
/** Pins every device started with before GitHub and Cloudflare were pinned by default. */
export const LEGACY_DEFAULT_PINNED_SECTIONS = ["dashboard", "tasks", "industry", "review"];
/** Your two most-managed workspaces live one click away instead of inside collapsed groups. */
export const DEFAULT_PINNED_SECTIONS = [...LEGACY_DEFAULT_PINNED_SECTIONS, "github", "cloudflare"];
/**
 * Devices that never customised their pins still hold the old default; give
 * them the new one. Any customised pin list (different set or order) is kept.
 */
export function upgradeLegacyPins(pins: readonly string[]): string[] {
  const untouched =
    pins.length === LEGACY_DEFAULT_PINNED_SECTIONS.length &&
    pins.every((pin, index) => pin === LEGACY_DEFAULT_PINNED_SECTIONS[index]);
  return untouched ? [...DEFAULT_PINNED_SECTIONS] : [...pins];
}
export function sanitizeNavigation(value: unknown) {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const recent = Array.isArray(input.recentSections)
    ? input.recentSections.filter(validSection)
    : [];
  return {
    ...(input.sidebarLayout ? { sidebarLayout: sanitizeSidebarLayout(input.sidebarLayout) } : {}),
    activeSection: validSection(input.activeSection) ? input.activeSection : "dashboard",
    sidebarCollapsed: input.sidebarCollapsed === true,
    density: input.density === "compact" ? ("compact" as const) : ("comfortable" as const),
    recentSections: [...new Set(recent)].slice(0, 8),
    pinnedSections: Array.isArray(input.pinnedSections)
      ? [...new Set(input.pinnedSections.filter(validSection))].slice(0, MAX_PINNED_SECTIONS)
      : DEFAULT_PINNED_SECTIONS,
    closedGroups: Array.isArray(input.closedGroups)
      ? [
          ...new Set(
            input.closedGroups.filter(
              (group): group is string => validGroup(group) && (["Focus", "Growth", "Intelligence", "Operate", "Tools", "Custom"].includes(group) || (input.sidebarLayout ? sanitizeSidebarLayout(input.sidebarLayout).categories.some(c => c.id === group) : false)),
            ),
          ),
        ]
      : ["Growth", "Tools"],
  };
}
