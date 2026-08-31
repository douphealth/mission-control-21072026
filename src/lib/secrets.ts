// ─── Secret hygiene ──────────────────────────────────────────────────────────
// Rule: a real secret never leaves the secure surface. It must not be written
// into audit snapshots, never leave in an export/backup, and never be sent to
// an AI provider as part of an import prompt.
//
// Everything here is pure and deterministic so it can be unit-tested.

export const REDACTED = '[redacted]';

/** Field names whose *values* are always treated as secret material. */
const SECRET_KEY_RE =
  /(^|[^a-z])(pass|passwd|password|pwd|secret|token|apikey|api_key|api-key|accesskey|access_key|privatekey|private_key|clientsecret|client_secret|credential|credentials|bearer|refresh_token|sessionkey|session_key|ssh|certificate|cert_key|otp|pin|seedphrase|seed_phrase|mnemonic)($|[^a-z])/i;

/** Keys that merely *reference* a secret are safe to keep. */
const SAFE_KEY_RE = /(secretref|secret_ref|passwordref|password_ref|tokenref|token_ref|hasPassword|passwordSet)/i;

export function isSecretKey(key: string): boolean {
  if (!key) return false;
  if (SAFE_KEY_RE.test(key)) return false;
  return SECRET_KEY_RE.test(key.replace(/[-_]/g, '_'));
}

/** Obvious secret-shaped values, independent of their field name. */
const VALUE_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,               // OpenAI-style keys
  /\bghp_[A-Za-z0-9]{20,}\b/g,                // GitHub tokens
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,        // Slack
  /\bAKIA[0-9A-Z]{16}\b/g,                    // AWS access key id
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function redactSecretValue(value: string): string {
  let out = value;
  for (const re of VALUE_PATTERNS) out = out.replace(re, REDACTED);
  return out;
}

export function hasSecretLike(text: string): boolean {
  if (!text) return false;
  if (VALUE_PATTERNS.some((re) => new RegExp(re.source).test(text))) return true;
  return /(^|\n)\s*[\w .-]*(password|passwd|pwd|secret|api[ _-]?key|token)\s*[:=]\s*\S+/i.test(text);
}

/**
 * Redacts `key: value` / `key = value` pairs line by line, plus any
 * secret-shaped token anywhere in the text. Used before sending free text to
 * an AI provider, and before writing text into an export.
 */
export function redactSecretText(text: string): string {
  if (!text) return text;
  const lines = text.split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*[^:=\t]{0,60}?)\s*([:=])\s*(.+)$/);
    if (m && isSecretKey(m[1].trim())) return `${m[1]}${m[2]} ${REDACTED}`;
    // tab-separated dumps: redact only the column that follows a secret label
    return redactSecretValue(line);
  });
  return lines.join('\n');
}

/**
 * Deep-redacts an object graph. Returns a structural copy — the input is never
 * mutated, so callers can safely pass live records.
 */
export function redactSecrets<T>(input: T, depth = 0): T {
  if (depth > 8 || input == null) return input;
  if (typeof input === 'string') return redactSecretValue(input) as unknown as T;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((v) => redactSecrets(v, depth + 1)) as unknown as T;
  if (input instanceof Date) return input;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSecretKey(key)) {
      out[key] = value == null || value === '' ? value : REDACTED;
      continue;
    }
    out[key] = redactSecrets(value, depth + 1);
  }
  return out as unknown as T;
}

/** Convenience for backups/exports — identical rules, explicit intent. */
export function stripSecretsForExport<T>(input: T): T {
  return redactSecrets(input);
}
