import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { CF_NAME, GH_NAME } from "@/lib/providerDeleteNames";
import type { CleanupOutcome, DeleteOutcome } from "@/lib/providerDelete.server";
import {
  type DeleteAdminStatus,
  deleteAdminStatus,
  gatedCloudflareDelete,
  gatedGitHubDelete,
  gatedPagesCleanup,
} from "@/lib/providerDeleteGate.server";
export type { CleanupOutcome, DeleteOutcome } from "@/lib/providerDelete.server";
export type { DeleteAdminStatus } from "@/lib/providerDeleteGate.server";

async function serverEnv(): Promise<Record<string, string | undefined>> {
  setResponseHeader("Cache-Control", "private, no-store");
  const runtime = await readCloudflareRuntimeEnv();
  return { ...process.env, ...runtime };
}
const unknownFailure = {
  ok: false as const,
  code: "unverified" as const,
  message:
    "The server hit an error, so it is not certain what happened. Refresh the list before trying again.",
};
const adminPasscode = z.string().max(256).optional();

/** Permanently deletes a Pages project or Worker. `confirm` must repeat the exact name; admin only. */
export const deleteCloudflareProject = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        accountId: z.string().regex(/^[a-f0-9]{32}$/i),
        kind: z.enum(["pages", "worker"]),
        name: z.string().regex(CF_NAME),
        confirm: z.string().max(200),
        adminPasscode,
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<DeleteOutcome> => {
    try {
      return await gatedCloudflareDelete(getRequest(), await serverEnv(), data);
    } catch {
      return unknownFailure;
    }
  });

/** Separate explicit step: removes old Pages deployments (never the live one, never the project). */
export const cleanupCloudflarePagesDeployments = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        accountId: z.string().regex(/^[a-f0-9]{32}$/i),
        name: z.string().regex(CF_NAME),
        confirm: z.string().max(200),
        acknowledge: z.boolean(),
        adminPasscode,
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<CleanupOutcome> => {
    try {
      return await gatedPagesCleanup(getRequest(), await serverEnv(), data);
    } catch {
      return {
        ...unknownFailure,
        message:
          "The server hit an error while removing old deployments. Refresh before trying again.",
      };
    }
  });

/** Permanently deletes a GitHub repository. `confirm` must repeat "owner/repo"; admin only. */
export const deleteGitHubRepo = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        owner: z.string().regex(GH_NAME),
        repo: z.string().regex(GH_NAME),
        confirm: z.string().max(220),
        adminPasscode,
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<DeleteOutcome> => {
    try {
      return await gatedGitHubDelete(getRequest(), await serverEnv(), data);
    } catch {
      return unknownFailure;
    }
  });

/**
 * Read-only check for the confirmation window: is deleting set up, is a second
 * factor required, and which verified admin identity (if any) the server sees.
 * The Google token travels in the x-mc-admin-google-token header, never in data.
 */
export const checkDeleteAdmin = createServerFn({ method: "POST" }).handler(
  async (): Promise<DeleteAdminStatus> => {
    try {
      return await deleteAdminStatus(getRequest(), await serverEnv());
    } catch {
      return {
        configured: false,
        message: "Could not check admin sign-in right now. Try again in a moment.",
        secondFactorRequired: false,
        googleReady: false,
        identity: null,
        otherEmail: null,
      };
    }
  },
);
