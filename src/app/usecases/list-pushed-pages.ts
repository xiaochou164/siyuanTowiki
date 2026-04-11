import type { DocMapping } from '../../domain/entities/mapping.js';
import type { SyncStatus } from '../../shared/types.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';

export interface ListPushedPagesInput {
  status?: SyncStatus;
  keyword?: string;
  pushedAfter?: string;
  pushedBefore?: string;
}

export class ListPushedPagesUseCase {
  constructor(private readonly mappingRepo: MappingRepository) {}

  async execute(input: ListPushedPagesInput = {}): Promise<DocMapping[]> {
    const rows = input.status
      ? await this.mappingRepo.listByStatus(input.status)
      : await this.mappingRepo.listAll();

    const keyword = input.keyword?.trim().toLowerCase();
    const pushedAfter = this.parseTime(input.pushedAfter);
    const pushedBefore = this.parseTime(input.pushedBefore);

    return rows.filter((row) => {
      if (
        keyword &&
        !(
          row.siyuanDocId.toLowerCase().includes(keyword) ||
          row.wikiSlug?.toLowerCase().includes(keyword) ||
          row.lastError?.toLowerCase().includes(keyword)
        )
      ) {
        return false;
      }

      if (pushedAfter || pushedBefore) {
        const lastPushAt = this.parseTime(row.lastPushAt);
        if (!lastPushAt) return false;
        if (pushedAfter && lastPushAt < pushedAfter) return false;
        if (pushedBefore && lastPushAt > pushedBefore) return false;
      }

      return true;
    });
  }

  private parseTime(value?: string): number | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
