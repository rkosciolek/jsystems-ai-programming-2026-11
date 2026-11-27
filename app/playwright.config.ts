import { defineConfig, devices } from "@playwright/test";
import { MATRIX_ENV_KEYS, SERVERS, type ServerSpec } from "./tests/e2e/servers";

// Run `npm run build` first. `npm run test:e2e` only starts the eight servers from that build.

function serverEnv(spec: ServerSpec): Record<string, string> {
  const inherited: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !(MATRIX_ENV_KEYS as readonly string[]).includes(key)) inherited[key] = value;
  }
  return { ...inherited, ...spec.overrides, DECISION_LOG_PATH: spec.logPath };
}

const webServer = Object.values(SERVERS).map((spec) => ({
  name: `${spec.id} on port ${spec.port}`,
  command: `node --env-file-if-exists=../.env node_modules/.bin/next start -p ${spec.port}`,
  url: spec.url,
  reuseExistingServer: false,
  timeout: 120_000,
  env: serverEnv(spec),
}));

// Firefox runs the core specs E1, E8 and E9 only (ADR-000 section 10).
const CORE_SPECS = /(^|[\\/])e(1|8|9)\.spec\.ts$/;
const ALL_SPECS = /\.spec\.ts$/;

const browsers = [
  { name: "chromium", device: devices["Desktop Chrome"], files: ALL_SPECS },
  { name: "firefox", device: devices["Desktop Firefox"], files: CORE_SPECS },
  ...(process.env.E2E_WEBKIT === "1"
    ? [{ name: "webkit", device: devices["Desktop Safari"], files: ALL_SPECS }]
    : []),
];

// Each browser gets two projects: deterministic specs (retries 0) and `@model` specs
// (retries 2). Model-quality failures are reported separately from code defects.
const projects = browsers.flatMap((browser) => [
  {
    name: browser.name,
    use: { ...browser.device },
    testMatch: browser.files,
    grepInvert: /@model/,
    retries: 0,
  },
  {
    name: `${browser.name}-model`,
    use: { ...browser.device },
    testMatch: browser.files,
    grep: /@model/,
    retries: 2,
  },
]);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  outputDir: "./var/e2e/test-results",
  use: {
    baseURL: SERVERS.S1.url,
    trace: "on-first-retry",
  },
  webServer,
  projects,
});
