import 'server-only';

import { generateText, Output, type LanguageModel } from 'ai';
import type { CaseInput, ImageAnalysis } from '@/lib/domain';
import { CATEGORIES, ImageAnalysisSchema } from '@/lib/domain';
import type { ClassifierResult } from '@/server/rules';
import { getEnv } from '@/server/env';
import { getPrompt } from '@/server/prompts';
import { getOpenRouter, type OpenRouterDependencies } from './provider';
import { toLlmError } from './errors';

export type LlmCallDependencies = OpenRouterDependencies & {
  /** A recording-backed AI SDK model for unit tests. */
  model?: LanguageModel;
};

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

function classifierHints(classifier: ClassifierResult) {
  return Object.fromEntries(
    Object.entries(classifier.answers).map(([id, answer]) => [id, { value: answer.value, certainty: answer.certainty }]),
  );
}

export function buildVisionHints(input: CaseInput, classifier: ClassifierResult): string {
  return [
    `Dane z formularza (unverified hints, sprawdź ze zdjęciem):\n${JSON.stringify(formJson(input))}`,
    `Odpowiedzi klasyfikatora Jev (unverified hints):\n${JSON.stringify(classifierHints(classifier))}`,
  ].join('\n\n');
}

export async function analyzeImage(
  input: CaseInput,
  jpeg: Buffer,
  classifier: ClassifierResult,
  signal: AbortSignal,
  deps: LlmCallDependencies = {},
): Promise<ImageAnalysis> {
  const env = getEnv();
  const promptName = input.caseType === 'complaint' ? 'vision-complaint' : 'vision-return';
  const model = deps.model ?? getOpenRouter(deps).chat(env.VISION_MODEL, { structuredOutputs: { strict: false } });

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: ImageAnalysisSchema }),
      system: getPrompt(promptName),
      messages: [{
        role: 'user',
        content: [
          { type: 'file', data: jpeg, mediaType: 'image/jpeg' },
          { type: 'text', text: buildVisionHints(input, classifier) },
        ],
      }],
      temperature: 0,
      maxRetries: 1,
      abortSignal: signal,
    });
    return result.output;
  } catch (error) {
    throw toLlmError(error, signal);
  }
}
