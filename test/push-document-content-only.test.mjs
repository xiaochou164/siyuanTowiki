import test from 'node:test';
import assert from 'node:assert/strict';
import { PushDocumentUseCase } from '../dist/app/usecases/push-document.js';
import { InMemoryMappingRepository } from '../dist/infra/storage/mapping-repo.js';
import { InMemoryLogRepository } from '../dist/infra/storage/log-repo.js';
import { InMemoryConfigRepository } from '../dist/infra/storage/config-repo.js';

test('push use case keeps remote title when content-only update is enabled', async () => {
  const mappingRepo = new InMemoryMappingRepository();
  const logRepo = new InMemoryLogRepository();
  const configRepo = new InMemoryConfigRepository();
  let updatePayload;

  await configRepo.save({
    baseUrl: 'https://wiki.local/api/v1',
    apiKeyEncrypted: 'sealed',
    defaultVisibility: 'public',
    contentOnlyUpdateEnabled: true,
    concurrency: 1,
    retryTimes: 1,
    deleteConfirmEnabled: true,
    dryRunEnabled: false
  });

  await mappingRepo.upsert({ siyuanDocId: 'doc-1', wikiSlug: 'old-slug', syncStatus: 'active' });

  const apiClient = {
    async checkConnection() {
      return { ok: true, data: { ok: true }, httpCode: 200 };
    },
    async createPage(payload) {
      return { ok: true, data: { slug: `new-${payload.title}`, title: payload.title, content: payload.content }, httpCode: 201 };
    },
    async updatePage(_slug, payload) {
      updatePayload = payload;
      return {
        ok: true,
        data: { slug: 'old-slug', title: 'remote-title', content: payload.content },
        httpCode: 200
      };
    },
    async deletePage() {
      return { ok: true, data: { deleted: true }, httpCode: 200 };
    },
    async getPage() {
      return { ok: true, data: { slug: 'old-slug', title: 'remote-title', content: 'body' }, httpCode: 200 };
    },
    async uploadAttachment() {
      return { ok: true, data: { id: 1, url: 'https://wiki.local/file', filename: 'f.txt' }, httpCode: 200 };
    }
  };

  const useCase = new PushDocumentUseCase(apiClient, mappingRepo, logRepo, 1, configRepo);
  const result = await useCase.execute({
    traceId: 'trace-1',
    siyuanDocId: 'doc-1',
    title: 'new local title',
    content: 'updated content'
  });

  assert.equal(result, 'success');
  assert.equal(updatePayload.title, undefined);
  assert.equal(updatePayload.content, 'updated content');
});
