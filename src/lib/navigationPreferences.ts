const validSection = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
export function sanitizeNavigation(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const recent = Array.isArray(input.recentSections) ? input.recentSections.filter(validSection) : [];
  return {
    activeSection: validSection(input.activeSection) ? input.activeSection : "dashboard",
    sidebarCollapsed: input.sidebarCollapsed === true,
    recentSections: [...new Set(recent)].slice(0, 8),
  };
}
