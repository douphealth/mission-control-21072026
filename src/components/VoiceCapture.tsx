import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, CheckCircle2, ListChecks, StickyNote, Lightbulb, Link as LinkIcon, Loader2, type LucideIcon } from 'lucide-react';
import { useDashboard, type Task, type Note, type Idea, type LinkItem } from '@/contexts/DashboardContext';
import { toast } from 'sonner';

type CaptureType = 'tasks' | 'notes' | 'ideas' | 'links';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop?: () => void;
  abort?: () => void;
  onstart?: () => void;
  onaudiostart?: () => void;
  onsoundstart?: () => void;
  onspeechstart?: () => void;
  onspeechend?: () => void;
  onsoundend?: () => void;
  onaudioend?: () => void;
  onresult?: (event: SpeechRecognitionEventLike) => void;
  onerror?: (event: SpeechRecognitionErrorEventLike) => void;
  onend?: () => void;
}

interface SRWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

const TYPE_OPTIONS: { id: CaptureType; label: string; icon: LucideIcon; emoji: string; color: string }[] = [
  { id: 'tasks', label: 'Task', icon: ListChecks, emoji: '✅', color: 'from-blue-500 to-indigo-500' },
  { id: 'notes', label: 'Note', icon: StickyNote, emoji: '📝', color: 'from-amber-500 to-orange-500' },
  { id: 'ideas', label: 'Idea', icon: Lightbulb, emoji: '💡', color: 'from-violet-500 to-fuchsia-500' },
  { id: 'links', label: 'Link', icon: LinkIcon, emoji: '🔗', color: 'from-emerald-500 to-teal-500' },
];

function detectType(text: string): CaptureType {
  const t = text.toLowerCase();
  if (/\b(https?:\/\/|www\.|\.com|\.io|\.dev|\.org|bookmark|link to)\b/.test(t)) return 'links';
  if (/\b(idea|what if|maybe we|concept|brainstorm|imagine|could be|product idea)\b/.test(t)) return 'ideas';
  if (/\b(remind me|todo|to do|task|need to|must|should|don'?t forget|tomorrow|today|by friday|deadline|due)\b/.test(t)) return 'tasks';
  if (/\b(note|remember|fyi|reference|wrote down|jot|log)\b/.test(t)) return 'notes';
  return 'tasks';
}

function detectPriority(text: string): 'critical' | 'high' | 'medium' | 'low' {
  const t = text.toLowerCase();
  if (/\b(urgent|asap|critical|emergency|right now|immediately)\b/.test(t)) return 'critical';
  if (/\b(important|high priority|soon|today)\b/.test(t)) return 'high';
  if (/\b(low priority|whenever|someday|eventually)\b/.test(t)) return 'low';
  return 'medium';
}

function detectDueDate(text: string): string {
  const t = text.toLowerCase();
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (/\btoday\b/.test(t)) return fmt(now);
  if (/\btomorrow\b/.test(t)) { const d = new Date(now); d.setDate(d.getDate() + 1); return fmt(d); }
  if (/\bnext week\b/.test(t)) { const d = new Date(now); d.setDate(d.getDate() + 7); return fmt(d); }
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (new RegExp(`\\b${days[i]}\\b`).test(t)) {
      const d = new Date(now);
      const diff = (i - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return fmt(d);
    }
  }
  return fmt(now);
}

function extractUrl(text: string): string {
  const m = text.match(/https?:\/\/\S+|www\.\S+/i);
  if (m) return m[0].startsWith('http') ? m[0] : `https://${m[0]}`;
  const dom = text.match(/\b[\w-]+\.(com|io|dev|org|net|app|co)\b\S*/i);
  return dom ? `https://${dom[0]}` : '';
}

function smartTitle(text: string): string {
  const cleaned = text.trim().replace(/^(remind me to|i need to|todo|task|note|idea|remember to|don'?t forget to)\s+/i, '');
  const firstSentence = cleaned.split(/[.!?\n]/)[0].trim();
  return firstSentence.length > 80 ? firstSentence.slice(0, 77) + '…' : firstSentence || cleaned.slice(0, 80);
}

export default function VoiceCapture() {
  const { addItem } = useDashboard();
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'starting' | 'listening' | 'hearing'>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [type, setType] = useState<CaptureType>('tasks');
  const [typeAuto, setTypeAuto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);

  // Check browser support
  useEffect(() => {
    const w = window as SRWindow;
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  // Auto-detect type as user speaks
  useEffect(() => {
    if (typeAuto && transcript) setType(detectType(transcript));
  }, [transcript, typeAuto]);

  // Global hotkey: Cmd/Ctrl + Shift + V
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const shouldListenRef = useRef(false);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimeoutRef.current) window.clearTimeout(restartTimeoutRef.current);
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try { recognition?.abort?.(); } catch (error) { console.debug('Voice abort ignored', error); }
    try { recognition?.stop?.(); } catch (error) { console.debug('Voice stop ignored', error); }
    setListening(false);
    setMicStatus('idle');
    setAudioLevel(0);
    setInterim('');
  }, []);

  const startListening = useCallback(() => {
    const w = window as SRWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      toast.error('Voice recognition is not supported in this browser. Try Chrome, Edge or Safari.');
      return;
    }
    if (recognitionRef.current || listening) return;

    // Keep recognition start inside the direct click handler and avoid grabbing a
    // second microphone stream for visualization — some browsers fail when both
    // SpeechRecognition and getUserMedia try to own the mic at the same time.
    setMicStatus('starting');
    setAudioLevel(0.2);
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setMicStatus('listening');
      setAudioLevel(0.28);
    };
    recognition.onaudiostart = () => setAudioLevel(0.38);
    recognition.onsoundstart = () => setAudioLevel(0.58);
    recognition.onspeechstart = () => {
      setMicStatus('hearing');
      setAudioLevel(1);
    };
    recognition.onspeechend = () => {
      setMicStatus('listening');
      setAudioLevel(0.3);
    };
    recognition.onsoundend = () => setAudioLevel(0.18);
    recognition.onaudioend = () => setAudioLevel(0.12);

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      let final = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript + ' ';
        else interimText += r[0].transcript;
      }
      if (final) setTranscript(prev => (prev + ' ' + final).trim());
      setInterim(interimText);
      setMicStatus((final || interimText) ? 'hearing' : 'listening');
      setAudioLevel((final || interimText) ? 1 : 0.28);
    };
    recognition.onerror = (e: SpeechRecognitionErrorEventLike) => {
      console.warn('Speech recognition error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast.error('Microphone access denied. Enable it in your browser settings and tap the mic again.');
        shouldListenRef.current = false;
        stopListening();
      } else if (e.error === 'no-speech' || e.error === 'aborted') {
        setMicStatus('listening');
        setAudioLevel(0.18);
      } else if (e.error === 'audio-capture') {
        toast.error('No microphone detected.');
        shouldListenRef.current = false;
        stopListening();
      } else if (e.error === 'network') {
        toast.error('Speech recognition service is temporarily unavailable.');
        shouldListenRef.current = false;
        stopListening();
      } else {
        console.warn(`Voice error: ${e.error}`);
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      setListening(false);

      // Auto-restart if user hasn't stopped manually.
      if (shouldListenRef.current) {
        setMicStatus('starting');
        restartTimeoutRef.current = window.setTimeout(() => {
          if (!shouldListenRef.current || recognitionRef.current !== recognition) return;
          try {
            recognition.start();
          } catch (err) {
            console.warn('restart failed', err);
            shouldListenRef.current = false;
            stopListening();
            toast.error('Voice capture paused. Tap the mic again to continue.');
          }
        }, 160);
        return;
      }

      recognitionRef.current = null;
      setMicStatus('idle');
      setAudioLevel(0);
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      toast.error('Could not start voice recognition. Try again.');
      recognitionRef.current = null;
      shouldListenRef.current = false;
      setListening(false);
      setMicStatus('idle');
      setAudioLevel(0);
      return;
    }
  }, [listening, stopListening]);

  const handleClose = () => {
    stopListening();
    setOpen(false);
    setTranscript('');
    setInterim('');
    setTypeAuto(true);
  };

  const handleSave = async () => {
    const text = (transcript + ' ' + interim).trim();
    if (!text) { toast.error('Nothing to save — try speaking first'); return; }
    setSaving(true);
    stopListening();
    try {
      const now = new Date().toISOString().split('T')[0];
      const title = smartTitle(text);
      if (type === 'tasks') {
        await addItem('tasks', {
          title,
          description: text,
          priority: detectPriority(text),
          status: 'todo',
          dueDate: detectDueDate(text),
          category: 'Voice',
          linkedProject: '',
          subtasks: [],
          createdAt: now,
        } as any);
      } else if (type === 'notes') {
        await addItem('notes', {
          title,
          content: text,
          color: 'blue',
          pinned: false,
          tags: ['voice'],
          createdAt: now,
          updatedAt: now,
        } as any);
      } else if (type === 'ideas') {
        await addItem('ideas', {
          title,
          description: text,
          category: 'Voice',
          priority: detectPriority(text) === 'critical' ? 'high' : (detectPriority(text) as any),
          status: 'spark',
          tags: ['voice'],
          linkedProject: '',
          votes: 0,
          createdAt: now,
          updatedAt: now,
        } as any);
      } else if (type === 'links') {
        const url = extractUrl(text);
        await addItem('links', {
          title,
          url: url || 'https://',
          category: 'Voice',
          status: 'active',
          description: text,
          dateAdded: now,
          pinned: false,
        } as any);
      }
      toast.success(`🎤 ${TYPE_OPTIONS.find(o => o.id === type)?.label} saved!`);
      handleClose();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save: ' + (e?.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  // NOTE: We do NOT auto-start in a useEffect/setTimeout because that
  // breaks the user-gesture context required by the SpeechRecognition API.
  // Recognition must be started synchronously from the click handler below.

  const fullText = (transcript + ' ' + interim).trim();
  const activeOpt = TYPE_OPTIONS.find(o => o.id === type)!;

  return (
    <>
      {/* Floating mic button — opens modal AND starts listening synchronously (gesture-bound) */}
      <motion.button
        onClick={() => {
          setOpen(true);
          if (supported && !listening) startListening();
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed z-40 bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 lg:w-16 lg:h-16 rounded-full gradient-primary text-primary-foreground shadow-[0_10px_40px_-8px_hsl(var(--primary)/0.6)] flex items-center justify-center group"
        title="Voice capture (⌘⇧V)"
        aria-label="Voice capture"
      >
        <Mic size={22} className="lg:w-7 lg:h-7" />
        <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping opacity-40 group-hover:opacity-70" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-6"
            onClick={handleClose}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${activeOpt.color} flex items-center justify-center text-white shadow-md`}>
                    <Mic size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Voice Capture</div>
                    <div className="text-[11px] text-muted-foreground">
                      {listening ? 'Listening… speak naturally' : supported ? 'Tap mic to start' : 'Not supported in this browser'}
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} className="w-9 h-9 rounded-2xl hover:bg-secondary/70 flex items-center justify-center text-muted-foreground transition">
                  <X size={18} />
                </button>
              </div>

              {/* Mic + waveform */}
              <div className="px-5 sm:px-6 py-6 flex flex-col items-center gap-4 bg-gradient-to-b from-secondary/20 to-transparent">
                <motion.button
                  onClick={listening ? stopListening : startListening}
                  disabled={!supported}
                  whileTap={{ scale: 0.92 }}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    listening
                      ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_10px_40px_-8px_rgb(244,63,94,0.6)]'
                      : 'gradient-primary text-primary-foreground shadow-[var(--shadow-primary)]'
                  } disabled:opacity-40`}
                >
                  {listening ? <MicOff size={32} /> : <Mic size={32} />}
                  {listening && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-rose-400/60"
                      animate={{ scale: [1, 1 + audioLevel * 0.4, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 0.4, repeat: Infinity }}
                    />
                  )}
                </motion.button>

                {/* Audio level bars */}
                {listening && (
                  <div className="flex items-center gap-1 h-8">
                    {[...Array(24)].map((_, i) => {
                      const distance = Math.abs(i - 12) / 12;
                      const h = Math.max(4, audioLevel * 32 * (1 - distance * 0.6) * (0.5 + Math.random() * 0.5));
                      return (
                        <motion.div
                          key={i}
                          animate={{ height: h }}
                          transition={{ duration: 0.1 }}
                          className="w-1 rounded-full bg-gradient-to-t from-primary/60 to-primary"
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="px-5 sm:px-6 pb-4">
                <div className="min-h-[100px] max-h-[180px] overflow-y-auto bg-secondary/40 rounded-2xl p-4 text-[14px] leading-relaxed text-foreground border border-border/30">
                  {fullText ? (
                    <>
                      <span>{transcript}</span>
                      {interim && <span className="text-muted-foreground italic"> {interim}</span>}
                    </>
                  ) : (
                    <span className="text-muted-foreground/60 italic">
                      Try saying: "Remind me to call the client tomorrow", "Idea: AI tool for invoices", "Note: meeting at 3pm went well"…
                    </span>
                  )}
                </div>
                {fullText && (
                  <button
                    onClick={() => { setTranscript(''); setInterim(''); }}
                    className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition"
                  >
                    Clear transcript
                  </button>
                )}
              </div>

              {/* Type selector */}
              <div className="px-5 sm:px-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Save as</span>
                  {typeAuto && fullText && (
                    <span className="text-[10px] text-primary/80 font-medium">✨ Auto-detected</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TYPE_OPTIONS.map(opt => {
                    const active = type === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => { setType(opt.id); setTypeAuto(false); }}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${
                          active
                            ? `bg-gradient-to-br ${opt.color} text-white border-transparent shadow-md`
                            : 'bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-[11px] font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-5 sm:px-6 py-4 border-t border-border/30 bg-secondary/20 flex items-center justify-between gap-3">
                <span className="hidden sm:block text-[11px] text-muted-foreground">
                  Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/40 font-mono text-[10px]">⌘⇧V</kbd>
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    disabled={!fullText || saving}
                    className="px-5 py-2.5 rounded-2xl text-sm font-semibold gradient-primary text-primary-foreground shadow-[var(--shadow-primary)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Save {activeOpt.label}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
