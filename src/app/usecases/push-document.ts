import type { MappingRepository } from '../../infra/storage/mapping-repo.js';
import type { LogRepository } from '../../infra/storage/log-repo.js';
import type { WikiApiClient } from '../../infra/api/wiki-api-client.js';
import type { CreatePagePayload } from '../../infra/api/dto.js';
import type { ConfigRepository } from '../../infra/storage/config-repo.js';
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
    private readonly retryTimes = 3,
    private readonly configRepo?: ConfigRepository
  ) {}

  async execute(input: PushDocumentInput): Promise<PushOutcome> {
    const mapping = await this.mappingRepo.findByDocId(input.siyuanDocId);
    const config = this.configRepo ? await this.configRepo.get() : null;

    if (mapping?.syncStatus === 'paused') {
      await this.appendSkipLog(input, mapping.wikiSlug, 'SKIPPED_PAUSED', 'mapping is paused');
      return 'skipped';
    }

    if (config?.dryRunEnabled) {
      await this.appendSkipLog(input, mapping?.wikiSlug, 'SKIPPED_DRY_RUN', 'dry-run enabled');
      return 'skipped';
    }

    try {
      const payload: CreatePagePayload = {
        title: input.title,
        content: input.content,
        tags: input.tags,
        visibility: config?.defaultVisibility ?? 'public',
        space_id: config?.defaultSpaceId
      };

      if (!mapping?.wikiSlug) {
        await this.createNewPage(input, payload);
        return 'success';
      }

      const updated = await withRetry(
        async () => {
          const res = await this.apiClient.updatePage(mapping.wikiSlug!, {
            title: config?.contentOnlyUpdateEnabled ? undefined : input.title,
            content: input.content,
            tags: input.tags
          });

          if (!res.ok && res.error.httpCode !== 404) {
            throw new Error(`${res.error.errorCode}: ${res.error.message}`);
          }

          return res;
        },
        {
          maxAttempts: this.retryTimes,
          isRetriableError: retriableByHttpCode
        }
      );

      if (!updated.ok) {
        if (updated.error.httpCode === 404) {
          await this.logRepo.append({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            traceId: input.traceId,
            siyuanDocId: input.siyuanDocId,
            wikiSlug: mapping.wikiSlug,
            actionType: 'update',
            success: false,
            errorCode: 'REMOTE_NOT_FOUND_RECREATE',
            errorMessage: 'remote page not found, recreate page',
            createdAt: new Date().toISOString()
          });
          await this.createNewPage(input, payload);
          return 'success';
        }

        throw new Error(`${updated.error.errorCode}: ${updated.error.message}`);
      }

      await this.mappingRepo.upsert({
        ...mapping,
        lastPushAt: new Date().toISOString(),
        lastStatus: 'success',
        lastError: undefined
      });
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (mapping) {
        await this.mappingRepo.upsert({
          ...mapping,
          lastStatus: 'failed',
          lastError: errorMessage
        });
      }
      await this.logRepo.append({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        traceId: input.traceId,
        siyuanDocId: input.siyuanDocId,
        wikiSlug: mapping?.wikiSlug,
        actionType: mapping?.wikiSlug ? 'update' : 'create',
        success: false,
        errorCode: 'PUSH_FAILED',
        errorMessage,
        createdAt: new Date().toISOString()
      });
      return 'failed';
    }
  }

  private async createNewPage(input: PushDocumentInput, payload: CreatePagePayload): Promise<void> {
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
      lastStatus: 'success',
      lastError: undefined
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
  }

  private async appendSkipLog(
    input: PushDocumentInput,
    wikiSlug: string | undefined,
    code: string,
    message: string
  ): Promise<void> {
    await this.logRepo.append({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      traceId: input.traceId,
      siyuanDocId: input.siyuanDocId,
      wikiSlug,
      actionType: 'repush',
      success: false,
      errorCode: code,
      errorMessage: message,
      createdAt: new Date().toISOString()
    });
  }
}
