import { describe, expect, it } from 'vitest';

import { appendSpeechSegment, buildRecognitionSnapshot, compressRepeatedPhrases } from '@/lib/speechTranscript';

describe('speech transcript helpers', () => {
  it('compresses runaway repeated phrases', () => {
    expect(
      compressRepeatedPhrases('fix the gear up to fit fix the gear up to fit fix the gear up to fit WordPress website'),
    ).toBe('fix the gear up to fit WordPress website');
  });

  it('merges overlapping recognition segments without duplicating them', () => {
    expect(
      appendSpeechSegment('fix the gear up', 'gear up to fit WordPress website'),
    ).toBe('fix the gear up to fit WordPress website');
  });

  it('ignores already-processed final recognition results', () => {
    const first = buildRecognitionSnapshot(
      [
        { isFinal: true, 0: { transcript: 'fix the gear up to fit' } },
        { isFinal: false, 0: { transcript: 'WordPress' } },
      ],
      0,
      '',
    );

    expect(first.transcript).toBe('fix the gear up to fit');
    expect(first.interim).toBe('WordPress');
    expect(first.nextFinalResultIndex).toBe(1);

    const second = buildRecognitionSnapshot(
      [
        { isFinal: true, 0: { transcript: 'fix the gear up to fit' } },
        { isFinal: true, 0: { transcript: 'WordPress website' } },
      ],
      first.nextFinalResultIndex,
      first.transcript,
    );

    expect(second.transcript).toBe('fix the gear up to fit WordPress website');
    expect(second.interim).toBe('');
    expect(second.nextFinalResultIndex).toBe(2);
  });
});