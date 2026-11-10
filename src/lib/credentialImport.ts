import type { CredentialVault } from "./db";
import { credentialIdentity } from "./dedup";
import { encrypt, decryptOrNull } from "./encryption";

/** Transient marker: this imported row replaces an unreadable secret on the stored entry with this id. */
export const HEAL_FIELD = "__healsSecretOf";

/** Never mix async Web Crypto into an IndexedDB transaction or emit secrets in errors. */
export async function prepareCredentialImport(
  items: Partial<CredentialVault>[], stored: CredentialVault[],
): Promise<Partial<CredentialVault>[]> {
  const byIdentity = new Map(stored.map(row => [credentialIdentity(row), row]));
  const output: Partial<CredentialVault>[] = [];
  for (const [index, item] of items.entries()) {
    if (!item || !String(item.label ?? "").trim()) throw new Error(`Credential row ${index + 1} needs a label. Nothing was saved.`);
    const identity = credentialIdentity(item);
    const existing = byIdentity.get(identity);
    const row = { ...item };
    for (const field of ["password", "apiKey"] as const) {
      const supplied = String(item[field] ?? "");
      if (!supplied) { row[field] = ""; continue; }
      const plaintext = await decryptOrNull(supplied);
      if (plaintext === null) throw new Error(`Credential row ${index + 1} cannot be decrypted on this device. Nothing was saved.`);
      if (existing?.[field]) {
        const previous = await decryptOrNull(existing[field]);
        if (previous === null) {
          // The stored secret can't be opened on this device: re-importing fills it in place, no duplicate.
          row[field] = await encrypt(plaintext);
          (row as Record<string, unknown>)[HEAL_FIELD] = existing.id;
          continue;
        }
        // A different secret under the same label/account is a separate entry, not an error.
        row[field] = previous === plaintext ? existing[field] : await encrypt(plaintext);
      } else row[field] = /^(mcenc:v[23]:|wcapi:)/.test(supplied) ? supplied : await encrypt(plaintext);
    }
    byIdentity.set(identity, { ...existing, ...row,
      password: row.password || existing?.password || "", apiKey: row.apiKey || existing?.apiKey || "" } as CredentialVault);
    output.push(row);
    // Yield between bounded batches so large pastes do not monopolize the UI.
    if (index % 8 === 7) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return output;
}
