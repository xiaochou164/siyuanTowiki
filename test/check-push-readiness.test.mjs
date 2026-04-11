import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMappingRepository } from '../dist/infra/storage/mapping-repo.js';
import { InMemoryConfigRepository } from '../dist/infra/storage/config-repo.js';
import { CheckPushReadinessUseCase } from '../dist/app/usecases/check-push-readiness.js';

async function createConfig(dryRunEnabled) {
  const repo = new InMemoryConfigRepository();
  await repo.save({
    baseUrl: 'https://wiki.local/api/v1',
    apiKeyEncrypted: 'sealed',
    defaultVisibility: 'public',
    contentOnlyUpdateEnabled: false,
    concurrency: 1,
    retryTimes: 3,
    deleteConfirmEnabled: true,
    dryRunEnabled
  });
  return repo;
}

test('check push readiness reports create/update/skip reasons', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const configRepo = await createConfig(true);
  await mappingRepo.upsert({ siyuanDocId: 'doc-update', wikiSlug: 'slug-1', syncStatus: 'active' });
  await mappingRepo.upsert({ siyuanDocId: 'doc-paused', wikiSlug: 'slug-2', syncStatus: 'paused' });

  const useCase = new CheckPushReadinessUseCase(mappingRepo, configRepo);

  const createResult = await useCase.execute({
    traceId: 'trace-1',
    siyuanDocId: 'doc-create',
    title: 'Hello',
    content: 'World'
  });
  const updateResult = await useCase.execute({
    traceId: 'trace-1',
    siyuanDocId: 'doc-update',
    title: 'Hello',
    content: 'World'
  });
  const pausedResult = await useCase.execute({
    traceId: 'trace-1',
    siyuanDocId: 'doc-paused',
    title: 'Hello',
    content: 'World'
  });

  assert.equal(createResult.action, 'create');
  assert.equal(createResult.ready, true);
  assert.equal(createResult.dryRun, true);

  assert.equal(updateResult.action, 'update');
  assert.equal(updateResult.ready, true);
  assert.equal(updateResult.wikiSlug, 'slug-1');

  assert.equal(pausedResult.action, 'skip');
  assert.equal(pausedResult.ready, false);
  assert.match(pausedResult.reason, /paused/i);
});

test('check push readiness validates required title and content in batch mode', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const configRepo = await createConfig(false);
  const useCase = new CheckPushReadinessUseCase(mappingRepo, configRepo);

  const summary = await useCase.executeBatch([
    { traceId: 'trace-2', siyuanDocId: 'doc-1', title: 'ok', content: 'ok' },
    { traceId: 'trace-2', siyuanDocId: 'doc-2', title: ' ', content: 'ok' },
    { traceId: 'trace-2', siyuanDocId: 'doc-3', title: 'ok', content: ' ' }
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.ready, 1);
  assert.equal(summary.skipped, 2);
  assert.equal(summary.results[1].reason, 'title is required');
  assert.equal(summary.results[2].reason, 'content is required');
});
