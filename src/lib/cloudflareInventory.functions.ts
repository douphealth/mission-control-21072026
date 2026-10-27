import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { collectCloudflareInventory, loadDeploymentHistory } from "@/lib/cloudflareInventory.server";
export type { CloudflareDeploymentRow, CloudflareInventory, DeploymentHistoryItem }
  from "@/lib/cloudflareInventory.server";

/** Both endpoints fail closed until Cloudflare Access JWT is verified. */
export const getCloudflareInventory = createServerFn({ method: "GET" })
  .handler(async () => {
    const environment = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), environment);
    setResponseHeader("Cache-Control", "private, no-store");
    return await collectCloudflareInventory(environment);
  });

export const getCloudflareDeploymentHistory = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    accountId: z.string().regex(/^[a-f0-9]{32}$/i),
    kind: z.enum(["pages", "worker"]),
    name: z.string().regex(/^[a-zA-Z0-9_.-]{1,160}$/),
    page: z.number().int().min(1).max(100),
  }).parse(data))
  .handler(async ({ data }) => {
    const environment = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), environment);
    setResponseHeader("Cache-Control", "private, no-store");
    return await loadDeploymentHistory(data, environment);
  });
