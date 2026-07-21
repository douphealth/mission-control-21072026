import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    ...(mode === "development" ? [componentTagger()] : []),
  ] as any;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@tanstack/react-virtual": path.resolve(__dirname, "./src/lib/reactVirtualCompat.ts"),
      },
    },
  };
});
