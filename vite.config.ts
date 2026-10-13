import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    // The face-age widget ships as one browser bundle.
    chunkSizeWarningLimit: 2500,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
