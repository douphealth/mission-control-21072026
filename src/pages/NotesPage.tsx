import { useNotes, useAddItem, useUpdateItem, useDeleteItem, useDuplicateItem, useBulkDeleteItems, useBulkPatch } from "@/hooks/useTableData";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  Search,
  Tag,
  ChevronRight,
  CheckSquare,
  Copy,
  ChevronLeft,
  X,
  Download,
  Image,
  FileText,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import type { Note } from "@/lib/db";
import { todayISO } from "@/lib/overdue";

const noteColors = ["blue", "amber", "green", "rose", "purple", "teal"];
const colorMap: Record<string, { border: string; dot: string }> = {
  blue: { border: "border-l-info", dot: "bg-info" },
  amber: { border: "border-l-warning", dot: "bg-warning" },
  green: { border: "border-l-success", dot: "bg-success" },
  rose: { border: "border-l-destructive", dot: "bg-destructive" },
  purple: { border: "border-l-purple-400", dot: "bg-purple-400" },
  teal: { border: "border-l-accent", dot: "bg-accent" },
};

export default function NotesPage() {
  const notes = useNotes();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const duplicateItem = useDuplicateItem();
  const bulkDeleteItems = useBulkDeleteItems();
  const bulkPatch = useBulkPatch();
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const draftDirty = useRef(false);
  const bulk = useBulkActions<(typeof notes)[0]>();

  const selected = notes.find((n) => n.id === selectedId);
  const filtered = notes
    .filter(
      (n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  useEffect(() => {
    if (!selectedId) return;
    const note = notes.find((n) => n.id === selectedId);
    if (!note) return;
    draftDirty.current = false;
    setTitleDraft(note.title);
    setContentDraft(note.content);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId || notes.length === 0) return;
    const first = notes[0];
    setSelectedId(first.id);
    setTitleDraft(first.title);
    setContentDraft(first.content);
  }, [notes, selectedId]);

  useEffect(() => {
    if (!selectedId || !draftDirty.current) return;
    const id = selectedId;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void updateItem<Note>("notes", id, {
        title: titleDraft,
        content: contentDraft,
        updatedAt: todayISO(),
      }).finally(() => setSaveState("saved"));
      draftDirty.current = false;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [selectedId, titleDraft, contentDraft, updateItem]);

  const updateNoteField = useCallback(
    (field: string, value: string | boolean) => {
      if (!selectedId) return;
      void updateItem<Note>("notes", selectedId, {
        [field]: value,
        updatedAt: todayISO(),
      });
    },
    [selectedId, updateItem],
  );

  const addNote = async () => {
    const now = todayISO();
    const id = await addItem<Note>("notes", {
      title: "Untitled Note",
      content: "",
      color: "blue",
      pinned: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    draftDirty.current = false;
    setTitleDraft("Untitled Note");
    setContentDraft("");
    setSelectedId(id);
  };

  const togglePin = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    void updateItem<Note>("notes", id, { pinned: !note.pinned });
  };

  const cd = useConfirmDialog();
  const deleteNote = (id: string) => {
    cd.confirm({
      title: "Delete Note",
      description: "This note will be permanently removed.",
      onConfirm: () => {
        const remaining = notes.filter((n) => n.id !== id);
        void deleteItem("notes", id);
        if (selectedId === id) {
          const next = remaining[0];
          setSelectedId(next?.id ?? null);
          setTitleDraft(next?.title ?? "");
          setContentDraft(next?.content ?? "");
        }
      },
    });
  };

  const duplicateNote = async (id: string) => {
    const newId = await duplicateItem("notes", id);
    if (newId) {
      toast.success("Note duplicated");
      setSelectedId(newId);
    }
  };

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    cd.confirm({
      title: `Delete ${bulk.selectedCount} Note(s)`,
      description: `This will permanently remove ${bulk.selectedCount} notes.`,
      onConfirm: () => {
        const remaining = notes.filter((n) => !bulk.selectedIds.has(n.id));
        void bulkDeleteItems("notes", Array.from(bulk.selectedIds));
        if (bulk.selectedIds.has(selectedId || "")) {
          const next = remaining[0];
          setSelectedId(next?.id ?? null);
          setTitleDraft(next?.title ?? "");
          setContentDraft(next?.content ?? "");
        }
        toast.success(`${bulk.selectedCount} notes deleted`);
        bulk.clearSelection();
      },
    });
  }, [bulk, notes, bulkDeleteItems, selectedId, cd]);

  const bulkTogglePin = useCallback(() => {
    const selectedNotes = notes.filter((n) => bulk.selectedIds.has(n.id));
    void Promise.all(
      selectedNotes.map((n) => bulkPatch("notes", [n.id], { pinned: !n.pinned })),
    );
    toast.success(`${bulk.selectedCount} notes toggled pin`);
    bulk.clearSelection();
  }, [bulk, notes, bulkPatch]);

  // On mobile: show list OR editor, never both
  const showEditor = isMobile ? !!selectedId && !bulk.bulkMode : true;
  const showList = isMobile ? !selectedId || bulk.bulkMode : true;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <PageHeader
        icon={FileText}
        eyebrow="Capture"
        title="Notes"
        tone="amber"
        subtitle="Quick thoughts, drafts and reference. Searchable and always saved."
        stats={[
          { label: "Notes", value: notes.length },
          { label: "Pinned", value: notes.filter((n) => n.pinned).length, tone: "amber" },
        ]}
        actions={
          <>
            <button
              onClick={bulk.toggleBulkMode}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation ${bulk.bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`}
            >
              <CheckSquare size={14} /> {bulk.bulkMode ? "Cancel" : "Bulk"}
            </button>
            <button
              onClick={addNote}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20 touch-manipulation"
            >
              <Plus size={15} /> <span className="hidden sm:inline">New</span> Note
            </button>
          </>
        }
      />

      {bulk.bulkMode && (
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          totalCount={filtered.length}
          onSelectAll={() => bulk.selectAll(filtered)}
          allSelected={bulk.selectedCount === filtered.length && filtered.length > 0}
          onDelete={bulkDelete}
          dropdowns={[]}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4" style={{ minHeight: 420 }}>
        {/* Note list */}
        {showList && (
          <div className="space-y-2">
            <div className="flex items-center bg-secondary rounded-xl px-3 py-2.5 gap-2">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground touch-manipulation"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-[520px] sm:max-h-[460px] overflow-y-auto pr-1">
              {filtered.map((note) => {
                const c = colorMap[note.color] || colorMap.blue;
                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      if (bulk.bulkMode) {
                        bulk.toggleSelect(note.id);
                        return;
                      }
                      draftDirty.current = false;
                      setTitleDraft(note.title);
                      setContentDraft(note.content);
                      setSelectedId(note.id);
                    }}
                    className={`w-full text-left card-elevated p-3.5 border-l-[3px] ${c.border} transition-all touch-manipulation active:scale-[0.98] ${bulk.isSelected(note.id) ? "ring-1 ring-primary/30 border-primary/50" : selectedId === note.id && !bulk.bulkMode ? "ring-1 ring-primary/30 bg-primary/5" : "hover:bg-secondary/50"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {bulk.bulkMode && (
                        <div className="mr-1">
                          {bulk.isSelected(note.id) ? (
                            <CheckSquare size={14} className="text-primary" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded border border-muted-foreground/30" />
                          )}
                        </div>
                      )}
                      {note.pinned && <Pin size={10} className="text-warning flex-shrink-0" />}
                      <span className="text-sm font-medium text-card-foreground truncate flex-1">
                        {note.title}
                      </span>
                      {!bulk.bulkMode && (
                        <ChevronRight
                          size={12}
                          className="text-muted-foreground/40 flex-shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {note.content.slice(0, 80) || "Empty note..."}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground/60">{note.updatedAt}</span>
                      {note.tags.length > 0 && (
                        <div className="flex gap-1">
                          {note.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <EmptyState
                  compact
                  icon={FileText}
                  tone="amber"
                  title="No notes found"
                  description="Try a different search, or start a new note."
                />
              )}
            </div>
          </div>
        )}

        {/* Note editor */}
        {!bulk.bulkMode && showEditor && (
          <div className={`lg:col-span-2 card-elevated p-4 sm:p-5 flex flex-col`}>
            {selected ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden p-2 rounded-xl hover:bg-secondary text-muted-foreground touch-manipulation"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <input
                    value={titleDraft}
                    onChange={(e) => {
                      draftDirty.current = true;
                      setTitleDraft(e.target.value);
                    }}
                    className="text-lg sm:text-xl font-bold text-card-foreground bg-transparent outline-none flex-1 min-w-0"
                    placeholder="Note title..."
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => togglePin(selected.id)}
                      className={`p-2 rounded-xl hover:bg-secondary transition-colors touch-manipulation ${selected.pinned ? "text-warning" : "text-muted-foreground"}`}
                    >
                      {selected.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                    </button>
                    <button
                      onClick={() => duplicateNote(selected.id)}
                      className="p-2 rounded-xl hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors touch-manipulation"
                      title="Duplicate"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => deleteNote(selected.id)}
                      className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {selected.attachmentDataUrl && (
                  <div className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-card-foreground">
                        {selected.attachmentMimeType?.startsWith("image/") ? <Image size={15} /> : <FileText size={15} />}
                        <span className="truncate">{selected.attachmentName || "Attached file"}</span>
                      </div>
                      <a href={selected.attachmentDataUrl} download={selected.attachmentName || "attachment"} className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90">
                        <Download size={13} /> Open / save
                      </a>
                    </div>
                    {selected.attachmentMimeType?.startsWith("image/") && <img src={selected.attachmentDataUrl} alt={selected.attachmentName || "Uploaded image"} className="max-h-72 w-full rounded-xl object-contain bg-background/60" />}
                  </div>
                )}
                <textarea
                  value={contentDraft}
                  onChange={(e) => {
                    draftDirty.current = true;
                    setSaveState("saving");
                    setContentDraft(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                      e.preventDefault();
                      if (!selectedId) return;
                      setSaveState("saving");
                      void updateItem<Note>("notes", selectedId, {
                        title: titleDraft,
                        content: contentDraft,
                        updatedAt: todayISO(),
                      }).finally(() => {
                        draftDirty.current = false;
                        setSaveState("saved");
                        toast.success("Note saved");
                      });
                    }
                  }}
                  className="flex-1 bg-transparent text-sm text-card-foreground outline-none resize-none leading-relaxed min-h-[300px]"
                  placeholder="Start writing..."
                />
                <div className="flex items-center justify-between pt-3 border-t border-border mt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {contentDraft.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                      {saveState === "saving" ? "Saving…" : "Saved"} · Updated {selected.updatedAt}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {noteColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateNoteField("color", c)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all touch-manipulation ${selected.color === c ? "border-foreground scale-110" : "border-transparent hover:scale-110"} ${colorMap[c]?.dot}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-4">
                <EmptyState
                  bare
                  icon={FileText}
                  tone="amber"
                  title="Select a note or start a new one"
                  description="Notes save as you type, so nothing is lost."
                  action={
                    <button onClick={addNote} className="btn-primary text-sm touch-manipulation">
                      <Plus size={13} /> New note
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
