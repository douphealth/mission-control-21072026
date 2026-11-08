import { useRef, useState } from "react";
import { Search, X, Star, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AreaSwitch from "@/components/AreaSwitch";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import { sectionCategory } from "@/lib/sidebarLayout";
import SidebarCustomizer from "@/components/SidebarCustomizer";
import { useNavigationStore } from "@/stores/navigationStore";
import { usePlanStore } from "@/stores/planStore";
import { MAX_PINNED_SECTIONS } from "@/lib/navigationPreferences";
import { filterWorkspaces, type WorkspaceSection } from "@/lib/workspaceCatalog";

/** One searchable directory for mobile and desktop; favorites reuse the existing pins. */
export default function WorkspaceDirectory() {
  const { sidebarOpen: open, setSidebarOpen, activeSection, setActiveSection, pinnedSections, togglePinnedSection } = useNavigationStore();
  const { area, setArea } = usePlanStore();
  const { all, layout, visible } = useWorkspaceLayout();
  const [customizing, setCustomizing] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const opener = useRef<HTMLElement | null>(null);
  const navigated = useRef(false);
  const results = filterWorkspaces(visible, query, area === "personal");
  const favorites = pinnedSections.map(id => results.find(item => item.id === id)).filter((item): item is WorkspaceSection => !!item);
  const availableGroups = layout.categories.filter(c => results.some(item => sectionCategory(item, layout) === c.id));
  const unavailablePins = pinnedSections.filter(id => !all.some(item => item.id === id));
  const full = pinnedSections.length >= MAX_PINNED_SECTIONS;
  const close = (next: boolean) => { setSidebarOpen(next); if (!next) { setQuery(""); setGroup("all"); } };
  const navigate = (item: WorkspaceSection) => { navigated.current = true; setActiveSection(item.id); close(false); };

  const row = (item: WorkspaceSection) => {
    const pinned = pinnedSections.includes(item.id);
    const current = activeSection === item.id;
    return <li key={item.id} className="mcn-row" data-group={item.group} data-current={current || undefined}>
      <button type="button" className="mcn-row-main" aria-current={current ? "page" : undefined} onClick={() => navigate(item)}>
        <span className="mcn-icon"><item.icon size={18} /></span>
        <span className="mcn-label">{item.label}</span>
        {current && <span className="mcn-badge">Open</span>}
      </button>
      <button type="button" className="mcn-pin" aria-label={`${pinned ? "Unpin" : "Pin"} ${item.label}`} aria-pressed={pinned} disabled={!pinned && full} title={pinned ? "Remove favorite" : full ? "Favorites full; remove one first" : "Add favorite"} onClick={() => togglePinnedSection(item.id)}>
        <Star size={17} fill={pinned ? "currentColor" : "none"} />
      </button>
    </li>;
  };

  const showTiles = !query && group === "all" && favorites.length > 0;
  return <><SidebarCustomizer open={customizing} onOpenChange={setCustomizing} /><Dialog open={open && !customizing} onOpenChange={close}><DialogContent className="mcn-sheet" onOpenAutoFocus={event => { opener.current = document.activeElement as HTMLElement | null; navigated.current = false; event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); if (!navigated.current && opener.current?.isConnected) opener.current.focus({ preventScroll: true }); else document.getElementById("main-content")?.focus({ preventScroll: true }); }}>
    <header className="mcn-head">
      <div className="mcn-title-row"><DialogTitle className="mcn-title">Menu</DialogTitle><DialogDescription className="sr-only">Choose a section or manage your favorites.</DialogDescription>
        <Button variant="ghost" size="sm" className="mcn-edit" onClick={() => setCustomizing(true)}><SlidersHorizontal size={15} />Customize navigation</Button>
      </div>
      <label className="mcn-search"><Search size={17} aria-hidden="true" /><input aria-label="Find a workspace" placeholder="Search sections…" value={query} onChange={e => { setQuery(e.target.value); setGroup("all"); }} />{query && <button type="button" aria-label="Clear workspace search" onClick={() => setQuery("")}><X size={16} /></button>}</label>
      <div className="mcn-chips" aria-label="Section categories">
        <button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")}>All</button>
        <button type="button" aria-pressed={group === "favorites"} onClick={() => setGroup("favorites")}><Star size={13} />Favorites</button>
        {availableGroups.map(c => <button type="button" key={c.id} aria-pressed={group === c.id} onClick={() => setGroup(c.id)}>{c.label}</button>)}
      </div>
    </header>
    <div className="mcn-scroll">
      {showTiles && <section className="mcn-group"><h3>Favorites</h3><div className="mcn-tiles">{favorites.map(item => <button type="button" key={item.id} className="mcn-tile" data-group={item.group} aria-current={activeSection === item.id ? "page" : undefined} onClick={() => navigate(item)}><span className="mcn-icon"><item.icon size={20} /></span><span>{item.label}</span></button>)}</div></section>}
      {group === "favorites" && <section className="mcn-group"><h3>Favorites<span>{favorites.length}</span></h3>{favorites.length ? <ul>{favorites.map(row)}</ul> : <p className="mcn-empty-note">Tap the star next to any section to add it here.</p>}</section>}
      {group !== "favorites" && layout.categories.filter(c => group === "all" || group === c.id).map(c => { const items = results.filter(item => sectionCategory(item, layout) === c.id); return items.length > 0 && <section key={c.id} aria-label={`${c.id} workspaces`} className="mcn-group"><h3>{c.label}<span>{items.length}</span></h3><ul>{items.map(row)}</ul></section>; })}
      {unavailablePins.length > 0 && <section className="mcn-group"><h3>Unavailable favorites</h3>{unavailablePins.map(id => <Button key={id} variant="outline" size="sm" onClick={() => togglePinnedSection(id)}>Unpin {id.replace(/^custom-/, "")}</Button>)}</section>}
      {results.length === 0 && <div className="mcn-empty"><Search size={26} /><p>No matching sections</p><Button variant="outline" onClick={() => { setQuery(""); setGroup("all"); setArea("all"); }}>Show all sections</Button></div>}
      <div className="mcn-area"><span>Show</span><AreaSwitch compact /></div>
    </div>
  </DialogContent></Dialog></>;
}
