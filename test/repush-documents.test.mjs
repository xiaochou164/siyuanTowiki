import test from 'node:test';
import assert from 'node:assert/strict';
import { ConcurrentTaskQueue } from '../dist/infra/queue/task-queue.js';
import { BatchPushUseCase } from '../dist/app/usecases/batch-push.js';
import { RepushDocumentsUseCase } from '../dist/app/usecases/repush-documents.js';

test('repush documents supports single and batch execution', async () => {
  const calls = [];
  const pushDocument = {
    async execute(input) {
      calls.push(input.siyuanDocId);
      if (input.siyuanDocId === 'doc-skip') return 'skipped';
      return 'success';
    }
  };

  const batchPush = new BatchPushUseCase(new ConcurrentTaskQueue(1), pushDocument);
  const useCase = new RepushDocumentsUseCase(pushDocument, batchPush);

  const single = await useCase.executeOne({
    traceId: 'trace-1',
    siyuanDocId: 'doc-1',
    title: 'a',
    content: 'a'
  });

  const batch = await useCase.executeBatch([
    { traceId: 'trace-2', siyuanDocId: 'doc-2', title: 'b', content: 'b' },
    { traceId: 'trace-2', siyuanDocId: 'doc-skip', title: 'c', content: 'c' }
  ]);

  assert.equal(single, 'success');
  assert.deepEqual(calls, ['doc-1', 'doc-2', 'doc-skip']);
  assert.equal(batch.total, 2);
  assert.equal(batch.success, 1);
  assert.equal(batch.skipped, 1);
  assert.deepEqual(batch.successDocIds, ['doc-2']);
  assert.deepEqual(batch.skippedDocIds, ['doc-skip']);
});
