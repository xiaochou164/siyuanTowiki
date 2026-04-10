import type { SyncStatus, TaskStatus } from '../../shared/types.js';

export interface DocMapping {
  siyuanDocId: string;
  wikiSlug?: string;
  syncStatus: SyncStatus;
  lastPushAt?: string;
  lastStatus?: Exclude<TaskStatus, 'queued' | 'running'>;
  lastError?: string;
  versionHint?: string;
}
