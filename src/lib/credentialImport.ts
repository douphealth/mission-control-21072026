import type { CredentialVault } from "./db";
import { credentialIdentity } from "./dedup";
import { encrypt, decryptOrNull } from "./encryption";

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
        if (previous !== plaintext) {
          throw new Error(`Credential row ${index + 1} has a different secret for the same label/account. Use a distinct label or edit the existing entry. Nothing was saved.`);
        }
        row[field] = existing[field];
      } else row[field] = /^(mcenc:v2:|wcapi:)/.test(supplied) ? supplied : await encrypt(plaintext);
    }
    byIdentity.set(identity, { ...existing, ...row,
      password: row.password || existing?.password || "", apiKey: row.apiKey || existing?.apiKey || "" } as CredentialVault);
    output.push(row);
    // Yield between bounded batches so large pastes do not monopolize the UI.
    if (index % 8 === 7) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return output;
}
