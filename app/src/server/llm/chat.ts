import "server-only";

import {
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  isStepCount,
  streamText,
  tool,
  type InferUIMessageChunk,
} from "ai";
import type { CaseInput, CaseUIMessage, Decision, ReviseDecisionInput } from "@/lib/domain";
import { makeReviseDecisionInputSchema } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";
import { getCaseStore, type CaseRecord } from "@/server/case-store";
import { logDecision } from "@/server/decision-log";
import { getEnv } from "@/server/env";
import { getPolicy } from "@/server/policies";
import { getPrompt } from "@/server/prompts";
import { checkLlmOutcome, computeFacts, type ClassifierResult } from "@/server/rules";
import { todayInWarsaw } from "@/lib/domain";
import { LlmError } from "./errors";
import { getOpenRouter, type OpenRouterDependencies } from "./provider";

export type ChatStreamDependencies = OpenRouterDependencies;

let injectedTestDeps: ChatStreamDependencies = {};

/** Test-only injection used by the in-process route integration tests. */
export function setChatStreamDeps(deps: ChatStreamDependencies = {}): void {
  injectedTestDeps = deps;
}

export function buildChatSystem(record: CaseRecord): string {
  const caseContext = {
    caseId: record.caseId,
    input: record.input,
    facts: record.facts,
    classifier: record.classifier,
    imageAnalysis: record.imageAnalysis ?? null,
    currentDecision: record.currentDecision,
    revisions: record.revisions,
  };

  return [
    getPrompt("chat"),
    `<policy>\n${getPolicy(record.input.caseType)}\n</policy>`,
    `<case>\n${JSON.stringify(caseContext)}\n</case>`,
  ].join("\n\n");
}

function errorFailureCode(error: unknown, signal: AbortSignal): "timeout" | "upstream" | "internal" {
  if (signal.aborted && signal.reason instanceof DOMException && signal.reason.name === "TimeoutError") {
    return "timeout";
  }
  if (error instanceof LlmError) {
    return error.kind === "timeout" ? "timeout" : error.kind === "upstream" ? "upstream" : "internal";
  }
  if (APICallError.isInstance(error) || error instanceof TypeError) return "upstream";
  return "internal";
}

function nowIso(): string {
  return new Date().toISOString();
}

function logBase(record: CaseRecord, startedAt: number) {
  const env = getEnv();
  return {
    ts: nowIso(),
    caseId: record.caseId,
    mode: env.DECISION_MODE,
    caseType: record.input.caseType,
    category: record.input.category,
    channel: record.input.channel,
    facts: record.facts,
    models: {
      classifier: typeof record.classifier === "object" && record.classifier && "model" in record.classifier
        ? String((record.classifier as { model: unknown }).model)
        : null,
      vision: null,
      decision: null,
      chat: env.LLM_MODEL,
    },
    latencyMs: { total: Math.max(0, performance.now() - startedAt), chat: Math.max(0, performance.now() - startedAt) },
  };
}

export async function chatStream(
  record: CaseRecord,
  messages: CaseUIMessage[],
  signal: AbortSignal,
  deps: ChatStreamDependencies = injectedTestDeps,
): Promise<ReadableStream<InferUIMessageChunk<CaseUIMessage>>> {
  const env = getEnv();
  const store = getCaseStore();
  const startedAt = performance.now();
  const prompt = buildChatSystem(record);
  const date = todayInWarsaw();
  const inputSchema = makeReviseDecisionInputSchema(date);
  const pendingLogs: Promise<void>[] = [];
  let sawTextBeforeToolCall = false;
  let revisionToolInvoked = false;
  let appliedRevision: { decision: Decision; previous: Decision; reason: string } | undefined;
  let chatFailureLogged = false;

  const queueLog = (entry: Record<string, unknown>) => {
    pendingLogs.push(logDecision({ ...logBase(record, startedAt), ...entry }));
  };

  const stream = createUIMessageStream<CaseUIMessage>({
    originalMessages: messages,
    onError(error) {
      if (!chatFailureLogged) {
        chatFailureLogged = true;
        const failureCode = errorFailureCode(error, signal);
        const detail = error instanceof Error ? error.stack ?? error.message : String(error);
        process.stderr.write(`chat: ${detail}\n`);
        queueLog({ event: "chat_failed", failureCode, step: "chat" });
      }
      return pl.errors.chatSend;
    },
    async onEnd() {
      await Promise.all(pendingLogs);
    },
    async execute({ writer }) {
      writer.write({ type: "start", messageMetadata: { decision: record.currentDecision } });

      const classifier = (record.classifier ?? null) as ClassifierResult | null;
      const model = getOpenRouter(deps).chat(env.LLM_MODEL);
      const result = streamText({
        model,
        system: prompt,
        messages: await convertToModelMessages(messages),
        providerOptions: { openrouter: { reasoning: { effort: env.LLM_REASONING_EFFORT } } },
        abortSignal: signal,
        stopWhen: isStepCount(2),
        onChunk({ chunk }) {
          if (chunk.type === "text-delta") sawTextBeforeToolCall = true;
        },
        tools: {
          revise_decision: tool({
            description: "Revise the preliminary decision when the customer states a new fact.",
            inputSchema,
            execute: async (toolInput: ReviseDecisionInput) => {
              if (revisionToolInvoked) {
                const current = store.get(record.caseId);
                if (current) {
                  queueLog({
                    event: "revision_rejected",
                    decision: toolInput.newDecision,
                    previousDecision: current.currentDecision,
                    facts: current.facts,
                  });
                }
                return { applied: false, violation: "revision_already_attempted" };
              }
              revisionToolInvoked = true;
              const current = store.get(record.caseId);
              if (!current) return { applied: false, violation: "case_not_found" };

              if (sawTextBeforeToolCall) {
                queueLog({ event: "revision_order_violation" });
                return { applied: false, violation: "revision_order_violation" };
              }

              const correctionEntries = Object.entries(toolInput.corrections ?? {});
              const correctedInput: CaseInput = { ...current.input, ...(toolInput.corrections ?? {}) };
              const correctedFacts = computeFacts(correctedInput, date);
              const check = checkLlmOutcome(
                correctedInput,
                correctedFacts,
                classifier,
                { decision: toolInput.newDecision, citedSections: current.outcome.citedSections },
                (current.imageAnalysis ?? null) as Parameters<typeof checkLlmOutcome>[4],
                env.JEV_CONFIDENCE_THRESHOLD,
              );
              const noChange = toolInput.newDecision === current.currentDecision && correctionEntries.length === 0;

              if (!check.ok || noChange) {
                queueLog({
                  event: "revision_rejected",
                  channel: correctedInput.channel,
                  decision: toolInput.newDecision,
                  previousDecision: current.currentDecision,
                  corrections: toolInput.corrections,
                  facts: correctedFacts,
                });
                return { applied: false, ...(!check.ok ? { violation: check.violations } : {}) };
              }

              const previous = current.currentDecision;
              const updated = store.update(record.caseId, (latest) => ({
                ...latest,
                input: correctedInput,
                facts: correctedFacts,
                currentDecision: toolInput.newDecision,
                outcome: { ...latest.outcome, decision: toolInput.newDecision },
                revisions: [
                  ...latest.revisions,
                  {
                    from: previous,
                    to: toolInput.newDecision,
                    reason: toolInput.reason,
                    ...(toolInput.corrections ? { corrections: toolInput.corrections } : {}),
                    at: nowIso(),
                  },
                ],
              }));
              if (!updated) return { applied: false, violation: "case_not_found" };

              appliedRevision = { decision: toolInput.newDecision, previous, reason: toolInput.reason };
              writer.write({
                type: "data-decision",
                data: { decision: toolInput.newDecision, previous, reason: toolInput.reason },
              });
              queueLog({
                event: "decision_revised",
                channel: correctedInput.channel,
                decision: toolInput.newDecision,
                previousDecision: previous,
                corrections: toolInput.corrections,
                facts: correctedFacts,
                citedSections: updated.outcome.citedSections,
                reasonCodes: updated.outcome.reasonCodes,
              });
              return { applied: true, previous };
            },
          }),
        },
      });

      const child = result.toUIMessageStream<CaseUIMessage>({
        sendStart: false,
        sendFinish: false,
        sendReasoning: false,
        onError(error) {
          if (!chatFailureLogged) {
            chatFailureLogged = true;
            const failureCode = errorFailureCode(error, signal);
            const detail = error instanceof Error ? error.stack ?? error.message : String(error);
            process.stderr.write(`chat: ${detail}\n`);
            queueLog({ event: "chat_failed", failureCode, step: "chat" });
          }
          return pl.errors.chatSend;
        },
      });

      let resolveMerged!: () => void;
      const merged = new Promise<void>((resolve) => { resolveMerged = resolve; });
      const withDisclaimer = new ReadableStream<InferUIMessageChunk<CaseUIMessage>>({
        async start(controller) {
          const reader = child.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            if (appliedRevision) {
              const id = `${record.caseId}-revision-disclaimer`;
              controller.enqueue({ type: "text-start", id });
              controller.enqueue({ type: "text-delta", id, delta: `\n\n${pl.disclaimer}` });
              controller.enqueue({ type: "text-end", id });
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
            resolveMerged();
          }
        },
      });
      writer.merge(withDisclaimer);
      await merged;

      const current = store.get(record.caseId);
      writer.write({ type: "finish", messageMetadata: { decision: current?.currentDecision ?? record.currentDecision } });
    },
  });

  return stream;
}
