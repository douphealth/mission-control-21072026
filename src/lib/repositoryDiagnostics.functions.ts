import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { collectRepositoryDiagnostics } from "@/lib/repositoryDiagnostics.server";
export type { RepositoryDiagnostics } from "@/lib/repositoryDiagnostics.server";

/** Single repository per request, always behind Cloudflare Access and account token. */
export const getRepositoryDiagnostics = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    owner: z.enum(["douphealth", "Papalexios", "papalexios001-wq", "papalexios01"]),
    repo: z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/),
  }).parse(data))
  .handler(async ({ data }) => {
    const runtime = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), runtime);
    setResponseHeader("Cache-Control", "private, no-store");
    return await collectRepositoryDiagnostics(data.owner, data.repo, {...process.env,...runtime});
  });
