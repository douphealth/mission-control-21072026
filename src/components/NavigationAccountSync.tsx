import { useEffect } from "react";
import { liveQuery } from "dexie";
import { db, type UserSettings } from "@/lib/db";
import { useNavigationStore } from "@/stores/navigationStore";
import { sanitizeNavigation } from "@/lib/navigationPreferences";

const ROW_ID = "navigation";
type Pref = NonNullable<UserSettings["navigationPreference"]>;
const pick = (s: { sidebarLayout?: unknown; pinnedSections: string[]; closedGroups: string[] }) =>
  JSON.stringify({ sidebarLayout: s.sidebarLayout ?? null, pinnedSections: s.pinnedSections, closedGroups: s.closedGroups });

/**
 * Sidebar layout lives in a synced settings row so Google account sync carries
 * it to every device. Newest change wins; local edits are written back.
 */
export default function NavigationAccountSync() {
  useEffect(() => {
    let applied = "";
    let lastAt = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const applyRemote = (pref?: Pref) => {
      if (!pref || !pref.changedAt || pref.changedAt <= lastAt) return;
      lastAt = pref.changedAt;
      const clean = sanitizeNavigation({ ...pref, sidebarLayout: pref.sidebarLayout ?? undefined });
      applied = pick({ sidebarLayout: clean.sidebarLayout, pinnedSections: clean.pinnedSections, closedGroups: clean.closedGroups });
      if (applied === pick(useNavigationStore.getState())) return;
      useNavigationStore.setState({ sidebarLayout: clean.sidebarLayout, pinnedSections: clean.pinnedSections, closedGroups: clean.closedGroups });
    };
    const sub = liveQuery(() => db.settings.get(ROW_ID)).subscribe({
      next: (row) => {
        if (!row?.navigationPreference) {
          // Only a customized device seeds the account copy; fresh devices wait for sync.
          if (!lastAt && useNavigationStore.getState().sidebarLayout) save();
          lastAt = lastAt || "0";
          return;
        }
        applyRemote(row.navigationPreference);
      },
      error: () => undefined,
    });
    function save() {
      const s = useNavigationStore.getState();
      const snapshot = pick(s);
      if (snapshot === applied) return;
      applied = snapshot;
      const changedAt = new Date().toISOString();
      lastAt = changedAt;
      const navigationPreference: Pref = { sidebarLayout: s.sidebarLayout, pinnedSections: s.pinnedSections, closedGroups: s.closedGroups, changedAt };
      void db.settings.put({ id: ROW_ID, navigationPreference } as UserSettings).catch(() => undefined);
    }
    const unsub = useNavigationStore.subscribe((state, prev) => {
      if (state.sidebarLayout === prev.sidebarLayout && state.pinnedSections === prev.pinnedSections && state.closedGroups === prev.closedGroups) return;
      clearTimeout(timer);
      timer = setTimeout(save, 600);
    });
    return () => { sub.unsubscribe(); unsub(); clearTimeout(timer); };
  }, []);
  return null;
}
