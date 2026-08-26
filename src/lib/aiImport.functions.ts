import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const InputSchema = z.object({
  text: z.string().max(200_000).optional(),
  fileName: z.string().optional(),
  // Base64 data URLs of handwriting / screenshot photos
  images: z.array(z.string().min(16).max(12_000_000)).max(6).optional(),
}).refine((v) => (v.text && v.text.trim().length > 0) || (v.images && v.images.length > 0), {
  message: 'Provide text or at least one image',
});

const VALID_TARGETS = [
  'websites', 'links', 'tasks', 'repos', 'buildProjects',
  'credentials', 'payments', 'notes', 'ideas', 'habits',
] as const;

const SYSTEM_PROMPT = `You are an enterprise-grade data extraction engine for a personal command-center app.

Your job: given ARBITRARY user-pasted content (plain text, CSV, JSON, markdown, HTML, credential dumps, receipts, chat logs, emails, meeting notes, spreadsheets, positional column dumps, mixed data — literally anything), extract EVERY meaningful item and classify each into ONE of these target categories.

CATEGORIES (target -> fields):
- websites: name, url, wpAdminUrl, wpUsername, wpPassword, hostingProvider, hostingLoginUrl, hostingUsername, hostingPassword, category, status, notes, plugins[], tags[]
- links: title, url, category, description, status, pinned, tags[]
- tasks: title, priority(low|medium|high|critical), status(todo|in-progress|done|blocked), dueDate(YYYY-MM-DD), category, description, linkedProject, tags[]
- repos: name, url, description, language, stars, forks, status, demoUrl, progress, topics[], devPlatformUrl, deploymentUrl
- buildProjects: name, platform, projectUrl, deployedUrl, description, techStack[], status, nextSteps, githubRepo
- credentials: label, service, url, username, password, apiKey, notes, category, tags[]
- payments: title, amount(number), currency, type(income|expense|subscription), status(paid|pending|overdue), category, from, to, dueDate(YYYY-MM-DD), paidDate(YYYY-MM-DD), recurring(bool), notes
- notes: title, content, color, pinned, tags[]
- ideas: title, description, category, priority, status, tags[], linkedProject, votes
- habits: name, icon, frequency(daily|weekly|monthly), color

RULES:
1. Extract EVERY distinct item — do not summarize or collapse.
2. Handle "positional column" dumps where labels appear once then N values across rows (e.g. "site1 site2 site3 / user1 user2 user3 / pass1 pass2 pass3") — pair them by column index.
3. Detect mixed categories in one paste and split accordingly.
4. Infer sensible defaults (name from domain, priority from urgency words, dueDate from natural language like "tomorrow" → ISO date relative to today ${new Date().toISOString().split('T')[0]}).
5. Normalize URLs (add https:// if missing).
6. For credentials of WordPress sites, prefer the "websites" target (with wpUsername/wpPassword/wpAdminUrl filled) over "credentials".
7. Use "credentials" only for infrastructure/service accounts (CyberPanel, FTP, Cloudflare, RackNerd, hosting panels, API providers, etc.).
8. Never invent data — leave a field empty if unknown.
9. BILLS, INVOICES & RECEIPTS (electricity, water, gas, internet, phone, rent, κοινόχρηστα/building-maintenance, taxes, insurance) ALWAYS map to "payments" — never to notes/tasks/ideas. For each bill produce exactly ONE payments item:
   - title: short human label, e.g. "Electricity bill – <provider/month>" or "Κοινόχρηστα – <month>".
   - amount: the FINAL total payable (ΣΥΝΟΛΟ / ΠΛΗΡΩΤΕΟ ΠΟΣΟ / "Total due"), as a plain number using a dot decimal (convert "89,30" → 89.30, "1.234,56" → 1234.56). Never include the currency symbol.
   - currency: EUR for €, else the symbol/code shown.
   - type: "expense" (or "subscription" if it is clearly a recurring plan).
   - status: "paid" if the document shows it is settled (ΕΞΟΦΛΗΘΗΚΕ / ΠΛΗΡΩΜΕΝΟ / PAID / receipt of payment / zero balance) — then also set paidDate. Otherwise "pending" (outstanding bill to be paid) and set dueDate to the payment deadline (ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ / Πληρωτέο έως). If the deadline has already passed, use "overdue".
   - category: "Utilities" for electricity/water/gas/internet, "Housing" for κοινόχρηστα/rent, else the best fit.
   - to: the issuer/provider name (ΔΕΗ, ΠΡΟΤΕΣΤΑ, ΕΥΔΑΠ, property manager, etc.).
   - notes: bill/account number, billing period, consumption details.
   Greek documents: ΠΟΣΟ ΠΛΗΡΩΜΗΣ/ΣΥΝΟΛΟ = amount, ΛΗΞΗ ΠΡΟΘΕΣΜΙΑΣ = dueDate. Dates like 12/09/2026 are DD/MM/YYYY → 2026-09-12.
10. Return STRICT JSON matching the schema. No prose, no code fences.

OUTPUT SCHEMA:
{
  "categories": [
    { "target": "<one of the target keys>", "items": [ { ...fields per that target... }, ... ] }
  ]
}`;

export const aiParseImport = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured');

    const images = data.images ?? [];
    const hasImages = images.length > 0;

    const instruction = hasImages
      ? `The user photographed handwritten notes / a to-do list / credentials / ideas / bills, invoices or receipts (possibly in Greek)${data.fileName ? ` (file: ${data.fileName})` : ''}.
Carefully read ALL handwriting in the image(s), including messy cursive, bullet lists, arrows, margins, crossed-out items (mark crossed-out tasks as status "done"), checkboxes (ticked = done, empty = todo), dates, times and underlined headings.
Transcribe faithfully, correct obvious spelling slips, then extract and classify every item.
If an image is a utility bill, invoice or receipt (λογαριασμός ρεύματος/ΔΕΗ, κοινόχρηστα, νερό, internet, ενοίκιο), you MUST emit it as a "payments" item following rule 9 — one item per bill, with the exact total, currency, due date and paid/pending status. Do not turn a bill into a note or a task.
Assume a to-do list written "for today" means dueDate ${new Date().toISOString().split('T')[0]}.
Return JSON only.${data.text ? `\n\nExtra context typed by the user:\n${data.text}` : ''}`
      : `Extract and classify all importable items from the following content${data.fileName ? ` (file: ${data.fileName})` : ''}. Return JSON only.\n\n---\n${data.text}\n---`;

    const userContent: any = hasImages
      ? [
          { type: 'text', text: instruction },
          ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
        ]
      : instruction;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: hasImages ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error('AI rate limit exceeded — try again in a moment.');
      if (res.status === 402) throw new Error('AI credits exhausted — add credits in workspace settings.');
      throw new Error(`AI import failed [${res.status}]: ${body.slice(0, 400)}`);
    }


    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { throw new Error('AI returned malformed JSON'); }

    const rawCats = Array.isArray(parsed?.categories) ? parsed.categories : [];
    const categories = rawCats
      .filter((c: any) => c && VALID_TARGETS.includes(c.target) && Array.isArray(c.items))
      .map((c: any) => ({
        target: c.target as (typeof VALID_TARGETS)[number],
        items: c.items.filter((i: any) => i && typeof i === 'object'),
      }))
      .filter((c: any) => c.items.length > 0);

    return { categories };
  });
