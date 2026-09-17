import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2, MapPin, ShieldCheck, Banknote, CreditCard } from 'lucide-react';
import { api, queryClient, useMe, useShop, ApiError, invalidateCatalog } from '../api';
import { cartCount, cartTotal, useCart, useUi } from '../store';
import { money, type Product } from '../types';
import { Button, EmptyState, ErrorMessage, Field, Modal, ProductImage, Quantity } from './ui';

const schema = z.object({
  customer_name: z.string().trim().min(2, 'Como podemos chamar você?').max(80),
  phone: z.string().refine(s => /^\d{10,11}$/.test(s.replace(/\D/g, '')), 'Informe um telefone com DDD.'),
  notes: z.string().max(500, 'Use até 500 caracteres.'),
  payment_method: z.enum(['pickup', 'mercadopago']),
});
type Values = z.infer<typeof schema>;
async function checkoutKey(body: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const fingerprint = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  let saved: { fingerprint?: string; key?: string } = {};
  try { saved = JSON.parse(sessionStorage.getItem('da-checkout') || '{}'); } catch { /* Ignore corrupt browser storage. */ }
  if (saved.fingerprint === fingerprint && saved.key) return saved.key;
  const key = crypto.randomUUID();
  sessionStorage.setItem('da-checkout', JSON.stringify({ fingerprint, key })); return key;
}
export function CartDrawer() {
  const open = useUi(s => s.cartOpen), setOpen = useUi(s => s.setCartOpen);
  const items = useCart(s => s.items), setQuantity = useCart(s => s.setQuantity), remove = useCart(s => s.remove);
  const [step, setStep] = useState<'cart' | 'checkout'>('cart'), [error, setError] = useState<unknown>(null);
  const { data: shop } = useShop(), { data: me } = useMe();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { customer_name: '', phone: '', notes: '', payment_method: 'pickup' } });
  useEffect(() => { if (open) { setStep('cart'); setError(null); } }, [open]);
  useEffect(() => { if (me?.user && !me.user.guest) setValue('customer_name', me.user.name); }, [me, setValue]);
  async function submit(values: Values) {
    setError(null);
    try {
      if (!me?.user) {
        const guest = await api('/auth/guest', { method: 'POST' });
        queryClient.setQueryData(['me'], guest);
      }
      const body = JSON.stringify({ ...values, items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, expected_price_cents: i.price_cents })) });
      const key = await checkoutKey(body);
      const order = await api<{ id: string; code: string }>('/orders', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
      useCart.getState().clear(); sessionStorage.removeItem('da-checkout'); reset(); setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['orders'] }); void invalidateCatalog();
      navigate(`/pedidos?novo=${order.id}`);
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && ['PRICE_CHANGED', 'STOCK_CHANGED', 'UNAVAILABLE'].includes(e.code)) {
        try {
          const current = await api<Product[]>(`/products?atualizar=${Date.now()}`, { cache: 'no-store' });
          useCart.getState().reconcile(current); queryClient.setQueryData(['products'], current); setStep('cart');
        } catch { /* Preserve the original error and the saved cart. */ }
      }
    }
  }
  return <Modal open={open} onOpenChange={value => { if (!isSubmitting) setOpen(value); }} title={step === 'cart' ? 'Sua sacola de afeto' : 'Falta só um pouquinho'} description={step === 'cart' ? `${cartCount(items)} ${cartCount(items) === 1 ? 'docinho escolhido' : 'docinhos escolhidos'} para um dia mais feliz.` : 'Seus dados para preparar e identificar o pedido.'} drawer>
    {items.length === 0 ? <EmptyState icon={<ShoppingBag size={34} />} title="Tem espaço para um carinho" text="Escolha seu doce favorito. A gente guarda ele aqui para você."><Button onClick={() => { setOpen(false); navigate('/#cardapio'); }}>Explorar o cardápio <ArrowRight size={17} /></Button></EmptyState> : <>
      <div className="drawer-body">
        {step === 'cart' ? <><div className="cart-lines">{items.map(i => <div key={i.product_id} className="cart-line"><ProductImage src={i.image_url} name={i.name} /><div className="cart-line-content"><div className="cart-line-top"><strong>{i.name}</strong><button className="icon-button remove-item" aria-label={`Remover ${i.name}`} onClick={() => remove(i.product_id)}><Trash2 size={17} /></button></div><small>{i.unit}</small><div className="cart-line-bottom"><Quantity label={i.name} value={i.quantity} max={i.stock} onChange={n => setQuantity(i.product_id, n)} /><b>{money(i.price_cents * i.quantity)}</b></div></div></div>)}</div><button className="continue-shopping" onClick={() => setOpen(false)}><PlusSmall /> Escolher mais doces</button><div className="pickup-card"><MapPin size={20} /><div><strong>Retirada na loja</strong><p>{shop?.pickup_address || 'O local de retirada será informado pela loja.'}</p><small>{shop?.pickup_hours}</small></div></div></> : <>
          <button className="back-button" onClick={() => setStep('cart')} disabled={isSubmitting}><ArrowLeft size={17} /> Voltar para a sacola</button>
          <form id="checkout-form" onSubmit={handleSubmit(submit)} className="form-stack">
            <Field label="Seu nome" error={errors.customer_name?.message}><input autoComplete="name" placeholder="Como podemos chamar você?" {...register('customer_name')} aria-invalid={!!errors.customer_name} /></Field>
            <Field label="Telefone com DDD" error={errors.phone?.message} hint="Usado pela loja se precisar falar sobre o pedido."><input type="tel" autoComplete="tel-national" placeholder="(11) 99999-9999" {...register('phone')} aria-invalid={!!errors.phone} /></Field>
            <Field label="Algum pedido especial? (opcional)" error={errors.notes?.message}><textarea rows={3} placeholder="É para presente? Conte para a gente…" {...register('notes')} /></Field>
            <fieldset className="payment-options"><legend>Como prefere pagar?</legend><label className="payment-option"><input type="radio" value="pickup" {...register('payment_method')} /><Banknote size={23} /><span><strong>Na retirada</strong><small>Pague ao receber seus doces.</small></span></label>{shop?.online_payment && <label className="payment-option"><input type="radio" value="mercadopago" {...register('payment_method')} /><CreditCard size={23} /><span><strong>Mercado Pago</strong><small>Continue para Pix ou cartão após fazer o pedido.</small></span></label>}</fieldset>
            <div className="pickup-card compact"><MapPin size={20} /><div><strong>Retire seu pedido aqui</strong><p>{shop?.pickup_address}</p><small>{shop?.pickup_hours}</small></div></div>
            <p className="fine-print">Seus dados são usados para atender este pedido. Sem cadastro, o histórico fica neste navegador por até 30 dias. A situação “Pronto para retirar” confirma que você já pode buscar.</p>
          </form>
        </>}
        {error != null && <ErrorMessage error={error} />}
      </div>
      <div className="drawer-footer"><div className="total-line"><span>Subtotal</span><span>{money(cartTotal(items))}</span></div><div className="total-line muted"><span>Retirada</span><span>Grátis</span></div><div className="grand-total"><strong>Total</strong><strong>{money(cartTotal(items))}</strong></div>
        {step === 'cart' ? <Button className="full" onClick={() => { setStep('checkout'); setError(null); }} disabled={!shop?.orders_enabled}>Continuar pedido <ArrowRight size={18} /></Button> : <Button className="full" type="submit" form="checkout-form" loading={isSubmitting} disabled={!shop?.orders_enabled}>{shop?.demo ? 'Confirmar pedido de teste' : 'Confirmar meu pedido'} <ArrowRight size={18} /></Button>}
        {!shop?.orders_enabled && <p className="fine-print">A loja ainda está configurando os pedidos.</p>}
        <p className="checkout-assurance"><ShieldCheck size={14} />{shop?.demo ? 'Demonstração · nenhuma cobrança será feita' : 'Seus dados ficam protegidos'}</p>
      </div>
    </>}
  </Modal>;
}
function PlusSmall() { return <span aria-hidden="true">+</span>; }
