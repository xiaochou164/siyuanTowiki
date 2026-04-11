import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryLogRepository } from '../dist/infra/storage/log-repo.js';
import { GetTraceLogsUseCase } from '../dist/app/usecases/get-trace-logs.js';

test('get trace logs returns one trace in chronological order', async () => {
  const repo = new InMemoryLogRepository();
  await repo.append({
    id: '2',
    traceId: 'trace-1',
    siyuanDocId: 'doc-1',
    actionType: 'update',
    success: true,
    createdAt: '2026-04-10T10:00:02.000Z'
  });
  await repo.append({
    id: '1',
    traceId: 'trace-1',
    siyuanDocId: 'doc-1',
    actionType: 'create',
    success: true,
    createdAt: '2026-04-10T10:00:01.000Z'
  });
  await repo.append({
    id: '3',
    traceId: 'trace-2',
    siyuanDocId: 'doc-2',
    actionType: 'delete',
    success: true,
    createdAt: '2026-04-10T10:00:03.000Z'
  });

  const useCase = new GetTraceLogsUseCase(repo);
  const logs = await useCase.execute('trace-1');

  assert.equal(logs.length, 2);
  assert.deepEqual(
    logs.map((item) => item.id),
    ['1', '2']
  );
});

test('get trace logs returns empty list for unknown trace id', async () => {
  const repo = new InMemoryLogRepository();
  const useCase = new GetTraceLogsUseCase(repo);
  const logs = await useCase.execute('missing-trace');

  assert.deepEqual(logs, []);
});
