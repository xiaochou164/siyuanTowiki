import type { MappingRepository } from '../../infra/storage/mapping-repo.js';
import type { LogRepository } from '../../infra/storage/log-repo.js';
import type { WikiApiClient } from '../../infra/api/wiki-api-client.js';
import type { CreatePagePayload } from '../../infra/api/dto.js';
import { retriableByHttpCode, withRetry } from '../../domain/services/retry-executor.js';

export interface PushDocumentInput {
  traceId: string;
  siyuanDocId: string;
  title: string;
  content: string;
  tags?: string[];
}

export type PushOutcome = 'success' | 'failed' | 'skipped';

export class PushDocumentUseCase {
  constructor(
    private readonly apiClient: WikiApiClient,
    private readonly mappingRepo: MappingRepository,
    private readonly logRepo: LogRepository,
    private readonly retryTimes = 3
  ) {}

  async execute(input: PushDocumentInput): Promise<PushOutcome> {
    const mapping = await this.mappingRepo.findByDocId(input.siyuanDocId);
    if (mapping?.syncStatus === 'paused') {
      await this.logRepo.append({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        traceId: input.traceId,
        siyuanDocId: input.siyuanDocId,
        wikiSlug: mapping.wikiSlug,
        actionType: 'repush',
        success: false,
        errorCode: 'SKIPPED_PAUSED',
        errorMessage: 'mapping is paused',
        createdAt: new Date().toISOString()
      });
      return 'skipped';
    }

    try {
      if (!mapping?.wikiSlug) {
        const payload: CreatePagePayload = {
          title: input.title,
          content: input.content,
          tags: input.tags,
          visibility: 'public'
        };
        const created = await withRetry(
          async () => {
            const res = await this.apiClient.createPage(payload);
            if (!res.ok) throw new Error(`${res.error.errorCode}: ${res.error.message}`);
            return res;
          },
          { maxAttempts: this.retryTimes, isRetriableError: retriableByHttpCode }
        );

        await this.mappingRepo.upsert({
          siyuanDocId: input.siyuanDocId,
          wikiSlug: created.data.slug,
          syncStatus: 'active',
          lastPushAt: new Date().toISOString(),
          lastStatus: 'success'
        });

        await this.logRepo.append({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          traceId: input.traceId,
          siyuanDocId: input.siyuanDocId,
          wikiSlug: created.data.slug,
          actionType: 'create',
          httpCode: created.httpCode,
          success: true,
          createdAt: new Date().toISOString()
        });

        return 'success';
      }

      const updated = await withRetry(
        async () => {
          const res = await this.apiClient.updatePage(mapping.wikiSlug!, {
            title: input.title,
            content: input.content,
            tags: input.tags
          });
          if (!res.ok) throw new Error(`${res.error.errorCode}: ${res.error.message}`);
          return res;
        },
        { maxAttempts: this.retryTimes, isRetriableError: retriableByHttpCode }
      );

      await this.mappingRepo.upsert({ ...mapping, lastPushAt: new Date().toISOString(), lastStatus: 'success' });
      await this.logRepo.append({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        traceId: input.traceId,
        siyuanDocId: input.siyuanDocId,
        wikiSlug: mapping.wikiSlug,
        actionType: 'update',
        httpCode: updated.httpCode,
        success: true,
        createdAt: new Date().toISOString()
      });
      return 'success';
    } catch (error) {
      await this.logRepo.append({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        traceId: input.traceId,
        siyuanDocId: input.siyuanDocId,
        wikiSlug: mapping?.wikiSlug,
        actionType: mapping?.wikiSlug ? 'update' : 'create',
        success: false,
        errorCode: 'PUSH_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date().toISOString()
      });
      return 'failed';
    }
  }
}
