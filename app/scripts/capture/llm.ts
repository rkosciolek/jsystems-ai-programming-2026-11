import { createHash } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { CaseInput, DateFacts } from "../../src/lib/domain";
import { CATEGORIES } from "../../src/lib/domain";
import { computeFacts } from "../../src/server/rules";
import { CAPTURE_DIR } from "./recorder";

// Helpers for the LLM recordings (T03b): inputs are derived from the real Jev recordings, never invented.

export const POLICIES = join(process.cwd(), "..", "docs", "policies");
export const CASE_NUMBER = "HSD-20261126-T3B1";

export function policyText(caseType: CaseInput["caseType"]): string {
  return readFileSync(join(POLICIES, caseType === "complaint" ? "complaint-policy.md" : "return-policy.md"), "utf8");
}

export function policyHash(caseType: CaseInput["caseType"]): string {
  return createHash("sha256").update(policyText(caseType)).digest("hex");
}

export function formJson(input: CaseInput) {
  return {
    caseType: input.caseType,
    category: CATEGORIES.find((c) => c.id === input.category)?.label ?? input.category,
    model: input.model,
    purchaseDate: input.purchaseDate,
    channel: input.channel,
    description: input.description,
  };
}

export type NormalizedAnswers = Record<string, { value: boolean | string | number; certainty: number }>;

/** ADR-001 section 3.2 normalization, applied to a recorded Jev response body. */
export function jevAnswers(recording: string): NormalizedAnswers {
  const body = JSON.parse(readFileSync(join(CAPTURE_DIR, recording, "response.body"), "utf8")) as {
    answers: Record<string, { type: string; noul?: number; choice?: string; probabilities?: Record<string, number> }>;
  };
  const out: NormalizedAnswers = {};
  for (const [id, a] of Object.entries(body.answers)) {
    if (a.type === "noul") {
      const p = a.noul ?? 0;
      out[id] = { value: p >= 0.5, certainty: Math.max(p, 1 - p) };
    } else if (a.type === "choice") {
      out[id] = { value: a.choice ?? "", certainty: a.probabilities?.[a.choice ?? ""] ?? 0 };
    } else {
      const probs = Object.entries(a.probabilities ?? {}).sort((x, y) => y[1] - x[1])[0];
      out[id] = { value: Number(probs?.[0] ?? 0), certainty: probs?.[1] ?? 0 };
    }
  }
  return out;
}

export function facts(input: CaseInput, today: string): DateFacts {
  return computeFacts(input, today);
}

/** Message content of a recorded (non-streamed) chat completion. */
export function recordedContent(recording: string): string {
  const body = JSON.parse(readFileSync(join(CAPTURE_DIR, recording, "response.body"), "utf8")) as {
    choices: { message: { content: string } }[];
  };
  return body.choices[0]!.message.content;
}

export function recordedJson<T>(recording: string): T {
  return JSON.parse(recordedContent(recording)) as T;
}

export function clearRecording(...names: string[]) {
  for (const n of names) rmSync(join(CAPTURE_DIR, n), { recursive: true, force: true });
}
