import { useEffect } from "react";
import { useNavigationStore } from "@/stores/navigationStore";
import { sectionFromHash, workspaceById } from "@/lib/workspaceCatalog";

/** Section links are bookmarkable; history and keyboard focus follow navigation. */
export default function WorkspaceNavigationEffects() {
  useEffect(() => {
    const readLocation = () => {
      const section = sectionFromHash(window.location.hash);
      if (section && section !== useNavigationStore.getState().activeSection)
        useNavigationStore.getState().setActiveSection(section);
    };
    readLocation();
    const writeLocation = (section: string, replace = false) => {
      const hash = `#section=${section}`;
      if (
        !window.location.hash ||
        window.location.hash === "#main-content" ||
        window.location.hash.startsWith("#section=")
      ) {
        if (window.location.hash !== hash) {
          const url = `${window.location.pathname}${window.location.search}${hash}`;
          if (replace) window.history.replaceState(window.history.state, "", url);
          else window.history.pushState(window.history.state, "", url);
        }
      }
      document.title = `${workspaceById(section)?.label ?? "Workspace"} · Mission Control`;
    };
    writeLocation(useNavigationStore.getState().activeSection, true);
    const positions = new Map<string, number>();
    const scroller = document.getElementById("workspace-scroll");
    let restoring = false;
    let cancelRestore = () => {};
    const record = () => { if (!restoring && scroller) positions.set(useNavigationStore.getState().activeSection, scroller.scrollTop); };
    scroller?.addEventListener("scroll", record, { passive: true });
    const unsubscribe = useNavigationStore.subscribe((state, previous) => {
      if (state.activeSection === previous.activeSection) return;
      writeLocation(state.activeSection);
      cancelRestore();
      const target = positions.get(state.activeSection) ?? 0;
      restoring = true;
      const restore = () => scroller?.scrollTo({ top: target, behavior: "instant" });
      const observer = new ResizeObserver(restore);
      const content = document.getElementById("main-content");
      if (content) observer.observe(content);
      const timer = window.setTimeout(() => { observer.disconnect(); restoring = false; }, 1800);
      const stop = () => { observer.disconnect(); window.clearTimeout(timer); restoring = false; };
      scroller?.addEventListener("touchstart", stop, { once: true, passive: true });
      scroller?.addEventListener("wheel", stop, { once: true, passive: true });
      cancelRestore = () => { stop(); scroller?.removeEventListener("touchstart", stop); scroller?.removeEventListener("wheel", stop); };
      requestAnimationFrame(() => {
        const main = document.getElementById("main-content");
        restore();
        if (!document.querySelector('[role="dialog"]')) main?.focus({ preventScroll: true });
      });
    });
    window.addEventListener("popstate", readLocation);
    window.addEventListener("hashchange", readLocation);
    return () => {
      unsubscribe();
      cancelRestore();
      scroller?.removeEventListener("scroll", record);
      window.removeEventListener("popstate", readLocation);
      window.removeEventListener("hashchange", readLocation);
    };
  }, []);
  return null;
}
