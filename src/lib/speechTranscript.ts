export interface RecognitionAlternativeLike {
  transcript: string;
}

export interface RecognitionResultLike {
  isFinal: boolean;
  0: RecognitionAlternativeLike;
}

const SPACE_RE = /\s+/g;

function normalizeWhitespace(text: string): string {
  return text.replace(SPACE_RE, ' ').trim();
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function splitWords(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  return normalized ? normalized.split(' ') : [];
}

function tokensMatch(a: string, b: string): boolean {
  return normalizeToken(a) === normalizeToken(b);
}

function countWordOverlap(existingWords: string[], incomingWords: string[]): number {
  const maxOverlap = Math.min(existingWords.length, incomingWords.length, 16);
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

export function compressRepeatedPhrases(text: string): string {
  const words = splitWords(text);
  if (!words.length) return '';

  const output: string[] = [];
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
        const equal = pattern.every((token, idx) => tokensMatch(token, candidate[idx]));
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

  return normalizeWhitespace(output.join(' '));
}

export function appendSpeechSegment(existing: string, incoming: string): string {
  const base = normalizeWhitespace(existing);
  const next = normalizeWhitespace(incoming);

  if (!next) return base;
  if (!base) return compressRepeatedPhrases(next);

  const baseWords = splitWords(base);
  const nextWords = splitWords(next);

  if (
    nextWords.length <= baseWords.length &&
    countWordOverlap(baseWords, nextWords) === nextWords.length
  ) {
    return compressRepeatedPhrases(base);
  }

  const overlap = countWordOverlap(baseWords, nextWords);
  const merged = [...baseWords, ...nextWords.slice(overlap)].join(' ');
  return compressRepeatedPhrases(merged);
}

export function buildRecognitionSnapshot(
  results: ArrayLike<RecognitionResultLike>,
  lastFinalResultIndex: number,
  committedTranscript: string,
) {
  let nextTranscript = committedTranscript;
  let nextFinalResultIndex = lastFinalResultIndex;
  const interimSegments: string[] = [];

  for (let i = lastFinalResultIndex; i < results.length; i++) {
    const result = results[i];
    const text = normalizeWhitespace(result?.[0]?.transcript ?? '');
    if (!text) continue;

    if (result.isFinal) {
      nextTranscript = appendSpeechSegment(nextTranscript, text);
      nextFinalResultIndex = i + 1;
    } else {
      interimSegments.push(text);
    }
  }

  return {
    transcript: nextTranscript,
    interim: compressRepeatedPhrases(interimSegments.join(' ')),
    nextFinalResultIndex,
  };
}