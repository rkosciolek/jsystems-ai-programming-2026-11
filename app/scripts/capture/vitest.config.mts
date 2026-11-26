import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Runner for `npm run capture`: vitest resolves the "server-only" stub and relative imports
// without extensions, which plain `node --experimental-strip-types` cannot.
export default defineConfig({
  resolve: {
    alias: { "server-only": fileURLToPath(new URL("../../tests/server-only-stub.ts", import.meta.url)) },
  },
  test: {
    include: ["scripts/capture/index.ts"],
    environment: "node",
    testTimeout: 180_000,
  },
});
