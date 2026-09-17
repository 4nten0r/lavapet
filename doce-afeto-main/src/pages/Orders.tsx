import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ReceiptText, RefreshCw, ArrowRight, Heart, UserRound } from 'lucide-react';
import { api, useMe } from '../api';
import { useUi } from '../store';
import type { OrderPage } from '../types';
import { Button, EmptyState, ErrorMessage } from '../components/ui';
import { OrderCard } from '../components/OrderCard';

export default function Orders() {
  const [page, setPage] = useState(1), [params] = useSearchParams();
  const { data: me } = useMe(), setAuthOpen = useUi(s => s.setAuthOpen);
  const { data, isPending, isFetching, error, refetch } = useQuery({ queryKey: ['orders', me?.user?.id, page], queryFn: () => api<OrderPage>(`/orders?page=${page}`), staleTime: 0 });
  return <div className="container page-content orders-page"><div className="page-heading"><div><p className="eyebrow">CADA PEDIDO, UM CARINHO</p><h1>Meus pedidos</h1><p>Acompanhe seus doces e relembre seus favoritos.</p></div><Button variant="secondary" onClick={() => void refetch()} loading={isFetching}><RefreshCw size={16} /> Atualizar</Button></div>
    {params.has('novo') && data?.orders.some(o => o.id === params.get('novo')) && <div className="success-banner" role="status"><CheckCircle2 size={25} /><div><strong>Pedido recebido com carinho!</strong><p>Acompanhe aqui. Se escolheu pagar online, abra o pagamento no pedido abaixo.</p></div><Heart size={22} /></div>}
    {params.has('retorno') && <div className="info-banner">O resultado do pagamento é confirmado pelo Mercado Pago. Use “Atualizar” para conferir a confirmação.</div>}
    {(!me?.user || me.user.guest) && <div className="guest-history"><UserRound size={20} /><p>Este é o histórico deste navegador, disponível por até 30 dias. <button onClick={() => setAuthOpen(true)}>Entre ou crie uma conta</button> para levar seus pedidos com você.</p></div>}
    {error ? <ErrorMessage error={error} retry={() => void refetch()} /> : isPending ? <div className="loading-block" aria-busy="true">Buscando seus pedidos…</div> : data?.orders.length ? <div className="order-list">{data.orders.map(order => <OrderCard key={order.id} order={order} />)}</div> : <EmptyState icon={<ReceiptText size={32} />} title="Seu primeiro doce está esperando" text="Quando você fizer um pedido, ele vai aparecer aqui com todos os detalhes."><Link className="button button-primary" to="/">Escolher meus doces <ArrowRight size={17} /></Link></EmptyState>}
    {(page > 1 || data?.hasMore) && <div className="pagination"><Button variant="secondary" disabled={page === 1 || isFetching} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page}</span><Button variant="secondary" disabled={!data?.hasMore || isFetching} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>}
  </div>;
}
