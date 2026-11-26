import "server-only";
import { z } from "zod";

export class EnvError extends Error {
  constructor(readonly variables: readonly string[]) {
    super(`Missing or invalid environment variables: ${variables.join(", ")}`);
    this.name = "EnvError";
  }
}

const EnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1),
  VISION_MODEL: z.string().min(1).optional(),
  JEV_MODEL: z.string().min(1).default("typesafe/jev-1.14"),
  DECISION_MODE: z.enum(["auto", "llm-only", "fast-only"]).default("auto"),
  JEV_CONFIDENCE_THRESHOLD: z.coerce.number().min(0.5).max(0.99).default(0.8),
  LLM_REASONING_EFFORT: z.enum(["minimal", "low", "medium", "high"]).default("medium"),
  CASE_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
  CASE_TTL_MS: z.coerce.number().int().min(1000).max(86400000).default(7200000),
  POLICIES_DIR: z.string().min(1).default("../docs/policies"),
  DECISION_LOG_PATH: z.string().min(1).default("./var/decisions.jsonl"),
});

export type Env = Omit<z.infer<typeof EnvSchema>, "VISION_MODEL"> & { VISION_MODEL: string };

export function parseEnv(source: Record<string, string | undefined>): Env {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== "") cleaned[key] = value;
  }
  const result = EnvSchema.safeParse(cleaned);
  if (!result.success) {
    const names = new Set<string>();
    for (const issue of result.error.issues) names.add(String(issue.path[0] ?? "unknown"));
    throw new EnvError([...names]);
  }
  return { ...result.data, VISION_MODEL: result.data.VISION_MODEL ?? result.data.LLM_MODEL };
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
