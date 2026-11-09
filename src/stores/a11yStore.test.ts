// @vitest-environment jsdom
import { it, expect } from "vitest";
import { useA11yStore } from "./a11yStore";
it("keeps requested reading size and contrast across applying preferences", () => {
  useA11yStore.getState().set({ fontScale: 1.4, highContrast: true });
  useA11yStore.getState().apply();
  expect(document.documentElement.style.getPropertyValue("--a11y-font-scale")).toBe("1.4");
  expect(document.documentElement.classList.contains("a11y-contrast")).toBe(true);
  useA11yStore.getState().reset();
});