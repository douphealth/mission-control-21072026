import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  X,
  CheckCircle2,
  ListChecks,
  StickyNote,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useDashboard, type Task, type Note, type Idea, type LinkItem } from '@/contexts/DashboardContext';
import { transcribeAndClassify, type VoiceCaptureResult } from '@/server/voice.functions';
import { toast } from 'sonner';

type CaptureType = 'tasks' | 'notes' | 'ideas' | 'links';

const TYPE_OPTIONS: { id: CaptureType; label: string; icon: LucideIcon; emoji: string; color: string }[] = [
  { id: 'tasks', label: 'Task', icon: ListChecks, emoji: '✅', color: 'from-blue-500 to-indigo-500' },
  { id: 'notes', label: 'Note', icon: StickyNote, emoji: '📝', color: 'from-amber-500 to-orange-500' },
  { id: 'ideas', label: 'Idea', icon: Lightbulb, emoji: '💡', color: 'from-violet-500 to-fuchsia-500' },
  { id: 'links', label: 'Link', icon: LinkIcon, emoji: '🔗', color: 'from-emerald-500 to-teal-500' },
];

// Voice activity detection constants
const SILENCE_RMS_THRESHOLD = 0.012; // below this = silence
const SPEECH_RMS_THRESHOLD = 0.025;  // above this = clearly speaking
const SILENCE_HANG_MS = 1400;        // auto-stop after this much continuous silence (post-speech)
const MAX_RECORD_MS = 60_000;        // hard cap
const MIN_RECORD_MS = 600;           // ignore taps shorter than this

type Phase = 'idle' | 'starting' | 'listening' | 'hearing' | 'processing' | 'ready' | 'error';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const result = String(r.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch { /* ignore */ }
  }
  return '';
}

export default function VoiceCapture() {
  const { addItem } = useDashboard();
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [type, setType] = useState<CaptureType>('tasks');
  const [typeAuto, setTypeAuto] = useState(true);
  const [aiResult, setAiResult] = useState<VoiceCaptureResult | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const stopReasonRef = useRef<'manual' | 'silence' | 'maxlen' | null>(null);

  // Browser support check (MediaRecorder + getUserMedia)
  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined';
    setSupported(ok);
  }, []);

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

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { sourceRef.current?.disconnect(); } catch { /* */ }
    try { analyserRef.current?.disconnect(); } catch { /* */ }
    try { audioCtxRef.current?.close(); } catch { /* */ }
    sourceRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch { /* */ } });
    }
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback((reason: 'manual' | 'silence' | 'maxlen') => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    stopReasonRef.current = reason;
    if (mr.state !== 'inactive') {
      try { mr.stop(); } catch { /* */ }
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;
    setErrorMsg(null);
    setTranscript('');
    setAiResult(null);
    setPhase('starting');
    setAudioLevel(0.2);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (err) {
      const e = err as DOMException;
      console.warn('mic permission denied', e);
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Microphone access denied. Allow it in your browser, then try again.'
          : e?.name === 'NotFoundError'
            ? 'No microphone detected on this device.'
            : 'Could not access the microphone.';
      setErrorMsg(msg);
      setPhase('error');
      setAudioLevel(0);
      toast.error(msg);
      return;
    }

    streamRef.current = stream;

    const mimeType = pickMimeType();
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      console.error('MediaRecorder init failed', err);
      cleanupAudio();
      setErrorMsg('Recording is not supported in this browser.');
      setPhase('error');
      return;
    }

    chunksRef.current = [];
    mr.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    mr.onstop = async () => {
      cleanupAudio();
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || mimeType || 'audio/webm' });
      mediaRecorderRef.current = null;

      const elapsed = Date.now() - startedAtRef.current;
      const reason = stopReasonRef.current;
      stopReasonRef.current = null;

      if (!hasSpokenRef.current || elapsed < MIN_RECORD_MS || blob.size < 1500) {
        setPhase('idle');
        setAudioLevel(0);
        if (reason === 'silence') {
          // silently reset; nothing was said
          return;
        }
        toast.error("I didn't catch any speech. Try again.");
        return;
      }

      setPhase('processing');
      setAudioLevel(0);
      try {
        const base64 = await blobToBase64(blob);
        const result = await transcribeAndClassify({
          data: { audio: base64, mime: blob.type || 'audio/webm' },
        });
        setTranscript(result.transcript);
        setAiResult(result);
        if (typeAuto) setType(result.type);
        setPhase('ready');
      } catch (err) {
        console.error('transcribe failed', err);
        const message = err instanceof Error ? err.message : 'Transcription failed';
        setErrorMsg(message);
        toast.error('Transcription failed. ' + message);
        setPhase('error');
      }
    };

    // Audio level + VAD via WebAudio
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i];
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buffer.length);
        const normalized = Math.min(1, rms * 8);
        setAudioLevel(prev => prev * 0.6 + normalized * 0.4);

        const now = Date.now();
        if (rms > SPEECH_RMS_THRESHOLD) {
          hasSpokenRef.current = true;
          lastVoiceAtRef.current = now;
          setPhase(p => (p === 'starting' || p === 'listening' ? 'hearing' : p));
        } else if (rms > SILENCE_RMS_THRESHOLD) {
          // ambient/marginal — keep timer, no state change
          lastVoiceAtRef.current = Math.max(lastVoiceAtRef.current, now - 200);
        }

        // Auto-stop on sustained silence (after at least one detected speech segment)
        if (
          hasSpokenRef.current &&
          now - lastVoiceAtRef.current > SILENCE_HANG_MS
        ) {
          stopRecording('silence');
          return;
        }
        if (now - startedAtRef.current > MAX_RECORD_MS) {
          stopRecording('maxlen');
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('audio meter init failed', err);
    }

    mediaRecorderRef.current = mr;
    startedAtRef.current = Date.now();
    lastVoiceAtRef.current = Date.now();
    hasSpokenRef.current = false;
    try {
      mr.start(250);
      setPhase('listening');
    } catch (err) {
      console.error('mr.start failed', err);
      cleanupAudio();
      mediaRecorderRef.current = null;
      setErrorMsg('Could not start recording. Try again.');
      setPhase('error');
    }
  }, [cleanupAudio, stopRecording, typeAuto]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop(); } catch { /* */ }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const handleClose = useCallback(() => {
    try { mediaRecorderRef.current?.stop(); } catch { /* */ }
    cleanupAudio();
    mediaRecorderRef.current = null;
    setOpen(false);
    setPhase('idle');
    setErrorMsg(null);
    setTranscript('');
    setAiResult(null);
    setTypeAuto(true);
    setAudioLevel(0);
  }, [cleanupAudio]);

  const handleSave = async () => {
    if (!transcript) {
      toast.error('Nothing to save — try speaking first');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString().split('T')[0];
      const title = aiResult?.title || transcript.slice(0, 80);
      const text = transcript;

      if (type === 'tasks') {
        const taskPayload: Omit<Task, 'id'> = {
          title,
          description: text,
          priority: aiResult?.priority || 'medium',
          status: 'todo',
          dueDate: aiResult?.dueDate || now,
          category: 'Voice',
          linkedProject: '',
          subtasks: [],
          createdAt: now,
        };
        await addItem<Task>('tasks', taskPayload);
      } else if (type === 'notes') {
        const notePayload: Omit<Note, 'id'> = {
          title,
          content: text,
          color: 'blue',
          pinned: false,
          tags: ['voice'],
          createdAt: now,
          updatedAt: now,
        };
        await addItem<Note>('notes', notePayload);
      } else if (type === 'ideas') {
        const ideaPayload: Omit<Idea, 'id'> = {
          title,
          description: text,
          category: 'Voice',
          priority: (aiResult?.priority === 'critical' ? 'high' : aiResult?.priority) || 'medium',
          status: 'spark',
          tags: ['voice'],
          linkedProject: '',
          votes: 0,
          createdAt: now,
          updatedAt: now,
        };
        await addItem<Idea>('ideas', ideaPayload);
      } else if (type === 'links') {
        const linkPayload: Omit<LinkItem, 'id'> = {
          title,
          url: aiResult?.url || 'https://',
          category: 'Voice',
          status: 'active',
          description: text,
          dateAdded: now,
          pinned: false,
        };
        await addItem<LinkItem>('links', linkPayload);
      }
      toast.success(`🎤 ${TYPE_OPTIONS.find(o => o.id === type)?.label} saved!`);
      handleClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'unknown';
      console.error(e);
      toast.error('Failed to save: ' + message);
    } finally {
      setSaving(false);
    }
  };

  const isRecording = phase === 'listening' || phase === 'hearing' || phase === 'starting';
  const activeOpt = TYPE_OPTIONS.find(o => o.id === type)!;
  const statusText =
    !supported
      ? 'Voice capture not supported in this browser'
      : errorMsg
        ? errorMsg
        : phase === 'starting'
          ? 'Starting microphone…'
          : phase === 'listening'
            ? 'Listening… speak naturally (auto-stops on silence)'
            : phase === 'hearing'
              ? 'Hearing your speech…'
              : phase === 'processing'
                ? 'Transcribing with AI…'
                : phase === 'ready'
                  ? '✨ Transcribed — review and save'
                  : 'Tap mic to start';

  return (
    <>
      <motion.button
        onClick={() => {
          setOpen(true);
          if (supported && phase === 'idle') void startRecording();
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
                    <div className="text-[11px] text-muted-foreground">{statusText}</div>
                  </div>
                </div>
                <button onClick={handleClose} className="w-9 h-9 rounded-2xl hover:bg-secondary/70 flex items-center justify-center text-muted-foreground transition">
                  <X size={18} />
                </button>
              </div>

              {/* Mic + waveform */}
              <div className="px-5 sm:px-6 py-6 flex flex-col items-center gap-4 bg-gradient-to-b from-secondary/20 to-transparent">
                <motion.button
                  onClick={() => {
                    if (isRecording) stopRecording('manual');
                    else if (phase !== 'processing') void startRecording();
                  }}
                  disabled={!supported || phase === 'processing'}
                  whileTap={{ scale: 0.92 }}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_10px_40px_-8px_rgb(244,63,94,0.6)]'
                      : phase === 'processing'
                        ? 'bg-secondary text-muted-foreground'
                        : 'gradient-primary text-primary-foreground shadow-[var(--shadow-primary)]'
                  } disabled:opacity-60`}
                >
                  {phase === 'processing'
                    ? <Loader2 size={32} className="animate-spin" />
                    : isRecording
                      ? <MicOff size={32} />
                      : <Mic size={32} />}
                  {isRecording && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-rose-400/60"
                      animate={{ scale: [1, 1 + audioLevel * 0.4, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 0.4, repeat: Infinity }}
                    />
                  )}
                </motion.button>

                {errorMsg && (
                  <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-background/80 px-4 py-3 text-center text-xs text-muted-foreground">
                    {errorMsg}
                  </div>
                )}

                {isRecording && (
                  <div className="flex items-center gap-1 h-8">
                    {[...Array(24)].map((_, i) => {
                      const distance = Math.abs(i - 12) / 12;
                      const h = Math.max(4, audioLevel * 40 * (1 - distance * 0.5) * (0.6 + Math.random() * 0.4));
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
                  {transcript ? (
                    <span>{transcript}</span>
                  ) : phase === 'processing' ? (
                    <span className="text-muted-foreground italic flex items-center gap-2">
                      <Sparkles size={14} className="animate-pulse" />
                      AI is transcribing your voice…
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 italic">
                      Try saying: "Remind me to call the client tomorrow", "Idea: AI tool for invoices", "Note: meeting at 3pm went well"…
                    </span>
                  )}
                </div>
                {transcript && (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      onClick={() => { setTranscript(''); setAiResult(null); setPhase('idle'); }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition"
                    >
                      Clear & re-record
                    </button>
                    {aiResult && (
                      <span className="text-[10px] text-primary/80 font-medium flex items-center gap-1">
                        <Sparkles size={10} /> AI-classified as {aiResult.type}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Type selector */}
              <div className="px-5 sm:px-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Save as</span>
                  {typeAuto && transcript && (
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

              {/* Footer */}
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
                    disabled={!transcript || saving || phase === 'processing'}
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
