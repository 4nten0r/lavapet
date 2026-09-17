import type { Kysely, Transaction } from 'kysely';
import type { Database, OrderStatus } from './schema';
import type { Checkout } from './validation';
import { AppError } from './errors';
import { hash } from './auth';

export async function createOrder(db: Kysely<Database>, tenant: string, customerId: string, key: string, input: Checkout) {
  // Stable ordering avoids lock inversions between two carts containing the same products.
  const items = [...input.items].sort((a, b) => a.product_id.localeCompare(b.product_id));
  const requestHash = hash(JSON.stringify({ ...input, items }));
  return db.transaction().execute(async tx => {
    // Serialize this customer's checkout, including concurrent retries of the same key.
    await tx.selectFrom('users').select('id').where('tenant_id', '=', tenant).where('id', '=', customerId).forUpdate().executeTakeFirstOrThrow();
    const existing = await tx.selectFrom('orders').selectAll().where('tenant_id', '=', tenant).where('customer_id', '=', customerId).where('idempotency_key', '=', key).executeTakeFirst();
    if (existing) {
      if (existing.request_hash !== requestHash) throw new AppError(409, 'Este envio já foi usado com outro carrinho. Atualize a página.', 'IDEMPOTENCY_CONFLICT');
      return existing;
    }
    const products = await tx.selectFrom('products').selectAll().where('tenant_id', '=', tenant)
      .where('id', 'in', items.map(i => i.product_id)).orderBy('id').forUpdate().execute();
    let total = 0;
    for (const item of items) {
      const p = products.find(p => p.id === item.product_id);
      if (!p || p.deleted_at || !p.available) throw new AppError(409, 'Um doce não está mais disponível. Revise o carrinho.', 'UNAVAILABLE');
      if (p.stock < item.quantity) throw new AppError(409, `Temos apenas ${p.stock} de ${p.name}. Revise a quantidade.`, 'STOCK_CHANGED');
      if (p.price_cents !== item.expected_price_cents) throw new AppError(409, `O preço de ${p.name} mudou. Revise o carrinho antes de confirmar.`, 'PRICE_CHANGED');
      total += p.price_cents * item.quantity;
    }
    const order = await tx.insertInto('orders').values({
      id: crypto.randomUUID(), tenant_id: tenant, customer_id: customerId,
      code: `DA-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
      customer_name: input.customer_name, phone: input.phone, notes: input.notes, total_cents: total,
      status: 'received', payment_method: input.payment_method, payment_status: 'pending',
      idempotency_key: key, request_hash: requestHash, checkout_url: null, payment_id: null,
    }).returningAll().executeTakeFirstOrThrow();
    for (const item of items) {
      const p = products.find(p => p.id === item.product_id)!;
      await tx.updateTable('products').set({ stock: p.stock - item.quantity, version: p.version + 1, updated_at: new Date() })
        .where('tenant_id', '=', tenant).where('id', '=', p.id).execute();
      await tx.insertInto('order_items').values({
        id: crypto.randomUUID(), tenant_id: tenant, order_id: order.id, product_id: p.id,
        name: p.name, image_url: p.image_url, unit: p.unit, price_cents: p.price_cents, quantity: item.quantity,
      }).execute();
    }
    return order;
  });
}

export async function listOrders(db: Kysely<Database>, tenant: string, page: number, customerId?: string) {
  let query = db.selectFrom('orders').where('tenant_id', '=', tenant);
  if (customerId) query = query.where('customer_id', '=', customerId);
  const rows = await query.selectAll().orderBy('created_at', 'desc').orderBy('id').limit(21).offset((page - 1) * 20).execute();
  const visible = rows.slice(0, 20);
  const items = visible.length ? await db.selectFrom('order_items').selectAll().where('tenant_id', '=', tenant).where('order_id', 'in', visible.map(o => o.id)).execute() : [];
  return { orders: visible.map(o => {
    const { idempotency_key, request_hash, customer_id, tenant_id, ...safe } = o;
    return { ...safe, items: items.filter(i => i.order_id === o.id) };
  }), hasMore: rows.length > 20 };
}

export const transitions: Record<OrderStatus, OrderStatus[]> = {
  received: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['completed', 'cancelled'], completed: [], cancelled: [],
};
export async function releaseStock(tx: Transaction<Database>, tenant: string, id: string) {
  const items = await tx.selectFrom('order_items').selectAll().where('tenant_id', '=', tenant).where('order_id', '=', id).orderBy('product_id').execute();
  for (const item of items) {
    await tx.updateTable('products').set(eb => ({ stock: eb('stock', '+', item.quantity), version: eb('version', '+', 1), updated_at: new Date() }))
      .where('tenant_id', '=', tenant).where('id', '=', item.product_id).execute();
  }
}
export async function changeStatus(db: Kysely<Database>, tenant: string, id: string, status: OrderStatus) {
  return db.transaction().execute(async tx => {
    const order = await tx.selectFrom('orders').selectAll().where('id', '=', id).where('tenant_id', '=', tenant).forUpdate().executeTakeFirst();
    if (!order) throw new AppError(404, 'Pedido não encontrado.');
    if (order.status === status) return order;
    if (!transitions[order.status].includes(status)) throw new AppError(409, 'Essa mudança de situação não é permitida.');
    if (status === 'cancelled' && !['pending', 'refunded'].includes(order.payment_status)) throw new AppError(409, 'Este pedido tem um pagamento. Resolva o estorno antes de cancelar.');
    if (status !== 'cancelled' && order.payment_method === 'mercadopago' && order.payment_status !== 'paid') throw new AppError(409, 'Aguarde a confirmação do pagamento.');
    if (status === 'completed' && order.payment_status !== 'paid') throw new AppError(409, 'Confirme o recebimento do pagamento antes de concluir.');
    if (status === 'cancelled' && !order.stock_released) await releaseStock(tx, tenant, id);
    return tx.updateTable('orders').set({ status, updated_at: new Date(), ...(status === 'cancelled' ? { stock_released: true } : {}) }).where('id', '=', id).where('tenant_id', '=', tenant).returningAll().executeTakeFirstOrThrow();
  });
}
