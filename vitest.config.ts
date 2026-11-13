import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The shared album package is TypeScript source inside node_modules; let Vite transform it.
    server: { deps: { inline: ["classping-album"] } },
  },
  // The copied package carries no tsconfig; compile its JSX with the automatic runtime, as Next does.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
