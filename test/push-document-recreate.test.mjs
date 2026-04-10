import test from 'node:test';
import assert from 'node:assert/strict';
import { PushDocumentUseCase } from '../dist/app/usecases/push-document.js';
import { InMemoryMappingRepository } from '../dist/infra/storage/mapping-repo.js';
import { InMemoryLogRepository } from '../dist/infra/storage/log-repo.js';

const apiClient = {
  async checkConnection() {
    return { ok: true, data: { ok: true }, httpCode: 200 };
  },
  async createPage(payload) {
    return { ok: true, data: { slug: `new-${payload.title}`, title: payload.title, content: payload.content }, httpCode: 201 };
  },
  async updatePage() {
    return {
      ok: false,
      error: {
        httpCode: 404,
        errorCode: 'NOT_FOUND',
        message: 'not found',
        retriable: false
      }
    };
  },
  async deletePage() {
    return { ok: true, data: { deleted: true }, httpCode: 200 };
  },
  async getPage() {
    return { ok: true, data: { slug: 'x', title: 't', content: 'c' }, httpCode: 200 };
  }
};

test('push use case recreates page when update returns 404', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const logRepo = new InMemoryLogRepository();

  await mappingRepo.upsert({ siyuanDocId: 'doc-1', wikiSlug: 'old-slug', syncStatus: 'active' });

  const useCase = new PushDocumentUseCase(apiClient, mappingRepo, logRepo, 1);
  const result = await useCase.execute({
    traceId: 'trace-1',
    siyuanDocId: 'doc-1',
    title: 'hello',
    content: 'world'
  });

  assert.equal(result, 'success');
  const mapping = await mappingRepo.findByDocId('doc-1');
  assert.equal(mapping?.wikiSlug, 'new-hello');
});
