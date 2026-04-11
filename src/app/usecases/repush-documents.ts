import type { BatchPushSummary } from './batch-push.js';
import { BatchPushUseCase } from './batch-push.js';
import type { PushDocumentInput, PushOutcome, PushDocumentUseCase } from './push-document.js';

export class RepushDocumentsUseCase {
  constructor(
    private readonly pushDocumentUseCase: PushDocumentUseCase,
    private readonly batchPushUseCase: BatchPushUseCase
  ) {}

  async executeOne(input: PushDocumentInput): Promise<PushOutcome> {
    return this.pushDocumentUseCase.execute(input);
  }

  async executeBatch(inputs: PushDocumentInput[]): Promise<BatchPushSummary> {
    return this.batchPushUseCase.execute(inputs);
  }
}
