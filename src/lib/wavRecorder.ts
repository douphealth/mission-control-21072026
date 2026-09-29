const TARGET_SAMPLE_RATE = 16_000;
const EDGE_SILENCE_THRESHOLD = 0.0015;
const EDGE_PAD_MS = 180;

function downsample(input: Float32Array, sourceRate: number): Float32Array {
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

function conditionSpeech(input: Float32Array): Float32Array {
  if (!input.length) return input;

  // Remove DC offset first. This improves headroom without changing words.
  let mean = 0;
  for (let i = 0; i < input.length; i += 1) mean += input[i];
  mean /= input.length;

  const centered = new Float32Array(input.length);
  let peak = 0;
  for (let i = 0; i < input.length; i += 1) {
    const value = input[i] - mean;
    centered[i] = value;
    peak = Math.max(peak, Math.abs(value));
  }

  // Trim only near-zero leading/trailing silence, retaining context around
  // speech so consonants at word boundaries are not clipped.
  let first = 0;
  let last = centered.length - 1;
  while (first < centered.length && Math.abs(centered[first]) < EDGE_SILENCE_THRESHOLD) first += 1;
  while (last > first && Math.abs(centered[last]) < EDGE_SILENCE_THRESHOLD) last -= 1;

  const pad = Math.round((EDGE_PAD_MS / 1000) * TARGET_SAMPLE_RATE);
  const start = Math.max(0, first - pad);
  const end = Math.min(centered.length, last + pad + 1);
  const trimmed =
    first >= centered.length
      ? centered
      : centered.slice(start, Math.max(start + 1, end));

  // Gentle normalization for quiet recordings only. Never boost near-silence
  // because that would amplify background noise.
  peak = 0;
  for (let i = 0; i < trimmed.length; i += 1) peak = Math.max(peak, Math.abs(trimmed[i]));
  const gain = peak >= 0.01 && peak < 0.35 ? Math.min(4, 0.72 / peak) : 1;

  if (gain === 1) return trimmed;
  const normalized = new Float32Array(trimmed.length);
  for (let i = 0; i < trimmed.length; i += 1) {
    normalized[i] = Math.max(-1, Math.min(1, trimmed[i] * gain));
  }
  return normalized;
}

export function encodePcmAsWav(chunks: Float32Array[], sourceRate: number): Blob {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const joined = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }

  const samples = conditionSpeech(downsample(joined, sourceRate));
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (at: number, value: string) => {
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
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}
