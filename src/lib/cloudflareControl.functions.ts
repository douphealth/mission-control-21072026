import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { collectCloudflareInventory } from "@/lib/cloudflareInventory.server";
import type { CloudflareControlSnapshot } from "@/lib/cloudflareControlState";

/**
 * One request loads zones, Pages and Workers together. The collector is called
 * ONLY after the Cloudflare Access JWT has been cryptographically verified.
 * In unauthenticated states only a generic setup status is returned.
 */
export const getCloudflareControl = createServerFn({ method: "GET" })
  .handler(async (): Promise<CloudflareControlSnapshot> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const fetchedAt = new Date().toISOString();
    try {
      await requireCloudflareViewer(getRequest());
    } catch (error) {
      if (error instanceof CloudflareAccessError) {
        return {
          status: error.code === "not_configured" ? "access_not_configured" : "login_required",
          fetchedAt, inventory: null,
          message: error.code === "not_configured"
            ? "Cloudflare Access is not configured on this deployment. Add the Access team domain and application audience as runtime settings; protect every app hostname and API endpoint."
            : "Access login required. Open Mission Control through its Access-protected hostname and sign in with an allowed identity.",
        };
      }
      return { status: "error", fetchedAt, inventory: null,
        message: "Access verification could not be completed. Check the Access policy and server logs." };
    }
    try {
      const inventory = await collectCloudflareInventory();
      return {
        status: inventory.truthState, fetchedAt: inventory.fetchedAt, inventory,
        message: inventory.truthState === "not_connected"
          ? "The backend has no Cloudflare account IDs or usable read-only account tokens. Configure encrypted runtime secrets."
          : inventory.errors.length
            ? "One or more Cloudflare API requests failed. Inspect per-account synchronization warnings."
            : null,
      };
    } catch {
      return { status: "error", fetchedAt, inventory: null,
        message: "Cloudflare inventory could not be read. Check server logs and token permissions." };
    }
  });
