import path from "node:path";
import { loadEnv, defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

async function nitroPlugin() {
  const { nitro } = await import("nitro/vite");
  return nitro({ preset: "netlify" });
}

export default defineConfig({
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
      entities: path.resolve(process.cwd(), "node_modules/entities"),
    },
  },
});
