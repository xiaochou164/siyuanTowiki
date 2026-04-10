import type { TaskQueue } from '../../infra/queue/task-queue.js';
import type { PushDocumentInput, PushDocumentUseCase } from './push-document.js';

export interface BatchPushSummary {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  successDocIds: string[];
  failedDocIds: string[];
  skippedDocIds: string[];
}

export class BatchPushUseCase {
  constructor(private readonly queue: TaskQueue, private readonly pushDocument: PushDocumentUseCase) {}

  async execute(inputs: PushDocumentInput[]): Promise<BatchPushSummary> {
    const summary: BatchPushSummary = {
      total: inputs.length,
      success: 0,
      failed: 0,
      skipped: 0,
      successDocIds: [],
      failedDocIds: [],
      skippedDocIds: []
    };

    for (const input of inputs) {
      await this.queue.enqueue(async () => {
        const result = await this.pushDocument.execute(input);
        if (result === 'success') {
          summary.success += 1;
          summary.successDocIds.push(input.siyuanDocId);
          return;
        }
        if (result === 'skipped') {
          summary.skipped += 1;
          summary.skippedDocIds.push(input.siyuanDocId);
          return;
        }
        summary.failed += 1;
        summary.failedDocIds.push(input.siyuanDocId);
      });
    }

    await this.queue.onIdle();
    return summary;
  }
}
