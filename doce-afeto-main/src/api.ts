import { QueryClient, useQuery } from '@tanstack/react-query';
import type { Product, Shop, User } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = '') { super(message); }
}
let refresh: Promise<Response> | null = null;
export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, credentials: 'same-origin', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), 'X-Requested-With': 'DoceAfeto', ...init.headers } });
  } catch { throw new ApiError(0, 'Sem conexão no momento. Seu carrinho está salvo. Tente novamente.'); }
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    refresh ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'DoceAfeto' } }).finally(() => { refresh = null; });
    const result = await refresh;
    if (result.ok) return api<T>(path, init, false);
    if (result.status === 401) {
      queryClient.setQueryData(['me'], { user: null });
      if (!init.method || init.method === 'GET') return api<T>(path, init, false);
    }
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body.error || 'Não foi possível concluir. Tente novamente.', body.code);
  return body as T;
}
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1, refetchOnWindowFocus: false } } });
export const useProducts = () => useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
export const useShop = () => useQuery({ queryKey: ['shop'], queryFn: () => api<Shop>('/shop'), staleTime: 300_000 });
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<{ user: User | null }>('/me'), retry: false });
export const invalidateCatalog = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['products'] }), queryClient.invalidateQueries({ queryKey: ['admin-products'] })]);
