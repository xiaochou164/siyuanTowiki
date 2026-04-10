import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, assertTransition } from '../dist/domain/services/state-machine.js';

test('state machine allows active -> paused', () => {
  assert.equal(canTransition('active', 'paused'), true);
});

test('state machine rejects paused -> paused', () => {
  assert.equal(canTransition('paused', 'paused'), false);
  assert.throws(() => assertTransition('paused', 'paused'));
});
