import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMappingRepository } from '../dist/infra/storage/mapping-repo.js';
import { InMemoryLogRepository } from '../dist/infra/storage/log-repo.js';
import { BatchManageMappingsUseCase } from '../dist/app/usecases/batch-manage-mappings.js';

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

test('batch manage pause and delete remote', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const logRepo = new InMemoryLogRepository();
  await mappingRepo.upsert({ siyuanDocId: 'doc-1', wikiSlug: 'slug-1', syncStatus: 'active' });

  const useCase = new BatchManageMappingsUseCase(mappingRepo, logRepo, fakeApi);
  const paused = await useCase.execute('trace-1', ['doc-1'], 'pause');
  assert.equal(paused.success, 1);
  assert.equal((await mappingRepo.findByDocId('doc-1')).syncStatus, 'paused');

  const deleted = await useCase.execute('trace-2', ['doc-1'], 'delete_remote');
  assert.equal(deleted.success, 1);
  assert.equal((await mappingRepo.findByDocId('doc-1')).syncStatus, 'deleted');
});
