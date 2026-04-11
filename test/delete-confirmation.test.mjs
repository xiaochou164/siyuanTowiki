import test from 'node:test';
import assert from 'node:assert/strict';
import { DeleteRemotePageUseCase } from '../dist/app/usecases/delete-remote-page.js';
import { BatchManageMappingsUseCase } from '../dist/app/usecases/batch-manage-mappings.js';
import { InMemoryMappingRepository } from '../dist/infra/storage/mapping-repo.js';
import { InMemoryLogRepository } from '../dist/infra/storage/log-repo.js';
import { InMemoryConfigRepository } from '../dist/infra/storage/config-repo.js';

const fakeApi = {
  async checkConnection() {
    return { ok: true, data: { ok: true }, httpCode: 200 };
  },
  async createPage() {
    return { ok: true, data: { slug: 'x', title: 't', content: 'c' }, httpCode: 201 };
  },
  async updatePage() {
    return { ok: true, data: { slug: 'x', title: 't', content: 'c' }, httpCode: 200 };
  },
  async deletePage() {
    return { ok: true, data: { deleted: true }, httpCode: 200 };
  },
  async getPage() {
    return { ok: true, data: { slug: 'x', title: 't', content: 'c' }, httpCode: 200 };
  }
};

async function createConfig(deleteConfirmEnabled) {
  const repo = new InMemoryConfigRepository();
  await repo.save({
    baseUrl: 'https://wiki.local/api/v1',
    apiKeyEncrypted: 'sealed',
    defaultVisibility: 'public',
    contentOnlyUpdateEnabled: false,
    concurrency: 1,
    retryTimes: 3,
    deleteConfirmEnabled,
    dryRunEnabled: false
  });
  return repo;
}

test('delete remote requires confirmation when confirm switch is enabled', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const logRepo = new InMemoryLogRepository();
  const configRepo = await createConfig(true);
  await mappingRepo.upsert({ siyuanDocId: 'doc-1', wikiSlug: 'slug-1', syncStatus: 'active' });

  const useCase = new DeleteRemotePageUseCase(fakeApi, mappingRepo, logRepo, 1, configRepo);

  await assert.rejects(() => useCase.execute('trace-1', 'doc-1'), /Delete confirmation required/);
  assert.equal((await mappingRepo.findByDocId('doc-1'))?.syncStatus, 'active');
});

test('delete remote succeeds after confirmation when confirm switch is enabled', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const logRepo = new InMemoryLogRepository();
  const configRepo = await createConfig(true);
  await mappingRepo.upsert({ siyuanDocId: 'doc-1', wikiSlug: 'slug-1', syncStatus: 'active' });

  const useCase = new DeleteRemotePageUseCase(fakeApi, mappingRepo, logRepo, 1, configRepo);
  await useCase.execute('trace-1', 'doc-1', true);

  assert.equal((await mappingRepo.findByDocId('doc-1'))?.syncStatus, 'deleted');
});

test('batch delete remote requires confirmation when confirm switch is enabled', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const logRepo = new InMemoryLogRepository();
  const configRepo = await createConfig(true);
  await mappingRepo.upsert({ siyuanDocId: 'doc-1', wikiSlug: 'slug-1', syncStatus: 'active' });

  const useCase = new BatchManageMappingsUseCase(mappingRepo, logRepo, fakeApi, configRepo);
  const result = await useCase.execute('trace-1', ['doc-1'], 'delete_remote');

  assert.equal(result.success, 0);
  assert.equal(result.failed, 1);
  assert.equal(result.skipped, 0);
  assert.equal((await mappingRepo.findByDocId('doc-1'))?.syncStatus, 'active');
});
