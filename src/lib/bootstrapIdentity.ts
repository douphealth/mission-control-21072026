/** Stable IDs let independent device initialization converge without random duplicate seeds. */
export async function stableBootstrapId(namespace: string, identity: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return `${namespace}-${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
