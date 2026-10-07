import { REDACTED, stripSecretsForExport } from "./secrets";

/** Sanitized portable backups must not erase the destination's omitted secrets. */
export function preserveExcludedSecrets(
  snapshot: Record<string, any>,
  current?: Record<string, any>,
): Record<string, any> {
  if (!current) return snapshot;
  const safeCurrent = stripSecretsForExport(current);
  const output = { ...snapshot };
  for (const [key, value] of Object.entries(current)) {
    if (!Object.hasOwn(safeCurrent, key) && !Object.hasOwn(snapshot, key)) output[key] = value;
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === REDACTED) {
      if (Object.hasOwn(current, key)) output[key] = current[key];
      else delete output[key];
    } else if (value && typeof value === "object" && !Array.isArray(value) && current[key] && typeof current[key] === "object" && !Array.isArray(current[key])) {
      output[key] = preserveExcludedSecrets(value, current[key]);
    }
  }
  return output;
}
