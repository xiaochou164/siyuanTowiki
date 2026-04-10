import type { DocMapping } from '../../domain/entities/mapping.js';
import type { SyncStatus } from '../../shared/types.js';

export interface MappingRepository {
  findByDocId(docId: string): Promise<DocMapping | null>;
  upsert(mapping: DocMapping): Promise<void>;
  setStatus(docId: string, status: SyncStatus): Promise<void>;
  listByStatus(status: SyncStatus): Promise<DocMapping[]>;
}

export class InMemoryMappingRepository implements MappingRepository {
  private readonly mappings = new Map<string, DocMapping>();

  async findByDocId(docId: string): Promise<DocMapping | null> {
    return this.mappings.get(docId) ?? null;
  }

  async upsert(mapping: DocMapping): Promise<void> {
    this.mappings.set(mapping.siyuanDocId, mapping);
  }

  async setStatus(docId: string, status: SyncStatus): Promise<void> {
    const current = this.mappings.get(docId);
    if (!current) throw new Error(`Mapping not found: ${docId}`);
    this.mappings.set(docId, { ...current, syncStatus: status });
  }

  async listByStatus(status: SyncStatus): Promise<DocMapping[]> {
    return [...this.mappings.values()].filter((item) => item.syncStatus === status);
  }
}
