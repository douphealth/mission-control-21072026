import { writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "dist");
if (!existsSync(distDir)) {
  console.error("[postbuild] dist/ not found — build may have failed");
  process.exit(0);
}

// Generate _routes.json so Cloudflare Pages routes all non-static requests
// to the worker. Without this, Pages serves only static files and 404s on
// every dynamic route.
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
