import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";

type View<T> = { name: string; state: T };
/**
 * Device-local, named query and filter presets. No credentials, API results,
 * selected rows, or mutable account resources are written to localStorage.
 */
export default function SavedFilterViews<T>({
  storageKey, state, onApply,
}: {
  storageKey: string;
  state: T;
  onApply: (state: T) => void;
}) {
  const [views, setViews] = useState<View<T>[]>([]);
  const [active, setActive] = useState("");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(raw)) setViews(raw.filter(v =>
        v && typeof v.name === "string" && v.name.length <= 40 && v.state).slice(0,12));
    } catch { setViews([]); }
  }, [storageKey]);
  const commit = (next: View<T>[]) => {
    setViews(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { /* Private browsing: controls continue for this session. */ }
  };
  const save = () => {
    const title = name.trim().slice(0,40);
    if (!title) return;
    const row = { name: title, state: JSON.parse(JSON.stringify(state)) as T };
    commit([...views.filter(v => v.name !== title),row].slice(-12));
    setActive(title); setName(""); setNaming(false);
  };
  return <div className="flex flex-wrap items-center gap-2" aria-label="Saved filter views">
    <select aria-label="Load saved filter view" value={active}
      onChange={e=>{const selected=views.find(v=>v.name===e.target.value);setActive(e.target.value);
        if(selected) onApply(selected.state);}}
      className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
      <option value="">Saved views</option>
      {views.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}
    </select>
    <button type="button" className="btn-secondary text-xs" onClick={()=>setNaming(p=>!p)}>
      <Save size={13}/> Save view
    </button>
    {naming && <form className="flex gap-1" onSubmit={e=>{e.preventDefault();save();}}>
      <input aria-label="View name" maxLength={40} value={name} onChange={e=>setName(e.target.value)}
        placeholder="Name this filter view" required className="w-40 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"/>
      <button className="btn-secondary text-xs" type="submit" disabled={!name.trim()}>Save</button>
    </form>}
    {active && <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500"
      onClick={()=>{commit(views.filter(v=>v.name!==active));setActive("");}} title="Delete selected saved view">
      <Trash2 size={12}/> Remove view
    </button>}
  </div>;
}
