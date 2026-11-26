import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const PROMPT_NAMES = [
  "vision-complaint",
  "vision-return",
  "decision-complaint",
  "decision-return",
  "chat",
] as const;

export type PromptName = (typeof PROMPT_NAMES)[number];

// Resolved from the working directory so the same path works in `next dev`, `next build` and `next start`.
const PROMPTS_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "src/server/prompts");

const cache = new Map<PromptName, string>();

function promptFile(name: PromptName, dir: string): string {
  return path.join(/*turbopackIgnore: true*/ dir, `${name}.md`);
}

/** Returns the prompt text. Loaded once from the prompts folder and cached. */
export function getPrompt(name: PromptName): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const text = readFileSync(promptFile(name, PROMPTS_DIR), "utf8");
  cache.set(name, text);
  return text;
}

/** sha256 hex of the prompt file content; recorded in capture metadata (ADR-000 mock provenance). */
export function promptHash(name: PromptName, dir: string = PROMPTS_DIR): string {
  return createHash("sha256").update(readFileSync(promptFile(name, dir))).digest("hex");
}

/** Throws one error naming every prompt file missing from `dir`. */
export function assertPromptsExist(dir: string = PROMPTS_DIR): void {
  const missing = PROMPT_NAMES.map((name) => `${name}.md`).filter(
    (file) => !existsSync(path.join(/*turbopackIgnore: true*/ dir, file)),
  );
  if (missing.length > 0) {
    throw new Error(`Missing prompt file(s) in ${dir}: ${missing.join(", ")}`);
  }
}
