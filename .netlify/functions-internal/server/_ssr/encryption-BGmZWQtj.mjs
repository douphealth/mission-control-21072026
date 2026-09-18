//#region node_modules/.nitro/vite/services/ssr/assets/encryption-BGmZWQtj.js
var ALGORITHM = "AES-GCM";
var KEY_LENGTH = 256;
var IV_LENGTH = 12;
var SALT_LENGTH = 16;
var ITERATIONS = 15e4;
var PREFIX_V2 = "mcenc:v2:";
var PREFIX_V1 = "wcapi:";
/** Only used to read data written by very old builds. Never used to encrypt. */
var LEGACY_DEFAULT_KEY = "mc-vault-2026-default-key";
var DecryptionError = class extends Error {
	constructor(message = "Unable to decrypt this value with the current vault key.") {
		super(message);
		this.name = "DecryptionError";
	}
};
function getEncryptionKey() {
	const existing = localStorage.getItem("mc-encryption-key");
	if (existing) return existing;
	const generated = generateStrongKey();
	localStorage.setItem("mc-encryption-key", generated);
	return generated;
}
async function importKeyMaterial(passphrase) {
	return crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]);
}
async function deriveKeyWithSalt(passphrase, salt, iterations = ITERATIONS) {
	const keyMaterial = await importKeyMaterial(passphrase);
	return crypto.subtle.deriveKey({
		name: "PBKDF2",
		salt,
		iterations,
		hash: "SHA-256"
	}, keyMaterial, {
		name: ALGORITHM,
		length: KEY_LENGTH
	}, false, ["encrypt", "decrypt"]);
}
/** Legacy v1 derivation — salt was derived from the passphrase itself. */
async function deriveLegacyKey(passphrase) {
	return deriveKeyWithSalt(passphrase, new TextEncoder().encode("mc-vault-salt-v2-" + passphrase.slice(0, 8)), 1e5);
}
function arrayBufferToBase64(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}
function base64ToBytes(base64) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
/** Encrypt plaintext using AES-256-GCM with a random per-value salt + IV. */
async function encrypt(plainText, customKey) {
	if (!plainText) return "";
	try {
		const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
		const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
		const key = await deriveKeyWithSalt(customKey || getEncryptionKey(), salt);
		const ciphertext = await crypto.subtle.encrypt({
			name: ALGORITHM,
			iv
		}, key, new TextEncoder().encode(plainText));
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
async function tryDecrypt(key, iv, data) {
	try {
		const out = await crypto.subtle.decrypt({
			name: ALGORITHM,
			iv
		}, key, data);
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
async function decrypt(cipherText, customKey) {
	if (!cipherText) return "";
	const activeKey = customKey || getEncryptionKey();
	if (cipherText.startsWith(PREFIX_V2)) {
		const raw = base64ToBytes(cipherText.slice(9));
		const salt = raw.slice(0, SALT_LENGTH);
		const iv = raw.slice(SALT_LENGTH, 28);
		const data = raw.slice(28);
		const out = await tryDecrypt(await deriveKeyWithSalt(activeKey, salt), iv, data);
		if (out !== null) return out;
		throw new DecryptionError();
	}
	if (cipherText.startsWith(PREFIX_V1)) {
		const raw = base64ToBytes(cipherText.slice(6));
		const iv = raw.slice(0, IV_LENGTH);
		const data = raw.slice(IV_LENGTH);
		const candidates = customKey ? [customKey] : [activeKey, LEGACY_DEFAULT_KEY];
		for (const passphrase of candidates) {
			const out = await tryDecrypt(await deriveLegacyKey(passphrase), iv, data);
			if (out !== null) return out;
		}
		throw new DecryptionError();
	}
	return cipherText;
}
/** Non-throwing variant for UI paths. Returns null when decryption fails. */
async function decryptOrNull(cipherText, customKey) {
	try {
		return await decrypt(cipherText, customKey);
	} catch {
		return null;
	}
}
function setEncryptionKey(key) {
	localStorage.setItem("mc-encryption-key", key);
}
function hasCustomEncryptionKey() {
	return !!localStorage.getItem("mc-encryption-key");
}
function generateStrongKey() {
	const array = /* @__PURE__ */ new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
//#endregion
export { setEncryptionKey as a, hasCustomEncryptionKey as i, encrypt as n, generateStrongKey as r, decryptOrNull as t };
