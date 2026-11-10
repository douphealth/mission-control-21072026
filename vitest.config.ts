import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"], environmentMatchGlobs: [
    ["src/lib/__tests__/family-bulk.test.ts", "jsdom"],
    ["src/lib/__tests__/family-markdown.test.ts", "jsdom"],
    ["src/lib/__tests__/private-vault.test.ts", "jsdom"],
    ["src/lib/__tests__/googleClientConfig.test.ts", "jsdom"],
    ["src/lib/__tests__/cloudReconnect.test.ts", "jsdom"],
    ["src/stores/a11yStore.test.ts", "jsdom"],
  ] },
});
