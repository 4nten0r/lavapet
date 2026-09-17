import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { createApp } from './app';
import { migrate } from './migrate';
import { seedCatalog } from './seed';
import { hashPassword } from './auth';
import type { Database } from './schema';
import type { Config } from './config';

if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('A demonstração funciona apenas localmente.');
const { dialect } = await KyselyPGlite.create(process.env.DEMO_DATA_DIR || './.local-data');
const db = new Kysely<Database>({ dialect });
await migrate(db);
await seedCatalog(db, 'doce-afeto');
if (!await db.selectFrom('users').select('id').where('email', '=', 'admin@doceafeto.local').executeTakeFirst()) {
  await db.insertInto('users').values({ id: crypto.randomUUID(), tenant_id: 'doce-afeto', name: 'Admin da doceria', email: 'admin@doceafeto.local', password_hash: await hashPassword('DoceAfeto!2026'), role: 'admin' }).execute();
}
const config: Config = {
  demo: true, DATABASE_URL: 'local-pglite', AUTH_SECRET: 'local-demo-only-do-not-use-in-production-2026',
  APP_ORIGIN: 'http://localhost:5173', TENANT_ID: 'doce-afeto', PORT: 3001, NODE_ENV: 'development',
  SHOP_NAME: 'Doce Afeto', SHOP_PICKUP_ADDRESS: 'Endereço de exemplo · configure o local da retirada', SHOP_PICKUP_HOURS: 'Horário de exemplo: seg. a sáb., 10h às 18h',
  MERCADO_PAGO_ACCESS_TOKEN: '', MERCADO_PAGO_WEBHOOK_SECRET: '', MERCADO_PAGO_COLLECTOR_ID: '', MERCADO_PAGO_SANDBOX: 'true', API_PUBLIC_URL: '',
};
const app = createApp(db, config);
app.addHook('onClose', () => db.destroy());
await app.listen({ port: 3001, host: '127.0.0.1' });
console.info('Demonstração local. Acesso de gestão: admin@doceafeto.local / DoceAfeto!2026');
