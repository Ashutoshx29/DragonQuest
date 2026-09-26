import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/data/db/schema.ts',
  // Generated migrations live INSIDE src/ so Metro bundles them into the app.
  // driver: 'expo' also generates migrations.js — the bundle the
  // drizzle-orm/expo-sqlite migrator consumes directly.
  out: './src/data/db/drizzle',
});
