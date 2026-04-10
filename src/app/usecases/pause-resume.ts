import { assertTransition } from '../../domain/services/state-machine.js';
import type { SyncStatus } from '../../shared/types.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';

export class PauseResumeUseCase {
  constructor(private readonly mappingRepo: MappingRepository) {}

  async execute(siyuanDocId: string, to: Extract<SyncStatus, 'active' | 'paused'>): Promise<void> {
    const mapping = await this.mappingRepo.findByDocId(siyuanDocId);
    if (!mapping) throw new Error(`No mapping found: ${siyuanDocId}`);
    assertTransition(mapping.syncStatus, to);
    await this.mappingRepo.setStatus(siyuanDocId, to);
  }
}
