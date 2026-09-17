import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { z, ZodError } from 'zod';
import { sql, type Kysely } from 'kysely';
import type { Database } from './schema';
import { paymentsEnabled, type Config } from './config';
import { Auth, hashPassword, publicUser, rateLimit } from './auth';
import { AppError } from './errors';
import { checkoutSchema, loginSchema, pageSchema, productSchema, signupSchema } from './validation';
import { changeStatus, createOrder, listOrders } from './orders';
import { checkoutUrl, syncPayment, verifyWebhook } from './payments';

export function createApp(db: Kysely<Database>, config: Config) {
  const tenant = config.TENANT_ID;
  const app = Fastify({
    bodyLimit: 32 * 1024,
    // Vercel supplies a trusted edge address; forwarded headers elsewhere aren't trusted.
    trustProxy: false,
    logger: config.NODE_ENV === 'test' ? false : { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] },
    disableRequestLogging: true,
  });
  const auth = new Auth(db, config);
  app.register(cookie);
  app.register(helmet, { contentSecurityPolicy: false });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.status(400).send({ error: 'Revise os campos informados.', code: 'VALIDATION_ERROR', fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
    if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message, code: error.code });
    if ((error as { code?: string }).code === '23505') return reply.status(409).send({ error: 'Este registro já existe. Confira os dados.', code: 'CONFLICT' });
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) return reply.status(status).send({ error: 'Requisição inválida.' });
    request.log.error({ requestId: request.id, errorType: error instanceof Error ? error.name : 'Unknown' }, 'Falha na API');
    return reply.status(500).send({ error: 'Não foi possível concluir. Tente novamente em instantes.', code: 'INTERNAL_ERROR' });
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.url.split('?')[0] !== '/api/payments/webhook') {
      // Require a custom header and an exact origin; cross-site form POSTs cannot satisfy this.
      if (request.headers['x-requested-with'] !== 'DoceAfeto' || (request.headers.origin && request.headers.origin !== config.APP_ORIGIN)) throw new AppError(403, 'Origem da solicitação não permitida.');
      const edgeIp = process.env.VERCEL ? request.headers['x-vercel-forwarded-for'] : undefined;
      const ip = typeof edgeIp === 'string' ? edgeIp.split(',')[0].trim() : request.ip;
      await rateLimit(db, `${tenant}:write:${ip}`, 60, 60);
      if (request.url === '/api/auth/login' || request.url === '/api/auth/signup') await rateLimit(db, `${tenant}:auth:${ip}`, 5, 900);
    }
  });
  app.get('/api/health', async () => ({ ok: true }));
  app.get('/api/shop', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=60');
    return { name: config.SHOP_NAME, demo: config.demo, pickup_address: config.SHOP_PICKUP_ADDRESS, pickup_hours: config.SHOP_PICKUP_HOURS,
      orders_enabled: config.demo || !!(config.SHOP_PICKUP_ADDRESS && config.SHOP_PICKUP_HOURS), online_payment: paymentsEnabled(config) };
  });
  app.get('/api/products', async (_request, reply) => {
    // Public menu can be cached at the edge; checkout always reads current DB values.
    reply.header('Cache-Control', 'public, max-age=15, s-maxage=60, stale-while-revalidate=120');
    const products = await db.selectFrom('products').selectAll().where('tenant_id', '=', tenant).where('deleted_at', 'is', null).where('available', '=', true).orderBy('featured', 'desc').orderBy('created_at').limit(200).execute();
    return products.map(({ tenant_id, deleted_at, ...p }) => p);
  });
  app.get('/api/me', async request => { const u = await auth.current(request); return { user: u ? publicUser(u) : null }; });
  app.post('/api/auth/guest', async (request, reply) => {
    const current = await auth.current(request);
    if (current) return { user: publicUser(current) };
    const user = await db.insertInto('users').values({ id: crypto.randomUUID(), tenant_id: tenant, name: 'Visitante', email: null, password_hash: null, role: 'customer' }).returningAll().executeTakeFirstOrThrow();
    await auth.issue(db, user, reply); return { user: publicUser(user) };
  });
  app.post('/api/auth/signup', async (request, reply) => {
    const data = signupSchema.parse(request.body);
    const current = await auth.current(request);
    if (current?.email) throw new AppError(409, 'Você já está conectado.');
    const password_hash = await hashPassword(data.password);
    return db.transaction().execute(async tx => {
      const user = current
        ? await tx.updateTable('users').set({ name: data.name, email: data.email, password_hash }).where('tenant_id', '=', tenant).where('id', '=', current.id).returningAll().executeTakeFirstOrThrow()
        : await tx.insertInto('users').values({ id: crypto.randomUUID(), tenant_id: tenant, name: data.name, email: data.email, password_hash, role: 'customer' }).returningAll().executeTakeFirstOrThrow();
      await auth.issue(tx, user, reply); return { user: publicUser(user) };
    });
  });
  app.post('/api/auth/login', async (request, reply) => {
    const data = loginSchema.parse(request.body);
    await rateLimit(db, `${tenant}:login-account:${data.email}`, 5, 900);
    const user = await db.selectFrom('users').selectAll().where('tenant_id', '=', tenant).where('email', '=', data.email).executeTakeFirst();
    // Do comparable work for missing accounts, without revealing their existence.
    const valid = user?.password_hash ? await Bun.password.verify(data.password, user.password_hash) : (await hashPassword(data.password), false);
    if (!valid || !user) throw new AppError(401, 'E-mail ou senha incorretos.', 'INVALID_CREDENTIALS');
    let current = null;
    try { current = await auth.current(request); } catch { /* An expired session may log in again. */ }
    return db.transaction().execute(async tx => {
      if (current && !current.email && current.id !== user.id) {
        await tx.updateTable('orders').set({ customer_id: user.id }).where('tenant_id', '=', tenant).where('customer_id', '=', current.id).execute();
        await tx.deleteFrom('sessions').where('tenant_id', '=', tenant).where('user_id', '=', current.id).execute();
      }
      await auth.issue(tx, user, reply); return { user: publicUser(user) };
    });
  });
  app.post('/api/auth/refresh', async (request, reply) => {
    try { await auth.refresh(request, reply); return { ok: true }; }
    catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        reply.clearCookie('da_access', { path: '/api' }); reply.clearCookie('da_refresh', { path: '/api' });
      }
      throw error;
    }
  });
  app.post('/api/auth/logout', async (request, reply) => { await auth.logout(request, reply); return { ok: true }; });
  app.post('/api/orders', async (request, reply) => {
    const user = await auth.require(request);
    const input = checkoutSchema.parse(request.body);
    const key = z.uuid().parse(request.headers['idempotency-key']);
    if (!config.demo && !(config.SHOP_PICKUP_ADDRESS && config.SHOP_PICKUP_HOURS)) throw new AppError(503, 'A loja ainda está organizando a retirada. Volte em breve.');
    if (input.payment_method === 'mercadopago' && !paymentsEnabled(config)) throw new AppError(503, 'Pagamento online indisponível. Escolha pagar na retirada.');
    const order = await createOrder(db, tenant, user.id, key, input);
    reply.status(201); return { id: order.id, code: order.code, total_cents: order.total_cents };
  });
  app.get('/api/orders', async request => {
    const user = await auth.current(request);
    if (!user) return { orders: [], hasMore: false };
    return listOrders(db, tenant, pageSchema.parse(request.query).page, user.id);
  });
  app.post('/api/orders/:id/payment', async request => {
    const user = await auth.require(request);
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    return { url: await checkoutUrl(db, config, id, user.id) };
  });
  app.post('/api/payments/webhook', async (request, reply) => {
    if (!paymentsEnabled(config)) throw new AppError(503, 'Pagamentos indisponíveis.');
    const q = z.object({ 'data.id': z.string().regex(/^\d{1,30}$/) }).parse(request.query);
    const signature = request.headers['x-signature'], requestId = request.headers['x-request-id'];
    if (typeof signature !== 'string' || typeof requestId !== 'string' || !verifyWebhook(config.MERCADO_PAGO_WEBHOOK_SECRET, signature, requestId, q['data.id'])) throw new AppError(401, 'Assinatura inválida.');
    // The body never determines a payment's value or approval status.
    await syncPayment(db, config, q['data.id']); return reply.status(200).send({ ok: true });
  });
  app.get('/api/admin/products', async request => {
    await auth.require(request, 'admin');
    return db.selectFrom('products').selectAll().where('tenant_id', '=', tenant).where('deleted_at', 'is', null).orderBy('created_at').limit(200).execute();
  });
  app.post('/api/admin/products', async (request, reply) => {
    await auth.require(request, 'admin'); const input = productSchema.parse(request.body);
    const product = await db.transaction().execute(async tx => {
      await tx.selectFrom('tenants').select('id').where('id', '=', tenant).forUpdate().executeTakeFirstOrThrow();
      const { count } = await tx.selectFrom('products').select(eb => eb.fn.countAll<number>().as('count')).where('tenant_id', '=', tenant).where('deleted_at', 'is', null).executeTakeFirstOrThrow();
      if (Number(count) >= 200) throw new AppError(409, 'O cardápio comporta até 200 produtos. Remova itens antigos antes de adicionar.');
      return tx.insertInto('products').values({ ...input, id: crypto.randomUUID(), tenant_id: tenant }).returningAll().executeTakeFirstOrThrow();
    });
    reply.status(201); return product;
  });
  app.put('/api/admin/products/:id', async request => {
    await auth.require(request, 'admin');
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { version, ...input } = productSchema.extend({ version: z.number().int().positive() }).parse(request.body);
    const product = await db.updateTable('products').set({ ...input, version: version + 1, updated_at: new Date() })
      .where('tenant_id', '=', tenant).where('id', '=', id).where('version', '=', version).where('deleted_at', 'is', null).returningAll().executeTakeFirst();
    if (!product) throw new AppError(409, 'O doce foi atualizado em outro lugar. Reabra a edição para carregar os dados atuais.');
    return product;
  });
  app.delete('/api/admin/products/:id', async request => {
    await auth.require(request, 'admin');
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const product = await db.updateTable('products').set({ deleted_at: new Date(), available: false }).where('tenant_id', '=', tenant).where('id', '=', id).where('deleted_at', 'is', null).returning('id').executeTakeFirst();
    if (!product) throw new AppError(404, 'Doce não encontrado.');
    return { ok: true };
  });
  app.get('/api/admin/orders', async request => { await auth.require(request, 'admin'); return listOrders(db, tenant, pageSchema.parse(request.query).page); });
  app.patch('/api/admin/orders/:id/status', async request => {
    await auth.require(request, 'admin'); const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { status } = z.object({ status: z.enum(['received', 'preparing', 'ready', 'completed', 'cancelled']) }).strict().parse(request.body);
    return changeStatus(db, tenant, id, status);
  });
  app.post('/api/admin/orders/:id/paid', async request => {
    await auth.require(request, 'admin'); const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const updated = await db.updateTable('orders').set({ payment_status: 'paid', updated_at: new Date() }).where('tenant_id', '=', tenant).where('id', '=', id)
      .where('payment_method', '=', 'pickup').where('status', '!=', 'cancelled').where('payment_status', '=', 'pending').returning('id').executeTakeFirst();
    if (!updated) throw new AppError(409, 'O pagamento não pode ser alterado. Atualize os pedidos.');
    return { ok: true };
  });
  return app;
}
