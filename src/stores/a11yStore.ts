// Accessibility & inclusivity preferences — applied globally on <html>.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MotionPref = "system" | "reduced" | "full";

interface A11yState {
  highContrast: boolean;
  fontScale: number; // 1 = 100%
  motion: MotionPref;
  alwaysShowFocus: boolean;
  underlineLinks: boolean;
  set: (patch: Partial<Omit<A11yState, "set" | "reset" | "apply">>) => void;
  reset: () => void;
  apply: () => void;
}

const defaults = {
  highContrast: false,
  fontScale: 1,
  motion: "system" as MotionPref,
  alwaysShowFocus: false,
  underlineLinks: false,
};

function applyToDom(s: typeof defaults) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("a11y-contrast", s.highContrast);
  root.classList.toggle("a11y-reduce-motion", s.motion === "reduced");
  root.classList.toggle("a11y-focus-always", s.alwaysShowFocus);
  root.classList.toggle("a11y-underline-links", s.underlineLinks);
  root.style.setProperty("--a11y-font-scale", String(s.fontScale));
  root.style.fontSize = `${Math.round(16 * s.fontScale)}px`;
}

export const useA11yStore = create<A11yState>()(
  persist(
    (set, get) => ({
      ...defaults,
      set: (patch) => {
        set(patch as any);
        const s = get();
        applyToDom({
          highContrast: s.highContrast,
          fontScale: s.fontScale,
          motion: s.motion,
          alwaysShowFocus: s.alwaysShowFocus,
          underlineLinks: s.underlineLinks,
        });
      },
      reset: () => {
        set(defaults);
        applyToDom(defaults);
      },
      apply: () => {
        const s = get();
        applyToDom({
          highContrast: s.highContrast,
          fontScale: s.fontScale,
          motion: s.motion,
          alwaysShowFocus: s.alwaysShowFocus,
          underlineLinks: s.underlineLinks,
        });
      },
    }),
    {
      name: "mc-a11y-v1",
      partialize: (s) => ({
        highContrast: s.highContrast,
        fontScale: s.fontScale,
        motion: s.motion,
        alwaysShowFocus: s.alwaysShowFocus,
        underlineLinks: s.underlineLinks,
      }),
      onRehydrateStorage: () => (state) => state?.apply(),
    },
  ),
);
