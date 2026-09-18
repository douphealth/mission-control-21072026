import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ANTHROPIC_BASE, ANTHROPIC_KEY, ANTHROPIC_SMALL_MODEL } from "@/lib/anthropicServer";
import { hasGateway, responsesJson, type ResponseInputPart } from "@/lib/aiGateway.server";

const FileSchema = z.object({
  name: z.string().max(400),
  mimeType: z.string().max(200).default(""),
  // data URL (base64) for binary files
  dataUrl: z.string().min(16).max(24_000_000).optional(),
  // plain text content for text-like files
  text: z.string().max(400_000).optional(),
});

const InputSchema = z
  .object({
    text: z.string().max(200_000).optional(),
    fileName: z.string().optional(),
    // Base64 data URLs of handwriting / screenshot photos
    images: z.array(z.string().min(16).max(12_000_000)).max(6).optional(),
    // Arbitrary uploaded files (images, PDFs, documents, data files)
    files: z.array(FileSchema).max(6).optional(),
  })
  .refine(
    (v) =>
      (v.text && v.text.trim().length > 0) ||
      (v.images && v.images.length > 0) ||
      (v.files && v.files.length > 0),
    { message: "Provide text, an image or a file" },
  );

const VALID_TARGETS = [
  "websites",
  "links",
  "tasks",
  "repos",
  "buildProjects",
  "credentials",
  "payments",
  "notes",
  "ideas",
  "habits",
] as const;

const SYSTEM_PROMPT = `You are an enterprise-grade data extraction engine for a personal command-center app.

Your job: given ARBITRARY user-supplied content (plain text, CSV, JSON, markdown, HTML, credential dumps, receipts, chat logs, emails, meeting notes, spreadsheets, positional column dumps, scanned documents, photos of handwriting, PDFs — literally anything), first IDENTIFY what the content actually is, then extract EVERY meaningful item and classify each into ONE of these target categories.

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
3. Detect mixed categories in one input and split accordingly.
4. Infer sensible defaults (name from domain, priority from urgency words, dueDate from natural language like "tomorrow" → ISO date relative to today ${new Date().toISOString().split("T")[0]}).
5. Normalize URLs (add https:// if missing).
6. For credentials of WordPress sites, prefer the "websites" target (with wpUsername/wpPassword/wpAdminUrl filled) over "credentials".
7. Use "credentials" only for infrastructure/service accounts (CyberPanel, FTP, Cloudflare, RackNerd, hosting panels, API providers, etc.).
8. Never invent data — leave a field empty if unknown.
9. BILLS, INVOICES & RECEIPTS (electricity, water, gas, internet, phone, rent, κοινόχρηστα/building-maintenance, taxes, insurance) ALWAYS map to "payments" — never to notes/tasks/ideas. For each bill produce exactly ONE payments item:
   - title: short human label, e.g. "Electricity bill – <provider/month>" or "Κοινόχρηστα – <month>".
   - amount: the FINAL total payable (ΣΥΝΟΛΟ / ΠΛΗΡΩΤΕΟ ΠΟΣΟ / "Total due"), as a plain number using a dot decimal (convert "89,30" → 89.30, "1.234,56" → 1234.56). Never include the currency symbol.
   - currency: EUR for €, else the symbol/code shown.
   - type: "expense" (or "subscription" if it is clearly a recurring plan).
   - status: "paid" if the document shows it is settled (ΕΞΟΦΛΗΘΗΚΕ / ΠΛΗΡΩΜΕΝΟ / PAID / receipt of payment / zero balance) — then also set paidDate. Otherwise "pending" and set dueDate to the payment deadline (ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ / Πληρωτέο έως). If the deadline has already passed, use "overdue".
   - category: "Utilities" for electricity/water/gas/internet, "Housing" for κοινόχρηστα/rent, else the best fit.
   - to: the issuer/provider name (ΔΕΗ, ΠΡΟΤΕΣΤΑ, ΕΥΔΑΠ, property manager, etc.).
   - notes: bill/account number, billing period, consumption details.
   Greek documents: ΠΟΣΟ ΠΛΗΡΩΜΗΣ/ΣΥΝΟΛΟ = amount, ΛΗΞΗ ΠΡΟΘΕΣΜΙΑΣ = dueDate. Dates like 12/09/2026 are DD/MM/YYYY → 2026-09-12.
10. Documents & photos: read ALL visible text including messy handwriting, tables, stamps, margins and crossed-out items (crossed-out or ticked = status "done"). Keep the original language — never translate.
11. Return STRICT JSON matching the schema. No prose, no code fences.

OUTPUT SCHEMA:
{
  "kind": "<short human description of what this content is, e.g. 'Greek electricity bill (PDF)'>",
  "summary": "<one sentence describing what was found>",
  "categories": [
    { "target": "<one of the target keys>", "items": [ { ...fields per that target... }, ... ] }
  ]
}`;

// Strict-mode schema for the Responses API. Item fields are arbitrary per
// target, so they travel as key/value pairs and are rebuilt server-side.
const STRICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "summary", "categories"],
  properties: {
    kind: { type: "string" },
    summary: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["target", "items"],
        properties: {
          target: { type: "string", enum: [...VALID_TARGETS] },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["fields"],
              properties: {
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["key", "value"],
                    properties: {
                      key: { type: "string" },
                      value: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

type GatewayResult = {
  kind?: string;
  summary?: string;
  categories?: Array<{
    target?: string;
    items?: Array<{ fields?: Array<{ key?: string; value?: string }> }>;
  }>;
};

type Category = { target: (typeof VALID_TARGETS)[number]; items: Record<string, string>[] };

function sanitizeCategories(rawCats: unknown): Category[] {
  const list = Array.isArray(rawCats) ? rawCats : [];
  return list
    .filter(
      (c: any) =>
        c && VALID_TARGETS.includes(c.target) && Array.isArray(c.items) && c.items.length > 0,
    )
    .map((c: any) => ({
      target: c.target as Category["target"],
      items: c.items.filter((i: any) => i && typeof i === "object"),
    }))
    .filter((c) => c.items.length > 0);
}

function isTextLike(mime: string, name: string): boolean {
  const n = name.toLowerCase();
  return (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("csv") ||
    mime.includes("yaml") ||
    /\.(txt|md|csv|tsv|json|xml|ya?ml|log|ics|vcf|html?|srt|sql|env|ini|conf)$/.test(n)
  );
}

function buildParts(data: z.infer<typeof InputSchema>): ResponseInputPart[] {
  const today = new Date().toISOString().split("T")[0];
  const parts: ResponseInputPart[] = [];
  const images = data.images ?? [];
  const files = data.files ?? [];

  const intro: string[] = [
    `Today is ${today}.`,
    "Identify what the supplied content is, then extract and classify every importable item. Return JSON only.",
  ];
  if (data.fileName) intro.push(`Source file: ${data.fileName}`);
  if (images.length > 0)
    intro.push(
      "Photographed notes / documents are attached — read all handwriting and printed text faithfully.",
    );
  if (data.text?.trim()) intro.push(`Content / extra context:\n---\n${data.text.trim()}\n---`);

  parts.push({ type: "input_text", text: intro.join("\n") });

  for (const url of images) {
    parts.push({ type: "input_image", image_url: url });
  }

  for (const file of files) {
    const mime = file.mimeType || "";
    if (file.text?.trim()) {
      parts.push({
        type: "input_text",
        text: `File "${file.name}" contents:\n---\n${file.text.trim()}\n---`,
      });
    } else if (file.dataUrl && mime.startsWith("image/")) {
      parts.push({ type: "input_text", text: `Image file: ${file.name}` });
      parts.push({ type: "input_image", image_url: file.dataUrl });
    } else if (file.dataUrl && (mime.includes("pdf") || /\.pdf$/i.test(file.name))) {
      parts.push({
        type: "input_file",
        filename: file.name.replace(/[^\w.\-]+/g, "_"),
        file_data: file.dataUrl.startsWith("data:")
          ? file.dataUrl
          : `data:application/pdf;base64,${file.dataUrl}`,
      });
    }
  }

  return parts;
}

export const aiParseImport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    // ── Preferred path: Lovable AI Gateway (multimodal, strict JSON) ────────
    if (hasGateway()) {
      const parts = buildParts(data);
      const result = await responsesJson<GatewayResult>({
        system: SYSTEM_PROMPT,
        parts,
        schemaName: "import_extraction",
        schema: STRICT_SCHEMA,
        effort: "low",
      });

      if (result) {
        const categories = sanitizeCategories(
          (result.categories ?? []).map((c) => ({
            target: c.target,
            items: (c.items ?? []).map((item) => {
              const record: Record<string, string> = {};
              for (const field of item.fields ?? []) {
                if (field?.key && field.value != null && String(field.value).trim() !== "") {
                  record[field.key] = String(field.value);
                }
              }
              return record;
            }),
          })),
        ).map((c) => ({
          ...c,
          items: c.items.filter((i) => Object.keys(i).length > 0),
        }));

        return {
          categories: categories.filter((c) => c.items.length > 0),
          kind: result.kind ?? "",
          summary: result.summary ?? "",
        };
      }
    }

    // ── Fallback: Anthropic (when configured) ───────────────────────────────
    if (!ANTHROPIC_KEY) throw new Error("AI is not configured on this project.");

    const images = data.images ?? [];
    const inlineImages = [
      ...images,
      ...(data.files ?? [])
        .filter((f) => f.dataUrl && (f.mimeType || "").startsWith("image/"))
        .map((f) => f.dataUrl as string),
    ];
    const fileText = (data.files ?? [])
      .filter((f) => f.text?.trim() || isTextLike(f.mimeType, f.name))
      .map((f) => `File "${f.name}":\n${f.text ?? ""}`)
      .join("\n\n");
    const combinedText = [data.text, fileText].filter(Boolean).join("\n\n");
    const hasImages = inlineImages.length > 0;

    const instruction = hasImages
      ? `The user supplied photographed or scanned content${data.fileName ? ` (file: ${data.fileName})` : ""}.
Read ALL text and handwriting, then extract and classify every item. Bills/invoices/receipts MUST become "payments" items per rule 9.
Return JSON only.${combinedText ? `\n\nExtra context:\n${combinedText}` : ""}`
      : `Extract and classify all importable items from the following content${data.fileName ? ` (file: ${data.fileName})` : ""}. Return JSON only.\n\n---\n${combinedText}\n---`;

    const userContent: any = hasImages
      ? [
          { type: "text", text: instruction },
          ...inlineImages.map((url) => ({
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: url.split(",")[1] || url },
          })),
        ]
      : instruction;

    const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_SMALL_MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI rate limit exceeded — try again in a moment.");
      throw new Error(`AI import failed [${res.status}]: ${body.slice(0, 400)}`);
    }

    const json = await res.json();
    const raw = json?.content?.find((c: any) => c.type === "text")?.text ?? "{}";
    let parsed: any;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned malformed JSON");
    }

    return {
      categories: sanitizeCategories(parsed?.categories),
      kind: typeof parsed?.kind === "string" ? parsed.kind : "",
      summary: typeof parsed?.summary === "string" ? parsed.summary : "",
    };
  });
