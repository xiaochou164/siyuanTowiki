import test from 'node:test';
import assert from 'node:assert/strict';
import { ConcurrentTaskQueue } from '../dist/infra/queue/task-queue.js';
import { BatchPushUseCase } from '../dist/app/usecases/batch-push.js';
import { RetryFailedPushUseCase } from '../dist/app/usecases/retry-failed-push.js';

test('retry failed push only retries failed doc ids', async () => {
  const queue = new ConcurrentTaskQueue(1);
  const pushDocument = {
    async execute(input) {
      if (input.siyuanDocId === 'doc-fail') return 'failed';
      return 'success';
    }
  };

  const batchPush = new BatchPushUseCase(queue, pushDocument);
  const retryUseCase = new RetryFailedPushUseCase(batchPush);

  const allInputs = [
    { traceId: 't1', siyuanDocId: 'doc-ok', title: 'a', content: 'a' },
    { traceId: 't1', siyuanDocId: 'doc-fail', title: 'b', content: 'b' }
  ];

  const first = await batchPush.execute(allInputs);
  assert.deepEqual(first.failedDocIds, ['doc-fail']);

  const retried = await retryUseCase.execute(first, allInputs);
  assert.equal(retried.total, 1);
  assert.deepEqual(retried.failedDocIds, ['doc-fail']);
});
