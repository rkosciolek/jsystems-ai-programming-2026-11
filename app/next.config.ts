import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// ADR-000 section 7: load the repo-root .env (and app/.env*) for the Next.js process.
loadEnvConfig(path.resolve(process.cwd(), ".."));

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
