// Enterprise-grade encryption utilities for credential vault
// Uses native Web Crypto API (AES-GCM 256-bit) with PBKDF2 key derivation.
//
// Format v2:  mcenc:v2:<base64( salt[16] | iv[12] | ciphertext )>
//   - a fresh random salt is generated for EVERY encryption (no rainbow tables)
// Legacy v1:  wcapi:<base64( iv[12] | ciphertext )> with a passphrase-derived
//   salt — still readable so existing vault entries keep working.

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const SALT_LENGTH = 16;
const ITERATIONS = 150_000;
const PREFIX_V2 = "mcenc:v2:";
const PREFIX_V1 = "wcapi:";
const PREFIX_V3 = "mcenc:v3:";
const SESSION_SLOT = "mc-vault-session";
const ALT_SLOT = "mc-vault-session-alt";
const readSlot = (slot: string) => { try { return typeof window !== "undefined" ? window.sessionStorage.getItem(slot) : null; } catch { return null; } };
let sessionKey: string | null = readSlot(SESSION_SLOT);
/** Older keys (e.g. created on another device) that stay readable; new data always uses `sessionKey`. */
let sessionAlternates: string[] = (() => { try { return JSON.parse(readSlot(ALT_SLOT) || "[]"); } catch { return []; } })();
const keyCache = new Map<string, Promise<CryptoKey>>();
/** Unlocked keys live for this browser tab until the owner locks it or closes the tab. */
export function setVaultSessionKey(value: string | null, alternates: string[] = []) {
  sessionKey = value; sessionAlternates = value ? alternates.filter(k => k && k !== value) : []; keyCache.clear();
  try {
    if (typeof window === "undefined") return;
    if (value) { window.sessionStorage.setItem(SESSION_SLOT, value); window.sessionStorage.setItem(ALT_SLOT, JSON.stringify(sessionAlternates)); }
    else { window.sessionStorage.removeItem(SESSION_SLOT); window.sessionStorage.removeItem(ALT_SLOT); }
  } catch { /* storage unavailable */ }
}
export function vaultSessionActive() { return !!sessionKey; }
export function vaultSessionKeys(): string[] { return sessionKey ? [sessionKey, ...sessionAlternates] : []; }
async function fastKey(value: string) {
  let key = keyCache.get(value);
  if (!key) { key = deriveKeyWithSalt(value, new TextEncoder().encode("mission-control-v3-data-key")); keyCache.set(value, key); }
  return key;
}

/** Only used to read data written by very old builds. Never used to encrypt. */
const LEGACY_DEFAULT_KEY = "mc-vault-2026-default-key";

export class DecryptionError extends Error {
  constructor(message = "Unable to decrypt this value with the current vault key.") {
    super(message);
    this.name = "DecryptionError";
  }
}

// ─── Key management ──────────────────────────────────────────────────────────

function getEncryptionKey(): string {
  if (sessionKey) return sessionKey;
  if (localStorage.getItem("mc-private-vault-envelope-v1")) throw new Error("Unlock your private vault first.");
  const existing = localStorage.getItem("mc-encryption-key");
  if (existing) return existing;
  const generated = generateStrongKey();
  localStorage.setItem("mc-encryption-key", generated);
  return generated;
}

async function importKeyMaterial(passphrase: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
}

async function deriveKeyWithSalt(
  passphrase: string,
  salt: Uint8Array,
  iterations = ITERATIONS,
): Promise<CryptoKey> {
  const keyMaterial = await importKeyMaterial(passphrase);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Legacy v1 derivation — salt was derived from the passphrase itself. */
async function deriveLegacyKey(passphrase: string): Promise<CryptoKey> {
  const salt = new TextEncoder().encode("mc-vault-salt-v2-" + passphrase.slice(0, 8));
  return deriveKeyWithSalt(passphrase, salt, 100_000);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Encrypt plaintext using AES-256-GCM with a random per-value salt + IV. */
export async function encrypt(plainText: string, customKey?: string): Promise<string> {
  if (!plainText) return "";
  try {
    if (!customKey) {
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const key = await fastKey(getEncryptionKey());
      const data = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, new TextEncoder().encode(plainText));
      const combined = new Uint8Array(IV_LENGTH + data.byteLength);
      combined.set(iv); combined.set(new Uint8Array(data), IV_LENGTH);
      return PREFIX_V3 + arrayBufferToBase64(combined.buffer);
    }
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKeyWithSalt(customKey || getEncryptionKey(), salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv as unknown as BufferSource },
      key,
      new TextEncoder().encode(plainText),
    );

    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return PREFIX_V2 + arrayBufferToBase64(combined.buffer);
  } catch (e) {
    console.error("Encryption failed:", e);
    throw new Error("Credential encryption failed. Secret was not saved in plaintext.");
  }
}

async function tryDecrypt(
  key: CryptoKey,
  iv: Uint8Array,
  data: Uint8Array,
): Promise<string | null> {
  try {
    const out = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv as unknown as BufferSource },
      key,
      data as unknown as BufferSource,
    );
    return new TextDecoder().decode(out);
  } catch {
    return null;
  }
}

/**
 * Decrypt a value produced by `encrypt`.
 * Throws `DecryptionError` when the value is one of our ciphertexts but cannot
 * be decrypted — it never returns raw ciphertext dressed up as a secret.
 * Values that were never encrypted are returned unchanged.
 */
export async function decrypt(cipherText: string, customKey?: string | string[]): Promise<string> {
  if (!cipherText) return "";

  // Every unlocked key is tried so values written on another device stay readable.
  const keys = customKey ? (Array.isArray(customKey) ? customKey : [customKey]) : [getEncryptionKey(), ...sessionAlternates];

  if (cipherText.startsWith(PREFIX_V3)) {
    const raw = base64ToBytes(cipherText.slice(PREFIX_V3.length));
    for (const k of keys) {
      const out = await tryDecrypt(await fastKey(k), raw.slice(0, IV_LENGTH), raw.slice(IV_LENGTH));
      if (out !== null) return out;
    }
    throw new DecryptionError();
  }

  if (cipherText.startsWith(PREFIX_V2)) {
    const raw = base64ToBytes(cipherText.slice(PREFIX_V2.length));
    const salt = raw.slice(0, SALT_LENGTH);
    const iv = raw.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const data = raw.slice(SALT_LENGTH + IV_LENGTH);
    for (const k of keys) {
      const out = await tryDecrypt(await deriveKeyWithSalt(k, salt), iv, data);
      if (out !== null) return out;
    }
    throw new DecryptionError();
  }

  if (cipherText.startsWith(PREFIX_V1)) {
    const raw = base64ToBytes(cipherText.slice(PREFIX_V1.length));
    const iv = raw.slice(0, IV_LENGTH);
    const data = raw.slice(IV_LENGTH);

    const candidates = customKey ? keys : [...keys, LEGACY_DEFAULT_KEY];
    for (const passphrase of candidates) {
      const out = await tryDecrypt(await deriveLegacyKey(passphrase), iv, data);
      if (out !== null) return out;
    }
    throw new DecryptionError();
  }

  // Not one of our formats — plaintext written before encryption existed.
  return cipherText;
}

/** Non-throwing variant for UI paths. Returns null when decryption fails. */
export async function decryptOrNull(
  cipherText: string,
  customKey?: string | string[],
): Promise<string | null> {
  try {
    return await decrypt(cipherText, customKey);
  } catch {
    return null;
  }
}

export function setEncryptionKey(key: string): void {
  if (localStorage.getItem("mc-private-vault-envelope-v1")) throw new Error("This vault is passphrase-protected. Do not replace its encryption key.");
  localStorage.setItem("mc-encryption-key", key);
}

export function hasCustomEncryptionKey(): boolean {
  return !!localStorage.getItem("mc-encryption-key");
}

export function generateStrongKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash a value using SHA-256 (native Web Crypto). Returns a hex string. */
export async function hash(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}
