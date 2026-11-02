import { useEffect } from "react";
import { useNavigationStore } from "@/stores/navigationStore";

/** Second key after `g` → section. Kept small so it is easy to remember. */
export const GO_SHORTCUTS: Record<string, { section: string; label: string }> = {
  g: { section: "github", label: "GitHub" },
  c: { section: "cloudflare", label: "Cloudflare" },
  h: { section: "dashboard", label: "Today" },
  t: { section: "tasks", label: "Tasks" },
};

const typing = (el: Element | null) =>
  !!el &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    (el as HTMLElement).isContentEditable);

/** Vim-style `g` then a letter to jump between sections. */
export function useGoShortcuts() {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  useEffect(() => {
    let armedAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || typing(document.activeElement))
        return;
      if (document.querySelector("[role='dialog']")) return;
      const key = e.key.toLowerCase();
      if (armedAt && Date.now() - armedAt < 1200) {
        armedAt = 0;
        const target = GO_SHORTCUTS[key];
        if (target) {
          e.preventDefault();
          setActiveSection(target.section);
        }
        return;
      }
      if (key === "g") armedAt = Date.now();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setActiveSection]);
}
