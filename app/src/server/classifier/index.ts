import "server-only";

import sharp from "sharp";
import { z } from "zod";
import type { CaseInput } from "../../lib/domain";
import { getEnv } from "../env";
import type { ClassifierAnswer, ClassifierResult } from "../rules";
import { buildJevRequest } from "./questions";

const JEV_URL = "https://openrouter.ai/api/alpha/decisions";
const JEV_IMAGE_SIDE_LIMIT = 1568;

export type ClassifierErrorKind = "upstream" | "invalid_response" | "timeout";

export class ClassifierError extends Error {
  constructor(readonly kind: ClassifierErrorKind, message = `Jev classifier ${kind}`) {
    super(message);
    this.name = "ClassifierError";
  }
}

const ProbabilitySchema = z.record(z.string(), z.number().min(0).max(1));
const AnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }).passthrough(),
  z
    .object({
      type: z.literal("choice"),
      choice: z.string().min(1),
      probabilities: ProbabilitySchema,
      confidence: z.number().min(0).max(1).optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("score"),
      score: z.number(),
      legend: z.record(z.string(), z.string()),
      probabilities: ProbabilitySchema,
      confidence: z.number().min(0).max(1).optional(),
    })
    .passthrough(),
]);

const JevResponseSchema = z
  .object({
    model: z.string().min(1),
    answers: z.record(z.string(), AnswerSchema),
    usage: z
      .object({ cost: z.number().nonnegative().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

type JevResponse = z.infer<typeof JevResponseSchema>;
type JevAnswer = z.infer<typeof AnswerSchema>;

function invalidResponse(message: string): ClassifierError {
  return new ClassifierError("invalid_response", message);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function normalizeAnswer(answer: JevAnswer, raw: unknown): ClassifierAnswer {
  if (answer.type === "noul") {
    return {
      value: answer.noul >= 0.5,
      certainty: Math.max(answer.noul, 1 - answer.noul),
      raw,
    };
  }

  if (answer.type === "choice") {
    const certainty = answer.probabilities[answer.choice];
    if (certainty === undefined) throw invalidResponse("Jev choice has no probability for the selected option");
    return { value: answer.choice, certainty, raw };
  }

  const entries = Object.entries(answer.probabilities);
  if (entries.length === 0) throw invalidResponse("Jev score has no probabilities");

  let selectedLevel: number | undefined;
  let selectedProbability = -1;
  for (const [level, probability] of entries) {
    const numericLevel = Number(level);
    if (!Number.isInteger(numericLevel)) throw invalidResponse("Jev score probability keys must be integer levels");
    if (probability > selectedProbability) {
      selectedLevel = numericLevel;
      selectedProbability = probability;
    }
  }
  if (selectedLevel === undefined) throw invalidResponse("Jev score has no selected level");
  return { value: selectedLevel, certainty: selectedProbability, raw };
}

function validateAndNormalize(value: unknown, request: ReturnType<typeof buildJevRequest>): {
  response: JevResponse;
  answers: Record<string, ClassifierAnswer>;
} {
  const parsed = JevResponseSchema.safeParse(value);
  if (!parsed.success) throw invalidResponse("Jev response did not match the captured response schema");

  const originalAnswers = (value as { answers: Record<string, unknown> }).answers;
  const answers: Record<string, ClassifierAnswer> = {};
  for (const [id, question] of Object.entries(request.questions)) {
    const answer = parsed.data.answers[id];
    if (!answer || answer.type !== question.type) {
      throw invalidResponse(`Jev response is missing a valid answer for ${id}`);
    }
    answers[id] = normalizeAnswer(answer, originalAnswers[id]);
  }
  return { response: parsed.data, answers };
}

async function resizeJpegCopy(jpeg: Buffer): Promise<Buffer> {
  return sharp(Buffer.from(jpeg))
    .resize({
      width: JEV_IMAGE_SIDE_LIMIT,
      height: JEV_IMAGE_SIDE_LIMIT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg()
    .toBuffer();
}

export async function classify(
  input: CaseInput,
  jpeg: Buffer,
  signal: AbortSignal,
  deps: { fetch?: typeof fetch; apiKey?: string; model?: string } = {},
): Promise<ClassifierResult> {
  let apiKey = deps.apiKey;
  let model = deps.model;
  if (!apiKey || !model) {
    const env = getEnv();
    apiKey ??= env.OPENROUTER_API_KEY;
    model ??= env.JEV_MODEL;
  }

  const resizedJpeg = await resizeJpegCopy(jpeg);
  const request = buildJevRequest(input, resizedJpeg, model);
  const requestFetch = deps.fetch ?? globalThis.fetch;
  const startedAt = performance.now();

  let response: Response;
  try {
    response = await requestFetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (isAbortError(error)) throw error;
    if (error instanceof TypeError) throw new ClassifierError("upstream", "Jev network request failed");
    throw error;
  }

  if (!response.ok) {
    let responseBody: string;
    try {
      responseBody = await response.text();
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      if (isAbortError(error)) throw error;
      throw error;
    }
    const body = responseBody.slice(0, 500);
    console.error("Jev request failed", response.status, body);
    throw new ClassifierError("upstream", `Jev request failed with status ${response.status}`);
  }

  let responseJson: unknown;
  try {
    responseJson = await response.json();
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (isAbortError(error)) throw error;
    throw invalidResponse("Jev response body was not valid JSON");
  }

  const { response: parsed, answers } = validateAndNormalize(responseJson, request);
  return {
    answers,
    model: parsed.model,
    ...(parsed.usage?.cost !== undefined ? { costUsd: parsed.usage.cost } : {}),
    latencyMs: performance.now() - startedAt,
  };
}
