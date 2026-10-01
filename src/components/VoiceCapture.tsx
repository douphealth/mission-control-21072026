import { useEffect, useRef, useState, useCallback } from "react";
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
} from "lucide-react";
import { useAddItem } from "@/hooks/useTableData";
import type { Task, Note, Idea, LinkItem } from "@/lib/db";
import { smartCapture, type SmartCaptureResult } from "@/lib/voiceAi";
import { classifyTranscript, type VoiceCaptureResult } from "@/lib/voice.functions";
import {
  buildRecognitionSnapshot,
  countTranscriptWords,
  maxReasonableVoiceWords,
  sanitizeVoiceTranscript,
  type RecognitionResultLike,
} from "@/lib/speechTranscript";
import { encodePcmAsWav } from "@/lib/wavRecorder";
import {
  browserEnvironmentLanguageHint,
  browserRecognitionLanguage,
  hasUsableVoiceCapture,
  inferLanguageFromTranscript,
  languageToLocale,
  shouldUseServerVoiceCapture,
  voiceServerBackoffMs,
} from "@/lib/voiceCaptureQuality";
import { toast } from "sonner";
import { VOICE_CAPTURE_OPEN_EVENT } from "@/lib/captureEvents";
import { todayISO } from "@/lib/overdue";

type CaptureType = "tasks" | "notes" | "ideas" | "links";

const TYPE_OPTIONS: {
  id: CaptureType;
  label: string;
  icon: LucideIcon;
  emoji: string;
  color: string;
}[] = [
  {
    id: "tasks",
    label: "Task",
    icon: ListChecks,
    emoji: "✅",
    color: "from-blue-500 to-indigo-500",
  },
  {
    id: "notes",
    label: "Note",
    icon: StickyNote,
    emoji: "📝",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "ideas",
    label: "Idea",
    icon: Lightbulb,
    emoji: "💡",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "links",
    label: "Link",
    icon: LinkIcon,
    emoji: "🔗",
    color: "from-emerald-500 to-teal-500",
  },
];

// Voice activity detection constants
const SILENCE_RMS_THRESHOLD = 0.006; // quiet speech/noise floor guard
const SPEECH_RMS_THRESHOLD = 0.012; // deliberately sensitive: server STT is authoritative
const SILENCE_HANG_MS = 6000; // allow natural pauses, names, URLs and slower dictation
const MAX_RECORD_MS = 180_000; // hard cap
const MIN_RECORD_MS = 600; // ignore taps shorter than this

const LANG_KEY = "mc:voiceLang";
const AUTO_HINT_KEY = "mc:voiceAutoHint";
const LANGUAGES: { id: string; label: string }[] = [
  { id: "auto", label: "Auto detect" },
  { id: "en", label: "English" },
  { id: "el", label: "Ελληνικά" },
  { id: "de", label: "Deutsch" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
  { id: "nl", label: "Nederlands" },
  { id: "ro", label: "Română" },
  { id: "ru", label: "Русский" },
  { id: "ar", label: "العربية" },
  { id: "hi", label: "हिन्दी" },
  { id: "zh", label: "中文" },
  { id: "ja", label: "日本語" },
];

type Phase = "idle" | "starting" | "listening" | "hearing" | "processing" | "ready" | "error";

type BrowserSpeechRecognitionEvent = Event & {
  results: ArrayLike<RecognitionResultLike>;
};

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((this: BrowserSpeechRecognition, ev: Event & { error?: string }) => void) | null;
  onend: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognition(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (
      window as Window & {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
      }
    ).SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor })
      .webkitSpeechRecognition ??
    null
  );
}

// Quick local type inference for manual typing fallback
function inferTypeLocal(text: string): CaptureType {
  const lower = text.toLowerCase();
  if (/\b(link|url|website|http|bookmark)\b/.test(lower) || /^https?:\/\//.test(text.trim()))
    return "links";
  if (/^(idea|brainstorm|what if|concept)\b/.test(lower)) return "ideas";
  if (/^(note|remember|journal|log|meeting)\b/.test(lower)) return "notes";
  return "tasks";
}

export default function VoiceCapture() {
  const addItem = useAddItem();
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [type, setType] = useState<CaptureType>("tasks");
  const [typeAuto, setTypeAuto] = useState(true);
  const [aiResult, setAiResult] = useState<SmartCaptureResult | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<string>("auto");
  const languageRef = useRef("auto");
  const [serverSttAvailable, setServerSttAvailable] = useState<boolean | null>(null);
  const [voiceProviders, setVoiceProviders] = useState<{ lovable: boolean; gemini: boolean }>({
    lovable: false,
    gemini: false,
  });
  const [adaptiveLanguageHint, setAdaptiveLanguageHint] = useState<string | null>(null);
  const adaptiveLanguageHintRef = useRef<string | null>(null);
  const voiceModeRef = useRef<"server" | "browser">("server");
  const serverFailureUntilRef = useRef(0);
  const serverFailureCountRef = useRef(0);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && LANGUAGES.some((l) => l.id === stored)) {
      setLanguage(stored);
      languageRef.current = stored;
    }
    const storedHint = localStorage.getItem(AUTO_HINT_KEY);
    if (storedHint && LANGUAGES.some((l) => l.id === storedHint && l.id !== "auto")) {
      setAdaptiveLanguageHint(storedHint);
      adaptiveLanguageHintRef.current = storedHint;
    }
  }, []);

  const rememberLanguageHint = useCallback((id?: string | null) => {
    if (!id || id === "auto" || !LANGUAGES.some((l) => l.id === id)) return;
    adaptiveLanguageHintRef.current = id;
    setAdaptiveLanguageHint(id);
    try {
      localStorage.setItem(AUTO_HINT_KEY, id);
    } catch {
      /* */
    }
  }, []);

  const changeLanguage = useCallback((id: string) => {
    setLanguage(id);
    languageRef.current = id;
    if (id !== "auto") rememberLanguageHint(id);
    try {
      localStorage.setItem(LANG_KEY, id);
    } catch {
      /* */
    }
  }, [rememberLanguageHint]);

  const recordingRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(48_000);
  const startedAtRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const stopReasonRef = useRef<"manual" | "silence" | "maxlen" | null>(null);
  const committedTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const lastFinalResultIndexRef = useRef(0);
  const browserFinalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRecordingDurationMsRef = useRef(0);
  const transcriptManuallyEditedRef = useRef(false);

  const probeVoiceEngine = useCallback(async () => {
    const Recognition = getSpeechRecognition();
    const canBrowserRecognize = Boolean(Recognition);
    const canRecordServerAudio =
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined";

    try {
      const response = await fetch("/api/voice/transcribe", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        transcriptionConfigured?: boolean;
        providers?: { lovable?: boolean; gemini?: boolean };
        mode?: string;
      };
      const serverReady = response.ok && data.transcriptionConfigured === true;
      setServerSttAvailable(serverReady);
      setVoiceProviders({
        lovable: Boolean(data.providers?.lovable),
        gemini: Boolean(data.providers?.gemini),
      });
      setSupported(serverReady ? canRecordServerAudio : canBrowserRecognize);
      return serverReady;
    } catch {
      setServerSttAvailable(false);
      setVoiceProviders({ lovable: false, gemini: false });
      setSupported(canBrowserRecognize);
      return false;
    }
  }, []);

  // Initial health check. Every recording re-checks this again so Auto never
  // gets stuck in a stale browser-fallback state for an entire session.
  useEffect(() => {
    void probeVoiceEngine();
  }, [probeVoiceEngine]);

  const cleanupRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      /* */
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* */
    }
    try {
      processorRef.current?.disconnect();
    } catch {
      /* */
    }
    try {
      silentGainRef.current?.disconnect();
    } catch {
      /* */
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      /* */
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      /* */
    }
    sourceRef.current = null;
    processorRef.current = null;
    silentGainRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* */
        }
      });
    }
    streamRef.current = null;
  }, []);

  const finalizeBrowserTranscript = useCallback(() => {
    if (browserFinalizeTimerRef.current) {
      clearTimeout(browserFinalizeTimerRef.current);
      browserFinalizeTimerRef.current = null;
    }

    const cleaned = sanitizeVoiceTranscript(
      liveTranscriptRef.current || committedTranscriptRef.current,
    );
    cleanupRecognition();
    setAudioLevel(0);

    if (!cleaned) {
      setPhase("idle");
      setErrorMsg(
        languageRef.current === "el"
          ? "Δεν αναγνωρίστηκε ελληνική ομιλία. Πάτησε ξανά το μικρόφωνο και μίλησε καθαρά."
          : "I didn't catch any speech. Tap the mic and speak again.",
      );
      return;
    }

    const inferredLanguage = inferLanguageFromTranscript(cleaned);
    if (inferredLanguage) rememberLanguageHint(inferredLanguage);

    setPhase("processing");
    void smartCapture(
      null,
      cleaned,
      languageRef.current,
      languageRef.current === "auto" ? adaptiveLanguageHintRef.current : languageRef.current,
    )
      .then((result) => {
        const safeTranscript = sanitizeVoiceTranscript(result.transcript || cleaned);
        const finalResult = result.transcript
          ? result
          : {
              ...classifyTranscript(cleaned),
              source: "browser" as const,
              provider: "browser" as const,
              language:
                languageRef.current !== "auto"
                  ? languageRef.current
                  : inferredLanguage,
            };
        transcriptManuallyEditedRef.current = false;
        setTranscript(safeTranscript);
        setAiResult({ ...finalResult, transcript: safeTranscript });
        if (typeAuto) setType(finalResult.type);
        setPhase("ready");
      })
      .catch(() => {
        const local = classifyTranscript(cleaned);
        transcriptManuallyEditedRef.current = false;
        setTranscript(local.transcript);
        setAiResult({
          ...local,
          source: "browser",
          provider: "browser",
          language:
            languageRef.current !== "auto"
              ? languageRef.current
              : inferredLanguage,
        });
        if (typeAuto) setType(local.type);
        setPhase("ready");
      });
  }, [cleanupRecognition, rememberLanguageHint, typeAuto]);

  const stopRecording = useCallback(
    (reason: "manual" | "silence" | "maxlen") => {
      if (!recordingRef.current) return;
      stopReasonRef.current = reason;
      recordingRef.current = false;

      const recognition = recognitionRef.current;
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          /* */
        }
      }

      const elapsed = Date.now() - startedAtRef.current;
      lastRecordingDurationMsRef.current = elapsed;
      const browserTranscript = sanitizeVoiceTranscript(
        liveTranscriptRef.current || committedTranscriptRef.current,
      );

      if (voiceModeRef.current === "browser") {
        // Android Chrome (especially Greek) may emit the final recognition
        // result only after recognition.stop(). Keep callbacks alive until
        // onresult/onend deliver that final phrase instead of discarding it.
        setPhase("processing");
        setAudioLevel(0.15);
        browserFinalizeTimerRef.current = setTimeout(finalizeBrowserTranscript, 1800);
        if (!recognition) finalizeBrowserTranscript();
        return;
      }

      const blob = encodePcmAsWav(pcmChunksRef.current, sampleRateRef.current);
      cleanupRecognition();
      cleanupAudio();

      if (!hasUsableVoiceCapture(browserTranscript, blob.size, elapsed)) {
        setPhase("idle");
        setAudioLevel(0);
        if (reason !== "silence") toast.error("I didn't catch any speech. Try again.");
        return;
      }

      setPhase("processing");
      setAudioLevel(0);
      void smartCapture(
        blob,
        browserTranscript,
        languageRef.current,
        languageRef.current === "auto" ? adaptiveLanguageHintRef.current : languageRef.current,
      )
        .then((result) => {
          if (!result.transcript) {
            serverFailureCountRef.current += 1;
            serverFailureUntilRef.current =
              Date.now() + voiceServerBackoffMs(serverFailureCountRef.current);
            setServerSttAvailable(false);
            setErrorMsg(
              getSpeechRecognition()
                ? "AI transcription is unavailable right now. Tap the mic again — Mission Control will switch to Chrome speech recognition."
                : "AI transcription is unavailable and this browser has no speech-recognition fallback.",
            );
            setPhase("ready");
            return;
          }
          serverFailureCountRef.current = 0;
          serverFailureUntilRef.current = 0;
          const learnedLanguage =
            result.language?.split("-")[0]?.toLowerCase() ||
            inferLanguageFromTranscript(result.transcript);
          if (learnedLanguage) rememberLanguageHint(learnedLanguage);
          const safeTranscript = sanitizeVoiceTranscript(result.transcript);
          if (!safeTranscript) {
            setErrorMsg("The transcription was empty after validation. Please record again.");
            setPhase("error");
            return;
          }
          transcriptManuallyEditedRef.current = false;
          setTranscript(safeTranscript);
          setAiResult({ ...result, transcript: safeTranscript });
          if (typeAuto) setType(result.type);
          setPhase("ready");
        })
        .catch((err: unknown) => {
          console.error("transcribe failed", err);
          serverFailureCountRef.current += 1;
          serverFailureUntilRef.current =
            Date.now() + voiceServerBackoffMs(serverFailureCountRef.current);
          setServerSttAvailable(false);
          const message = getSpeechRecognition()
            ? "AI transcription failed. Tap the mic again — Mission Control will use Chrome speech recognition."
            : err instanceof Error
              ? err.message
              : "Transcription failed";
          setErrorMsg(message);
          setPhase("error");
        });
    },
    [cleanupAudio, cleanupRecognition, finalizeBrowserTranscript, rememberLanguageHint, typeAuto],
  );

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;

    setErrorMsg(null);
    setTranscript("");
    setAiResult(null);
    setPhase("starting");
    setAudioLevel(0.2);
    committedTranscriptRef.current = "";
    liveTranscriptRef.current = "";
    lastFinalResultIndexRef.current = 0;
    stopReasonRef.current = null;
    pcmChunksRef.current = [];
    hasSpokenRef.current = false;
    lastRecordingDurationMsRef.current = 0;
    transcriptManuallyEditedRef.current = false;

    const Recognition = getSpeechRecognition();
    const serverReady = await probeVoiceEngine();
    const useServerAudio = shouldUseServerVoiceCapture({
      serverReady,
      browserRecognitionAvailable: Boolean(Recognition),
      serverFailureUntil: serverFailureUntilRef.current,
    });
    voiceModeRef.current = useServerAudio ? "server" : "browser";

    // Browser-only fallback: crucial on Android Chrome. Do NOT open getUserMedia
    // here, otherwise SpeechRecognition can lose access to the microphone.
    if (!useServerAudio) {
      if (!Recognition) {
        setSupported(false);
        setErrorMsg(
          "Voice transcription is not configured on the server and this browser does not support speech recognition.",
        );
        setPhase("error");
        setAudioLevel(0);
        return;
      }

      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      const environmentHint =
        typeof Intl !== "undefined"
          ? browserEnvironmentLanguageHint(
              navigator.languages || [],
              navigator.language || "en-US",
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            )
          : undefined;
      const browserLanguageHint =
        languageRef.current === "auto"
          ? adaptiveLanguageHintRef.current || environmentHint
          : languageRef.current;
      recognition.lang = browserRecognitionLanguage(
        languageRef.current,
        navigator.language || "en-US",
        browserLanguageHint,
      );
      recognition.maxAlternatives = 3;

      recognition.onresult = (event) => {
        const snapshot = buildRecognitionSnapshot(
          event.results,
          lastFinalResultIndexRef.current,
          committedTranscriptRef.current,
        );
        committedTranscriptRef.current = snapshot.transcript;
        lastFinalResultIndexRef.current = snapshot.nextFinalResultIndex;
        liveTranscriptRef.current = [snapshot.transcript, snapshot.interim]
          .filter(Boolean)
          .join(" ")
          .trim();
        const liveLanguage = inferLanguageFromTranscript(liveTranscriptRef.current);
        if (liveLanguage) rememberLanguageHint(liveLanguage);
        setTranscript(liveTranscriptRef.current);
        setPhase("hearing");
        setAudioLevel(0.75);
      };

      recognition.onerror = (event) => {
        const message = event.error || "speech recognition failed";
        if (message === "aborted") return;
        if (message === "not-allowed" || message === "service-not-allowed") {
          setErrorMsg(
            languageRef.current === "el"
              ? "Η πρόσβαση στο μικρόφωνο είναι μπλοκαρισμένη στο Chrome. Επίτρεψέ την και δοκίμασε ξανά."
              : "Microphone permission is blocked for Chrome. Allow microphone access for this site and try again.",
          );
          recordingRef.current = false;
          setPhase("error");
          return;
        }
        if (message === "language-not-supported") {
          setErrorMsg("Το Chrome δεν ενεργοποίησε αναγνώριση Ελληνικών (el-GR). Κλείσε και άνοιξε ξανά το Voice Capture.");
          recordingRef.current = false;
          setPhase("error");
          return;
        }
        if (message !== "no-speech") {
          console.warn("speech recognition error", message);
          setErrorMsg(`Chrome speech recognition error: ${message}`);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;

        if (stopReasonRef.current || !recordingRef.current) {
          finalizeBrowserTranscript();
          return;
        }

        // Chrome can end recognition after a short pause. Restart while the
        // user is still recording so multi-sentence Greek dictation continues.
        lastFinalResultIndexRef.current = 0;
        try {
          recognition.start();
          return;
        } catch {
          recognitionRef.current = null;
          finalizeBrowserTranscript();
        }
      };

      recognitionRef.current = recognition;
      recordingRef.current = true;
      startedAtRef.current = Date.now();
      try {
        recognition.start();
        setPhase("listening");
        setAudioLevel(0.35);
      } catch (error) {
        console.error("browser speech start failed", error);
        recordingRef.current = false;
        recognitionRef.current = null;
        setErrorMsg("Could not start Chrome speech recognition. Check microphone permission and try again.");
        setPhase("error");
        setAudioLevel(0);
      }
      return;
    }

    // Server STT path: record high-quality PCM only. Do not also start browser
    // recognition on Android; the server model is the source of truth.
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
      const msg =
        e?.name === "NotAllowedError"
          ? "Microphone access denied. Allow microphone access for this site, then try again."
          : e?.name === "NotFoundError"
            ? "No microphone detected on this device."
            : "Could not access the microphone.";
      setErrorMsg(msg);
      setPhase("error");
      setAudioLevel(0);
      toast.error(msg);
      return;
    }

    streamRef.current = stream;

    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);
      processor.onaudioprocess = (event) => {
        if (!recordingRef.current) return;
        pcmChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      processorRef.current = processor;
      silentGainRef.current = silentGain;
      sampleRateRef.current = ctx.sampleRate;

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
        setAudioLevel((prev) => prev * 0.6 + normalized * 0.4);

        const now = Date.now();
        if (rms > SPEECH_RMS_THRESHOLD) {
          hasSpokenRef.current = true;
          lastVoiceAtRef.current = now;
          setPhase((p) => (p === "starting" || p === "listening" ? "hearing" : p));
        } else if (rms > SILENCE_RMS_THRESHOLD) {
          lastVoiceAtRef.current = Math.max(lastVoiceAtRef.current, now - 200);
        }

        if (hasSpokenRef.current && now - lastVoiceAtRef.current > SILENCE_HANG_MS) {
          stopRecording("silence");
          return;
        }
        if (now - startedAtRef.current > MAX_RECORD_MS) {
          stopRecording("maxlen");
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("audio capture init failed", err);
      cleanupAudio();
      setErrorMsg("Could not initialize audio recording.");
      setPhase("error");
      setAudioLevel(0);
      return;
    }

    recordingRef.current = true;
    startedAtRef.current = Date.now();
    lastVoiceAtRef.current = Date.now();
    setPhase("listening");
  }, [cleanupAudio, finalizeBrowserTranscript, probeVoiceEngine, rememberLanguageHint, stopRecording]);

  // Open from the unified Capture Hub or keyboard shortcut.
  useEffect(() => {
    const openVoice = () => {
      setOpen(true);
      if (supported && phase === "idle") void startRecording();
    };
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        openVoice();
      }
    };
    document.addEventListener("keydown", h);
    window.addEventListener(VOICE_CAPTURE_OPEN_EVENT, openVoice);
    return () => {
      document.removeEventListener("keydown", h);
      window.removeEventListener(VOICE_CAPTURE_OPEN_EVENT, openVoice);
    };
  }, [supported, phase, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recordingRef.current = false;
      if (browserFinalizeTimerRef.current) clearTimeout(browserFinalizeTimerRef.current);
      cleanupRecognition();
      cleanupAudio();
    };
  }, [cleanupAudio, cleanupRecognition]);

  const handleClose = useCallback(() => {
    recordingRef.current = false;
    if (browserFinalizeTimerRef.current) {
      clearTimeout(browserFinalizeTimerRef.current);
      browserFinalizeTimerRef.current = null;
    }
    cleanupRecognition();
    cleanupAudio();
    setOpen(false);
    setPhase("idle");
    setErrorMsg(null);
    setTranscript("");
    setAiResult(null);
    setTypeAuto(true);
    setAudioLevel(0);
    committedTranscriptRef.current = "";
    liveTranscriptRef.current = "";
    lastFinalResultIndexRef.current = 0;
    lastRecordingDurationMsRef.current = 0;
    transcriptManuallyEditedRef.current = false;
  }, [cleanupAudio, cleanupRecognition]);

  const handleSave = async () => {
    if (!transcript.trim()) {
      toast.error("Nothing to save — try speaking first");
      return;
    }

    const sanitized = sanitizeVoiceTranscript(transcript);
    const originalWords = countTranscriptWords(transcript);
    const sanitizedWords = countTranscriptWords(sanitized);
    const maxReasonable = maxReasonableVoiceWords(lastRecordingDurationMsRef.current);

    // Generated voice text must never silently expand far beyond what could
    // plausibly be spoken during the actual recording.
    if (
      !transcriptManuallyEditedRef.current &&
      lastRecordingDurationMsRef.current > 0 &&
      sanitizedWords > maxReasonable
    ) {
      setTranscript(sanitized);
      setErrorMsg(
        `Transcript blocked: ${sanitizedWords} words from a ${Math.max(
          1,
          Math.round(lastRecordingDurationMsRef.current / 1000),
        )}-second recording looks duplicated. Re-record or review the transcript before saving.`,
      );
      toast.error("Not saved — duplicate voice transcription detected");
      return;
    }

    // A hard backstop remains even after manual edits. It prevents the exact
    // 50-word → 1,698-word corruption from ever being saved silently again.
    if (sanitizedWords > 1200) {
      setTranscript(sanitized);
      setErrorMsg(
        `Transcript has ${sanitizedWords} words and was blocked for safety. Review it before saving.`,
      );
      toast.error("Not saved — transcript is implausibly large");
      return;
    }

    if (sanitizedWords < originalWords) {
      setTranscript(sanitized);
      toast.info(`Removed ${originalWords - sanitizedWords} duplicated voice words before saving.`);
    }

    setSaving(true);
    try {
      const now = todayISO();
      const text = sanitized;
      const title = aiResult?.title || text.slice(0, 80);

      if (type === "tasks") {
        const taskPayload: Omit<Task, "id"> = {
          title,
          description: text,
          priority: aiResult?.priority || "medium",
          status: "todo",
          dueDate: aiResult?.dueDate || now,
          category: "Voice",
          linkedProject: "",
          subtasks: (aiResult?.subtasks || []).map((t, i) => ({
            id: `${Date.now()}-${i}`,
            title: t,
            done: false,
          })),
          createdAt: now,
          tags: aiResult?.tags,
          startTime: aiResult?.startTime,
          endTime: aiResult?.endTime,
          allDay: !aiResult?.startTime,
        };
        await addItem<Task>("tasks", taskPayload);
      } else if (type === "notes") {
        const notePayload: Omit<Note, "id"> = {
          title,
          content: text,
          color: "blue",
          pinned: false,
          tags: ["voice"],
          createdAt: now,
          updatedAt: now,
        };
        await addItem<Note>("notes", notePayload);
      } else if (type === "ideas") {
        const ideaPayload: Omit<Idea, "id"> = {
          title,
          description: text,
          category: "Voice",
          priority: (aiResult?.priority === "critical" ? "high" : aiResult?.priority) || "medium",
          status: "spark",
          tags: ["voice"],
          linkedProject: "",
          votes: 0,
          createdAt: now,
          updatedAt: now,
        };
        await addItem<Idea>("ideas", ideaPayload);
      } else if (type === "links") {
        const url = aiResult?.url?.trim();
        if (!url || !/^https?:\/\/[^\s]+$/i.test(url)) {
          toast.error("I couldn't detect a valid URL. Edit the transcript or save it as a note.");
          setSaving(false);
          return;
        }
        const linkPayload: Omit<LinkItem, "id"> = {
          title,
          url,
          category: "Voice",
          status: "active",
          description: text,
          dateAdded: now,
          pinned: false,
        };
        await addItem<LinkItem>("links", linkPayload);
      }
      toast.success(`🎤 ${TYPE_OPTIONS.find((o) => o.id === type)?.label} saved!`);
      handleClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "unknown";
      console.error(e);
      toast.error("Failed to save: " + message);
    } finally {
      setSaving(false);
    }
  };

  const isRecording = phase === "listening" || phase === "hearing" || phase === "starting";
  const activeOpt = TYPE_OPTIONS.find((o) => o.id === type) ?? TYPE_OPTIONS[0];
  const statusText = !supported
    ? "Voice capture not supported in this browser"
    : errorMsg
      ? errorMsg
      : phase === "starting"
        ? "Starting microphone…"
        : phase === "listening"
          ? voiceModeRef.current === "browser" && language === "el"
            ? "Ακούω Ελληνικά (el-GR)… μίλησε κανονικά"
            : voiceModeRef.current === "browser"
              ? "Listening with Chrome speech recognition…"
              : "Recording for AI transcription…"
          : phase === "hearing"
            ? language === "el"
              ? "Αναγνωρίζω την ελληνική ομιλία…"
              : "Hearing your speech…"
            : phase === "processing"
              ? voiceModeRef.current === "browser"
                ? language === "el"
                  ? "Ολοκληρώνω την ελληνική μεταγραφή…"
                  : "Finishing browser transcription…"
                : "Transcribing with AI…"
              : phase === "ready"
                ? "✨ Transcribed — review and save"
                : "Tap mic to start";

  return (
    <>


      <>
        {open && (
          <div
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-6"
            onClick={handleClose}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${activeOpt.color} flex items-center justify-center text-white shadow-md`}
                  >
                    <Mic size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Voice Capture</div>
                    <div className="text-[11px] text-muted-foreground">{statusText}</div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-2xl hover:bg-secondary/70 flex items-center justify-center text-muted-foreground transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mic + waveform */}
              <div className="px-5 sm:px-6 py-6 flex flex-col items-center gap-4 bg-gradient-to-b from-secondary/20 to-transparent">
                <button
                  onClick={() => {
                    if (isRecording) stopRecording("manual");
                    else if (phase !== "processing") void startRecording();
                  }}
                  disabled={!supported || phase === "processing"}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_10px_40px_-8px_rgb(244,63,94,0.6)]"
                      : phase === "processing"
                        ? "bg-secondary text-muted-foreground"
                        : "gradient-primary text-primary-foreground shadow-[var(--shadow-primary)]"
                  } disabled:opacity-60`}
                >
                  {phase === "processing" ? (
                    <Loader2 size={32} className="animate-spin" />
                  ) : isRecording ? (
                    <MicOff size={32} />
                  ) : (
                    <Mic size={32} />
                  )}
                  {isRecording && (
                    <span className="absolute inset-0 rounded-full border-2 border-rose-400/60" />
                  )}
                </button>

                {errorMsg && (
                  <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-background/80 px-4 py-3 text-center text-xs text-muted-foreground">
                    {errorMsg}
                  </div>
                )}

                {isRecording && (
                  <div className="flex items-center gap-1 h-8">
                    {[...Array(24)].map((_, i) => {
                      const distance = Math.abs(i - 12) / 12;
                      const pulse = 0.72 + ((i * 37) % 11) / 40;
                      const h = Math.max(4, audioLevel * 40 * (1 - distance * 0.5) * pulse);
                      return (
                        <div
                          key={i}
                          style={{ height: `${h}px` }}
                          className="w-1 rounded-full bg-gradient-to-t from-primary/60 to-primary transition-[height] duration-75"
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="px-5 sm:px-6 pb-4">
                <div className="min-h-[100px] max-h-[180px] overflow-y-auto bg-secondary/40 rounded-2xl p-4 text-[14px] leading-relaxed text-foreground border border-border/30">
                  {transcript || phase === "ready" ? (
                    <textarea
                      value={transcript}
                      onChange={(e) => {
                        transcriptManuallyEditedRef.current = true;
                        setTranscript(e.target.value);
                        if (typeAuto) setType(inferTypeLocal(e.target.value));
                      }}
                      rows={4}
                      className="w-full bg-transparent outline-none resize-none text-[14px] leading-relaxed text-foreground"
                      aria-label="Transcript"
                      placeholder="Type your note here, or tap the mic to speak…"
                      autoFocus={phase === "ready" && !transcript}
                    />
                  ) : phase === "processing" ? (
                    <span className="text-muted-foreground italic flex items-center gap-2">
                      <Sparkles size={14} className="animate-pulse" />
                      AI is transcribing your voice…
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 italic">
                      Try saying: "Remind me to call the client tomorrow", "Idea: AI tool for
                      invoices", "Note: meeting at 3pm went well"…
                    </span>
                  )}
                </div>
                {transcript && (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setTranscript("");
                        setAiResult(null);
                        setPhase("idle");
                        lastRecordingDurationMsRef.current = 0;
                        transcriptManuallyEditedRef.current = false;
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition"
                    >
                      Clear & re-record
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{countTranscriptWords(transcript)} words</span>
                      {!transcriptManuallyEditedRef.current &&
                        lastRecordingDurationMsRef.current > 0 &&
                        countTranscriptWords(transcript) >
                          maxReasonableVoiceWords(lastRecordingDurationMsRef.current) && (
                          <span className="rounded-full bg-destructive/10 px-2 py-1 font-bold text-destructive">
                            duplicate transcript suspected
                          </span>
                        )}
                    </div>
                    {aiResult && (
                      <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-1 font-semibold text-primary">
                          <Sparkles size={10} /> {aiResult.source === "ai" ? "Audio AI" : aiResult.source === "browser" ? "Browser STT" : "Local fallback"}
                        </span>
                        {aiResult.provider && (
                          <span className="rounded-full bg-secondary px-2 py-1 font-medium text-muted-foreground">
                            {aiResult.provider === "lovable" ? "Lovable STT" : aiResult.provider === "gemini" ? "Gemini STT" : "Browser"}
                          </span>
                        )}
                        {typeof aiResult.agreement === "number" && aiResult.browserTranscript && (
                          <span
                            className="rounded-full bg-secondary px-2 py-1 font-medium text-muted-foreground"
                            title="Word overlap between server audio transcription and browser live recognition; this is not a confidence score."
                          >
                            {aiResult.agreement}% cross-check
                          </span>
                        )}
                        <span className="font-medium text-primary/80">
                          {aiResult.type}{aiResult.language ? ` · ${aiResult.language.toUpperCase()}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-5 sm:px-6 pb-3">
                <div className="flex items-center justify-between rounded-2xl border border-border/30 bg-secondary/25 px-3 py-2 text-[10px]">
                  <span className="font-semibold text-muted-foreground">VOICE ENGINE</span>
                  <span className="font-bold text-foreground">
                    {serverSttAvailable === true
                      ? language === "auto"
                        ? `AI multilingual auto · ${
                            voiceProviders.lovable
                              ? "Lovable STT"
                              : voiceProviders.gemini
                                ? "Gemini STT"
                                : "server STT"
                          }`
                        : `AI · ${languageToLocale(language)} · ${
                            voiceProviders.lovable
                              ? "Lovable STT"
                              : voiceProviders.gemini
                                ? "Gemini STT"
                                : "server STT"
                          }`
                      : serverSttAvailable === false
                        ? language === "auto"
                          ? `Chrome adaptive fallback · ${languageToLocale(
                              adaptiveLanguageHint ||
                                browserEnvironmentLanguageHint(
                                  typeof navigator !== "undefined" ? navigator.languages || [] : [],
                                  typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US",
                                  typeof Intl !== "undefined"
                                    ? Intl.DateTimeFormat().resolvedOptions().timeZone
                                    : undefined,
                                ) || "en",
                            )}`
                          : `Chrome fallback · ${languageToLocale(language)}`
                        : "Checking multilingual engine…"}
                  </span>
                </div>
                {serverSttAvailable === false && (
                  <p className="mt-1.5 px-1 text-[9px] leading-relaxed text-warning">
                    Auto is temporarily using the browser's single-language fallback. A failed AI
                    transcription now triggers bounded backoff instead of repeatedly trapping the
                    recorder in a broken server path; Mission Control retries AI automatically after
                    the cooldown.
                  </p>
                )}
              </div>

              {/* Language */}
              <div className="px-5 sm:px-6 pb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Language
                </span>
                <select
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="text-xs bg-secondary/50 border border-border/40 rounded-xl px-3 py-2 text-foreground outline-none"
                  aria-label="Spoken language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                {language === "auto" && serverSttAvailable === false && (
                  <span className="text-[9px] font-medium text-muted-foreground">
                    Adaptive: {languageToLocale(
                      adaptiveLanguageHint ||
                        browserEnvironmentLanguageHint(
                          typeof navigator !== "undefined" ? navigator.languages || [] : [],
                          typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US",
                          typeof Intl !== "undefined"
                            ? Intl.DateTimeFormat().resolvedOptions().timeZone
                            : undefined,
                        ) || "en",
                    )}
                  </span>
                )}
              </div>

              {/* Type selector */}
              <div className="px-5 sm:px-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Save as
                  </span>
                  {typeAuto && transcript && (
                    <span className="text-[10px] text-primary/80 font-medium">
                      ✨ Auto-detected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const active = type === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setType(opt.id);
                          setTypeAuto(false);
                        }}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${
                          active
                            ? `bg-gradient-to-br ${opt.color} text-white border-transparent shadow-md`
                            : "bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
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
                  Shortcut:{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/40 font-mono text-[10px]">
                    ⌘⇧V
                  </kbd>
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!transcript || saving || phase === "processing"}
                    className="px-5 py-2.5 rounded-2xl text-sm font-semibold gradient-primary text-primary-foreground shadow-[var(--shadow-primary)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    Save {activeOpt.label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    </>
  );
}
