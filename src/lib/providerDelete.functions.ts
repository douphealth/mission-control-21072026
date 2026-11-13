import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { assertSameOrigin } from "@/lib/cloudflareActions.server";
import {
  CF_NAME,
  GH_NAME,
  deleteCloudflareResource,
  deleteGitHubRepository,
  type DeleteOutcome,
} from "@/lib/providerDelete.server";
export type { DeleteOutcome } from "@/lib/providerDelete.server";

async function guard(): Promise<Record<string, string | undefined>> {
  setResponseHeader("Cache-Control", "private, no-store");
  const runtime = await readCloudflareRuntimeEnv();
  const env = { ...process.env, ...runtime };
  const request = getRequest();
  await requireCloudflareViewer(request, env);
  assertSameOrigin(request);
  return env;
}
const refused = (): DeleteOutcome => ({
  ok: false,
  code: "rejected",
  message: "The delete could not be completed. Nothing was changed.",
});

/** Permanently deletes a Pages project or Worker. `confirm` must repeat the exact name. */
export const deleteCloudflareProject = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        accountId: z.string().regex(/^[a-f0-9]{32}$/i),
        kind: z.enum(["pages", "worker"]),
        name: z.string().regex(CF_NAME),
        confirm: z.string(),
      })
      .refine((v) => v.confirm === v.name, "Type the exact name to confirm")
      .parse(data),
  )
  .handler(async ({ data }): Promise<DeleteOutcome> => {
    const env = await guard();
    try {
      return await deleteCloudflareResource(data, env);
    } catch {
      return refused();
    }
  });

/** Permanently deletes a GitHub repository. `confirm` must repeat "owner/repo". */
export const deleteGitHubRepo = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        owner: z.string().regex(GH_NAME),
        repo: z.string().regex(GH_NAME),
        confirm: z.string(),
      })
      .refine((v) => v.confirm === v.owner + "/" + v.repo, "Type the exact name to confirm")
      .parse(data),
  )
  .handler(async ({ data }): Promise<DeleteOutcome> => {
    const env = await guard();
    try {
      return await deleteGitHubRepository(data, env);
    } catch {
      return refused();
    }
  });
