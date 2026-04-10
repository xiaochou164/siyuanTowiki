import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryLogRepository } from '../dist/infra/storage/log-repo.js';
import { ExportPushLogsUseCase } from '../dist/app/usecases/export-push-logs.js';

test('export logs supports csv and json', async () => {
  const repo = new InMemoryLogRepository();
  await repo.append({
    id: '1',
    traceId: 't-1',
    siyuanDocId: 'doc-1',
    actionType: 'create',
    success: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  });

  const useCase = new ExportPushLogsUseCase(repo);
  const csv = await useCase.execute(10, 'csv');
  const json = await useCase.execute(10, 'json');

  assert.match(csv, /traceId/);
  assert.match(csv, /doc-1/);
  assert.match(json, /"traceId": "t-1"/);
});
