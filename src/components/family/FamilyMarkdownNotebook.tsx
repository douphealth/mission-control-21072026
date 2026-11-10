import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Copy, Download, FilePlus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FAMILY_MARKDOWN_MAX_BYTES, deleteFamilyMarkdownNote, readFamilyMarkdownNotes, saveFamilyMarkdownNote, type FamilyMarkdownNote } from "@/lib/privateVault";

function created(): FamilyMarkdownNote {
  const time = new Date().toISOString();
  return { id: crypto.randomUUID(), title: "New document", member: "", markdown: "", createdAt: time, updatedAt: time };
}
function safeInline(source: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\x60[^\x60\n]+\x60|\[[^\]\n]+\]\([^)]+\))/g;
  let start = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > start) result.push(source.slice(start, match.index));
    const token = match[0];
    if (token.startsWith("**")) result.push(<strong key={match.index}>{token.slice(2,-2)}</strong>);
    else if (token.startsWith("*")) result.push(<em key={match.index}>{token.slice(1,-1)}</em>);
    else if (token.charCodeAt(0) === 96) result.push(<code key={match.index} className="rounded bg-muted px-1 font-mono">{token.slice(1,-1)}</code>);
    else {
      const target = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const destination = target?.[2] || "";
      const safe = /^(https?:\/\/|mailto:)/i.test(destination);
      result.push(target && safe ? <a key={match.index} href={destination} target="_blank" rel="noopener noreferrer" className="text-primary underline">{target[1]}</a> : token);
    }
    start = match.index + token.length;
  }
  if (start < source.length) result.push(source.slice(start));
  return result;
}
/** Safe preview: React escapes all untrusted Markdown instead of interpreting HTML. */
export function MarkdownPreview({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  let fenced = false;
  return <div className="space-y-2 break-words text-sm leading-7">{lines.map((line, i) => {
    if (line.trim().startsWith("~~~")) { fenced = !fenced; return <div key={i} className="border-t border-border"/>; }
    if (fenced) return <pre key={i} className="overflow-x-auto bg-muted px-3 font-mono text-xs">{line}</pre>;
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) return <div key={i} className={heading[1].length < 3 ? "pt-4 text-xl font-bold" : "pt-3 text-base font-semibold"}>{safeInline(heading[2])}</div>;
    if (/^\s*[-*+]\s+/.test(line)) return <div key={i} className="flex gap-2 pl-2"><span className="text-primary">•</span><span>{safeInline(line.replace(/^\s*[-*+]\s+/, ""))}</span></div>;
    if (/^\s*\d+\.\s+/.test(line)) return <div key={i} className="pl-2">{line}</div>;
    if (/^\s*>/.test(line)) return <blockquote key={i} className="border-l-4 border-primary/40 bg-muted/40 px-4 py-2 italic">{safeInline(line.replace(/^\s*>\s?/, ""))}</blockquote>;
    if (/^\s*---+\s*$/.test(line)) return <hr key={i}/>;
    if (!line.trim()) return <div key={i} className="h-2"/>;
    return <p key={i} className="whitespace-pre-wrap">{safeInline(line)}</p>;
  })}</div>;
}
export default function FamilyMarkdownNotebook() {
  const [notes,setNotes] = useState<FamilyMarkdownNote[]>([]);
  const [draft,setDraft] = useState<FamilyMarkdownNote|null>(null);
  const [state,setState] = useState<"saved"|"dirty"|"saving"|"error">("saved");
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [mode,setMode] = useState<"edit"|"split"|"preview">("split");
  const [deleting,setDeleting] = useState(false);
  const latest=useRef<FamilyMarkdownNote|null>(null);
  const lastSaved=useRef<FamilyMarkdownNote|null>(null);
  const queue=useRef<Promise<void>>(Promise.resolve());
  const file=useRef<HTMLInputElement>(null);
  useEffect(()=>{void readFamilyMarkdownNotes().then(setNotes, e=>setError(String(e)));},[]);
  const filtered=useMemo(()=>notes.filter(n=>[n.title,n.member,n.markdown].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())),[notes,query]);
  const update=(next:FamilyMarkdownNote)=>{latest.current=next;setDraft(next);setState("dirty");};
  const save=async()=>{
    const run=async()=>{
      const n=latest.current;
      if(!n)return;
      if(lastSaved.current && n.title===lastSaved.current.title && n.member===lastSaved.current.member && n.markdown===lastSaved.current.markdown){setState("saved");return;}
      setState("saving");
      try{
        const next={...n,updatedAt:new Date().toISOString()};
        await saveFamilyMarkdownNote(next,lastSaved.current?.updatedAt??null);
        lastSaved.current=next;
        setNotes(old=>[next,...old.filter(x=>x.id!==next.id)].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
        if(latest.current===n){latest.current=next;setDraft(next);setState("saved");} else setState("dirty");
        setError("");
      }catch(e){setError(e instanceof Error?e.message:String(e));setState("error");}
    };
    queue.current=queue.current.then(run,run);
    await queue.current;
  };
  useEffect(()=>{if(state!=="dirty")return;const t=setTimeout(()=>void save(),800);return()=>clearTimeout(t);},[draft,state]);
  const select=async(note:FamilyMarkdownNote)=>{
    if(state==="error"){toast.error("Save your draft before switching documents.");return false;}
    if(latest.current && state!=="saved"){await save();await queue.current;if(!lastSaved.current || lastSaved.current.id!==latest.current.id){toast.error("Unsaved changes; document not switched.");return false;}}
    latest.current=note;lastSaved.current=notes.some(x=>x.id===note.id)?note:null;setDraft(note);setState(lastSaved.current?"saved":"dirty");setError("");return true;
  };
  const add=()=>void select(created());
  const importMarkdown=async(input:File)=>{
    if(input.size>FAMILY_MARKDOWN_MAX_BYTES){toast.error("Maximum Markdown file size is 1 MB.");return;}
    const body=await input.text();const next={...created(),title:input.name.replace(/\.markdown$|\.md$/i,"").slice(0,160)||"Imported Markdown",markdown:body};
    if(await select(next))toast.success("Markdown imported into the encrypted notebook.");
  };
  const exportMarkdown=()=>{
    if(!draft)return;
    const blob=new Blob([draft.markdown],{type:"text/markdown;charset=utf-8"}),url=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=url;link.download=draft.title.replace(/[^a-zA-Z0-9._ -]/g,"_")+".md";link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    toast.message("Downloaded Markdown is unencrypted. Store it securely.");
  };
  return <section className="space-y-4" aria-label="Family Markdown notebook">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen className="text-primary"/>Markdown documents</h2><p className="text-sm text-muted-foreground">Free-form notes in an encrypted notebook. Stored on this device.</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>file.current?.click()}><Upload className="size-4"/>Import MD</Button><Button onClick={add}><FilePlus className="size-4"/>New document</Button></div></header>
    <input ref={file} type="file" accept=".md,.markdown,text/plain" className="hidden" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void importMarkdown(f);}}/>
    <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-2xl border bg-card p-3"><label className="flex items-center gap-2 rounded-xl border bg-background px-3"><Search className="size-4 text-muted-foreground"/><input aria-label="Search Markdown documents" className="h-11 w-full min-w-0 bg-transparent text-sm outline-none" placeholder="Search documents" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">{filtered.map(n=><button type="button" key={n.id} aria-current={draft?.id===n.id?"page":undefined} onClick={()=>void select(n)} className={"w-full rounded-xl p-3 text-left hover:bg-muted "+(draft?.id===n.id?"bg-primary/10":"")}><span className="block truncate font-semibold">{n.title}</span><span className="text-xs text-muted-foreground">{n.member||"Family"} · {new Date(n.updatedAt).toLocaleDateString()}</span></button>)}{!filtered.length&&<p className="p-4 text-center text-sm text-muted-foreground">No documents found.</p>}</div></aside>
      <div className="min-w-0 overflow-hidden rounded-2xl border bg-card">{draft?<><div className="space-y-3 border-b p-4"><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]"><input aria-label="Document title" className="h-11 min-w-0 rounded-xl border bg-background px-3 font-semibold" value={draft.title} maxLength={160} onChange={e=>update({...draft,title:e.target.value})}/><input aria-label="Family member" placeholder="Member / group" className="h-11 min-w-0 rounded-xl border bg-background px-3" value={draft.member} maxLength={160} onChange={e=>update({...draft,member:e.target.value})}/></div><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex rounded-xl bg-muted p-1">{(["edit","split","preview"] as const).map(m=><button key={m} type="button" aria-pressed={mode===m} onClick={()=>setMode(m)} className={"rounded-lg px-3 py-1.5 text-sm capitalize "+(mode===m?"bg-background shadow":"")}>{m}</button>)}</div><div className="flex flex-wrap items-center gap-2"><span role="status" className="text-xs text-muted-foreground">{state==="saved"?"Saved encrypted":state==="saving"?"Saving…":state==="dirty"?"Unsaved":"Save failed"}</span><Button size="sm" variant="outline" disabled={state==="saved"||state==="saving"} onClick={()=>void save()}>Save</Button><Button size="icon" variant="ghost" aria-label="Copy Markdown" onClick={()=>void navigator.clipboard.writeText(draft.markdown).then(()=>toast.success("Copied"),()=>toast.error("Clipboard unavailable"))}><Copy className="size-4"/></Button><Button size="icon" variant="ghost" aria-label="Download plaintext Markdown" title="Download unencrypted Markdown" onClick={exportMarkdown}><Download className="size-4"/></Button><Button size="icon" variant="ghost" className="text-destructive" aria-label="Delete Markdown document" onClick={()=>setDeleting(true)}><Trash2 className="size-4"/></Button></div></div>{error&&<p role="alert" className="text-sm text-destructive">{error} Your unsaved text is still in the editor.</p>}</div><div className={"grid min-h-[440px] "+(mode==="split"?"md:grid-cols-2":"grid-cols-1")}>{mode!=="preview"&&<div className="min-w-0 p-4"><p className="mb-2 text-xs font-semibold text-muted-foreground">MARKDOWN SOURCE</p><textarea aria-label="Markdown editor" spellCheck className="min-h-[380px] w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm leading-7 outline-none focus:ring-2 focus:ring-primary/20" placeholder={"# Important information\n\n## Notes\n- Add anything you want"} value={draft.markdown} onChange={e=>update({...draft,markdown:e.target.value})}/></div>}{mode!=="edit"&&<div className="min-w-0 p-5"><p className="mb-3 text-xs font-semibold text-muted-foreground">FORMATTED PREVIEW</p><MarkdownPreview source={draft.markdown}/></div>}</div><footer className="border-t p-3 text-xs text-muted-foreground">Encrypted local storage · Markdown export is plaintext · Existing family records are unchanged.</footer></>:<div className="flex min-h-[440px] flex-col items-center justify-center gap-3 p-8 text-center"><BookOpen className="size-10 text-primary/50"/><h3 className="text-lg font-semibold">Your family notebook</h3><p className="max-w-sm text-sm text-muted-foreground">Create flexible documents for family information, school details, health notes and anything else.</p><Button onClick={add}>Create your first document</Button></div>}</div>
    </div>
    <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete this document?" description="This removes the local encrypted document. Keep a vault backup for recovery." onConfirm={async()=>{if(!draft)return;try{await queue.current;await deleteFamilyMarkdownNote(draft.id,lastSaved.current?.updatedAt??draft.updatedAt);setNotes(old=>old.filter(n=>n.id!==draft.id));latest.current=null;lastSaved.current=null;setDraft(null);setState("saved");toast.success("Document deleted");}catch(e){toast.error(String(e));}}}/>
  </section>;
}
