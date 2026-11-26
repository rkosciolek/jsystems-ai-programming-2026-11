import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CaseType } from "@/lib/domain";
import { getEnv } from "@/server/env";

const POLICY_FILES = {
  complaint: "complaint-policy.md",
  return: "return-policy.md",
} as const satisfies Record<CaseType, string>;

const cache = new Map<CaseType, string>();

function resolvePoliciesDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), getEnv().POLICIES_DIR);
}

/**
 * Throws one error naming every policy file missing from `dir`.
 * Called from `instrumentation.ts` so a missing policy stops the server at startup (TAC-04).
 */
export function assertPoliciesExist(dir: string = resolvePoliciesDir()): void {
  const missing = Object.values(POLICY_FILES).filter((file) => !existsSync(path.join(/*turbopackIgnore: true*/ dir, file)));
  if (missing.length > 0) {
    throw new Error(`Missing policy file(s) in ${dir}: ${missing.join(", ")}`);
  }
}

/** Returns the policy text for a case type. Loaded once from POLICIES_DIR and cached. */
export function getPolicy(caseType: CaseType): string {
  const cached = cache.get(caseType);
  if (cached !== undefined) return cached;
  const text = readFileSync(path.join(/*turbopackIgnore: true*/ resolvePoliciesDir(), POLICY_FILES[caseType]), "utf8");
  cache.set(caseType, text);
  return text;
}
