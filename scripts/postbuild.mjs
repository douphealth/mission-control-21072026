import { writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "dist");
if (!existsSync(distDir)) {
  console.error("[postbuild] dist/ not found — build may have failed");
  process.exit(0);
}

// Nitro's netlify preset generates an empty _redirects and uses
// .netlify/functions-internal/ (not edge-functions). Netlify needs
// a catch-all redirect to route dynamic requests to the server function.
const redirectsPath = join(distDir, "_redirects");
let redirects = "";

// Preserve any existing redirect rules from Nitro
if (existsSync(redirectsPath)) {
  const existing = readFileSync(redirectsPath, "utf8").trim();
  if (existing) redirects = existing + "\n";
}

// Add static asset exclusions so they're served directly (not through the function)
const assetsDir = join(distDir, "assets");
if (existsSync(assetsDir)) {
  for (const file of readdirSync(assetsDir)) {
    redirects += `/assets/${file} 200\n`;
  }
}
redirects += "/favicon.ico 200\n";
// Route everything else to the Netlify serverless function
redirects += "/*  /.netlify/functions-internal/server  200";

writeFileSync(redirectsPath, redirects);
console.log("[postbuild] Wrote _redirects for Netlify");
