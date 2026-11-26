import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Per-file environment: unit tests under tests/unit/**/*.test.tsx use jsdom through a
// `// @vitest-environment jsdom` docblock (see app/AGENTS.md). Node is the default.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // "server-only" throws outside the React Server environment; tests get an empty module.
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    passWithNoTests: true,
  },
});
