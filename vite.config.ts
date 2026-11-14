import fs from "node:fs";
import path from "node:path";
import { loadEnv, defineConfig, searchForWorkspaceRoot } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

async function nitroPlugin() {
  const { nitro } = await import("nitro/vite");
  return nitro({ preset: process.env.NITRO_PRESET || "cloudflare-pages" });
}

// node_modules may be a symlink to a directory outside the project (sandbox
// installs live in /persist). Vite 8 refuses to load files outside the allowed
// roots, which breaks Nitro's dev entry, so allow the real install path too.
function realNodeModules(): string[] {
  try {
    return [fs.realpathSync(path.resolve(process.cwd(), "node_modules"))];
  } catch {
    return [];
  }
}

export default defineConfig({
  server: {
    // The managed development preview forwards this explicit host.
    allowedHosts: ["terminal.local"],
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), ...realNodeModules()] },
  },
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
    nitroPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "entities/lib/decode.js": path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
      "entities/lib/encode.js": path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
      "entities/decode": path.resolve(process.cwd(), "node_modules/htmlparser2/node_modules/entities/decode.js"),
      "entities/escape": path.resolve(process.cwd(), "node_modules/htmlparser2/node_modules/entities/escape.js"),
      entities: path.resolve(process.cwd(), "node_modules/entities"),
    },
  },
});
