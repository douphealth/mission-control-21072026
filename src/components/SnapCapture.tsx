// ─── SnapCapture ─────────────────────────────────────────────────────────────
// Floating "Snap" button visible on every screen.
// One tap → camera/gallery → AI reads it → items auto-filed → done.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Check, Loader2, Sparkles, AlertTriangle, Image as ImageIcon, Clipboard } from 'lucide-react';
import { toast } from 'sonner';
import { aiImageImport } from '@/lib/aiImport';
import { deduplicateItems } from '@/lib/dedup';
import { useBulkAddItems } from '@/hooks/useTableData';
import { TARGET_META, type ImportTarget } from '@/lib/importEngine';

type SnapPhase = 'idle' | 'processing' | 'review' | 'saving' | 'done';

interface SnapResult {
  categories: Array<{
    target: ImportTarget;
    items: Record<string, any>[];
    label: string;
    emoji: string;
  }>;
  totalItems: number;
  skippedDupes: number;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const MAX = 1800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function SnapCapture() {
  const [phase, setPhase] = useState<SnapPhase>('idle');
  const [result, setResult] = useState<SnapResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const bulkAddItems = useBulkAddItems();

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setPreview(null);
    setShowActions(false);
  }, []);

  const executeImport = useCallback(async (snapResult: SnapResult) => {
    setPhase('saving');
    try {
      for (const cat of snapResult.categories) {
        await bulkAddItems(cat.target, cat.items as any);
      }
      setPhase('done');
      const breakdown = snapResult.categories
        .map(c => `${c.emoji} ${c.items.length} ${c.label}`)
        .join(' · ');
      toast.success(`✅ Snapped & filed: ${breakdown}`, {
        duration: 5000,
        description: snapResult.skippedDupes > 0 ? `${snapResult.skippedDupes} duplicate(s) skipped` : undefined,
      });
      setTimeout(reset, 1600);
    } catch (err: any) {
      console.error('Snap import error:', err);
      toast.error(err?.message || 'Could not file those items.');
      reset();
    }
  }, [bulkAddItems, reset]);

  const processImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/')).slice(0, 4);
    if (imageFiles.length === 0) {
      toast.error('No image found. Try a photo or screenshot.');
      return;
    }

    setPhase('processing');
    setShowActions(false);

    try {
      const encoded = await Promise.all(imageFiles.map(compressImage));
      setPreview(encoded[0]);

      const importResult = await aiImageImport(encoded);

      if (!importResult.totalItems) {
        toast.error('📷 Could not read anything from that image.');
        reset();
        return;
      }

      let totalSkipped = 0;
      const categories: SnapResult['categories'] = [];
      for (const cat of importResult.categories) {
        const unique = await deduplicateItems(cat.target, cat.items);
        totalSkipped += cat.items.length - unique.length;
        if (unique.length > 0) {
          categories.push({
            target: cat.target,
            items: unique as Record<string, any>[],
            label: TARGET_META[cat.target]?.label ?? cat.target,
            emoji: TARGET_META[cat.target]?.emoji ?? '📄',
          });
        }
      }

      const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
      if (totalItems === 0) {
        toast(`🔄 Everything in that photo already exists (${totalSkipped} duplicates).`);
        reset();
        return;
      }

      const snapResult: SnapResult = { categories, totalItems, skippedDupes: totalSkipped };
      setResult(snapResult);

      if (categories.length === 1 && totalItems <= 5) {
        await executeImport(snapResult);
      } else {
        setPhase('review');
      }
    } catch (err: any) {
      console.error('Snap processing error:', err);
      toast.error(err?.message || '📷 Processing failed. Try a clearer photo.');
      reset();
    }
  }, [executeImport, reset]);

  const handleFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) processImages(files);
  }, [processImages]);

  const handleFABDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;          // ignore right/middle click
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      longPressTimer.current = null;                       // mark as fired
      setShowActions(true);
    }, 400);
  }, []);

  const handleFABUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;
    if (longPressTimer.current) {                          // still pending = short tap
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      cameraRef.current?.click();
    }
    // long press already fired → do nothing, menu stays open
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    setShowActions(false);
    try {
      const clipItems = await navigator.clipboard.read();
      for (const item of clipItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            processImages([new File([blob], 'pasted.png', { type })]);
            return;
          }
        }
      }
      toast.error('No image in clipboard.');
    } catch {
      toast.error('Clipboard access denied.');
    }
  }, [processImages]);

  // Global paste (Ctrl+V an image anywhere)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return;
      const items = Array.from(e.clipboardData?.items || []);
      const files = items
        .filter(i => i.type.startsWith('image/'))
        .map(i => i.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length > 0) {
        e.preventDefault();
        processImages(files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImages]);

  return (
    <>
      {phase === 'idle' && (
        <div className="fixed bottom-40 right-4 lg:bottom-28 lg:right-8 z-[90] flex flex-col items-end gap-2">
          {showActions && (
            <>
              <div className="fixed inset-0 z-[89]" onClick={() => setShowActions(false)} />
              <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => { setShowActions(false); cameraRef.current?.click(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/40 shadow-lg text-xs font-medium text-card-foreground hover:bg-secondary transition-all"
                >
                  <Camera className="w-4 h-4" /> Take Photo
                </button>
                <button
                  onClick={() => { setShowActions(false); galleryRef.current?.click(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/40 shadow-lg text-xs font-medium text-card-foreground hover:bg-secondary transition-all"
                >
                  <ImageIcon className="w-4 h-4" /> Choose from Gallery
                </button>
                <button
                  onClick={pasteFromClipboard}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/40 shadow-lg text-xs font-medium text-card-foreground hover:bg-secondary transition-all"
                >
                  <Clipboard className="w-4 h-4" /> Paste Image
                </button>
              </div>
            </>
          )}

          <button
            onMouseDown={handleFABDown}
            onMouseUp={handleFABUp}
            onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            onTouchStart={handleFABDown}
            onTouchEnd={(e) => { e.preventDefault(); handleFABUp(); }}
            onContextMenu={(e) => { e.preventDefault(); setShowActions(true); }}
            className="w-14 h-14 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150"
            title="Tap: camera · Long-press / right-click: more options"
            aria-label="Snap a photo to import"
          >
            <Camera className="w-6 h-6 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}

      {(phase === 'processing' || phase === 'saving') && (
        <div className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xs rounded-2xl border border-border/40 bg-card p-5 shadow-2xl space-y-4">
            {preview && (
              <img src={preview} alt="Captured import preview" className="w-full h-36 object-cover rounded-xl border border-border/40" />
            )}
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-card-foreground">
                  {phase === 'processing' ? 'Reading image…' : 'Filing items…'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {phase === 'processing' ? 'AI recognizing handwriting, receipts, lists…' : 'Saving to your database…'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'review' && result && (
        <div className="fixed inset-0 z-[120] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={reset}>
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-border/40 bg-card p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-card-foreground">Snap Results</h3>
                <p className="text-[11px] text-muted-foreground">{result.totalItems} items · confirm to file</p>
              </div>
              <button onClick={reset} className="p-1.5 rounded-lg hover:bg-secondary" aria-label="Close">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {preview && (
              <img src={preview} alt="Captured import preview" className="w-full h-32 object-cover rounded-xl border border-border/40" />
            )}

            <div className="space-y-2">
              {result.categories.map((cat) => (
                <div key={cat.target} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                  <span className="text-lg">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-card-foreground">{cat.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {cat.items.slice(0, 3).map(it => it.title || it.name || it.label || 'Item').join(', ')}
                      {cat.items.length > 3 && ` +${cat.items.length - 3} more`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-primary">{cat.items.length}</span>
                </div>
              ))}
              {result.skippedDupes > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">{result.skippedDupes} duplicate(s) skipped</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={reset} className="flex-1 py-2.5 rounded-xl border border-border/50 text-xs font-medium text-muted-foreground hover:bg-secondary transition-all">
                Discard
              </button>
              <button
                onClick={() => executeImport(result)}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25"
              >
                <Check className="w-4 h-4" /> File {result.totalItems} Items
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card/95 border border-border/40 px-8 py-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-card-foreground">Filed! ✅</p>
          </div>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
    </>
  );
}
