import 'server-only';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { LlmError } from './errors';
import { getEnv } from '@/server/env';

export type OpenRouterDependencies = {
  fetch?: typeof fetch;
  apiKey?: string;
};

function checkedFetch(fetcher: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await fetcher(input, init);
    if (response.ok) {
      try {
        const body = (await response.clone().json()) as { error?: unknown };
        if (body.error !== null && typeof body.error === 'object') {
          throw new LlmError('upstream', 'OpenRouter returned an error object.');
        }
      } catch (error) {
        if (error instanceof LlmError) throw error;
      }
    }
    return response;
  };
}

export function getOpenRouter(deps: OpenRouterDependencies = {}) {
  return createOpenRouter({
    apiKey: deps.apiKey ?? getEnv().OPENROUTER_API_KEY,
    fetch: checkedFetch(deps.fetch ?? fetch),
  });
}
