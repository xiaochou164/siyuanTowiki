import { assertTransition } from '../../domain/services/state-machine.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';

export class UnlinkMappingUseCase {
  constructor(private readonly mappingRepo: MappingRepository) {}

  async execute(siyuanDocId: string): Promise<void> {
    const mapping = await this.mappingRepo.findByDocId(siyuanDocId);
    if (!mapping) throw new Error(`No mapping found: ${siyuanDocId}`);
    assertTransition(mapping.syncStatus, 'unlinked');
    await this.mappingRepo.upsert({ ...mapping, syncStatus: 'unlinked', wikiSlug: undefined });
  }
}
