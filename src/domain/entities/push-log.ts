import type { ActionType } from '../../shared/types.js';

export interface PushLog {
  id: string;
  traceId: string;
  siyuanDocId: string;
  wikiSlug?: string;
  actionType: ActionType;
  httpCode?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}
