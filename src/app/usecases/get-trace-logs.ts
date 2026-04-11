import type { PushLog } from '../../domain/entities/push-log.js';
import type { LogRepository } from '../../infra/storage/log-repo.js';

export class GetTraceLogsUseCase {
  constructor(private readonly logRepo: LogRepository) {}

  async execute(traceId: string): Promise<PushLog[]> {
    const logs = await this.logRepo.listByTraceId(traceId);
    return [...logs].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }
}
