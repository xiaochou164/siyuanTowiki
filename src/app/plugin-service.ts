import { ConfigurePluginUseCase, type ConfigurePluginInput } from './usecases/configure-plugin.js';
import { BatchPushUseCase, type BatchPushSummary } from './usecases/batch-push.js';
import { PushDocumentUseCase, type PushDocumentInput } from './usecases/push-document.js';
import { DeleteRemotePageUseCase } from './usecases/delete-remote-page.js';
import { PauseResumeUseCase } from './usecases/pause-resume.js';
import { UnlinkMappingUseCase } from './usecases/unlink-mapping.js';

export class PluginService {
  constructor(
    private readonly configurePluginUseCase: ConfigurePluginUseCase,
    private readonly pushDocumentUseCase: PushDocumentUseCase,
    private readonly batchPushUseCase: BatchPushUseCase,
    private readonly deleteRemotePageUseCase: DeleteRemotePageUseCase,
    private readonly pauseResumeUseCase: PauseResumeUseCase,
    private readonly unlinkMappingUseCase: UnlinkMappingUseCase
  ) {}

  configure(input: ConfigurePluginInput) {
    return this.configurePluginUseCase.execute(input);
  }

  push(input: PushDocumentInput) {
    return this.pushDocumentUseCase.execute(input);
  }

  batchPush(inputs: PushDocumentInput[]): Promise<BatchPushSummary> {
    return this.batchPushUseCase.execute(inputs);
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
}
