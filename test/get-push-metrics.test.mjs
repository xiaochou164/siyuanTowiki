import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryLogRepository } from '../dist/infra/storage/log-repo.js';
import { GetPushMetricsUseCase } from '../dist/app/usecases/get-push-metrics.js';

test('get push metrics aggregates totals and success rate', async () => {
  const repo = new InMemoryLogRepository();
  await repo.append({
    id: '1',
    traceId: 't1',
    siyuanDocId: 'doc-1',
    actionType: 'create',
    success: true,
    httpCode: 201,
    createdAt: '2026-01-01'
  });
  await repo.append({
    id: '2',
    traceId: 't2',
    siyuanDocId: 'doc-2',
    actionType: 'update',
    success: false,
    httpCode: 429,
    errorCode: 'PUSH_FAILED',
    createdAt: '2026-01-01'
  });
  await repo.append({
    id: '3',
    traceId: 't3',
    siyuanDocId: 'doc-3',
    actionType: 'delete',
    success: false,
    httpCode: 403,
    errorCode: 'HTTP_403',
    createdAt: '2026-01-01'
  });

  const useCase = new GetPushMetricsUseCase(repo);
  const metrics = await useCase.execute();

  assert.equal(metrics.total, 3);
  assert.equal(metrics.success, 1);
  assert.equal(metrics.failed, 2);
  assert.equal(metrics.successRate, 33.33);
  assert.equal(metrics.byAction.create, 1);
  assert.equal(metrics.byAction.update, 1);
  assert.equal(metrics.byAction.delete, 1);
  assert.equal(metrics.byErrorCode.PUSH_FAILED, 1);
  assert.equal(metrics.byErrorCode.HTTP_403, 1);
  assert.equal(metrics.byHttpCode['201'], 1);
  assert.equal(metrics.byHttpCode['429'], 1);
  assert.equal(metrics.byHttpCode['403'], 1);
});
