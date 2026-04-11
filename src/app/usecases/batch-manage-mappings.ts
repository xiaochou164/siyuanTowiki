import type { ActionType, SyncStatus } from '../../shared/types.js';
import type { ConfigRepository } from '../../infra/storage/config-repo.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';
import type { LogRepository } from '../../infra/storage/log-repo.js';
import type { WikiApiClient } from '../../infra/api/wiki-api-client.js';
import { assertTransition } from '../../domain/services/state-machine.js';

export type BatchManageAction = 'pause' | 'resume' | 'unlink' | 'delete_remote';

export interface BatchManageSummary {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

export class BatchManageMappingsUseCase {
  constructor(
    private readonly mappingRepo: MappingRepository,
    private readonly logRepo: LogRepository,
    private readonly apiClient: WikiApiClient,
    private readonly configRepo?: ConfigRepository
  ) {}

  async execute(
    traceId: string,
    docIds: string[],
    action: BatchManageAction,
    options: { confirmed?: boolean } = {}
  ): Promise<BatchManageSummary> {
    const summary: BatchManageSummary = { total: docIds.length, success: 0, failed: 0, skipped: 0 };
    const config = this.configRepo ? await this.configRepo.get() : null;

    for (const docId of docIds) {
      try {
        const mapping = await this.mappingRepo.findByDocId(docId);
        if (!mapping) throw new Error(`No mapping found: ${docId}`);

        if (action === 'pause') {
          const outcome = await this.changeStatus(docId, mapping.syncStatus, 'paused', traceId, 'pause');
          summary[outcome] += 1;
          continue;
        }
        if (action === 'resume') {
          const outcome = await this.changeStatus(docId, mapping.syncStatus, 'active', traceId, 'resume');
          summary[outcome] += 1;
          continue;
        }
        if (action === 'unlink') {
          const outcome = await this.unlink(docId, mapping.syncStatus, traceId);
          summary[outcome] += 1;
          continue;
        }
        if (action === 'delete_remote') {
          if (config?.deleteConfirmEnabled && !options.confirmed) {
            throw new Error('Delete confirmation required');
          }
          const outcome = await this.deleteRemote(docId, mapping.syncStatus, mapping.wikiSlug, traceId);
          summary[outcome] += 1;
          continue;
        }

        summary.failed += 1;
      } catch {
        summary.failed += 1;
      }
    }

    return summary;
  }

  private async changeStatus(
    docId: string,
    current: SyncStatus,
    target: SyncStatus,
    traceId: string,
    actionType: ActionType
  ): Promise<'success' | 'skipped'> {
    if (current === target) {
      await this.writeSkipLog(traceId, docId, actionType, current);
      return 'skipped';
    }
    assertTransition(current, target);
    await this.mappingRepo.setStatus(docId, target);
    await this.writeLog(traceId, docId, actionType, true);
    return 'success';
  }

  private async unlink(docId: string, current: SyncStatus, traceId: string): Promise<'success' | 'skipped'> {
    if (current === 'unlinked') {
      await this.writeSkipLog(traceId, docId, 'unlink', current);
      return 'skipped';
    }
    assertTransition(current, 'unlinked');
    const mapping = await this.mappingRepo.findByDocId(docId);
    if (!mapping) throw new Error('No mapping found for unlink');
    await this.mappingRepo.upsert({ ...mapping, syncStatus: 'unlinked', wikiSlug: undefined });
    await this.writeLog(traceId, docId, 'unlink', true);
    return 'success';
  }

  private async deleteRemote(
    docId: string,
    current: SyncStatus,
    slug: string | undefined,
    traceId: string
  ): Promise<'success' | 'skipped'> {
    if (current === 'deleted') {
      await this.writeSkipLog(traceId, docId, 'delete', current, slug);
      return 'skipped';
    }
    if (!slug) throw new Error(`No remote slug for ${docId}`);
    assertTransition(current, 'deleted');
    const res = await this.apiClient.deletePage(slug);
    if (!res.ok) throw new Error(res.error.message);
    await this.mappingRepo.setStatus(docId, 'deleted');
    await this.writeLog(traceId, docId, 'delete', true, res.httpCode, slug);
    return 'success';
  }

  private async writeLog(
    traceId: string,
    docId: string,
    actionType: ActionType,
    success: boolean,
    httpCode?: number,
    wikiSlug?: string
  ): Promise<void> {
    await this.logRepo.append({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      traceId,
      siyuanDocId: docId,
      wikiSlug,
      actionType,
      httpCode,
      success,
      createdAt: new Date().toISOString()
    });
  }

  private async writeSkipLog(
    traceId: string,
    docId: string,
    actionType: ActionType,
    currentStatus: SyncStatus,
    wikiSlug?: string
  ): Promise<void> {
    await this.logRepo.append({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      traceId,
      siyuanDocId: docId,
      wikiSlug,
      actionType,
      success: false,
      errorCode: 'SKIPPED_NOOP',
      errorMessage: `mapping already in ${currentStatus}`,
      createdAt: new Date().toISOString()
    });
  }
}
