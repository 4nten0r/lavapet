import { StrictMode, Suspense, lazy, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './api';
import { Layout } from './components/Layout';
import Menu from './pages/Menu';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/400-italic.css';
import './styles.css';

const Orders = lazy(() => import('./pages/Orders'));
const Admin = lazy(() => import('./pages/Admin'));
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="empty-state"><h1>Precisamos de um instante</h1><p>Não foi possível abrir a página. Seu carrinho continua salvo.</p><button className="button button-primary" onClick={() => window.location.reload()}>Recarregar página</button></div> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><QueryClientProvider client={queryClient}><BrowserRouter><Suspense fallback={<div className="loading-block">Preparando seu cantinho de afeto…</div>}><Routes><Route element={<Layout />}><Route index element={<Menu />} /><Route path="pedidos" element={<Orders />} /><Route path="gestao" element={<Admin />} /><Route path="*" element={<div className="empty-state"><h1>Esse caminho não tem docinhos</h1><Link to="/" className="button button-primary">Voltar ao cardápio</Link></div>} /></Route></Routes></Suspense></BrowserRouter><Toaster richColors position="top-center" closeButton /></QueryClientProvider></ErrorBoundary></StrictMode>);
