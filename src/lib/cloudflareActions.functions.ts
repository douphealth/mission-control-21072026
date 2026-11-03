import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { assertSameOrigin, PagesActionError, runPagesAction } from "@/lib/cloudflareActions.server";
export type { PagesAction, PagesActionResult } from "@/lib/cloudflareActions.server";

export type PagesActionResponse =
  | { ok: true; deploymentId: string | null; status: string; url: string | null }
  | { ok: false; code: string; message: string };

/**
 * Starts a production deployment, retries a deployment, or rolls production back.
 * Requires verified Cloudflare Access identity, a same-origin request, and a
 * dedicated per-account deploy token. Errors are public-safe (no provider text).
 */
export const runCloudflarePagesAction = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        accountId: z.string().regex(/^[a-f0-9]{32}$/i),
        name: z.string().regex(/^[a-zA-Z0-9_.-]{1,160}$/),
        action: z.enum(["deploy", "retry", "rollback"]),
        deploymentId: z
          .string()
          .regex(/^[a-f0-9][a-f0-9-]{7,63}$/i)
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PagesActionResponse> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const environment = await readCloudflareRuntimeEnv();
    const request = getRequest();
    await requireCloudflareViewer(request, environment);
    try {
      assertSameOrigin(request);
      const result = await runPagesAction(data, environment);
      return {
        ok: true,
        deploymentId: result.deploymentId,
        status: result.status,
        url: result.url,
      };
    } catch (error) {
      if (error instanceof PagesActionError)
        return { ok: false, code: error.code, message: error.message };
      return {
        ok: false,
        code: "rejected",
        message: "The Cloudflare action could not be completed.",
      };
    }
  });
