/** OAuth client IDs are public identifiers, never access tokens or client secrets. */
export function validGoogleClientId(value: unknown): string {
  if (typeof value !== "string") return "";
  const clean = value.trim();
  return /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clean) ? clean : "";
}

export function selectGoogleClientId(...values: unknown[]): string {
  for (const value of values) {
    const valid = validGoogleClientId(value);
    if (valid) return valid;
  }
  return "";
}