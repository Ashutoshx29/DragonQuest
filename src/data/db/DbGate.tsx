import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/design-system/tokens';
import { createLogger } from '@/services/logger';

import { runMigrations } from './client';

const logger = createLogger('db-gate');

/**
 * Blocks rendering until local database migrations have run.
 * Mount near the root, during the splash window, so no screen ever reads
 * the DB before its schema exists.
 */
export function DbGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'pending' | 'ready' | 'error'>('pending');

  useEffect(() => {
    let alive = true;
    runMigrations()
      .then(() => {
        if (alive) setStatus('ready');
      })
      .catch((err: unknown) => {
        logger.error('db bootstrap failed', err);
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status === 'pending') return null; // splash is showing
  if (status === 'error') {
    return (
      <View style={styles.error}>
        <View />
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    backgroundColor: palette.void,
  },
});
