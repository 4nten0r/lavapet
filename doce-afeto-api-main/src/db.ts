import { SQL } from 'bun';
import { Kysely } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import type { Database } from './schema';

export function createDatabase(url: string) {
  return new Kysely<Database>({
    dialect: new PostgresJSDialect({ postgres: new SQL(url, { max: 3, idleTimeout: 10, connectionTimeout: 15 }) }),
  });
}
