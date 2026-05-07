// Client wrapper that invokes the voice-transcribe Supabase Edge Function.
import { getSupabase } from '@/lib/supabase';

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
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Cloud is not connected. Connect Lovable Cloud to enable voice capture.');
  }
  const { data, error } = await supabase.functions.invoke('voice-transcribe', {
    body: { audio: args.data.audio, mime: args.data.mime },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === 'function') {
      try {
        const text = await ctx.text();
        const parsed = text ? JSON.parse(text) : null;
        const msg = parsed?.error || text || error.message;
        throw new Error(msg || 'Voice transcription failed');
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message) throw parseErr;
      }
    }
    throw new Error(error.message || 'Voice transcription failed');
  }
  if (!data || typeof data !== 'object') throw new Error('Empty response from voice service');
  if ((data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data as VoiceCaptureResult;
}
