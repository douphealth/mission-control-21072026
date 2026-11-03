export interface BuildInfo {
  commit: string;
  builtAt: string;
}

/** Accept only the manifest generated for this application, never a guessed version. */
export function parseBuildInfo(value: unknown): BuildInfo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.app !== "mission-control" || typeof record.commit !== "string" || !/^[a-f\d]{40}$/i.test(record.commit)) return null;
  if (typeof record.builtAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(record.builtAt) || !Number.isFinite(Date.parse(record.builtAt))) return null;
  return { commit: record.commit.toLowerCase(), builtAt: record.builtAt };
}

export async function readBuildInfo(signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<BuildInfo | null> {
  try {
    const response = await fetcher("/build-info.json", { cache: "no-store", redirect: "error", signal });
    if (!response.ok) return null;
    return parseBuildInfo(await response.json());
  } catch {
    // Missing local-development manifests, offline requests and an expired Access
    // session cannot substantiate a deployment version and must not break the app.
    return null;
  }
}
