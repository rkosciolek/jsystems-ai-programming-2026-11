import 'server-only';

import { generateText, Output, type LanguageModel } from 'ai';
import type { CaseInput, DateFacts, DecisionOutcome, ImageAnalysis } from '@/lib/domain';
import { CATEGORIES, DecisionOutcomeSchema } from '@/lib/domain';
import { getEnv } from '@/server/env';
import { getPolicy } from '@/server/policies';
import { getPrompt } from '@/server/prompts';
import { checkLlmOutcome, type ClassifierResult } from '@/server/rules';
import { normalizeCitedSections } from './citations';
import { finalizeFirstMessage as finalizeTemplate, renderFirstMessage, validateFirstMessage } from '@/server/templates';
import type { LlmCallDependencies } from './analyze-image';
import { getOpenRouter } from './provider';
import { toLlmError } from './errors';

function formJson(input: CaseInput) {
  return {
    caseType: input.caseType,
    category: CATEGORIES.find((category) => category.id === input.category)?.label ?? input.category,
    model: input.model,
    purchaseDate: input.purchaseDate,
    channel: input.channel,
    description: input.description,
  };
}

function classifierHints(classifier: ClassifierResult | null) {
  return Object.fromEntries(
    Object.entries(classifier?.answers ?? {}).map(([id, answer]) => [id, { value: answer.value, certainty: answer.certainty }]),
  );
}

export function buildDecisionUserPrompt(
  input: CaseInput,
  facts: DateFacts,
  analysis: ImageAnalysis,
  classifier: ClassifierResult | null,
  caseId: string,
): string {
  return [
    `Numer sprawy: ${caseId}`,
    `Dane z formularza (JSON):\n${JSON.stringify(formJson(input))}`,
    `DateFacts (JSON):\n${JSON.stringify(facts)}`,
    `ImageAnalysis (JSON):\n${JSON.stringify(analysis)}`,
    `Odpowiedzi klasyfikatora Jev z pewnością (JSON):\n${JSON.stringify(classifierHints(classifier))}`,
  ].join('\n\n');
}

function outcomeViolations(
  input: CaseInput,
  facts: DateFacts,
  analysis: ImageAnalysis,
  classifier: ClassifierResult | null,
  outcome: DecisionOutcome,
): string[] {
  const ruleCheck = checkLlmOutcome(input, facts, classifier, outcome, analysis);
  const messageCheck = validateFirstMessage(outcome.messageMarkdown, outcome.citedSections);
  return [
    ...(ruleCheck.ok ? [] : ruleCheck.violations),
    ...(messageCheck.ok ? [] : messageCheck.problems),
  ];
}

function inconsistentOutcome(
  input: CaseInput,
  facts: DateFacts,
  classifier: ClassifierResult | null,
  caseId: string,
): DecisionOutcome {
  const citedSections = ['§7'];
  const reasonCodes = ['llm_inconsistent'];
  const messageMarkdown = renderFirstMessage(
    input,
    { decision: 'escalated', citedSections, reasonCodes, templateKey: 'llm_inconsistent' },
    classifier,
    caseId,
    facts,
  );
  return { decision: 'escalated', citedSections, reasonCodes, path: 'llm', messageMarkdown };
}

async function generateDecision(
  caseType: CaseInput['caseType'],
  signal: AbortSignal,
  model: LanguageModel,
  userPrompt: string,
): Promise<DecisionOutcome> {
  const env = getEnv();
  const promptName = caseType === 'complaint' ? 'decision-complaint' : 'decision-return';
  const system = `${getPrompt(promptName)}\n\n<policy>\n${getPolicy(caseType)}\n</policy>`;
  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: DecisionOutcomeSchema }),
      system,
      messages: [{ role: 'user', content: userPrompt }],
      providerOptions: { openrouter: { reasoning: { effort: env.LLM_REASONING_EFFORT } } },
      maxRetries: 1,
      abortSignal: signal,
    });
    return { ...result.output, citedSections: normalizeCitedSections(result.output.citedSections), path: 'llm' };
  } catch (error) {
    throw toLlmError(error, signal);
  }
}

export async function decide(
  input: CaseInput,
  facts: DateFacts,
  analysis: ImageAnalysis,
  classifier: ClassifierResult | null,
  caseId: string,
  signal: AbortSignal,
  deps: LlmCallDependencies = {},
): Promise<{ outcome: DecisionOutcome; inconsistent: boolean }> {
  const env = getEnv();
  const model = deps.model ?? getOpenRouter(deps).chat(env.LLM_MODEL);
  const originalPrompt = buildDecisionUserPrompt(input, facts, analysis, classifier, caseId);

  let outcome = await generateDecision(input.caseType, signal, model, originalPrompt);
  const violations = outcomeViolations(input, facts, analysis, classifier, outcome);
  if (violations.length === 0) return { outcome, inconsistent: false };

  const retryPrompt = `${originalPrompt}\n\nThe previous output violated these rules. Correct every listed violation:\n${violations.map((item) => `- ${item}`).join('\n')}`;
  outcome = await generateDecision(input.caseType, signal, model, retryPrompt);
  if (outcomeViolations(input, facts, analysis, classifier, outcome).length === 0) {
    return { outcome, inconsistent: false };
  }

  return { outcome: inconsistentOutcome(input, facts, classifier, caseId), inconsistent: true };
}

export function finalizeFirstMessage(markdown: string): string {
  return finalizeTemplate(markdown);
}
