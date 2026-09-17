import { createDatabase } from '../src/db';
import { sql } from 'kysely';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL.');
const db = createDatabase(process.env.DATABASE_URL);
try {
  await db.deleteFrom('rate_limits').where('expires_at', '<', new Date()).execute();
  await db.deleteFrom('sessions').where('expires_at', '<', new Date()).execute();
  await sql`delete from users u where u.email is null and u.created_at < now() - interval '30 days' and not exists (select 1 from orders o where o.customer_id=u.id) and not exists (select 1 from sessions s where s.user_id=u.id)`.execute(db);
  console.info('Sessões e contadores expirados removidos. Pedidos preservados.');
} finally { await db.destroy(); }
