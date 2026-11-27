import 'server-only';

import { NoObjectGeneratedError } from 'ai';

export type LlmErrorKind = 'upstream' | 'timeout' | 'invalid_output';

export class LlmError extends Error {
  constructor(readonly kind: LlmErrorKind, message = 'Nie udało się przeanalizować zgłoszenia.') {
    super(message);
    this.name = 'LlmError';
  }
}

export function toLlmError(error: unknown, signal?: AbortSignal): LlmError {
  if (signal?.aborted) return new LlmError('timeout', 'Przekroczono czas analizy zgłoszenia.');
  if (error instanceof LlmError) return error;
  if (NoObjectGeneratedError.isInstance(error)) return new LlmError('invalid_output');
  return new LlmError('upstream');
}
