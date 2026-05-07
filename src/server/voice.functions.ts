// Client wrapper that calls the /api/voice-transcribe TanStack server route.

export interface VoiceCaptureResult {
  transcript: string;
  type: 'tasks' | 'notes' | 'ideas' | 'links';
  title: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  dueDate?: string;
  url?: string;
}

export async function transcribeAndClassify(args: {
  data: { audio: string; mime: string };
}): Promise<VoiceCaptureResult> {
  const resp = await fetch('/api/voice-transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: args.data.audio, mime: args.data.mime }),
  });
  const text = await resp.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response
  }
  if (!resp.ok) {
    const msg =
      (body && typeof body === 'object' && 'error' in body && (body as { error?: string }).error) ||
      text ||
      `Voice transcription failed (${resp.status})`;
    throw new Error(String(msg));
  }
  if (!body || typeof body !== 'object') {
    throw new Error('Empty response from voice service');
  }
  return body as VoiceCaptureResult;
}
