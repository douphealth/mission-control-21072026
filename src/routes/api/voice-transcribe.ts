import { createFileRoute } from '@tanstack/react-router';

interface TranscribeBody {
  audio: string; // base64 (no data: prefix)
  mime: string;
}

const SYSTEM_PROMPT = `You are an expert voice-memo assistant. You will receive a short audio recording.
1. Transcribe it VERBATIM in the spoken language. Fix obvious recognition artifacts (stuttering, repeated words from mic glitches) but DO NOT paraphrase.
2. Classify the intent into exactly one: "tasks" (todo / reminder / action), "notes" (a piece of info to remember), "ideas" (a concept / brainstorm / what-if), or "links" (mentions or dictates a URL / bookmark).
3. Produce a short, clean title (max 80 chars) summarizing the content.
4. If a task: detect priority ("critical" | "high" | "medium" | "low") from urgency cues; detect dueDate (YYYY-MM-DD) from phrases like "today", "tomorrow", "next monday", absolute dates. Use today's date if none mentioned.
5. If a link: extract the URL (add https:// if missing).

Respond ONLY with valid minified JSON, no markdown, no commentary, of shape:
{"transcript":string,"type":"tasks"|"notes"|"ideas"|"links","title":string,"priority"?:string,"dueDate"?:string,"url"?:string}`;

export const Route = createFileRoute('/api/voice-transcribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { audio, mime } = (await request.json()) as TranscribeBody;
          if (!audio) {
            return new Response(JSON.stringify({ error: 'Missing audio' }), { status: 400 });
          }
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: 'AI gateway not configured' }), { status: 500 });
          }

          // Map MIME to format hint accepted by Gemini multimodal
          const m = (mime || '').toLowerCase();
          const format = m.includes('wav') ? 'wav'
            : m.includes('mp3') || m.includes('mpeg') ? 'mp3'
            : m.includes('ogg') ? 'ogg'
            : m.includes('webm') ? 'webm'
            : m.includes('mp4') || m.includes('m4a') || m.includes('aac') ? 'mp4'
            : 'webm';

          const today = new Date().toISOString().split('T')[0];

          const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `Today is ${today}. Transcribe and classify this voice memo.` },
                    { type: 'input_audio', input_audio: { data: audio, format } },
                  ],
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            console.error('AI gateway error:', resp.status, errText);
            return new Response(
              JSON.stringify({ error: `AI gateway ${resp.status}`, detail: errText.slice(0, 500) }),
              { status: 502 },
            );
          }

          const data = await resp.json();
          const content: string = data?.choices?.[0]?.message?.content ?? '{}';
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(content);
          } catch {
            // Strip code fences if any
            const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
            parsed = JSON.parse(cleaned);
          }
          return new Response(JSON.stringify(parsed), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error('voice-transcribe error', err);
          return new Response(JSON.stringify({ error: message }), { status: 500 });
        }
      },
    },
  },
});
