export type Product = {
  id: string; name: string; description: string; category: string; price_cents: number;
  stock: number; image_url: string; unit: string; allergens: string[]; featured: boolean;
  available: boolean; version: number;
};
export type User = { id: string; name: string; email: string | null; role: 'admin' | 'customer'; guest: boolean };
export type Shop = { name: string; demo: boolean; pickup_address: string; pickup_hours: string; orders_enabled: boolean; online_payment: boolean };
export type OrderStatus = 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type Order = {
  id: string; code: string; customer_name: string; phone: string; notes: string; total_cents: number;
  status: OrderStatus; payment_method: 'pickup' | 'mercadopago'; payment_status: 'pending' | 'paid' | 'refunded' | 'review';
  created_at: string; checkout_url: string | null;
  items: { id: string; product_id: string; name: string; image_url: string; unit: string; price_cents: number; quantity: number }[];
};
export type OrderPage = { orders: Order[]; hasMore: boolean };
export const categories = ['Brigadeiros', 'Brownies', 'Doces no pote', 'Para presentear'] as const;
export const statusLabels: Record<OrderStatus, string> = { received: 'Recebido', preparing: 'Em preparo', ready: 'Pronto para retirar', completed: 'Concluído', cancelled: 'Cancelado' };
export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const dateTime = (date: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(date));
