import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import type { Database } from './schema';
import type { Config } from './config';
import { paymentsEnabled } from './config';
import { AppError } from './errors';

async function mercadoPago(config: Config, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init, signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${config.MERCADO_PAGO_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) throw new AppError(502, 'O Mercado Pago está indisponível. Seu pedido foi salvo; tente abrir o pagamento novamente pelo histórico.', 'PAYMENT_UNAVAILABLE');
  return response.json();
}

export async function checkoutUrl(db: Kysely<Database>, config: Config, orderId: string, customerId: string) {
  if (!paymentsEnabled(config)) throw new AppError(503, 'O pagamento online ainda não está disponível.');
  return db.transaction().execute(async tx => {
    const order = await tx.selectFrom('orders').selectAll().where('tenant_id', '=', config.TENANT_ID).where('id', '=', orderId)
      .where('customer_id', '=', customerId).forUpdate().executeTakeFirst();
    if (!order) throw new AppError(404, 'Pedido não encontrado.');
    if (order.payment_method !== 'mercadopago' || order.payment_status !== 'pending' || order.status === 'cancelled') throw new AppError(409, 'Este pedido não tem pagamento online pendente.');
    if (order.checkout_url) return order.checkout_url;
    const items = await tx.selectFrom('order_items').selectAll().where('tenant_id', '=', config.TENANT_ID).where('order_id', '=', order.id).execute();
    const result = await mercadoPago(config, '/checkout/preferences', { method: 'POST', headers: { 'X-Idempotency-Key': order.id }, body: JSON.stringify({
      external_reference: order.id,
      metadata: { tenant_id: config.TENANT_ID },
      items: items.map(i => ({ id: i.product_id, title: i.name, quantity: i.quantity, unit_price: i.price_cents / 100, currency_id: 'BRL' })),
      payer: { name: order.customer_name },
      back_urls: { success: `${config.APP_ORIGIN}/pedidos?retorno=pagamento`, pending: `${config.APP_ORIGIN}/pedidos?retorno=pagamento`, failure: `${config.APP_ORIGIN}/pedidos?retorno=pagamento` },
      auto_return: 'approved', notification_url: `${config.API_PUBLIC_URL.replace(/\/$/, '')}/api/payments/webhook`,
      statement_descriptor: 'DOCE AFETO',
    }) });
    const url = config.MERCADO_PAGO_SANDBOX === 'true' ? result.sandbox_init_point : result.init_point;
    if (typeof url !== 'string') throw new AppError(502, 'Não foi possível abrir o pagamento.');
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !['www.mercadopago.com.br', 'sandbox.mercadopago.com.br'].includes(parsed.hostname)) throw new AppError(502, 'O provedor retornou um endereço inválido.');
    await tx.updateTable('orders').set({ checkout_url: url }).where('id', '=', order.id).where('tenant_id', '=', config.TENANT_ID).execute();
    return url;
  });
}

export function verifyWebhook(secret: string, signature: string, requestId: string, dataId: string, now = Date.now()) {
  const pairs = Object.fromEntries(signature.split(',').map(s => s.trim().split('=')));
  if (!/^\d{10,13}$/.test(pairs.ts ?? '') || !/^[a-f0-9]{64}$/i.test(pairs.v1 ?? '') || !requestId || !dataId) return false;
  const milliseconds = pairs.ts.length === 13 ? Number(pairs.ts) : Number(pairs.ts) * 1000;
  if (Math.abs(now - milliseconds) > 10 * 60 * 1000) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${pairs.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(pairs.v1, 'hex'));
}

const paymentSchema = z.object({
  id: z.union([z.number(), z.string()]), external_reference: z.uuid(), status: z.string(),
  transaction_amount: z.number(), currency_id: z.string(), collector_id: z.union([z.number(), z.string()]),
  live_mode: z.boolean(), date_last_updated: z.string(), metadata: z.object({ tenant_id: z.string() }),
});

export async function syncPayment(db: Kysely<Database>, config: Config, paymentId: string) {
  const parsed = paymentSchema.safeParse(await mercadoPago(config, `/v1/payments/${encodeURIComponent(paymentId)}`));
  if (!parsed.success) throw new AppError(422, 'Pagamento sem os dados esperados.');
  const payment = parsed.data;
  if (String(payment.id) !== paymentId || payment.metadata.tenant_id !== config.TENANT_ID || String(payment.collector_id) !== config.MERCADO_PAGO_COLLECTOR_ID || payment.currency_id !== 'BRL' || payment.live_mode !== (config.MERCADO_PAGO_SANDBOX === 'false')) throw new AppError(422, 'Pagamento incompatível com esta loja.');
  const timestamp = new Date(payment.date_last_updated);
  if (!Number.isFinite(timestamp.getTime())) throw new AppError(422, 'Data de pagamento inválida.');
  await db.transaction().execute(async tx => {
    const order = await tx.selectFrom('orders').selectAll().where('tenant_id', '=', config.TENANT_ID).where('id', '=', payment.external_reference).forUpdate().executeTakeFirst();
    if (!order || order.payment_method !== 'mercadopago' || order.total_cents !== Math.round(payment.transaction_amount * 100)) throw new AppError(422, 'O valor do pagamento não corresponde ao pedido.');
    // Never fulfill twice if the provider receives two payments for one order.
    if ((order.payment_id && order.payment_id !== paymentId && payment.status === 'approved') || (order.status === 'cancelled' && payment.status === 'approved')) {
      await tx.updateTable('orders').set({ payment_status: 'review', updated_at: new Date() }).where('id', '=', order.id).where('tenant_id', '=', config.TENANT_ID).execute();
      return;
    }
    if (order.payment_updated_at && new Date(order.payment_updated_at) >= timestamp) return;
    const next = payment.status === 'approved' ? 'paid' : payment.status === 'refunded' ? 'refunded' : payment.status === 'charged_back' ? 'review' : 'pending';
    if (next === 'pending') return;
    await tx.updateTable('orders').set({ payment_status: next, payment_id: paymentId, payment_updated_at: timestamp, updated_at: new Date() })
      .where('tenant_id', '=', config.TENANT_ID).where('id', '=', order.id).execute();
  });
}
