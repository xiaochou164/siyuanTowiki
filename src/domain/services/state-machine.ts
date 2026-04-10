import type { SyncStatus } from '../../shared/types.js';

const transitions: Record<SyncStatus, SyncStatus[]> = {
  active: ['paused', 'deleted', 'unlinked'],
  paused: ['active', 'deleted', 'unlinked'],
  deleted: ['active'],
  unlinked: ['active']
};

export function canTransition(from: SyncStatus, to: SyncStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: SyncStatus, to: SyncStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid sync status transition: ${from} -> ${to}`);
  }
}
