// Secret-bearing fields must not leave in portable exports or AI prompts.
export const REDACTED = "[redacted]";
const SECRET_KEY_RE = /(^|[^a-z])(pass|passwd|password|pwd|secret|token|apikey|api_key|api-key|accesskey|access_key|privatekey|private_key|clientsecret|client_secret|credential|credentials|bearer|refresh_token|sessionkey|session_key|ssh|certificate|cert_key|otp|pin|seedphrase|seed_phrase|mnemonic)($|[^a-z])/i;
const SAFE_KEY_RE = /(secretref|secret_ref|passwordref|password_ref|tokenref|token_ref|hasPassword|passwordSet)/i;
export function isSecretKey(key: string): boolean {
  if (!key || SAFE_KEY_RE.test(key)) return false;
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase();
  return SECRET_KEY_RE.test(`_${normalized}_`);
}
const VALUE_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];
export function redactSecretValue(value: string): string {
  let out = value;
  for (const re of VALUE_PATTERNS) out = out.replace(re, REDACTED);
  return out;
}
export function hasSecretLike(text: string): boolean {
  if (!text) return false;
  if (VALUE_PATTERNS.some(re => new RegExp(re.source).test(text))) return true;
  return /(^|\n)\s*[\w .-]*(password|passwd|pwd|secret|api[ _-]?key|token)\s*[:=]\s*\S+/i.test(text);
}
export function redactSecretText(text: string): string {
  if (!text) return text;
  return text.split(/\r?\n/).map(line => {
    const m = line.match(/^(\s*[^:=\t]{0,60}?)\s*([:=])\s*(.+)$/);
    if (m && isSecretKey(m[1].trim())) return `${m[1]}${m[2]} ${REDACTED}`;
    return redactSecretValue(line);
  }).join("\n");
}
/** Deep-redact a structural copy, never mutate live records. */
export function redactSecrets<T>(input: T, depth = 0): T {
  if (input == null) return input;
  if (depth > 32) return REDACTED as unknown as T;
  if (typeof input === "string") return redactSecretValue(input) as unknown as T;
  if (typeof input !== "object" || input instanceof Date) return input;
  if (Array.isArray(input)) return input.map(v => redactSecrets(v, depth + 1)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    out[key] = isSecretKey(key) ? value == null || value === "" ? value : REDACTED : redactSecrets(value, depth + 1);
  }
  return out as unknown as T;
}
const CIPHERTEXT_KEY = /(encrypted|ciphertext|cipher|vault|keymaterial|encryptionkey|^salt$|^iv$|connectionstring|conn_string|dsn|dburl|database_url)/i;
const CIPHERTEXT_VALUE = /^(wcapi:|mcenc:)/;
// No global flag: repeated .test() calls must not alternate between matches.
const URI_CREDENTIAL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i;
const CONTAINER_KEYS = new Set(["credentials", "credentialVault", "vaults"]);
function isBackupUnsafeKey(key: string, value: unknown): boolean {
  if (CONTAINER_KEYS.has(key) && (Array.isArray(value) || value === null)) return false;
  if (/^secretRef$|SecretRef$/.test(key)) return false;
  return isSecretKey(key) || CIPHERTEXT_KEY.test(key);
}
/** Drop secret fields rather than overwriting restored credentials with redactions. */
export function stripSecretsForExport<T>(input: T, depth = 0): T {
  if (input == null) return input;
  // Excessively nested/cyclic input fails closed rather than leaking its raw tail.
  if (depth > 32) return REDACTED as unknown as T;
  if (typeof input === "string") {
    if (CIPHERTEXT_VALUE.test(input) || URI_CREDENTIAL.test(input)) return REDACTED as unknown as T;
    return redactSecretValue(input) as unknown as T;
  }
  if (typeof input !== "object" || input instanceof Date) return input;
  if (Array.isArray(input)) return input.map(v => stripSecretsForExport(v, depth + 1)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (["__proto__", "constructor", "prototype"].includes(key) || isBackupUnsafeKey(key, value)) continue;
    out[key] = stripSecretsForExport(value, depth + 1);
  }
  return out as unknown as T;
}
