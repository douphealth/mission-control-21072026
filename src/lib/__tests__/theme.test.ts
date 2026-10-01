import { describe, expect, it } from "vitest";
import { nextDayNightTheme, resolveTheme, themeColor } from "@/lib/theme";

describe("theme resolution", () => {
  it("resolves explicit themes without depending on OS preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("sage", true)).toBe("sage");
  });

  it("tracks the operating system when system theme is selected", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("toggles day and night deterministically", () => {
    expect(nextDayNightTheme("dark")).toBe("light");
    expect(nextDayNightTheme("light")).toBe("dark");
    expect(nextDayNightTheme("sage")).toBe("dark");
  });

  it("provides mobile browser chrome colors for every resolved theme", () => {
    expect(themeColor("dark")).toBe("#0d0f14");
    expect(themeColor("light")).toBe("#ffffff");
    expect(themeColor("sage")).toBe("#f5f6ef");
  });
});
