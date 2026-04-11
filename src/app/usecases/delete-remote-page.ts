import { assertTransition } from '../../domain/services/state-machine.js';
import { retriableByHttpCode, withRetry } from '../../domain/services/retry-executor.js';
import type { WikiApiClient } from '../../infra/api/wiki-api-client.js';
import type { ConfigRepository } from '../../infra/storage/config-repo.js';
import type { LogRepository } from '../../infra/storage/log-repo.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';

export class DeleteRemotePageUseCase {
  constructor(
    private readonly apiClient: WikiApiClient,
    private readonly mappingRepo: MappingRepository,
    private readonly logRepo: LogRepository,
    private readonly retryTimes = 3,
    private readonly configRepo?: ConfigRepository
  ) {}

  async execute(traceId: string, siyuanDocId: string, confirmed = false): Promise<void> {
    const config = this.configRepo ? await this.configRepo.get() : null;
    if (config?.deleteConfirmEnabled && !confirmed) {
      throw new Error('Delete confirmation required');
    }

    const mapping = await this.mappingRepo.findByDocId(siyuanDocId);
    if (!mapping?.wikiSlug) throw new Error('No mapping found');

    assertTransition(mapping.syncStatus, 'deleted');

    const res = await withRetry(
      async () => {
        const resp = await this.apiClient.deletePage(mapping.wikiSlug!);
        if (!resp.ok) throw new Error(`${resp.error.errorCode}: ${resp.error.message}`);
        return resp;
      },
      { maxAttempts: this.retryTimes, isRetriableError: retriableByHttpCode }
    );

    await this.mappingRepo.setStatus(siyuanDocId, 'deleted');
    await this.logRepo.append({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      traceId,
      siyuanDocId,
      wikiSlug: mapping.wikiSlug,
      actionType: 'delete',
      httpCode: res.httpCode,
      success: true,
      createdAt: new Date().toISOString()
    });
  }
}
