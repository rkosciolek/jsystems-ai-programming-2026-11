import "server-only";

import {
  APICallError,
  NoSuchToolError,
  convertToModelMessages,
  createUIMessageStream,
  isStepCount,
  streamText,
  tool,
  type InferUIMessageChunk,
} from "ai";
import type { CaseInput, CaseUIMessage, Decision, ImageAnalysis, ReviseDecisionInput } from "@/lib/domain";
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

function revisionFallbackText(revision: { decision: Decision; previous: Decision; reason: string }): string {
  const { revisedAssessment, revision: texts } = pl.chat;
  return [
    `**${revisedAssessment}**`,
    `${texts.previous}: ${pl.decisions[revision.previous]}. ${texts.next}: ${pl.decisions[revision.decision]}.`,
    `${texts.reason}: ${revision.reason}`,
    texts.nextSteps[revision.decision],
  ].join("\n\n");
}

/** Server-built opening of a revision reply (AC-36): label plus previous and new decision. */
function revisionHeaderText(revision: { decision: Decision; previous: Decision }): string {
  const { revisedAssessment, revision: texts } = pl.chat;
  return [
    `**${revisedAssessment}**`,
    `${texts.previous}: ${pl.decisions[revision.previous]}. ${texts.next}: ${pl.decisions[revision.decision]}.`,
  ].join("\n\n");
}

/** True when the model text already opens with the label and names both decisions. */
function modelTextStatesRevision(text: string, revision: { decision: Decision; previous: Decision }): boolean {
  return (
    text.trimStart().startsWith(`**${pl.chat.revisedAssessment}**`) &&
    text.includes(pl.decisions[revision.previous]) &&
    text.includes(pl.decisions[revision.decision])
  );
}

const HEADER_DECISION_WINDOW_CHARS = 400;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
  let textAfterRevision = false;
  let turnText = "";
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
        // Two steps: tool call, then text. After the tool has run once in this turn (applied or not)
        // the model may not call it again: later steps get no tools (Q4.2).
        stopWhen: isStepCount(2),
        prepareStep: () => (revisionToolInvoked ? { activeTools: [] } : {}),
        onChunk({ chunk }) {
          if (chunk.type === "text-delta") turnText += chunk.text;
          if (chunk.type === "text-delta" && chunk.text.trim().length > 0) {
            sawTextBeforeToolCall = true;
            if (appliedRevision) textAfterRevision = true;
          }
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
              // Orchestrator decision (policy §7): without a corrected purchase date or channel the customer
              // only states unverifiable circumstances, which go to a specialist, never to acceptance.
              if (toolInput.newDecision === "accepted" && correctionEntries.length === 0) {
                queueLog({
                  event: "revision_rejected",
                  decision: toolInput.newDecision,
                  previousDecision: current.currentDecision,
                  facts: current.facts,
                });
                return { applied: false, violation: "accepted_requires_corrections" };
              }

              const correctedInput: CaseInput = { ...current.input, ...(toolInput.corrections ?? {}) };
              const correctedFacts = computeFacts(correctedInput, date);
              const check = checkLlmOutcome(
                correctedInput,
                correctedFacts,
                classifier,
                { decision: toolInput.newDecision, citedSections: current.outcome.citedSections },
                (current.imageAnalysis ?? null) as ImageAnalysis | null,
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
              const decisionChanged = toolInput.newDecision !== previous;
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
              const appliedCorrections = correctionEntries.length > 0 ? toolInput.corrections : undefined;
              writer.write({
                type: "data-decision",
                data: {
                  decision: toolInput.newDecision,
                  previous,
                  decisionChanged,
                  reason: toolInput.reason,
                  ...(appliedCorrections ? { corrections: appliedCorrections } : {}),
                },
              });
              queueLog({
                event: "decision_revised",
                channel: correctedInput.channel,
                decision: toolInput.newDecision,
                previousDecision: previous,
                corrections: toolInput.corrections,
                facts: correctedFacts,
                // The stored citations and reason codes describe the earlier decision, not this one.
                reasonCodes: ["chat_revision"],
              });
              return decisionChanged
                ? { applied: true, decisionChanged: true, previous }
                : {
                    applied: true,
                    decisionChanged: false,
                    previous,
                    note: "Facts corrected; the decision is unchanged. Do not write 'Zmieniona ocena'; explain that the correction was noted and why the decision stays.",
                  };
            },
          }),
        },
      });

      const child = result.toUIMessageStream<CaseUIMessage>({
        sendStart: false,
        sendFinish: false,
        sendReasoning: false,
        onError(error) {
          // A repeated revise_decision call after the tool was withdrawn is not a chat failure (Q4.2).
          if (revisionToolInvoked && NoSuchToolError.isInstance(error)) return pl.errors.chatSend;
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
      const withoutRepeatedToolCalls = new ReadableStream<InferUIMessageChunk<CaseUIMessage>>({
        async start(controller) {
          const reader = child.getReader();
          let finishedSteps = 0;
          // AC-36: after an applied revision the reply must open with the label and the previous and new
          // decision. Model text is held until it is known to do so; otherwise a server header goes first.
          let held: InferUIMessageChunk<CaseUIMessage>[] = [];
          let heldText = "";
          let headerResolved = false;
          const flushHeld = (withHeader: boolean) => {
            headerResolved = true;
            if (withHeader && appliedRevision && appliedRevision.decision !== appliedRevision.previous) {
              const id = `${record.caseId}-revision-header`;
              controller.enqueue({ type: "text-start", id });
              controller.enqueue({ type: "text-delta", id, delta: revisionHeaderText(appliedRevision) });
              controller.enqueue({ type: "text-end", id });
            }
            for (const chunk of held) controller.enqueue(chunk);
            held = [];
          };
          const resolveHeld = () => {
            if (headerResolved || held.length === 0) return;
            // Whitespace-only text counts as no text: the code-built fallback follows after the merge.
            flushHeld(heldText.trim().length > 0);
          };
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value.type === "finish-step") finishedSteps += 1;
              // Q4.2: drop a repeated revise_decision call from later steps; the tool already ran once.
              if (finishedSteps > 0 && revisionToolInvoked && value.type.startsWith("tool-input")) continue;
              const isText = value.type === "text-start" || value.type === "text-delta" || value.type === "text-end";
              if (appliedRevision && appliedRevision.decision !== appliedRevision.previous && !headerResolved && isText) {
                held.push(value);
                if (value.type === "text-delta") {
                  heldText += value.delta;
                  if (modelTextStatesRevision(heldText, appliedRevision)) flushHeld(false);
                  else if (heldText.length >= HEADER_DECISION_WINDOW_CHARS) flushHeld(true);
                }
                continue;
              }
              if (!isText) resolveHeld();
              controller.enqueue(value);
            }
            resolveHeld();
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
            resolveMerged();
          }
        },
      });
      writer.merge(withoutRepeatedToolCalls);
      await merged;

      if (appliedRevision && appliedRevision.decision !== appliedRevision.previous) {
        if (!textAfterRevision) {
          const fallbackId = `${record.caseId}-revision-fallback`;
          writer.write({ type: "text-start", id: fallbackId });
          writer.write({ type: "text-delta", id: fallbackId, delta: revisionFallbackText(appliedRevision) });
          writer.write({ type: "text-end", id: fallbackId });
        }
        if (!normalizeWhitespace(turnText).includes(normalizeWhitespace(pl.disclaimer))) {
          const id = `${record.caseId}-revision-disclaimer`;
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: `\n\n${pl.disclaimer}` });
          writer.write({ type: "text-end", id });
        }
      }

      const current = store.get(record.caseId);
      writer.write({ type: "finish", messageMetadata: { decision: current?.currentDecision ?? record.currentDecision } });
    },
  });

  return stream;
}
