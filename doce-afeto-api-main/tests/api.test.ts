import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../src/app';
import { hashPassword, rateLimit } from '../src/auth';
import { migrate } from '../src/migrate';
import { seedCatalog } from '../src/seed';
import { verifyWebhook } from '../src/payments';
import type { Database, Product } from '../src/schema';
import type { Config } from '../src/config';

let db: Kysely<Database>, app: FastifyInstance, adminCookie: string, products: Product[];
const config: Config = { demo: true, DATABASE_URL: 'test', AUTH_SECRET: 'test-only-secret-long-enough-for-hs256-signatures', APP_ORIGIN: 'http://localhost:5173', TENANT_ID: 'doce-afeto', PORT: 3001, NODE_ENV: 'test', SHOP_NAME: 'Teste', SHOP_PICKUP_ADDRESS: 'Teste', SHOP_PICKUP_HOURS: 'Teste', MERCADO_PAGO_ACCESS_TOKEN: '', MERCADO_PAGO_WEBHOOK_SECRET: '', MERCADO_PAGO_COLLECTOR_ID: '', MERCADO_PAGO_SANDBOX: 'true', API_PUBLIC_URL: '' };
const headers = (cookie = '') => ({ 'x-requested-with': 'DoceAfeto', origin: config.APP_ORIGIN, cookie });
const cookies = (r: { cookies: { name: string; value: string }[] }) => r.cookies.map(c => `${c.name}=${c.value}`).join('; ');
const guest = async () => cookies(await app.inject({ method: 'POST', url: '/api/auth/guest', headers: headers() }));
const purchase = (p: Product, quantity = 1) => ({ customer_name: 'Cliente de Teste', phone: '11999999999', notes: '', payment_method: 'pickup', items: [{ product_id: p.id, quantity, expected_price_cents: p.price_cents }] });
const order = (cookie: string, payload: object, key = crypto.randomUUID()) => app.inject({ method: 'POST', url: '/api/orders', headers: { ...headers(cookie), 'idempotency-key': key }, payload });
const productInput = (overrides = {}) => ({ name: 'Doce de teste', description: 'Um doce criado para testar a loja.', category: 'Brigadeiros', price_cents: 550, stock: 10, image_url: '/images/brigadeiro.webp', unit: '1 unidade', allergens: ['Leite'], featured: false, available: true, ...overrides });

beforeAll(async () => {
  const { dialect } = await KyselyPGlite.create(); db = new Kysely<Database>({ dialect });
  await migrate(db); await seedCatalog(db, config.TENANT_ID); await seedCatalog(db, 'other-tenant');
  await db.insertInto('users').values({ id: crypto.randomUUID(), tenant_id: config.TENANT_ID, name: 'Admin', email: 'admin@test.local', password_hash: await hashPassword('TestPassword123!'), role: 'admin' }).execute();
  app = createApp(db, config); await app.ready();
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', headers: headers(), payload: { email: 'admin@test.local', password: 'TestPassword123!' } });
  expect(response.statusCode).toBe(200); adminCookie = cookies(response);
  products = (await app.inject('/api/products')).json();
}, 30000);
afterAll(async () => { await app?.close(); await db?.destroy(); });

describe('Catálogo e autorização', () => {
  test('menu público pertence apenas ao tenant da loja', async () => {
    expect(products).toHaveLength(4);
    expect(products[0]).not.toHaveProperty('tenant_id');
    const p = await app.inject('/api/products?tenant_id=other-tenant');
    expect(p.json().map((i: Product) => i.id)).toEqual(products.map(i => i.id));
  });
  test('bloqueia acesso e escrita da gestão para visitantes', async () => {
    expect((await app.inject('/api/admin/products')).statusCode).toBe(401);
    const session = await guest();
    expect((await app.inject({ method: 'POST', url: '/api/admin/products', headers: headers(session), payload: productInput() })).statusCode).toBe(403);
  });
  test('bloqueia CSRF e tenant/role injection', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/admin/products', headers: { ...headers(adminCookie), origin: 'https://evil.example' }, payload: productInput() })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/admin/products', headers: headers(adminCookie), payload: productInput({ tenant_id: 'other-tenant' }) })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/auth/guest' })).statusCode).toBe(403);
  });
  test('CRUD usa versão para impedir sobrescrita de estoque concorrente', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/admin/products', headers: headers(adminCookie), payload: productInput() });
    expect(created.statusCode).toBe(201); const p = created.json();
    const edit = { method: 'PUT' as const, url: `/api/admin/products/${p.id}`, headers: headers(adminCookie), payload: { ...productInput(), name: 'Doce atualizado', version: p.version } };
    expect((await app.inject(edit)).statusCode).toBe(200);
    expect((await app.inject(edit)).statusCode).toBe(409);
    expect((await app.inject({ method: 'DELETE', url: `/api/admin/products/${p.id}`, headers: headers(adminCookie) })).statusCode).toBe(200);
    expect((await app.inject('/api/products')).json().some((i: Product) => i.id === p.id)).toBe(false);
  });
  test('produto de outra loja não pode ser editado ou comprado', async () => {
    const foreign = await db.selectFrom('products').selectAll().where('tenant_id', '=', 'other-tenant').executeTakeFirstOrThrow();
    expect((await app.inject({ method: 'DELETE', url: `/api/admin/products/${foreign.id}`, headers: headers(adminCookie) })).statusCode).toBe(404);
    expect((await order(await guest(), purchase(foreign))).statusCode).toBe(409);
  });
});

describe('Compra e histórico', () => {
  test('calcula centavos no servidor e reduz estoque uma única vez em retries', async () => {
    const session = await guest(), key = crypto.randomUUID(), p = products[0];
    const before = await db.selectFrom('products').select('stock').where('id', '=', p.id).executeTakeFirstOrThrow();
    const first = await order(session, purchase(p, 2), key), second = await order(session, purchase(p, 2), key);
    expect(first.statusCode).toBe(201); expect(second.json().id).toBe(first.json().id); expect(first.json().total_cents).toBe(p.price_cents * 2);
    const after = await db.selectFrom('products').select('stock').where('id', '=', p.id).executeTakeFirstOrThrow();
    expect(after.stock).toBe(before.stock - 2);
    expect((await order(session, purchase(p, 1), key)).statusCode).toBe(409);
  });
  test('recusa quantidade negativa, produtos repetidos e preço adulterado', async () => {
    const session = await guest(), p = products[1];
    expect((await order(session, purchase(p, -1))).statusCode).toBe(400);
    expect((await order(session, { ...purchase(p), items: [...purchase(p).items, ...purchase(p).items] })).statusCode).toBe(400);
    expect((await order(session, { ...purchase(p), total_cents: 1 })).statusCode).toBe(400);
    expect((await order(session, { ...purchase(p), items: [{ product_id: p.id, quantity: 1, expected_price_cents: 1 }] })).statusCode).toBe(409);
  });
  test('compra simultânea da última unidade não vende além do estoque', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/admin/products', headers: headers(adminCookie), payload: productInput({ name: 'Última unidade', stock: 1 }) });
    const p = created.json(), a = await guest(), b = await guest();
    const results = await Promise.all([order(a, purchase(p)), order(b, purchase(p))]);
    expect(results.map(r => r.statusCode).sort()).toEqual([201, 409]);
    const stored = await db.selectFrom('products').select('stock').where('id', '=', p.id).executeTakeFirstOrThrow(); expect(stored.stock).toBe(0);
  });
  test('histórico privado preserva nome e preço após alteração e exclusão do doce', async () => {
    const a = await guest(), b = await guest();
    const created = (await app.inject({ method: 'POST', url: '/api/admin/products', headers: headers(adminCookie), payload: productInput({ name: 'Memória doce' }) })).json();
    const result = await order(a, purchase(created)); expect(result.statusCode).toBe(201);
    await app.inject({ method: 'DELETE', url: `/api/admin/products/${created.id}`, headers: headers(adminCookie) });
    const history = await app.inject({ url: '/api/orders', headers: headers(a) });
    expect(history.json().orders[0].items[0].name).toBe('Memória doce');
    expect(history.json().orders[0].total_cents).toBe(550);
    expect((await app.inject({ url: '/api/orders', headers: headers(b) })).json().orders).toEqual([]);
    expect((await app.inject('/api/orders')).json().orders).toEqual([]);
  });
  test('cancelamento repõe estoque apenas uma vez', async () => {
    const session = await guest(), p = products[2]; const response = await order(session, purchase(p));
    const id = response.json().id, before = await db.selectFrom('products').select('stock').where('id', '=', p.id).executeTakeFirstOrThrow();
    const cancel = () => app.inject({ method: 'PATCH', url: `/api/admin/orders/${id}/status`, headers: headers(adminCookie), payload: { status: 'cancelled' } });
    expect((await cancel()).statusCode).toBe(200); expect((await cancel()).statusCode).toBe(200);
    const after = await db.selectFrom('products').select('stock').where('id', '=', p.id).executeTakeFirstOrThrow(); expect(after.stock).toBe(before.stock + 1);
  });
  test('pagamento e situação exigem transições válidas e permissão', async () => {
    const session = await guest(), id = (await order(session, purchase(products[1]))).json().id;
    const status = (s: string) => app.inject({ method: 'PATCH', url: `/api/admin/orders/${id}/status`, headers: headers(adminCookie), payload: { status: s } });
    expect((await status('completed')).statusCode).toBe(409);
    expect((await status('preparing')).statusCode).toBe(200); expect((await status('ready')).statusCode).toBe(200);
    expect((await status('completed')).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `/api/admin/orders/${id}/paid`, headers: headers(session) })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: `/api/admin/orders/${id}/paid`, headers: headers(adminCookie) })).statusCode).toBe(200);
    expect((await status('completed')).statusCode).toBe(200);
  });
});

describe('Sessão e segurança de pagamentos', () => {
  test('rotaciona refresh token e revoga logout imediatamente', async () => {
    const original = await guest();
    const refreshed = await app.inject({ method: 'POST', url: '/api/auth/refresh', headers: headers(original) });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.cookies.every(c => c.httpOnly && c.sameSite?.toLowerCase() === 'lax')).toBe(true);
    expect((await app.inject({ method: 'POST', url: '/api/auth/refresh', headers: headers(original) })).statusCode).toBe(401);
    const next = cookies(refreshed);
    expect((await app.inject({ url: '/api/me', headers: headers(next) })).statusCode).toBe(200);
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: headers(next) });
    expect((await app.inject({ url: '/api/me', headers: headers(next) })).statusCode).toBe(401);
  });
  test('permissões alteradas no banco valem sem emitir novo JWT', async () => {
    await db.updateTable('users').set({ role: 'customer' }).where('email', '=', 'admin@test.local').execute();
    expect((await app.inject({ url: '/api/admin/products', headers: headers(adminCookie) })).statusCode).toBe(403);
    await db.updateTable('users').set({ role: 'admin' }).where('email', '=', 'admin@test.local').execute();
  });
  test('limite persistente bloqueia tentativa excedente', async () => {
    await rateLimit(db, 'rate-test', 1, 60); await expect(rateLimit(db, 'rate-test', 1, 60)).rejects.toMatchObject({ statusCode: 429 });
  });
  test('webhook exige HMAC correto, recurso correto e janela de tempo', () => {
    const ts = String(Math.floor(Date.now() / 1000)), secret = 'webhook-secret';
    const signature = createHmac('sha256', secret).update(`id:123;request-id:request-test;ts:${ts};`).digest('hex');
    expect(verifyWebhook(secret, `ts=${ts},v1=${signature}`, 'request-test', '123')).toBe(true);
    expect(verifyWebhook(secret, `ts=${ts},v1=${signature}`, 'request-test', '124')).toBe(false);
    expect(verifyWebhook(secret, `ts=${ts},v1=${signature}`, 'request-test', '123', Date.now() + 11 * 60 * 1000)).toBe(false);
    expect(verifyWebhook(secret, 'ts=0,v1=fake', 'request-test', '123')).toBe(false);
  });
  test('gateway sem credenciais não aceita compras online', async () => {
    expect((await order(await guest(), { ...purchase(products[0]), payment_method: 'mercadopago' })).statusCode).toBe(503);
  });
});
