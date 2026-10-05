import type { CredentialVault } from "@/lib/db";
import { parseCredentialsDump } from "@/lib/parseCredentialsDump";
import { todayISO } from "@/lib/overdue";

export type CredentialDraft = Omit<CredentialVault, "id">;

export interface CredentialBatchParseResult {
  items: CredentialDraft[];
  errors: string[];
  format: "hosting-dump" | "json" | "delimited" | "key-value" | "lines" | "empty";
}

export interface ApiKeyDetection {
  isApiKey: boolean;
  confidence: "high" | "medium" | "low";
  provider?: string;
  category?: string;
  reason?: string;
}

const DEFAULT_CATEGORY = "General";

type DraftField = keyof CredentialDraft | "tags";

const HEADER_ALIASES: Record<string, DraftField> = {
  label: "label",
  name: "label",
  account: "label",
  accountname: "label",
  title: "label",
  service: "service",
  provider: "service",
  platform: "service",
  product: "service",
  site: "service",
  url: "url",
  loginurl: "url",
  login: "url",
  website: "url",
  dashboard: "url",
  username: "username",
  user: "username",
  userid: "username",
  email: "username",
  accountemail: "username",
  loginemail: "username",
  password: "password",
  pass: "password",
  pwd: "password",
  passwd: "password",
  apikey: "apiKey",
  api: "apiKey",
  apitoken: "apiKey",
  token: "apiKey",
  accesstoken: "apiKey",
  authtoken: "apiKey",
  bearertoken: "apiKey",
  personaltoken: "apiKey",
  personalaccesstoken: "apiKey",
  pat: "apiKey",
  secret: "apiKey",
  secretkey: "apiKey",
  apisecret: "apiKey",
  clientsecret: "apiKey",
  privatetoken: "apiKey",
  servicerolekey: "apiKey",
  anonkey: "apiKey",
  category: "category",
  group: "category",
  notes: "notes",
  note: "notes",
  tags: "tags",
};

const API_LABEL_RE =
  /\b(api\s*(?:key|token|secret)|access\s*token|auth\s*token|bearer\s*token|personal\s*access\s*token|\bpat\b|client\s*secret|secret\s*key|private\s*token|service\s*role\s*key|anon\s*key)\b/i;

type ProviderRule = {
  provider: string;
  category: string;
  pattern: RegExp;
  reason: string;
};

const PROVIDER_RULES: ProviderRule[] = [
  {
    provider: "OpenAI",
    category: "AI Tools",
    pattern: /^sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}$/,
    reason: "OpenAI-style key prefix",
  },
  {
    provider: "Anthropic",
    category: "AI Tools",
    pattern: /^sk-ant-[A-Za-z0-9_-]{16,}$/,
    reason: "Anthropic-style key prefix",
  },
  {
    provider: "Stripe",
    category: "Payments",
    pattern: /^(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}$/,
    reason: "Stripe secret/restricted key prefix",
  },
  {
    provider: "GitHub",
    category: "Development",
    pattern: /^(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/,
    reason: "GitHub token prefix",
  },
  {
    provider: "Google",
    category: "Development",
    pattern: /^AIza[0-9A-Za-z_-]{20,}$/,
    reason: "Google API key prefix",
  },
  {
    provider: "Slack",
    category: "Development",
    pattern: /^xox[baprs]-[A-Za-z0-9-]{10,}$/,
    reason: "Slack token prefix",
  },
  {
    provider: "Hugging Face",
    category: "AI Tools",
    pattern: /^hf_[A-Za-z0-9]{20,}$/,
    reason: "Hugging Face token prefix",
  },
  {
    provider: "Groq",
    category: "AI Tools",
    pattern: /^gsk_[A-Za-z0-9]{20,}$/,
    reason: "Groq key prefix",
  },
  {
    provider: "Perplexity",
    category: "AI Tools",
    pattern: /^pplx-[A-Za-z0-9_-]{20,}$/,
    reason: "Perplexity key prefix",
  },
  {
    provider: "Resend",
    category: "Email",
    pattern: /^re_[A-Za-z0-9_-]{16,}$/,
    reason: "Resend key prefix",
  },
  {
    provider: "SendGrid",
    category: "Email",
    pattern: /^SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/,
    reason: "SendGrid key format",
  },
  {
    provider: "Mailgun",
    category: "Email",
    pattern: /^key-[A-Za-z0-9]{20,}$/,
    reason: "Mailgun key prefix",
  },
  {
    provider: "Shopify",
    category: "Development",
    pattern: /^shp(?:at|ss|ca|pa)_[A-Za-z0-9]{20,}$/,
    reason: "Shopify token prefix",
  },
];

const PROVIDER_HINTS: Array<{
  pattern: RegExp;
  provider: string;
  category: string;
}> = [
  { pattern: /openai|chatgpt/i, provider: "OpenAI", category: "AI Tools" },
  { pattern: /anthropic|claude/i, provider: "Anthropic", category: "AI Tools" },
  { pattern: /groq/i, provider: "Groq", category: "AI Tools" },
  { pattern: /perplexity/i, provider: "Perplexity", category: "AI Tools" },
  { pattern: /hugging\s*face|huggingface/i, provider: "Hugging Face", category: "AI Tools" },
  { pattern: /stripe/i, provider: "Stripe", category: "Payments" },
  { pattern: /github/i, provider: "GitHub", category: "Development" },
  { pattern: /cloudflare/i, provider: "Cloudflare", category: "Infrastructure" },
  { pattern: /supabase/i, provider: "Supabase", category: "Development" },
  { pattern: /vercel/i, provider: "Vercel", category: "Development" },
  { pattern: /google|gemini/i, provider: "Google", category: "Development" },
  { pattern: /slack/i, provider: "Slack", category: "Development" },
  { pattern: /resend/i, provider: "Resend", category: "Email" },
  { pattern: /sendgrid/i, provider: "SendGrid", category: "Email" },
  { pattern: /mailgun/i, provider: "Mailgun", category: "Email" },
  { pattern: /shopify/i, provider: "Shopify", category: "Development" },
];

function cleanHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function fieldForLabel(label: string): DraftField | null {
  const direct = HEADER_ALIASES[cleanHeader(label)];
  if (direct) return direct;
  if (API_LABEL_RE.test(label)) return "apiKey";
  return null;
}

function normalizeUrl(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^[a-z]+:\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(text)) return `https://${text}`;
  return text;
}

function normalizeCategory(value?: string) {
  const trimmed = value?.trim();
  return trimmed || DEFAULT_CATEGORY;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const tags = value.map(String).map((tag) => tag.trim()).filter(Boolean);
    return tags.length ? Array.from(new Set(tags)).slice(0, 20) : undefined;
  }
  if (typeof value !== "string") return undefined;
  const tags = value
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? Array.from(new Set(tags)).slice(0, 20) : undefined;
}

function providerHint(text: string) {
  return PROVIDER_HINTS.find((hint) => hint.pattern.test(text));
}

function looksLikeOpaqueToken(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 24 || /\s/.test(trimmed)) return false;
  if (/^(?:https?:\/\/|www\.)/i.test(trimmed)) return false;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return false;
  return /^[A-Za-z0-9_\-./+=:]+$/.test(trimmed);
}

export function detectApiKeyValue(
  value: string,
  context = "",
  label = "",
): ApiKeyDetection {
  const trimmed = value.trim();
  if (!trimmed) return { isApiKey: false, confidence: "low" };

  for (const rule of PROVIDER_RULES) {
    if (rule.pattern.test(trimmed)) {
      return {
        isApiKey: true,
        confidence: "high",
        provider: rule.provider,
        category: rule.category,
        reason: rule.reason,
      };
    }
  }

  const hint = providerHint(`${context} ${label}`);
  if (API_LABEL_RE.test(label) && trimmed.length >= 8) {
    return {
      isApiKey: true,
      confidence: "high",
      provider: hint?.provider,
      category: hint?.category,
      reason: "Field label identifies an API/token secret",
    };
  }

  if (
    hint &&
    looksLikeOpaqueToken(trimmed) &&
    /api|token|secret|key|credential/i.test(`${context} ${label}`)
  ) {
    return {
      isApiKey: true,
      confidence: "medium",
      provider: hint.provider,
      category: hint.category,
      reason: "Provider context plus token-like value",
    };
  }

  if (
    /^eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(trimmed) &&
    /supabase|jwt|token|service\s*role|anon/i.test(`${context} ${label}`)
  ) {
    return {
      isApiKey: true,
      confidence: "medium",
      provider: hint?.provider || "Supabase",
      category: hint?.category || "Development",
      reason: "JWT token with API/service context",
    };
  }

  return { isApiKey: false, confidence: "low" };
}

function normalizeIncomingObject(value: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const field = fieldForLabel(key);
    if (!field) continue;
    if (field === "tags") out.tags = normalizeTags(raw);
    else out[field] = raw;
  }
  return out as Partial<CredentialDraft>;
}

function makeDraft(value: Partial<CredentialDraft>, fallbackLabel = ""): CredentialDraft | null {
  let label = String(value.label || fallbackLabel).trim();
  let service = String(value.service || "").trim();
  const username = String(value.username || "").trim();
  const url = normalizeUrl(String(value.url || ""));
  let password = String(value.password || "");
  let apiKey = String(value.apiKey || "");
  const notes = String(value.notes || "").trim();
  let category = normalizeCategory(value.category);
  let tags = normalizeTags(value.tags) || [];

  const context = [label, service, url, notes].filter(Boolean).join(" ");
  let detection = detectApiKeyValue(apiKey, context, "API key");
  if (!apiKey && password) {
    const passwordDetection = detectApiKeyValue(password, context, "password");
    if (passwordDetection.isApiKey && passwordDetection.confidence === "high") {
      apiKey = password;
      password = "";
      detection = passwordDetection;
    }
  }

  if (apiKey) {
    const explicit = detectApiKeyValue(apiKey, context, "API key");
    if (explicit.isApiKey) detection = explicit;
  }

  if (detection.isApiKey) {
    if (!service && detection.provider) service = detection.provider;
    if (!label && detection.provider) label = detection.provider;
    if (
      category === DEFAULT_CATEGORY &&
      detection.category
    ) {
      category = detection.category;
    }
    tags = Array.from(
      new Set([
        ...tags,
        "api-key",
        ...(detection.provider ? [detection.provider.toLowerCase().replace(/\s+/g, "-")] : []),
      ]),
    );
  }

  const hinted = providerHint(`${label} ${service} ${url}`);
  if (!service && hinted) service = hinted.provider;
  if (category === DEFAULT_CATEGORY && hinted) category = hinted.category;

  const resolvedLabel =
    label ||
    service ||
    (url ? url.replace(/^https?:\/\//i, "").split("/")[0] : "") ||
    username;

  if (!resolvedLabel || !(username || password || apiKey || url)) return null;

  return {
    label: resolvedLabel,
    service,
    url,
    username,
    password,
    apiKey,
    notes,
    category,
    createdAt: value.createdAt || todayISO(),
    tags: tags.length ? tags.slice(0, 20) : undefined,
  };
}

function dedupe(items: CredentialDraft[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.label.trim().toLowerCase(),
      item.service.trim().toLowerCase(),
      item.url.trim().toLowerCase(),
      item.username.trim().toLowerCase(),
      item.password,
      item.apiKey,
    ].join("\u001f");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitDelimitedLine(line: string, delimiter: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function detectDelimiter(line: string) {
  const candidates = ["\t", ",", ";", "|"];
  let best = "";
  let count = 0;
  for (const delimiter of candidates) {
    const cells = splitDelimitedLine(line, delimiter);
    if (cells.length > count) {
      best = delimiter;
      count = cells.length;
    }
  }
  return count >= 2 ? best : "";
}

function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

function isUrlLike(value: string) {
  return /^https?:\/\//i.test(value.trim()) || /^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(value.trim());
}

function smartQuickRow(cells: string[]): CredentialDraft | null {
  const cleaned = cells.map((cell) => cell.trim()).filter((cell) => cell.length > 0);
  if (cleaned.length < 2) return null;

  let apiIndex = -1;
  let apiDetection: ApiKeyDetection | null = null;

  for (let i = 0; i < cleaned.length; i++) {
    const context = cleaned.filter((_, index) => index !== i).join(" ");
    const detection = detectApiKeyValue(cleaned[i], context, context);
    if (detection.isApiKey && detection.confidence === "high") {
      apiIndex = i;
      apiDetection = detection;
      break;
    }
  }

  if (apiIndex >= 0) {
    const apiKey = cleaned[apiIndex];
    const rest = cleaned.filter((_, index) => index !== apiIndex);
    const url = rest.find(isUrlLike) || "";
    const username = rest.find(isEmail) || "";
    const textParts = rest.filter((value) => value !== url && value !== username);
    const service =
      apiDetection?.provider ||
      textParts.find((value) => !API_LABEL_RE.test(value)) ||
      "";
    const label =
      textParts.find((value) => value !== service) ||
      service ||
      apiDetection?.provider ||
      "API credential";

    return makeDraft({
      label,
      service,
      url,
      username,
      apiKey,
      password: "",
      category: apiDetection?.category || DEFAULT_CATEGORY,
      notes: "",
    });
  }

  const [label, service, url, username, password, apiKey, category, ...notes] = cells;
  return makeDraft({
    label: label || "",
    service: service || "",
    url: url || "",
    username: username || "",
    password: password || "",
    apiKey: apiKey || "",
    category: category || DEFAULT_CATEGORY,
    notes: notes.join(" | "),
  });
}

function parseDelimited(text: string): CredentialBatchParseResult | null {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 1) return null;

  const delimiter = detectDelimiter(lines[0]);
  if (!delimiter) return null;

  const first = splitDelimitedLine(lines[0], delimiter);
  const mappedHeaders = first.map((header) => fieldForLabel(header));
  const headerHits = mappedHeaders.filter(Boolean).length;

  const looksLikeHeader =
    lines.length > 1 &&
    headerHits >= 2 &&
    headerHits >= Math.ceil(first.length * 0.5);

  if (looksLikeHeader) {
    const items: CredentialDraft[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitDelimitedLine(lines[i], delimiter);
      const raw: Record<string, unknown> = {};
      mappedHeaders.forEach((field, index) => {
        if (!field) return;
        const cell = cells[index] ?? "";
        if (field === "tags") raw.tags = normalizeTags(cell);
        else raw[field] = cell;
      });
      const item = makeDraft(raw as Partial<CredentialDraft>);
      if (item) items.push(item);
      else errors.push(`Row ${i + 1}: missing a usable credential value.`);
    }
    return { items: dedupe(items), errors, format: "delimited" };
  }

  const items: CredentialDraft[] = [];
  const errors: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = splitDelimitedLine(lines[i], delimiter);
    const item = smartQuickRow(cells);
    if (item) items.push(item);
    else errors.push(`Row ${i + 1}: could not create a credential.`);
  }
  if (!items.length) return null;
  return { items: dedupe(items), errors, format: "lines" };
}

function parseKeyValue(text: string): CredentialBatchParseResult | null {
  const blocks = text
    .split(/\n\s*\n|\n\s*---+\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const items: CredentialDraft[] = [];
  const errors: string[] = [];
  let recognizedPairs = 0;

  blocks.forEach((block, blockIndex) => {
    const raw: Record<string, unknown> = {};
    const noteLines: string[] = [];
    const contextLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/^\s*([^:=]{2,48})\s*[:=]\s*(.*)$/);
      if (!match) {
        if (line.trim()) noteLines.push(line.trim());
        continue;
      }

      const label = match[1].trim();
      const cell = match[2].trim();
      let field = fieldForLabel(label);

      if (!field) {
        const detection = detectApiKeyValue(cell, block, label);
        if (detection.isApiKey) field = "apiKey";
      }

      if (!field) {
        noteLines.push(line.trim());
        continue;
      }

      recognizedPairs++;
      contextLines.push(label);
      if (field === "tags") raw.tags = normalizeTags(cell);
      else raw[field] = cell;
    }

    if (noteLines.length && !raw.notes) raw.notes = noteLines.join("\n");

    const hint = providerHint(`${block} ${contextLines.join(" ")}`);
    if (hint) {
      if (!raw.service) raw.service = hint.provider;
      if (!raw.category) raw.category = hint.category;
      if (!raw.label) raw.label = hint.provider;
    }

    const item = makeDraft(raw as Partial<CredentialDraft>);
    if (item) items.push(item);
    else if (recognizedPairs) errors.push(`Block ${blockIndex + 1}: incomplete credential.`);
  });

  if (!recognizedPairs || !items.length) return null;
  return { items: dedupe(items), errors, format: "key-value" };
}

function parseJson(text: string): CredentialBatchParseResult | null {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.credentials)
        ? parsed.credentials
        : [parsed];

    const items = rows
      .map((row: unknown) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return null;
        return makeDraft(normalizeIncomingObject(row as Record<string, unknown>));
      })
      .filter((item: CredentialDraft | null): item is CredentialDraft => Boolean(item));

    return items.length
      ? { items: dedupe(items), errors: [], format: "json" }
      : {
          items: [],
          errors: ["JSON was valid but contained no usable credentials."],
          format: "json",
        };
  } catch {
    return null;
  }
}

function parseLooseApiLines(text: string): CredentialBatchParseResult | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items: CredentialDraft[] = [];

  for (const line of lines) {
    if (/[:=|,;\t]/.test(line)) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    for (let i = parts.length - 1; i >= 1; i--) {
      const candidate = parts[i];
      const context = parts.slice(0, i).join(" ");
      const detection = detectApiKeyValue(candidate, context, context);
      if (!detection.isApiKey || detection.confidence !== "high") continue;

      const item = makeDraft({
        label: detection.provider || context || "API credential",
        service: detection.provider || context,
        apiKey: candidate,
        password: "",
        category: detection.category || DEFAULT_CATEGORY,
        notes: context && detection.provider && context !== detection.provider ? context : "",
      });
      if (item) items.push(item);
      break;
    }
  }

  return items.length
    ? { items: dedupe(items), errors: [], format: "lines" }
    : null;
}

export function parseCredentialBatch(text: string): CredentialBatchParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], errors: [], format: "empty" };

  const hosting = parseCredentialsDump(trimmed);
  if (hosting) {
    const credentialGroup = hosting.find((group) => group.target === "credentials");
    if (credentialGroup?.items?.length) {
      const items = credentialGroup.items
        .map((item) => makeDraft(item as Partial<CredentialDraft>))
        .filter((item): item is CredentialDraft => Boolean(item));
      return { items: dedupe(items), errors: [], format: "hosting-dump" };
    }
  }

  return (
    parseJson(trimmed) ||
    parseDelimited(trimmed) ||
    parseKeyValue(trimmed) ||
    parseLooseApiLines(trimmed) || {
      items: [],
      errors: [
        "No credentials detected. Use spreadsheet/CSV/TSV, JSON, key:value blocks, provider + API key lines, or pipe-separated rows.",
      ],
      format: "empty",
    }
  );
}
