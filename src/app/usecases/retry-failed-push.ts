import type { BatchPushSummary } from './batch-push.js';
import type { PushDocumentInput } from './push-document.js';
import { BatchPushUseCase } from './batch-push.js';

export class RetryFailedPushUseCase {
  constructor(private readonly batchPushUseCase: BatchPushUseCase) {}

  async execute(previous: BatchPushSummary, allInputs: PushDocumentInput[]): Promise<BatchPushSummary> {
    const failedSet = new Set(previous.failedDocIds);
    const retryInputs = allInputs.filter((item) => failedSet.has(item.siyuanDocId));
    return this.batchPushUseCase.execute(retryInputs);
  }
}
