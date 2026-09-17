import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileMigrationProvider, Migrator, type Kysely } from 'kysely';
import type { Database } from './schema';

export async function migrate(db: Kysely<Database>) {
  const migrator = new Migrator({ db, provider: new FileMigrationProvider({ fs, path, migrationFolder: fileURLToPath(new URL('./migrations', import.meta.url)) }) });
  const result = await migrator.migrateToLatest();
  if (result.error) throw result.error;
  return result.results;
}
