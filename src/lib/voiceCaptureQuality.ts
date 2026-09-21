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

export function browserRecognitionLanguage(preference: string, browserLanguage: string): string {
  if (preference === "auto") return browserLanguage || "en-US";
  return LANGUAGE_LOCALES[preference] ?? preference;
}

export function normalizeRequestedLanguage(language: string): string | undefined {
  const value = language.trim();
  return value !== "auto" && /^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/.test(value) ? value : undefined;
}
