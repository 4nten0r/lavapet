import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Candy, Package, Plus, Pencil, Trash2, LockKeyhole, ReceiptText, RefreshCw, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, invalidateCatalog, useMe, useShop } from '../api';
import { useUi } from '../store';
import { categories, money, type OrderPage, type Product } from '../types';
import { Button, EmptyState, ErrorMessage, Field, Modal, ProductImage } from '../components/ui';
import { OrderCard } from '../components/OrderCard';

const formSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do doce.').max(90),
  description: z.string().trim().min(10, 'Escreva uma descrição com pelo menos 10 caracteres.').max(800),
  category: z.enum(categories), price: z.string().regex(/^\d{1,4}([,.]\d{1,2})?$/, 'Use um valor como 12,50.').refine(s => Number(s.replace(',', '.')) > 0 && Number(s.replace(',', '.')) <= 1000, 'Informe um valor entre R$ 0,01 e R$ 1.000,00.'),
  stock: z.string().regex(/^\d+$/, 'Informe uma quantidade inteira.').refine(s => Number(s) <= 10000, 'O limite é 10.000 unidades.'),
  unit: z.string().trim().min(2, 'Informe a porção.').max(60),
  image_url: z.string().min(1, 'Selecione uma foto.').max(1500),
  allergens: z.string().max(600), available: z.boolean(), featured: z.boolean(),
});
type ProductValues = z.infer<typeof formSchema>;
const defaultProduct: ProductValues = { name: '', description: '', category: 'Brigadeiros', price: '', stock: '10', unit: '1 unidade', image_url: '/images/brigadeiro.webp', allergens: '', available: true, featured: false };
export default function Admin() {
  const { data: me, isPending: loadingMe, error: meError } = useMe(), { data: shop } = useShop();
  const [tab, setTab] = useState<'products' | 'orders'>('products'), [page, setPage] = useState(1), [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Product | 'new' | null>(null), [deleting, setDeleting] = useState<Product | null>(null), [deleteError, setDeleteError] = useState<unknown>(null), [isDeleting, setIsDeleting] = useState(false);
  const setAuthOpen = useUi(s => s.setAuthOpen), allowed = me?.user?.role === 'admin';
  const productsQuery = useQuery({ queryKey: ['admin-products', me?.user?.id], queryFn: () => api<Product[]>('/admin/products'), enabled: allowed, staleTime: 0 });
  const ordersQuery = useQuery({ queryKey: ['admin-orders', me?.user?.id, page], queryFn: () => api<OrderPage>(`/admin/orders?page=${page}`), enabled: allowed && tab === 'orders', staleTime: 0 });
  async function deleteProduct() {
    if (!deleting) return; setIsDeleting(true); setDeleteError(null);
    try { await api(`/admin/products/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); await invalidateCatalog(); toast.success('Doce removido do cardápio.'); }
    catch (e) { setDeleteError(e); } finally { setIsDeleting(false); }
  }
  if (loadingMe) return <div className="container loading-block">Abrindo a gestão…</div>;
  if (!allowed) return <div className="container page-content"><EmptyState icon={<LockKeyhole size={30} />} title="O cantinho de quem faz" text="Entre com sua conta de administração para cuidar dos doces e acompanhar os pedidos."><Button onClick={() => setAuthOpen(true)}>Entrar na gestão</Button><Link to="/" className="text-link"><ArrowLeft size={15} /> Voltar ao cardápio</Link></EmptyState>{meError && <ErrorMessage error={meError} />}{shop?.demo && <div className="demo-credentials"><strong>Acesso exclusivo da demonstração local</strong><span>admin@doceafeto.local</span><code>DoceAfeto!2026</code></div>}</div>;
  const products = productsQuery.data ?? [];
  return <div className="container page-content admin-page"><div className="page-heading"><div><p className="eyebrow">BASTIDORES DA DOCERIA</p><h1>Seu cantinho de gestão</h1><p>Olá, {me.user!.name.split(' ')[0]}. Vamos preparar coisas boas?</p></div><Link to="/" className="button button-secondary">Ver cardápio</Link></div>
    <div className="admin-stats"><div><span><Candy size={19} /> No cardápio</span><strong>{products.length}<small> doces cadastrados</small></strong></div><div><span><Package size={19} /> Disponíveis</span><strong>{products.filter(p => p.available && p.stock > 0).length}<small> prontos para pedir</small></strong></div><div><span><ReceiptText size={19} /> Olho no estoque</span><strong>{products.filter(p => p.stock <= 5).length}<small> com até 5 unidades</small></strong></div></div>
    <div className="admin-toolbar"><div className="admin-tabs" role="group" aria-label="Área de gestão"><button aria-pressed={tab === 'products'} className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Candy size={18} /> Meus doces</button><button aria-pressed={tab === 'orders'} className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ReceiptText size={18} /> Pedidos</button></div><Button variant="ghost" loading={tab === 'products' ? productsQuery.isFetching : ordersQuery.isFetching} onClick={() => void (tab === 'products' ? productsQuery.refetch() : ordersQuery.refetch())}><RefreshCw size={17} /> Atualizar</Button></div>
    {tab === 'products' ? <><div className="admin-section-heading"><div className="search-box"><Search size={18} /><input placeholder="Buscar nos meus doces" aria-label="Buscar nos meus doces" value={search} onChange={e => setSearch(e.target.value)} /></div><Button onClick={() => setEditor('new')}><Plus size={18} /> Novo doce</Button></div>
      {productsQuery.error ? <ErrorMessage error={productsQuery.error} retry={() => void productsQuery.refetch()} /> : productsQuery.isPending ? <div className="loading-block">Buscando seus doces…</div> : <div className="admin-products">{products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <article key={p.id} className="admin-product"><ProductImage src={p.image_url} name={p.name} /><div className="admin-product-name"><h2>{p.name}</h2><span>{p.category} · {p.unit}</span></div><div className="admin-product-price"><strong>{money(p.price_cents)}</strong><small className={p.stock <= 5 ? 'low-stock' : ''}>{p.stock} em estoque</small></div><span className={`availability ${p.available && p.stock > 0 ? 'is-available' : ''}`}>{p.available ? p.stock ? 'Disponível' : 'Esgotado' : 'Pausado'}</span><div className="admin-row-actions"><button className="icon-button" aria-label={`Editar ${p.name}`} onClick={() => setEditor(p)}><Pencil size={18} /></button><button className="icon-button" aria-label={`Excluir ${p.name}`} onClick={() => { setDeleting(p); setDeleteError(null); }}><Trash2 size={18} /></button></div></article>)}{!products.length && <EmptyState icon={<Candy size={30} />} title="Um cardápio para chamar de seu" text="Cadastre o primeiro doce e ele aparecerá na loja."><Button onClick={() => setEditor('new')}>Cadastrar meu primeiro doce</Button></EmptyState>}</div>}
    </> : <>{ordersQuery.error ? <ErrorMessage error={ordersQuery.error} retry={() => void ordersQuery.refetch()} /> : ordersQuery.isPending ? <div className="loading-block">Buscando pedidos…</div> : ordersQuery.data?.orders.length ? <div className="order-list">{ordersQuery.data.orders.map(o => <OrderCard key={o.id} order={o} admin />)}</div> : <EmptyState icon={<ReceiptText size={30} />} title="Tudo em dia por aqui" text="Os pedidos vão aparecer aqui assim que alguém escolher seus doces." />}
      {(page > 1 || ordersQuery.data?.hasMore) && <div className="pagination"><Button variant="secondary" disabled={page === 1 || ordersQuery.isFetching} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page}</span><Button variant="secondary" disabled={!ordersQuery.data?.hasMore || ordersQuery.isFetching} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>}
    </>}
    <ProductEditor product={editor} onClose={() => setEditor(null)} />
    <Modal open={!!deleting} onOpenChange={value => { if (!value && !isDeleting) setDeleting(null); }} title="Tirar este doce do cardápio?" description={`${deleting?.name || 'Este doce'} deixará de aparecer para novas compras. Os pedidos anteriores serão preservados.`}><div className="confirmation-content">{deleteError != null && <ErrorMessage error={deleteError} />}<div className="dialog-actions"><Button variant="secondary" disabled={isDeleting} onClick={() => setDeleting(null)}>Manter doce</Button><Button variant="danger" loading={isDeleting} onClick={() => void deleteProduct()}>Excluir do cardápio</Button></div></div></Modal>
  </div>;
}
function ProductEditor({ product, onClose }: { product: Product | 'new' | null; onClose: () => void }) {
  const [error, setError] = useState<unknown>(null);
  const { register, reset, watch, setValue, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductValues>({ resolver: zodResolver(formSchema), defaultValues: defaultProduct });
  useEffect(() => { setError(null); reset(product && product !== 'new' ? { name: product.name, description: product.description, category: product.category as ProductValues['category'], price: (product.price_cents / 100).toFixed(2).replace('.', ','), stock: String(product.stock), unit: product.unit, image_url: product.image_url, allergens: product.allergens.join(', '), available: product.available, featured: product.featured } : defaultProduct); }, [product, reset]);
  async function save(values: ProductValues) {
    setError(null);
    const { price, allergens, stock, ...other } = values;
    const payload = { ...other, price_cents: Math.round(Number(price.replace(',', '.')) * 100), stock: Number(stock), allergens: allergens.split(',').map(s => s.trim()).filter(Boolean), ...(product && product !== 'new' ? { version: product.version } : {}) };
    try { await api(product === 'new' ? '/admin/products' : `/admin/products/${(product as Product).id}`, { method: product === 'new' ? 'POST' : 'PUT', body: JSON.stringify(payload) }); await invalidateCatalog(); onClose(); toast.success('Doce salvo com carinho!'); }
    catch (e) { setError(e); }
  }
  return <Modal open={!!product} onOpenChange={value => { if (!value && !isSubmitting) onClose(); }} title={product === 'new' ? 'Mais um doce para encantar' : 'Cuidar dos detalhes'} description="Foto, sabor e informações que ajudam a escolher." className="editor-modal"><form className="form-stack editor-form" onSubmit={handleSubmit(save)}>
    <Field label="Nome do doce" error={errors.name?.message}><input placeholder="Ex.: Brigadeiro de pistache" {...register('name')} /></Field>
    <Field label="Descrição" error={errors.description?.message}><textarea rows={3} placeholder="O que torna este doce especial?" {...register('description')} /></Field>
    <div className="form-row"><Field label="Categoria"><select {...register('category')}>{categories.map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Porção" error={errors.unit?.message}><input placeholder="1 unidade · 25 g" {...register('unit')} /></Field></div>
    <div className="form-row"><Field label="Preço (R$)" error={errors.price?.message}><input inputMode="decimal" placeholder="4,50" {...register('price')} /></Field><Field label="Quantidade em estoque" error={errors.stock?.message}><input inputMode="numeric" {...register('stock')} /></Field></div>
    <fieldset className="photo-choices"><legend>Foto do doce</legend><div>{['brigadeiro', 'brownie', 'strawberry', 'hero'].map((name, index) => <button type="button" key={name} className={watch('image_url') === `/images/${name}.webp` ? 'selected' : ''} aria-pressed={watch('image_url') === `/images/${name}.webp`} aria-label={`Usar foto ${['de brigadeiro', 'de brownie', 'de doce no pote', 'da seleção de doces'][index]}`} onClick={() => setValue('image_url', `/images/${name}.webp`)}><img src={`/images/${name}.webp`} alt="" /></button>)}</div></fieldset>
    <Field label="Ou use uma URL da sua foto" error={errors.image_url?.message} hint="Use um link direto HTTPS para uma foto da sua loja."><input {...register('image_url')} /></Field>
    <Field label="Alérgenos" hint="Separe por vírgulas. Confira a receita e os rótulos dos ingredientes."><input placeholder="Leite, ovos, trigo…" {...register('allergens')} /></Field>
    <div className="checkboxes"><label><input type="checkbox" {...register('available')} /> Mostrar no cardápio</label><label><input type="checkbox" {...register('featured')} /> Marcar como favorito da casa</label></div>
    {error != null && <ErrorMessage error={error} />}
    <div className="dialog-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button><Button type="submit" loading={isSubmitting}>Salvar doce</Button></div>
  </form></Modal>;
}
