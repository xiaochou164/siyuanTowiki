import { ConfigurePluginUseCase, type ConfigurePluginInput } from './usecases/configure-plugin.js';
import { BatchPushUseCase, type BatchPushSummary } from './usecases/batch-push.js';
import { PushDocumentUseCase, type PushDocumentInput } from './usecases/push-document.js';
import { DeleteRemotePageUseCase } from './usecases/delete-remote-page.js';
import { PauseResumeUseCase } from './usecases/pause-resume.js';
import { UnlinkMappingUseCase } from './usecases/unlink-mapping.js';
import {
  BatchManageMappingsUseCase,
  type BatchManageAction,
  type BatchManageSummary
} from './usecases/batch-manage-mappings.js';
import { ListPushedPagesUseCase, type ListPushedPagesInput } from './usecases/list-pushed-pages.js';
import { TestConnectionUseCase, type ConnectionTestResult } from './usecases/test-connection.js';
import { ExportPushLogsUseCase, type ExportFormat } from './usecases/export-push-logs.js';
import { RetryFailedPushUseCase } from './usecases/retry-failed-push.js';
import { GetPushMetricsUseCase, type PushMetrics } from './usecases/get-push-metrics.js';
import { UploadAttachmentsUseCase, type AttachmentInput, type AttachmentUploadResult } from './usecases/upload-attachments.js';

export class PluginService {
  constructor(
    private readonly configurePluginUseCase: ConfigurePluginUseCase,
    private readonly pushDocumentUseCase: PushDocumentUseCase,
    private readonly batchPushUseCase: BatchPushUseCase,
    private readonly retryFailedPushUseCase: RetryFailedPushUseCase,
    private readonly deleteRemotePageUseCase: DeleteRemotePageUseCase,
    private readonly pauseResumeUseCase: PauseResumeUseCase,
    private readonly unlinkMappingUseCase: UnlinkMappingUseCase,
    private readonly batchManageMappingsUseCase: BatchManageMappingsUseCase,
    private readonly listPushedPagesUseCase: ListPushedPagesUseCase,
    private readonly testConnectionUseCase: TestConnectionUseCase,
    private readonly exportPushLogsUseCase: ExportPushLogsUseCase,
    private readonly getPushMetricsUseCase: GetPushMetricsUseCase,
    private readonly uploadAttachmentsUseCase: UploadAttachmentsUseCase
  ) {}

  configure(input: ConfigurePluginInput) {
    return this.configurePluginUseCase.execute(input);
  }

  testConnection(): Promise<ConnectionTestResult> {
    return this.testConnectionUseCase.execute();
  }

  push(input: PushDocumentInput) {
    return this.pushDocumentUseCase.execute(input);
  }

  batchPush(inputs: PushDocumentInput[]): Promise<BatchPushSummary> {
    return this.batchPushUseCase.execute(inputs);
  }

  retryFailedPush(previous: BatchPushSummary, allInputs: PushDocumentInput[]): Promise<BatchPushSummary> {
    return this.retryFailedPushUseCase.execute(previous, allInputs);
  }

  deleteRemote(traceId: string, siyuanDocId: string) {
    return this.deleteRemotePageUseCase.execute(traceId, siyuanDocId);
  }

  pause(siyuanDocId: string) {
    return this.pauseResumeUseCase.execute(siyuanDocId, 'paused');
  }

  resume(siyuanDocId: string) {
    return this.pauseResumeUseCase.execute(siyuanDocId, 'active');
  }

  unlink(siyuanDocId: string) {
    return this.unlinkMappingUseCase.execute(siyuanDocId);
  }

  listPushedPages(input: ListPushedPagesInput = {}) {
    return this.listPushedPagesUseCase.execute(input);
  }

  batchManage(traceId: string, docIds: string[], action: BatchManageAction): Promise<BatchManageSummary> {
    return this.batchManageMappingsUseCase.execute(traceId, docIds, action);
  }

  exportLogs(limit: number, format: ExportFormat): Promise<string> {
    return this.exportPushLogsUseCase.execute(limit, format);
  }

  getMetrics(): Promise<PushMetrics> {
    return this.getPushMetricsUseCase.execute();
  }

  uploadAttachments(files: AttachmentInput[]): Promise<AttachmentUploadResult[]> {
    return this.uploadAttachmentsUseCase.execute(files);
  }
}
