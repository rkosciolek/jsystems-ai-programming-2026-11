// E2E server matrix (ADR-000 section 10). Shared by playwright.config.ts and the specs.
// Env values are applied on top of the inherited environment; model IDs come from ../.env,
// which `node --env-file-if-exists` reads at start-up.

export type ServerSpec = {
  id: "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8";
  port: number;
  overrides: Record<string, string>;
  url: string;
  logPath: string;
};

const DEFINITIONS: Omit<ServerSpec, "url" | "logPath">[] = [
  { id: "S1", port: 3101, overrides: { DECISION_MODE: "fast-only" } },
  { id: "S2", port: 3102, overrides: { DECISION_MODE: "llm-only" } },
  { id: "S3", port: 3103, overrides: { DECISION_MODE: "auto" } },
  { id: "S4", port: 3104, overrides: { CASE_TIMEOUT_MS: "1" } },
  { id: "S5", port: 3105, overrides: { DECISION_MODE: "llm-only", VISION_MODEL: "invalid/does-not-exist" } },
  { id: "S6", port: 3106, overrides: { DECISION_MODE: "fast-only", LLM_MODEL: "invalid/does-not-exist" } },
  { id: "S7", port: 3107, overrides: { DECISION_MODE: "fast-only", CASE_TTL_MS: "5000" } },
  { id: "S8", port: 3108, overrides: { DECISION_MODE: "auto", JEV_MODEL: "invalid/does-not-exist" } },
];

export const SERVERS: Record<ServerSpec["id"], ServerSpec> = Object.fromEntries(
  DEFINITIONS.map((definition) => [
    definition.id,
    {
      ...definition,
      url: `http://localhost:${definition.port}`,
      // Relative to the server working directory (app/), the same file the spec reads.
      logPath: `./var/e2e/${definition.id.toLowerCase()}.jsonl`,
    },
  ]),
) as Record<ServerSpec["id"], ServerSpec>;

/** Env keys the matrix controls. They are removed from the inherited environment first. */
export const MATRIX_ENV_KEYS = [
  "DECISION_MODE",
  "CASE_TIMEOUT_MS",
  "CASE_TTL_MS",
  "JEV_MODEL",
  "JEV_CONFIDENCE_THRESHOLD",
  "LLM_MODEL",
  "VISION_MODEL",
  "DECISION_LOG_PATH",
] as const;
