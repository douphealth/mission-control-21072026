import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { collectCloudflareInventory } from "@/lib/cloudflareInventory.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import type { CloudflareControlSnapshot } from "@/lib/cloudflareControlState";

/**
 * One authenticated request supplies both infrastructure inventory and zones.
 * Public requests receive only a generic status, NEVER credentials, account IDs
 * or private infrastructure names. Authentication always happens before the API.
 */
export const getCloudflareControl = createServerFn({ method: "GET" })
  .handler(async (): Promise<CloudflareControlSnapshot> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const fetchedAt = new Date().toISOString();
    const environment = await readCloudflareRuntimeEnv();
    try {
      await requireCloudflareViewer(getRequest(), environment);
    } catch (error) {
      if (error instanceof CloudflareAccessError) {
        return {
          status: error.code === "not_configured" ? "access_not_configured" : "login_required",
          fetchedAt, inventory: null,
          message: error.code === "not_configured"
            ? "Cloudflare Access is not set up for this deployment. Secure the application and configure its server-side Access team domain and audience."
            : "Cloudflare Access sign-in is required. Open the protected Mission Control URL and sign in with an allowed account.",
        };
      }
      return {
        status: "unavailable", fetchedAt, inventory: null,
        message: "Access validation could not complete. Verify the Access policy and runtime.",
      };
    }
    try {
      const inventory = await collectCloudflareInventory(environment);
      return {
        status: inventory.truthState,
        fetchedAt: inventory.fetchedAt,
        inventory,
        message: inventory.truthState === "not_connected"
          ? "Access identity verified, but the server lacks complete Cloudflare account IDs or read-only API tokens."
          : inventory.errors.length
            ? "Some Cloudflare accounts or API permissions failed. Review the per-account results below."
            : null,
      };
    } catch {
      return {
        status: "error", fetchedAt, inventory: null,
        message: "Cloudflare API inventory failed. Review the server runtime and account-scoped token permissions.",
      };
    }
  });
