import { useState } from 'react';
import { Check, ChevronDown, ExternalLink, ReceiptText } from 'lucide-react';
import { api, queryClient, invalidateCatalog } from '../api';
import { dateTime, money, statusLabels, type Order, type OrderStatus } from '../types';
import { Button, ErrorMessage, Modal, ProductImage } from './ui';

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = { received: 'preparing', preparing: 'ready', ready: 'completed' };
export function OrderCard({ order, admin = false }: { order: Order; admin?: boolean }) {
  const [pending, setPending] = useState(false), [error, setError] = useState<unknown>(null);
  const [confirmation, setConfirmation] = useState<'paid' | 'cancelled' | null>(null);
  async function update(action: OrderStatus | 'paid') {
    setPending(true); setError(null);
    try {
      await api(`/admin/orders/${order.id}/${action === 'paid' ? 'paid' : 'status'}`, { method: action === 'paid' ? 'POST' : 'PATCH', ...(action === 'paid' ? {} : { body: JSON.stringify({ status: action }) }) });
      setConfirmation(null); await queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); await queryClient.invalidateQueries({ queryKey: ['orders'] }); void invalidateCatalog();
    } catch (e) { setError(e); } finally { setPending(false); }
  }
  async function pay() {
    setPending(true); setError(null);
    try { const { url } = await api<{ url: string }>(`/orders/${order.id}/payment`, { method: 'POST' }); window.location.assign(url); }
    catch (e) { setError(e); setPending(false); }
  }
  return <article className="order-card"><div className="order-top"><div><span className="order-code"><ReceiptText size={16} />{order.code}</span><time dateTime={order.created_at}>{dateTime(order.created_at)}</time></div><span className={`status-badge status-${order.status}`}>{statusLabels[order.status]}</span></div>
    {admin && <div className="customer-info"><strong>{order.customer_name}</strong><a href={`tel:${order.phone}`}>{order.phone}</a></div>}
    <div className="order-summary"><div className="order-thumbnails">{order.items.slice(0, 3).map(i => <ProductImage key={i.id} src={i.image_url} name={i.name} />)}</div><div><p>{order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p><small>{order.payment_method === 'pickup' ? 'Pagamento na retirada' : 'Mercado Pago'} · Retirada na loja</small></div><strong>{money(order.total_cents)}</strong></div>
    {order.status !== 'cancelled' && order.status !== 'completed' && <div className="order-progress" aria-label={`Andamento: ${statusLabels[order.status]}`}>{(['received', 'preparing', 'ready'] as const).map((s, i) => <div key={s} className={['received', 'preparing', 'ready'].indexOf(order.status) >= i ? 'done' : ''}><span>{['received', 'preparing', 'ready'].indexOf(order.status) > i ? <Check size={12} /> : i + 1}</span><small>{statusLabels[s]}</small></div>)}</div>}
    <details className="order-details"><summary>Detalhes do pedido <ChevronDown size={16} /></summary><div>{order.items.map(i => <div className="receipt-line" key={i.id}><span>{i.quantity}× {i.name}<small>{money(i.price_cents)} por item</small></span><span>{money(i.price_cents * i.quantity)}</span></div>)}<div className="receipt-line"><strong>Total da compra</strong><strong>{money(order.total_cents)}</strong></div><p><b>Em nome de:</b> {order.customer_name}</p>{order.notes && <p><b>Observações:</b> {order.notes}</p>}</div></details>
    <div className="order-payment"><span className={`payment-state payment-${order.payment_status}`}>{({ pending: 'Pagamento pendente', paid: 'Pagamento recebido', refunded: 'Pagamento estornado', review: 'Pagamento em análise pela loja' })[order.payment_status]}</span>
      {!admin && order.payment_method === 'mercadopago' && order.payment_status === 'pending' && order.status !== 'cancelled' && <Button loading={pending} variant="secondary" onClick={pay}>Ir para pagamento <ExternalLink size={15} /></Button>}
    </div>
    {admin && order.status !== 'completed' && order.status !== 'cancelled' && <div className="admin-order-actions">
      {order.payment_method === 'pickup' && order.payment_status === 'pending' && <Button variant="secondary" onClick={() => setConfirmation('paid')}>Registrar pagamento</Button>}
      <Button loading={pending} disabled={(order.payment_method === 'mercadopago' && order.payment_status !== 'paid') || (order.status === 'ready' && order.payment_status !== 'paid')} onClick={() => void update(nextStatus[order.status]!)}>{order.status === 'received' ? 'Começar preparo' : order.status === 'preparing' ? 'Pronto para retirar' : 'Concluir pedido'}</Button>
      {['pending', 'refunded'].includes(order.payment_status) && <Button variant="ghost" onClick={() => setConfirmation('cancelled')}>Cancelar pedido</Button>}
    </div>}
    {error != null && !confirmation && <ErrorMessage error={error} />}
    <Modal open={!!confirmation} onOpenChange={open => { if (!open && !pending) { setConfirmation(null); setError(null); } }} title={confirmation === 'paid' ? 'O pagamento já foi recebido?' : 'Cancelar este pedido?'} description={confirmation === 'paid' ? `Confirme somente depois de receber ${money(order.total_cents)} do pedido ${order.code}.` : `O pedido ${order.code} será cancelado e os doces retornarão ao estoque.`}>
      <div className="confirmation-content">{error != null && <ErrorMessage error={error} />}<div className="dialog-actions"><Button variant="secondary" onClick={() => setConfirmation(null)} disabled={pending}>Voltar</Button><Button variant={confirmation === 'cancelled' ? 'danger' : 'primary'} loading={pending} onClick={() => void update(confirmation!)}>{confirmation === 'paid' ? 'Sim, recebi o pagamento' : 'Confirmar cancelamento'}</Button></div></div>
    </Modal>
  </article>;
}
