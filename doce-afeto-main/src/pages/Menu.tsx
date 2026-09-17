import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, Candy, Cookie, Gift, Heart, Leaf, MapPin, Plus, Search, Sparkles, Coffee, X, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts, useShop } from '../api';
import { useCart, useUi, cartCount, cartTotal } from '../store';
import { categories, money, type Product } from '../types';
import { Button, EmptyState, ErrorMessage, Modal, ProductImage, Quantity } from '../components/ui';

const icons = [Candy, Cookie, Coffee, Gift];
export default function Menu() {
  const { data: products, isPending, error, refetch } = useProducts();
  const { data: shop } = useShop();
  const [params, setParams] = useSearchParams();
  const category = params.get('categoria') || 'Todos', search = params.get('busca') || '';
  const [selected, setSelected] = useState<Product | null>(null), [quantity, setQuantity] = useState(1);
  const add = useCart(s => s.add), items = useCart(s => s.items), setCartOpen = useUi(s => s.setCartOpen);
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = products?.filter(p => (category === 'Todos' || p.category === category) && normalize(`${p.name} ${p.description}`).includes(normalize(search))) ?? [];
  function filter(key: string, value: string) { const next = new URLSearchParams(params); if (value && value !== 'Todos') next.set(key, value); else next.delete(key); setParams(next, { replace: true }); }
  function addProduct(p: Product, amount = 1) {
    if (!add(p, amount)) { toast.error('Você chegou à quantidade disponível deste doce.'); return; }
    toast.success(`${p.name} na sacola`, { action: { label: 'Ver sacola', onClick: () => setCartOpen(true) } });
  }
  return <>
    <section className="container hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow"><Sparkles size={16} /> FEITO COM CARINHO, DE VERDADE</p><h1 id="hero-title">Seu dia merece<br />um pouco de <em>doçura.</em></h1><p className="hero-description">Tem dias que pedem um doce.<br />E tem doces que fazem o dia inteiro.</p><a className="button button-primary hero-cta" href="#cardapio">Encontre seu favorito <ArrowDown size={18} /></a><div className="hero-note"><span><Heart size={16} /> Artesanal, do início ao fim</span><span className="tiny-dot" /> Feito para encantar</div></div>
      <div className="hero-visual"><img src="/images/hero.webp" alt="Brigadeiros artesanais e brownies de chocolate em um prato de cerâmica, acompanhados de morangos" fetchPriority="high" /><div className="hero-sticker"><Heart size={26} strokeWidth={1.4} /><span>uma dose<br /><i>de afeto</i></span></div><div className="photo-caption">Receitas simples. Momentos especiais.</div></div>
    </section>
    <section id="cardapio" className="container menu-section" aria-labelledby="menu-title">
      <div className="section-heading"><div><p className="eyebrow">NOSSO CARDÁPIO</p><h2 id="menu-title">Qual vai adoçar seu dia?</h2></div><div className="search-box"><Search size={19} aria-hidden="true" /><input aria-label="Buscar um doce" placeholder="Procure seu doce favorito" value={search} onChange={e => filter('busca', e.target.value)} />{search && <button onClick={() => filter('busca', '')} aria-label="Limpar busca"><X size={17} /></button>}</div></div>
      <div className="catalog-toolbar"><div className="categories" role="group" aria-label="Categorias de doces"><button aria-pressed={category === 'Todos'} className={category === 'Todos' ? 'active' : ''} onClick={() => filter('categoria', 'Todos')}><Sparkles size={17} /> Todos os doces</button>{categories.map((c, index) => { const Icon = icons[index]; return <button key={c} aria-pressed={category === c} className={category === c ? 'active' : ''} onClick={() => filter('categoria', c)}><Icon size={18} />{c}</button>; })}</div><span className="result-count" aria-live="polite">{!isPending && `${filtered.length} opções de carinho`}</span></div>
      {error ? <ErrorMessage error={error} retry={() => void refetch()} /> : isPending ? <div className="product-grid" aria-label="Carregando cardápio" aria-busy="true">{[1, 2, 3, 4].map(i => <div className="product-skeleton" key={i}><div /><span /><span /></div>)}</div> : filtered.length === 0 ? <EmptyState icon={<Search size={30} />} title="Esse docinho ainda não apareceu" text="Tente outro nome ou dê uma olhada em todos os nossos doces."><Button variant="secondary" onClick={() => setParams({})}>Ver todos os doces</Button></EmptyState> : <div className="product-grid">{filtered.map((p, index) => <article className="product-card" key={p.id}>
        <button className="product-photo-button" onClick={() => { setSelected(p); setQuantity(1); }} aria-label={`Ver detalhes de ${p.name}`}><ProductImage src={p.image_url} name={p.name} eager={index < 4} />{p.stock === 0 ? <span className="product-tag sold-out">Volta em breve</span> : p.featured && <span className="product-tag"><Heart size={12} /> Um favorito da casa</span>}<span className="photo-detail">Conhecer esse doce <ArrowUpRightSmall /></span></button>
        <div className="product-info"><p className="product-category">{p.category}</p><button className="product-title" onClick={() => { setSelected(p); setQuantity(1); }}><h3>{p.name}</h3></button><p className="product-description">{p.description}</p><span className="product-unit">{p.unit}</span><div className="product-bottom"><strong>{money(p.price_cents)}</strong><button className="add-button" disabled={p.stock === 0} onClick={() => addProduct(p)} aria-label={`Adicionar ${p.name} à sacola`}><Plus size={18} /><span>Adicionar</span></button></div></div>
      </article>)}</div>}
      <p className="allergen-note"><Leaf size={15} /> Um cuidado a mais: veja os ingredientes e alérgenos nos detalhes de cada doce.</p>
    </section>
    <section className="container pickup-section"><div className="pickup-icon"><ShoppingBag size={29} strokeWidth={1.4} /></div><div><h2>Escolha com calma. Retire com carinho.</h2><p>Monte sua sacola, faça o pedido e acompanhe quando estiver prontinho.</p></div><span><MapPin size={17} /> Retirada na loja</span></section>
    {items.length > 0 && <button className="floating-cart" onClick={() => setCartOpen(true)}><span className="floating-count">{cartCount(items)}</span><span>Ver minha sacola</span><strong>{money(cartTotal(items))}</strong><ArrowRight size={18} /></button>}
    <Modal open={!!selected} onOpenChange={value => { if (!value) setSelected(null); }} title={selected?.name || 'Detalhes do doce'} description={selected?.unit || ''} className="product-modal">
      {selected && <><ProductImage src={selected.image_url} name={selected.name} className="detail-photo" /><div className="product-detail-content"><span className="product-category">{selected.category}</span><p>{selected.description}</p><div className="allergen-box"><strong>Informações de alérgenos</strong><p>{selected.allergens.length ? `Contém: ${selected.allergens.join(', ')}.` : 'Consulte a loja antes de consumir se tiver alguma restrição alimentar.'} Pode haver contato com outros ingredientes na cozinha.</p></div><p className="muted">{selected.stock ? `${selected.stock} disponíveis` : 'Indisponível no momento'}</p><div className="detail-actions"><Quantity value={quantity} max={selected.stock} onChange={setQuantity} label={selected.name} /><Button disabled={!selected.stock} onClick={() => { if (add(selected, quantity)) { setSelected(null); toast.success('Um pouco de afeto na sua sacola!'); } else toast.error('Confira a quantidade já adicionada à sacola.'); }}>Adicionar · {money(selected.price_cents * quantity)}</Button></div><small className="fine-print">{shop?.demo ? 'Produto e foto ilustrativos para demonstração.' : 'Imagem ilustrativa. A apresentação pode variar.'}</small></div></>}
    </Modal>
  </>;
}
function ArrowUpRightSmall() { return <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" /></svg>; }
