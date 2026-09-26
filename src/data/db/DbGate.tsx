import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/design-system/tokens';
import { createLogger } from '@/services/logger';

import { runMigrations } from './client';

const logger = createLogger('db-gate');

/**
 * Blocks rendering until local database migrations have succeeded.
 * Mount near the root, during the splash window, so no screen ever reads
 * the DB before its schema exists. On failure the error is rendered in dev
 * (and logged) — the app must never continue as though the DB were ready.
 */
export function DbGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'pending' | 'ready' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    runMigrations()
      .then(() => {
        if (alive) setStatus('ready');
      })
      .catch((err: unknown) => {
        logger.error('db bootstrap failed', err);
        if (alive) {
          setError(err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err));
          setStatus('error');
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status === 'pending') return null; // splash is showing

  if (status === 'error') {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Database failed to initialize</Text>
        <Text style={styles.errorHint}>
          The app cannot start without its local database.{'\n'}
          Details are logged to the console.
        </Text>
        {__DEV__ ? (
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: palette.void,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorHint: {
    color: '#8B93A7',
    fontSize: 13,
    textAlign: 'center',
  },
  errorBox: {
    maxHeight: 300,
    backgroundColor: '#12151D',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#F87171',
    fontFamily: 'monospace',
    fontSize: 11,
  },
});
