import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { collectPrivateGithubInventory } from "@/lib/githubPrivateInventory.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
export type { GitHubPrivateInventory, PrivateRepoSnapshot } from "@/lib/githubPrivateInventory.server";

/** Private GitHub API data is available only behind verified Cloudflare Access. */
export const getPrivateGitHubInventory = createServerFn({ method: "GET" })
  .handler(async () => {
    const runtime = await readCloudflareRuntimeEnv();
    await requireCloudflareViewer(getRequest(), runtime);
    setResponseHeader("Cache-Control", "private, no-store");
    return await collectPrivateGithubInventory({ ...process.env, ...runtime });
  });
