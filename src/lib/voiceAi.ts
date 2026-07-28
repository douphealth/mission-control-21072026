// Client helper: sends recorded audio to the server transcription route
// (Lovable AI speech-to-text + structured classification) and normalizes the
// response into the shape the capture UI expects.

import { classifyTranscript, type VoiceCaptureResult } from '@/lib/voice.functions';

export interface SmartCaptureResult extends VoiceCaptureResult {
  source: 'ai' | 'browser' | 'local';
  subtasks?: string[];
  tags?: string[];
  startTime?: string;
  endTime?: string;
}

interface ServerResponse {
  transcript?: string;
  source?: 'ai' | 'browser';
  structured?: {
    type?: VoiceCaptureResult['type'];
    title?: string;
    cleanedTranscript?: string;
    priority?: VoiceCaptureResult['priority'];
    dueDate?: string;
    startTime?: string;
    endTime?: string;
    url?: string;
    subtasks?: string[];
    tags?: string[];
  } | null;
  error?: string;
}

const VALID_TYPES = new Set(['tasks', 'notes', 'ideas', 'links']);

export async function smartCapture(
  audio: Blob | null,
  browserTranscript: string,
): Promise<SmartCaptureResult> {
  const form = new FormData();
  if (audio && audio.size > 0) {
    const mime = (audio.type || 'audio/webm').split(';')[0];
    const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm';
    form.append('audio', audio, `recording.${ext}`);
  }
  form.append('browserTranscript', browserTranscript ?? '');

  try {
    const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
    const data = (await res.json().catch(() => ({}))) as ServerResponse;

    if (!res.ok || !data.transcript) {
      if (browserTranscript.trim()) {
        return { ...classifyTranscript(browserTranscript), source: 'local' };
      }
      throw new Error(data.error || 'Could not transcribe the recording.');
    }

    const s = data.structured;
    const transcript = (s?.cleanedTranscript || data.transcript).trim();

    if (!s || !s.type || !VALID_TYPES.has(s.type)) {
      return { ...classifyTranscript(transcript), source: data.source ?? 'local' };
    }

    const result: SmartCaptureResult = {
      transcript,
      type: s.type,
      title: (s.title || transcript.slice(0, 80)).trim(),
      source: data.source ?? 'ai',
      subtasks: Array.isArray(s.subtasks) ? s.subtasks.filter(Boolean).slice(0, 20) : undefined,
      tags: Array.isArray(s.tags) ? s.tags.filter(Boolean).slice(0, 6) : undefined,
    };

    if (s.type === 'tasks') {
      result.priority = s.priority ?? 'medium';
      result.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(s.dueDate ?? '')
        ? s.dueDate
        : new Date().toISOString().slice(0, 10);
      if (/^\d{2}:\d{2}$/.test(s.startTime ?? '')) result.startTime = s.startTime;
      if (/^\d{2}:\d{2}$/.test(s.endTime ?? '')) result.endTime = s.endTime;
    }
    if (s.type === 'links' && s.url) {
      result.url = /^https?:\/\//i.test(s.url) ? s.url : `https://${s.url}`;
    }

    return result;
  } catch (err) {
    if (browserTranscript.trim()) {
      return { ...classifyTranscript(browserTranscript), source: 'local' };
    }
    throw err instanceof Error ? err : new Error('Transcription failed');
  }
}
