import { useCallback, useState } from 'react';

import { useAuth } from './AuthProvider';
import { countLocalRowsForPreview, syncNow, type SyncResult } from '@/services/sync/syncService';
import {
  totalPreviewItems,
  type MigrationPreviewCounts,
} from '@/services/sync/syncEngine';

export interface SyncStatus {
  /** null = never synced this session. */
  lastResult: SyncResult | null;
  /** True while a sync pass is running. */
  syncing: boolean;
  /** Local row counts for the first-login migration preview. */
  preview: MigrationPreviewCounts | null;
  previewTotal: number;
  /** Load the migration preview counts (Profile shows them once). */
  loadPreview: () => Promise<void>;
  /** Run a sync pass now. */
  sync: () => Promise<SyncResult | null>;
}

/** Profile → Account data + manual sync control. */
export function useSyncStatus(): SyncStatus {
  const { userId } = useAuth();
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [preview, setPreview] = useState<MigrationPreviewCounts | null>(null);

  const loadPreview = useCallback(async () => {
    setPreview(await countLocalRowsForPreview());
  }, []);

  const sync = useCallback(async () => {
    if (!userId) return null;
    setSyncing(true);
    try {
      const result = await syncNow(userId);
      setLastResult(result);
      return result;
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  return {
    lastResult,
    syncing,
    preview,
    previewTotal: preview ? totalPreviewItems(preview) : 0,
    loadPreview,
    sync,
  };
}
