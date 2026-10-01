const LANGUAGE_LOCALES: Record<string, string> = {
  en: "en-US",
  el: "el-GR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  ro: "ro-RO",
  ru: "ru-RU",
  ar: "ar-SA",
  hi: "hi-IN",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  tr: "tr-TR",
  pl: "pl-PL",
  cs: "cs-CZ",
  sv: "sv-SE",
  da: "da-DK",
  no: "nb-NO",
  fi: "fi-FI",
  uk: "uk-UA",
  he: "he-IL",
  th: "th-TH",
  id: "id-ID",
  ms: "ms-MY",
  vi: "vi-VN",
};

/** Browser recognition is only a live preview; never let a quiet mic discard a transcript. */
export function hasUsableVoiceCapture(
  transcript: string,
  audioBytes: number,
  elapsedMs: number,
): boolean {
  if (transcript.trim().length > 0) return elapsedMs >= 300;
  return elapsedMs >= 600 && audioBytes >= 2048;
}

export function languageToLocale(language: string): string {
  return LANGUAGE_LOCALES[language] ?? language;
}

/**
 * Chrome Web Speech does not truly auto-detect languages. In "auto" mode we
 * therefore use an adaptive hint learned from the last successful/explicit
 * language, then fall back to the browser locale.
 */
export function browserRecognitionLanguage(
  preference: string,
  browserLanguage: string,
  adaptiveHint?: string | null,
): string {
  if (preference !== "auto") return languageToLocale(preference);
  if (adaptiveHint) return languageToLocale(adaptiveHint);
  return browserLanguage || "en-US";
}

export function inferLanguageFromTranscript(
  text: string,
): "el" | "en" | "ru" | "ar" | "hi" | "zh" | "ja" | "ko" | undefined {
  const greek = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const han = (text.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g) || []).length;
  const kana = (text.match(/[\u3040-\u30FF]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;

  if (kana >= 2) return "ja";
  if (hangul >= 2) return "ko";
  if (greek >= 2 && greek >= latin * 0.35) return "el";
  if (cyrillic >= 3) return "ru";
  if (arabic >= 3) return "ar";
  if (devanagari >= 3) return "hi";
  if (han >= 2) return "zh";
  if (latin >= 4 && greek === 0 && cyrillic === 0) return "en";
  return undefined;
}

export function browserEnvironmentLanguageHint(
  browserLanguages: readonly string[],
  browserLanguage: string,
  timeZone?: string,
): string | undefined {
  const locales = [...browserLanguages, browserLanguage].filter(Boolean);
  if (locales.some((locale) => locale.toLowerCase().startsWith("el"))) return "el";

  // Mission Control is commonly used from Greece while Chrome itself may be
  // configured in English. Use Greek only as a last-resort regional hint; once
  // a successful transcript exists, that learned hint takes precedence.
  if (timeZone === "Europe/Athens") return "el";

  const base = (browserLanguage || "").split("-")[0]?.toLowerCase();
  return base && LANGUAGE_LOCALES[base] ? base : undefined;
}

export function normalizeRequestedLanguage(language: string): string | undefined {
  const value = language.trim();
  if (value === "auto") return undefined;
  const locale = LANGUAGE_LOCALES[value] ?? value;
  return /^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/.test(locale) ? locale : undefined;
}


export function shouldUseServerVoiceCapture(input: {
  serverReady: boolean | null;
  browserRecognitionAvailable: boolean;
  serverFailureUntil?: number;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if ((input.serverFailureUntil ?? 0) > now) return false;
  if (input.serverReady === true) return true;
  if (input.serverReady === false) return false;

  // If capability probing has not finished yet, prefer the browser only when
  // it is actually available. Browsers without Web Speech still get one
  // server attempt instead of being declared unsupported prematurely.
  return !input.browserRecognitionAvailable;
}

export function voiceServerBackoffMs(consecutiveFailures: number): number {
  const failures = Math.max(1, Math.floor(consecutiveFailures || 1));
  return Math.min(5 * 60_000, 15_000 * 2 ** Math.min(5, failures - 1));
}
