import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { collectCloudflareEstate, inspectCloudflareWorker } from "@/lib/cloudflareEstate.server";
export type { CloudflareAsset, CloudflareEstate, CloudflareServiceCheck, CloudflareWorkerDetails } from "@/lib/cloudflareEstate.server";

/** Server-only. Never accept caller credentials or return raw provider payloads. */
export const getCloudflareEstate = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  const env = await readCloudflareRuntimeEnv();
  await requireCloudflareViewer(getRequest(), env);
  return collectCloudflareEstate(env);
});
export const getCloudflareWorkerDetails = createServerFn({ method: "POST" })
  .inputValidator(data => z.object({
    accountId: z.string().regex(/^[a-f0-9]{32}$/i),
    name: z.string().regex(/^[a-zA-Z0-9_.-]{1,160}$/),
  }).parse(data))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const env = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), env);
    return inspectCloudflareWorker(data, env);
  });
