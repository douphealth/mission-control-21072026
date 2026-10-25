import type { CloudflareInventory } from "@/lib/cloudflareInventory.server";
import type { TruthState } from "@/lib/truth";

/** No secrets, account names, token counts or private resources in unauthenticated responses. */
export type CloudflareControlStatus =
  | "live" | "partial" | "error" | "not_connected"
  | "access_not_configured" | "login_required";

export interface CloudflareControlSnapshot {
  status: CloudflareControlStatus;
  fetchedAt: string;
  message: string | null;
  inventory: CloudflareInventory | null;
}

export function cloudflareTruthState(status: CloudflareControlStatus | null): TruthState {
  if (status === "live") return "live";
  if (status === "partial" || status === "error") return "error";
  if (status === "not_connected" || status === "access_not_configured") return "not_connected";
  return "unavailable";
}
