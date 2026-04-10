import type { LogRepository } from '../../infra/storage/log-repo.js';
import type { PushLog } from '../../domain/entities/push-log.js';

export type ExportFormat = 'json' | 'csv';

export class ExportPushLogsUseCase {
  constructor(private readonly logRepo: LogRepository) {}

  async execute(limit: number, format: ExportFormat): Promise<string> {
    const logs = await this.logRepo.listRecent(limit);
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    return this.toCsv(logs);
  }

  private toCsv(logs: PushLog[]): string {
    const headers = [
      'id',
      'traceId',
      'siyuanDocId',
      'wikiSlug',
      'actionType',
      'httpCode',
      'success',
      'errorCode',
      'errorMessage',
      'createdAt'
    ];

    const lines = logs.map((log) =>
      [
        log.id,
        log.traceId,
        log.siyuanDocId,
        log.wikiSlug ?? '',
        log.actionType,
        log.httpCode ?? '',
        log.success,
        log.errorCode ?? '',
        log.errorMessage ?? '',
        log.createdAt
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    );

    return [headers.join(','), ...lines].join('\n');
  }
}
