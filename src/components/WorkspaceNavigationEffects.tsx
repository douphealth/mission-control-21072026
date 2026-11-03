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
    const unsubscribe = useNavigationStore.subscribe((state, previous) => {
      if (state.activeSection === previous.activeSection) return;
      writeLocation(state.activeSection);
      requestAnimationFrame(() => {
        const main = document.getElementById("main-content");
        document.getElementById("workspace-scroll")?.scrollTo({ top: 0, behavior: "instant" });
        if (!document.querySelector('[role="dialog"]')) main?.focus({ preventScroll: true });
      });
    });
    window.addEventListener("popstate", readLocation);
    window.addEventListener("hashchange", readLocation);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", readLocation);
      window.removeEventListener("hashchange", readLocation);
    };
  }, []);
  return null;
}
