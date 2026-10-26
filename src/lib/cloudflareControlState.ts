import type { CloudflareInventory } from "@/lib/cloudflareInventory.server";
import type { TruthState } from "@/lib/truth";

export type CloudflareConnectionStatus =
  | "live" | "partial" | "error" | "not_connected"
  | "access_not_configured" | "login_required" | "unavailable";

export interface CloudflareControlSnapshot {
  status: CloudflareConnectionStatus;
  fetchedAt: string;
  message: string | null;
  inventory: CloudflareInventory | null;
}

/** Authentication and missing configuration are not Cloudflare service outages. */
export function cloudflareTruthState(status: CloudflareConnectionStatus | null): TruthState {
  if (status === "live") return "live";
  if (status === "partial" || status === "error") return "error";
  if (status === "not_connected" || status === "access_not_configured") return "not_connected";
  return "unavailable";
}
export function cloudflareSetupRequired(status: CloudflareConnectionStatus | null): boolean {
  return status === "access_not_configured" || status === "not_connected" || status === "login_required";
}
