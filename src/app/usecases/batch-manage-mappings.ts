import type { ActionType, SyncStatus } from '../../shared/types.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';
import type { LogRepository } from '../../infra/storage/log-repo.js';
import type { WikiApiClient } from '../../infra/api/wiki-api-client.js';
import { assertTransition } from '../../domain/services/state-machine.js';

export type BatchManageAction = 'pause' | 'resume' | 'unlink' | 'delete_remote';

export interface BatchManageSummary {
  total: number;
  success: number;
  failed: number;
}

export class BatchManageMappingsUseCase {
  constructor(
    private readonly mappingRepo: MappingRepository,
    private readonly logRepo: LogRepository,
    private readonly apiClient: WikiApiClient
  ) {}

  async execute(traceId: string, docIds: string[], action: BatchManageAction): Promise<BatchManageSummary> {
    const summary: BatchManageSummary = { total: docIds.length, success: 0, failed: 0 };

    for (const docId of docIds) {
      try {
        const mapping = await this.mappingRepo.findByDocId(docId);
        if (!mapping) throw new Error(`No mapping found: ${docId}`);

        if (action === 'pause') await this.changeStatus(docId, mapping.syncStatus, 'paused', traceId, 'pause');
        if (action === 'resume') await this.changeStatus(docId, mapping.syncStatus, 'active', traceId, 'resume');
        if (action === 'unlink') await this.unlink(docId, mapping.syncStatus, traceId);
        if (action === 'delete_remote') await this.deleteRemote(docId, mapping.syncStatus, mapping.wikiSlug, traceId);

        summary.success += 1;
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
  ): Promise<void> {
    assertTransition(current, target);
    await this.mappingRepo.setStatus(docId, target);
    await this.writeLog(traceId, docId, actionType, true);
  }

  private async unlink(docId: string, current: SyncStatus, traceId: string): Promise<void> {
    assertTransition(current, 'unlinked');
    const mapping = await this.mappingRepo.findByDocId(docId);
    if (!mapping) throw new Error('No mapping found for unlink');
    await this.mappingRepo.upsert({ ...mapping, syncStatus: 'unlinked', wikiSlug: undefined });
    await this.writeLog(traceId, docId, 'unlink', true);
  }

  private async deleteRemote(docId: string, current: SyncStatus, slug: string | undefined, traceId: string): Promise<void> {
    if (!slug) throw new Error(`No remote slug for ${docId}`);
    assertTransition(current, 'deleted');
    const res = await this.apiClient.deletePage(slug);
    if (!res.ok) throw new Error(res.error.message);
    await this.mappingRepo.setStatus(docId, 'deleted');
    await this.writeLog(traceId, docId, 'delete', true, res.httpCode, slug);
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
}
