import { createDatabase } from '../src/db';
import { seedCatalog } from '../src/seed';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL.');
const db = createDatabase(process.env.DATABASE_URL);
try { await seedCatalog(db, process.env.TENANT_ID || 'doce-afeto', process.env.SHOP_NAME); console.info('Cardápio de exemplo criado. Revise nomes, preços e alérgenos.'); } finally { await db.destroy(); }
