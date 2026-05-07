// Client wrapper that calls the TanStack Start /api/voice-transcribe route.

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
    body: JSON.stringify(args.data),
  });

  let payload: unknown = null;
  try {
    payload = await resp.json();
  } catch {
    throw new Error(`Voice service returned ${resp.status} (non-JSON response)`);
  }

  if (!resp.ok) {
    const msg = (payload as { error?: string })?.error || `Voice service error ${resp.status}`;
    throw new Error(msg);
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Empty response from voice service');
  }
  return payload as VoiceCaptureResult;
}
