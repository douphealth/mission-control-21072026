import { MAX_PINNED_SECTIONS } from "@/lib/navigationPreferences";
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pin, PinOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import { useNavigationStore } from "@/stores/navigationStore";
import { moveSection, orderedSections, removeCategory, sectionCategory } from "@/lib/sidebarLayout";
import { WORKSPACE_GROUPS } from "@/lib/workspaceCatalog";

export default function SidebarCustomizer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { all, layout } = useWorkspaceLayout();
  const { setSidebarLayout: save, pinnedSections, setPinnedSections, resetSidebarLayout } = useNavigationStore();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const sections = orderedSections(all, layout, true);
  const addCategory = () => {
    if (!name.trim()) return;
    save({ ...layout, categories: [...layout.categories, { id: `category-${crypto.randomUUID()}`, label: name.trim() }] });
    setName("");
  };
  const moveCategory = (index: number, direction: number) => {
    const categories = [...layout.categories];
    const other = categories[index + direction];
    if (!other) return;
    categories[index + direction] = categories[index]; categories[index] = other;
    save({ ...layout, categories });
  };
  const move = (id: string, category: string, before?: string) => {
    save(moveSection(layout, all, id, category, before));
    setPinnedSections(pinnedSections.filter(pin => pin !== id));
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="mc-nav-editor">
    <header className="mc-nav-editor-head"><DialogTitle>Customize navigation</DialogTitle><DialogDescription>Changes save automatically on this browser. Hiding a section never deletes its data.</DialogDescription>
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); addCategory(); }}>
        <input aria-label="New category name" placeholder="New category name" maxLength={80} value={name} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <Button type="submit" disabled={!name.trim()}><Plus size={16} />Add category</Button>
      </form>
      <input aria-label="Search navigation sections" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
    </header>
    <div className="mc-nav-editor-scroll">
      {layout.categories.map((category, index) => {
        const members = sections.filter(s => sectionCategory(s, layout) === category.id);
        const filtered = members.filter(s => s.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
        if (query && !filtered.length) return null;
        return <section key={category.id} className="mc-nav-editor-category" aria-label={`${category.label} category`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragged) move(dragged, category.id); setDragged(null); }}>
          <div className="mc-nav-editor-category-head">
            <input aria-label={`Rename ${category.label} category`} maxLength={80} defaultValue={category.label} key={`${category.id}-${category.label}`} onBlur={e => { const label = e.target.value.trim(); if (label && label !== category.label) save({ ...layout, categories: layout.categories.map(c => c.id === category.id ? { ...c, label } : c) }); else e.target.value = category.label; }} />
            <span className="text-xs text-muted-foreground">{members.length}</span>
            <Button variant="ghost" size="icon" aria-label={`Move ${category.label} category up`} title="Move category up" disabled={index === 0} onClick={() => moveCategory(index, -1)}><ArrowUp size={16} /></Button>
            <Button variant="ghost" size="icon" aria-label={`Move ${category.label} category down`} title="Move category down" disabled={index === layout.categories.length - 1} onClick={() => moveCategory(index, 1)}><ArrowDown size={16} /></Button>
            {!WORKSPACE_GROUPS.some(g => g === category.id) && <Button variant="ghost" size="icon" aria-label={`Delete ${category.label} category`} title="Delete category; sections return to their original categories" onClick={() => save(removeCategory(layout, category.id))}><Trash2 size={16} /></Button>}
          </div>
          {filtered.map(item => {
            const position = members.findIndex(s => s.id === item.id);
            const hidden = layout.hiddenSections.includes(item.id);
            const pinned = pinnedSections.includes(item.id);
            return <div key={item.id} className="mc-nav-editor-row" data-hidden={hidden} draggable onDragStart={e => { setDragged(item.id); e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragged(null)} onDrop={e => { e.stopPropagation(); e.preventDefault(); if (dragged) move(dragged, category.id, item.id); setDragged(null); }}>
              <GripVertical size={16} className="text-muted-foreground" aria-hidden="true" />
              <item.icon size={18} className="text-primary" /><span className="mc-nav-editor-name">{item.label}{pinned && <small>Pinned</small>}{hidden && <small>Hidden</small>}</span>
              <select aria-label={`Category for ${item.label}`} value={category.id} onChange={e => move(item.id, e.target.value)}>{layout.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
              <div className="mc-nav-editor-actions">
                <Button variant="ghost" size="icon" aria-label={`Move ${item.label} up`} title="Move section up" disabled={position === 0} onClick={() => move(item.id, category.id, members[position - 1]?.id)}><ArrowUp size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={`Move ${item.label} down`} title="Move section down" disabled={position === members.length - 1} onClick={() => { const next = members[position + 1]; if (next) { save(moveSection(layout, all, next.id, category.id, item.id)); setPinnedSections(pinnedSections.filter(pin => pin !== item.id && pin !== next.id)); } }}><ArrowDown size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={`${pinned ? "Unpin" : "Pin"} ${item.label}`} title={pinned ? "Unpin section" : "Pin section"} disabled={!pinned && pinnedSections.length >= MAX_PINNED_SECTIONS} onClick={() => setPinnedSections(pinned ? pinnedSections.filter(id => id !== item.id) : [...pinnedSections, item.id])}>{pinned ? <PinOff size={16} /> : <Pin size={16} />}</Button>
                <Button variant="ghost" size="icon" aria-label={`${hidden ? "Show" : "Hide"} ${item.label}`} title={hidden ? "Show section" : "Hide section"} onClick={() => save({ ...layout, hiddenSections: hidden ? layout.hiddenSections.filter(id => id !== item.id) : [...layout.hiddenSections, item.id] })}>{hidden ? <EyeOff size={16} /> : <Eye size={16} />}</Button>
              </div>
            </div>;
          })}
          {!members.length && <p className="py-3 text-sm text-muted-foreground">No sections</p>}
        </section>;
      })}
    </div>
    <footer className="mc-nav-editor-footer">
      {confirmReset ? <><span className="text-sm">Restore default navigation?</span><Button variant="destructive" onClick={() => { resetSidebarLayout(); setConfirmReset(false); }}>Restore</Button><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button></> : <Button variant="ghost" onClick={() => setConfirmReset(true)}><RotateCcw size={16} />Restore defaults</Button>}
      <Button className="ml-auto" onClick={() => onOpenChange(false)}>Done</Button>
    </footer>
  </DialogContent></Dialog>;
}