import { RETRY_BACKOFF_MS } from '../../shared/constants.js';

export function getBackoffMs(attempt: number): number {
  return RETRY_BACKOFF_MS[Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1)];
}

export function shouldRetry(httpCode: number): boolean {
  return httpCode === 429 || httpCode >= 500;
}
