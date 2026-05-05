import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Plus, RotateCcw, Trash2, Download, Upload, Pencil, X, Check, Loader2, Cloud, HardDrive, Smartphone, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
    listVersions, saveVersion, restoreVersion, deleteVersion, renameVersion,
    downloadVersionFile, importVersionFile, getDeviceLabel, setDeviceLabel,
    SNAPSHOTS_SCHEMA_SQL, type SnapshotMeta,
} from '@/lib/versions';
import { isSupabaseConnected } from '@/lib/supabase';

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

function fmtSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function VersionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [versions, setVersions] = useState<SnapshotMeta[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [savingNew, setSavingNew] = useState(false);
    const [name, setName] = useState('');
    const [renaming, setRenaming] = useState<string | null>(null);
    const [renameVal, setRenameVal] = useState('');
    const [device, setDevice] = useState(getDeviceLabel());
    const [confirmRestore, setConfirmRestore] = useState<SnapshotMeta | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const cloud = isSupabaseConnected();

    const refresh = async () => {
        setLoading(true);
        try { setVersions(await listVersions()); }
        catch (e: any) { toast.error(e?.message || 'Could not load versions'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (open) void refresh(); }, [open]);

    const handleSave = async () => {
        setSavingNew(true);
        try {
            const meta = await saveVersion({ name, type: 'manual' });
            toast.success(`Saved "${meta.name}"`);
            setName('');
            await refresh();
        } catch (e: any) {
            toast.error(e?.message || 'Save failed');
        } finally { setSavingNew(false); }
    };

    const handleRestore = async (v: SnapshotMeta) => {
        setBusyId(v.id);
        try {
            const r = await restoreVersion(v.id);
            toast.success(`Restored ${r.restored} items from "${v.name}"`);
            setConfirmRestore(null);
            await refresh();
        } catch (e: any) {
            toast.error(e?.message || 'Restore failed');
        } finally { setBusyId(null); }
    };

    const handleDelete = async (v: SnapshotMeta) => {
        setBusyId(v.id);
        try { await deleteVersion(v.id); await refresh(); toast.success('Deleted'); }
        catch (e: any) { toast.error(e?.message || 'Delete failed'); }
        finally { setBusyId(null); }
    };

    const handleRename = async (v: SnapshotMeta) => {
        if (!renameVal.trim()) { setRenaming(null); return; }
        try { await renameVersion(v.id, renameVal); toast.success('Renamed'); }
        catch (e: any) { toast.error(e?.message || 'Rename failed'); }
        setRenaming(null);
        await refresh();
    };

    const handleImport = async (file: File) => {
        try { const m = await importVersionFile(file); toast.success(`Imported "${m.name}"`); await refresh(); }
        catch (e: any) { toast.error(e?.message || 'Import failed'); }
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
                                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-[var(--shadow-primary)]">
                                    <History size={18} className="text-primary-foreground" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold text-foreground">Versions</h2>
                                    <p className="text-xs text-muted-foreground/80">Save, restore, and sync versions of all your data — across every device.</p>
                                </div>
                                <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Status + device */}
                            <div className="px-6 py-3 flex flex-wrap items-center gap-3 text-xs border-b border-border/30 bg-secondary/20">
                                <span className={`flex items-center gap-1.5 ${cloud ? 'text-success' : 'text-muted-foreground'}`}>
                                    {cloud ? <Cloud size={13} /> : <HardDrive size={13} />}
                                    {cloud ? 'Cloud sync · versions are available on every device' : 'Local-only · connect Cloud Sync to share versions across devices'}
                                </span>
                                <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                                    <Smartphone size={13} />
                                    <input
                                        value={device}
                                        onChange={e => { setDevice(e.target.value); setDeviceLabel(e.target.value); }}
                                        className="bg-transparent border-b border-border/40 focus:border-primary outline-none text-xs px-1 max-w-[140px]"
                                        title="This device's name (used to label versions)"
                                    />
                                </div>
                            </div>

                            {/* Save new */}
                            <div className="px-6 py-4 border-b border-border/30 flex flex-col sm:flex-row gap-2">
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                    placeholder='Name this version (optional) — e.g. "Before reorg"'
                                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border/50 focus:border-primary outline-none text-sm"
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={savingNew}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-[var(--shadow-primary)] hover:opacity-95 disabled:opacity-50"
                                >
                                    {savingNew ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Save version
                                </button>
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm"
                                    title="Import a .mcversion.json file"
                                >
                                    <Upload size={14} /> Import
                                </button>
                                <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void handleImport(f); e.currentTarget.value = ''; }} />
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-auto">
                                {loading ? (
                                    <div className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
                                ) : versions.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground text-sm">
                                        <Sparkles className="mx-auto mb-3 opacity-50" />
                                        No versions yet. Click <b>Save version</b> above — or just keep editing, auto-snapshots run in the background.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-border/30">
                                        {versions.map(v => {
                                            const total = Object.values(v.counts || {}).reduce((a, b) => a + b, 0);
                                            const isRen = renaming === v.id;
                                            const busy = busyId === v.id;
                                            return (
                                                <li key={v.id} className="px-6 py-3 hover:bg-secondary/30 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                            v.type === 'manual' ? 'bg-primary' :
                                                            v.type === 'safety' ? 'bg-amber-500' : 'bg-muted-foreground/40'
                                                        }`} title={v.type} />
                                                        <div className="flex-1 min-w-0">
                                                            {isRen ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        autoFocus
                                                                        value={renameVal}
                                                                        onChange={e => setRenameVal(e.target.value)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') handleRename(v); if (e.key === 'Escape') setRenaming(null); }}
                                                                        className="flex-1 px-2 py-1 text-sm bg-background border border-primary rounded outline-none"
                                                                    />
                                                                    <button onClick={() => handleRename(v)} className="p-1 text-success"><Check size={14} /></button>
                                                                    <button onClick={() => setRenaming(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm font-medium text-foreground truncate">{v.name}</div>
                                                            )}
                                                            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                                                                <span>{timeAgo(v.createdAt)}</span>
                                                                <span>·</span>
                                                                <span>{total} items</span>
                                                                <span>·</span>
                                                                <span>{fmtSize(v.sizeBytes)}</span>
                                                                <span>·</span>
                                                                <span className="truncate">{v.device}</span>
                                                                {v.type !== 'manual' && <><span>·</span><span className="capitalize">{v.type}</span></>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                            <button onClick={() => { setRenameVal(v.name); setRenaming(v.id); }} title="Rename" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                                                            <button onClick={() => downloadVersionFile(v)} title="Download" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"><Download size={13} /></button>
                                                            <button onClick={() => handleDelete(v)} disabled={busy} title="Delete" className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                                                        </div>
                                                        <button
                                                            onClick={() => setConfirmRestore(v)}
                                                            disabled={busy}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition"
                                                        >
                                                            {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                                            Restore
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            <div className="px-6 py-3 border-t border-border/30 text-[11px] text-muted-foreground flex items-center gap-2">
                                <ShieldCheck size={13} className="text-success" />
                                Restoring always creates a "safety" version of your current data first — nothing is ever lost.
                            </div>
                        </div>
                    </motion.div>

                    {/* Restore confirm */}
                    {confirmRestore && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setConfirmRestore(null)}
                        >
                            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="text-base font-semibold mb-2">Restore this version?</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Your current data will be replaced with <b>{confirmRestore.name}</b>. A safety version of right-now will be saved automatically, so you can undo this in one click.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setConfirmRestore(null)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button>
                                    <button onClick={() => handleRestore(confirmRestore)} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2">
                                        <RotateCcw size={14} /> Restore
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}

export { SNAPSHOTS_SCHEMA_SQL };
