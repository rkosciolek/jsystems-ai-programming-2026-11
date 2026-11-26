import "server-only";

// Runs once when the Next.js server starts (before it accepts requests), so a missing
// env variable or prompt/policy file fails fast with a clear message (TAC-04).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getEnv } = await import("@/server/env");
  const { assertPoliciesExist } = await import("@/server/policies");
  const { assertPromptsExist } = await import("@/server/prompts");
  getEnv();
  assertPoliciesExist();
  assertPromptsExist();
}
