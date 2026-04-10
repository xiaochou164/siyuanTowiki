import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMappingRepository } from '../dist/infra/storage/mapping-repo.js';
import { ListPushedPagesUseCase } from '../dist/app/usecases/list-pushed-pages.js';

test('list pushed pages supports status and keyword filter', async () => {
  const repo = new InMemoryMappingRepository();
  await repo.upsert({ siyuanDocId: 'doc-1', wikiSlug: 'wiki-a', syncStatus: 'active' });
  await repo.upsert({ siyuanDocId: 'doc-2', wikiSlug: 'wiki-b', syncStatus: 'paused', lastError: 'timeout' });

  const useCase = new ListPushedPagesUseCase(repo);
  const paused = await useCase.execute({ status: 'paused' });
  assert.equal(paused.length, 1);

  const byKeyword = await useCase.execute({ keyword: 'timeout' });
  assert.equal(byKeyword.length, 1);
  assert.equal(byKeyword[0].siyuanDocId, 'doc-2');
});
