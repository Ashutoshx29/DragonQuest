import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/data/db/schema.ts',
  out: './drizzle',
});
