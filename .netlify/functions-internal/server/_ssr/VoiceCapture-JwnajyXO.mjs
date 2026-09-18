import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useAddItem } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Cn as CircleCheck, Ct as Link, D as Sparkles, Et as Lightbulb, S as StickyNote, St as ListChecks, dt as Mic, ft as MicOff, n as X, yt as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/VoiceCapture-JwnajyXO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SPACE_RE = /\s+/g;
function normalizeWhitespace$1(text) {
	return text.replace(SPACE_RE, " ").trim();
}
function normalizeToken(token) {
	return token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}
function splitWords(text) {
	const normalized = normalizeWhitespace$1(text);
	return normalized ? normalized.split(" ") : [];
}
function tokensMatch(a, b) {
	return normalizeToken(a) === normalizeToken(b);
}
function countWordOverlap(existingWords, incomingWords) {
	const maxOverlap = Math.min(existingWords.length, incomingWords.length, 16);
	for (let size = maxOverlap; size >= 1; size--) {
		let matches = true;
		for (let i = 0; i < size; i++) if (!tokensMatch(existingWords[existingWords.length - size + i], incomingWords[i])) {
			matches = false;
			break;
		}
		if (matches) return size;
	}
	return 0;
}
function compressRepeatedPhrases(text) {
	const words = splitWords(text);
	if (!words.length) return "";
	const output = [];
	let i = 0;
	while (i < words.length) {
		let bestLength = 0;
		let bestRepeats = 1;
		const maxLength = Math.min(12, Math.floor((words.length - i) / 2));
		for (let length = maxLength; length >= 1; length--) {
			const pattern = words.slice(i, i + length);
			let repeats = 1;
			while (i + length * (repeats + 1) <= words.length) {
				const candidate = words.slice(i + length * repeats, i + length * (repeats + 1));
				if (!pattern.every((token, idx) => tokensMatch(token, candidate[idx]))) break;
				repeats += 1;
			}
			if (length === 1 ? repeats >= 4 : repeats >= 2) {
				bestLength = length;
				bestRepeats = repeats;
				break;
			}
		}
		if (bestLength > 0) {
			output.push(...words.slice(i, i + bestLength));
			i += bestLength * bestRepeats;
			continue;
		}
		output.push(words[i]);
		i += 1;
	}
	return normalizeWhitespace$1(output.join(" "));
}
function appendSpeechSegment(existing, incoming) {
	const base = normalizeWhitespace$1(existing);
	const next = normalizeWhitespace$1(incoming);
	if (!next) return base;
	if (!base) return compressRepeatedPhrases(next);
	const baseWords = splitWords(base);
	const nextWords = splitWords(next);
	if (nextWords.length <= baseWords.length && countWordOverlap(baseWords, nextWords) === nextWords.length) return compressRepeatedPhrases(base);
	const overlap = countWordOverlap(baseWords, nextWords);
	return compressRepeatedPhrases([...baseWords, ...nextWords.slice(overlap)].join(" "));
}
function buildRecognitionSnapshot(results, lastFinalResultIndex, committedTranscript) {
	let nextTranscript = committedTranscript;
	let nextFinalResultIndex = lastFinalResultIndex;
	const interimSegments = [];
	for (let i = lastFinalResultIndex; i < results.length; i++) {
		const result = results[i];
		const text = normalizeWhitespace$1(result?.[0]?.transcript ?? "");
		if (!text) continue;
		if (result.isFinal) {
			nextTranscript = appendSpeechSegment(nextTranscript, text);
			nextFinalResultIndex = i + 1;
		} else interimSegments.push(text);
	}
	return {
		transcript: nextTranscript,
		interim: compressRepeatedPhrases(interimSegments.join(" ")),
		nextFinalResultIndex
	};
}
var WEEKDAY_INDEX = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6
};
var MONTH_INDEX = {
	january: 0,
	february: 1,
	march: 2,
	april: 3,
	may: 4,
	june: 5,
	july: 6,
	august: 7,
	september: 8,
	october: 9,
	november: 10,
	december: 11
};
var URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/i;
function normalizeWhitespace(text) {
	return text.replace(/\s+/g, " ").trim();
}
function formatDate(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(base, days) {
	const next = new Date(base);
	next.setHours(0, 0, 0, 0);
	next.setDate(next.getDate() + days);
	return next;
}
function nextWeekday(base, targetDay, forceNextWeek) {
	const next = new Date(base);
	next.setHours(0, 0, 0, 0);
	let delta = (targetDay - next.getDay() + 7) % 7;
	if (delta === 0 || forceNextWeek) delta += 7;
	next.setDate(next.getDate() + delta);
	return next;
}
function extractUrl(transcript) {
	const match = transcript.match(URL_RE);
	if (!match) return void 0;
	let url = match[1].replace(/[),.;!?]+$/, "");
	if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
	return url;
}
function inferType(transcript) {
	const text = transcript.toLowerCase();
	if (extractUrl(transcript) || /\b(link|url|website|web site|webpage|bookmark|article|page|domain)\b/.test(text)) return "links";
	if (/^(idea|brainstorm|what if|maybe we should|we could|it would be cool|concept)\b/.test(text) || /\bfeature idea\b/.test(text)) return "ideas";
	if (/^(note|remember|note to self|journal|log)\b/.test(text) || /\bmeeting notes?\b/.test(text)) return "notes";
	if (/^(task|todo|to do|remind me to|i need to|need to|don't let me forget to|follow up on|call |email |send |finish |schedule |book |buy |pay )/.test(text) || /\b(today|tomorrow|tonight|next week|by monday|by tuesday|asap|urgent)\b/.test(text)) return "tasks";
	return "notes";
}
function inferPriority(transcript) {
	const text = transcript.toLowerCase();
	if (/\b(critical|emergency|immediately|right away|urgent|asap)\b/.test(text)) return "critical";
	if (/\b(high priority|important|today|tonight|soon|this afternoon|this evening)\b/.test(text)) return "high";
	if (/\b(low priority|later|someday|whenever|eventually|no rush)\b/.test(text)) return "low";
	return "medium";
}
function inferDueDate(transcript) {
	const text = transcript.toLowerCase();
	const today = /* @__PURE__ */ new Date();
	today.setHours(0, 0, 0, 0);
	if (/\b(today|tonight|this morning|this afternoon|this evening)\b/.test(text)) return formatDate(today);
	if (/\b(tomorrow)\b/.test(text)) return formatDate(addDays(today, 1));
	if (/\b(day after tomorrow)\b/.test(text)) return formatDate(addDays(today, 2));
	const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
	if (isoMatch) {
		const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
		if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
	}
	const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
	if (slashMatch) {
		const yearRaw = slashMatch[3];
		const year = yearRaw ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : today.getFullYear();
		const parsed = new Date(year, Number(slashMatch[1]) - 1, Number(slashMatch[2]));
		if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
	}
	const monthMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/);
	if (monthMatch) {
		const year = monthMatch[3] ? Number(monthMatch[3]) : today.getFullYear();
		const parsed = new Date(year, MONTH_INDEX[monthMatch[1]], Number(monthMatch[2]));
		if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
	}
	const weekdayMatch = text.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
	if (weekdayMatch) return formatDate(nextWeekday(today, WEEKDAY_INDEX[weekdayMatch[2]], Boolean(weekdayMatch[1])));
}
function stripLeadingLabel(transcript, type) {
	return normalizeWhitespace(normalizeWhitespace(transcript).replace({
		tasks: /^(task|todo|to do|remind me to|i need to|need to)\s*[:-]?\s*/i,
		notes: /^(note|note to self|remember|journal|log)\s*[:-]?\s*/i,
		ideas: /^(idea|brainstorm|concept|what if)\s*[:-]?\s*/i,
		links: /^(link|url|website|bookmark)\s*[:-]?\s*/i
	}[type], ""));
}
function buildTitle(transcript, type) {
	const cleaned = stripLeadingLabel(transcript, type) || transcript;
	const firstChunk = cleaned.split(/[.!?\n]/)[0]?.trim() || cleaned;
	return (firstChunk.length > 80 ? `${firstChunk.slice(0, 77).trimEnd()}…` : firstChunk) || "Voice capture";
}
function classifyTranscript(transcript) {
	const cleanedTranscript = compressRepeatedPhrases(normalizeWhitespace(transcript));
	if (!cleanedTranscript) throw new Error("I did not catch any speech to classify.");
	const type = inferType(cleanedTranscript);
	const result = {
		transcript: cleanedTranscript,
		type,
		title: buildTitle(cleanedTranscript, type)
	};
	if (type === "tasks") {
		result.priority = inferPriority(cleanedTranscript);
		result.dueDate = inferDueDate(cleanedTranscript) || formatDate(/* @__PURE__ */ new Date());
	}
	if (type === "links") result.url = extractUrl(cleanedTranscript);
	return result;
}
var VALID_TYPES = /* @__PURE__ */ new Set([
	"tasks",
	"notes",
	"ideas",
	"links"
]);
async function smartCapture(audio, browserTranscript, language = "auto") {
	const form = new FormData();
	if (audio && audio.size > 0) {
		const mime = (audio.type || "audio/webm").split(";")[0];
		const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
		form.append("audio", audio, `recording.${ext}`);
	}
	form.append("browserTranscript", browserTranscript ?? "");
	form.append("language", language || "auto");
	try {
		const res = await fetch("/api/voice/transcribe", {
			method: "POST",
			body: form
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok || !data.transcript) {
			if (data.allowTextFallback && browserTranscript.trim()) return {
				...classifyTranscript(browserTranscript),
				source: "local"
			};
			if (browserTranscript.trim()) return {
				...classifyTranscript(browserTranscript),
				source: "local"
			};
			if (data.allowTextFallback) return {
				transcript: "",
				type: "notes",
				title: "",
				source: "local"
			};
			throw new Error(data.error || "Could not transcribe the recording.");
		}
		const s = data.structured;
		const transcript = (s?.cleanedTranscript || data.transcript).trim();
		if (!s || !s.type || !VALID_TYPES.has(s.type)) return {
			...classifyTranscript(transcript),
			source: data.source ?? "local"
		};
		const result = {
			transcript,
			type: s.type,
			title: (s.title || transcript.slice(0, 80)).trim(),
			source: data.source ?? "ai",
			subtasks: Array.isArray(s.subtasks) ? s.subtasks.filter(Boolean).slice(0, 20) : void 0,
			tags: Array.isArray(s.tags) ? s.tags.filter(Boolean).slice(0, 6) : void 0,
			language: typeof s.language === "string" ? s.language : void 0
		};
		if (s.type === "tasks") {
			result.priority = s.priority ?? "medium";
			result.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(s.dueDate ?? "") ? s.dueDate : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
			if (/^\d{2}:\d{2}$/.test(s.startTime ?? "")) result.startTime = s.startTime;
			if (/^\d{2}:\d{2}$/.test(s.endTime ?? "")) result.endTime = s.endTime;
		}
		if (s.type === "links" && s.url) result.url = /^https?:\/\//i.test(s.url) ? s.url : `https://${s.url}`;
		return result;
	} catch (err) {
		if (browserTranscript.trim()) return {
			...classifyTranscript(browserTranscript),
			source: "local"
		};
		throw err instanceof Error ? err : /* @__PURE__ */ new Error("Transcription failed");
	}
}
var TARGET_SAMPLE_RATE = 16e3;
function downsample(input, sourceRate) {
	if (sourceRate <= TARGET_SAMPLE_RATE) return input;
	const ratio = sourceRate / TARGET_SAMPLE_RATE;
	const length = Math.max(1, Math.round(input.length / ratio));
	const output = new Float32Array(length);
	for (let i = 0; i < length; i += 1) {
		const start = Math.floor(i * ratio);
		const end = Math.min(input.length, Math.floor((i + 1) * ratio));
		let sum = 0;
		for (let j = start; j < end; j += 1) sum += input[j];
		output[i] = sum / Math.max(1, end - start);
	}
	return output;
}
function encodePcmAsWav(chunks, sourceRate) {
	const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
	const joined = new Float32Array(sampleCount);
	let offset = 0;
	for (const chunk of chunks) {
		joined.set(chunk, offset);
		offset += chunk.length;
	}
	const samples = downsample(joined, sourceRate);
	const buffer = /* @__PURE__ */ new ArrayBuffer(44 + samples.length * 2);
	const view = new DataView(buffer);
	const write = (at, value) => {
		for (let i = 0; i < value.length; i += 1) view.setUint8(at + i, value.charCodeAt(i));
	};
	write(0, "RIFF");
	view.setUint32(4, 36 + samples.length * 2, true);
	write(8, "WAVE");
	write(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, TARGET_SAMPLE_RATE, true);
	view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	write(36, "data");
	view.setUint32(40, samples.length * 2, true);
	for (let i = 0; i < samples.length; i += 1) {
		const sample = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
	}
	return new Blob([buffer], { type: "audio/wav" });
}
var TYPE_OPTIONS = [
	{
		id: "tasks",
		label: "Task",
		icon: ListChecks,
		emoji: "✅",
		color: "from-blue-500 to-indigo-500"
	},
	{
		id: "notes",
		label: "Note",
		icon: StickyNote,
		emoji: "📝",
		color: "from-amber-500 to-orange-500"
	},
	{
		id: "ideas",
		label: "Idea",
		icon: Lightbulb,
		emoji: "💡",
		color: "from-violet-500 to-fuchsia-500"
	},
	{
		id: "links",
		label: "Link",
		icon: Link,
		emoji: "🔗",
		color: "from-emerald-500 to-teal-500"
	}
];
var SILENCE_RMS_THRESHOLD = .012;
var SPEECH_RMS_THRESHOLD = .025;
var SILENCE_HANG_MS = 3500;
var MAX_RECORD_MS = 18e4;
var MIN_RECORD_MS = 600;
var LANG_KEY = "mc:voiceLang";
var LANGUAGES = [
	{
		id: "auto",
		label: "Auto detect"
	},
	{
		id: "en",
		label: "English"
	},
	{
		id: "el",
		label: "Ελληνικά"
	},
	{
		id: "de",
		label: "Deutsch"
	},
	{
		id: "fr",
		label: "Français"
	},
	{
		id: "es",
		label: "Español"
	},
	{
		id: "it",
		label: "Italiano"
	},
	{
		id: "pt",
		label: "Português"
	},
	{
		id: "nl",
		label: "Nederlands"
	},
	{
		id: "ro",
		label: "Română"
	},
	{
		id: "ru",
		label: "Русский"
	},
	{
		id: "ar",
		label: "العربية"
	},
	{
		id: "hi",
		label: "हिन्दी"
	},
	{
		id: "zh",
		label: "中文"
	},
	{
		id: "ja",
		label: "日本語"
	}
];
function getSpeechRecognition() {
	if (typeof window === "undefined") return null;
	return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}
function inferTypeLocal(text) {
	const lower = text.toLowerCase();
	if (/\b(link|url|website|http|bookmark)\b/.test(lower) || /^https?:\/\//.test(text.trim())) return "links";
	if (/^(idea|brainstorm|what if|concept)\b/.test(lower)) return "ideas";
	if (/^(note|remember|journal|log|meeting)\b/.test(lower)) return "notes";
	return "tasks";
}
function VoiceCapture() {
	const addItem = useAddItem();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [supported, setSupported] = (0, import_react.useState)(true);
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [errorMsg, setErrorMsg] = (0, import_react.useState)(null);
	const [transcript, setTranscript] = (0, import_react.useState)("");
	const [type, setType] = (0, import_react.useState)("tasks");
	const [typeAuto, setTypeAuto] = (0, import_react.useState)(true);
	const [aiResult, setAiResult] = (0, import_react.useState)(null);
	const [audioLevel, setAudioLevel] = (0, import_react.useState)(0);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [language, setLanguage] = (0, import_react.useState)("auto");
	const languageRef = (0, import_react.useRef)("auto");
	(0, import_react.useEffect)(() => {
		if (typeof localStorage === "undefined") return;
		const stored = localStorage.getItem(LANG_KEY);
		if (stored && LANGUAGES.some((l) => l.id === stored)) {
			setLanguage(stored);
			languageRef.current = stored;
		}
	}, []);
	const changeLanguage = (0, import_react.useCallback)((id) => {
		setLanguage(id);
		languageRef.current = id;
		try {
			localStorage.setItem(LANG_KEY, id);
		} catch {}
	}, []);
	const recordingRef = (0, import_react.useRef)(false);
	const recognitionRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const audioCtxRef = (0, import_react.useRef)(null);
	const analyserRef = (0, import_react.useRef)(null);
	const sourceRef = (0, import_react.useRef)(null);
	const processorRef = (0, import_react.useRef)(null);
	const silentGainRef = (0, import_react.useRef)(null);
	const rafRef = (0, import_react.useRef)(null);
	const pcmChunksRef = (0, import_react.useRef)([]);
	const sampleRateRef = (0, import_react.useRef)(48e3);
	const startedAtRef = (0, import_react.useRef)(0);
	const lastVoiceAtRef = (0, import_react.useRef)(0);
	const hasSpokenRef = (0, import_react.useRef)(false);
	const stopReasonRef = (0, import_react.useRef)(null);
	const committedTranscriptRef = (0, import_react.useRef)("");
	const liveTranscriptRef = (0, import_react.useRef)("");
	const lastFinalResultIndexRef = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		const ok = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== "undefined";
		setSupported(ok);
	}, []);
	(0, import_react.useEffect)(() => {
		const h = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") {
				e.preventDefault();
				setOpen(true);
			}
		};
		document.addEventListener("keydown", h);
		return () => document.removeEventListener("keydown", h);
	}, []);
	const cleanupRecognition = (0, import_react.useCallback)(() => {
		const recognition = recognitionRef.current;
		recognitionRef.current = null;
		if (!recognition) return;
		recognition.onresult = null;
		recognition.onerror = null;
		recognition.onend = null;
		try {
			recognition.abort();
		} catch {}
	}, []);
	const cleanupAudio = (0, import_react.useCallback)(() => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
		try {
			sourceRef.current?.disconnect();
		} catch {}
		try {
			processorRef.current?.disconnect();
		} catch {}
		try {
			silentGainRef.current?.disconnect();
		} catch {}
		try {
			analyserRef.current?.disconnect();
		} catch {}
		try {
			audioCtxRef.current?.close();
		} catch {}
		sourceRef.current = null;
		processorRef.current = null;
		silentGainRef.current = null;
		analyserRef.current = null;
		audioCtxRef.current = null;
		if (streamRef.current) streamRef.current.getTracks().forEach((t) => {
			try {
				t.stop();
			} catch {}
		});
		streamRef.current = null;
	}, []);
	const stopRecording = (0, import_react.useCallback)((reason) => {
		if (!recordingRef.current) return;
		stopReasonRef.current = reason;
		recordingRef.current = false;
		const recognition = recognitionRef.current;
		if (recognition) try {
			recognition.stop();
		} catch {}
		const elapsed = Date.now() - startedAtRef.current;
		const heardSomething = hasSpokenRef.current || !!(liveTranscriptRef.current || committedTranscriptRef.current);
		const blob = encodePcmAsWav(pcmChunksRef.current, sampleRateRef.current);
		cleanupRecognition();
		cleanupAudio();
		if (!heardSomething || elapsed < MIN_RECORD_MS || blob.size < 2048) {
			setPhase("idle");
			setAudioLevel(0);
			if (reason !== "silence") toast.error("I didn't catch any speech. Try again.");
			return;
		}
		setPhase("processing");
		setAudioLevel(0);
		smartCapture(blob, liveTranscriptRef.current || committedTranscriptRef.current, languageRef.current).then((result) => {
			if (!result.transcript) {
				setErrorMsg("Could not transcribe your voice in this browser. Type your note below, or try Chrome for voice recognition.");
				setPhase("ready");
				return;
			}
			setTranscript(result.transcript);
			setAiResult(result);
			if (typeAuto) setType(result.type);
			setPhase("ready");
		}).catch((err) => {
			console.error("transcribe failed", err);
			const message = err instanceof Error ? err.message : "Transcription failed";
			setErrorMsg(message);
			setPhase("error");
		});
	}, [
		cleanupAudio,
		cleanupRecognition,
		typeAuto
	]);
	const startRecording = (0, import_react.useCallback)(async () => {
		if (recordingRef.current) return;
		setErrorMsg(null);
		setTranscript("");
		setAiResult(null);
		setPhase("starting");
		setAudioLevel(.2);
		committedTranscriptRef.current = "";
		liveTranscriptRef.current = "";
		lastFinalResultIndexRef.current = 0;
		let stream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
				channelCount: 1
			} });
		} catch (err) {
			const e = err;
			console.warn("mic permission denied", e);
			const msg = e?.name === "NotAllowedError" ? "Microphone access denied. Allow it in your browser, then try again." : e?.name === "NotFoundError" ? "No microphone detected on this device." : "Could not access the microphone.";
			setErrorMsg(msg);
			setPhase("error");
			setAudioLevel(0);
			toast.error(msg);
			return;
		}
		streamRef.current = stream;
		const Recognition = getSpeechRecognition();
		const recognition = Recognition ? new Recognition() : null;
		if (recognition) {
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.lang = languageRef.current !== "auto" ? languageRef.current : navigator.language || "en-US";
			recognition.maxAlternatives = 1;
			recognition.onresult = (event) => {
				const snapshot = buildRecognitionSnapshot(event.results, lastFinalResultIndexRef.current, committedTranscriptRef.current);
				committedTranscriptRef.current = snapshot.transcript;
				lastFinalResultIndexRef.current = snapshot.nextFinalResultIndex;
				liveTranscriptRef.current = [snapshot.transcript, snapshot.interim].filter(Boolean).join(" ").trim();
				setTranscript(liveTranscriptRef.current);
			};
			recognition.onerror = (event) => {
				const message = event.error || "speech recognition failed";
				if (message === "aborted" || message === "no-speech") return;
				console.warn("speech recognition error", message);
			};
			recognition.onend = () => {
				if (recognitionRef.current !== recognition) return;
				if (!stopReasonRef.current && recordingRef.current) {
					lastFinalResultIndexRef.current = 0;
					try {
						recognition.start();
						return;
					} catch {}
				}
				recognitionRef.current = null;
			};
			recognitionRef.current = recognition;
		}
		try {
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			const processor = ctx.createScriptProcessor(4096, 1, 1);
			const silentGain = ctx.createGain();
			silentGain.gain.value = 0;
			analyser.fftSize = 1024;
			analyser.smoothingTimeConstant = .6;
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
				setAudioLevel((prev) => prev * .6 + normalized * .4);
				const now = Date.now();
				if (rms > SPEECH_RMS_THRESHOLD) {
					hasSpokenRef.current = true;
					lastVoiceAtRef.current = now;
					setPhase((p) => p === "starting" || p === "listening" ? "hearing" : p);
				} else if (rms > SILENCE_RMS_THRESHOLD) lastVoiceAtRef.current = Math.max(lastVoiceAtRef.current, now - 200);
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
			console.warn("audio meter init failed", err);
		}
		pcmChunksRef.current = [];
		recordingRef.current = true;
		startedAtRef.current = Date.now();
		lastVoiceAtRef.current = Date.now();
		hasSpokenRef.current = false;
		try {
			try {
				recognition?.start();
			} catch {}
			setPhase("listening");
		} catch (err) {
			console.error("recording start failed", err);
			cleanupRecognition();
			cleanupAudio();
			recordingRef.current = false;
			setErrorMsg("Could not start recording. Try again.");
			setPhase("error");
		}
	}, [
		cleanupAudio,
		cleanupRecognition,
		stopRecording
	]);
	(0, import_react.useEffect)(() => {
		return () => {
			recordingRef.current = false;
			cleanupRecognition();
			cleanupAudio();
		};
	}, [cleanupAudio, cleanupRecognition]);
	const handleClose = (0, import_react.useCallback)(() => {
		recordingRef.current = false;
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
	}, [cleanupAudio, cleanupRecognition]);
	const handleSave = async () => {
		if (!transcript) {
			toast.error("Nothing to save — try speaking first");
			return;
		}
		setSaving(true);
		try {
			const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
			const title = aiResult?.title || transcript.slice(0, 80);
			const text = transcript;
			if (type === "tasks") {
				const taskPayload = {
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
						done: false
					})),
					createdAt: now,
					tags: aiResult?.tags,
					startTime: aiResult?.startTime,
					endTime: aiResult?.endTime,
					allDay: !aiResult?.startTime
				};
				await addItem("tasks", taskPayload);
			} else if (type === "notes") await addItem("notes", {
				title,
				content: text,
				color: "blue",
				pinned: false,
				tags: ["voice"],
				createdAt: now,
				updatedAt: now
			});
			else if (type === "ideas") {
				const ideaPayload = {
					title,
					description: text,
					category: "Voice",
					priority: (aiResult?.priority === "critical" ? "high" : aiResult?.priority) || "medium",
					status: "spark",
					tags: ["voice"],
					linkedProject: "",
					votes: 0,
					createdAt: now,
					updatedAt: now
				};
				await addItem("ideas", ideaPayload);
			} else if (type === "links") {
				const linkPayload = {
					title,
					url: aiResult?.url || "https://",
					category: "Voice",
					status: "active",
					description: text,
					dateAdded: now,
					pinned: false
				};
				await addItem("links", linkPayload);
			}
			toast.success(`🎤 ${TYPE_OPTIONS.find((o) => o.id === type)?.label} saved!`);
			handleClose();
		} catch (e) {
			const message = e instanceof Error ? e.message : "unknown";
			console.error(e);
			toast.error("Failed to save: " + message);
		} finally {
			setSaving(false);
		}
	};
	const isRecording = phase === "listening" || phase === "hearing" || phase === "starting";
	const activeOpt = TYPE_OPTIONS.find((o) => o.id === type) ?? TYPE_OPTIONS[0];
	const statusText = !supported ? "Voice capture not supported in this browser" : errorMsg ? errorMsg : phase === "starting" ? "Starting microphone…" : phase === "listening" ? "Listening… speak naturally (auto-stops on silence)" : phase === "hearing" ? "Hearing your speech…" : phase === "processing" ? "Transcribing with AI…" : phase === "ready" ? "✨ Transcribed — review and save" : "Tap mic to start";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: () => {
			setOpen(true);
			if (supported && phase === "idle") startRecording();
		},
		className: "fixed z-40 bottom-[calc(env(safe-area-inset-bottom)+92px)] right-4 lg:bottom-8 lg:right-8 w-[52px] h-[52px] lg:w-16 lg:h-16 rounded-2xl gradient-primary text-primary-foreground shadow-[0_10px_40px_-8px_hsl(var(--primary)/0.6)] flex items-center justify-center group",
		title: "Voice capture (⌘⇧V)",
		"aria-label": "Voice capture",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {
			size: 22,
			className: "lg:w-7 lg:h-7"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-2xl ring-2 ring-primary/40 animate-ping opacity-40 group-hover:opacity-70" })]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 bg-background/70 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-6",
		onClick: handleClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			onClick: (e) => e.stopPropagation(),
			className: "w-full max-w-xl bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/30",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `w-10 h-10 rounded-2xl bg-gradient-to-br ${activeOpt.color} flex items-center justify-center text-white shadow-md`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { size: 18 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-bold text-foreground",
							children: "Voice Capture"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-muted-foreground",
							children: statusText
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: handleClose,
						className: "w-9 h-9 rounded-2xl hover:bg-secondary/70 flex items-center justify-center text-muted-foreground transition",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 sm:px-6 py-6 flex flex-col items-center gap-4 bg-gradient-to-b from-secondary/20 to-transparent",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								if (isRecording) stopRecording("manual");
								else if (phase !== "processing") startRecording();
							},
							disabled: !supported || phase === "processing",
							className: `relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_10px_40px_-8px_rgb(244,63,94,0.6)]" : phase === "processing" ? "bg-secondary text-muted-foreground" : "gradient-primary text-primary-foreground shadow-[var(--shadow-primary)]"} disabled:opacity-60`,
							children: [phase === "processing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								size: 32,
								className: "animate-spin"
							}) : isRecording ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { size: 32 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { size: 32 }), isRecording && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-full border-2 border-rose-400/60" })]
						}),
						errorMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-full max-w-sm rounded-2xl border border-border/40 bg-background/80 px-4 py-3 text-center text-xs text-muted-foreground",
							children: errorMsg
						}),
						isRecording && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-1 h-8",
							children: [...Array(24)].map((_, i) => {
								const distance = Math.abs(i - 12) / 12;
								const h = Math.max(4, audioLevel * 40 * (1 - distance * .5) * (.6 + Math.random() * .4));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: { height: `${h}px` },
									className: "w-1 rounded-full bg-gradient-to-t from-primary/60 to-primary transition-[height] duration-75"
								}, i);
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 sm:px-6 pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-h-[100px] max-h-[180px] overflow-y-auto bg-secondary/40 rounded-2xl p-4 text-[14px] leading-relaxed text-foreground border border-border/30",
						children: transcript || phase === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: transcript,
							onChange: (e) => {
								setTranscript(e.target.value);
								if (typeAuto) setType(inferTypeLocal(e.target.value));
							},
							rows: 4,
							className: "w-full bg-transparent outline-none resize-none text-[14px] leading-relaxed text-foreground",
							"aria-label": "Transcript",
							placeholder: "Type your note here, or tap the mic to speak…",
							autoFocus: phase === "ready" && !transcript
						}) : phase === "processing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground italic flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, {
								size: 14,
								className: "animate-pulse"
							}), "AI is transcribing your voice…"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground/60 italic",
							children: "Try saying: \"Remind me to call the client tomorrow\", \"Idea: AI tool for invoices\", \"Note: meeting at 3pm went well\"…"
						})
					}), transcript && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setTranscript("");
								setAiResult(null);
								setPhase("idle");
							},
							className: "text-[11px] text-muted-foreground hover:text-foreground transition",
							children: "Clear & re-record"
						}), aiResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[10px] text-primary/80 font-medium flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 10 }),
								" AI-classified as ",
								aiResult.type,
								aiResult.language ? ` · ${aiResult.language.toUpperCase()}` : ""
							]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 sm:px-6 pb-3 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] font-semibold text-muted-foreground uppercase tracking-widest",
						children: "Language"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: language,
						onChange: (e) => changeLanguage(e.target.value),
						className: "text-xs bg-secondary/50 border border-border/40 rounded-xl px-3 py-2 text-foreground outline-none",
						"aria-label": "Spoken language",
						children: LANGUAGES.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: l.id,
							children: l.label
						}, l.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 sm:px-6 pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between mb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-semibold text-muted-foreground uppercase tracking-widest",
							children: "Save as"
						}), typeAuto && transcript && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] text-primary/80 font-medium",
							children: "✨ Auto-detected"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-4 gap-2",
						children: TYPE_OPTIONS.map((opt) => {
							const active = type === opt.id;
							const Icon = opt.icon;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									setType(opt.id);
									setTypeAuto(false);
								},
								className: `flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${active ? `bg-gradient-to-br ${opt.color} text-white border-transparent shadow-md` : "bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/70"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 18 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-semibold",
									children: opt.label
								})]
							}, opt.id);
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 sm:px-6 py-4 border-t border-border/30 bg-secondary/20 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden sm:block text-[11px] text-muted-foreground",
						children: [
							"Shortcut:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
								className: "px-1.5 py-0.5 rounded bg-card border border-border/40 font-mono text-[10px]",
								children: "⌘⇧V"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 ml-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: handleClose,
							className: "px-4 py-2 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: handleSave,
							disabled: !transcript || saving || phase === "processing",
							className: "px-5 py-2.5 rounded-2xl text-sm font-semibold gradient-primary text-primary-foreground shadow-[var(--shadow-primary)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2",
							children: [
								saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
									size: 15,
									className: "animate-spin"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 15 }),
								"Save ",
								activeOpt.label
							]
						})]
					})]
				})
			]
		})
	}) })] });
}
//#endregion
export { VoiceCapture as default };
