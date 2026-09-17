import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { BookOpen, Heart, ShoppingBag, UserRound, ReceiptText, LogOut, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, queryClient, useMe, useShop } from '../api';
import { cartCount, useCart, useUi } from '../store';
const AuthDialog = lazy(() => import('./AuthDialog').then(m => ({ default: m.AuthDialog })));
const CartDrawer = lazy(() => import('./CartDrawer').then(m => ({ default: m.CartDrawer })));

export function Layout() {
  const count = useCart(s => cartCount(s.items));
  const setCartOpen = useUi(s => s.setCartOpen), setAuthOpen = useUi(s => s.setAuthOpen);
  const cartOpen = useUi(s => s.cartOpen), authOpen = useUi(s => s.authOpen);
  const { data: me } = useMe(), { data: shop } = useShop();
  const location = useLocation();
  useEffect(() => { if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); queryClient.clear(); useCart.getState().clear(); toast.success('Você saiu da sua conta.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível sair.'); }
  }
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="announcement"><Heart size={12} aria-hidden="true" /> Pequenos doces. Grandes afetos. <Heart size={12} aria-hidden="true" /></div>
    <header className="site-header"><div className="container header-inner">
      <Link to="/" className="brand" aria-label="Doce Afeto, início"><span className="brand-mark"><Heart size={27} strokeWidth={1.5} /></span><span>doce afeto<small>DOCERIA ARTESANAL</small></span></Link>
      <nav className="desktop-nav" aria-label="Navegação principal"><NavLink to="/" end>Cardápio</NavLink><NavLink to="/pedidos">Meus pedidos</NavLink>{me?.user?.role === 'admin' && <NavLink to="/gestao">Gestão</NavLink>}</nav>
      <div className="header-actions">{me?.user && !me.user.guest ? <><button className="account-button" onClick={logout} aria-label="Sair da conta"><LogOut size={18} /><span>Sair</span></button></> : <button className="account-button" aria-label="Entrar na conta" onClick={() => setAuthOpen(true)}><UserRound size={19} /><span>Entrar</span></button>}
        <button className="header-cart" onClick={() => setCartOpen(true)} aria-label={`Abrir sacola, ${count} ${count === 1 ? 'item' : 'itens'}`}><ShoppingBag size={18} /><span>Minha sacola</span><b>{count}</b></button>
      </div>
    </div></header>
    {shop?.demo && <div className="demo-banner">Você está na demonstração · produtos ilustrativos e pedidos de teste, sem cobrança.</div>}
    <main id="conteudo" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer"><div className="container footer-inner"><Link to="/" className="footer-brand">doce afeto <Heart size={17} /></Link><p>Feito à mão. Escolhido com o coração.</p><Link to="/gestao">Área de gestão <ArrowUpRight size={15} /></Link></div></footer>
    <nav className="mobile-nav" aria-label="Navegação no celular"><NavLink to="/" end><BookOpen size={21} /><span>Cardápio</span></NavLink><NavLink to="/pedidos"><ReceiptText size={21} /><span>Pedidos</span></NavLink><button onClick={() => setCartOpen(true)} aria-label={`Abrir sacola, ${count} itens`}><span className="mobile-cart-icon"><ShoppingBag size={21} />{count > 0 && <b>{count}</b>}</span><span>Sacola</span></button></nav>
    <Suspense fallback={<div className="loading-block" role="status">Abrindo…</div>}>{cartOpen && <CartDrawer />}{authOpen && <AuthDialog />}</Suspense>
  </>;
}
