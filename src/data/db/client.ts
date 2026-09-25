import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createLogger } from '@/services/logger';

import * as schema from './schema';
import { MIGRATION_000 } from './migrations/migration-000';

const logger = createLogger('db');

export type Db = ReturnType<typeof openDatabase>;

function openDatabase() {
  const sqlite = SQLite.openDatabaseSync('dragonquest.db');
  return drizzle(sqlite, { schema });
}

export const db: Db = openDatabase();

/**
 * Run pending migrations. Called once during app bootstrap (root layout)
 * before the UI renders data-dependent screens.
 */
export async function runMigrations(): Promise<void> {
  // Journal format required by drizzle's expo migrator.
  const journal = {
    entries: [
      {
        idx: 0,
        when: 0,
        tag: '000_initial',
        breakpoints: true,
      },
    ],
  };
  const migrations = {
    journal,
    migrations: {
      '000_initial': MIGRATION_000,
    },
  };
  try {
    await migrate(db, migrations);
    logger.info('migrations up to date');
  } catch (err) {
    logger.error('migration failed', err);
    throw err;
  }
}
