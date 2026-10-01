export type ThemeSelection = "light" | "dark" | "sage" | "system";
export type ResolvedTheme = "light" | "dark" | "sage";

export function resolveTheme(
  theme: ThemeSelection,
  prefersDark: boolean,
): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function nextDayNightTheme(
  resolvedTheme: ResolvedTheme,
): Extract<ThemeSelection, "light" | "dark"> {
  return resolvedTheme === "dark" ? "light" : "dark";
}

export function themeColor(resolvedTheme: ResolvedTheme): string {
  if (resolvedTheme === "dark") return "#0d0f14";
  if (resolvedTheme === "sage") return "#f5f6ef";
  return "#ffffff";
}
