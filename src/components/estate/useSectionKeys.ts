import { useEffect, type RefObject } from "react";

const typing = (el: Element | null) =>
  !!el &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    (el as HTMLElement).isContentEditable);

/** `/` focuses the section search, Shift+R refreshes the estate. */
export function useSectionKeys(search: RefObject<HTMLInputElement | null>, refresh: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(document.activeElement)) return;
      if (document.querySelector("[role='dialog']")) return;
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
      } else if (e.key === "R" && e.shiftKey) {
        e.preventDefault();
        refresh();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [search, refresh]);
}
