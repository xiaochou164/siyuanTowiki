import type { PushLog } from '../../domain/entities/push-log.js';

export interface LogRepository {
  append(log: PushLog): Promise<void>;
  listByTraceId(traceId: string): Promise<PushLog[]>;
  listRecent(limit: number): Promise<PushLog[]>;
}

export class InMemoryLogRepository implements LogRepository {
  private readonly logs: PushLog[] = [];

  async append(log: PushLog): Promise<void> {
    this.logs.push(log);
  }

  async listByTraceId(traceId: string): Promise<PushLog[]> {
    return this.logs.filter((log) => log.traceId === traceId);
  }

  async listRecent(limit: number): Promise<PushLog[]> {
    return this.logs.slice(-limit).reverse();
  }
}
