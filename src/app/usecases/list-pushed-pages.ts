import type { DocMapping } from '../../domain/entities/mapping.js';
import type { SyncStatus } from '../../shared/types.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';

export interface ListPushedPagesInput {
  status?: SyncStatus;
  keyword?: string;
}

export class ListPushedPagesUseCase {
  constructor(private readonly mappingRepo: MappingRepository) {}

  async execute(input: ListPushedPagesInput = {}): Promise<DocMapping[]> {
    const rows = input.status
      ? await this.mappingRepo.listByStatus(input.status)
      : await this.mappingRepo.listAll();

    const keyword = input.keyword?.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter(
      (row) =>
        row.siyuanDocId.toLowerCase().includes(keyword) ||
        row.wikiSlug?.toLowerCase().includes(keyword) ||
        row.lastError?.toLowerCase().includes(keyword)
    );
  }
}
