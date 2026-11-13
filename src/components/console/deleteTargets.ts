import type { DeleteTarget } from "@/components/console/DeleteResourceDialog";
import type { CloudflareDeploymentRow } from "@/lib/cloudflareInventory.server";
import type { RepoOpsRow } from "@/lib/repoOps";
import { OWNERS } from "@/lib/liveGitHub";
import {
  cleanupCloudflarePagesDeployments,
  deleteCloudflareProject,
  deleteGitHubRepo,
} from "@/lib/providerDelete.functions";

/** Owner/repo exactly as GitHub spells them, from the repository URL. */
export function githubRepoPath(url: string): { owner: string; repo: string } | null {
  try {
    const [owner, repo] = new URL(url).pathname.split("/").filter(Boolean);
    return owner && repo ? { owner, repo: repo.replace(/\.git$/i, "") } : null;
  } catch {
    return null;
  }
}

const optional = (passcode: string) => (passcode ? { adminPasscode: passcode } : {});

export function cloudflareDeleteTarget(
  row: CloudflareDeploymentRow,
  accountLabel: string,
): DeleteTarget {
  const pages = row.kind === "pages";
  return {
    key: row.key,
    provider: "Cloudflare",
    what: pages ? "Pages project" : "Worker",
    account: accountLabel,
    confirmText: row.name,
    consequences: [
      pages
        ? "All deployments and the pages.dev address are removed."
        : "The Worker's code, routes and workers.dev address are removed. Cloudflare refuses if other Workers still depend on it.",
      row.domains.length
        ? "Its custom domains (" + row.domains.join(", ") + ") stop serving it."
        : "Anything linking to its address will stop working.",
      "The GitHub repository and your saved plans in this app are not touched.",
    ],
    remove: (passcode) =>
      deleteCloudflareProject({
        data: {
          accountId: row.accountId,
          kind: row.kind,
          name: row.name,
          confirm: row.name,
          ...optional(passcode),
        },
      }),
    cleanup: pages
      ? (passcode) =>
          cleanupCloudflarePagesDeployments({
            data: {
              accountId: row.accountId,
              name: row.name,
              confirm: row.name,
              acknowledge: true,
              ...optional(passcode),
            },
          })
      : undefined,
  };
}

/** Only repositories in a connected account can be deleted (with that account's own server key). */
export function githubDeleteTarget(row: RepoOpsRow): DeleteTarget | null {
  const path = githubRepoPath(row.url) || { owner: row.owner, repo: row.key.split("/")[1] || "" };
  if (!path.repo || !OWNERS.some((o) => o.toLowerCase() === path.owner.toLowerCase())) return null;
  const full = path.owner + "/" + path.repo;
  return {
    key: row.key,
    provider: "GitHub",
    what: "repository",
    account: path.owner,
    confirmText: full,
    consequences: [
      "All code, history, issues, pull requests and settings are removed from GitHub.",
      row.cloudflare.length
        ? "Cloudflare projects built from it (" +
          row.cloudflare.map((c) => c.name).join(", ") +
          ") keep their current version but can no longer rebuild."
        : "Cloudflare projects built from it keep their current version but can no longer rebuild.",
      "Your saved plan for it stays in this app, hidden from the list.",
    ],
    remove: (passcode) =>
      deleteGitHubRepo({
        data: { owner: path.owner, repo: path.repo, confirm: full, ...optional(passcode) },
      }),
  };
}
