import { getBackoffMs, shouldRetry } from './retry-policy.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  run: () => Promise<T>,
  options: {
    maxAttempts: number;
    isRetriableError?: (error: unknown) => boolean;
  }
): Promise<T> {
  const { maxAttempts, isRetriableError } = options;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const retriable = isRetriableError ? isRetriableError(error) : true;
      if (!retriable || attempt >= maxAttempts) {
        throw error;
      }
      await sleep(getBackoffMs(attempt));
    }
  }

  throw lastError;
}

export function retriableByHttpCode(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const match = error.message.match(/HTTP_(\d{3})/);
  if (!match) return true;
  return shouldRetry(Number(match[1]));
}
