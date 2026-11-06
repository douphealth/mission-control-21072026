import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { collectSearchPerformance } from "@/lib/searchPerformance.server";
import { collectSocialPerformance } from "@/lib/socialPerformance.server";

const range = z.object({ days: z.union([z.literal(7), z.literal(28), z.literal(90)]) });

/** Owner-gated: Google Search Console + Bing Webmaster performance. */
export const getSearchPerformance = createServerFn({ method: "POST" })
  .inputValidator((d) => range.parse(d))
  .handler(async ({ data }) => {
    const env = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), env);
    setResponseHeader("Cache-Control", "private, no-store");
    return await collectSearchPerformance(env, data.days);
  });

/** Owner-gated: Metricool analytics + Publer account roster. */
export const getSocialPerformance = createServerFn({ method: "POST" })
  .inputValidator((d) => range.parse(d))
  .handler(async ({ data }) => {
    const env = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), env);
    setResponseHeader("Cache-Control", "private, no-store");
    return await collectSocialPerformance(env, data.days);
  });

/** Owner-gated, on-demand only: DataForSEO rank check (paid; batched + cached 6h). */
export const checkRankings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    domain: z.string().trim().min(3).max(120),
    keywords: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
    location: z.number().int().min(1000).max(9_999_999),
  }).parse(d))
  .handler(async ({ data }) => {
    const env = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), env);
    setResponseHeader("Cache-Control", "private, no-store");
    const { runRankCheck } = await import("@/lib/rankCheck.server");
    return await runRankCheck(env as Record<string, string | undefined>, data.domain, data.keywords, data.location);
  });
