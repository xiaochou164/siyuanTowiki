import type { ConfigRepository } from '../../infra/storage/config-repo.js';
import type { MappingRepository } from '../../infra/storage/mapping-repo.js';
import type { PushDocumentInput } from './push-document.js';

export type PushPlanAction = 'create' | 'update' | 'skip';

export interface PushReadinessResult {
  siyuanDocId: string;
  traceId: string;
  ready: boolean;
  action: PushPlanAction;
  wikiSlug?: string;
  reason: string;
  dryRun: boolean;
}

export interface BatchPushReadinessSummary {
  total: number;
  ready: number;
  skipped: number;
  results: PushReadinessResult[];
}

export class CheckPushReadinessUseCase {
  constructor(
    private readonly mappingRepo: MappingRepository,
    private readonly configRepo?: ConfigRepository
  ) {}

  async execute(input: PushDocumentInput): Promise<PushReadinessResult> {
    const mapping = await this.mappingRepo.findByDocId(input.siyuanDocId);
    const config = this.configRepo ? await this.configRepo.get() : null;

    if (mapping?.syncStatus === 'paused') {
      return {
        siyuanDocId: input.siyuanDocId,
        traceId: input.traceId,
        ready: false,
        action: 'skip',
        wikiSlug: mapping.wikiSlug,
        reason: 'mapping is paused',
        dryRun: config?.dryRunEnabled ?? false
      };
    }

    if (!input.title.trim()) {
      return {
        siyuanDocId: input.siyuanDocId,
        traceId: input.traceId,
        ready: false,
        action: 'skip',
        wikiSlug: mapping?.wikiSlug,
        reason: 'title is required',
        dryRun: config?.dryRunEnabled ?? false
      };
    }

    if (!input.content.trim()) {
      return {
        siyuanDocId: input.siyuanDocId,
        traceId: input.traceId,
        ready: false,
        action: 'skip',
        wikiSlug: mapping?.wikiSlug,
        reason: 'content is required',
        dryRun: config?.dryRunEnabled ?? false
      };
    }

    const action: PushPlanAction = mapping?.wikiSlug ? 'update' : 'create';
    return {
      siyuanDocId: input.siyuanDocId,
      traceId: input.traceId,
      ready: true,
      action,
      wikiSlug: mapping?.wikiSlug,
      reason: action === 'create' ? 'ready to create remote page' : 'ready to update remote page',
      dryRun: config?.dryRunEnabled ?? false
    };
  }

  async executeBatch(inputs: PushDocumentInput[]): Promise<BatchPushReadinessSummary> {
    const results = await Promise.all(inputs.map((item) => this.execute(item)));
    return {
      total: results.length,
      ready: results.filter((item) => item.ready).length,
      skipped: results.filter((item) => !item.ready).length,
      results
    };
  }
}
