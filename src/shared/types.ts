export type SyncStatus = 'active' | 'paused' | 'deleted' | 'unlinked';

export type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'pause'
  | 'resume'
  | 'unlink'
  | 'repush';

export type TaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'paused' | 'skipped';

export interface ApiError {
  httpCode: number;
  errorCode: string;
  message: string;
  retriable: boolean;
}

export type ApiResult<T> =
  | { ok: true; data: T; httpCode: number }
  | { ok: false; error: ApiError };
