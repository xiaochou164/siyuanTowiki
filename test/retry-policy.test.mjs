import test from 'node:test';
import assert from 'node:assert/strict';
import { getBackoffMs, shouldRetry } from '../dist/domain/services/retry-policy.js';

test('retry policy returns exponential backoff slots', () => {
  assert.equal(getBackoffMs(1), 1000);
  assert.equal(getBackoffMs(2), 2000);
  assert.equal(getBackoffMs(3), 4000);
});

test('retry policy retries 429 and 5xx only', () => {
  assert.equal(shouldRetry(429), true);
  assert.equal(shouldRetry(503), true);
  assert.equal(shouldRetry(404), false);
});
