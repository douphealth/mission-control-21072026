import { useRef, useState } from "react";
import { ChevronRight, Layers3, Pin, PinOff, Search, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AreaSwitch from "@/components/AreaSwitch";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import { sectionCategory } from "@/lib/sidebarLayout";
import SidebarCustomizer from "@/components/SidebarCustomizer";
import { useNavigationStore } from "@/stores/navigationStore";
import { usePlanStore } from "@/stores/planStore";
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
  const labelFor = (item: WorkspaceSection) => layout.categories.find(c => c.id === sectionCategory(item, layout))?.label || item.group;
  const unavailablePins = pinnedSections.filter(id => !all.some(item => item.id === id));
  const close = (next: boolean) => { setSidebarOpen(next); if (!next) { setQuery(""); setGroup("all"); } };
  const navigate = (item: WorkspaceSection) => { navigated.current = true; setActiveSection(item.id); close(false); };
  function entries(items: WorkspaceSection[], quick = false) {
    return <div className={`mc-directory-grid ${quick ? "mc-directory-quick" : ""}`}>{items.map(item => <div key={item.id} className="mc-directory-entry" data-group={item.group}>
      <Button variant="ghost" className="mc-directory-item" aria-current={activeSection === item.id ? "page" : undefined} onClick={() => navigate(item)}>
        <span className="mc-directory-icon"><item.icon size={20} /></span><span className="mc-directory-copy"><strong>{item.label}</strong>{!quick && <small>{activeSection === item.id ? "Currently open" : labelFor(item)}</small>}</span>{activeSection === item.id ? <Check className="mc-directory-current" size={16} /> : <ChevronRight className="mc-directory-arrow" size={16} />}
      </Button>
      {!quick && <Button variant="ghost" size="icon" className="mc-directory-pin" aria-label={`${pinnedSections.includes(item.id) ? "Unpin" : "Pin"} ${item.label}`} aria-pressed={pinnedSections.includes(item.id)} disabled={!pinnedSections.includes(item.id) && pinnedSections.length >= 8} title={pinnedSections.includes(item.id) ? "Remove favorite" : pinnedSections.length >= 8 ? "Eight favorites saved; remove one first" : "Add favorite"} onClick={() => togglePinnedSection(item.id)}>{pinnedSections.includes(item.id) ? <PinOff size={16} /> : <Pin size={16} />}</Button>}
    </div>)}</div>;
  }
  return <><SidebarCustomizer open={customizing} onOpenChange={setCustomizing} /><Dialog open={open && !customizing} onOpenChange={close}><DialogContent className="mc-directory mc-directory-v2" onOpenAutoFocus={event => { opener.current = document.activeElement as HTMLElement | null; navigated.current = false; event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); if (!navigated.current && opener.current?.isConnected) opener.current.focus({ preventScroll: true }); else document.getElementById("main-content")?.focus({ preventScroll: true }); }}>
    <div className="mc-directory-head"><div className="mc-directory-eyebrow"><Layers3 size={15} />MISSION CONTROL</div><DialogTitle className="mc-directory-title">Your workspace</DialogTitle><DialogDescription className="sr-only">Choose a section or manage your favorites.</DialogDescription>
      <div className="mc-directory-search-row"><label className="mc-directory-search"><Search size={18} aria-hidden="true" /><input aria-label="Find a workspace" placeholder="Search all sections…" value={query} onChange={e => { setQuery(e.target.value); setGroup("all"); }} />{query && <Button variant="ghost" size="icon" aria-label="Clear workspace search" onClick={() => setQuery("")}><X size={16} /></Button>}</label><AreaSwitch compact /></div>
      <div className="mc-directory-categories" aria-label="Section categories"><Button variant="ghost" aria-pressed={group === "all"} onClick={() => setGroup("all")}>All</Button><Button variant="ghost" aria-pressed={group === "favorites"} onClick={() => setGroup("favorites")}><Pin size={14} />Favorites</Button>{availableGroups.map(c => <Button key={c.id} variant="ghost" aria-pressed={group === c.id} onClick={() => setGroup(c.id)}>{c.label}</Button>)}</div>
    </div>
    <div className="mc-directory-scroll">
      {!query && group === "all" && <section className="mc-directory-group"><h3>Quick access</h3>{entries(results.filter(item => ["github", "cloudflare", "credentials", "family-vault"].includes(item.id)), true)}</section>}
      {!query && group === "all" && favorites.length > 0 && <section className="mc-directory-group"><h3>Favorites<span>{favorites.length}/8</span></h3>{entries(favorites, true)}</section>}
      {group === "favorites" && <section className="mc-directory-group"><h3>Favorites<span>{favorites.length}/8</span></h3>{entries(favorites)}{favorites.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No favorites yet.</p>}</section>}
      {layout.categories.filter(c => group === "all" || group === c.id).map(c => { const g = c.id; const items = results.filter(item => sectionCategory(item, layout) === g); return items.length > 0 && <section key={g} aria-label={`${g} workspaces`} className="mc-directory-group"><h3>{c.label}<span>{items.length}</span></h3>{entries(items)}</section>; })}
      {unavailablePins.length > 0 && <section className="mc-directory-group"><h3>Unavailable favorites</h3>{unavailablePins.map(id => <Button key={id} variant="outline" onClick={() => togglePinnedSection(id)}><PinOff size={14} />Unpin {id.replace(/^custom-/, "")}</Button>)}</section>}
      {results.length === 0 && <div className="mc-directory-empty"><Search size={28} /><h3>No matching sections</h3><Button variant="outline" onClick={() => { setQuery(""); setGroup("all"); setArea("all"); }}>Show all sections</Button></div>}
    </div>
    <div className="mc-directory-footer"><span role="status">{results.length} sections · {pinnedSections.length}/8 favorites</span><Button variant="outline" onClick={() => setCustomizing(true)}>Customize navigation</Button><Button variant="ghost" onClick={() => close(false)}>Done</Button></div>
  </DialogContent></Dialog></>;
}
