/**
 * Access gate for every estate server function. Production always requires a
 * verified Cloudflare Access identity (fails closed when Access is not set up).
 *
 * Local development only: when Vite runs in dev mode AND the process sets
 * MC_DEV_ALLOW_UNAUTHENTICATED=1, the Access check is skipped so the estate can
 * be exercised on localhost. `import.meta.env.DEV` is statically false in every
 * production build, so this branch is removed from deployed bundles.
 */
import { getRequest } from "@tanstack/react-start/server";
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import type { EstateGate } from "@/lib/estate/types";

type Env = Record<string, string | undefined>;

export type ViewerResult =
  | { gate: "ok"; env: Env }
  | { gate: Exclude<EstateGate, "ok">; message: string };

export const GATE_MESSAGES: Record<Exclude<EstateGate, "ok">, string> = {
  access_not_configured:
    "Cloudflare Access is not set up for this deployment, so private GitHub and Cloudflare data stays locked. Configure CLOUDFLARE_ACCESS_TEAM_DOMAIN and CLOUDFLARE_ACCESS_AUD.",
  login_required:
    "Sign in through Cloudflare Access on the protected Mission Control URL to load your estate.",
  unavailable: "Access validation could not complete. Verify the Access policy and runtime.",
};

export function devBypassEnabled(): boolean {
  return (
    Boolean(import.meta.env.DEV) &&
    typeof process !== "undefined" &&
    process.env?.MC_DEV_ALLOW_UNAUTHENTICATED === "1"
  );
}

export async function estateViewer(): Promise<ViewerResult> {
  const runtime = await readCloudflareRuntimeEnv();
  const env: Env =
    typeof process !== "undefined" && process.env ? { ...process.env, ...runtime } : runtime;
  if (devBypassEnabled()) return { gate: "ok", env };
  try {
    await requireCloudflareViewer(getRequest(), runtime);
    return { gate: "ok", env };
  } catch (error) {
    if (error instanceof CloudflareAccessError) {
      const gate = error.code === "not_configured" ? "access_not_configured" : "login_required";
      return { gate, message: GATE_MESSAGES[gate] };
    }
    return { gate: "unavailable", message: GATE_MESSAGES.unavailable };
  }
}
