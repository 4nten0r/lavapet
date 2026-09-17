import { createDatabase } from '../src/db';
import { migrate } from '../src/migrate';
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('Configure DATABASE_URL_UNPOOLED.');
const db = createDatabase(url);
try { console.info(await migrate(db)); } finally { await db.destroy(); }
