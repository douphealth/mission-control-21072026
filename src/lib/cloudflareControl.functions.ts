import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import {
  apiTokenFor,
  collectCloudflareInventory,
  configuredAccountLabels,
  configuredAccounts,
  deployTokenFor,
  type CloudflareInventory,
} from "@/lib/cloudflareInventory.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import type { CloudflareControlSnapshot, CloudflareManifest } from "@/lib/cloudflareControlState";

type AccessFailure = Pick<CloudflareControlSnapshot, "status" | "message">;
/** Authenticate before any API call. Returns a public-safe failure, or null when allowed. */
async function authorize(
  environment: Record<string, string | undefined>,
): Promise<AccessFailure | null> {
  try {
    await requireCloudflareViewer(getRequest(), environment);
    return null;
  } catch (error) {
    if (error instanceof CloudflareAccessError) {
      return error.code === "not_configured"
        ? {
            status: "access_not_configured",
            message:
              "Cloudflare Access is not set up for this deployment. Secure the application and configure its server-side Access team domain and audience.",
          }
        : {
            status: "login_required",
            message:
              "Cloudflare Access sign-in is required. Open the protected Mission Control URL and sign in with an allowed account.",
          };
    }
    return {
      status: "unavailable",
      message: "Access validation could not complete. Verify the Access policy and runtime.",
    };
  }
}
function messageFor(inventory: CloudflareInventory): string | null {
  return inventory.truthState === "not_connected"
    ? "Access identity verified, but the server lacks complete Cloudflare account IDs or read-only API tokens."
    : inventory.errors.length
      ? "Some Cloudflare accounts or API permissions failed. Review the per-account results below."
      : null;
}

/**
 * One authenticated request supplies both infrastructure inventory and zones.
 * Public requests receive only a generic status, NEVER credentials, account IDs
 * or private infrastructure names. Authentication always happens before the API.
 * Kept for compatibility; the UI uses the scoped functions below.
 */
export const getCloudflareControl = createServerFn({ method: "GET" }).handler(
  async (): Promise<CloudflareControlSnapshot> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const fetchedAt = new Date().toISOString();
    const environment = await readCloudflareRuntimeEnv();
    const denied = await authorize(environment);
    if (denied) return { ...denied, fetchedAt, inventory: null };
    try {
      const inventory = await collectCloudflareInventory(environment);
      return {
        status: inventory.truthState,
        fetchedAt: inventory.fetchedAt,
        inventory,
        message: messageFor(inventory),
      };
    } catch {
      return {
        status: "error",
        fetchedAt,
        inventory: null,
        message:
          "Cloudflare API inventory failed. Review the server runtime and account-scoped token permissions.",
      };
    }
  },
);

/**
 * Lists configured accounts without calling the Cloudflare API, so the browser
 * can request each account/section in its own Worker invocation. This keeps the
 * Pages listing within the per-invocation subrequest budget as accounts grow.
 */
export const getCloudflareManifest = createServerFn({ method: "GET" }).handler(
  async (): Promise<CloudflareManifest> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const fetchedAt = new Date().toISOString();
    const environment = await readCloudflareRuntimeEnv();
    const denied = await authorize(environment);
    if (denied) return { ...denied, fetchedAt, accounts: [] };
    const labels = configuredAccountLabels(environment);
    const accounts = configuredAccounts(environment).map((accountId) => ({
      accountId,
      label: labels[accountId] || "Account …" + accountId.slice(-6),
      configuredToken: Boolean(apiTokenFor(accountId, environment)),
      deployEnabled: Boolean(deployTokenFor(accountId, environment)),
    }));
    return accounts.length
      ? { status: "live", fetchedAt, message: null, accounts }
      : {
          status: "not_connected",
          fetchedAt,
          accounts,
          message:
            "Access identity verified, but the server lacks complete Cloudflare account IDs or read-only API tokens.",
        };
  },
);

const ACCOUNT = z.string().regex(/^[a-f0-9]{32}$/i);
export const getCloudflareInventoryPart = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        accountId: ACCOUNT,
        section: z.enum(["pages", "platform"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<CloudflareInventory> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const environment = await readCloudflareRuntimeEnv();
    const denied = await authorize(environment);
    if (denied) throw new Error(denied.message || "Cloudflare Access denied");
    return await collectCloudflareInventory(environment, data);
  });
