import { writeFileSync, existsSync, readdirSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const distDir = join(process.cwd(), "dist");
if (!existsSync(distDir)) {
  console.error("[postbuild] dist/ not found — build may have failed");
  process.exit(0);
}

// --- _routes.json: tells Cloudflare Pages which routes go to the worker ---
const clientAssetsDir = join(distDir, "client", "assets");
const exclude = ["/favicon.ico", "/assets/*"];

if (existsSync(clientAssetsDir)) {
  for (const file of readdirSync(clientAssetsDir)) {
    exclude.push(`/assets/${file}`);
  }
}

writeFileSync(
  join(distDir, "_routes.json"),
  JSON.stringify({ version: 1, include: ["/*"], exclude }, null, 2),
);
console.log("[postbuild] Wrote _routes.json");

// --- _worker.js: Cloudflare Pages requires the server entry at this path ---
// The cloudflare-module preset puts it at dist/server/index.mjs, but Pages
// looks for dist/_worker.js/index.js (or dist/_worker.js as a single file).
// We copy the server directory into _worker.js/ so relative imports resolve.
const workerDir = join(distDir, "_worker.js");
const serverDir = join(distDir, "server");

if (existsSync(serverDir) && !existsSync(workerDir)) {
  mkdirSync(workerDir, { recursive: true });

  function copyDir(src, dest) {
    for (const entry of readdirSync(src)) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      if (statSync(srcPath).isDirectory()) {
        mkdirSync(destPath, { recursive: true });
        copyDir(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDir(serverDir, workerDir);

  // Cloudflare Pages expects _worker.js/index.js (not .mjs)
  const indexMjs = join(workerDir, "index.mjs");
  const indexJs = join(workerDir, "index.js");
  if (existsSync(indexMjs) && !existsSync(indexJs)) {
    copyFileSync(indexMjs, indexJs);
  }

  console.log("[postbuild] Created _worker.js/ from server/");
}
