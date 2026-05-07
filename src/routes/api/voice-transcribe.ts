import { createFileRoute } from '@tanstack/react-router';

const SYSTEM_PROMPT = `You are an expert voice-memo assistant. You receive a short audio recording from a productivity app.

Do all of the following:
1. Transcribe the speech VERBATIM in the spoken language. Silently fix obvious recognition glitches (stutters, the same word repeated 4+ times in a row from a mic loop). Do NOT paraphrase, summarize, translate, or add words.
2. Classify the user's intent into exactly one bucket:
   - "tasks": a todo, reminder, action item ("remind me to…", "I need to…", "tomorrow I should…")
   - "notes": information to remember, log, journal entry
   - "ideas": a concept, brainstorm, what-if, product/feature idea
   - "links": the user dictates or references a URL or wants to bookmark a site
3. Produce a concise "title" (max 80 chars) summarizing the content.
4. If type is "tasks": detect "priority" ("critical" if urgent/asap/emergency; "high" if important/today/soon; "low" if someday/whenever; otherwise "medium"); detect "dueDate" as YYYY-MM-DD from phrases like "today", "tomorrow", "next monday", explicit dates. Use today's date if no date is mentioned.
5. If type is "links": extract a "url" (prepend https:// if missing).

Respond with ONLY a single valid minified JSON object, no markdown fences, no commentary, of shape:
{"transcript":string,"type":"tasks"|"notes"|"ideas"|"links","title":string,"priority"?:string,"dueDate"?:string,"url"?:string}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const Route = createFileRoute('/api/voice-transcribe')({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: () => json({ ok: true, service: 'voice-transcribe' }),
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return json({ error: 'AI gateway not configured' }, 500);

          const body = (await request.json()) as { audio?: string; mime?: string };
          if (!body?.audio) return json({ error: 'Missing audio' }, 400);

          const m = (body.mime || '').toLowerCase();
          const format = m.includes('wav')
            ? 'wav'
            : m.includes('mp3') || m.includes('mpeg')
              ? 'mp3'
              : m.includes('ogg')
                ? 'ogg'
                : m.includes('mp4') || m.includes('m4a') || m.includes('aac')
                  ? 'mp4'
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
                    { type: 'input_audio', input_audio: { data: body.audio, format } },
                  ],
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            }),
          });

          if (!resp.ok) {
            const text = await resp.text();
            console.error('AI gateway error', resp.status, text);
            if (resp.status === 429) return json({ error: 'Rate limit exceeded. Try again shortly.' }, 429);
            if (resp.status === 402) return json({ error: 'AI credits exhausted. Add credits to continue.' }, 402);
            return json({ error: `AI gateway error ${resp.status}` }, 502);
          }

          const data = await resp.json();
          const content: string = data?.choices?.[0]?.message?.content ?? '{}';
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(content);
          } catch {
            const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
            parsed = JSON.parse(cleaned);
          }

          const allowed = ['tasks', 'notes', 'ideas', 'links'];
          const typeRaw = String(parsed.type ?? 'notes').toLowerCase();
          const type = allowed.includes(typeRaw) ? typeRaw : 'notes';
          const transcript = String(parsed.transcript ?? '').trim();
          const titleRaw = String(parsed.title ?? '').trim() || transcript.slice(0, 80);
          const title = titleRaw.length > 80 ? titleRaw.slice(0, 77) + '…' : titleRaw;

          const result: Record<string, unknown> = { transcript, type, title };

          if (type === 'tasks') {
            const p = String(parsed.priority ?? 'medium').toLowerCase();
            result.priority = ['critical', 'high', 'medium', 'low'].includes(p) ? p : 'medium';
            const due = String(parsed.dueDate ?? today);
            result.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : today;
          }
          if (type === 'links' && parsed.url) {
            let url = String(parsed.url);
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
            result.url = url;
          }

          return json(result);
        } catch (err) {
          console.error('voice-transcribe failure', err);
          return json({ error: (err as Error).message || 'unknown' }, 500);
        }
      },
    },
  },
});
