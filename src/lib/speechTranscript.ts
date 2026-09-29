export interface RecognitionAlternativeLike {
  transcript: string;
}

export interface RecognitionResultLike {
  isFinal: boolean;
  0: RecognitionAlternativeLike;
}

const SPACE_RE = /\s+/g;

function normalizeWhitespace(text: string): string {
  return text.replace(SPACE_RE, " ").trim();
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function splitWords(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  return normalized ? normalized.split(" ") : [];
}

function tokensMatch(a: string, b: string): boolean {
  return normalizeToken(a) === normalizeToken(b);
}

function sequenceMatches(haystack: string[], start: number, needle: string[]): boolean {
  if (start < 0 || start + needle.length > haystack.length) return false;
  for (let i = 0; i < needle.length; i++) {
    if (!tokensMatch(haystack[start + i], needle[i])) return false;
  }
  return true;
}

function findSequence(haystack: string[], needle: string[]): number {
  if (!needle.length || needle.length > haystack.length) return -1;
  for (let start = 0; start <= haystack.length - needle.length; start++) {
    if (sequenceMatches(haystack, start, needle)) return start;
  }
  return -1;
}

function countWordOverlap(existingWords: string[], incomingWords: string[]): number {
  const maxOverlap = Math.min(existingWords.length, incomingWords.length);
  for (let size = maxOverlap; size >= 1; size--) {
    let matches = true;
    for (let i = 0; i < size; i++) {
      if (!tokensMatch(existingWords[existingWords.length - size + i], incomingWords[i])) {
        matches = false;
        break;
      }
    }
    if (matches) return size;
  }
  return 0;
}

export function countTranscriptWords(text: string): number {
  return splitWords(text).length;
}

export function maxReasonableVoiceWords(durationMs: number): number {
  // 330 words/minute is deliberately generous. The guard is designed to catch
  // recognition replay inflation, not fast speakers.
  return Math.max(80, Math.ceil((Math.max(0, durationMs) / 1000) * 5.5));
}

/**
 * Removes exact adjacent phrase duplication caused by Web Speech replaying
 * already-finalized segments. Long replay blocks are supported deliberately;
 * limiting this to short phrases allowed 40-60 word recognizer replays to
 * balloon a note into thousands of words.
 */
export function compressRepeatedPhrases(text: string): string {
  const words = splitWords(text);
  if (!words.length) return "";

  const output: string[] = [];
  let i = 0;

  while (i < words.length) {
    let bestLength = 0;
    let bestRepeats = 1;
    const maxLength = Math.min(128, Math.floor((words.length - i) / 2));

    for (let length = maxLength; length >= 1; length--) {
      const pattern = words.slice(i, i + length);
      let repeats = 1;

      while (i + length * (repeats + 1) <= words.length) {
        const candidate = words.slice(i + length * repeats, i + length * (repeats + 1));
        let equal = true;
        for (let j = 0; j < length; j++) {
          if (!tokensMatch(pattern[j], candidate[j])) {
            equal = false;
            break;
          }
        }
        if (!equal) break;
        repeats += 1;
      }

      const shouldCompress = length === 1 ? repeats >= 4 : repeats >= 2;
      if (shouldCompress) {
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

  return normalizeWhitespace(output.join(" "));
}

/**
 * Merges one final SpeechRecognition segment into the accumulated transcript
 * without re-appending text Chrome has already emitted in an earlier session.
 */
export function appendSpeechSegment(existing: string, incoming: string): string {
  const base = compressRepeatedPhrases(normalizeWhitespace(existing));
  const next = compressRepeatedPhrases(normalizeWhitespace(incoming));

  if (!next) return base;
  if (!base) return next;

  const baseWords = splitWords(base);
  const nextWords = splitWords(next);

  // Chrome can replay an entire previous final segment after an automatic
  // recognition restart. If the incoming sequence already exists anywhere in
  // the committed transcript, it is not new speech.
  if (nextWords.length <= baseWords.length && findSequence(baseWords, nextWords) >= 0) {
    return base;
  }

  // Some implementations return a cumulative transcript that contains all
  // prior words plus newly recognized words. Prefer that complete snapshot
  // rather than appending it to itself.
  if (
    baseWords.length <= nextWords.length &&
    sequenceMatches(nextWords, 0, baseWords)
  ) {
    return compressRepeatedPhrases(next);
  }

  // Merge using the full available suffix/prefix overlap. The old 16-word cap
  // was the main inflation risk for long replayed phrases.
  const overlap = countWordOverlap(baseWords, nextWords);
  const merged = [...baseWords, ...nextWords.slice(overlap)].join(" ");
  return compressRepeatedPhrases(merged);
}

export function sanitizeVoiceTranscript(text: string): string {
  return compressRepeatedPhrases(normalizeWhitespace(text));
}

export function buildRecognitionSnapshot(
  results: ArrayLike<RecognitionResultLike>,
  lastFinalResultIndex: number,
  committedTranscript: string,
) {
  let nextTranscript = sanitizeVoiceTranscript(committedTranscript);
  let nextFinalResultIndex = lastFinalResultIndex;
  const interimSegments: string[] = [];

  for (let i = lastFinalResultIndex; i < results.length; i++) {
    const result = results[i];
    const text = normalizeWhitespace(result?.[0]?.transcript ?? "");
    if (!text) continue;

    if (result.isFinal) {
      nextTranscript = appendSpeechSegment(nextTranscript, text);
      nextFinalResultIndex = i + 1;
    } else {
      interimSegments.push(text);
    }
  }

  return {
    transcript: sanitizeVoiceTranscript(nextTranscript),
    interim: sanitizeVoiceTranscript(interimSegments.join(" ")),
    nextFinalResultIndex,
  };
}
