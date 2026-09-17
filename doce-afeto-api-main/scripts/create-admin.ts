import { z } from 'zod';
import { createDatabase } from '../src/db';
import { hashPassword } from '../src/auth';
const input = z.object({ DATABASE_URL: z.string().min(1), ADMIN_EMAIL: z.email(), ADMIN_PASSWORD: z.string().min(12).max(128), ADMIN_NAME: z.string().min(2) }).parse(process.env);
const db = createDatabase(input.DATABASE_URL);
const tenant = process.env.TENANT_ID || 'doce-afeto';
try {
  await db.insertInto('tenants').values({ id: tenant, name: process.env.SHOP_NAME || 'Doce Afeto' }).onConflict(c => c.column('id').doNothing()).execute();
  await db.insertInto('users').values({ id: crypto.randomUUID(), tenant_id: tenant, name: input.ADMIN_NAME, email: input.ADMIN_EMAIL.toLowerCase(), password_hash: await hashPassword(input.ADMIN_PASSWORD), role: 'admin' }).execute();
  console.info('Administrador criado. Remova ADMIN_PASSWORD do ambiente.');
} finally { await db.destroy(); }
