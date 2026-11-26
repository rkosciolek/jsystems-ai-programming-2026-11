import "server-only";

import type { CaseInput, CaseSummary, CaseUIMessage, DecisionOutcome } from "@/lib/domain";
import { todayInWarsaw } from "@/lib/domain";
import { classify, ClassifierError } from "@/server/classifier";
import { getCaseStore, type CaseRecord } from "@/server/case-store";
import { generateCaseId } from "@/server/case-id";
import { logDecision } from "@/server/decision-log";
import { getEnv } from "@/server/env";
import { processImage } from "@/server/images";
import { analyzeImage, decide, finalizeFirstMessage, LlmError } from "@/server/llm";
import { evaluate, computeFacts, type ClassifierResult, type RuleOutcome } from "@/server/rules";
import { finalizeFirstMessage as finalizeTemplate, renderFirstMessage } from "@/server/templates";
import type { CaseEvent } from "@/lib/domain";

export type PipelineDependencies = { fetch?: typeof fetch; now?: () => Date };

export type RunCasePipelineOptions = {
  signal: AbortSignal;
  emit: (event: CaseEvent) => void;
  deps?: PipelineDependencies;
};

let injectedTestDeps: PipelineDependencies = {};

/** Test-only hook: integration tests replace transports with captured HTTP replays. */
export function setPipelineDeps(deps: PipelineDependencies = {}): void {
  injectedTestDeps = deps;
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, performance.now() - startedAt);
}

function isTimeoutAbort(signal: AbortSignal): boolean {
  return signal.reason instanceof DOMException && signal.reason.name === "TimeoutError";
}

function waitWithSignal<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function classifierAnswersForLog(classifier: ClassifierResult | null) {
  if (!classifier) return null;
  return Object.fromEntries(Object.entries(classifier.answers).map(([id, answer]) => {
    const raw = answer.raw;
    const confidence = raw && typeof raw === "object" && "confidence" in raw && typeof raw.confidence === "number"
      ? { confidence: raw.confidence }
      : {};
    return [id, { value: answer.value, certainty: answer.certainty, ...confidence }];
  }));
}

function fastOutcome(
  input: CaseInput,
  rule: RuleOutcome,
  classifier: ClassifierResult | null,
  caseId: string,
  facts: ReturnType<typeof computeFacts>,
): DecisionOutcome {
  const messageMarkdown = finalizeTemplate(renderFirstMessage(input, rule, classifier, caseId, facts));
  return {
    decision: rule.decision,
    citedSections: rule.citedSections,
    reasonCodes: rule.reasonCodes,
    path: "fast",
    messageMarkdown,
  };
}

export async function runCasePipeline(input: CaseInput, photo: Buffer, opts: RunCasePipelineOptions): Promise<void> {
  const startedAt = performance.now();
  const now = opts.deps?.now ?? injectedTestDeps.now ?? (() => new Date());
  const fetcher = opts.deps?.fetch ?? injectedTestDeps.fetch;
  const store = getCaseStore();
  const createdAt = now();
  const caseId = generateCaseId(createdAt, (candidate) => store.get(candidate) !== undefined);
  const env = getEnv();
  const facts = computeFacts(input, todayInWarsaw(createdAt));
  const latencyMs: Record<string, number> = {};
  let step: "upload" | "analysis" | "decision" = "upload";
  let classifier: ClassifierResult | null = null;
  let classifierError: "upstream" | "invalid_response" | null = null;
  let classifierModel: string | null = null;
  let visionModel: string | null = null;
  let decisionModel: string | null = null;
  let llmInconsistent = false;

  const logBase = () => ({
    ts: now().toISOString(),
    caseId,
    mode: env.DECISION_MODE,
    caseType: input.caseType,
    category: input.category,
    channel: input.channel,
    facts,
    models: { classifier: classifierModel, vision: visionModel, decision: decisionModel, chat: null },
    latencyMs: { total: elapsedSince(startedAt), ...latencyMs },
  });

  try {
    const imageStartedAt = performance.now();
    const image = await waitWithSignal(processImage(photo), opts.signal);
    latencyMs.image = elapsedSince(imageStartedAt);
    opts.emit({ type: "progress", step: "upload" });

    step = "analysis";
    classifierModel = env.JEV_MODEL;
    const classifierStartedAt = performance.now();
    try {
      classifier = await waitWithSignal(classify(input, image.jpegBuffer, opts.signal, {
        fetch: fetcher,
        apiKey: env.OPENROUTER_API_KEY,
        model: env.JEV_MODEL,
      }), opts.signal);
      classifierModel = classifier.model;
    } catch (error) {
      if (opts.signal.aborted) throw error;
      if (!(error instanceof ClassifierError)) throw error;
      if (env.DECISION_MODE === "fast-only") throw new PipelineFailure("upstream");
      if (error.kind !== "timeout") classifierError = error.kind === "invalid_response" ? "invalid_response" : "upstream";
      classifier = null;
    } finally {
      latencyMs.classifier = elapsedSince(classifierStartedAt);
    }

    const evaluated = evaluate(input, classifier, facts, {
      threshold: env.JEV_CONFIDENCE_THRESHOLD,
      mode: env.DECISION_MODE,
    });
    let outcome: DecisionOutcome;
    let imageAnalysis: Awaited<ReturnType<typeof analyzeImage>> | undefined;

    if (evaluated.route === "llm") {
      visionModel = env.VISION_MODEL;
      const visionStartedAt = performance.now();
      // A Jev outage still uses the vision model; an empty result means there are no Jev hints.
      const visionClassifier = classifier ?? { answers: {}, model: env.JEV_MODEL };
      const callVision = () => analyzeImage(input, image.jpegBuffer, visionClassifier, opts.signal, {
        fetch: fetcher,
        apiKey: env.OPENROUTER_API_KEY,
      });
      try {
        imageAnalysis = await callVision();
      } catch (error) {
        // E2E.1: structured vision output is intermittently invalid; one retry before failing the case.
        if (!(error instanceof LlmError) || error.kind !== "invalid_output" || opts.signal.aborted) throw error;
        imageAnalysis = await callVision();
      }
      latencyMs.vision = elapsedSince(visionStartedAt);
    }

    opts.emit({ type: "progress", step: "analysis" });
    step = "decision";
    if (evaluated.route === "fast" && evaluated.outcome) {
      outcome = fastOutcome(input, evaluated.outcome, classifier, caseId, facts);
    } else {
      if (!imageAnalysis) throw new Error("LLM route has no image analysis");
      decisionModel = env.LLM_MODEL;
      const decisionStartedAt = performance.now();
      const decisionResult = await decide(input, facts, imageAnalysis, classifier, caseId, opts.signal, {
        fetch: fetcher,
        apiKey: env.OPENROUTER_API_KEY,
      });
      latencyMs.decision = elapsedSince(decisionStartedAt);
      llmInconsistent = decisionResult.inconsistent;
      outcome = {
        ...decisionResult.outcome,
        messageMarkdown: finalizeFirstMessage(decisionResult.outcome.messageMarkdown),
      };
    }

    opts.emit({ type: "progress", step: "decision" });
    const firstMessage: Extract<CaseEvent, { type: "result" }>['firstMessage'] = {
      id: `${caseId}-initial`,
      role: "assistant",
      parts: [{ type: "text", text: outcome.messageMarkdown }],
      metadata: { decision: outcome.decision },
    };
    const record: CaseRecord = {
      caseId,
      createdAt: createdAt.toISOString(),
      input,
      classifier,
      ...(imageAnalysis ? { imageAnalysis } : {}),
      outcome,
      currentDecision: outcome.decision,
      firstMessage: firstMessage as CaseUIMessage,
      facts,
      revisions: [],
    };
    store.create(record);

    const logEntry = {
      ...logBase(),
      event: "case_decided",
      path: outcome.path,
      reasons: evaluated.reasons,
      gateFailedAt: evaluated.gateFailedAt,
      uncertainQuestions: evaluated.uncertainQuestions,
      minGatingCertainty: evaluated.minGatingCertainty,
      classifierAnswers: classifierAnswersForLog(classifier),
      classifierError,
      shadowFastPathDecision: evaluated.shadowOutcome?.decision ?? null,
      decision: outcome.decision,
      citedSections: outcome.citedSections,
      reasonCodes: outcome.reasonCodes,
      costUsd: {
        ...(classifier?.costUsd !== undefined ? { classifier: classifier.costUsd } : {}),
      },
    };
    await logDecision(logEntry);
    if (llmInconsistent) {
      // ADR-000 §5 allowlisted fields only; the case_decided entry above carries the same outcome.
      await logDecision({
        ...logBase(),
        event: "llm_inconsistent",
        path: outcome.path,
        decision: outcome.decision,
        citedSections: outcome.citedSections,
        reasonCodes: outcome.reasonCodes,
      });
    }
    const caseSummary: CaseSummary = {
      caseType: input.caseType,
      category: input.category,
      model: input.model,
      purchaseDate: input.purchaseDate,
      channel: input.channel,
    };
    opts.emit({
      type: "result",
      caseId,
      decision: outcome.decision,
      firstMessage,
      caseSummary,
    });
  } catch (error) {
    const failureCode = error instanceof PipelineFailure
      ? error.code
      : error instanceof LlmError && error.kind === "upstream"
        ? "upstream"
        : error instanceof LlmError && error.kind === "timeout"
          ? "timeout"
          : opts.signal.aborted && isTimeoutAbort(opts.signal)
            ? "timeout"
            : error instanceof ClassifierError && error.kind === "upstream"
              ? "upstream"
              : "internal";

    if (opts.signal.aborted && !isTimeoutAbort(opts.signal)) {
      await logDecision({ ...logBase(), event: "case_aborted" });
      return;
    }

    if (failureCode === "internal") {
      const errorClass = error instanceof Error ? error.constructor.name : typeof error;
      const kind = (error as { kind?: unknown } | null)?.kind;
      console.error("case_failed internal", errorClass, error instanceof Error ? error.name : "", kind ?? "", step);
    }
    await logDecision({ ...logBase(), event: "case_failed", step, failureCode, classifierError });
    opts.emit({ type: "error", code: failureCode });
  }
}

class PipelineFailure extends Error {
  constructor(readonly code: "upstream") {
    super(code);
  }
}
