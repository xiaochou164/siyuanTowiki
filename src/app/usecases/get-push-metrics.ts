import type { LogRepository } from '../../infra/storage/log-repo.js';
import type { ActionType } from '../../shared/types.js';

export interface PushMetrics {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  byAction: Record<ActionType, number>;
  byErrorCode: Record<string, number>;
  byHttpCode: Record<string, number>;
}

export class GetPushMetricsUseCase {
  constructor(private readonly logRepo: LogRepository) {}

  async execute(): Promise<PushMetrics> {
    const logs = await this.logRepo.listAll();
    const total = logs.length;
    const success = logs.filter((item) => item.success).length;
    const failed = total - success;

    const byAction: Record<ActionType, number> = {
      create: 0,
      update: 0,
      delete: 0,
      pause: 0,
      resume: 0,
      unlink: 0,
      repush: 0
    };
    const byErrorCode: Record<string, number> = {};
    const byHttpCode: Record<string, number> = {};

    for (const log of logs) {
      byAction[log.actionType] += 1;
      if (log.errorCode) {
        byErrorCode[log.errorCode] = (byErrorCode[log.errorCode] ?? 0) + 1;
      }
      if (typeof log.httpCode === 'number') {
        const code = String(log.httpCode);
        byHttpCode[code] = (byHttpCode[code] ?? 0) + 1;
      }
    }

    return {
      total,
      success,
      failed,
      successRate: total === 0 ? 0 : Number(((success / total) * 100).toFixed(2)),
      byAction,
      byErrorCode,
      byHttpCode
    };
  }
}
